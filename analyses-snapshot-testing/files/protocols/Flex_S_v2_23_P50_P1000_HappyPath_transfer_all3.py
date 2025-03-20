from dataclasses import dataclass
from typing import Any


requirements = {"robotType": "Flex", "apiLevel": "2.23"}
metadata = {"protocolName": "P50 & P1000 transfer, distribute, consolidate, _liquid", "description": "with every tiprack"}


def run(ctx):
    # Stock liquid classes
    water_class = ctx.define_liquid_class("water")
    ethanol_class = ctx.define_liquid_class("ethanol_80")
    glycerol_class = ctx.define_liquid_class("glycerol_50")

    tiprack_50 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "B2")
    tiprack_200 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", "B3")
    tiprack_1000 = ctx.load_labware("opentrons_flex_96_tiprack_1000ul", "D3")
    filter_tiprack_50 = ctx.load_labware("opentrons_flex_96_filtertiprack_50ul", "C1")
    filter_tiprack_200 = ctx.load_labware("opentrons_flex_96_filtertiprack_200ul", "C2")
    filter_tiprack_1000 = ctx.load_labware("opentrons_flex_96_filtertiprack_1000ul", "C3")
    trash = ctx.load_trash_bin("A3")

    source = ctx.load_labware("nest_12_reservoir_15ml", "B1", "source")
    WATER_SOURCE_WELL = "A1"
    ETHANOL_SOURCE_WELL = "A2"
    GLYCEROL_SOURCE_WELL = "A3"

    WATER_SOURCE_WELLS = [
        "A4",
        "A5",
        "A6",
    ]
    ETHANOL_SOURCE_WELLS = [
        "A7",
        "A8",
        "A9",
    ]
    GLYCEROL_SOURCE_WELLS = [
        "A10",
        "A11",
        "A12",
    ]

    water = ctx.define_liquid(name="Aqueous", description="H₂O", display_color="#738ee6")
    ethanol = ctx.define_liquid(name="Volatile", description="80%% ethanol solution", display_color="#59c0f0")
    glycerol = ctx.define_liquid(name="Viscous", description="50%% glycerol solution", display_color="#FF69B4")

    # Load liquids into source wells
    for well in WATER_SOURCE_WELLS + [WATER_SOURCE_WELL]:
        source.wells_by_name()[well].load_liquid(liquid=water, volume=1500)
    for well in ETHANOL_SOURCE_WELLS + [ETHANOL_SOURCE_WELL]:
        source.wells_by_name()[well].load_liquid(liquid=ethanol, volume=1500)
    for well in GLYCEROL_SOURCE_WELLS + [GLYCEROL_SOURCE_WELL]:
        source.wells_by_name()[well].load_liquid(liquid=glycerol, volume=1500)

    # Target
    # https://labware.opentrons.com/#/?loadName=nest_96_wellplate_2ml_deep
    target = ctx.load_labware("nest_96_wellplate_2ml_deep", "D2")
    WATER_TARGET_WELL = "A1"
    ETHANOL_TARGET_WELL = "A2"
    GLYCEROL_TARGET_WELL = "A3"

    WATER_TARGET_WELLS = ["H4", "H5"]
    ETHANOL_TARGET_WELLS = ["H6", "H7"]
    GLYCEROL_TARGET_WELLS = ["H8", "H9"]

    # Transfer with tiprack_50

    pipette_50 = ctx.load_instrument("flex_1channel_50", "left", tip_racks=[tiprack_50])
    pipette_1000 = ctx.load_instrument("flex_1channel_1000", "right", tip_racks=[tiprack_50])
    volume = 49
    new_tip = "once"
    # new_tip = "always"

    pipette_50.transfer_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.transfer_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.transfer_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.transfer_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.transfer_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.transfer_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Distribute with tiprack_50

    pipette_50.distribute_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.distribute_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.distribute_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.distribute_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.distribute_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.distribute_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Consolidate with tiprack_50

    volume = 75
    pipette_50.consolidate_liquid(
        liquid_class=water_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.consolidate_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.consolidate_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.consolidate_liquid(
        liquid_class=water_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.consolidate_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.consolidate_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Now with filter tips !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    pipette_50.tip_racks = [filter_tiprack_50]
    pipette_1000.tip_racks = [filter_tiprack_50]
    volume = 66
    new_tip = "once"
    # new_tip = "always"

    pipette_50.transfer_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.transfer_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.transfer_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.transfer_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.transfer_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.transfer_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Distribute with filter_tiprack_50

    pipette_50.distribute_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.distribute_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.distribute_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.distribute_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.distribute_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.distribute_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    # Consolidate with filter_tiprack_50

    volume = 100
    pipette_50.consolidate_liquid(
        liquid_class=water_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.consolidate_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_50.consolidate_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.consolidate_liquid(
        liquid_class=water_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        dest=target.wells_by_name()[WATER_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.consolidate_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_1000.consolidate_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
        new_tip=new_tip,
        trash_location=trash,
    )

    #### Now all the other tipracks for the p1000

    @dataclass
    class Test:
        transfer_volume: float
        consolidate_volume: float
        distribute_volume: float
        tiprack: Any

    tests = [
        Test(transfer_volume=900, consolidate_volume=500, distribute_volume=1200, tiprack=tiprack_1000),
        Test(transfer_volume=150, consolidate_volume=370, distribute_volume=180, tiprack=tiprack_200),
        Test(transfer_volume=900, consolidate_volume=1300, distribute_volume=800, tiprack=filter_tiprack_1000),
        Test(transfer_volume=150, consolidate_volume=180, distribute_volume=120, tiprack=filter_tiprack_200),
    ]

    for test in tests:
        pipette_1000.tip_racks = [test.tiprack]
        new_tip = "once"
        # new_tip = "always"

        pipette_1000.transfer_liquid(
            liquid_class=water_class,
            volume=test.transfer_volume,
            source=source.wells_by_name()[WATER_SOURCE_WELL],
            dest=target.wells_by_name()[WATER_TARGET_WELL],
            new_tip=new_tip,
            trash_location=trash,
        )

        pipette_1000.transfer_liquid(
            liquid_class=ethanol_class,
            volume=test.transfer_volume,
            source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
            dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
            new_tip=new_tip,
            trash_location=trash,
        )

        pipette_1000.transfer_liquid(
            liquid_class=glycerol_class,
            volume=test.transfer_volume,
            source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
            dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
            new_tip=new_tip,
            trash_location=trash,
        )

        pipette_1000.distribute_liquid(
            liquid_class=water_class,
            volume=test.distribute_volume,
            source=source.wells_by_name()[WATER_SOURCE_WELL],
            dest=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
            new_tip=new_tip,
            trash_location=trash,
        )

        pipette_1000.distribute_liquid(
            liquid_class=ethanol_class,
            volume=test.distribute_volume,
            source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
            dest=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
            new_tip=new_tip,
            trash_location=trash,
        )

        pipette_1000.distribute_liquid(
            liquid_class=glycerol_class,
            volume=test.distribute_volume,
            source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
            dest=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
            new_tip=new_tip,
            trash_location=trash,
        )

        pipette_1000.consolidate_liquid(
            liquid_class=water_class,
            volume=test.consolidate_volume,
            source=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
            dest=target.wells_by_name()[WATER_TARGET_WELL],
            new_tip=new_tip,
            trash_location=trash,
        )

        pipette_1000.consolidate_liquid(
            liquid_class=ethanol_class,
            volume=test.consolidate_volume,
            source=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
            dest=target.wells_by_name()[ETHANOL_TARGET_WELL],
            new_tip=new_tip,
            trash_location=trash,
        )

        pipette_1000.consolidate_liquid(
            liquid_class=glycerol_class,
            volume=test.consolidate_volume,
            source=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
            dest=target.wells_by_name()[GLYCEROL_TARGET_WELL],
            new_tip=new_tip,
            trash_location=trash,
        )
