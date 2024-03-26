"""Protocol engine commands sub-state."""
from __future__ import annotations
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Union

from opentrons_shared_data.errors import EnumeratedError, ErrorCodes, PythonException

from opentrons.hardware_control.types import DoorState

from ..actions import (
    Action,
    QueueCommandAction,
    UpdateCommandAction,
    FailCommandAction,
    PlayAction,
    PauseAction,
    StopAction,
    FinishAction,
    HardwareStoppedAction,
    DoorChangeAction,
)

from ..commands import Command, CommandStatus, CommandIntent
from ..errors import (
    CommandDoesNotExistError,
    RunStoppedError,
    ErrorOccurrence,
    RobotDoorOpenError,
    SetupCommandNotAllowedError,
    PauseNotAllowedError,
    UnexpectedProtocolError,
    ProtocolCommandFailedError,
)
from ..types import EngineStatus
from .abstract_store import HasState, HandlesActions
from .command_structure import (
    CommandEntry,
    CommandStructure,
)
from .config import Config


class QueueStatus(str, Enum):
    """Execution status of the command queue.

    Properties:
        SETUP: The engine has been created, but the run has not yet started.
            New protocol commands may be enqueued but will wait to execute.
            New setup commands may be enqueued and will execute immediately.
        RUNNING: The queue is running though protocol commands.
            New protocol commands may be enqueued and will execute immediately.
            New setup commands may not be enqueued.
        PAUSED: Execution of protocol commands has been paused.
            New protocol commands may be enqueued but wait to execute.
            New setup commands may not be enqueued.
    """

    SETUP = "setup"
    RUNNING = "running"
    PAUSED = "paused"


class RunResult(str, Enum):
    """Result of the run."""

    SUCCEEDED = "succeeded"
    FAILED = "failed"
    STOPPED = "stopped"


@dataclass(frozen=True)
class CommandSlice:
    """A subset of all commands in state."""

    commands: List[Command]
    cursor: int
    total_length: int


@dataclass(frozen=True)
class CurrentCommand:
    """The "current" command's ID and index in the overall commands list."""

    command_id: str
    command_key: str
    created_at: datetime
    index: int


@dataclass
class CommandState:
    """State of all protocol engine command resources."""

    command_structure: CommandStructure

    queue_status: QueueStatus
    """Whether the engine is currently pulling new commands off the queue to execute.

    A command may still be executing, and the robot may still be in motion,
    even if INACTIVE.
    """

    run_started_at: Optional[datetime]
    """The time the run was started.

    Set when the first `PlayAction` is dispatched.
    """

    run_completed_at: Optional[datetime]
    """The time the run has completed.

    Set when 'HardwareStoppedAction' is dispatched.
    """

    is_door_blocking: bool
    """Whether the door is open when enable_door_safety_switch feature flag is ON."""

    run_result: Optional[RunResult]
    """Whether the run is done and succeeded, failed, or stopped.

    This doesn't include the post-run finish steps (homing and dropping tips).

    Once set, this status is immutable.
    """

    run_error: Optional[ErrorOccurrence]
    """The run's fatal error occurrence, if there was one.

    Individual command errors, which may or may not be fatal,
    are stored on the individual commands themselves.
    """

    finish_error: Optional[ErrorOccurrence]
    """The error that happened during the post-run finish steps (homing & dropping tips), if any."""

    latest_command_hash: Optional[str]
    """The latest hash value received in a QueueCommandAction.

    This value can be used to generate future hashes.
    """

    stopped_by_estop: bool
    """If this is set to True, the engine was stopped by an estop event."""


