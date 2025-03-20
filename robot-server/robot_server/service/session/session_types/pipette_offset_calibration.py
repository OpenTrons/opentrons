import logging
from typing import Awaitable, Optional, cast
from opentrons.types import Mount
from opentrons.protocol_api import labware
from robot_server.robot.calibration.pipette_offset.user_flow import (
    PipetteOffsetCalibrationUserFlow,
)
from robot_server.robot.calibration.models import SessionCreateParams
from robot_server.robot.calibration.pipette_offset.models import (
    PipetteOffsetCalibrationSessionStatus,
)
from robot_server.service.session.errors import (
    SessionCreationException,
    CommandExecutionException,
)
from robot_server.service.session.command_execution import (
    CallableExecutor,
    Command,
    CompletedCommand,
    CommandExecutor,
)

from .base_session import BaseSession, SessionMetaData
from ..configuration import SessionConfiguration
from ..models.session import SessionType, PipetteOffsetCalibrationResponseAttributes


log = logging.getLogger(__name__)


class PipetteOffsetCalibrationCommandExecutor(CallableExecutor):
    async def execute(self, command: Command) -> CompletedCommand:
        try:
            return await super().execute(command)
        except AssertionError as e:
            raise CommandExecutionException(str(e))


class PipetteOffsetCalibrationSession(BaseSession):
    def __init__(
        self,
        configuration: SessionConfiguration,
        instance_meta: SessionMetaData,
        pip_offset_cal_user_flow: PipetteOffsetCalibrationUserFlow,
        shutdown_handler: Optional[Awaitable[None]] = None,
    ) -> None:
        super().__init__(configuration, instance_meta)
        self._pip_offset_cal_user_flow = pip_offset_cal_user_flow
        self._command_executor = PipetteOffsetCalibrationCommandExecutor(
            self._pip_offset_cal_user_flow.handle_command
        )
        self._shutdown_coroutine = shutdown_handler

    @classmethod
    async def create(
        cls, configuration: SessionConfiguration, instance_meta: SessionMetaData
    ) -> "BaseSession":
        assert isinstance(instance_meta.create_params, SessionCreateParams)
        mount = instance_meta.create_params.mount
        recalibrate_tip_length = instance_meta.create_params.shouldRecalibrateTipLength
        has_cal_block = instance_meta.create_params.hasCalibrationBlock
        tip_rack_def = instance_meta.create_params.tipRackDefinition

        if tip_rack_def:
            verified_tip_rack_def = labware.verify_definition(tip_rack_def)
            # todo(mm, 2025-02-13): Move schema validation to the FastAPI layer and turn
            # this schemaVersion assertion into a proper HTTP API 422 error.
            # https://opentrons.atlassian.net/browse/EXEC-1230
            assert verified_tip_rack_def["schemaVersion"] == 2
        else:
            verified_tip_rack_def = None

        # if lights are on already it's because the user clicked the button,
        # so a) we don't need to turn them on now and b) we shouldn't turn them
        # off after
        session_controls_lights = not (await configuration.hardware.get_lights())[
            "rails"
        ]
        await configuration.hardware.cache_instruments()
        await configuration.hardware.home()
        try:
            pip_offset_cal_user_flow = PipetteOffsetCalibrationUserFlow(
                hardware=configuration.hardware,
                mount=Mount[mount.upper()],
                recalibrate_tip_length=recalibrate_tip_length,
                has_calibration_block=has_cal_block,
                tip_rack_def=verified_tip_rack_def,
            )
        except AssertionError as e:
            raise SessionCreationException(str(e))

        if session_controls_lights:
            await configuration.hardware.set_lights(rails=True)
            shutdown_handler: Optional[
                Awaitable[None]
            ] = configuration.hardware.set_lights(rails=False)
        else:
            shutdown_handler = None

        return cls(
            configuration=configuration,
            instance_meta=instance_meta,
            pip_offset_cal_user_flow=pip_offset_cal_user_flow,
            shutdown_handler=shutdown_handler,
        )

    @property
    def command_executor(self) -> CommandExecutor:
        return self._command_executor

    @property
    def session_type(self) -> SessionType:
        return SessionType.pipette_offset_calibration

    def get_response_model(self) -> PipetteOffsetCalibrationResponseAttributes:
        return PipetteOffsetCalibrationResponseAttributes(
            id=self.meta.identifier,
            details=self._get_response_details(),
            createdAt=self.meta.created_at,
            createParams=cast(SessionCreateParams, self.meta.create_params),
        )

    def _get_response_details(self) -> PipetteOffsetCalibrationSessionStatus:
        uf = self._pip_offset_cal_user_flow
        return PipetteOffsetCalibrationSessionStatus(
            instrument=uf.get_pipette(),
            currentStep=uf.current_state,
            labware=uf.get_required_labware(),
            shouldPerformTipLength=uf.should_perform_tip_length,
            supportedCommands=uf.supported_commands,
        )

    async def clean_up(self) -> None:
        if self._shutdown_coroutine:
            await self._shutdown_coroutine
