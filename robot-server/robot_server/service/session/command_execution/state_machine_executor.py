from opentrons.calibration.util import StateMachine, StateMachineError

from .base_executor import CommandExecutor
from .command import Command, CompletedCommand, CommandResult
from robot_server.service.session import errors
from robot_server.util import timeit


class StateMachineExecutor(CommandExecutor):
    """A command executor that executes StateMachine triggers"""

    def __init__(self, state_machine: StateMachine):
        """
        Constructor

        :param state_machine: A state machine instance
        """
        self. _state_machine = state_machine

    async def execute(self, command: Command) -> CompletedCommand:
        """Execute command"""
        with timeit() as time_it:
            try:
                trigger = command.content.name.value
                data = command.content.data
                await self._state_machine.trigger_transition(
                    trigger=trigger,
                    **(data.dict() if data else {})
                )
            except AssertionError as e:
                raise errors.CommandExecutionException(str(e))
            except StateMachineError as e:
                raise errors.UnsupportedCommandException(str(e))

        return CompletedCommand(
            content=command.content,
            meta=command.meta,
            result=CommandResult(started_at=time_it.start,
                                 completed_at=time_it.end)
        )
