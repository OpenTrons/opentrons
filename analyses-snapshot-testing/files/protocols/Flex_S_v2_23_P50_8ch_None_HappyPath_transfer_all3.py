requirements = {"robotType": "Flex", "apiLevel": "2.23"}
metadata = {"protocolName": "P50 8ch transfer, distribute, consolidate, _liquid"}


def run(ctx):
    # Stock liquid classes
    water_class = ctx.define_liquid_class("water")
    ethanol_class = ctx.define_liquid_class("ethanol_80")
    glycerol_class = ctx.define_liquid_class("glycerol_50")

    tiprack_1 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "B2")
    tiprack_2 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "B3")
    tiprack_3 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "D3")
    filter_tiprack_1 = ctx.load_labware("opentrons_flex_96_filtertiprack_50ul", "C1")
    filter_tiprack_2 = ctx.load_labware("opentrons_flex_96_filtertiprack_50ul", "C2")
    filter_tiprack_3 = ctx.load_labware("opentrons_flex_96_filtertiprack_50ul", "C3")
    tipracks = [tiprack_1, tiprack_2, tiprack_3]
    filter_tipracks = [filter_tiprack_1, filter_tiprack_2, filter_tiprack_3]
    trash = ctx.load_trash_bin("A3")

    # Liquids to transfer
    # Using a 15 mL reservoir as source
    # 1 row, 12 columns
    # https://labware.opentrons.com/#/?loadName=nest_12_reservoir_15ml
    source = ctx.load_labware("nest_12_reservoir_15ml", "B1", "source")
    WATER_SOURCE_WELL = "A1"
    ETHANOL_SOURCE_WELL = "A2"
    GLYCEROL_SOURCE_WELL = "A3"

    WATER_SOURCE_WELLS = ["A4", "A5", "A6", "A7"]
    ETHANOL_SOURCE_WELLS = ["A8", "A9", "A10", "A11"]
    GLYCEROL_SOURCE_WELLS = ["A12", "B1", "B2", "B3"]

    water = ctx.define_liquid(name="Aqueous", description="H₂O", display_color="#738ee6")
    ethanol = ctx.define_liquid(name="Volatile", description="80%% ethanol solution", display_color="#59c0f0")
    glycerol = ctx.define_liquid(name="Viscous", description="50%% glycerol solution", display_color="#D4D4D4")

    # Load liquids into source wells
    for well in WATER_SOURCE_WELLS + WATER_SOURCE_WELL:
        source.wells_by_name()[well].load_liquid(liquid=water, volume=1000)
    for well in ETHANOL_SOURCE_WELLS + ETHANOL_SOURCE_WELL:
        source.wells_by_name()[well].load_liquid(liquid=ethanol, volume=1000)
    for well in GLYCEROL_SOURCE_WELLS:
        source.wells_by_name()[well].load_liquid(liquid=glycerol, volume=1000)

    # Target
    # https://labware.opentrons.com/#/?loadName=nest_96_wellplate_2ml_deep
    target = ctx.load_labware("nest_96_wellplate_2ml_deep", "D2")
    WATER_TARGET_WELL = "A1"
    ETHANOL_TARGET_WELL = "A2"
    GLYCEROL_TARGET_WELL = "A3"

    WATER_TARGET_WELLS = ["H4", "H5"]
    ETHANOL_TARGET_WELLS = ["H6", "H7"]
    GLYCEROL_TARGET_WELLS = ["H8", "H9"]

    # Transfer with regular tips

    pipette_8ch_50 = ctx.load_instrument("flex_8channel_50", "left", tip_racks=tipracks)
    volume = 37.5
    new_tip = "once"
    # new_tip = "always"

    pipette_8ch_50.transfer_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.transfer_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.transfer_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Distribute with regular tips

    pipette_8ch_50.distribute_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.distribute_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.distribute_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Consolidate with regular tips
    volume = 75
    pipette_8ch_50.consolidate_liquid(
        liquid_class=water_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.consolidate_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.consolidate_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Now with filter tips !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    pipette_8ch_50.tip_racks = filter_tipracks
    volume = 66
    new_tip = "once"
    # new_tip = "always"

    pipette_8ch_50.transfer_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.transfer_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.transfer_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Distribute with filter tips

    pipette_8ch_50.distribute_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.distribute_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.distribute_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Consolidate with filter tips
    volume = 100
    pipette_8ch_50.consolidate_liquid(
        liquid_class=water_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.consolidate_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_50.consolidate_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )
