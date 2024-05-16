"""Protocol engine commands sub-state."""
from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Union
from typing_extensions import assert_never

from opentrons_shared_data.errors import EnumeratedError, ErrorCodes, PythonException

from opentrons.ordered_set import OrderedSet

from opentrons.hardware_control.types import DoorState
from opentrons.protocol_engine.actions.actions import (
    ResumeFromRecoveryAction,
    RunCommandAction,
)
from opentrons.protocol_engine.error_recovery_policy import ErrorRecoveryType
from opentrons.protocol_engine.notes.notes import CommandNote

from ..actions import (
    Action,
    QueueCommandAction,
    SucceedCommandAction,
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
    RunStoppedError,
    ErrorOccurrence,
    RobotDoorOpenError,
    SetupCommandNotAllowedError,
    FixitCommandNotAllowedError,
    ResumeFromRecoveryNotAllowedError,
    PauseNotAllowedError,
    UnexpectedProtocolError,
    ProtocolCommandFailedError,
)
from ..types import EngineStatus
from .abstract_store import HasState, HandlesActions
from .command_history import (
    CommandEntry,
    CommandHistory,
)
from .config import Config


class QueueStatus(enum.Enum):
    """Execution status of the command queue."""

    SETUP = enum.auto()
    """The engine has been created, but the run has not yet started.

    New protocol commands may be enqueued, but will wait to execute.
    New setup commands may be enqueued and will execute immediately.
    New fixup commands may not be enqueued.
    """

    RUNNING = enum.auto()
    """The queue is running through protocol commands.

    New protocol commands may be enqueued and will execute immediately.
    New setup commands may not be enqueued.
    New fixup commands may not be enqueued.
    """

    PAUSED = enum.auto()
    """Execution of protocol commands has been paused.

    New protocol commands may be enqueued, but will wait to execute.
    New setup commands may not be enqueued.
    New fixup commands may not be enqueued.
    """

    AWAITING_RECOVERY = enum.auto()
    """A protocol command has encountered a recoverable error.

    New protocol commands may be enqueued, but will wait to execute.
    New setup commands may not be enqueued.
    New fixup commands may be enqueued and will execute immediately.
    """


class RunResult(str, enum.Enum):
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

    command_history: CommandHistory

    queue_status: QueueStatus
    """Whether the engine is currently pulling new commands off the queue to execute.

    A command may still be executing, and the robot may still be in motion,
    even if PAUSED.
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

    failed_command: Optional[CommandEntry]
    """The most recent command failure, if any."""
    # TODO(mm, 2024-03-19): This attribute is currently only used to help robot-server
    # with pagination, but "the failed command" is an increasingly nuanced idea, now
    # that we're doing error recovery. See if we can implement robot-server pagination
    # atop simpler concepts, like "the last command that ran" or "the next command that
    # would run."
    #
    # TODO(mm, 2024-04-03): Can this be replaced by
    # CommandHistory.get_terminal_command() now?

    command_error_recovery_types: Dict[str, ErrorRecoveryType]
    """For each command that failed (indexed by ID), what its recovery type was.

    This only includes commands that actually failed, not the ones that we mark as
    failed but that are effectively "cancelled" because a command before them failed.

    This separate attribute is a stopgap until error recovery concepts are a bit more
    stable. Eventually, we might want this info to be stored directly on each command.
    """

    recovery_target_command_id: Optional[str]
    """If we're currently recovering from a command failure, which command it was."""

    finish_error: Optional[ErrorOccurrence]
    """The error that happened during the post-run finish steps (homing & dropping tips), if any."""

    latest_protocol_command_hash: Optional[str]
    """The latest PROTOCOL command hash value received in a QueueCommandAction.

    This value can be used to generate future hashes.
    """

    stopped_by_estop: bool
    """If this is set to True, the engine was stopped by an estop event."""


