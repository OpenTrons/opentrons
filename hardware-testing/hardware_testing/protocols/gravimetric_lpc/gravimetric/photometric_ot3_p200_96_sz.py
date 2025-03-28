"""Photometric OT3 P1000."""
from opentrons.protocol_api import ProtocolContext

metadata = {"protocolName": "photometric-ot3-p200-96"}
requirements = {"robotType": "Flex", "apiLevel": "2.15"}

SLOTS_TIPRACK = {
    50: [5, 6, 8, 9, 11],
    200: [5, 6, 8, 9, 11],  # NOTE: ignoring this tip-rack during run() method
    1000: [5, 6, 8, 9, 11],
}
SLOT_PLATE = 3
SLOT_RESERVOIR = 2

RESERVOIR_LABWARE = "nest_1_reservoir_195ml"
PHOTOPLATE_LABWARE = "corning_96_wellplate_360ul_flat"


def run(ctx: ProtocolContext) -> None:
    """Run."""
    tipracks = [
        # FIXME: use official tip-racks once available
        ctx.load_labware(
            f"opentrons_flex_96_tiprack_{size}uL_adp", slot, namespace="custom_beta"
        )
        for size, slots in SLOTS_TIPRACK.items()
        for slot in slots
        if size == 50  # only calibrate 50ul tips for 96ch test
    ]
    reservoir = ctx.load_labware(RESERVOIR_LABWARE, SLOT_RESERVOIR)
    plate = ctx.load_labware(PHOTOPLATE_LABWARE, SLOT_PLATE)
    pipette = ctx.load_instrument("flex_96channel_200", "left")
    for rack in tipracks:
        pipette.pick_up_tip(rack["A1"])
        pipette.aspirate(10, reservoir["A1"].top())
        pipette.dispense(10, plate["A1"].top())
        pipette.drop_tip(home_after=False)
