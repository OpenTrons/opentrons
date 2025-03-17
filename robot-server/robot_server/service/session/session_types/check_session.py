from typing import Awaitable, Optional, cast

from robot_server.robot.calibration.check.user_flow import CheckCalibrationUserFlow
from robot_server.robot.calibration.check.models import (
    ComparisonStatePerCalibration,
    ComparisonStatePerPipette,
    CalibrationCheckSessionStatus,
    SessionCreateParams,
)
from robot_server.robot.calibration.check import util

from robot_server.service.session.command_execution import (
    CallableExecutor,
    Command,
    CompletedCommand,
)
from robot_server.service.session.configuration import SessionConfiguration
from robot_server.service.session.models.session import (
    SessionType,
    CalibrationCheckResponseAttributes,
)
from robot_server.service.session.session_types.base_session import (
    BaseSession,
    SessionMetaData,
)
from robot_server.service.session.errors import (
    SessionCreationException,
    CommandExecutionException,
)


class CheckSessionCommandExecutor(CallableExecutor):
    async def execute(self, command: Command) -> CompletedCommand:
        try:
            return await super().execute(command)
        except AssertionError as e:
            raise CommandExecutionException(str(e))


class CheckSession(BaseSession):
    def __init__(
        self,
        configuration: SessionConfiguration,
        instance_meta: SessionMetaData,
        calibration_check: CheckCalibrationUserFlow,
        shutdown_handler: Optional[Awaitable[None]] = None,
    ) -> None:
        super().__init__(configuration, instance_meta)
        self._calibration_check = calibration_check
        self._command_executor = CheckSessionCommandExecutor(
            self._calibration_check.handle_command
        )
        self._shutdown_coroutine = shutdown_handler

    @classmethod
    async def create(
        cls, configuration: SessionConfiguration, instance_meta: SessionMetaData
    ) -> BaseSession:
        """Create an instance"""
        assert isinstance(instance_meta.create_params, SessionCreateParams)
        tip_racks = instance_meta.create_params.tipRacks
        has_calibration_block = instance_meta.create_params.hasCalibrationBlock
        # if lights are on already it's because the user clicked the button,
        # so a) we don't need to turn them on now and b) we shouldn't turn them
        # off after
        session_controls_lights = not (await configuration.hardware.get_lights())[
            "rails"
        ]
        await configuration.hardware.cache_instruments()
        await configuration.hardware.home()
        try:
            calibration_check = CheckCalibrationUserFlow(
                configuration.hardware,
                has_calibration_block=has_calibration_block,
                tip_rack_defs=tip_racks,  # type: ignore[arg-type]
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
            calibration_check=calibration_check,
            shutdown_handler=shutdown_handler,
        )

    def _map_to_pydantic_model(
        self, comparison_map: util.ComparisonStatePerPipette
    ) -> ComparisonStatePerPipette:
        first = comparison_map.first
        second = comparison_map.second
        first_compmap = ComparisonStatePerCalibration(
            tipLength=first.tipLength,
            pipetteOffset=first.pipetteOffset,
            deck=first.deck,
        )
        second_compmap = ComparisonStatePerCalibration(
            tipLength=second.tipLength,
            pipetteOffset=second.pipetteOffset,
            deck=second.deck,
        )
        return ComparisonStatePerPipette(first=first_compmap, second=second_compmap)

    def get_response_model(self) -> CalibrationCheckResponseAttributes:
        return CalibrationCheckResponseAttributes(
            id=self.meta.identifier,
            createParams=cast(SessionCreateParams, self.meta.create_params),
            createdAt=self.meta.created_at,
            details=self._get_response_details(),
        )

    def _get_response_details(self) -> CalibrationCheckSessionStatus:
        comparison_map = self._map_to_pydantic_model(
            self._calibration_check.comparison_map
        )
        return CalibrationCheckSessionStatus(
            instruments=self._calibration_check.get_instruments(),
            currentStep=self._calibration_check.current_state,
            comparisonsByPipette=comparison_map,
            labware=self._calibration_check.get_required_labware(),
            activePipette=self._calibration_check.get_active_pipette(),
            activeTipRack=self._calibration_check.get_active_tiprack(),
            supportedCommands=self._calibration_check.supported_commands,
        )

    @property
    def command_executor(self) -> CallableExecutor:
        return self._command_executor

    @property
    def session_type(self) -> SessionType:
        return SessionType.calibration_check

    async def clean_up(self) -> None:
        if self._shutdown_coroutine:
            await self._shutdown_coroutine
