from dataclasses import dataclass
from typing import Optional, Union

from . import protocol_runner
from ..hardware_control import HardwareControlAPI
from ..protocol_engine import (
    ProtocolEngine,
    Command,
    CommandCreate,
    CommandIntent,
)
from ..protocol_engine.errors import CommandNotAllowedError
from ..protocol_engine.types import PostRunHardwareState
from ..protocol_reader import JsonProtocolConfig, PythonProtocolConfig


class RunOrchestrator:
    _json_or_python_runner: Optional[
        protocol_runner.AnyRunner
    ]  # I want to use type, should I just add a type ignore?
    _setup_runner: protocol_runner.AnyRunner
    _fixit_runner: protocol_runner.AnyRunner

    def __init__(
        self,
        setup_runner: protocol_runner.AnyRunner,
        fixit_runner: protocol_runner.AnyRunner,
        json_or_python_runner: Optional[protocol_runner.AnyRunner] = None,
    ) -> None:
        # todo(tamar, 5-7-24): assert that the type matches expected type
        self._setup_runner = setup_runner
        self._fixit_runner = fixit_runner
        self._json_or_python_runner = json_or_python_runner

    def add_command(
        self, request: CommandCreate, failed_command_id: Optional[str] = None
    ) -> Command:
        """Add a command to the queue.

        Arguments:
            request: The command type and payload data used to construct
                the command in state.
            failed_command_id: the failed command id this command is trying to fix.

        Returns:
            The full, newly queued command.

        Raises:
            SetupCommandNotAllowed: the request specified a setup command,
                but the engine was not idle or paused.
            RunStoppedError: the run has been stopped, so no new commands
                may be added.
            CommandNotAllowedError: the request specified a failed command id
                with a non fixit command.
        """
        if failed_command_id and request.intent != CommandIntent.FIXIT:
            raise CommandNotAllowedError(
                "failed command id should be supplied with a FIXIT command."
            )

        # pass the failed_command_id somewhere
        if request.intent == CommandIntent.SETUP:
            self._setup_runner.set_command_queued(request)
        elif request.intent == CommandIntent.FIXIT:
            self._fixit_runner.set_command_queued(request)
        elif (
            request.intent == CommandIntent.PROTOCOL
            and self._json_or_python_runner is not None
        ):
            self._json_or_python_runner.set_command_queued(request)


@dataclass
class RunOrchestratorProvider:
    @staticmethod
    def build_orchestrator(
        protocol_config: Optional[Union[JsonProtocolConfig, PythonProtocolConfig]],
        protocol_engine: ProtocolEngine,
        hardware_api: HardwareControlAPI,
        post_run_hardware_state: PostRunHardwareState = PostRunHardwareState.HOME_AND_STAY_ENGAGED,
        drop_tips_after_run: bool = True,
    ):
        setup_runner = protocol_runner.create_protocol_runner(
            protocol_engine=protocol_engine,
            hardware_api=hardware_api,
            post_run_hardware_state=post_run_hardware_state,
            drop_tips_after_run=drop_tips_after_run,
        )
        fixit_runner = protocol_runner.create_protocol_runner(
            protocol_engine=protocol_engine,
            hardware_api=hardware_api,
            post_run_hardware_state=post_run_hardware_state,
            drop_tips_after_run=drop_tips_after_run,
        )
        json_or_python_runner = None
        if protocol_config:
            json_or_python_runner = protocol_runner.create_protocol_runner(
                protocol_config=protocol_config,
                protocol_engine=protocol_engine,
                hardware_api=hardware_api,
                post_run_hardware_state=post_run_hardware_state,
                drop_tips_after_run=drop_tips_after_run,
            )
        return RunOrchestrator(
            setup_runner=setup_runner,
            fixit_runner=fixit_runner,
            json_or_python_runner=json_or_python_runner,
        )
