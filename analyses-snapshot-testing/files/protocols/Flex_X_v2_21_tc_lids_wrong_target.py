from typing import List, Dict, Any, Optional
from opentrons.protocol_api import ProtocolContext, Labware

metadata = {"Stacking a deep well plate on its adapter "}
requirements = {"robotType": "Flex", "apiLevel": "2.21"}


def run(protocol: ProtocolContext):
    temp_mod = protocol.load_module(module_name="temperature module gen2", location="D1")
    LID_COUNT = 5
    LID_DEFINITION = "opentrons_tough_pcr_auto_sealing_lid"
    LID_BOTTOM_DEFINITION = "opentrons_tough_pcr_auto_sealing_lid"
    adapter = temp_mod.load_adapter("opentrons_96_deep_well_temp_mod_adapter")
    stack = protocol.load_labware("nest_96_wellplate_2ml_deep", "A1")
    deck_riser_adapter = protocol.load_adapter("opentrons_flex_deck_riser", "B2")
    protocol.move_labware(stack, adapter)
    lids = [deck_riser_adapter.load_labware(LID_BOTTOM_DEFINITION, "D2")]
    for i in range(LID_COUNT - 1):
        lids.append(lids[-1].load_labware(LID_DEFINITION))
    lids.reverse()  # NOTE: reversing to more easily loop through lids from top-to-bottom

    protocol.move_labware(
        lids[0],
        stack,
        use_gripper=True,
    )
