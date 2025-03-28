"""Protocol Engine types to do with moving labware."""

from enum import Enum

from pydantic import BaseModel

from .labware_offset_vector import LabwareOffsetVector


class LabwareMovementStrategy(str, Enum):
    """Strategy to use for labware movement."""

    USING_GRIPPER = "usingGripper"
    MANUAL_MOVE_WITH_PAUSE = "manualMoveWithPause"
    MANUAL_MOVE_WITHOUT_PAUSE = "manualMoveWithoutPause"


class LabwareMovementOffsetData(BaseModel):
    """Offsets to be used during labware movement."""

    pickUpOffset: LabwareOffsetVector
    dropOffset: LabwareOffsetVector
