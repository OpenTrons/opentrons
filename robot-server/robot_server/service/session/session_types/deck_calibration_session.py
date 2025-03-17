from typing import Awaitable, Optional

from robot_server.robot.calibration.deck.user_flow import DeckCalibrationUserFlow
from robot_server.robot.calibration.deck.models import DeckCalibrationSessionStatus
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
from ..models.session import SessionType, DeckCalibrationResponseAttributes


class DeckCalibrationCommandExecutor(CallableExecutor):
    async def execute(self, command: Command) -> CompletedCommand:
        try:
            return await super().execute(command)
        except AssertionError as e:
            raise CommandExecutionException(str(e))


class DeckCalibrationSession(BaseSession):
    def __init__(
        self,
        configuration: SessionConfiguration,
        instance_meta: SessionMetaData,
        deck_cal_user_flow: DeckCalibrationUserFlow,
        shutdown_handler: Optional[Awaitable[None]] = None,
    ):
        super().__init__(configuration, instance_meta)
        self._deck_cal_user_flow = deck_cal_user_flow
        self._command_executor = DeckCalibrationCommandExecutor(
            self._deck_cal_user_flow.handle_command
        )
        self._shutdown_coroutine = shutdown_handler

    @classmethod
    async def create(
        cls, configuration: SessionConfiguration, instance_meta: SessionMetaData
    ) -> "BaseSession":
        # if lights are on already it's because the user clicked the button,
        # so a) we don't need to turn them on now and b) we shouldn't turn them
        # off after
        session_controls_lights = not (await configuration.hardware.get_lights())[
            "rails"
        ]
        await configuration.hardware.cache_instruments()
        try:
            deck_cal_user_flow = DeckCalibrationUserFlow(
                hardware=configuration.hardware
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
            deck_cal_user_flow=deck_cal_user_flow,
            shutdown_handler=shutdown_handler,
        )

    @property
    def command_executor(self) -> CommandExecutor:
        return self._command_executor

    @property
    def session_type(self) -> SessionType:
        return SessionType.deck_calibration

    def get_response_model(self) -> DeckCalibrationResponseAttributes:
        return DeckCalibrationResponseAttributes(
            id=self.meta.identifier,
            createParams=self.meta.create_params,
            details=self._get_response_details(),
            createdAt=self.meta.created_at,
        )

    def _get_response_details(self) -> DeckCalibrationSessionStatus:
        # TODO(mc, 2020-09-17): get_pipette() returns an Optional value but
        # DeckCalibrationSessionStatus has an exact type for instrument
        supported_commands = self._deck_cal_user_flow.supported_commands
        return DeckCalibrationSessionStatus(
            instrument=self._deck_cal_user_flow.get_pipette(),  # type: ignore[arg-type]
            currentStep=self._deck_cal_user_flow.current_state,
            labware=self._deck_cal_user_flow.get_required_labware(),
            supportedCommands=supported_commands,
        )

    async def clean_up(self):
        if self._shutdown_coroutine:
            await self._shutdown_coroutine
