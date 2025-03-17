"""QUiCKR V2 Kit Part 1 & 2."""
from opentrons.protocol_api import ProtocolContext, COLUMN, ALL, ParameterContext, Well
from abr_testing.protocols import helpers
from typing import List, Dict

metadata = {"protocolName": "QUiCKR V2 kit - part 1 and 2", "author": "Opentrons"}
requirements = {"robotType": "Flex", "apiLevel": "2.20"}


def add_parameters(parameters: ParameterContext) -> None:
    """Parameters."""
    parameters.add_bool(
        variable_name="buffer_filling",
        display_name="Fill the buffer on deck",
        default=True,
    )
    parameters.add_int(
        variable_name="num_plate_pairs",
        display_name="Number of 96-384 pairs",
        description="Number of 96-384 pairs",
        default=2,
        choices=[
            {"display_name": "1", "value": 1},
            {"display_name": "2", "value": 2},
        ],
    )


def run(protocol: ProtocolContext) -> None:
    """Quick V2 Kit Part 1 and 2."""
    num_plate_pairs = protocol.params.num_plate_pairs  # type: ignore[attr-defined]
    buffer_filling = protocol.params.buffer_filling  # type: ignore[attr-defined]
    protocol.load_trash_bin("A3")
    # deck layout
    plate_384_slots = ["C1", "B1", "A1"]
    plate_384_name = ["Assay Plate #1", "Assay Plate #2", "Assay Plate #3"]
    plate_96_slots = ["C2", "B2", "A2"]
    plate_96_name = ["Sample Plate #1", "Sample Plate #2", "Sample Plate #3"]
    plate_384 = [
        protocol.load_labware("biorad_384_wellplate_50ul", slot, name)
        for slot, name in zip(
            plate_384_slots[:num_plate_pairs], plate_384_name[:num_plate_pairs]
        )
    ]
    plate_96 = [
        protocol.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt", slot, name)
        for slot, name in zip(
            plate_96_slots[:num_plate_pairs], plate_96_name[:num_plate_pairs]
        )
    ]
    # Initial sample location
    sample_wells: List[Well] = []
    for plate in plate_96:
        for col in [0, 4, 8]:
            for row in range(8):
                sample_wells.append(plate.rows()[row][col])
    # Initial Control location
    control_wells: List[Well] = []
    for plate in plate_96:
        for well in [71, 79, 87, 95]:
            control_wells.append(plate.wells()[well])
    if buffer_filling:
        reagent_res = protocol.load_labware(
            "nest_12_reservoir_15ml", "D1", "Assay Buffer"
        )
        buffer_96 = reagent_res.wells()[11]
    tiprack_200 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D2")
    liquid_waste = protocol.load_labware("nest_1_reservoir_195ml", "A2")
    if num_plate_pairs == 1:
        deck_slots_50 = ["C3", "B3"]
        tiprack_adapter = [
            protocol.load_adapter("opentrons_flex_96_tiprack_adapter", slot)
            for slot in deck_slots_50
        ]

        tiprack_50 = [
            tiprack_adapter[i].load_labware("opentrons_flex_96_tiprack_50ul", slot)
            for i, slot in enumerate(deck_slots_50)
        ]

        tips = [tiprack_50[0], tiprack_50[1]]

    elif num_plate_pairs == 2:
        deck_slots_50 = ["C3", "B3", "A1"]
        tiprack_adapter = [
            protocol.load_adapter("opentrons_flex_96_tiprack_adapter", slot)
            for slot in deck_slots_50
        ]

        tiprack_50 = [
            tiprack_adapter[i].load_labware("opentrons_flex_96_tiprack_50ul", slot)
            for i, slot in enumerate(deck_slots_50)
        ]

        extra_50 = ["C4"]
        tiprack_50_refill = [
            protocol.load_labware("opentrons_flex_96_tiprack_50ul", slot)
            for slot in extra_50
        ]

        tips = [tiprack_50[0], tiprack_50[1], tiprack_50[2], tiprack_50_refill[0]]

    # pipette setting
    p = protocol.load_instrument("flex_96channel_200", tip_racks=tiprack_50[:3])

    # liquid info
    liquid_vols_and_wells: Dict[str, List[Dict[str, Well | List[Well] | float]]] = {
        "Samples": [{"well": sample_wells, "volume": 60.0}],
        "Assay Buffer": [
            {
                "well": [reagent_res.wells()[11]],
                "volume": 3000.0 * float(num_plate_pairs) + 2000.0,
            }
        ],
        "Controls": [{"well": control_wells, "volume": 60.0}],
    }
    helpers.load_wells_with_custom_liquids(protocol, liquid_vols_and_wells)

    helpers.find_liquid_height_of_loaded_liquids(
        protocol, liquid_vols_and_wells=liquid_vols_and_wells, pipette=p
    )

    if buffer_filling:
        protocol.pause("Please remove one tip from tiprack D2 tip H1")
        if num_plate_pairs == 1:
            protocol.pause("Please remove one tip from tiprack D2 tip H5")
        if num_plate_pairs == 2:
            protocol.pause("Please remove one tip from tiprack D2 tip H5, H8")
        if num_plate_pairs == 3:
            protocol.pause("Please remove one tip from tiprack D2 tip H5, H8, H11")
    else:
        if num_plate_pairs == 1:
            protocol.pause("Please remove one tip from tiprack D2 tip H3")
        if num_plate_pairs == 2:
            protocol.pause("Please remove one tip from tiprack D2 tip H3, H6")
        if num_plate_pairs == 3:
            protocol.pause("Please remove one tip from tiprack D2 tip H3, H6, H9")

    p.configure_nozzle_layout(style=COLUMN, start="A12", tip_racks=[tiprack_200])
    if buffer_filling:

        p.pick_up_tip()

        for plate in plate_96:
            p.aspirate(40 * 3 + 10, buffer_96.bottom(z=1), rate=0.5)
            protocol.delay(seconds=1)
            for j in range(3):
                p.dispense(40, plate.rows()[0][9 + j].bottom(z=2))
                protocol.delay(seconds=1)
            p.blow_out(buffer_96.top(z=-2))

        p.drop_tip()

        p.pick_up_tip()

        for plate in plate_96:
            for i in range(2):
                p.aspirate(40 * 3 + 10, buffer_96.bottom(z=1), rate=0.5)
                protocol.delay(seconds=1)
                for j in range(3):
                    p.dispense(40, plate.rows()[0][i * 4 + j + 1].bottom(z=2))
                    protocol.delay(seconds=1)
                p.blow_out(buffer_96.top(z=-2))

        p.drop_tip()

    col_ctr = 0
    for plate in plate_96:
        for _ in range(9):
            if not p.has_tip:
                p.pick_up_tip()
            p.aspirate(20, plate.rows()[0][col_ctr].bottom(z=2), rate=0.2)
            protocol.delay(seconds=1)
            p.dispense(20, plate.rows()[0][col_ctr + 1].bottom(z=5), rate=0.5)
            p.mix(5, 20, plate.rows()[0][col_ctr + 1].bottom(z=2))
            p.blow_out(plate.rows()[0][col_ctr + 1].top())
            col_ctr += 1
            if col_ctr > 0 and (col_ctr + 1) % 4 == 0:
                p.drop_tip()
                col_ctr += 1
        col_ctr = 0

    p.configure_nozzle_layout(style=ALL)
    for i in range(num_plate_pairs):

        if i == 1:
            protocol.move_labware(
                labware=tiprack_50[0],
                new_location="D3",
                use_gripper=True,
            )
            protocol.move_labware(
                labware=tiprack_50_refill[0],
                new_location=tiprack_adapter[0],
                use_gripper=True,
            )
        elif i == 2:
            protocol.move_labware(
                labware=tiprack_50[1],
                new_location="A1",
                use_gripper=True,
            )
            protocol.move_labware(
                labware=tiprack_50_refill[1],
                new_location=tiprack_adapter[1],
                use_gripper=True,
            )
            protocol.move_labware(
                labware=tiprack_50[2],
                new_location="A2",
                use_gripper=True,
            )
            protocol.move_labware(
                labware=tiprack_50_refill[2],
                new_location=tiprack_adapter[2],
                use_gripper=True,
            )
        for n in range(3):
            p.tip_racks = [tips[i * 2]]
            p.pick_up_tip()
            p.aspirate(7 * 2, plate_96[i]["A1"].bottom(z=2))
            protocol.delay(seconds=1)
            p.dispense(7, plate_384[i]["A1"].bottom(z=2))
            protocol.delay(seconds=1)
            p.dispense(7, plate_384[i]["A2"].bottom(z=2))
            protocol.delay(seconds=1)
            p.mix(5, 7, plate_384[i]["A2"].bottom(z=2))
            p.blow_out(plate_384[i]["A2"].top())
            p.mix(5, 7, plate_384[i]["A1"].bottom(z=2))
            p.blow_out(plate_384[i]["A1"].top())
            p.return_tip()
            p.reset_tipracks()
            p.tip_racks = [tips[i * 2 + 1]]
            p.pick_up_tip()
            p.aspirate(7 * 2, plate_96[i]["A1"].bottom(z=2))
            protocol.delay(seconds=1)
            p.dispense(7, plate_384[i]["B1"].bottom(z=2))
            protocol.delay(seconds=1)
            p.dispense(7, plate_384[i]["B2"].bottom(z=2))
            protocol.delay(seconds=1)
            p.mix(5, 7, plate_384[i]["B2"].bottom(z=2))
            p.blow_out(plate_384[i]["B2"].top())
            p.mix(5, 7, plate_384[i]["B1"].bottom(z=2))
            p.blow_out(plate_384[i]["B1"].top())
            p.return_tip()
            p.reset_tipracks()
    all_plates = plate_384 + plate_96 + [reagent_res]
    helpers.clean_up_plates(p, all_plates, liquid_waste["A1"], 50)
