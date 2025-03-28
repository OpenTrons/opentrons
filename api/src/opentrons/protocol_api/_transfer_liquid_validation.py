from dataclasses import dataclass
from typing import List, Union, Sequence, Optional

from opentrons.types import Location, NozzleMapInterface
from opentrons.protocols.api_support import instrument
from opentrons.protocols.advanced_control.transfers import (
    transfer_liquid_utils as tx_liquid_utils,
)
from opentrons.protocols.advanced_control.transfers.common import (
    TransferTipPolicyV2,
    TransferTipPolicyV2Type,
)

from .disposal_locations import TrashBin, WasteChute
from .labware import Labware, Well
from . import validation


@dataclass
class TransferInfo:

    sources_list: List[Well]
    destinations_list: List[Well]
    tip_policy: TransferTipPolicyV2
    tip_racks: List[Labware]
    trash_location: Union[Location, TrashBin, WasteChute]


def verify_and_normalize_transfer_args(
    source: Union[Well, Sequence[Well], Sequence[Sequence[Well]]],
    dest: Union[Well, Sequence[Well], Sequence[Sequence[Well]]],
    tip_policy: TransferTipPolicyV2Type,
    last_tip_picked_up_from: Optional[Well],
    tip_racks: List[Labware],
    nozzle_map: NozzleMapInterface,
    target_all_wells: bool,
    current_volume: float,
    trash_location: Union[Location, Well, Labware, TrashBin, WasteChute],
) -> TransferInfo:
    flat_sources_list = validation.ensure_valid_flat_wells_list_for_transfer_v2(source)
    flat_dests_list = validation.ensure_valid_flat_wells_list_for_transfer_v2(dest)
    if not target_all_wells and nozzle_map.tip_count > 1:
        flat_sources_list = tx_liquid_utils.group_wells_for_multi_channel_transfer(
            flat_sources_list, nozzle_map
        )
        flat_dests_list = tx_liquid_utils.group_wells_for_multi_channel_transfer(
            flat_dests_list, nozzle_map
        )
    for well in flat_sources_list + flat_dests_list:
        instrument.validate_takes_liquid(
            location=well.top(),
            reject_module=True,
            reject_adapter=True,
        )

    valid_new_tip = validation.ensure_new_tip_policy(tip_policy)
    if valid_new_tip == TransferTipPolicyV2.NEVER:
        if last_tip_picked_up_from is None:
            raise RuntimeError(
                "Pipette has no tip attached to perform transfer."
                " Either do a pick_up_tip beforehand or specify a new_tip parameter"
                " of 'once' or 'always'."
            )
        else:
            valid_tip_racks = [last_tip_picked_up_from.parent]
    else:
        valid_tip_racks = tip_racks
    if current_volume != 0:
        raise RuntimeError(
            "A transfer on a liquid class cannot start with liquid already in the tip."
            " Ensure that all previously aspirated liquid is dispensed before starting"
            " a new transfer."
        )

    _trash_location: Union[Location, Well, TrashBin, WasteChute]
    if isinstance(trash_location, Labware):
        _trash_location = trash_location.wells()[0]
    else:
        _trash_location = trash_location

    valid_trash_location = validation.ensure_valid_trash_location_for_transfer_v2(
        trash_location=_trash_location
    )

    return TransferInfo(
        sources_list=flat_sources_list,
        destinations_list=flat_dests_list,
        tip_policy=valid_new_tip,
        tip_racks=valid_tip_racks,
        trash_location=valid_trash_location,
    )
