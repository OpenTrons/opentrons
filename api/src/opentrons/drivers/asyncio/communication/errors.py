"""Errors raised by serial connection."""

from enum import Enum
from typing import Dict, Type, Optional


class SerialException(Exception):
    """Base serial exception"""

    def __init__(self, port: str, description: str) -> None:
        super().__init__(f"{port}: {description}")
        self.port = port
        self.description = description


class NoResponse(SerialException):
    def __init__(self, port: str, command: str) -> None:
        super().__init__(port=port, description=f"No response to '{command}'")
        self.command = command


class FailedCommand(SerialException):
    def __init__(self, port: str, response: str) -> None:
        super().__init__(
            port=port, description=f"'Received error response '{response}'"
        )
        self.response = response


class AlarmResponse(FailedCommand):
    pass


class ErrorResponse(FailedCommand):
    def __init__(self, port: str, response: str, command: Optional[str] = None) -> None:
        super().__init__(port, response)
        self.command = command


class UnhandledGcode(ErrorResponse):
    def __init__(self, port: str, response: str, command: str) -> None:
        super().__init__(port, response, command)


class BaseErrorCode(Enum):
    """Base class for error code enums.

    This class should be inherited to define specific sets of error codes.
    """

    @property
    def code_string(self) -> str:
        """Return the error code string."""
        code: str = self.value[0]
        return code.lower()

    @property
    def exception(self) -> Type[ErrorResponse]:
        """Return the exception class associated with this error code."""
        exc: Type[ErrorResponse] = self.value[1]
        return exc

    def raise_exception(self, port: str, response: str, command: str) -> None:
        """Raise the appropriate exception for this error code."""
        raise self.exception(port=port, response=response, command=command)

    @classmethod
    def get_error_codes(cls) -> Dict[str, "BaseErrorCode"]:
        """Get all error codes as a dictionary mapping code string to ErrorCode instance."""
        return {code.code_string: code for code in cls}


class DefaultErrorCodes(BaseErrorCode):
    """
    Default error codes that are previously handled by the SerialConnection class.
    """

    UNHANDLED_GCODE = ("ERR003", UnhandledGcode)
