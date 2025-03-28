"""Gravimetric OT3."""
from opentrons.protocol_api import ProtocolContext

metadata = {"protocolName": "gravimetric-ot3-p50-single"}
requirements = {"robotType": "Flex", "apiLevel": "2.15"}

SLOT_SCALE = 4
SLOTS_TIPRACK = {
    50: [3],
    20: [6],
}
LABWARE_ON_SCALE = "radwag_pipette_calibration_vial"


def run(ctx: ProtocolContext) -> None:
    """Run."""
    tipracks = [
        ctx.load_labware(f"opentrons_flex_96_tiprack_{size}uL", slot)
        for size, slots in SLOTS_TIPRACK.items()
        for slot in slots
    ]
    vial = ctx.load_labware(LABWARE_ON_SCALE, SLOT_SCALE)
    pipette = ctx.load_instrument("flex_1channel_50", "left")
    for rack in tipracks:
        pipette.pick_up_tip(rack["A1"])
        pipette.aspirate(10, vial["A1"].top())
        pipette.dispense(10, vial["A1"].top())
        pipette.drop_tip(home_after=False)
