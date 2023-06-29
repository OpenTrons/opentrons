from typing import Optional, Dict, Any, Sequence
from opentrons_shared_data.errors.exceptions import (
    PositionEstimationInvalidError,
    EnumeratedError,
    UnexpectedTipRemovalError,
    UnexpectedTipAttachError,
    InvalidParameterError,
    NotSupportedByHardwareError,
    GripperNotPresentError,
    InvalidActuator,
)

from .types import OT3Mount


class ExecutionCancelledError(RuntimeError):
    pass


class MustHomeError(PositionEstimationInvalidError):
    def __init__(
        self,
        message: Optional[str] = None,
        detail: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a PositionEstimationFailedError."""
        super().__init__(
            message or "The machine must be homed before this operation",
            detail,
            wrapping,
        )


class NoTipAttachedError(UnexpectedTipRemovalError):
    pass


class TipAttachedError(UnexpectedTipAttachError):
    pass


class InvalidMoveError(InvalidParameterError):
    pass


class NotSupportedByHardware(NotSupportedByHardwareError):
    """Error raised when attempting to use arguments and values not supported by the specific hardware."""


class GripperNotAttachedError(GripperNotPresentError):
    """An error raised if a gripper is accessed that is not attached."""


class AxisNotPresentError(InvalidActuator):
    """An error raised if an axis that is not present."""


class OverPressureDetected(RuntimeError):
    """An error raised when the pressure sensor max value is exceeded."""

    pass


class InvalidPipetteName(KeyError):
    """Raised for an invalid pipette."""

    def __init__(self, name: int, mount: OT3Mount) -> None:
        self.name = name
        self.mount = mount

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}: name={self.name} mount={self.mount}>"

    def __str__(self) -> str:
        return f"{self.__class__.__name__}: Pipette name key {self.name} on mount {self.mount.name} is not valid"


class InvalidPipetteModel(KeyError):
    """Raised for a pipette with an unknown model."""

    def __init__(self, name: str, model: str, mount: OT3Mount) -> None:
        self.name = name
        self.model = model
        self.mount = mount

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}: name={self.name}, model={self.model}, mount={self.mount}>"

    def __str__(self) -> str:
        return f"{self.__class__.__name__}: {self.name} on {self.mount.name} has an unknown model {self.model}"


class UpdateOngoingError(RuntimeError):
    """Error when an update is already happening."""

    def __init__(self, msg: str) -> None:
        self.msg = msg

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}: msg={self.msg}>"

    def __str__(self) -> str:
        return self.msg
