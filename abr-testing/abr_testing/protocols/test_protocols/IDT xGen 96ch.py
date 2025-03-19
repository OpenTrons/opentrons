"""IDT xGEn 96x with Flex Stacker."""

from opentrons.protocol_api import ProtocolContext, ParameterContext
from abr_testing.protocols import helpers
from typing import List
from opentrons.protocol_api.module_contexts import (
    TemperatureModuleContext,
    MagneticBlockContext,
    ThermocyclerContext,
    FlexStackerContext,
)
from opentrons.hardware_control.modules.types import ThermocyclerStep

metadata = {
    "protocolName": "IDT xGen 96x 1000ul v9 ",
    "author": "Opentrons <protocols@opentrons.com>",
    "source": "Protocol Library",
}
requirements = {
    "robotType": "Flex",
    "apiLevel": "2.23",
}


def add_parameters(parameters: ParameterContext) -> None:
    """Runtime parameters."""
    helpers.create_deactivate_modules_parameter(parameters)
    helpers.create_dry_run_parameter(parameters)
    helpers.create_dot_bottom_parameter(parameters)
    parameters.add_str(
        display_name="Frag Mode",
        variable_name="FRAG_MODE",
        default="MC",
        description="Frag Mode",
        choices=[
            {"display_name": "MC", "value": "MC"},
            {"display_name": "EZ", "value": "EZ"},
        ],
    )
    parameters.add_int(
        display_name="Enz Frag Time (Min)",
        variable_name="FRAGTIME",
        default=20,
        minimum=10,
        maximum=60,
        description="Length of Enz Frag Incubation. EZ only",
    )
    parameters.add_int(
        display_name="PCR Cycles",
        variable_name="PCRCYCLES",
        default=4,
        minimum=1,
        maximum=20,
        description="How many PCR Cycles to for amplification.",
    )


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    # ======================== DOWNLOADED PARAMETERS ========================
    global COLUMNS  # Number of Columns of Samples
    # =================== LOADING THE RUNTIME PARAMETERS ====================

    DRYRUN = protocol.params.dry_run  # type: ignore[attr-defined]
    FRAG_MODE = protocol.params.FRAG_MODE  # type: ignore[attr-defined]
    FRAGTIME = protocol.params.FRAGTIME  # type: ignore[attr-defined]
    PCRCYCLES = protocol.params.PCRCYCLES  # type: ignore[attr-defined]
    DEACTIVATE_TEMP = protocol.params.deactivate_modules  # type: ignore[attr-defined]
    dot_bottom = protocol.params.dot_bottom  # type: ignore[attr-defined]

    #  ADVANCED PARAMETERS ======================================
    # -------PROTOCOL STEP-------
    if FRAG_MODE == "EZ":
        STEP_EZ_FRERAT = True  # Set to 0 to skip block of commands
        STEP_MC_ERAT = False  # Set to 0 to skip block of commands
    if FRAG_MODE == "MC":
        STEP_EZ_FRERAT = False  # Set to 0 to skip block of commands
        STEP_MC_ERAT = True  # Set to 0 to skip block of commands
    STEP_LIG = True  # Set to 0 to skip block of commands
    STEP_CLEANUP_1 = True  # Set to 0 to skip block of commands
    STEP_PCR = True  # Set to 0 to skip block of commands
    STEP_CLEANUP_2 = True  # Set to 0 to skip block of commands
    # ---------------------------
    # This notifies user that for 5-6 columns(from more than 32 samples up to 48 samples)
    # it requires Tip reusing in order to remain walkaway.
    # This setting will override any Runtime parameter, and also pauses to notify the user.
    # So if the user enters 6 columns with Single Tip Use, it will pause and warn that
    # it has to change to Reusing tips in order to remain walkaway.
    # Note that if omitting steps (i.e. skipping the last cleanup step) it is possible
    # to do single use tips, but may vary on case by case basis.
    TIP_MIX = True  # Default False   | Use Tip Mixing instead of Heatershaker
    ONDECK_THERMO = True  # Default True    | On Deck Thermocycler
    ONDECK_TEMP = True
    NOLABEL = False  # Default False   | True = Do not include Liquid Labeling,

    # =============================== PIPETTE ===============================
    p1000 = protocol.load_instrument("flex_96channel_1000", "left")
    p96x_200_flow_rate_aspirate_default = 716
    p96x_200_flow_rate_dispense_default = 716
    p96x_200_flow_rate_blow_out_default = 716
    p96x_50_flow_rate_aspirate_default = 478
    p96x_50_flow_rate_dispense_default = 478
    p96x_50_flow_rate_blow_out_default = 478

    # ======================= SIMPLE SETUP ARRANGEMENT ======================
    # STACKERS
    stacker_200_ul_tips: FlexStackerContext = protocol.load_module(
        "flexStackerModuleV1", "B4"
    )  # type: ignore[assignment]
    stacker_200_ul_tips.set_stored_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        lid="opentrons_flex_tiprack_lid",
        count=6,
    )
    stacker_50_ul_tips: FlexStackerContext = protocol.load_module(
        "flexStackerModuleV1", "C4"
    )  # type: ignore[assignment]
    stacker_50_ul_tips.set_stored_labware(
        load_name="opentrons_flex_96_tiprack_50ul",
        lid="opentrons_flex_tiprack_lid",
        count=6,
    )

    # ========== FIRST ROW ===========
    thermocycler: ThermocyclerContext = protocol.load_module(
        helpers.tc_str
    )  # type: ignore[assignment]
    sample_plate_1 = thermocycler.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "Sample Plate 1"
    )

    tiprack_A2_adapter = protocol.load_adapter(
        "opentrons_flex_96_tiprack_adapter", "A2"
    )
    tiprack_50_1 = tiprack_A2_adapter.load_labware("opentrons_flex_96_tiprack_50ul")
    tiprack_A3_adapter = protocol.load_adapter(
        "opentrons_flex_96_tiprack_adapter", "A3"
    )
    tiprack_50_2 = tiprack_A3_adapter.load_labware("opentrons_flex_96_tiprack_50ul")
    sample_plate_2 = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "A4", "Sample Plate 2"
    )
    # ========== SECOND ROW ==========
    Liquid_trash = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "B2", "Liquid Waste Reservoir"
    )

    reagent_plate_2 = protocol.load_labware(
        "greiner_384_wellplate_240ul", "B3", "Reagent Plate 2"
    )
    # ========== THIRD ROW ===========
    temp_block: TemperatureModuleContext = protocol.load_module(
        helpers.temp_str, "C1"
    )  # type: ignore[assignment]
    reagent_plate_1 = temp_block.load_labware(
        "greiner_384_wellplate_240ul", "Reagent Plate 1"
    )
    ETOH_Reservoir = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "C2", "EtOH Reservoir"
    )
    lids = protocol.load_lid_stack("opentrons_tough_pcr_auto_sealing_lid", "C3", 4)
    # lids: List[Labware] = [
    #     protocol.load_labware("opentrons_tough_pcr_auto_sealing_lid", "C3")
    # ]
    # # Add the stacked identical labware (referred to now by list name i.e. lids[1])
    # for i in range(2):
    #     lids.append(lids[-1].load_labware("opentrons_tough_pcr_auto_sealing_lid"))
    # lids.reverse()

    # ========== FOURTH ROW ==========
    # sample_plate_3 = protocol.load_labware(
    #     "opentrons_96_wellplate_200ul_pcr_full_skirt", "D1", "Sample Plate 3"
    # )
    mag_block: MagneticBlockContext = protocol.load_module(
        helpers.mag_str, "D2"
    )  # type: ignore[assignment]
    CleanupPlate_1 = mag_block.load_labware(
        "nest_96_wellplate_2ml_deep", "Cleanup Plate 1"
    )
    # ============ TRASH =============
    TRASH = protocol.load_waste_chute()
    CleanupPlate_2 = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "D4", "Cleanup Plate 2"
    )
    # ========================== REAGENT PLATE_1 ============================
    if FRAG_MODE == "EZ":
        FRERAT = reagent_plate_1["A1"]
    if FRAG_MODE == "MC":
        ERAT = reagent_plate_1["A1"]
    LIG = reagent_plate_1["A2"]
    PCR = reagent_plate_1["B1"]
    RSB = reagent_plate_1["B2"]

    # ========================== REAGENT PLATE_2 ============================
    CleanupBead = reagent_plate_2["A1"]
    Adapter = reagent_plate_2["A2"]
    Barcodes = reagent_plate_2["B1"]

    # ========================================= PROTOCOL START

    thermocycler.open_lid()
    if DRYRUN is False:
        protocol.comment("SETTING THERMO and TEMP BLOCK Temperature")
        thermocycler.set_block_temperature(4)
        thermocycler.set_lid_temperature(100)
        temp_block.set_temperature(4)
    if STEP_EZ_FRERAT:
        protocol.comment("==============================================")
        protocol.comment("--> Enzymatic Prep")
        protocol.comment("==============================================")

        protocol.comment("--> Adding Enzymatic Prep")
        FRERATVol = 10.5
        FRERATMixRep = 25 if DRYRUN is False else 1
        FRERATMixVol = 25
        FRERATBuffPremix = 2 if DRYRUN is False else 1
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.25
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default
        # ===============================================
        p1000.pick_up_tip(tiprack_50_1["A1"])
        p1000.mix(
            FRERATBuffPremix,
            FRERATMixVol + 1,
            FRERAT.bottom(z=dot_bottom),
        )
        p1000.aspirate(FRERATVol + 1, FRERAT.bottom(z=dot_bottom))
        p1000.dispense(1, FRERAT.bottom(z=dot_bottom))
        p1000.dispense(
            FRERATVol,
            sample_plate_1.wells_by_name()["A1"].bottom(z=dot_bottom),
        )
        p1000.mix(FRERATMixRep, FRERATMixVol)
        p1000.move_to(sample_plate_1["A1"].top(z=-3))
        protocol.delay(seconds=3)
        p1000.blow_out(sample_plate_1["A1"].top(z=-3))
        p1000.return_tip()
        # ===============================================

        #####################################################################
        protocol.comment("MOVING: Plate Lid #1 = lids[1] --> sample_plate_1")
        protocol.move_lid(
            source_location=lids, new_location=sample_plate_1, use_gripper=True
        )
        if ONDECK_THERMO:
            thermocycler.close_lid()
            if DRYRUN is False:
                profile_FRERAT: List[ThermocyclerStep] = [
                    {"temperature": 32, "hold_time_minutes": FRAGTIME},
                    {"temperature": 65, "hold_time_minutes": 30},
                ]
                thermocycler.execute_profile(
                    steps=profile_FRERAT, repetitions=1, block_max_volume=50
                )
                thermocycler.set_block_temperature(4)
            thermocycler.open_lid()
        else:
            if DRYRUN is False:
                protocol.pause(
                    "Pausing to run Fragmentation and End Repair on an off deck Thermocycler ~45min"
                )
            else:
                protocol.comment(
                    "Pausing to run Fragmentation and End Repair on an off deck Thermocycler ~45min"
                )
        protocol.comment("MOVING: Plate Lid #1 = sample_plate_1 --> lids[1]")
        protocol.move_lid(
            source_location=sample_plate_1, new_location=lids, use_gripper=True
        )

        # protocol.move_labware(labware=lids[0], new_location=lids[1], use_gripper=True)
        ###############################################################################
    if STEP_MC_ERAT:
        protocol.comment("==============================================")
        protocol.comment("--> End Prep")
        protocol.comment("==============================================")

        protocol.comment("--> Adding End Prep")
        ERATVol = 10
        ERATMixRep = 10 if DRYRUN is False else 1
        ERATMixVol = 40
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.25
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.pick_up_tip(tiprack_50_1["A1"])
        p1000.aspirate(ERATVol, ERAT.bottom(z=0.5))
        p1000.dispense(
            ERATVol,
            sample_plate_1.wells_by_name()["A1"].bottom(z=dot_bottom),
        )
        p1000.mix(ERATMixRep, ERATMixVol, rate=0.5)
        p1000.move_to(sample_plate_1["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(sample_plate_1["A1"].top(z=-3))
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # ===============================================

        protocol.comment("MOVING: Plate Lid #1 = lids[1] --> sample_plate_1")
        protocol.move_lid(
            source_location=lids, new_location=sample_plate_1, use_gripper=True
        )

        # protocol.move_labware(
        #     labware=lids[-1],
        #     new_location=sample_plate_1,
        #     use_gripper=True,
        # )
        if ONDECK_THERMO:
            thermocycler.close_lid()
            if DRYRUN is False:
                profile_ERAT: List[ThermocyclerStep] = [
                    {"temperature": 20, "hold_time_minutes": 30},
                    {"temperature": 65, "hold_time_minutes": 30},
                ]
                thermocycler.execute_profile(
                    steps=profile_ERAT, repetitions=1, block_max_volume=50
                )
                thermocycler.set_block_temperature(4)
            thermocycler.open_lid()
        else:
            if DRYRUN is False:
                protocol.pause(
                    "Pausing to run End Repair on an off deck Thermocycler ~60min"
                )
            else:
                protocol.comment(
                    "Pausing to run End Repair on an off deck Thermocycler ~60min"
                )
        protocol.comment("MOVING: Plate Lid #1 = sample_plate_1 --> TRASH")
        protocol.move_lid(
            source_location=sample_plate_1, new_location=TRASH, use_gripper=True
        )

        # # protocol.move_labware(
        # #     labware=lids[0],
        #     new_location=TRASH,
        #     use_gripper=True,
        # )
        ##################################################################
    if STEP_LIG:
        protocol.comment("==============================================")
        protocol.comment("--> Adapter Ligation")
        protocol.comment("==============================================")

        protocol.comment("--> Adding Stubby Adapter")
        AdapterVol = 5
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.25
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.pick_up_tip(tiprack_50_2["A1"])
        p1000.aspirate(AdapterVol + 1, Adapter.bottom(z=0.5))
        p1000.dispense(
            AdapterVol,
            sample_plate_1.wells_by_name()["A1"].bottom(z=1),
        )
        p1000.move_to(sample_plate_1["A1"].bottom(z=dot_bottom))
        p1000.move_to(sample_plate_1["A1"].top(z=-3))
        protocol.delay(seconds=1)
        protocol.comment("--> Adding Lig")
        LIGVol = 25
        LIGMixRep = 20 if DRYRUN is False else 1
        LIGMixVol = 40
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.25
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.aspirate(LIGVol, LIG.bottom(z=dot_bottom))
        p1000.default_speed = 100
        p1000.move_to(LIG.top(z=3))
        protocol.delay(seconds=1)
        p1000.default_speed = 400
        p1000.dispense(LIGVol, sample_plate_1["A1"].bottom(z=1))
        p1000.move_to(sample_plate_1["A1"].bottom(z=dot_bottom))
        p1000.mix(LIGMixRep, LIGMixVol, rate=0.5)
        p1000.default_speed = 100
        p1000.move_to(sample_plate_1["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(sample_plate_1["A1"].top(z=-3))
        p1000.default_speed = 400
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # ===============================================

        #####################################################################
        protocol.comment("MOVING: Plate Lid #2 = lids[1] --> sample_plate_1")
        protocol.move_lid(
            source_location=lids, new_location=sample_plate_1, use_gripper=True
        )

        # protocol.move_labware(
        #     labware=lids[1],
        #     new_location=sample_plate_1,
        #     use_gripper=True,
        # )
        if ONDECK_THERMO:
            thermocycler.close_lid()
            if DRYRUN is False:
                profile_LIG: List[ThermocyclerStep] = [
                    {"temperature": 20, "hold_time_minutes": 20}
                ]
                thermocycler.execute_profile(
                    steps=profile_LIG, repetitions=1, block_max_volume=50
                )
                thermocycler.set_block_temperature(4)
            thermocycler.open_lid()
        else:
            if DRYRUN is False:
                protocol.pause(
                    "Pausing to run Ligation on an off deck Thermocycler ~20min"
                )
            else:
                protocol.comment(
                    "Pausing to run Ligation on an off deck Thermocycler ~20min"
                )
        protocol.comment("MOVING: Plate Lid #2 = sample_plate_1 --> TRASH")
        protocol.move_lid(
            source_location=sample_plate_1, new_location=TRASH, use_gripper=True
        )

        # protocol.move_labware(
        #     labware=lids[1],
        #     new_location=TRASH,
        #     use_gripper=True,
        # )
        ########################################################################
    if STEP_CLEANUP_1:

        # ============================================================
        # GRIPPER MOVE tiprack_50_1 FROM: tiprack_A2_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_50_1,
            new_location=TRASH,
            use_gripper=True,
        )
        # GRIPPER MOVE tiprack_50_2 FROM: tiprack_A3_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_50_2,
            new_location=TRASH,
            use_gripper=True,
        )
        # GRIPPER MOVE tiprack_200_1 FROM: D1 --> tiprack_A3_adapter
        tiprack_200_1 = stacker_200_ul_tips.retrieve()
        protocol.move_lid(tiprack_200_1, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_200_1, tiprack_A3_adapter, use_gripper=True)
        # GRIPPER MOVE CleanupPlate_1 FROM: MAG PLATE --> D1
        # protocol.move_labware(labware=sample_plate_3, new_location = "", use_gripper = True)
        protocol.move_labware(
            labware=CleanupPlate_1,
            new_location="D1",
            use_gripper=True,
        )
        # ================================================================

        protocol.comment("==============================================")
        protocol.comment("--> Cleanup 1")
        protocol.comment("==============================================")

        protocol.comment("--> ADDING CleanupBead (0.8x)")
        CleanupBeadVol = 72.0
        CleanupBeadPremix = 5 if DRYRUN is False else 1
        CleanupBeadMix = 10 if TIP_MIX else 1

        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.1
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.pick_up_tip(tiprack_200_1["A1"])
        p1000.move_to(CleanupBead.bottom(z=7))
        p1000.mix(CleanupBeadPremix, 40, rate=0.5)
        p1000.aspirate(CleanupBeadVol, CleanupBead.bottom(z=7))
        p1000.default_speed = 100
        p1000.move_to(CleanupBead.bottom(z=7))
        p1000.default_speed = 400
        p1000.dispense(CleanupBeadVol, CleanupPlate_1["A1"].bottom(z=7))
        protocol.delay(seconds=1)
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=1))

        TransferSup = 80.0
        p1000.move_to(sample_plate_1["A1"].bottom(z=0.5))
        p1000.aspirate(TransferSup / 2)
        protocol.delay(seconds=1)
        p1000.aspirate(TransferSup / 2)
        p1000.dispense(TransferSup, CleanupPlate_1["A1"].bottom(z=+1), rate=0.5)

        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.75
        p1000.mix(CleanupBeadMix, 150, rate=0.5)
        p1000.move_to(CleanupPlate_1["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(CleanupPlate_1["A1"].top(z=-3))
        p1000.move_to(CleanupPlate_1["A1"].top(z=5))
        p1000.move_to(CleanupPlate_1["A1"].top(z=0))
        p1000.move_to(CleanupPlate_1["A1"].top(z=5))
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # ===============================================

        # ==============================================================
        # GRIPPER MOVE CleanupPlate_1 FROM: HEATER SHAKER --> MAG BLOCK
        protocol.move_labware(
            labware=CleanupPlate_1,
            new_location=mag_block,
            use_gripper=True,
        )
        # GRIPPER MOVE tiprack_200_1 FROM: tiprack_A3_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_200_1,
            new_location=TRASH,
            use_gripper=True,
        )
        # GRIPPER MOVE tiprack_200_X FROM: A4 --> tiprack_A3_adapter
        tiprack_200_X = stacker_200_ul_tips.retrieve()
        protocol.move_lid(tiprack_200_X, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_200_X, tiprack_A3_adapter, use_gripper=True)

        # TOWER DISPENSES NEW PLATE
        tiprack_200_2 = stacker_200_ul_tips.retrieve()
        protocol.move_lid(tiprack_200_2, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_200_2, tiprack_A2_adapter, use_gripper=True)
        protocol.comment("Unloading tiprack 200 ul")
        # ==============================================================

        if DRYRUN is False:
            protocol.delay(minutes=2)

        protocol.comment("--> Removing Supernatant")
        RemoveSup = 200
        CleanupBeadMix = 10 if TIP_MIX else 1
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # =============================
        p1000.pick_up_tip(tiprack_200_2["A1"])
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=1))
        p1000.mix(CleanupBeadMix, 100, rate=0.5)
        p1000.move_to(CleanupPlate_1["A1"].top(z=-3))
        if DRYRUN is False:
            protocol.delay(minutes=3)
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=1))
        p1000.aspirate(RemoveSup - 100, rate=1)
        protocol.delay(seconds=5)
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=dot_bottom))
        p1000.aspirate(100, rate=0.5)
        p1000.default_speed = 200
        p1000.move_to(CleanupPlate_1["A1"].top(z=2))
        p1000.dispense(200, Liquid_trash["A1"].top(z=0), rate=0.5)
        protocol.delay(seconds=5)
        p1000.blow_out()
        p1000.default_speed = 400
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # =============================

        protocol.comment("--> ETOH Wash 1")
        ETOHMaxVol = 150
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # ===============================================
        p1000.pick_up_tip(tiprack_200_X["A1"])
        p1000.aspirate(ETOHMaxVol + 10, ETOH_Reservoir["A1"].bottom(z=dot_bottom))
        p1000.move_to(ETOH_Reservoir["A1"].top(z=0))
        p1000.move_to(ETOH_Reservoir["A1"].top(z=-5))
        p1000.move_to(CleanupPlate_1["A1"].top(z=2))
        p1000.dispense(ETOHMaxVol)
        protocol.delay(seconds=2)
        p1000.aspirate(10, CleanupPlate_1["A1"].top(z=2))
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        p1000.move_to(Liquid_trash["A1"].top(z=0))
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        p1000.return_tip()
        # ===============================================

        if DRYRUN is False:
            protocol.delay(minutes=0.5)

        # ==============================================================
        # GRIPPER MOVE tiprack_200_2 FROM: tiprack_A2_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_200_2,
            new_location=TRASH,
            use_gripper=True,
        )
        # TOWER DISPENSES NEW PLATE
        protocol.comment("MOVING: tiprack_200_3 = A4 --> tiprack_A2_adapter")
        tiprack_200_3 = stacker_200_ul_tips.retrieve()
        protocol.move_lid(tiprack_200_3, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_200_3, tiprack_A2_adapter, use_gripper=True)
        # ================================================================
        protocol.comment("--> Remove ETOH Wash")
        RemoveSup = 200
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # =============================
        p1000.pick_up_tip(tiprack_200_3["A1"])
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=1))
        p1000.aspirate(RemoveSup - 100, rate=1)
        protocol.delay(minutes=0.1)
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=dot_bottom))
        p1000.aspirate(100, rate=0.5)
        p1000.default_speed = 200
        p1000.move_to(CleanupPlate_1["A1"].top(z=2))
        p1000.dispense(200, Liquid_trash["A1"].top(z=0))
        protocol.delay(minutes=0.1)
        p1000.blow_out()
        p1000.default_speed = 400
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # =============================

        protocol.comment("--> ETOH Wash 2")
        ETOHMaxVol = 150
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # ===============================================
        p1000.pick_up_tip(tiprack_200_X["A1"])
        p1000.aspirate(ETOHMaxVol + 10, ETOH_Reservoir["A1"].bottom(z=dot_bottom))
        p1000.move_to(ETOH_Reservoir["A1"].top(z=0))
        p1000.move_to(ETOH_Reservoir["A1"].top(z=-5))
        p1000.move_to(CleanupPlate_1["A1"].top(z=2))
        p1000.dispense(ETOHMaxVol)
        protocol.delay(seconds=2)
        p1000.aspirate(10, CleanupPlate_1["A1"].top(z=2))
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        p1000.move_to(Liquid_trash["A1"].top(z=0))
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        p1000.return_tip()
        # ===============================================

        if DRYRUN is False:
            protocol.delay(minutes=0.5)

        # =================================================================
        # GRIPPER MOVE tiprack_200_3 FROM: tiprack_A2_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_200_3,
            new_location=TRASH,
            use_gripper=True,
        )
        # TOWER DISPENSES NEW PLATE
        tiprack_200_4 = stacker_200_ul_tips.retrieve()
        protocol.move_lid(tiprack_200_4, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_200_4, tiprack_A2_adapter, use_gripper=True)
        protocol.comment("MOVING: tiprack_200_4 = A4 --> tiprack_A2_adapter")
        # =======================================================================
        protocol.comment("--> Remove ETOH Wash")
        RemoveSup = 200
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # =============================
        p1000.pick_up_tip(tiprack_200_4["A1"])
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=1))
        p1000.aspirate(RemoveSup - 100, rate=1)
        protocol.delay(minutes=0.1)
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=dot_bottom))
        p1000.aspirate(100, rate=0.5)
        p1000.default_speed = 200
        p1000.move_to(CleanupPlate_1["A1"].top(z=2))
        p1000.dispense(200, Liquid_trash["A1"].top(z=0))
        protocol.delay(minutes=0.1)
        p1000.blow_out()
        p1000.default_speed = 400
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.touch_tip(speed=100)

        if DRYRUN is False:
            protocol.delay(minutes=1)

        protocol.comment("--> Removing Residual Wash")
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=dot_bottom))
        p1000.aspirate(100)
        p1000.dispense(100, Liquid_trash["A1"])
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        protocol.delay(minutes=0.1)
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # ===============================================

        if DRYRUN is False:
            protocol.delay(minutes=0.5)

        # =====================================================================
        # GRIPPER MOVE CleanupPlate_1 FROM: MAG BLOCK --> D1
        protocol.move_labware(
            labware=CleanupPlate_1,
            new_location="D1",
            use_gripper=True,
        )
        # GRIPPER MOVE tiprack_200_4 FROM: tiprack_A2_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_200_4,
            new_location=TRASH,
            use_gripper=True,
        )
        # GRIPPER MOVE sample_plate_2 FROM: B4 --> A4
        # protocol.move_labware(
        #     labware=sample_plate_2,
        #     new_location="A4",
        #     use_gripper=True,
        # )
        # TOWER DISPENSES NEW PLATE
        tiprack_50_3 = stacker_50_ul_tips.retrieve()
        protocol.move_lid(tiprack_50_3, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_50_3, tiprack_A2_adapter, use_gripper=True)
        protocol.comment("MOVING: tiprack_50_3 = B4 --> tiprack_A2_adapter")
        # GRIPPER MOVE CleanupPlate_1 FROM: MAG BLOCK --> D1
        protocol.move_labware(
            labware=CleanupPlate_1,
            new_location=mag_block,
            use_gripper=True,
        )
        # GRIPPER MOVE CleanupPlate_1 FROM: MAG BLOCK --> D1
        protocol.move_labware(
            labware=CleanupPlate_1,
            new_location="D1",
            use_gripper=True,
        )
        # =====================================================================

        protocol.comment("--> Adding RSB")
        RSBVol = 22
        RSBMix = 10 if TIP_MIX else 1
        RSBMixVol = 17.5
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.pick_up_tip(tiprack_50_3["A1"])
        p1000.aspirate(RSBVol, RSB.bottom(z=dot_bottom))
        p1000.move_to(CleanupPlate_1.wells_by_name()["A1"].bottom(z=dot_bottom))
        p1000.dispense(
            RSBVol, CleanupPlate_1.wells_by_name()["A1"].bottom(z=dot_bottom)
        )
        p1000.mix(RSBMix, RSBMixVol, rate=0.5)
        p1000.blow_out(CleanupPlate_1.wells_by_name()["A1"].top(z=-3))
        p1000.return_tip()
        # ===============================================

        # ======================================================================
        # GRIPPER MOVE CleanupPlate_1 FROM: D1 --> MAG BLOCK
        protocol.move_labware(
            labware=CleanupPlate_1,
            new_location=mag_block,
            use_gripper=True,
        )
        # GRIPPER MOVE sample_plate_1 FROM: THERMOCYCLER --> TRASH
        protocol.move_labware(
            labware=sample_plate_1,
            new_location=TRASH,
            use_gripper=True,
        )
        # GRIPPER MOVE sample_plate_2 FROM: C3 --> THERMOCYCLER
        protocol.move_labware(
            labware=sample_plate_2,
            new_location=thermocycler,
            use_gripper=True,
        )

        # GRIPPER MOVE tiprack_50_3 FROM: tiprack_A2_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_50_3,
            new_location=TRASH,
            use_gripper=True,
        )
        # TOWER DISPENSES NEW PLATE
        protocol.comment("MOVING: tiprack_50_4 = B4 --> tiprack_A2_adapter")

        tiprack_50_4 = stacker_50_ul_tips.retrieve()
        protocol.move_lid(tiprack_50_4, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_50_4, tiprack_A2_adapter, use_gripper=True)
        # ========================================================================

        if DRYRUN is False:
            protocol.delay(minutes=3)

    if STEP_PCR:
        protocol.comment("==============================================")
        protocol.comment("--> Amplification")
        protocol.comment("==============================================")

        protocol.comment("--> Transferring Supernatant")
        TransferSup = 20
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.2
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.2
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.pick_up_tip(tiprack_50_4["A1"])
        p1000.move_to(CleanupPlate_1["A1"].bottom(z=dot_bottom))
        p1000.aspirate(TransferSup / 2)
        protocol.delay(seconds=1)
        p1000.aspirate(TransferSup / 2)
        p1000.dispense(TransferSup, sample_plate_2["A1"].bottom(z=1))
        protocol.comment("--> Adding PCR")
        PCRVol = 25
        PCRMixRep = 2
        PCRMixVol = 40
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.2
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.2
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.aspirate(PCRVol, PCR.bottom(z=dot_bottom))
        p1000.dispense(PCRVol, sample_plate_2["A1"].bottom(z=dot_bottom))
        p1000.mix(PCRMixRep, PCRMixVol)
        p1000.move_to(sample_plate_2["A1"].top(z=-3))
        protocol.delay(seconds=3)
        protocol.comment("--> Adding Barcodes")
        BarcodeVol = 5
        BarcodeMixRep = 10 if DRYRUN is False else 1
        BarcodeMixVol = 40
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.aspirate(BarcodeVol, Barcodes.bottom(z=dot_bottom))
        p1000.dispense(BarcodeVol, sample_plate_2["A1"].bottom(z=dot_bottom))
        p1000.mix(BarcodeMixRep, BarcodeMixVol)
        p1000.move_to(sample_plate_2["A1"].top(z=-3))
        protocol.delay(seconds=3)
        p1000.blow_out(sample_plate_2["A1"].top(z=-3))
        p1000.return_tip()
        # ===============================================

        #####################################################################
        protocol.comment("MOVING: Plate Lid #3= lids[2] --> sample_plate_1")
        protocol.move_lid(
            source_location=lids, new_location=sample_plate_2, use_gripper=True
        )

        if ONDECK_THERMO:
            thermocycler.close_lid()
            if DRYRUN is False:
                profile_PCR_1: List[ThermocyclerStep] = [
                    {"temperature": 98, "hold_time_seconds": 45}
                ]
                thermocycler.execute_profile(
                    steps=profile_PCR_1, repetitions=1, block_max_volume=50
                )
                profile_PCR_2: List[ThermocyclerStep] = [
                    {"temperature": 98, "hold_time_seconds": 15},
                    {"temperature": 60, "hold_time_seconds": 30},
                    {"temperature": 72, "hold_time_seconds": 30},
                ]
                thermocycler.execute_profile(
                    steps=profile_PCR_2, repetitions=PCRCYCLES, block_max_volume=50
                )
                profile_PCR_3: List[ThermocyclerStep] = [
                    {"temperature": 72, "hold_time_minutes": 1}
                ]
                thermocycler.execute_profile(
                    steps=profile_PCR_3, repetitions=1, block_max_volume=50
                )
                thermocycler.set_block_temperature(4)
            thermocycler.open_lid()
        else:
            if DRYRUN is False:
                protocol.pause("Pausing to run PCR on an off deck Thermocycler ~20min")
            else:
                protocol.comment(
                    "Pausing to run PCR on an off deck Thermocycler ~20min"
                )
        protocol.comment("MOVING: Plate Lid #3 = sample_plate_1 --> TRASH")
        protocol.move_lid(
            source_location=sample_plate_2, new_location=TRASH, use_gripper=True
        )

    if STEP_CLEANUP_2:
        protocol.comment("==============================================")
        protocol.comment("--> Cleanup 2")
        protocol.comment("==============================================")

        # ===================================================================
        # GRIPPER MOVE CleanupPlate_1 FROM: HEATER SHAKER --> TRASH
        protocol.move_labware(
            labware=CleanupPlate_1,
            new_location=TRASH,
            use_gripper=True,
        )
        # GRIPPER MOVE tiprack_50_4 FROM: tiprack_A2_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_50_4,
            new_location=TRASH,
            use_gripper=True,
        )
        # GRIPPER MOVE CleanupPlate_2 FROM: D4 --> D1
        protocol.move_labware(
            labware=CleanupPlate_2,
            new_location="D1",
            use_gripper=True,
        )
        # TOWER DISPENSES NEW PLATE
        tiprack_50_5 = stacker_50_ul_tips.retrieve()
        protocol.move_lid(tiprack_50_5, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_50_5, tiprack_A2_adapter, use_gripper=True)
        protocol.comment("MOVING: tiprack_50_5 = B4 --> tiprack_A2_adapter")
        # ======================================================================

        protocol.comment("--> Transferring Samples")
        CleanupBeadVol = 32.5
        TransferSup = 50.0
        CleanupBeadPremix = 3 if DRYRUN is False else 1
        CleanupBeadMix = 10 if TIP_MIX else 1
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.1
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.1
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.pick_up_tip(tiprack_50_5["A1"])
        p1000.move_to(sample_plate_2["A1"].bottom(z=dot_bottom))
        p1000.aspirate(TransferSup / 2)
        protocol.delay(seconds=0.2)
        p1000.aspirate(TransferSup / 2)
        p1000.dispense(TransferSup, CleanupPlate_2["A1"].bottom(z=0.5))
        protocol.comment("--> ADDING CleanupBead (0.8x)")
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.1
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.1
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        p1000.move_to(CleanupBead.bottom(z=1))
        p1000.mix(CleanupBeadPremix, 30, rate=0.5)
        p1000.aspirate(CleanupBeadVol, CleanupBead.bottom(z=1))
        p1000.move_to(CleanupBead.top(z=-3))
        p1000.dispense(CleanupBeadVol, CleanupPlate_2["A1"].bottom(z=0.5))
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=2.5))
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.75
        p1000.mix(CleanupBeadMix, 40, rate=0.5)
        p1000.move_to(CleanupPlate_2["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(CleanupPlate_2["A1"].top(z=-3))
        p1000.move_to(CleanupPlate_2["A1"].top(z=5))
        p1000.move_to(CleanupPlate_2["A1"].top(z=0))
        p1000.move_to(CleanupPlate_2["A1"].top(z=5))
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # ===============================================

        # ==================================================================
        # GRIPPER MOVE CleanupPlate_2 FROM: D1 --> MAG BLOCK
        protocol.move_labware(
            labware=CleanupPlate_2,
            new_location=mag_block,
            use_gripper=True,
        )
        # GRIPPER MOVE tiprack_50_5 FROM: tiprack_A2_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_50_5,
            new_location=TRASH,
            use_gripper=True,
        )
        # TOWER DISPENSES NEW PLATE
        tiprack_200_5 = stacker_200_ul_tips.retrieve()
        protocol.move_lid(tiprack_200_5, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_200_5, tiprack_A2_adapter, use_gripper=True)
        protocol.comment("MOVING: tiprack_200_5 = A4 --> tiprack_A2_adapter")
        # ====================================================================

        if DRYRUN is False:
            protocol.delay(minutes=4)

        protocol.comment("--> Removing Supernatant")
        RemoveSup = 200
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # =============================
        p1000.pick_up_tip(tiprack_200_5["A1"])
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=2))
        p1000.aspirate(RemoveSup - 100)
        protocol.delay(seconds=5)
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=dot_bottom))
        p1000.aspirate(100, rate=0.5)
        p1000.default_speed = 200
        p1000.move_to(CleanupPlate_2["A1"].top(z=2))
        p1000.dispense(200, Liquid_trash["A1"].top(z=0), rate=0.5)
        protocol.delay(seconds=5)
        p1000.blow_out()
        p1000.default_speed = 400
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # =============================

        protocol.comment("--> ETOH Wash 1")
        ETOHMaxVol = 150
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # ===============================================
        p1000.pick_up_tip(tiprack_200_X["A1"])
        p1000.aspirate(ETOHMaxVol + 10, ETOH_Reservoir["A1"].bottom(z=dot_bottom))
        p1000.move_to(ETOH_Reservoir["A1"].top(z=0))
        p1000.move_to(ETOH_Reservoir["A1"].top(z=-5))
        p1000.move_to(CleanupPlate_2["A1"].top(z=2))
        p1000.dispense(ETOHMaxVol)
        protocol.delay(seconds=2)
        p1000.aspirate(10, CleanupPlate_2["A1"].top(z=2))
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        p1000.move_to(Liquid_trash["A1"].top(z=0))
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        p1000.return_tip()
        # ===============================================

        if DRYRUN is False:
            protocol.delay(minutes=0.5)

        # ================================================================
        # GRIPPER MOVE tiprack_200_5 FROM: tiprack_A2_adapter --> TRASH
        # protocol.move_labware(
        #     labware=tiprack_200_5,
        #     new_location=TRASH,
        #     use_gripper=True,
        # )
        # # TOWER DISPENSES NEW PLATE
        # tiprack_200_6 = stacker_200_ul_tips.retrieve()
        # protocol.move_labware(tiprack_200_6, tiprack_A2_adapter, use_gripper=True)
        # protocol.comment("MOVING: tiprack_200_6 = A4 --> tiprack_A2_adapter")
        # ===================================================================

        protocol.comment("--> Remove ETOH Wash")
        RemoveSup = 200
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # =============================
        p1000.pick_up_tip(tiprack_200_5["A1"])
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=1))
        p1000.aspirate(RemoveSup - 100, rate=1)
        protocol.delay(minutes=0.1)
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=dot_bottom))
        p1000.aspirate(100, rate=0.5)
        p1000.default_speed = 200
        p1000.move_to(CleanupPlate_2["A1"].top(z=2))
        p1000.dispense(200, Liquid_trash["A1"].top(z=0))
        protocol.delay(minutes=0.1)
        p1000.blow_out()
        p1000.default_speed = 400
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # ===============================================

        protocol.comment("--> ETOH Wash 2")
        ETOHMaxVol = 150
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # ===============================================
        p1000.pick_up_tip(tiprack_200_X["A1"])
        p1000.aspirate(ETOHMaxVol + 10, ETOH_Reservoir["A1"].bottom(z=dot_bottom))
        p1000.move_to(ETOH_Reservoir["A1"].top(z=0))
        p1000.move_to(ETOH_Reservoir["A1"].top(z=-5))
        p1000.move_to(CleanupPlate_2["A1"].top(z=2))
        p1000.dispense(ETOHMaxVol)
        protocol.delay(seconds=2)
        p1000.aspirate(10, CleanupPlate_2["A1"].top(z=2))
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        p1000.move_to(Liquid_trash["A1"].top(z=0))
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        p1000.return_tip()
        # ===============================================

        if DRYRUN is False:
            protocol.delay(minutes=0.5)

        protocol.comment("--> Remove ETOH Wash")
        RemoveSup = 200
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        # ===============================================
        p1000.pick_up_tip(tiprack_200_X["A1"])
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=1))
        p1000.aspirate(RemoveSup - 100, rate=1)
        protocol.delay(minutes=0.1)
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=dot_bottom))
        p1000.aspirate(100, rate=0.5)
        p1000.default_speed = 200
        p1000.move_to(CleanupPlate_2["A1"].top(z=2))
        p1000.dispense(200, Liquid_trash["A1"].top(z=0))
        protocol.delay(minutes=0.1)
        p1000.blow_out()
        p1000.default_speed = 400
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.touch_tip(speed=100)

        if DRYRUN is False:
            protocol.delay(minutes=1)

        protocol.comment("--> Removing Residual Wash")
        p1000.flow_rate.aspirate = p96x_200_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_200_flow_rate_dispense_default
        p1000.flow_rate.blow_out = p96x_200_flow_rate_blow_out_default
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=dot_bottom))
        p1000.aspirate(100)
        p1000.dispense(100, Liquid_trash["A1"])
        p1000.move_to(Liquid_trash["A1"].top(z=5))
        protocol.delay(minutes=0.1)
        p1000.move_to(Liquid_trash["A1"].top(z=-3))
        protocol.delay(seconds=1)
        p1000.blow_out(Liquid_trash["A1"].top(z=-3))
        p1000.touch_tip(speed=100)
        p1000.return_tip()
        # ===============================================

        if DRYRUN is False:
            protocol.delay(minutes=0.5)

        # ===============================================================
        # GRIPPER MOVE CleanupPlate_2 FROM: MAG BLOCK --> D1
        protocol.move_labware(
            labware=CleanupPlate_2,
            new_location="D1",
            use_gripper=True,
        )
        # GRIPPER MOVE tiprack_200_6 FROM tiprack_A3_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_200_5,
            new_location=TRASH,
            use_gripper=True,
        )
        # GRIPPER MOVE  FROM tiprack_A3_adapter --> TRASH
        protocol.move_labware(
            labware=tiprack_200_X,
            new_location=TRASH,
            use_gripper=True,
        )
        # TOWER DISPENSES NEW PLATE
        tiprack_50_6 = stacker_50_ul_tips.retrieve()
        protocol.move_lid(tiprack_50_6, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_50_6, tiprack_A2_adapter, use_gripper=True)
        protocol.comment("MOVING: tiprack_50_6 = B4 --> tiprack_A2_adapter")
        # TOWER DISPENSES NEW PLATE
        tiprack_50_7 = stacker_50_ul_tips.retrieve()
        protocol.move_lid(tiprack_50_7, TRASH, use_gripper=True)
        protocol.move_labware(tiprack_50_7, tiprack_A3_adapter, use_gripper=True)
        protocol.comment("MOVING: tiprack_50_7 = B4 --> tiprack_A3_adapter")
        # ================================================================

        protocol.comment("--> Adding RSB")
        RSBVol = 22
        RSBMix = 10 if TIP_MIX else 1
        RSBMixVol = 17.5
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.5
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.5
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.pick_up_tip(tiprack_50_6["A1"].top(z=2))
        p1000.aspirate(RSBVol, RSB.bottom(z=dot_bottom))
        p1000.move_to(CleanupPlate_2.wells_by_name()["A1"].bottom(z=dot_bottom))
        p1000.dispense(
            RSBVol,
            CleanupPlate_2.wells_by_name()["A1"].bottom(z=0.1),
        )
        p1000.move_to(CleanupPlate_2.wells_by_name()["A1"].bottom(z=dot_bottom))
        p1000.mix(RSBMix, RSBMixVol, rate=0.5)
        p1000.blow_out(CleanupPlate_2.wells_by_name()["A1"].top(z=-3))
        p1000.return_tip()
        # ===============================================

        # ===============================================================
        # GRIPPER MOVE CleanupPlate_2 FROM: D1 --> MAG BLOCK
        protocol.move_labware(
            labware=CleanupPlate_2,
            new_location=mag_block,
            use_gripper=True,
        )
        # GRIPPER MOVE sample_plate_2 FROM THERMOCYCLER --> TRASH
        if ONDECK_THERMO:
            protocol.move_labware(
                labware=sample_plate_2,
                new_location=TRASH,
                use_gripper=True,
            )
        else:
            protocol.move_labware(
                labware=sample_plate_2,
                new_location=TRASH,
                use_gripper=True,
            )
        # # GRIPPER MOVE sample_plate_2 FROM: D4 --> THERMOCYCLER
        # if ONDECK_THERMO:
        #     protocol.move_labware(
        #         labware=sample_plate_3,
        #         new_location=thermocycler,
        #         use_gripper=True,
        #     )
        # else:
        #     protocol.move_labware(
        #         labware=sample_plate_3,
        #         new_location="B1",
        #         use_gripper=True,
        #     )
        # ==============================================================

        if DRYRUN is False:
            protocol.delay(minutes=3)

        protocol.comment("--> Transferring Supernatant")
        TransferSup = 20
        # P1000 Head with p50 Tip Speed
        p1000.flow_rate.aspirate = p96x_50_flow_rate_aspirate_default * 0.2
        p1000.flow_rate.dispense = p96x_50_flow_rate_dispense_default * 0.2
        p1000.flow_rate.blow_out = p96x_50_flow_rate_blow_out_default * 0.5
        # ===============================================
        p1000.pick_up_tip(tiprack_50_7["A1"])
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=dot_bottom))
        p1000.aspirate(TransferSup / 2)
        protocol.delay(seconds=1)
        p1000.move_to(CleanupPlate_2["A1"].bottom(z=0.1))
        # p1000.aspirate(TransferSup / 2)
        # p1000.dispense(TransferSup, sample_plate_3["A1"].bottom(z=1))
        p1000.return_tip()
        # ===============================================

    # ========================================== PROTOCOL END
    if DEACTIVATE_TEMP:
        if ONDECK_THERMO:
            thermocycler.deactivate_block()
        if ONDECK_THERMO:
            thermocycler.deactivate_lid()
        if ONDECK_TEMP:
            temp_block.deactivate()
    # ========================================== PROTOCOL END

    protocol.comment("==============================================")
    protocol.comment("--> Report")
    protocol.comment("==============================================")
    # ===== DEFINE LIQUIDS
    if NOLABEL is False:
        # PROTOCOL SETUP - LABELING

        # ====== CALCULATING LIQUIDS ======
        Sample_Volume = 19.5
        Reagent_Vol_CleanupBead_Volume = 80.5
        Reagent_Vol_RSB = 52
        Reagent_Vol_PCR = 25
        Reagent_Vol_FRERAT = 10.5
        Reagent_Vol_ERAT = 10.5
        Reagent_Vol_Adapter = 5
        Reagent_Vol_LIG = 25

        Row_Quadrant12 = ["A", "C", "E", "G", "I", "K", "M", "O"]
        Row_Quadrant34 = ["B", "D", "F", "H", "J", "L", "N", "P"]
        Row_96 = ["A", "B", "C", "D", "E", "F", "G", "H"]

        Column_Quadrant13 = [
            "1",
            "3",
            "5",
            "7",
            "9",
            "11",
            "13",
            "15",
            "17",
            "19",
            "21",
            "23",
        ]
        Column_Quadrant24 = [
            "2",
            "4",
            "6",
            "8",
            "10",
            "12",
            "14",
            "16",
            "18",
            "20",
            "22",
            "24",
        ]
        Column_96 = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]

        # ======== DEFINING LIQUIDS =======
        Sample = protocol.define_liquid(
            name="Sample", description="Sample", display_color="#52AAFF"
        )  # 52AAFF = 'Sample Blue'
        Reagent_CleanupBead = protocol.define_liquid(
            name="EtOH", description="CleanupBead Beads", display_color="#704848"
        )  # 704848 = 'CleanupBead Brown'
        protocol.define_liquid(
            name="EtOH", description="80% Ethanol", display_color="#9ACECB"
        )  # 9ACECB = 'Ethanol Blue'
        Reagent_RSB = protocol.define_liquid(
            name="RSB", description="Resuspension Buffer", display_color="#00FFF2"
        )  # 00FFF2 = 'Base Light Blue'
        Reagent_PCR = protocol.define_liquid(
            name="PCR", description="PCR Mix", display_color="#FF0000"
        )  # FF0000 = 'Base Red'
        Reagent_FRERAT = protocol.define_liquid(
            name="FRERAT",
            description="Fragmentation Enzymatic Prep",
            display_color="#FFA000",
        )  # FFA000 = 'Base Orange'
        Reagent_ERAT = protocol.define_liquid(
            name="ERAT",
            description="End Repair Enzymatic Prep",
            display_color="#FFA000",
        )  # FFA000 = 'Base Orange'
        Reagent_LIG = protocol.define_liquid(
            name="LIG", description="Ligation Mix", display_color="#0EFF00"
        )  # 0EFF00 = 'Base Green'
        Reagent_Adapter = protocol.define_liquid(
            name="Adapter", description="Adapter", display_color="#0EFF00"
        )  # 0EFF00 = 'Base Green'
        protocol.define_liquid(
            name="PRIMER", description="PRIMER", display_color="#0EFF00"
        )  # 0EFF00 = 'Base Green'
        Reagent_Barcodes = protocol.define_liquid(
            name="Barcodes", description="Barcodes", display_color="#7DFFC4"
        )  # 7DFFC4 = 'Barcode Green'
        protocol.define_liquid(
            name="H20", description="H20", display_color="#AABFBF"
        )  # AABFBF = 'H20'
        Placeholder_Sample = protocol.define_liquid(
            name="Placeholder_Sample",
            description="Excess Sample",
            display_color="#82A9CF",
        )  # 82A9CF = 'Placeholder Sample Blue'
        protocol.define_liquid(
            name="Final_Sample", description="Final Sample", display_color="#82A9CF"
        )  # 82A9CF = 'Placeholder Blue'
        Liquid_trash_well = protocol.define_liquid(
            name="Liquid_trash_well",
            description="Liquid Trash",
            display_color="#9B9B9B",
        )  # 9B9B9B = 'Liquid Trash Grey'

        # ======== LOADING LIQUIDS =======
        # ========================== REAGENT PLATE_1 ============================
        if FRAG_MODE == "EZ":
            FRERAT = reagent_plate_1["A1"]
        if FRAG_MODE == "MC":
            ERAT = reagent_plate_1["A1"]
        LIG = reagent_plate_1["A2"]
        PCR = reagent_plate_1["B1"]
        RSB = reagent_plate_1["B2"]

        # ========================== REAGENT PLATE_2 ============================
        CleanupBead = reagent_plate_2["A1"]
        Adapter = reagent_plate_2["A2"]
        Barcodes = reagent_plate_2["B1"]

        # Reagent Plate 1
        for row in Row_Quadrant12:
            if FRAG_MODE == "EZ":
                for col in Column_Quadrant13:
                    reagent_plate_1.wells_by_name()[row + col].load_liquid(
                        liquid=Reagent_FRERAT, volume=Reagent_Vol_FRERAT
                    )
                for col in Column_Quadrant13:
                    reagent_plate_1.wells_by_name()[row + col].load_liquid(
                        liquid=Reagent_ERAT, volume=Reagent_Vol_ERAT
                    )
            for col in Column_Quadrant24:
                reagent_plate_1.wells_by_name()[row + col].load_liquid(
                    liquid=Reagent_LIG, volume=Reagent_Vol_LIG
                )
        for row in Row_Quadrant34:
            for col in Column_Quadrant13:
                reagent_plate_1.wells_by_name()[row + col].load_liquid(
                    liquid=Reagent_PCR, volume=Reagent_Vol_PCR * (1 / 12)
                )
            for col in Column_Quadrant24:
                reagent_plate_1.wells_by_name()[row + col].load_liquid(
                    liquid=Reagent_RSB, volume=Reagent_Vol_RSB * (1 / 12)
                )

        # Reagent Plate 1
        for row in Row_Quadrant12:
            for col in Column_Quadrant13:
                reagent_plate_2.wells_by_name()[row + col].load_liquid(
                    liquid=Reagent_CleanupBead, volume=Reagent_Vol_CleanupBead_Volume
                )
            for col in Column_Quadrant24:
                reagent_plate_2.wells_by_name()[row + col].load_liquid(
                    liquid=Reagent_Adapter, volume=Reagent_Vol_Adapter
                )
        for row in Row_Quadrant34:
            for col in Column_Quadrant13:
                reagent_plate_2.wells_by_name()[row + col].load_liquid(
                    liquid=Reagent_Barcodes, volume=5
                )

        # Liquid Trash
        for row in Row_96:
            for col in Column_96:
                Liquid_trash.wells_by_name()[row + col].load_liquid(
                    liquid=Liquid_trash_well, volume=0
                )

        # ETOH Reservoir
        for row in Row_96:
            for col in Column_96:
                ETOH_Reservoir.wells_by_name()[row + col].load_liquid(
                    liquid=Reagent_CleanupBead, volume=0
                )

        # Sample Plate 1
        for row in Row_96:
            for col in Column_96:
                sample_plate_1.wells_by_name()[row + col].load_liquid(
                    liquid=Sample, volume=Sample_Volume
                )

        # Sample Plate 2
        for row in Row_96:
            for col in Column_96:
                sample_plate_2.wells_by_name()[row + col].load_liquid(
                    liquid=Placeholder_Sample, volume=0
                )

        # # Sample Plate 3
        # for row in Row_96:
        #     for col in Column_96:
        #         sample_plate_3.wells_by_name()[row + col].load_liquid(
        #             liquid=Final_Sample, volume=0
        #         )
