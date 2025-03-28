"""Protocol engine types to do with deck configuration."""

from dataclasses import dataclass
from typing import FrozenSet, List, Tuple, Optional
from enum import Enum

from opentrons.types import DeckSlotName

from opentrons_shared_data.module.types import ModuleType as SharedDataModuleType

from .util import Vec3f, Dimensions


class AddressableOffsetVector(Vec3f):
    """Offset, in deck coordinates, from nominal to actual position of an addressable area."""


@dataclass(frozen=True)
class PotentialCutoutFixture:
    """Cutout and cutout fixture id associated with a potential cutout fixture that can be on the deck."""

    cutout_id: str
    cutout_fixture_id: str
    provided_addressable_areas: FrozenSet[str]


class AreaType(Enum):
    """The type of addressable area."""

    SLOT = "slot"
    STAGING_SLOT = "stagingSlot"
    MOVABLE_TRASH = "movableTrash"
    FIXED_TRASH = "fixedTrash"
    WASTE_CHUTE = "wasteChute"
    THERMOCYCLER = "thermocycler"
    HEATER_SHAKER = "heaterShaker"
    TEMPERATURE = "temperatureModule"
    MAGNETICBLOCK = "magneticBlock"
    ABSORBANCE_READER = "absorbanceReader"
    FLEX_STACKER = "flexStacker"
    LID_DOCK = "lidDock"


@dataclass(frozen=True)
class AddressableArea:
    """Addressable area that has been loaded."""

    area_name: str
    area_type: AreaType
    base_slot: DeckSlotName
    display_name: str
    bounding_box: Dimensions
    position: AddressableOffsetVector
    compatible_module_types: List[SharedDataModuleType]


# TODO make the below some sort of better type
# TODO This should instead contain a proper cutout fixture type
DeckConfigurationType = List[
    Tuple[str, str, Optional[str]]
]  # cutout_id, cutout_fixture_id, opentrons_module_serial_number


# TODO(mm, 2023-05-10): Deduplicate with constants in
# opentrons.protocols.api_support.deck_type
# and consider moving to shared-data.
class DeckType(str, Enum):
    """Types of deck available."""

    OT2_STANDARD = "ot2_standard"
    OT2_SHORT_TRASH = "ot2_short_trash"
    OT3_STANDARD = "ot3_standard"