class CommandStore(HasState[CommandState], HandlesActions):
    """Command state container."""

    _state: CommandState

    def __init__(
        self,
        *,
        config: Config,
        is_door_open: bool,
    ) -> None:
        """Initialize a CommandStore and its state."""
        self._config = config
        self._state = CommandState(
            command_structure=CommandStructure(),
            queue_status=QueueStatus.SETUP,
            is_door_blocking=is_door_open and config.block_on_door_open,
            run_result=None,
            run_error=None,
            finish_error=None,
            run_completed_at=None,
            run_started_at=None,
            latest_command_hash=None,
            stopped_by_estop=False,
        )

    def handle_action(self, action: Action) -> None:  # noqa: C901
        """Modify state in reaction to an action."""
        if isinstance(action, QueueCommandAction):
            # TODO(mc, 2021-06-22): mypy has trouble with this automatic
            # request > command mapping, figure out how to type precisely
            # (or wait for a future mypy version that can figure it out).
            # For now, unit tests cover mapping every request type
            queued_command = action.request._CommandCls.construct(
                id=action.command_id,
                key=(
                    action.request.key
                    if action.request.key is not None
                    else (action.request_hash or action.command_id)
                ),
                createdAt=action.created_at,
                params=action.request.params,  # type: ignore[arg-type]
                intent=action.request.intent,
                status=CommandStatus.QUEUED,
            )

            self._state.command_structure.add_queued(queued_command)

            if action.request_hash is not None:
                self._state.latest_command_hash = action.request_hash

        # TODO(mc, 2021-12-28): replace "UpdateCommandAction" with explicit
        # state change actions (e.g. RunCommandAction, SucceedCommandAction)
        # to make a command's queue transition logic easier to follow
        elif isinstance(action, UpdateCommandAction):
            self.state.command_structure.update(action.command)

        elif isinstance(action, FailCommandAction):
            error_occurrence = ErrorOccurrence.from_failed(
                id=action.error_id,
                createdAt=action.failed_at,
                error=action.error,
            )
            self._state.command_structure.fail(
                command_id=action.command_id,
                error_occurrence=error_occurrence,
                failed_at=action.failed_at,
            )

        elif isinstance(action, PlayAction):
            if not self._state.run_result:
                self._state.run_started_at = (
                    self._state.run_started_at or action.requested_at
                )
                if self._state.is_door_blocking:
                    # Always inactivate queue when door is blocking
                    self._state.queue_status = QueueStatus.PAUSED
                else:
                    self._state.queue_status = QueueStatus.RUNNING

        elif isinstance(action, PauseAction):
            self._state.queue_status = QueueStatus.PAUSED

        elif isinstance(action, StopAction):
            if not self._state.run_result:
                self._state.queue_status = QueueStatus.PAUSED
                self._state.run_result = RunResult.STOPPED
                if action.from_estop:
                    self._state.stopped_by_estop = True

        elif isinstance(action, FinishAction):
            if not self._state.run_result:
                self._state.queue_status = QueueStatus.PAUSED
                if action.set_run_status:
                    self._state.run_result = (
                        RunResult.SUCCEEDED
                        if not action.error_details
                        else RunResult.FAILED
                    )
                else:
                    self._state.run_result = RunResult.STOPPED

                if action.error_details:
                    self._state.run_error = self._map_run_exception_to_error_occurrence(
                        action.error_details.error_id,
                        action.error_details.created_at,
                        action.error_details.error,
                    )

        elif isinstance(action, HardwareStoppedAction):
            self._state.queue_status = QueueStatus.PAUSED
            self._state.run_result = self._state.run_result or RunResult.STOPPED
            self._state.run_completed_at = (
                self._state.run_completed_at or action.completed_at
            )

            if action.finish_error_details:
                self._state.finish_error = (
                    self._map_finish_exception_to_error_occurrence(
                        action.finish_error_details.error_id,
                        action.finish_error_details.created_at,
                        action.finish_error_details.error,
                    )
                )

        elif isinstance(action, DoorChangeAction):
            if self._config.block_on_door_open:
                if action.door_state == DoorState.OPEN:
                    self._state.is_door_blocking = True
                    if self._state.queue_status != QueueStatus.SETUP:
                        self._state.queue_status = QueueStatus.PAUSED
                elif action.door_state == DoorState.CLOSED:
                    self._state.is_door_blocking = False

    @staticmethod
    def _map_run_exception_to_error_occurrence(
        error_id: str, created_at: datetime, exception: Exception
    ) -> ErrorOccurrence:
        """Map a fatal exception from the main part of the run to an ErrorOccurrence."""
        if (
            isinstance(exception, ProtocolCommandFailedError)
            and exception.original_error is not None
        ):
            return exception.original_error
        elif isinstance(exception, EnumeratedError):
            return ErrorOccurrence.from_failed(
                id=error_id, createdAt=created_at, error=exception
            )
        else:
            enumerated_wrapper = UnexpectedProtocolError(
                message=str(exception),
                wrapping=[exception],
            )
            return ErrorOccurrence.from_failed(
                id=error_id, createdAt=created_at, error=enumerated_wrapper
            )

    @staticmethod
    def _map_finish_exception_to_error_occurrence(
        error_id: str, created_at: datetime, exception: Exception
    ) -> ErrorOccurrence:
        """Map a fatal exception from the finish phase (drop tip & home) to an ErrorOccurrence."""
        if isinstance(exception, EnumeratedError):
            return ErrorOccurrence.from_failed(
                id=error_id, createdAt=created_at, error=exception
            )
        else:
            enumerated_wrapper = PythonException(exc=exception)
            return ErrorOccurrence.from_failed(
                id=error_id, createdAt=created_at, error=enumerated_wrapper
            )


