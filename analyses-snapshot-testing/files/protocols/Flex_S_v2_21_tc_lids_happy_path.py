from typing import List, Dict, Any, Optional
from opentrons.protocol_api import ProtocolContext, Labware

metadata = {"protocolName": "Opentrons Flex Deck Riser with TC Lids Test"}
requirements = {"robotType": "Flex", "apiLevel": "2.21"}


"""
Setup:
 - 1-5x lids are stacked in deck D2
 - Thermocycler installed

Run:
 - For each lid in the stack (1-5x)
   - Move lid in D2 to Thermocycler
     - Remove top-most lid
     - PAUSE, wait for tester to press continue
   - Move lid from Thermocycler to new slot C2
     - Stacked onto any previously placed lids
"""

LID_STARTING_SLOT = "B2"
LID_ENDING_SLOT = "C2"
LID_COUNT = 3
LID_DEFINITION = "opentrons_tough_pcr_auto_sealing_lid"
LID_BOTTOM_DEFINITION = "opentrons_tough_pcr_auto_sealing_lid"
DECK_RISER_NAME = "opentrons_flex_deck_riser"
USING_THERMOCYCLER = True

OFFSET_DECK = {
    "pick-up": {"x": 0, "y": 0, "z": 0},
    "drop": {"x": 0, "y": 0, "z": 0},
}
OFFSET_THERMOCYCLER = {
    "pick-up": {"x": 0, "y": 0, "z": 0},
    "drop": {"x": 0, "y": 0, "z": 0},
}


def _move_labware_with_offset_and_pause(
    protocol: ProtocolContext,
    labware: Labware,
    destination: Any,
    pick_up_offset: Optional[Dict[str, float]] = None,
    drop_offset: Optional[Dict[str, float]] = None,
) -> None:
    protocol.move_labware(
        labware,
        destination,
        use_gripper=True,
        pick_up_offset=pick_up_offset,
        drop_offset=drop_offset,
    )


def run(protocol: ProtocolContext):
    # SETUP
    deck_riser_adapter = protocol.load_adapter(DECK_RISER_NAME, "B2")

    lids: List[Labware] = [deck_riser_adapter.load_labware(LID_BOTTOM_DEFINITION)]
    for i in range(LID_COUNT - 1):
        lids.append(lids[-1].load_labware(LID_DEFINITION))
    lids.reverse()  # NOTE: reversing to more easily loop through lids from top-to-bottom
    if USING_THERMOCYCLER:
        # TODO: confirm if we need to load 96-well adapter onto Thermocycler
        thermocycler = protocol.load_module("thermocyclerModuleV2")
        thermocycler.open_lid()
        plate_in_cycler = thermocycler.load_labware("armadillo_96_wellplate_200ul_pcr_full_skirt")
    else:
        plate_in_cycler = None

    # RUN
    prev_moved_lid: Optional[Labware] = None
    for lid in lids:

        if USING_THERMOCYCLER:
            _move_labware_with_offset_and_pause(
                protocol,
                lid,
                plate_in_cycler,
                pick_up_offset=OFFSET_DECK["pick-up"],
                drop_offset=OFFSET_THERMOCYCLER["drop"],
            )
            _move_labware_with_offset_and_pause(
                protocol,
                lid,
                prev_moved_lid if prev_moved_lid else LID_ENDING_SLOT,
                pick_up_offset=OFFSET_THERMOCYCLER["pick-up"],
                drop_offset=OFFSET_DECK["drop"],
            )
        else:
            _move_labware_with_offset_and_pause(
                protocol,
                lid,
                prev_moved_lid if prev_moved_lid else LID_ENDING_SLOT,
                pick_up_offset=OFFSET_DECK["pick-up"],
                drop_offset=OFFSET_DECK["drop"],
            )
        prev_moved_lid = lid
