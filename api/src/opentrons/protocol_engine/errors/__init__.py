"""Protocol engine errors module."""

from .exceptions import (
    ProtocolEngineError,
    UnexpectedProtocolError,
    FailedToLoadPipetteError,
    PipetteNotAttachedError,
    TipNotAttachedError,
    TipAttachedError,
    CommandDoesNotExistError,
    LabwareNotLoadedError,
    LabwareNotLoadedOnModuleError,
    LabwareNotLoadedOnLabwareError,
    LabwareNotOnDeckError,
    LiquidDoesNotExistError,
    LabwareDefinitionDoesNotExistError,
    LabwareCannotBeStackedError,
    LabwareIsInStackError,
    LabwareOffsetDoesNotExistError,
    LabwareIsNotTipRackError,
    LabwareIsTipRackError,
    LabwareIsAdapterError,
    TouchTipDisabledError,
    WellDoesNotExistError,
    PipetteNotLoadedError,
    ModuleNotLoadedError,
    ModuleNotOnDeckError,
    ModuleNotConnectedError,
    SlotDoesNotExistError,
    FailedToPlanMoveError,
    MustHomeError,
    RunStoppedError,
    SetupCommandNotAllowedError,
    ModuleNotAttachedError,
    ModuleAlreadyPresentError,
    WrongModuleTypeError,
    ThermocyclerNotOpenError,
    RobotDoorOpenError,
    PipetteMovementRestrictedByHeaterShakerError,
    HeaterShakerLabwareLatchNotOpenError,
    HeaterShakerLabwareLatchStatusUnknown,
    EngageHeightOutOfRangeError,
    NoTargetTemperatureSetError,
    InvalidTargetSpeedError,
    InvalidTargetTemperatureError,
    InvalidBlockVolumeError,
    InvalidHoldTimeError,
    CannotPerformModuleAction,
    PauseNotAllowedError,
    GripperNotAttachedError,
    HardwareNotSupportedError,
    LabwareMovementNotAllowedError,
    LabwareIsNotAllowedInLocationError,
    LocationIsOccupiedError,
    InvalidAxisForRobotType,
    NotSupportedOnRobotType,
)

from .error_occurrence import ErrorOccurrence, ProtocolCommandFailedError

__all__ = [
    # exceptions
    "ProtocolEngineError",
    "UnexpectedProtocolError",
    "FailedToLoadPipetteError",
    "PipetteNotAttachedError",
    "TipNotAttachedError",
    "TipAttachedError",
    "CommandDoesNotExistError",
    "LabwareNotLoadedError",
    "LabwareNotLoadedOnModuleError",
    "LabwareNotLoadedOnLabwareError",
    "LabwareNotOnDeckError",
    "LiquidDoesNotExistError",
    "LabwareDefinitionDoesNotExistError",
    "LabwareCannotBeStackedError",
    "LabwareIsInStackError",
    "LabwareOffsetDoesNotExistError",
    "LabwareIsNotTipRackError",
    "LabwareIsTipRackError",
    "LabwareIsAdapterError",
    "TouchTipDisabledError",
    "WellDoesNotExistError",
    "PipetteNotLoadedError",
    "ModuleNotLoadedError",
    "ModuleNotOnDeckError",
    "ModuleNotConnectedError",
    "SlotDoesNotExistError",
    "FailedToPlanMoveError",
    "MustHomeError",
    "RunStoppedError",
    "SetupCommandNotAllowedError",
    "ModuleNotAttachedError",
    "ModuleAlreadyPresentError",
    "WrongModuleTypeError",
    "ThermocyclerNotOpenError",
    "RobotDoorOpenError",
    "PipetteMovementRestrictedByHeaterShakerError",
    "HeaterShakerLabwareLatchNotOpenError",
    "HeaterShakerLabwareLatchStatusUnknown",
    "EngageHeightOutOfRangeError",
    "NoTargetTemperatureSetError",
    "InvalidTargetTemperatureError",
    "InvalidTargetSpeedError",
    "InvalidBlockVolumeError",
    "InvalidHoldTimeError",
    "CannotPerformModuleAction",
    "PauseNotAllowedError",
    "ProtocolCommandFailedError",
    "GripperNotAttachedError",
    "HardwareNotSupportedError",
    "LabwareMovementNotAllowedError",
    "LabwareIsNotAllowedInLocationError",
    "LocationIsOccupiedError",
    "InvalidAxisForRobotType",
    "NotSupportedOnRobotType",
    # error occurrence models
    "ErrorOccurrence",
]