class CommandView(HasState[CommandState]):
    """Read-only command state view."""

    _state: CommandState

    def __init__(self, state: CommandState) -> None:
        """Initialize the view of command state with its underlying data."""
        self._state = state

    def get(self, command_id: str) -> Command:
        """Get a command by its unique identifier."""
        return self._state.command_structure.get(command_id).command

    def get_all(self) -> List[Command]:
        """Get a list of all commands in state.

        Entries are returned in the order of first-added command to last-added command.
        Replacing a command (to change its status, for example) keeps its place in the
        ordering.
        """
        return self._state.command_structure.get_all()

    def get_slice(
        self,
        cursor: Optional[int],
        length: int,
    ) -> CommandSlice:
        """Get a subset of commands around a given cursor.

        If the cursor is omitted, a cursor will be selected automatically
        based on the currently running or most recently executed command.
        """
        running_command = self._state.command_structure.get_running_command()
        queued_command_ids = self._state.command_structure.get_queued_command_ids()
        failed_command = self._state.command_structure.get_failed_command()
        total_length = self._state.command_structure.length()

        if cursor is None:
            if running_command is not None:
                cursor = running_command.index
            elif len(queued_command_ids) > 0:
                # Get the most recently executed command,
                # which we can find just before the first queued command.
                cursor = (
                    self._state.command_structure.get(queued_command_ids.head()).index
                    - 1
                )
            elif (
                self._state.run_result
                and self._state.run_result == RunResult.FAILED
                and failed_command
            ):
                # Currently, if the run fails, we mark all the commands we didn't
                # reach as failed. This makes command status alone insufficient to
                # find the most recent command that actually executed, so we need to
                # store that separately.
                cursor = failed_command.index
            else:
                cursor = total_length - length

        # start is inclusive, stop is exclusive
        actual_cursor = max(0, min(cursor, total_length - 1))
        stop = min(total_length, actual_cursor + length)
        commands = self._state.command_structure.get_slice(
            start=actual_cursor, stop=stop
        )

        return CommandSlice(
            commands=commands,
            cursor=actual_cursor,
            total_length=total_length,
        )

    def get_error(self) -> Optional[ErrorOccurrence]:
        """Get the run's fatal error, if there was one."""
        run_error = self._state.run_error
        finish_error = self._state.finish_error

        if run_error and finish_error:
            combined_error = ErrorOccurrence.construct(
                id=finish_error.id,
                createdAt=finish_error.createdAt,
                errorType="RunAndFinishFailed",
                detail=(
                    "The run had a fatal error,"
                    " and another error happened while doing post-run cleanup."
                ),
                # TODO(mm, 2023-07-31): Consider adding a low-priority error code so clients can
                # deemphasize this root node, in favor of its children in wrappedErrors.
                errorCode=ErrorCodes.GENERAL_ERROR.value.code,
                wrappedErrors=[
                    run_error,
                    finish_error,
                ],
            )
            return combined_error
        else:
            return run_error or finish_error

    # TODO: Why is this different from get_slice()?
    # TODO:
    # - GET /runs/commands docs say that links.current is "currently running or NEXT QUEUED", and attempts to implement that via this.
    # - These docs say that this implements "currently [running] or MOST RECENT TO HAVE COMPLETED"
    # - This actual implementation returns currently running or MOST RECENT TO HAVE COMPLETED.
    #
    # Not to be confused with the ?cursor param to GET /runs/commands, which:
    # - HTTP docs say "MOST RECENTLY EXECUTED"
    # - Docs in this file say "MOST RECENTLY EXECUTED"
    # - Implementation returns MOST RECENTLY EXECUTED
    def get_current(self) -> Optional[CurrentCommand]:
        """Return the "current" command, if any.

        The "current" command is the command that is currently executing,
        or the most recent command to have completed.
        """
        running_command = self._state.command_structure.get_running_command()
        if running_command:
            return CurrentCommand(
                command_id=running_command.command.id,
                command_key=running_command.command.key,
                created_at=running_command.command.createdAt,
                index=running_command.index,
            )

        # TODO(mc, 2022-02-07): this is O(n) in the worst case for no good reason.
        # Resolve prior to JSONv6 support, where this will matter.
        for reverse_index, cid in enumerate(
            reversed(self._state.command_structure.get_all_ids())
        ):
            if self.get_command_is_final(cid):
                entry = self._state.command_structure.get(cid)
                return CurrentCommand(
                    command_id=entry.command.id,
                    command_key=entry.command.key,
                    created_at=entry.command.createdAt,
                    index=self._state.command_structure.length() - reverse_index - 1,
                )

        return None

    def get_next_to_execute(self) -> Optional[str]:
        """Return the next command in line to be executed.

        Returns:
            The ID of the earliest queued command, if any.

        Raises:
            RunStoppedError: The engine is currently stopped or stopping,
                so it will never run any more commands.
        """
        if self._state.run_result:
            raise RunStoppedError("Engine was stopped")

        # if there is a setup command queued, prioritize it
        next_setup_cmd = self._state.command_structure.get_queued_command_ids().head(
            None
        )
        if self._state.queue_status != QueueStatus.PAUSED and next_setup_cmd:
            return next_setup_cmd

        # if the queue is running, return the next protocol command
        if self._state.queue_status == QueueStatus.RUNNING:
            return self._state.command_structure.get_queued_command_ids().head(None)

        # otherwise we've got nothing to do
        return None

    def get_is_okay_to_clear(self) -> bool:
        """Get whether the engine is stopped or sitting idly so it could be removed."""
        if self.get_is_stopped():
            return True
        elif (
            self.get_status() == EngineStatus.IDLE
            and self._state.command_structure.get_running_command() is None
            and len(self._state.command_structure.get_queued_setup_command_ids()) == 0
        ):
            return True
        else:
            return False

    def get_is_door_blocking(self) -> bool:
        """Get whether the robot door is open when 'pause on door open' ff is True."""
        return self._state.is_door_blocking

    def get_is_implicitly_active(self) -> bool:
        """Get whether the queue is implicitly active, i.e., never 'played'."""
        return self._state.queue_status == QueueStatus.SETUP

    def get_is_running(self) -> bool:
        """Get whether the protocol is running & queued commands should be executed."""
        return self._state.queue_status == QueueStatus.RUNNING

    def get_command_is_final(self, command_id: str) -> bool:
        """Get whether a given command has reached its final `status`.

        This happens when one of the following is true:

        - Its status is `CommandStatus.SUCCEEDED`.
        - Its status is `CommandStatus.FAILED`.
        - Its status is `CommandStatus.QUEUED` but the run has been requested to stop,
          so the run will never reach it.

        Arguments:
            command_id: Command to check.
        """
        status = self.get(command_id).status

        return (
            status == CommandStatus.SUCCEEDED
            or status == CommandStatus.FAILED
            or (status == CommandStatus.QUEUED and self._state.run_result is not None)
        )

    def get_all_commands_final(self) -> bool:
        """Get whether all commands added so far have reached their final `status`.

        See `get_command_is_final()`.

        Raises:
            CommandExecutionFailedError: if any added command failed, and its `intent` wasn't
            `setup`.
        """
        no_command_running = self._state.command_structure.get_running_command() is None
        no_command_to_execute = (
            self._state.run_result is not None
            or len(self._state.command_structure.get_queued_command_ids()) == 0
        )

        if no_command_running and no_command_to_execute:
            for command in self._state.command_structure.get_all():
                if command.error and command.intent != CommandIntent.SETUP:
                    # TODO(tz, 7-11-23): avoid raising an error and return the status instead
                    raise ProtocolCommandFailedError(
                        original_error=command.error, message=command.error.detail
                    )
            return True
        else:
            return False

    def get_is_stopped(self) -> bool:
        """Get whether an engine stop has completed."""
        return self._state.run_completed_at is not None

    def has_been_played(self) -> bool:
        """Get whether engine has started."""
        return self._state.run_started_at is not None

    def get_is_terminal(self) -> bool:
        """Get whether engine is in a terminal state."""
        return self._state.run_result is not None

    def validate_action_allowed(
        self,
        action: Union[PlayAction, PauseAction, StopAction, QueueCommandAction],
    ) -> Union[PlayAction, PauseAction, StopAction, QueueCommandAction]:
        """Validate whether a given control action is allowed.

        Returns:
            The action, if valid.

        Raises:
            RunStoppedError: The engine has been stopped.
            RobotDoorOpenError: Cannot resume because the front door is open.
            PauseNotAllowedError: The engine is not running, so cannot be paused.
            SetupCommandNotAllowedError: The engine is running, so a setup command
                may not be added.
        """
        if self._state.run_result is not None:
            raise RunStoppedError("The run has already stopped.")

        elif isinstance(action, PlayAction):
            if self.get_status() == EngineStatus.BLOCKED_BY_OPEN_DOOR:
                raise RobotDoorOpenError("Front door or top window is currently open.")

        elif isinstance(action, PauseAction):
            if not self.get_is_running():
                raise PauseNotAllowedError("Cannot pause a run that is not running.")

        elif (
            isinstance(action, QueueCommandAction)
            and action.request.intent == CommandIntent.SETUP
        ):
            if self._state.queue_status != QueueStatus.SETUP:
                raise SetupCommandNotAllowedError(
                    "Setup commands are not allowed after run has started."
                )

        return action

    def get_status(self) -> EngineStatus:
        """Get the current execution status of the engine."""
        if self._state.run_result:
            # The main part of the run is over, or will be over soon.
            # Have we also completed the post-run finish steps (homing and dropping tips)?
            if self.get_is_stopped():
                # Post-run finish steps have completed. Calculate the engine's final status,
                # taking into account any failures in the run or the post-run finish steps.
                if (
                    self._state.run_result == RunResult.FAILED
                    or self._state.finish_error is not None
                ):
                    return EngineStatus.FAILED
                elif self._state.run_result == RunResult.SUCCEEDED:
                    return EngineStatus.SUCCEEDED
                else:
                    return EngineStatus.STOPPED
            else:
                # Post-run finish steps have not yet completed,
                # and we may even still be executing commands.
                return (
                    EngineStatus.STOP_REQUESTED
                    if self._state.run_result == RunResult.STOPPED
                    else EngineStatus.FINISHING
                )

        elif self._state.queue_status == QueueStatus.RUNNING:
            return EngineStatus.RUNNING

        elif self._state.queue_status == QueueStatus.PAUSED:
            if self._state.is_door_blocking:
                return EngineStatus.BLOCKED_BY_OPEN_DOOR
            else:
                return EngineStatus.PAUSED

        return EngineStatus.IDLE

    def get_latest_command_hash(self) -> Optional[str]:
        """Get the command hash of the last queued command, if any."""
        return self._state.latest_command_hash
