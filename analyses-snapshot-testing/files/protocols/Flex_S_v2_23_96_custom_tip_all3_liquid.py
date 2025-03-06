from opentrons import protocol_api

# TODO: add to test
# https://opentrons.atlassian.net/browse/AUTH-1519
# I am going to get added to in the test runner
# uncomment to test
key = "liquidclass_96_tiprack_10ul"
# key = "liquidclass_96_tiprack_1100ul"
# key = "liquidclass_96_tiprack_210ul"
# protocol.override_variable_name = key

from dataclasses import dataclass


@dataclass
class Test:
    key: str
    tiprack_loadname: str
    volume: float


Tests = [
    Test(key="liquidclass_96_tiprack_10ul", tiprack_loadname="liquidclass_96_tiprack_10ul", volume=101),
    Test(key="liquidclass_96_tiprack_1100ul", tiprack_loadname="liquidclass_96_tiprack_1100ul", volume=101),
    Test(key="liquidclass_96_tiprack_210ul", tiprack_loadname="liquidclass_96_tiprack_210ul", volume=401),
]


def get_test(key):
    matches = [test for test in Tests if test.key == key]
    if not matches:
        raise ValueError(f"No test found with key: {key}")
    if len(matches) > 1:
        raise ValueError(f"Multiple tests found with key: {key}")
    return matches[0]


requirements = {"robotType": "Flex", "apiLevel": "2.23"}
metadata = {"protocolName": "96 Channel distribute_liquid all custom tiprack types with all liquid classes"}


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


def is_tip_rack_empty(tip_rack):
    """
    Check if a tip rack is completely empty.
    Args:
        tip_rack: An Opentrons tip rack labware object
    Returns:
        bool: True if the tip rack has no tips, False if it has at least one tip
    """
    range_A_to_H = [chr(i) for i in range(ord("A"), ord("H") + 1)]
    range_1_to_12 = range(1, 13)

    for row in range_A_to_H:
        for col in range_1_to_12:
            well = f"{row}{col}"
            if tip_rack.wells_by_name()[well].has_tip:
                return False

    return True


def is_missing_tips(tip_rack):
    """
    Check if a tip rack is missing any tips.
    Args:
        tip_rack: An Opentrons tip rack labware object
    Returns:
        bool: True if the tip rack is missing at least one tip, False if all tips are present
    """
    range_A_to_H = [chr(i) for i in range(ord("A"), ord("H") + 1)]
    range_1_to_12 = range(1, 13)

    for row in range_A_to_H:
        for col in range_1_to_12:
            well = f"{row}{col}"
            if not tip_rack.wells_by_name()[well].has_tip:
                return True

    return False


def using_96_channel(ctx) -> bool:
    """Check if a 96-channel pipette is loaded in the protocol."""
    for instrument in ctx.loaded_instruments.values():
        if instrument.channels == 96:
            ctx.comment("9️⃣6️⃣ channel pipette is loaded")
            return True
    return False


def load_off_deck_tipracks(ctx, tiprack_loadname, count):
    tipracks = []
    for i in range(count):
        tiprack = ctx.load_labware(tiprack_loadname, protocol_api.OFF_DECK)
        tipracks.append(OffDeckTiprack(tiprack))
    return tipracks


@dataclass
class OffDeckTiprack:
    tiprack: protocol_api.labware.Labware
    used: bool = False


