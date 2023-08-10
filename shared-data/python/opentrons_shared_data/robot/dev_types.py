"""opentrons_shared_data.robot.dev_types: types for robot def."""
import enum
from typing import NewType, List, Dict, Any
from typing_extensions import Literal, TypedDict

RobotSchemaVersion1 = Literal[1]

RobotSchema = NewType("RobotSchema", Dict[str, Any])

RobotType = Literal["OT-2 Standard", "OT-3 Standard"]

class RobotTypeEnum(enum.Enum):
    OT2 = enum.auto()
    FLEX = enum.auto()


class RobotDefinition(TypedDict):
    """A python version of the robot definition type."""

    displayName: str
    robotType: RobotType
    models: List[str]
