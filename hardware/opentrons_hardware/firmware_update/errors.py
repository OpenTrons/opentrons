"""Firmware upgrade exceptions."""
from opentrons_ot3_firmware.messages import MessageDefinition


class FirmwareUpgradeException(Exception):
    """Base exception."""

    pass


class ErrorResponse(FirmwareUpgradeException):
    """Error response exception."""

    message: MessageDefinition

    def __init__(self, message: MessageDefinition) -> None:
        """Constructor."""
        self.message = message
        super().__init__(f"Got error response {message}.")


class TimeoutResponse(FirmwareUpgradeException):
    """No response exception."""

    message: MessageDefinition

    def __init__(self, message: MessageDefinition) -> None:
        """Constructor."""
        self.message = message
        super().__init__(f"Timed out waiting for response to {message}")


class BootloaderNotReady(FirmwareUpgradeException):
    """Bootloader is not ready."""

    pass
