"""Protocol engine types to do with modules."""

from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import (
    TypeGuard,
    Literal,
    Optional,
    List,
    Dict,
    Any,
    NamedTuple,
)

from pydantic import BaseModel, Field

from opentrons.hardware_control.modules import (
    ModuleType as ModuleType,
)

from .location import DeckSlotLocation
from .labware_offset_vector import LabwareOffsetVector
from .labware_movement import LabwareMovementOffsetData


# TODO(mc, 2022-01-18): use opentrons_shared_data.module.types.ModuleModel
class ModuleModel(str, Enum):
    """All available modules' models."""

    TEMPERATURE_MODULE_V1 = "temperatureModuleV1"
    TEMPERATURE_MODULE_V2 = "temperatureModuleV2"
    MAGNETIC_MODULE_V1 = "magneticModuleV1"
    MAGNETIC_MODULE_V2 = "magneticModuleV2"
    THERMOCYCLER_MODULE_V1 = "thermocyclerModuleV1"
    THERMOCYCLER_MODULE_V2 = "thermocyclerModuleV2"
    HEATER_SHAKER_MODULE_V1 = "heaterShakerModuleV1"
    MAGNETIC_BLOCK_V1 = "magneticBlockV1"
    ABSORBANCE_READER_V1 = "absorbanceReaderV1"
    FLEX_STACKER_MODULE_V1 = "flexStackerModuleV1"

    def as_type(self) -> ModuleType:
        """Get the ModuleType of this model."""
        if ModuleModel.is_temperature_module_model(self):
            return ModuleType.TEMPERATURE
        elif ModuleModel.is_magnetic_module_model(self):
            return ModuleType.MAGNETIC
        elif ModuleModel.is_thermocycler_module_model(self):
            return ModuleType.THERMOCYCLER
        elif ModuleModel.is_heater_shaker_module_model(self):
            return ModuleType.HEATER_SHAKER
        elif ModuleModel.is_magnetic_block(self):
            return ModuleType.MAGNETIC_BLOCK
        elif ModuleModel.is_absorbance_reader(self):
            return ModuleType.ABSORBANCE_READER
        elif ModuleModel.is_flex_stacker(self):
            return ModuleType.FLEX_STACKER

        assert False, f"Invalid ModuleModel {self}"

    @classmethod
    def is_temperature_module_model(
        cls, model: ModuleModel
    ) -> TypeGuard[TemperatureModuleModel]:
        """Whether a given model is a Temperature Module."""
        return model in [cls.TEMPERATURE_MODULE_V1, cls.TEMPERATURE_MODULE_V2]

    @classmethod
    def is_magnetic_module_model(
        cls, model: ModuleModel
    ) -> TypeGuard[MagneticModuleModel]:
        """Whether a given model is a Magnetic Module."""
        return model in [cls.MAGNETIC_MODULE_V1, cls.MAGNETIC_MODULE_V2]

    @classmethod
    def is_thermocycler_module_model(
        cls, model: ModuleModel
    ) -> TypeGuard[ThermocyclerModuleModel]:
        """Whether a given model is a Thermocycler Module."""
        return model in [cls.THERMOCYCLER_MODULE_V1, cls.THERMOCYCLER_MODULE_V2]

    @classmethod
    def is_heater_shaker_module_model(
        cls, model: ModuleModel
    ) -> TypeGuard[HeaterShakerModuleModel]:
        """Whether a given model is a Heater-Shaker Module."""
        return model == cls.HEATER_SHAKER_MODULE_V1

    @classmethod
    def is_magnetic_block(cls, model: ModuleModel) -> TypeGuard[MagneticBlockModel]:
        """Whether a given model is a Magnetic block."""
        return model == cls.MAGNETIC_BLOCK_V1

    @classmethod
    def is_absorbance_reader(
        cls, model: ModuleModel
    ) -> TypeGuard[AbsorbanceReaderModel]:
        """Whether a given model is an Absorbance Plate Reader."""
        return model == cls.ABSORBANCE_READER_V1

    @classmethod
    def is_flex_stacker(cls, model: ModuleModel) -> TypeGuard[FlexStackerModuleModel]:
        """Whether a given model is a Flex Stacker.."""
        return model == cls.FLEX_STACKER_MODULE_V1


TemperatureModuleModel = Literal[
    ModuleModel.TEMPERATURE_MODULE_V1, ModuleModel.TEMPERATURE_MODULE_V2
]
MagneticModuleModel = Literal[
    ModuleModel.MAGNETIC_MODULE_V1, ModuleModel.MAGNETIC_MODULE_V2
]
ThermocyclerModuleModel = Literal[
    ModuleModel.THERMOCYCLER_MODULE_V1, ModuleModel.THERMOCYCLER_MODULE_V2
]
HeaterShakerModuleModel = Literal[ModuleModel.HEATER_SHAKER_MODULE_V1]
MagneticBlockModel = Literal[ModuleModel.MAGNETIC_BLOCK_V1]
AbsorbanceReaderModel = Literal[ModuleModel.ABSORBANCE_READER_V1]
FlexStackerModuleModel = Literal[ModuleModel.FLEX_STACKER_MODULE_V1]


