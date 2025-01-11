"""lld OT3 P200."""
from opentrons.protocol_api import ProtocolContext, OFF_DECK

metadata = {"protocolName": "liquid-sense-ot3-p200-96-vial"}
requirements = {"robotType": "Flex", "apiLevel": "2.21"}

SLOT_SCALE = 1
SLOT_DIAL = 9

SLOTS_TIPRACK = {
    20: [3],
    50: [3],
    200: [3],
}

LABWARE_ON_SCALE = "radwag_pipette_calibration_vial"


def run(ctx: ProtocolContext) -> None:
    """Run."""
    trash = ctx.load_trash_bin("A3")
    vial = ctx.load_labware(LABWARE_ON_SCALE, SLOT_SCALE)
    dial = ctx.load_labware("dial_indicator", SLOT_DIAL)
    pipette = ctx.load_instrument("flex_96channel_1000", "left")
    adapters = [
        ctx.load_adapter("opentrons_flex_96_tiprack_adapter", slot)
        for slot in SLOTS_TIPRACK[50]
    ]
    for size, slots in SLOTS_TIPRACK.items():
        tipracks = [
            adapter.load_labware(f"opentrons_flex_96_tiprack_{size}uL")
            for adapter in adapters
        ]
        for rack in tipracks:
            pipette.pick_up_tip(rack["A1"])
            pipette.aspirate(10, vial["A1"].top())
            pipette.dispense(10, vial["A1"].top())
            pipette.aspirate(10, dial["A1"].top())
            pipette.dispense(10, dial["A1"].top())
            pipette.drop_tip(trash)
            ctx.move_labware(rack, OFF_DECK)
