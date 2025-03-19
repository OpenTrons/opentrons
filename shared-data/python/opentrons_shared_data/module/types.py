"""
opentrons_shared_data.module.types: types requiring typing_extensions
for modules
"""

from typing import Any, Dict, List, Union
from typing_extensions import Literal, TypedDict

SchemaV1 = Literal["1"]
SchemaV2 = Literal["2"]
SchemaV3 = Literal["3"]
SchemaVersions = Union[SchemaV1, SchemaV2, SchemaV3]

ModuleSchema = Dict[str, Any]

MagneticModuleType = Literal["magneticModuleType"]
TemperatureModuleType = Literal["temperatureModuleType"]
ThermocyclerModuleType = Literal["thermocyclerModuleType"]
HeaterShakerModuleType = Literal["heaterShakerModuleType"]
MagneticBlockType = Literal["magneticBlockType"]
AbsorbanceReaderType = Literal["absorbanceReaderType"]
FlexStackerModuleType = Literal["flexStackerModuleType"]

ModuleType = Union[
    MagneticModuleType,
    TemperatureModuleType,
    ThermocyclerModuleType,
    HeaterShakerModuleType,
    MagneticBlockType,
    AbsorbanceReaderType,
    FlexStackerModuleType,
]

MagneticModuleModel = Literal["magneticModuleV1", "magneticModuleV2"]
TemperatureModuleModel = Literal["temperatureModuleV1", "temperatureModuleV2"]
ThermocyclerModuleModel = Literal["thermocyclerModuleV1", "thermocyclerModuleV2"]
HeaterShakerModuleModel = Literal["heaterShakerModuleV1"]
MagneticBlockModel = Literal["magneticBlockV1"]
AbsorbanceReaderModel = Literal["absorbanceReaderV1"]
FlexStackerModuleModel = Literal["flexStackerModuleV1"]

ModuleModel = Union[
    MagneticModuleModel,
    TemperatureModuleModel,
    ThermocyclerModuleModel,
    HeaterShakerModuleModel,
    MagneticBlockModel,
    AbsorbanceReaderModel,
    FlexStackerModuleModel,
]

ModuleSlotTransform = TypedDict(
    "ModuleSlotTransform", {"labwareOffset": List[List[float]]}
)

ModuleLabwareOffset = TypedDict(
    "ModuleLabwareOffset", {"x": float, "y": float, "z": float}
)

ModuleDimensions = TypedDict(
    "ModuleDimensions",
    {
        "bareOverallHeight": float,
        "overLabwareHeight": float,
        "lidHeight": float,
        "xDimension": float,
        "yDimension": float,
        "footprintXDimension": float,
        "footprintYDimension": float,
        "labwareInterfaceXDimension": float,
        "labwareInterfaceYDimension": float,
        "maxStackerFillHeight": float,
        "maxStackerRetrievableHeight": float,
    },
    total=False,
)

ModuleCalibrationPointOffset = TypedDict(
    "ModuleCalibrationPointOffset", {"x": float, "y": float}
)

ModuleCalibrationPointOffsetWithZ = TypedDict(
    "ModuleCalibrationPointOffsetWithZ", {"x": float, "y": float, "z": float}
)

CornerOffsetFromSlot = TypedDict(
    "CornerOffsetFromSlot", {"x": float, "y": float, "z": float}
)


class NamedOffset(TypedDict):
    x: float
    y: float
    z: float


class GripperOffsets(TypedDict):
    pickUpOffset: NamedOffset
    dropOffset: NamedOffset


# TODO(mc, 2022-03-18): potentially move from typed-dict to Pydantic
ModuleDefinitionV3 = TypedDict(
    "ModuleDefinitionV3",
    {
        "$otSharedSchema": Literal["module/schemas/3"],
        "moduleType": ModuleType,
        "model": ModuleModel,
        "labwareOffset": ModuleLabwareOffset,
        "cornerOffsetFromSlot": CornerOffsetFromSlot,
        "dimensions": ModuleDimensions,
        "calibrationPoint": ModuleCalibrationPointOffsetWithZ,
        "config": Dict[str, int],
        "displayName": str,
        "quirks": List[str],
        "slotTransforms": Dict[str, Dict[str, Dict[str, List[List[float]]]]],
        "compatibleWith": List[ModuleModel],
        "incompatibleWithDecks": List[str],
        "twoDimensionalRendering": Dict[str, Any],
        "gripperOffsets": Dict[str, GripperOffsets],
    },
    total=False,
)

# V2 is not used anymore. This type is preserved for historical purposes
ModuleDefinitionV2 = TypedDict(
    "ModuleDefinitionV2",
    {
        "$otSharedSchema": Literal["module/schemas/2"],
        "moduleType": ModuleType,
        "model": ModuleModel,
        "labwareOffset": ModuleLabwareOffset,
        "dimensions": ModuleDimensions,
        "calibrationPoint": ModuleCalibrationPointOffset,
        "displayName": str,
        "quirks": List[str],
        "slotTransforms": Dict[str, Dict[str, Dict[str, List[List[float]]]]],
        "compatibleWith": List[ModuleModel],
    },
)

ModuleDefinitionV1 = TypedDict(
    "ModuleDefinitionV1",
    {
        "labwareOffset": ModuleLabwareOffset,
        "dimensions": ModuleDimensions,
        "calibrationPoint": ModuleCalibrationPointOffset,
        "displayName": str,
        "loadName": str,
        "quirks": List[str],
    },
)
