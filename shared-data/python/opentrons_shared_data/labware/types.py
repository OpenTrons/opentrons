""" opentrons_shared_data.labware.types: types for labware defs

types in this file by and large require the use of typing_extensions.
this module shouldn't be imported unless typing.TYPE_CHECKING is true.
"""
from typing import Dict, List, NewType, Union
from typing_extensions import Literal, TypedDict, NotRequired
from .labware_definition import InnerWellGeometry
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


class NamedOffset(TypedDict):
    x: float
    y: float
    z: float


class GripperOffsets(TypedDict):
    pickUpOffset: NamedOffset
    dropOffset: NamedOffset


class LabwareParameters(TypedDict, total=False):
    format: LabwareFormat
    isTiprack: bool
    loadName: str
    isMagneticModuleCompatible: bool
    isDeckSlotCompatible: bool
    quirks: List[str]
    tipLength: float
    tipOverlap: float
    magneticModuleEngageHeight: float


class LabwareBrandData(TypedDict, total=False):
    brand: str
    brandId: List[str]
    links: List[str]


class LabwareMetadata(TypedDict, total=False):
    displayName: str
    displayCategory: LabwareDisplayCategory
    displayVolumeUnits: Literal["µL", "mL", "L"]
    tags: List[str]


class LabwareDimensions(TypedDict):
    yDimension: float
    zDimension: float
    xDimension: float


class CircularWellDefinition(TypedDict):
    shape: CircularType
    depth: float
    totalLiquidVolume: float
    x: float
    y: float
    z: float
    diameter: float
    geometryDefinitionId: NotRequired[str]


class RectangularWellDefinition(TypedDict):
    shape: RectangularType
    depth: float
    totalLiquidVolume: float
    x: float
    y: float
    z: float
    xDimension: float
    yDimension: float
    geometryDefinitionId: NotRequired[str]


WellDefinition = Union[CircularWellDefinition, RectangularWellDefinition]


class WellGroupMetadata(TypedDict, total=False):
    displayName: str
    displayCategory: LabwareDisplayCategory
    wellBottomShape: Literal["flat", "u", "v"]


class WellGroup(TypedDict, total=False):
    wells: List[str]
    metadata: WellGroupMetadata
    brand: LabwareBrandData


class LabwareDefinition(TypedDict):
    schemaVersion: Literal[2, 3]
    version: int
    namespace: str
    metadata: LabwareMetadata
    brand: LabwareBrandData
    parameters: LabwareParameters
    cornerOffsetFromSlot: NamedOffset
    ordering: List[List[str]]
    dimensions: LabwareDimensions
    wells: Dict[str, WellDefinition]
    groups: List[WellGroup]
    stackingOffsetWithLabware: NotRequired[Dict[str, NamedOffset]]
    stackingOffsetWithModule: NotRequired[Dict[str, NamedOffset]]
    allowedRoles: NotRequired[List[LabwareRoles]]
    gripperOffsets: NotRequired[Dict[str, GripperOffsets]]
    gripForce: NotRequired[float]
    gripHeightFromLabwareBottom: NotRequired[float]
    innerLabwareGeometry: NotRequired[Dict[str, InnerWellGeometry]]
    compatibleParentLabware: NotRequired[List[str]]
    stackLimit: NotRequired[int]
