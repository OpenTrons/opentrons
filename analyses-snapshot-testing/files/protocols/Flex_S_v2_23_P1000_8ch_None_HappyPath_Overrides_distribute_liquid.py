# I am going to get added to in the test runner
# uncomment to test
key = "50"
# key = "50_filter"
# key = "200"
# key = "200_filter"
# key = "1000"
# key = "1000_filter"
# protocol.override_variable_name = key

from dataclasses import dataclass


requirements = {"robotType": "Flex", "apiLevel": "2.23"}
metadata = {"protocolName": "P1000 8ch distribute_liquid"}


@dataclass
class Test:
    key: str
    tiprack_loadname: str
    volume: float


Tests = [
    Test(key="50", tiprack_loadname="opentrons_flex_96_tiprack_50ul", volume=22),
    Test(key="50_filter", tiprack_loadname="opentrons_flex_96_filtertiprack_50ul", volume=88),
    Test(key="200", tiprack_loadname="opentrons_flex_96_tiprack_200ul", volume=276),
    Test(key="200_filter", tiprack_loadname="opentrons_flex_96_filtertiprack_200ul", volume=89),
    Test(key="1000", tiprack_loadname="opentrons_flex_96_tiprack_1000ul", volume=175),
    Test(key="1000_filter", tiprack_loadname="opentrons_flex_96_filtertiprack_1000ul", volume=1100),
]


def get_test(key):
    matches = [test for test in Tests if test.key == key]
    if not matches:
        raise ValueError(f"No test found with key: {key}")
    if len(matches) > 1:
        raise ValueError(f"Multiple tests found with key: {key}")
    return matches[0]


def run(ctx):
    # Stock liquid classes
    test = get_test(key=key)
    comment = f"Test: {test.key}, Tiprack: {test.tiprack_loadname}, Volume: {test.volume}"
    ctx.comment(comment)
    water_class = ctx.define_liquid_class("water")
    ethanol_class = ctx.define_liquid_class("ethanol_80")
    glycerol_class = ctx.define_liquid_class("glycerol_50")

    tiprack_1 = ctx.load_labware(test.tiprack_loadname, "B2")
    tiprack_2 = ctx.load_labware(test.tiprack_loadname, "B3")
    tiprack_3 = ctx.load_labware(test.tiprack_loadname, "D3")
    tipracks = [tiprack_1, tiprack_2, tiprack_3]
    trash = ctx.load_trash_bin("A3")
    pipette_8ch_1000 = ctx.load_instrument("flex_8channel_1000", "left", tip_racks=tipracks)
    pipette_8ch_50 = ctx.load_instrument("flex_8channel_50", "right", tip_racks=tipracks)
    # Liquids to transfer
    # Using a 15 mL reservoir as source
    # 1 row, 12 columns
    # https://labware.opentrons.com/#/?loadName=nest_12_reservoir_15ml
    source = ctx.load_labware("nest_12_reservoir_15ml", "B1", "source")
    WATER_SOURCE_WELL = "A1"
    ETHANOL_SOURCE_WELL = "A2"
    GLYCEROL_SOURCE_WELL = "A3"
    water = ctx.define_liquid(name="Aqueous", description="H₂O", display_color="#738ee6")
    ethanol = ctx.define_liquid(name="Volatile", description="80%% ethanol solution", display_color="#59c0f0")
    glycerol = ctx.define_liquid(name="Viscous", description="50%% glycerol solution", display_color="#D4D4D4")
    source.wells_by_name()[WATER_SOURCE_WELL].load_liquid(liquid=water, volume=1000)
    source.wells_by_name()[ETHANOL_SOURCE_WELL].load_liquid(liquid=ethanol, volume=1000)
    source.wells_by_name()[GLYCEROL_SOURCE_WELL].load_liquid(liquid=glycerol, volume=1000)

    # Target
    # https://labware.opentrons.com/#/?loadName=nest_96_wellplate_2ml_deep
    target = ctx.load_labware("nest_96_wellplate_2ml_deep", "D2")
    WATER_TARGET_WELLS = ["A1", "A2"]
    ETHANOL_TARGET_WELLS = ["A3", "A4"]
    GLYCEROL_TARGET_WELLS = ["A5", "A6"]

    # Distribute

    volume = test.volume
    new_tip = "once"
    # new_tip = "always"

    pipette_8ch_1000.distribute_liquid(
        liquid_class=water_class,
        volume=volume,
        source=source.wells_by_name()[WATER_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in WATER_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_1000.distribute_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=source.wells_by_name()[ETHANOL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in ETHANOL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_8ch_1000.distribute_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=source.wells_by_name()[GLYCEROL_SOURCE_WELL],
        dest=[target.wells_by_name()[well] for well in GLYCEROL_TARGET_WELLS],
        new_tip=new_tip,
        trash_location=trash,
    )
