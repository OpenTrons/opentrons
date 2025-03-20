"""Stacker-specific error codes and exceptions."""

from opentrons.drivers.asyncio.communication.errors import (
    BaseErrorCode,
    ErrorResponse,
    UnhandledGcode,
)


class EStopTriggered(ErrorResponse):
    """Raised when the estop is triggered during a move."""

    def __init__(self, port: str, response: str, command: str) -> None:
        super().__init__(port, response, command)


class MotorStallDetected(ErrorResponse):
    """Raised when a motor stall is detected."""

    def __init__(self, port: str, response: str, command: str) -> None:
        super().__init__(port, response, command)


class MotorQueueFull(ErrorResponse):
    """Raised when the motor command queue is full."""

    def __init__(self, port: str, response: str, command: str) -> None:
        super().__init__(port, response, command)


class UnexpectedLimitSwitch(ErrorResponse):
    """Raised when an unexpected limit switch is triggered."""

    def __init__(self, port: str, response: str, command: str) -> None:
        super().__init__(port, response, command)


class MotorBusy(ErrorResponse):
    """Raised when a motor is busy."""

    # TODO: differentiate between motors
    def __init__(self, port: str, response: str, command: str) -> None:
        super().__init__(port, response, command)


class StopRequested(ErrorResponse):
    """Raised when a stop is requested during a movement."""

    def __init__(self, port: str, response: str, command: str) -> None:
        super().__init__(port, response, command)


class StackerErrorCodes(BaseErrorCode):
    """Stacker-specific error codes."""

    UNHANDLED_GCODE = ("ERR003", UnhandledGcode)
    ESTOP_TRIGGERED = ("ERR006", EStopTriggered)
    MOTOR_STALL_DETECTED = ("ERR403", MotorStallDetected)
    MOTOR_QUEUE_FULL = ("ERR404", MotorQueueFull)
    UNEXPECTED_LIMIT_SWITCH = ("ERR405", UnexpectedLimitSwitch)
    X_MOTOR_BUSY = ("ERR501", MotorBusy)
    Z_MOTOR_BUSY = ("ERR502", MotorBusy)
    L_MOTOR_BUSY = ("ERR503", MotorBusy)
    STOP_REQUESTED = ("ERR504", StopRequested)
