requirements = {"robotType": "Flex", "apiLevel": "2.23"}
metadata = {"protocolName": "96 Channel transfer_liquid"}


def run(protocol_context):
    # Stock liquid classes
    water_class = protocol_context.define_liquid_class("water")
    ethanol_class = protocol_context.define_liquid_class("ethanol_80")
    glycerol_class = protocol_context.define_liquid_class("glycerol_50")

    tiprack_200_1 = protocol_context.load_labware("opentrons_flex_96_tiprack_200ul", "A1", adapter="opentrons_flex_96_tiprack_adapter")
    tiprack_200_2 = protocol_context.load_labware("opentrons_flex_96_tiprack_200ul", "A2", adapter="opentrons_flex_96_tiprack_adapter")
    tiprack_200_3 = protocol_context.load_labware("opentrons_flex_96_tiprack_200ul", "B2", adapter="opentrons_flex_96_tiprack_adapter")
    tip_racks = [tiprack_200_1, tiprack_200_2, tiprack_200_3]
    trash = protocol_context.load_trash_bin("A3")
    pipette_96 = protocol_context.load_instrument("flex_96channel_1000", "right", tip_racks=tip_racks)

    # Liquids to transfer
    # https://labware.opentrons.com/#/?loadName=nest_1_reservoir_195ml
    water_source = protocol_context.load_labware("nest_1_reservoir_195ml", "B1", "water")
    # https://labware.opentrons.com/#/?loadName=nest_1_reservoir_290ml
    ethanol_source = protocol_context.load_labware("nest_1_reservoir_290ml", "C1", "ethanol")
    # https://labware.opentrons.com/#/?loadName=agilent_1_reservoir_290ml
    glycerol_source = protocol_context.load_labware("agilent_1_reservoir_290ml", "D1", "glycerol")
    SOURCE_WELL = "A1"  # These are single well reservoirs
    water = protocol_context.define_liquid(name="Aqueous", description="H₂O", display_color="#738ee6")
    ethanol = protocol_context.define_liquid(name="Volatile", description="80%% ethanol solution", display_color="#59c0f0")
    glycerol = protocol_context.define_liquid(name="Viscous", description="50%% glycerol solution", display_color="#D4D4D4")
    water_source.wells_by_name()[SOURCE_WELL].load_liquid(liquid=water, volume=1000)
    ethanol_source.wells_by_name()[SOURCE_WELL].load_liquid(liquid=ethanol, volume=1000)
    glycerol_source.wells_by_name()[SOURCE_WELL].load_liquid(liquid=glycerol, volume=1000)

    # Target
    target = protocol_context.load_labware("nest_96_wellplate_100ul_pcr_full_skirt", "D2")

    # Transfer

    volume = 22
    # new_tip = "once"
    new_tip = "always"

    pipette_96.transfer_liquid(
        liquid_class=water_class,
        volume=volume,
        source=water_source.wells_by_name()[SOURCE_WELL],
        dest=target.wells_by_name()[SOURCE_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    # https://opentrons.atlassian.net/browse/AUTH-1420
    # pipette_1000.transfer_liquid(
    #     liquid_class=ethanol_class,
    #     volume=volume,
    #     source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
    #     dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
    #     new_tip=new_tip,
    #     trash_location=trash,
    # )

    # https://opentrons.atlassian.net/browse/AUTH-1421
    # pipette_1000.transfer_liquid(
    #     liquid_class=glycerol_class,
    #     volume=volume,
    #     source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
    #     dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
    #     new_tip=new_tip,
    #     trash_location=trash,
    # )