def run(ctx: protocol_api.ProtocolContext):
    # Stock liquid classes
    test = get_test(key=key)
    comment = f"Test: {test.key}, Tiprack: {test.tiprack_loadname}, Volume: {test.volume}"
    ctx.comment(comment)
    water_class = ctx.define_liquid_class("water")
    ethanol_class = ctx.define_liquid_class("ethanol_80")
    glycerol_class = ctx.define_liquid_class("glycerol_50")
    pipette_96 = ctx.load_instrument("flex_96channel_1000")
    waste_chute = ctx.load_waste_chute()
    tiprack_adapter_1 = ctx.load_adapter("opentrons_flex_96_tiprack_adapter", "A1")
    tiprack_adapter_2 = ctx.load_adapter("opentrons_flex_96_tiprack_adapter", "A2")
    tiprack_adapter_3 = ctx.load_adapter("opentrons_flex_96_tiprack_adapter", "B2")
    tiprack_adapter_4 = ctx.load_adapter("opentrons_flex_96_tiprack_adapter", "C2")
    tiprack_adapter_5 = ctx.load_adapter("opentrons_flex_96_tiprack_adapter", "B3")
    tiprack_adapter_6 = ctx.load_adapter("opentrons_flex_96_tiprack_adapter", "C3")
    tiprack_adapters = [tiprack_adapter_1, tiprack_adapter_2, tiprack_adapter_3, tiprack_adapter_4, tiprack_adapter_5, tiprack_adapter_6]
    tiprack_1 = tiprack_adapter_1.load_labware(test.tiprack_loadname, "A1")
    tiprack_2 = tiprack_adapter_2.load_labware(test.tiprack_loadname, "A2")
    tiprack_3 = tiprack_adapter_3.load_labware(test.tiprack_loadname, "B2")
    tiprack_4 = tiprack_adapter_4.load_labware(test.tiprack_loadname, "C2")
    tiprack_5 = tiprack_adapter_5.load_labware(test.tiprack_loadname, "B3")
    tiprack_6 = tiprack_adapter_6.load_labware(test.tiprack_loadname, "C3")
    tip_racks = [tiprack_1, tiprack_2, tiprack_3, tiprack_4, tiprack_5, tiprack_6]
    # my box of tipracks
    off_deck_tipracks = load_off_deck_tipracks(ctx, test.tiprack_loadname, 50)
    ############ Water
    pipette_96.tip_racks = tip_racks

    # Liquids to transfer
    # https://labware.opentrons.com/#/?loadName=nest_1_reservoir_290ml
    water_source_1 = ctx.load_labware("nest_1_reservoir_290ml", "B1", "water")
    water_source_2 = ctx.load_labware("nest_1_reservoir_290ml", "C1", "water")
    water_source_3 = ctx.load_labware("nest_1_reservoir_290ml", "D1", "water")
    SOURCE_WELL = "A1"  # These are single well reservoirs
    water = ctx.define_liquid(name="Aqueous", description="H₂O", display_color="#738ee6")
    water_source_1.wells_by_name()[SOURCE_WELL].load_liquid(liquid=water, volume=1000)
    water_source_2.wells_by_name()[SOURCE_WELL].load_liquid(liquid=water, volume=1000)
    water_source_3.wells_by_name()[SOURCE_WELL].load_liquid(liquid=water, volume=1000)

    # Target
    # https://labware.opentrons.com/#/?loadName=nest_96_wellplate_2ml_deep
    target = ctx.load_labware("nest_96_wellplate_2ml_deep", "D2")
    TARGET_WELL = "A1"  # Target A1 with 96 channel

    volume = test.volume
    new_tip = "once"
    # new_tip = "always"

    pipette_96.transfer(volume, water_source_1.wells_by_name()[SOURCE_WELL], target.wells_by_name()[SOURCE_WELL], new_tip="never")


    # pipette_96.consolidate_liquid(
    #     liquid_class=water_class,
    #     volume=volume,
    #     source=[
    #         water_source_1.wells_by_name()[SOURCE_WELL],
    #         water_source_2.wells_by_name()[SOURCE_WELL],
    #         water_source_3.wells_by_name()[SOURCE_WELL],
    #     ],
    #     dest=target.wells_by_name()[TARGET_WELL],
    #     new_tip=new_tip,
    #     trash_location=waste_chute,
    # )

    # # trash all not tip labware
    # ctx.move_labware(water_source_1, waste_chute, use_gripper=True)
    # ctx.move_labware(water_source_2, waste_chute, use_gripper=True)
    # ctx.move_labware(water_source_3, waste_chute, use_gripper=True)
    # ctx.move_labware(target, waste_chute, use_gripper=True)

    # # trash any tipracks that are missing tips
    # for adapter in tiprack_adapters:
    #     if is_missing_tips(adapter.child):
    #         ctx.move_labware(adapter.child, waste_chute, use_gripper=True)

    # # find all the adapters that don't have children
    # for adapter in tiprack_adapters:
    #     if adapter.child is None:
    #         staged_tiprack = next((x for x in off_deck_tipracks if x.used is not True), None)
    #         if staged_tiprack is None:
    #             raise ValueError("No staged tiprack found")
    #         ctx.move_labware(staged_tiprack.tiprack, adapter)
    #         staged_tiprack.used = True

    # # get all the tipracks and associate them with the pipette
    # fresh_tipracks = [adapter.child for adapter in tiprack_adapters]
    # pipette_96.tip_racks = fresh_tipracks

    # ############ Ethanol
    # ethanol_source_1 = ctx.load_labware("nest_1_reservoir_290ml", "B1", "ethanol")
    # ethanol_source_2 = ctx.load_labware("nest_1_reservoir_290ml", "C1", "ethanol")
    # ethanol_source_3 = ctx.load_labware("nest_1_reservoir_290ml", "D1", "ethanol")
    # target = ctx.load_labware("nest_96_wellplate_2ml_deep", "D2")
    # ethanol = ctx.define_liquid(name="Volatile", description="80%% ethanol solution", display_color="#59c0f0")
    # ethanol_source_1.wells_by_name()[SOURCE_WELL].load_liquid(liquid=ethanol, volume=1000)
    # ethanol_source_2.wells_by_name()[SOURCE_WELL].load_liquid(liquid=ethanol, volume=1000)
    # ethanol_source_3.wells_by_name()[SOURCE_WELL].load_liquid(liquid=ethanol, volume=1000)

    # pipette_96.consolidate_liquid(
    #     liquid_class=ethanol_class,
    #     volume=volume,
    #     source=[
    #         ethanol_source_1.wells_by_name()[SOURCE_WELL],
    #         ethanol_source_2.wells_by_name()[SOURCE_WELL],
    #         ethanol_source_3.wells_by_name()[SOURCE_WELL],
    #     ],
    #     dest=target.wells_by_name()[TARGET_WELL],
    #     new_tip=new_tip,
    #     trash_location=waste_chute,
    # )

    # # trash everything
    # ctx.move_labware(ethanol_source_1, waste_chute, use_gripper=True)
    # ctx.move_labware(ethanol_source_2, waste_chute, use_gripper=True)
    # ctx.move_labware(ethanol_source_3, waste_chute, use_gripper=True)
    # ctx.move_labware(target, waste_chute, use_gripper=True)

    # ############ Glycerol
    # glycerol_source_1 = ctx.load_labware("nest_1_reservoir_290ml", "B1", "glycerol")
    # glycerol_source_2 = ctx.load_labware("nest_1_reservoir_290ml", "C1", "glycerol")
    # glycerol_source_3 = ctx.load_labware("nest_1_reservoir_290ml", "D1", "glycerol")
    # target = ctx.load_labware("nest_96_wellplate_2ml_deep", "D2")
    # # These 4 need manual intervention
    # glycerol = ctx.define_liquid(name="Viscous", description="50%% glycerol solution", display_color="#D4D4D4")
    # glycerol_source_1.wells_by_name()[SOURCE_WELL].load_liquid(liquid=glycerol, volume=1000)
    # glycerol_source_2.wells_by_name()[SOURCE_WELL].load_liquid(liquid=glycerol, volume=1000)
    # glycerol_source_3.wells_by_name()[SOURCE_WELL].load_liquid(liquid=glycerol, volume=1000)

    # # trash any tipracks that are missing tips
    # for adapter in tiprack_adapters:
    #     if is_missing_tips(adapter.child):
    #         ctx.move_labware(adapter.child, waste_chute, use_gripper=True)

    # # find all the adapters that don't have children
    # for adapter in tiprack_adapters:
    #     if adapter.child is None:
    #         staged_tiprack = next((x for x in off_deck_tipracks if x.used is not True), None)
    #         if staged_tiprack is None:
    #             raise ValueError("No staged tiprack found")
    #         ctx.move_labware(staged_tiprack.tiprack, adapter)
    #         staged_tiprack.used = True

    # # get all the tipracks and associate them with the pipette
    # fresh_tipracks = [adapter.child for adapter in tiprack_adapters]
    # pipette_96.tip_racks = fresh_tipracks

    # pipette_96.consolidate_liquid(
    #     liquid_class=glycerol_class,
    #     volume=volume,
    #     source=[
    #         glycerol_source_1.wells_by_name()[SOURCE_WELL],
    #         glycerol_source_2.wells_by_name()[SOURCE_WELL],
    #         glycerol_source_3.wells_by_name()[SOURCE_WELL],
    #     ],
    #     dest=target.wells_by_name()[TARGET_WELL],
    #     new_tip=new_tip,
    #     trash_location=waste_chute,
    # )