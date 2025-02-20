requirements = {"robotType": "Flex", "apiLevel": "2.23"}
metadata = {"protocolName": ""}


def run(protocol_context):
    tiprack1 = protocol_context.load_labware("opentrons_flex_96_tiprack_50ul", "C1")
    trash = protocol_context.load_trash_bin("A3")
    # pipette_50 = protocol_context.load_instrument("flex_1channel_50", "right", tip_racks=[tiprack1])
    # pipette_50 = protocol_context.load_instrument("flex_1channel_1000", "right", tip_racks=[tiprack1])
    pipette_50 = protocol_context.load_instrument("flex_1channel_50", "right", tip_racks=[tiprack1], liquid_presence_detection=True)
    nest_plate = protocol_context.load_labware("nest_96_wellplate_100ul_pcr_full_skirt", "D3")
    arma_plate = protocol_context.load_labware("armadillo_96_wellplate_200ul_pcr_full_skirt", "D2")

    # https://github.com/Opentrons/opentrons/pull/17111/files
    # water_class = protocol_context.define_liquid_class("SCARY_WATER")
    # ValueError [line 13]: Liquid class definition not found for 'SCARY_WATER'.
    water_class = protocol_context.define_liquid_class("water")

    pipette_50.transfer_liquid(
        liquid_class=water_class,  # if commented TypeError [line 14]: InstrumentContext.transfer_liquid() missing 1 required positional argument: 'liquid_class'
        volume=26.57,
        # volume=60,
        # volume=51, - no protection against pipetting more than the tip's max volume
        # breaks it up - divides by 2?
        source=nest_plate.rows()[1][
            1
        ],  # TypeError [line 16]: InstrumentContext.transfer_liquid() missing 1 required positional argument: 'source'
        dest=arma_plate.rows()[1][
            1
        ],  # TypeError [line 16]: InstrumentContext.transfer_liquid() missing 1 required positional argument: 'dest'
        # new_tip is optional and the default it seems is "once"
        # the options are "once", "always"
        new_tip="always",
        # new_tip="never", # RuntimeError [line 17]: Pipette has no tip attached to perform transfer. Either do a pick_up_tip beforehand or specify a new_tip parameter of 'once' or 'always'.
        # new_tip="once",
        # trash_location is optional and the default seems to be the last thing .load_trash_bin()
        trash_location=trash,
        # extra="extra" # TypeError [line 17]: InstrumentContext.transfer_liquid() got an unexpected keyword argument 'extra'
    )

    pipette_50.transfer(
        volume=26.57,
        # volume=60,
        source=nest_plate.rows()[0][0],
        dest=arma_plate.rows()[0][0],
        new_tip="always",
        trash_location=trash,
    )