class CommandStore(HasState[CommandState], HandlesActions):
    """Command state container for run-level command concerns."""

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
            command_history=CommandHistory(),
            queue_status=QueueStatus.SETUP,
            is_door_blocking=is_door_open and config.block_on_door_open,
            run_result=None,
            run_error=None,
            finish_error=None,
            failed_command=None,
            command_error_recovery_types={},
            recovery_target_command_id=None,
            run_completed_at=None,
            run_started_at=None,
            latest_protocol_command_hash=None,
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
                failedCommandId=action.failed_command_id,
            )

            self._state.command_history.set_command_queued(queued_command)

            if action.request_hash is not None:
                self._state.latest_protocol_command_hash = action.request_hash

        elif isinstance(action, RunCommandAction):
            prev_entry = self._state.command_history.get(action.command_id)

            running_command = prev_entry.command.copy(
                update={
                    "status": CommandStatus.RUNNING,
                    "startedAt": action.started_at,
                }
            )

            self._state.command_history.set_command_running(running_command)

        elif isinstance(action, SucceedCommandAction):
            succeeded_command = action.command
            self._state.command_history.set_command_succeeded(succeeded_command)

        elif isinstance(action, FailCommandAction):
            if isinstance(action.error, EnumeratedError):
                public_error_occurrence = ErrorOccurrence.from_failed(
                    id=action.error_id,
                    createdAt=action.failed_at,
                    error=action.error,
                )
            else:
                public_error_occurrence = action.error.public

            self._update_to_failed(
                command_id=action.command_id,
                failed_at=action.failed_at,
                error_occurrence=public_error_occurrence,
                error_recovery_type=action.type,
                notes=action.notes,
            )

            self._state.failed_command = self._state.command_history.get(
                action.command_id
            )

            prev_entry = self.state.command_history.get(action.command_id)
            if prev_entry.command.intent == CommandIntent.SETUP:
                other_command_ids_to_fail = (
                    self._state.command_history.get_setup_queue_ids()
                )
                for command_id in other_command_ids_to_fail:
                    # TODO(mc, 2022-06-06): add new "cancelled" status or similar
                    self._update_to_failed(
                        command_id=command_id,
                        failed_at=action.failed_at,
                        error_occurrence=None,
                        error_recovery_type=None,
                        notes=None,
                    )
                self._state.command_history.clear_setup_queue()
            elif (
                prev_entry.command.intent == CommandIntent.PROTOCOL
                or prev_entry.command.intent is None
            ):
                if action.type == ErrorRecoveryType.WAIT_FOR_RECOVERY:
                    self._state.queue_status = QueueStatus.AWAITING_RECOVERY
                    self._state.recovery_target_command_id = action.command_id
                elif action.type == ErrorRecoveryType.FAIL_RUN:
                    other_command_ids_to_fail = (
                        self._state.command_history.get_queue_ids()
                    )
                    for command_id in other_command_ids_to_fail:
                        # TODO(mc, 2022-06-06): add new "cancelled" status or similar
                        self._update_to_failed(
                            command_id=command_id,
                            failed_at=action.failed_at,
                            error_occurrence=None,
                            error_recovery_type=None,
                            notes=None,
                        )
                    self._state.command_history.clear_queue()
                else:
                    assert_never(action.type)
            elif prev_entry.command.intent == CommandIntent.FIXIT:
                other_command_ids_to_fail = (
                    self._state.command_history.get_fixit_queue_ids()
                )
                for command_id in other_command_ids_to_fail:
                    # TODO(mc, 2022-06-06): add new "cancelled" status or similar
                    self._update_to_failed(
                        command_id=command_id,
                        failed_at=action.failed_at,
                        error_occurrence=None,
                        error_recovery_type=None,
                        notes=None,
                    )
                self._state.command_history.clear_fixit_queue()
            else:
                assert_never(prev_entry.command.intent)

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

        elif isinstance(action, ResumeFromRecoveryAction):
            self._state.command_history.clear_fixit_queue()
            self._state.queue_status = QueueStatus.RUNNING
            self._state.recovery_target_command_id = None

        elif isinstance(action, StopAction):
            if not self._state.run_result:
                if self._state.queue_status == QueueStatus.AWAITING_RECOVERY:
                    self._state.recovery_target_command_id = None

                self._state.queue_status = QueueStatus.PAUSED
                if action.from_estop:
                    self._state.stopped_by_estop = True
                    self._state.run_result = RunResult.FAILED
                else:
                    self._state.run_result = RunResult.STOPPED

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

            if not self._state.run_error and action.error_details:
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
                    # todo(mm, 2024-03-19): It's unclear how the door should interact
                    # with error recovery (QueueStatus.AWAITING_RECOVERY).
                    if self._state.queue_status != QueueStatus.SETUP:
                        self._state.queue_status = QueueStatus.PAUSED
                elif action.door_state == DoorState.CLOSED:
                    self._state.is_door_blocking = False

    def _update_to_failed(
        self,
        command_id: str,
        failed_at: datetime,
        error_occurrence: Optional[ErrorOccurrence],
        error_recovery_type: Optional[ErrorRecoveryType],
        notes: Optional[List[CommandNote]],
    ) -> None:
        prev_entry = self._state.command_history.get(command_id)
        failed_command = prev_entry.command.copy(
            update={
                "completedAt": failed_at,
                "status": CommandStatus.FAILED,
                **({"error": error_occurrence} if error_occurrence is not None else {}),
                # Assume we're not overwriting any existing notes because they can
                # only be added when a command completes, and if we're failing this
                # command, it wouldn't have completed before now.
                **({"notes": notes} if notes is not None else {}),
            }
        )
        self._state.command_history.set_command_failed(failed_command)
        if error_recovery_type is not None:
            self._state.command_error_recovery_types[command_id] = error_recovery_type

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
        return self._state.command_history.get(command_id).command

    def get_all(self) -> List[Command]:
        """Get a list of all commands in state.

        Entries are returned in the order of first-added command to last-added command.
        Replacing a command (to change its status, for example) keeps its place in the
        ordering.
        """
        return self._state.command_history.get_all_commands()

    def get_slice(
        self,
        cursor: Optional[int],
        length: int,
    ) -> CommandSlice:
        """Get a subset of commands around a given cursor.

        If the cursor is omitted, a cursor will be selected automatically
        based on the currently running or most recently executed command.
        """
        running_command = self._state.command_history.get_running_command()
        queued_command_ids = self._state.command_history.get_queue_ids()
        total_length = self._state.command_history.length()

        if cursor is None:
            if running_command is not None:
                cursor = running_command.index
            elif len(queued_command_ids) > 0:
                # Get the most recently executed command,
                # which we can find just before the first queued command.
                cursor = (
                    self._state.command_history.get(queued_command_ids.head()).index - 1
                )
            elif (
                self._state.run_result
                and self._state.run_result == RunResult.FAILED
                and self._state.failed_command
            ):
                # Currently, if the run fails, we mark all the commands we didn't
                # reach as failed. This makes command status alone insufficient to
                # find the most recent command that actually executed, so we need to
                # store that separately.
                cursor = self._state.failed_command.index
            else:
                cursor = total_length - length

        # start is inclusive, stop is exclusive
        actual_cursor = max(0, min(cursor, total_length - 1))
        stop = min(total_length, actual_cursor + length)
        commands = self._state.command_history.get_slice(start=actual_cursor, stop=stop)

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

    def get_running_command_id(self) -> Optional[str]:
        """Return the ID of the command that's currently running, if there is one."""
        running_command = self._state.command_history.get_running_command()
        if running_command is not None:
            return running_command.command.id
        else:
            return None

    def get_queue_ids(self) -> OrderedSet[str]:
        """Get the IDs of all queued protocol commands, in FIFO order."""
        return self._state.command_history.get_queue_ids()

    def get_current(self) -> Optional[CurrentCommand]:
        """Return the "current" command, if any.

        The "current" command is the command that is currently executing,
        or the most recent command to have completed.
        """
        running_command = self._state.command_history.get_running_command()
        if running_command:
            return CurrentCommand(
                command_id=running_command.command.id,
                command_key=running_command.command.key,
                created_at=running_command.command.createdAt,
                index=running_command.index,
            )

        final_command = self.get_final_command()
        if final_command:
            return CurrentCommand(
                command_id=final_command.command.id,
                command_key=final_command.command.key,
                created_at=final_command.command.createdAt,
                index=final_command.index,
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

        # if queue is in recovery mode, return the next fixit command
        next_fixit_cmd = self._state.command_history.get_fixit_queue_ids().head(None)
        if next_fixit_cmd and self._state.queue_status == QueueStatus.AWAITING_RECOVERY:
            return next_fixit_cmd

        # if there is a setup command queued, prioritize it
        next_setup_cmd = self._state.command_history.get_setup_queue_ids().head(None)
        if (
            self._state.queue_status
            not in [QueueStatus.PAUSED, QueueStatus.AWAITING_RECOVERY]
            and next_setup_cmd
        ):
            return next_setup_cmd

        # if the queue is running, return the next protocol command
        if self._state.queue_status == QueueStatus.RUNNING:
            return self._state.command_history.get_queue_ids().head(None)

        # otherwise we've got nothing to do
        return None

    def get_is_okay_to_clear(self) -> bool:
        """Get whether the engine is stopped or sitting idly so it could be removed."""
        if self.get_is_stopped():
            return True
        elif (
            self.get_status() == EngineStatus.IDLE
            and self._state.command_history.get_running_command() is None
            and len(self._state.command_history.get_setup_queue_ids()) == 0
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

    def get_final_command(self) -> Optional[CommandEntry]:
        """Get the most recent command that has reached its final `status`. See get_command_is_final."""
        run_requested_to_stop = self._state.run_result is not None

        if run_requested_to_stop:
            tail_command = self._state.command_history.get_tail_command()
            if not tail_command:
                return None
            if tail_command.command.status != CommandStatus.RUNNING:
                return tail_command
            else:
                return self._state.command_history.get_prev(tail_command.command.id)
        else:
            final_command = self._state.command_history.get_terminal_command()
            # This iteration is effectively O(1) as we'll only ever have to iterate one or two times at most.
            while final_command is not None:
                next_command = self._state.command_history.get_next(
                    final_command.command.id
                )
                if (
                    next_command is not None
                    and next_command.command.status != CommandStatus.QUEUED
                    and next_command.command.status != CommandStatus.RUNNING
                ):
                    final_command = next_command
                else:
                    break

        return final_command

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

        run_requested_to_stop = self._state.run_result is not None

        return (
            status == CommandStatus.SUCCEEDED
            or status == CommandStatus.FAILED
            or (status == CommandStatus.QUEUED and run_requested_to_stop)
        )

    def get_all_commands_final(self) -> bool:
        """Get whether all commands added so far have reached their final `status`.

        See `get_command_is_final()`.

        Raises:
            CommandExecutionFailedError: if any added command failed, and its `intent` wasn't
            `setup`.
        """
        no_command_running = self._state.command_history.get_running_command() is None
        run_requested_to_stop = self._state.run_result is not None
        no_command_to_execute = (
            run_requested_to_stop
            # TODO(mm, 2024-03-15): This ignores queued setup commands,
            # which seems questionable?
            or len(self._state.command_history.get_queue_ids()) == 0
        )

        return no_command_running and no_command_to_execute

    def get_recovery_in_progress_for_command(self, command_id: str) -> bool:
        """Return whether the given command failed and its error recovery is in progress."""
        return self._state.recovery_target_command_id == command_id

    def raise_fatal_command_error(self) -> None:
        """Raise the run's fatal command error, if there was one, as an exception.

        The "fatal command error" is the error from any non-setup command.
        It's intended to be used as the fatal error of the overall run
        (see `ProtocolEngine.finish()`) for JSON and live HTTP protocols.

        This isn't useful for Python protocols, which have to account for the
        fatal error of the overall coming from anywhere in the Python script,
        including in between commands.
        """
        failed_command = self.state.failed_command
        if (
            failed_command
            and failed_command.command.error
            and failed_command.command.intent != CommandIntent.SETUP
        ):
            raise ProtocolCommandFailedError(
                original_error=failed_command.command.error,
                message=failed_command.command.error.detail,
            )

    def get_error_recovery_type(self, command_id: str) -> ErrorRecoveryType:
        """Return the error recovery type with which the given command failed.

        The command ID is assumed to point to a failed command.
        """
        return self.state.command_error_recovery_types[command_id]

    def get_is_stopped(self) -> bool:
        """Get whether an engine stop has completed."""
        return self._state.run_completed_at is not None

    def has_been_played(self) -> bool:
        """Get whether engine has started."""
        return self._state.run_started_at is not None

    def get_is_terminal(self) -> bool:
        """Get whether engine is in a terminal state."""
        return self._state.run_result is not None

    def validate_action_allowed(  # noqa: C901
        self,
        action: Union[
            PlayAction,
            PauseAction,
            StopAction,
            ResumeFromRecoveryAction,
            QueueCommandAction,
        ],
    ) -> Union[
        PlayAction,
        PauseAction,
        StopAction,
        ResumeFromRecoveryAction,
        QueueCommandAction,
    ]:
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
            elif self.get_status() == EngineStatus.AWAITING_RECOVERY:
                raise NotImplementedError()
            else:
                return action

        elif isinstance(action, PauseAction):
            if not self.get_is_running():
                raise PauseNotAllowedError("Cannot pause a run that is not running.")
            elif self.get_status() == EngineStatus.AWAITING_RECOVERY:
                raise NotImplementedError()
            else:
                return action

        elif isinstance(action, QueueCommandAction):
            if (
                action.request.intent == CommandIntent.SETUP
                and self._state.queue_status != QueueStatus.SETUP
            ):
                raise SetupCommandNotAllowedError(
                    "Setup commands are not allowed after run has started."
                )
            elif action.request.intent == CommandIntent.FIXIT:
                if self._state.queue_status != QueueStatus.AWAITING_RECOVERY:
                    raise FixitCommandNotAllowedError(
                        "Fixit commands are not allowed when the run is not in a recoverable state."
                    )
                else:
                    return action
            else:
                return action

        elif isinstance(action, ResumeFromRecoveryAction):
            if self.get_status() != EngineStatus.AWAITING_RECOVERY:
                raise ResumeFromRecoveryNotAllowedError(
                    "Cannot resume from recovery if the run is not in recovery mode."
                )
            elif (
                self.get_status() == EngineStatus.AWAITING_RECOVERY
                and len(self._state.command_history.get_fixit_queue_ids()) > 0
            ):
                raise ResumeFromRecoveryNotAllowedError(
                    "Cannot resume from recovery while there are fixit commands in the queue."
                )
            else:
                return action

        elif isinstance(action, StopAction):
            return action

        else:
            assert_never(action)

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

        elif self._state.queue_status == QueueStatus.AWAITING_RECOVERY:
            return EngineStatus.AWAITING_RECOVERY

        # todo(mm, 2024-03-19): Does this intentionally return idle if QueueStatus is
        # SETUP and we're currently a setup command?
        return EngineStatus.IDLE

    def get_latest_protocol_command_hash(self) -> Optional[str]:
        """Get the command hash of the last queued command, if any."""
        return self._state.latest_protocol_command_hash
