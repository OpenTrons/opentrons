"""MiSeq Library Preparation Protocol."""
from opentrons.protocol_api import (
    ProtocolContext,
    ParameterContext,
    InstrumentContext,
    Well,
    Liquid,
)
from typing import Tuple, Optional
from opentrons.protocol_api import COLUMN, ALL
from abr_testing.protocols import helpers
from opentrons.protocol_api.module_contexts import (
    HeaterShakerContext,
    ThermocyclerContext,
    TemperatureModuleContext,
)

metadata = {
    "protocolName": "MiSeq Library Preparation Protocol",
    "author": "Anurag Kanase <anurag.kanase@opentrons.com>",
    "description": "Two-step PCR protocol for Illumina MiSeq library prep.",
}


requirements = {"robotType": "Flex", "apiLevel": "2.21"}


def add_parameters(parameters: ParameterContext) -> None:
    """Parameters."""
    helpers.create_dot_bottom_parameter(parameters)
    helpers.create_deactivate_modules_parameter(parameters)
    helpers.create_disposable_lid_parameter(parameters)
    parameters.add_bool(
        variable_name = "perform_column_tip_pickup",
        display_name = "Perform Column Tip Pickup",
        default = True
    )


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    # Load Parameters
    dot_bottom = protocol.params.dot_bottom  # type: ignore[attr-defined]
    deactivate_modules_bool = protocol.params.deactivate_modules  # type: ignore[attr-defined]
    disposable_lid = protocol.params.disposable_lid  # type: ignore[attr-defined]
    perform_column_tip_pick_up = protocol.params.perform_column_tip_pickup # type: ignore[attr-defined]
    if disposable_lid:
        lids = helpers.load_disposable_lids(
            protocol=protocol, num_of_lids=3, deck_slot=["A2"], deck_riser=False
        )

    def transfer(
        pipette: InstrumentContext,
        volume: float,
        source: Well,
        dest: Well,
        mix_after: Optional[Tuple] = None,
    ) -> None:
        """
        Custom transfer function combining aspirate and dispense with optional mixing and flow rate control

        Args:
            pipette: The pipette object to use
            volume: Volume to transfer in µL
            source: Source well/location
            dest: Destination well/location
            mix_after: Tuple of (mix_count, mix_volume) for mixing after dispense
            aspirate_flow_rate: Optional custom flow rate for aspiration
            dispense_flow_rate: Optional custom flow rate for dispensing
        """
        # Store original flow rates
        original_asp_rate = pipette.flow_rate.aspirate
        original_disp_rate = pipette.flow_rate.dispense

        # Perform transfer
        pipette.aspirate(volume, source.bottom(1))
        pipette.move_to(source.top(), speed=5)
        pipette.dispense(volume, dest.bottom(dot_bottom))
        pipette.move_to(dest.top(), speed=5)

        # Mix if specified
        if mix_after:
            mix_count, mix_volume = mix_after
            pipette.mix(mix_count, mix_volume)

        # Restore original flow rates
        pipette.flow_rate.aspirate = original_asp_rate
        pipette.flow_rate.dispense = original_disp_rate

    # Load modules
    waste_chute = protocol.load_waste_chute()
    thermocycler: ThermocyclerContext = protocol.load_module("thermocyclerModuleV2")  # type: ignore[assignment]
    temp_module: TemperatureModuleContext = protocol.load_module("temperatureModuleV2", "C1")  # type: ignore[assignment]
    reagent_block = temp_module.load_adapter("opentrons_96_well_aluminum_block")
    heater_shaker: HeaterShakerContext = protocol.load_module("heaterShakerModuleV1", "D1")  # type: ignore[assignment]
    hs_adapter = heater_shaker.load_adapter("opentrons_96_pcr_adapter")

    # Load labware
    pcr_reagents_plate = reagent_block.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", label="PCR Master Mix"
    )
    pcr1_plate = thermocycler.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", label="PCR1"
    )
    dna_plate = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "A3", label="DNA"
    )
    indices_plate = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "C3", label="Indices"
    )
    pcr1_dilution_plate = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "A4", label="PCR1 Dilution"
    )
    pcr2_dilution_plate = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "C4", label="PCR2 Dilution"
    )
    reservoir = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "D2", label="Water Reservoir"
    )
    eppendorf_384 = protocol.load_labware(
        "appliedbiosystemsmicroamp_384_wellplate_40ul",
        "B4",
        label="Applied Biosystems 384",
    )
    pcr2_plate = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "D4", label="PCR2 Plate"
    )

    # Load tips
    tiprack_adapter = protocol.load_adapter("opentrons_flex_96_tiprack_adapter", "B3")
    tiprack_1 = tiprack_adapter.load_labware("opentrons_flex_96_tiprack_50ul")
    partial_tiprack = protocol.load_labware("opentrons_flex_96_tiprack_50ul", "C2")

    # Load pipette
    p96 = protocol.load_instrument("flex_96channel_200", "left")

    def column(pipette: InstrumentContext = p96) -> None:
        pipette.configure_nozzle_layout(style=COLUMN, start="A1")

    def all(pipette: InstrumentContext = p96) -> None:
        pipette.configure_nozzle_layout(style=ALL)

    def add_liquid(
        name: str, color: str, well: Well, volume: float
    ) -> Tuple[Liquid, Well]:
        liquid = protocol.define_liquid(
            name=name, description="generic", display_color=color
        )
        well.load_liquid(liquid=liquid, volume=volume)
        return liquid, well

    # liquids
    color_hex_codes = [
        "#9400D3",
        "#FFC0CB",  # Light pink
        "#00CED1",  # Light blue
        "#7CFC00",  # Lime green
        "#FF4500",  # Orange
        "#9400D3",  # Violet
        "#bd5338",
    ]

    pcr_mm1 = pcr_reagents_plate["A1"]
    pcr_mm2 = pcr_reagents_plate["A2"]
    water = reservoir["A1"]
    for well in reservoir.wells():
        add_liquid("water", color_hex_codes[0], well, 150)
    for well in pcr_reagents_plate.columns()[0]:
        add_liquid("pcr_mm1", color_hex_codes[1], well, 100)
    for well in pcr_reagents_plate.columns()[1]:
        add_liquid("pcr_mm2", color_hex_codes[2], well, 100)
    for well in indices_plate.wells():
        add_liquid("Index", color_hex_codes[3], well, 100)
    for well in dna_plate.wells():
        add_liquid("DNA", color_hex_codes[4], well, 100)

    # Protocol steps
    protocol.comment("Starting MiSeq library preparation protocol")

    # Step 1-2: Set temperatures
    thermocycler.open_lid()
    temp_module.set_temperature(8)
    thermocycler.set_block_temperature(8)

    column_tips = partial_tiprack.rows()[0][::-1]
    if perform_column_tip_pick_up:
        #Step 3: Dispense PCR1 master mix (avoiding multidispense to maintian accuracy)
        column()
        protocol.comment("Dispensing PCR1 master mix")
        p96.pick_up_tip(column_tips.pop(0))
        for col in range(12):
            print(col)
            transfer(p96, 7.5, pcr_mm1, pcr1_plate.rows()[0][col])
        p96.drop_tip()

    # Step 4: Transfer DNA samples
    all()
    protocol.comment("Transferring DNA samples")
    p96.pick_up_tip(tiprack_1["A1"])
    transfer(p96, 5, dna_plate["A1"], pcr1_plate["A1"])
    p96.return_tip()

    # Step 5: Shake
    protocol.comment("Shaking PCR1 plate")
    heater_shaker.open_labware_latch()
    protocol.move_labware(pcr1_plate, hs_adapter, use_gripper=True)
    heater_shaker.close_labware_latch()
    heater_shaker.set_and_wait_for_shake_speed(500)
    protocol.delay(seconds=30)
    heater_shaker.deactivate_shaker()
    heater_shaker.open_labware_latch()

    # Step 6: PCR1 thermal cycling
    protocol.comment("Starting PCR1 thermal cycling")
    protocol.move_labware(pcr1_plate, thermocycler, use_gripper=True)
    heater_shaker.close_labware_latch()
    if disposable_lid:
        protocol.move_labware(lids[0], pcr1_plate, use_gripper=True)
    thermocycler.close_lid()
    thermocycler.set_lid_temperature(105)

    # Initial denaturation
    thermocycler.execute_profile(
        steps=[{"temperature": 95, "hold_time_seconds": 180}], repetitions=1
    )

    # 35 cycles
    thermocycler.execute_profile(
        steps=[
            {"temperature": 95, "hold_time_seconds": 30},
            {"temperature": 60, "hold_time_seconds": 15},
            {"temperature": 72, "hold_time_seconds": 15},
        ],
        repetitions=35,
    )

    # Final extension
    thermocycler.execute_profile(
        steps=[
            {"temperature": 72, "hold_time_seconds": 300},
            {"temperature": 20, "hold_time_seconds": 60},
        ],
        repetitions=1,
    )

    thermocycler.set_block_temperature(8)
    thermocycler.open_lid()
    if disposable_lid:
        protocol.move_labware(lids[0], waste_chute, use_gripper=True)
        lids.pop(0)
    # Steps 7-8: Move plates
    protocol.comment("Setting up PCR2")
    protocol.move_labware(pcr1_plate, "B2", use_gripper=True)

    protocol.move_labware(pcr2_plate, thermocycler, use_gripper=True)
    # Step 9: Dispense PCR2 master mix
    protocol.comment("Dispensing PCR2 master mix")
    if perform_column_tip_pick_up:
        column()
        p96.pick_up_tip(column_tips.pop(0))
        for col in range(12):
            transfer(p96, 6, pcr_mm2, pcr2_plate.rows()[0][col])
        p96.drop_tip()

    protocol.comment("Rearranging Deck for Dilutions")
    heater_shaker.open_labware_latch()
    protocol.move_labware(pcr_reagents_plate, hs_adapter, use_gripper=True)
    protocol.move_labware(partial_tiprack, "D4", use_gripper=True)
    protocol.move_labware(pcr1_dilution_plate, reagent_block, use_gripper=True)
    protocol.move_labware(pcr2_dilution_plate, "C2", use_gripper=True)
    heater_shaker.close_labware_latch()
    # Step 10: Transfer indices
    protocol.comment("Transferring indices")
    all()
    p96.pick_up_tip(tiprack_1["A1"])
    transfer(p96, 5, indices_plate["A1"], pcr2_plate["A1"])
    # p96.return_tip()

    # Steps 11-12: PCR1 dilution setup
    protocol.comment("Setting up PCR1 dilution")
    # p96.pick_up_tip()
    transfer(p96, 40, reservoir["A1"], pcr1_dilution_plate["A1"])
    transfer(p96, 5, pcr1_plate["A1"], pcr1_dilution_plate["A1"], mix_after=(10, 45))

    # Step 13: Transfer diluted PCR1 to PCR2
    protocol.comment("Transferring diluted PCR1 to PCR2")
    transfer(p96, 5, pcr1_dilution_plate["A1"], pcr2_plate["A1"], mix_after=(10, 45))
    p96.return_tip()

    # Step 14: PCR2 thermal cycling
    protocol.comment("Starting PCR2 thermal cycling")
    if disposable_lid:
        protocol.move_labware(lids[0], pcr2_plate, use_gripper=True)
    thermocycler.close_lid()
    thermocycler.set_lid_temperature(105)
    # Initial denaturation
    thermocycler.execute_profile(
        steps=[{"temperature": 95, "hold_time_seconds": 180}], repetitions=1
    )

    # 12 cycles
    thermocycler.execute_profile(
        steps=[
            {"temperature": 95, "hold_time_seconds": 20},
            {"temperature": 72, "hold_time_seconds": 15},
        ],
        repetitions=12,
    )

    # Final extension
    thermocycler.execute_profile(
        steps=[
            {"temperature": 72, "hold_time_seconds": 300},
            {"temperature": 20, "hold_time_seconds": 60},
        ],
        repetitions=1,
    )

    thermocycler.open_lid()
    if disposable_lid:
        protocol.move_labware(lids[0], waste_chute, use_gripper=True)

    # Step 15: Move PCR2 plate
    protocol.comment("Moving PCR2 plate")
    protocol.move_labware(pcr1_dilution_plate, "A2", use_gripper=True)
    protocol.move_labware(pcr2_plate, reagent_block, use_gripper=True)

    # Steps 16-17: PCR2 dilution
    protocol.comment("Setting up PCR2 dilution")
    p96.pick_up_tip(tiprack_1["A1"])
    transfer(p96, 25, reservoir["A1"], pcr2_dilution_plate["A1"])
    transfer(p96, 5, pcr2_plate["A1"], pcr2_dilution_plate["A1"], mix_after=(10, 45))
    p96.return_tip()
    protocol.move_labware(reservoir, "A4", use_gripper=True)
    protocol.move_labware(eppendorf_384, "D2", use_gripper=True)

    # Step 18: Optional transfer to 384-well plate
    protocol.comment("Optional: Transferring to 384-well plate")
    p96.pick_up_tip(tiprack_1["A1"])
    for well_name in ["A1", "A2", "B1", "B2"]:
        transfer(p96, 15, pcr2_dilution_plate["A1"], eppendorf_384[well_name])
    p96.return_tip()

    # Final steps
    protocol.comment("Protocol complete through PCR2 dilution")
    protocol.comment("Please remove plates for quantification")
    protocol.comment("Keep PCR2 dilution plate on deck if continuing with pooling")

    # Deactivate temperature modules
    if deactivate_modules_bool:
        temp_module.deactivate()
        thermocycler.deactivate_lid()
        thermocycler.deactivate_block()

    # Pause for plate removal
    protocol.pause(
        "Remove plates for quantification. Keep PCR2 dilution plate if continuing with pooling."
    )

    protocol.comment("Protocol complete!")
