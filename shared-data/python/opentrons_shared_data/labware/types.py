""" opentrons_shared_data.labware.types: types for labware defs

types in this file by and large require the use of typing_extensions.
this module shouldn't be imported unless typing.TYPE_CHECKING is true.
"""
from typing import NewType
from typing_extensions import Literal, TypedDict, NotRequired
from .constants import (
    CircularType,
    RectangularType,
)

LabwareUri = NewType("LabwareUri", str)

LabwareDisplayCategory = Literal[
    "tipRack",
    "tubeRack",
    "reservoir",
    "trash",
    "wellPlate",
    "aluminumBlock",
    "adapter",
    "other",
    "lid",
    "system",
]

LabwareFormat = Literal[
    "96Standard",
    "384Standard",
    "trough",
    "irregular",
    "trash",
]

LabwareRoles = Literal[
    "labware",
    "fixture",
    "adapter",
    "maintenance",
    "lid",
    "system",
]


class Vector(TypedDict):
    x: float
    y: float
    z: float


class GripperOffsets(TypedDict):
    pickUpOffset: Vector
    dropOffset: Vector


class LabwareParameters2(TypedDict):
    format: LabwareFormat
    isTiprack: bool
    loadName: str
    isMagneticModuleCompatible: bool
    quirks: NotRequired[list[str]]
    tipLength: NotRequired[float]
    tipOverlap: NotRequired[float]
    magneticModuleEngageHeight: NotRequired[float]


class LabwareParameters3(LabwareParameters2, TypedDict):
    isDeckSlotCompatible: NotRequired[bool]


class LabwareBrandData(TypedDict):
    brand: str
    brandId: NotRequired[list[str]]
    links: NotRequired[list[str]]


class LabwareMetadata(TypedDict):
    displayName: str
    displayCategory: LabwareDisplayCategory
    displayVolumeUnits: Literal["µL", "mL", "L"]
    tags: NotRequired[list[str]]


class LabwareDimensions(TypedDict):
    yDimension: float
    zDimension: float
    xDimension: float


class CircularWellDefinition2(TypedDict):
    shape: CircularType
    depth: float
    totalLiquidVolume: float
    x: float
    y: float
    z: float
    diameter: float


class RectangularWellDefinition2(TypedDict):
    shape: RectangularType
    depth: float
    totalLiquidVolume: float
    x: float
    y: float
    z: float
    xDimension: float
    yDimension: float


WellDefinition2 = CircularWellDefinition2 | RectangularWellDefinition2


class CircularWellDefinition3(CircularWellDefinition2, TypedDict):
    geometryDefinitionId: NotRequired[str]


class RectangularWellDefinition3(RectangularWellDefinition2, TypedDict):
    geometryDefinitionId: NotRequired[str | None]


WellDefinition3 = CircularWellDefinition3 | RectangularWellDefinition3


class WellGroupMetadata(TypedDict):
    displayName: NotRequired[str]
    displayCategory: NotRequired[LabwareDisplayCategory]
    wellBottomShape: NotRequired[Literal["flat", "u", "v"]]


class WellGroup(TypedDict):
    wells: list[str]
    metadata: WellGroupMetadata
    brand: NotRequired[LabwareBrandData]


class LabwareDefinition2(TypedDict):
    schemaVersion: Literal[2]
    version: int
    namespace: str
    metadata: LabwareMetadata
    brand: LabwareBrandData
    parameters: LabwareParameters2
    cornerOffsetFromSlot: Vector
    ordering: list[list[str]]
    dimensions: LabwareDimensions
    wells: dict[str, WellDefinition2]
    groups: list[WellGroup]
    stackingOffsetWithLabware: NotRequired[dict[str, Vector]]
    stackingOffsetWithModule: NotRequired[dict[str, Vector]]
    allowedRoles: NotRequired[list[LabwareRoles]]
    gripperOffsets: NotRequired[dict[str, GripperOffsets]]
    gripForce: NotRequired[float]
    gripHeightFromLabwareBottom: NotRequired[float]
    stackLimit: NotRequired[int]


# Class to mix in the "$otSharedSchema" key. This cannot be defined with the normal
# TypedDict class syntax because it contains a dollar sign.
_OTSharedSchemaMixin = TypedDict(
    "_OTSharedSchemaMixin", {"$otSharedSchema": Literal["#/labware/schemas/3"]}
)


class LabwareDefinition3(_OTSharedSchemaMixin, TypedDict):
    schemaVersion: Literal[3]
    version: int
    namespace: str
    metadata: LabwareMetadata
    brand: LabwareBrandData
    parameters: LabwareParameters3
    cornerOffsetFromSlot: Vector
    ordering: list[list[str]]
    dimensions: LabwareDimensions
    wells: dict[str, WellDefinition3]
    groups: list[WellGroup]
    stackingOffsetWithLabware: NotRequired[dict[str, Vector]]
    stackingOffsetWithModule: NotRequired[dict[str, Vector]]
    allowedRoles: NotRequired[list[LabwareRoles]]
    gripperOffsets: NotRequired[dict[str, GripperOffsets]]
    gripForce: NotRequired[float]
    gripHeightFromLabwareBottom: NotRequired[float]
    # The innerLabwareGeometry dict values are not currently modeled in these
    # TypedDict-based bindings. The only code that cares about them
    # currentlyuses our Pydantic-based bindings instead.
    innerLabwareGeometry: NotRequired[dict[str, object] | None]
    compatibleParentLabware: NotRequired[list[str]]
    stackLimit: NotRequired[int]


LabwareDefinition = LabwareDefinition2 | LabwareDefinition3
