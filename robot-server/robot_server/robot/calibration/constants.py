from __future__ import annotations

from typing import Dict, Final, Set
from dataclasses import dataclass
from opentrons.types import Point, Mount


STATE_WILDCARD: Final = "*"

_lw_fmt = "opentrons_96_{}_{}ul"
_filtertiprack = "filtertiprack"
_tiprack = "tiprack"

TIPRACK_10 = _lw_fmt.format(_tiprack, 10)
TIPRACK_20 = _lw_fmt.format(_tiprack, 20)
TIPRACK_300 = _lw_fmt.format(_tiprack, 300)
TIPRACK_1000 = _lw_fmt.format(_tiprack, 1000)

FILTERTIPRACK_10 = _lw_fmt.format(_filtertiprack, 10)
FILTERTIPRACK_20 = _lw_fmt.format(_filtertiprack, 20)
FILTERTIPRACK_300 = _lw_fmt.format(_filtertiprack, 300)
FILTERTIPRACK_1000 = _lw_fmt.format(_filtertiprack, 1000)


JOG_TO_DECK_SLOT: Final = "5"


@dataclass
class LabwareInfo:
    slot: str
    load_name: str
    well: str


@dataclass
class LabwareLookUp:
    load_name: str
    alternatives: Set[str]


TIP_RACK_LOOKUP_BY_MAX_VOL: Dict[str, LabwareLookUp] = {
    "10": LabwareLookUp(
        load_name=TIPRACK_10,
        alternatives={TIPRACK_20, FILTERTIPRACK_10, FILTERTIPRACK_20},
    ),
    "20": LabwareLookUp(
        load_name=TIPRACK_20,
        alternatives={TIPRACK_10, FILTERTIPRACK_10, FILTERTIPRACK_20},
    ),
    "50": LabwareLookUp(
        load_name=TIPRACK_300, alternatives={TIPRACK_300, FILTERTIPRACK_300}
    ),
    "300": LabwareLookUp(
        load_name=TIPRACK_300, alternatives={TIPRACK_300, FILTERTIPRACK_300}
    ),
    "1000": LabwareLookUp(
        load_name=TIPRACK_1000, alternatives={TIPRACK_1000, FILTERTIPRACK_1000}
    ),
}

POINT_ONE_ID: Final = "1BLC"
POINT_TWO_ID: Final = "3BRC"
POINT_THREE_ID: Final = "7TLC"

MOVE_TO_TIP_RACK_SAFETY_BUFFER = Point(0, 0, 10)
MOVE_TO_POINT_SAFETY_BUFFER = Point(0, 0, 5)
MOVE_TO_DECK_SAFETY_BUFFER = Point(0, 10, 5)
MOVE_TO_REF_POINT_SAFETY_BUFFER = Point(0, 0, 5)

TRASH_WELL = "A1"
TRASH_REF_POINT_OFFSET = Point(-57.84, -55, 0)  # offset from center of trash

CAL_BLOCK_SETUP_BY_MOUNT: Dict[Mount, LabwareInfo] = {
    Mount.LEFT: LabwareInfo(
        load_name="opentrons_calibrationblock_short_side_right", slot="3", well="A1"
    ),
    Mount.RIGHT: LabwareInfo(
        load_name="opentrons_calibrationblock_short_side_left", slot="1", well="A2"
    ),
}
CAL_BLOCK_SETUP_CAL_CHECK: LabwareInfo = LabwareInfo(
    load_name="opentrons_calibrationblock_short_side_right", slot="6", well="A1"
)
