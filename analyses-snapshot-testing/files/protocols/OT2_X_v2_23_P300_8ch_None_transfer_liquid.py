requirements = {"robotType": "OT-2", "apiLevel": "2.23"}
metadata = {"protocolName": "OT-2 Not compat with transfer_liquid"}


def run(protocol_context):
    tip_rack = protocol_context.load_labware(
        load_name="opentrons_96_tiprack_300ul",
        label="Partial Tip Rack",
        location="10",
    )

    pipette = protocol_context.load_instrument(instrument_name="p300_multi_gen2", mount="left", tip_racks=[tip_rack])

    source_labware_5 = protocol_context.load_labware(
        load_name="nest_1_reservoir_290ml",
        label="Source Reservoir",
        location="5",
    )

    destination_labware_2 = protocol_context.load_labware(
        load_name="nest_96_wellplate_100ul_pcr_full_skirt",
        label="PCR Plate",
        location="2",
    )

    water_class = protocol_context.define_liquid_class("water")

    pipette.transfer_liquid(
        liquid_class=water_class,
        volume=26.57,
        source=source_labware_5.rows()[0],
        dest=destination_labware_2.columns()[0][0],
        new_tip="always",
    )

    pipette.transfer(
        volume=26.57,
        source=source_labware_5.rows()[0],
        dest=destination_labware_2.columns()[1][0],
        new_tip="always",
    )
