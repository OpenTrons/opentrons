"""Protocol engine errors module."""

from .exceptions import (
    ProtocolEngineError,
    UnexpectedProtocolError,
    FailedToLoadPipetteError,
    PipetteNotAttachedError,
    InvalidSpecificationForRobotTypeError,
    InvalidLoadPipetteSpecsError,
    TipNotAttachedError,
    PickUpTipTipNotAttachedError,
    TipAttachedError,
    CommandDoesNotExistError,
    UnsupportedLabwareForActionError,
    LabwareNotLoadedError,
    LabwareNotLoadedOnModuleError,
    LabwareNotLoadedOnLabwareError,
    LabwareNotOnDeckError,
    LiquidDoesNotExistError,
    LabwareDefinitionDoesNotExistError,
    LabwareCannotBeStackedError,
    LabwareCannotSitOnDeckError,
    LabwareIsInStackError,
    LabwareOffsetDoesNotExistError,
    LabwareIsNotTipRackError,
    LabwareIsTipRackError,
    LabwareIsAdapterError,
    TouchTipDisabledError,
    TouchTipIncompatibleArgumentsError,
    WellDoesNotExistError,
    PipetteNotLoadedError,
    ModuleNotLoadedError,
    ModuleNotOnDeckError,
    ModuleNotConnectedError,
    SlotDoesNotExistError,
    CutoutDoesNotExistError,
    FixtureDoesNotExistError,
    AddressableAreaDoesNotExistError,
    FixtureDoesNotProvideAreasError,
    AreaNotInDeckConfigurationError,
    IncompatibleAddressableAreaError,
    FailedToPlanMoveError,
    MustHomeError,
    RunStoppedError,
    SetupCommandNotAllowedError,
    FixitCommandNotAllowedError,
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
    InvalidWavelengthError,
    CannotPerformModuleAction,
    PauseNotAllowedError,
    ResumeFromRecoveryNotAllowedError,
    GripperNotAttachedError,
    CannotPerformGripperAction,
    HardwareNotSupportedError,
    LabwareMovementNotAllowedError,
    LabwareIsNotAllowedInLocationError,
    LocationIsOccupiedError,
    LocationNotAccessibleByPipetteError,
    LocationIsStagingSlotError,
    LocationIsLidDockSlotError,
    InvalidAxisForRobotType,
    NotSupportedOnRobotType,
    CommandNotAllowedError,
    InvalidLiquidHeightFound,
    LiquidHeightUnknownError,
    IncompleteLabwareDefinitionError,
    IncompleteWellDefinitionError,
    OperationLocationNotInWellError,
    InvalidDispenseVolumeError,
    StorageLimitReachedError,
    InvalidLiquidError,
    LiquidClassDoesNotExistError,
    LiquidClassRedefinitionError,
    OffsetLocationInvalidError,
)

from .error_occurrence import ErrorOccurrence, ProtocolCommandFailedError

__all__ = [
    # exceptions
    "ProtocolEngineError",
    "UnexpectedProtocolError",
    "FailedToLoadPipetteError",
    "PipetteNotAttachedError",
    "InvalidSpecificationForRobotTypeError",
    "InvalidLoadPipetteSpecsError",
    "TipNotAttachedError",
    "PickUpTipTipNotAttachedError",
    "TipAttachedError",
    "CommandDoesNotExistError",
    "LabwareNotLoadedError",
    "LabwareNotLoadedOnModuleError",
    "LabwareNotLoadedOnLabwareError",
    "LabwareNotOnDeckError",
    "LiquidDoesNotExistError",
    "UnsupportedLabwareForActionError",
    "LabwareDefinitionDoesNotExistError",
    "LabwareCannotBeStackedError",
    "LabwareCannotSitOnDeckError",
    "LabwareIsInStackError",
    "LabwareOffsetDoesNotExistError",
    "LabwareIsNotTipRackError",
    "LabwareIsTipRackError",
    "LabwareIsAdapterError",
    "TouchTipDisabledError",
    "TouchTipIncompatibleArgumentsError",
    "WellDoesNotExistError",
    "PipetteNotLoadedError",
    "ModuleNotLoadedError",
    "ModuleNotOnDeckError",
    "ModuleNotConnectedError",
    "SlotDoesNotExistError",
    "CutoutDoesNotExistError",
    "FixtureDoesNotExistError",
    "AddressableAreaDoesNotExistError",
    "FixtureDoesNotProvideAreasError",
    "AreaNotInDeckConfigurationError",
    "IncompatibleAddressableAreaError",
    "FailedToPlanMoveError",
    "MustHomeError",
    "RunStoppedError",
    "SetupCommandNotAllowedError",
    "FixitCommandNotAllowedError",
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
    "InvalidLiquidError",
    "InvalidWavelengthError",
    "CannotPerformModuleAction",
    "ResumeFromRecoveryNotAllowedError",
    "PauseNotAllowedError",
    "ProtocolCommandFailedError",
    "GripperNotAttachedError",
    "CannotPerformGripperAction",
    "HardwareNotSupportedError",
    "LabwareMovementNotAllowedError",
    "LabwareIsNotAllowedInLocationError",
    "LocationIsOccupiedError",
    "LocationNotAccessibleByPipetteError",
    "LocationIsStagingSlotError",
    "LocationIsLidDockSlotError",
    "InvalidAxisForRobotType",
    "NotSupportedOnRobotType",
    "OffsetLocationInvalidError",
    # error occurrence models
    "ErrorOccurrence",
    "CommandNotAllowedError",
    "InvalidLiquidHeightFound",
    "LiquidHeightUnknownError",
    "IncompleteLabwareDefinitionError",
    "IncompleteWellDefinitionError",
    "OperationLocationNotInWellError",
    "InvalidDispenseVolumeError",
    "StorageLimitReachedError",
    "LiquidClassDoesNotExistError",
    "LiquidClassRedefinitionError",
]
