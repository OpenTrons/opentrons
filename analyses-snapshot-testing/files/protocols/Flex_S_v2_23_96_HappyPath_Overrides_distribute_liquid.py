# I am going to get added to in the test runner
# uncomment to test
# key = "50"
# key = "50_filter"
# key = "200"
# key = "200_filter"
# key = "1000"
# key = "1000_filter"
# protocol.override_variable_name = key

from dataclasses import dataclass


@dataclass
class Test:
    key: str
    tiprack_loadname: str
    transfer_volume: float


Tests = [
    Test(key="50", tiprack_loadname="opentrons_flex_96_tiprack_50ul", transfer_volume=101),
    Test(key="50_filter", tiprack_loadname="opentrons_flex_96_filtertiprack_50ul", transfer_volume=101),
    Test(key="200", tiprack_loadname="opentrons_flex_96_tiprack_200ul", transfer_volume=401),
    Test(key="200_filter", tiprack_loadname="opentrons_flex_96_filtertiprack_200ul", transfer_volume=601),
    Test(key="1000", tiprack_loadname="opentrons_flex_96_tiprack_1000ul", transfer_volume=2003),
    Test(key="1000_filter", tiprack_loadname="opentrons_flex_96_filtertiprack_1000ul", transfer_volume=2003),
]


def get_test(key):
    matches = [test for test in Tests if test.key == key]
    if not matches:
        raise ValueError(f"No test found with key: {key}")
    if len(matches) > 1:
        raise ValueError(f"Multiple tests found with key: {key}")
    return matches[0]


requirements = {"robotType": "Flex", "apiLevel": "2.23"}
metadata = {"protocolName": "96 Channel distribute_liquid all tiprack types with all liquid classes"}


def comment_tip_rack_status(ctx, tip_rack):
    """
    Print out the tip status for each row in a tip rack.
    Each row (A-H) will print the well statuses for columns 1-12 in a single comment,
    with a '🟢' for present tips and a '❌' for missing tips.
    """
    range_A_to_H = [chr(i) for i in range(ord("A"), ord("H") + 1)]
    range_1_to_12 = range(1, 13)

    ctx.comment(f"Tip rack in {tip_rack.parent}")

    for row in range_A_to_H:
        status_line = f"{row}: "
        for col in range_1_to_12:
            well = f"{row}{col}"
            has_tip = tip_rack.wells_by_name()[well].has_tip
            status_emoji = "🟢" if has_tip else "❌"
            status_line += f"{well} {status_emoji}  "

        # Print the full status line for the row
        ctx.comment(status_line)


def run(protocol_context):
    # Stock liquid classes

    test = get_test(key=key)
    comment = f"Test: {test.key}, Tiprack: {test.tiprack_loadname}, Volume: {test.transfer_volume}"
    protocol_context.comment(comment)
    water_class = protocol_context.define_liquid_class("water")
    ethanol_class = protocol_context.define_liquid_class("ethanol_80")
    glycerol_class = protocol_context.define_liquid_class("glycerol_50")

    tiprack_1 = protocol_context.load_labware(test.tiprack_loadname, "A1", adapter="opentrons_flex_96_tiprack_adapter")
    tiprack_2 = protocol_context.load_labware(test.tiprack_loadname, "A2", adapter="opentrons_flex_96_tiprack_adapter")
    tiprack_3 = protocol_context.load_labware(test.tiprack_loadname, "B2", adapter="opentrons_flex_96_tiprack_adapter")
    tiprack_4 = protocol_context.load_labware(test.tiprack_loadname, "C2", adapter="opentrons_flex_96_tiprack_adapter")
    tiprack_5 = protocol_context.load_labware(test.tiprack_loadname, "B3", adapter="opentrons_flex_96_tiprack_adapter")
    tiprack_6 = protocol_context.load_labware(test.tiprack_loadname, "C3", adapter="opentrons_flex_96_tiprack_adapter")

    tip_racks = [tiprack_1, tiprack_2, tiprack_3, tiprack_4, tiprack_5, tiprack_6]
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
    # https://labware.opentrons.com/#/?loadName=nest_96_wellplate_2ml_deep
    target_1 = protocol_context.load_labware("nest_96_wellplate_2ml_deep", "D2")
    target_2 = protocol_context.load_labware("nest_96_wellplate_2ml_deep", "D3")
    TARGET_WELL = "A1"  # Target A1 with 96 channel

    # Transfer

    volume = test.transfer_volume
    new_tip = "once"
    # new_tip = "always"

    pipette_96.distribute_liquid(
        liquid_class=water_class,
        volume=volume,
        source=water_source.wells_by_name()[SOURCE_WELL],
        dest=[target_1.wells_by_name()[TARGET_WELL], target_2.wells_by_name()[TARGET_WELL]],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_96.distribute_liquid(
        liquid_class=ethanol_class,
        volume=volume,
        source=ethanol_source.wells_by_name()[SOURCE_WELL],
        dest=[target_1.wells_by_name()[TARGET_WELL], target_2.wells_by_name()[TARGET_WELL]],
        new_tip=new_tip,
        trash_location=trash,
    )

    pipette_96.distribute_liquid(
        liquid_class=glycerol_class,
        volume=volume,
        source=glycerol_source.wells_by_name()[SOURCE_WELL],
        dest=[target_1.wells_by_name()[TARGET_WELL], target_2.wells_by_name()[TARGET_WELL]],
        new_tip=new_tip,
        trash_location=trash,
    )

    for tiprack in tip_racks:
        comment_tip_rack_status(protocol_context, tiprack)