class ModuleDimensions(BaseModel):
    """Dimension type for modules."""

    bareOverallHeight: float
    overLabwareHeight: float
    lidHeight: Optional[float] = None
    maxStackerFillHeight: Optional[float] = None
    maxStackerRetrievableHeight: Optional[float] = None


# TODO(mm, 2022-11-07): Deduplicate with Vec3f.
class ModuleCalibrationPoint(BaseModel):
    """Calibration Point type for module definition."""

    x: float
    y: float
    z: float


# TODO(mm, 2023-04-13): Move to shared-data, so this binding can be maintained alongside the JSON
# schema that it's sourced from. We already do that for labware definitions and JSON protocols.
class ModuleDefinition(BaseModel):
    """A module definition conforming to module definition schema v3."""

    # Note: This field is misleading.
    #
    # This class only models v3 definitions ("module/schemas/3"), not v2 ("module/schemas/2").
    # labwareOffset is required to have a z-component, for example.
    #
    # When parsing from a schema v3 JSON definition into this model,
    # the definition's `"$otSharedSchema": "module/schemas/3"` field will be thrown away
    # because it has a dollar sign, which doesn't match this field.
    # Then, this field will default to "module/schemas/2", because no value was provided.
    #
    # We should fix this field once Jira RSS-221 is resolved. RSS-221 makes it difficult to fix
    # because robot-server has been storing and loading these bad fields in its database.
    otSharedSchema: str = Field("module/schemas/2", description="The current schema.")

    moduleType: ModuleType = Field(
        ...,
        description="Module type (Temperature/Magnetic/Thermocycler)",
    )

    model: ModuleModel = Field(..., description="Model name of the module")

    labwareOffset: LabwareOffsetVector = Field(
        ...,
        description="Labware offset in x, y, z.",
    )

    dimensions: ModuleDimensions = Field(..., description="Module dimension")

    calibrationPoint: ModuleCalibrationPoint = Field(
        ...,
        description="Calibration point of module.",
    )

    displayName: str = Field(..., description="Display name.")

    quirks: List[str] = Field(..., description="Module quirks")

    # In releases prior to https://github.com/Opentrons/opentrons/pull/11873 (v6.3.0),
    # the matrices in slotTransforms were 3x3.
    # After, they are 4x4, even though there was no schema version bump.
    #
    # Because old objects of this class, with the 3x3 matrices, were stored in robot-server's
    # database, this field needs to stay typed loosely enough to support both sizes.
    # We can fix this once Jira RSS-221 is resolved.
    slotTransforms: Dict[str, Any] = Field(
        ...,
        description="Dictionary of transforms for each slot.",
    )

    compatibleWith: List[ModuleModel] = Field(
        ...,
        description="List of module models this model is compatible with.",
    )
    gripperOffsets: Optional[Dict[str, LabwareMovementOffsetData]] = Field(
        default_factory=dict,
        description="Offsets to use for labware movement using gripper",
    )


class LoadedModule(BaseModel):
    """A module that has been loaded."""

    id: str
    model: ModuleModel
    location: Optional[DeckSlotLocation] = None
    serialNumber: Optional[str] = None


class SpeedRange(NamedTuple):
    """Minimum and maximum allowed speeds for a shaking module."""

    min: int
    max: int


class TemperatureRange(NamedTuple):
    """Minimum and maximum allowed temperatures for a heating module."""

    min: float
    max: float


class HeaterShakerLatchStatus(Enum):
    """Heater-Shaker latch status for determining pipette and labware movement errors."""

    CLOSED = "closed"
    OPEN = "open"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class HeaterShakerMovementRestrictors:
    """Shaking status, latch status and slot location for determining movement restrictions."""

    plate_shaking: bool
    latch_status: HeaterShakerLatchStatus
    deck_slot: int


ABSMeasureMode = Literal["single", "multi"]


# TODO(mm, 2022-11-07): Deduplicate with Vec3f.
class ModuleOffsetVector(BaseModel):
    """Offset, in deck coordinates, from nominal to actual position of labware on a module."""

    x: float
    y: float
    z: float


@dataclass
class ModuleOffsetData:
    """Module calibration offset data."""

    moduleOffsetVector: ModuleOffsetVector
    location: DeckSlotLocation


class StackerFillEmptyStrategy(str, Enum):
    """Strategy to use for filling or emptying a stacker."""

    MANUAL_WITH_PAUSE = "manualWithPause"
    LOGICAL = "logical"
