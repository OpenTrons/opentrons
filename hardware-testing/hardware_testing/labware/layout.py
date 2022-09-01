"""Labware layout."""
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from typing_extensions import Final

from opentrons import protocol_api
from opentrons.protocol_api.labware import Labware

from hardware_testing.labware.definitions import load_radwag_vial_definition
from hardware_testing.opentrons_api.workarounds import is_running_in_app

APP_TIPRACK_CALIBRATION_SLOT: Final = "8"  # where the App puts the tiprack
SCALE_SLOT_ON_OT2: Final = "6"  # could also be 9, it's sort of between the two

DEFAULT_SLOT_TIPRACK: Final = APP_TIPRACK_CALIBRATION_SLOT
DEFAULT_SLOT_TIPRACK_MULTI: Final = "7"
DEFAULT_SLOT_PLATE: Final = "2"
DEFAULT_SLOT_TROUGH: Final = "5"

# usually we would only use a p300 multi
# when doing photometric testing
DEFAULT_MULTI_TIP_VOLUME: Final = 300


@dataclass
class LayoutSlots:
    """Layout Slots."""

    tiprack: Optional[str]
    tiprack_multi: Optional[str]
    trough: Optional[str]
    plate: Optional[str]
    vial: Optional[str]


class LayoutLabware:
    """Layout Labware."""

    def __init__(
        self,
        ctx: protocol_api.ProtocolContext,
        slots: LayoutSlots,
        tip_volume: int,
        multi_tip_volume: int = DEFAULT_MULTI_TIP_VOLUME,
    ) -> None:
        """Layout Labware."""
        self.slots = slots
        self._ctx = ctx
        self._tip_volume = tip_volume
        self._multi_tip_volume = multi_tip_volume

    def load(self, definitions_dir: Optional[Path] = None) -> None:
        """Load."""
        if self.slots.tiprack:
            self._ctx.load_labware(
                f"opentrons_96_tiprack_{self._tip_volume}ul",
                location=self.slots.tiprack,
            )
        if self.slots.tiprack_multi:
            self._ctx.load_labware(
                f"opentrons_96_tiprack_{self._multi_tip_volume}ul",
                location=self.slots.tiprack_multi,
            )
        if self.slots.trough:
            self._ctx.load_labware("nest_12_reservoir_15ml", location=self.slots.trough)
        if self.slots.plate:
            self._ctx.load_labware(
                "corning_96_wellplate_360ul_flat", location=self.slots.plate
            )
        if self.slots.vial:
            if is_running_in_app():
                self._ctx.load_labware(
                    "radwag_pipette_calibration_vial", location=self.slots.vial
                )
            elif definitions_dir:
                vial_def = load_radwag_vial_definition(directory=definitions_dir)
                self._ctx.load_labware_from_definition(
                    vial_def, location=self.slots.vial
                )
            else:
                raise RuntimeError("Unable to load custom labware definition")

    def _get_labware(self, slot: Optional[str]) -> Optional[Labware]:
        if slot is None:
            return None
        assert self._ctx
        slot_as_int = int(slot)
        return self._ctx.loaded_labwares[slot_as_int]

    @property
    def tiprack(self) -> Optional[Labware]:
        """Tiprack."""
        return self._get_labware(self.slots.tiprack)

    @property
    def tiprack_multi(self) -> Optional[Labware]:
        """Tiprack for multi."""
        return self._get_labware(self.slots.tiprack_multi)

    @property
    def trough(self) -> Optional[Labware]:
        """Trough."""
        return self._get_labware(self.slots.trough)

    @property
    def plate(self) -> Optional[Labware]:
        """Plate."""
        return self._get_labware(self.slots.plate)

    @property
    def vial(self) -> Optional[Labware]:
        """Vial."""
        return self._get_labware(self.slots.vial)


DEFAULT_SLOTS_GRAV = LayoutSlots(
    tiprack=APP_TIPRACK_CALIBRATION_SLOT,
    tiprack_multi=None,
    trough=None,
    plate=None,
    vial=SCALE_SLOT_ON_OT2,
)
DEFAULT_SLOTS_PHOTO = LayoutSlots(
    tiprack=APP_TIPRACK_CALIBRATION_SLOT,
    tiprack_multi=DEFAULT_SLOT_TIPRACK_MULTI,
    trough=DEFAULT_SLOT_TROUGH,
    plate=DEFAULT_SLOT_PLATE,
    vial=None,
)
DEFAULT_SLOTS_GRAV_PHOTO_SIDE_BY_SIDE = LayoutSlots(
    tiprack=APP_TIPRACK_CALIBRATION_SLOT,
    tiprack_multi=DEFAULT_SLOT_TIPRACK_MULTI,
    trough=DEFAULT_SLOT_TROUGH,
    plate=DEFAULT_SLOT_PLATE,
    vial=SCALE_SLOT_ON_OT2,
)
DEFAULT_SLOTS_GRAV_PHOTO = LayoutSlots(
    tiprack=APP_TIPRACK_CALIBRATION_SLOT,
    tiprack_multi=DEFAULT_SLOT_TIPRACK_MULTI,
    trough=DEFAULT_SLOT_TROUGH,
    plate=SCALE_SLOT_ON_OT2,
    vial=None,
)
