"""Photometric OT3 P1000 T200."""
from opentrons.protocol_api import ProtocolContext

metadata = {"apiLevel": "2.13"}


def run(ctx: ProtocolContext) -> None:
    """Run."""
    tiprack_200 = ctx.load_labware("opentrons_ot3_96_tiprack_200uL", "11")
    plate = ctx.load_labware("corning_96_wellplate_360ul_flat", "9")
    trough = ctx.load_labware("nest_12_reservoir_15ml", "8")
    pipette = ctx.load_instrument("p1000_multi_gen3", "right", tip_racks=[tiprack_200])

    row = 1
    wells = [plate[f"{col}{row}"] for col in 'ABCDEFGH']
    for well in wells:
        pipette.pick_up_tip()
        pipette.aspirate(200, trough["A1"])
        pipette.dispense(200, well)
        pipette.drop_tip()
