"""Protocol engine types to do with engine execution."""
from enum import Enum


# todo(mm, 2024-06-24): This monolithic status field is getting to be a bit much.
# We should consider splitting this up into multiple fields.
class EngineStatus(str, Enum):
    """Current execution status of a ProtocolEngine.

    This is a high-level summary of what the robot is doing and what interactions are
    appropriate.
    """

    # Statuses for an ongoing run:

    IDLE = "idle"
    """The protocol has not been started yet.

    The robot may truly be idle, or it may be executing commands with `intent: "setup"`.
    """

    RUNNING = "running"
    """The engine is actively running the protocol."""

    PAUSED = "paused"
    """A pause has been requested. Activity is paused, or will pause soon.

    (There is currently no way to tell which.)
    """

    BLOCKED_BY_OPEN_DOOR = "blocked-by-open-door"
    """The robot's door is open. Activity is paused, or will pause soon."""

    STOP_REQUESTED = "stop-requested"
    """A stop has been requested. Activity will stop soon."""

    FINISHING = "finishing"
    """The robot is doing post-run cleanup, like homing and dropping tips."""

    # Statuses for error recovery mode:

    AWAITING_RECOVERY = "awaiting-recovery"
    """The engine is waiting for external input to recover from a nonfatal error.

    New commands with `intent: "fixit"` may be enqueued, which will run immediately.
    The run can't be paused in this state, but it can be canceled, or resumed from the
    next protocol command if recovery is complete.
    """

    AWAITING_RECOVERY_PAUSED = "awaiting-recovery-paused"
    """The engine is paused while in error recovery mode. Activity is paused, or will pause soon.

    This state is not possible to enter manually. It happens when an open door
    gets closed during error recovery.
    """

    AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR = "awaiting-recovery-blocked-by-open-door"
    """The robot's door is open while in recovery mode. Activity is paused, or will pause soon."""

    # Terminal statuses:

    STOPPED = "stopped"
    """All activity is over; it was stopped by an explicit external request."""

    FAILED = "failed"
    """All activity is over; there was a fatal error."""

    SUCCEEDED = "succeeded"
    """All activity is over; things completed without any fatal error."""


class PostRunHardwareState(Enum):
    """State of robot gantry & motors after a stop is performed and the hardware API is reset.

    HOME_AND_STAY_ENGAGED: home the gantry and keep all motors engaged. This allows the
        robot to continue performing movement actions without re-homing
    HOME_THEN_DISENGAGE: home the gantry and then disengage motors.
        Reduces current consumption of the motors and prevents coil heating.
        Re-homing is required to re-engage the motors and resume robot movement.
    STAY_ENGAGED_IN_PLACE: do not home after the stop and keep the motors engaged.
        Keeps gantry in the same position as prior to `stop()` execution
        and allows the robot to execute movement commands without requiring to re-home first.
    DISENGAGE_IN_PLACE: disengage motors and do not home the robot
    Probable states for pipette:
        - for 1- or 8-channel:
            - HOME_AND_STAY_ENGAGED after protocol runs
            - STAY_ENGAGED_IN_PLACE after maintenance runs
        - for 96-channel:
            - HOME_THEN_DISENGAGE after protocol runs
            - DISENGAGE_IN_PLACE after maintenance runs
    """

    HOME_AND_STAY_ENGAGED = "homeAndStayEngaged"
    HOME_THEN_DISENGAGE = "homeThenDisengage"
    STAY_ENGAGED_IN_PLACE = "stayEngagedInPlace"
    DISENGAGE_IN_PLACE = "disengageInPlace"
