from opentrons.protocol_api import COLUMN, ALL
from opentrons.protocol_api._nozzle_layout import NozzleLayout

requirements = {"robotType": "Flex", "apiLevel": "2.16"}


# This protocol only ever analyzed correctly on Robot stack release 7.2.0 and 7.1.0
def run(ctx):
    tip_rack2 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "C3")
    instrument = ctx.load_instrument("flex_96channel_1000", mount="left")

    my_pcr_plate = ctx.load_labware("nest_96_wellplate_200ul_flat", "C2")
    my_other_plate = ctx.load_labware("nest_96_wellplate_200ul_flat", "C1")

    ctx.load_trash_bin("A3")

    instrument.configure_nozzle_layout(style=NozzleLayout.SINGLE, start="H12", tip_racks=[tip_rack2])

    instrument.pick_up_tip(tip_rack2.wells_by_name()["A2"])

    instrument.aspirate(50, my_pcr_plate.wells_by_name()["E4"])

    instrument.dispense(20, my_other_plate.wells_by_name()["B5"])

    instrument.drop_tip()
