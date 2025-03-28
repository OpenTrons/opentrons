"""Protocol Engine types to do with instruments."""

from typing import Union

from dataclasses import dataclass

from pydantic import BaseModel

from opentrons.types import MountType
from opentrons_shared_data.pipette.types import PipetteNameType


class LoadedPipette(BaseModel):
    """A pipette that has been loaded."""

    id: str
    pipetteName: PipetteNameType
    mount: MountType


@dataclass(frozen=True)
class CurrentAddressableArea:
    """The latest addressable area the robot has accessed."""

    pipette_id: str
    addressable_area_name: str


@dataclass(frozen=True)
class CurrentWell:
    """The latest well that the robot has accessed."""

    pipette_id: str
    labware_id: str
    well_name: str


CurrentPipetteLocation = Union[CurrentWell, CurrentAddressableArea]


# TODO(mm, 2022-11-07): Deduplicate with Vec3f.
class InstrumentOffsetVector(BaseModel):
    """Instrument Offset from home position to robot deck."""

    x: float
    y: float
    z: float
