requirements = {"robotType": "Flex", "apiLevel": "2.23"}
metadata = {"protocolName": "8channel 50 transfer_liquid"}


def run(protocol_context):
    # Stock liquid classes
    water_class = protocol_context.define_liquid_class("water")
    ethanol_class = protocol_context.define_liquid_class("ethanol_80")
    glycerol_class = protocol_context.define_liquid_class("glycerol_50")

    tiprack1 = protocol_context.load_labware("opentrons_flex_96_tiprack_50ul", "C1")
    trash = protocol_context.load_trash_bin("A3")
    pipette_8ch_50 = protocol_context.load_instrument("flex_8channel_50", "right", tip_racks=[tiprack1])

    # Liquids to transfer
    # Using a 15 mL reservoir as source
    # 1 row, 12 columns
    # https://labware.opentrons.com/#/?loadName=nest_12_reservoir_15ml
    source = protocol_context.load_labware("nest_12_reservoir_15ml", "B1", "source")
    WATER_SOURCE_WELL = "A1"
    ETHANOL_SOURCE_WELL = "A2"
    GLYCEROL_SOURCE_WELL = "A3"
    water = protocol_context.define_liquid(name="Aqueous", description="H₂O", display_color="#738ee6")
    ethanol = protocol_context.define_liquid(name="Volatile", description="80%% ethanol solution", display_color="#59c0f0")
    glycerol = protocol_context.define_liquid(name="Viscous", description="50%% glycerol solution", display_color="#D4D4D4")
    source.wells_by_name()[WATER_SOURCE_WELL].load_liquid(liquid=water, volume=1000)
    source.wells_by_name()[ETHANOL_SOURCE_WELL].load_liquid(liquid=ethanol, volume=1000)
    source.wells_by_name()[GLYCEROL_SOURCE_WELL].load_liquid(liquid=glycerol, volume=1000)

    # Target
    target = protocol_context.load_labware("nest_96_wellplate_100ul_pcr_full_skirt", "D3")
    # variables to use as destination in the transfer
    WATER_TARGET_WELL = "A1"
    ETHANOL_TARGET_WELL = "A2"
    GLYCEROL_TARGET_WELL = "A3"

    # Transfer

    volume = 30
    new_tip = "once"

    pipette_8ch_50.transfer_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    # https://opentrons.atlassian.net/browse/AUTH-1420
    # pipette_8ch_1000.transfer_liquid(
    #     liquid_class=ethanol_class,
    #     volume=volume,
    #     source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
    #     dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
    #     new_tip=new_tip,
    #     trash_location=trash,
    # )

    # https://opentrons.atlassian.net/browse/AUTH-1421
    # pipette_8ch_1000.transfer_liquid(
    #     liquid_class=glycerol_class,
    #     volume=volume,
    #     source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
    #     dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
    #     new_tip=new_tip,
    #     trash_location=trash,
    # )
