#############
# CHANGELOG #
#############

# ----
# 2.21
# ----

# - - Run protocols that use the Absorbance Plate Reader and check the status of the module on the robot details screen for your Flex.
# - - Run protocols that use the new Opentrons Tough PCR Auto-Sealing Lid with the Thermocycler Module GEN2. Stacks of these lids appear in a consolidated view when setting up labware.
# - - Error recovery now works in more situations and has more options - Gripper Errors, Drop Tip Errors, additional recovery options for tip errors,  disable error recovery entirely (8.2.0)

# ----
# 2.20
# ----

# - configure_nozzle_layout() now accepts row, single, and partial column layout constants. See Partial Tip Pickup.
# - You can now call ProtocolContext.define_liquid() without supplying a description or display_color.
# - You can now call ProtocolContext.liquid_presence_detection() or ProtocolContext.require_liquid_presence() to use LLD on instrument context or on well
# - You now have the option to set RTP using CSV files
# - Error Recovery will now initiate for miss tip pick up, overpressure on aspirate and dispense, and if liquid presence isn't detected (8.0.0)

# ----
# 2.19
# ----

# - NO FEATURES OR API CHANGES
# - New values for how much a tip overlaps with the pipette nozzle when the pipette picks up tips

# ----
# 2.18
# ----

# - labware.set_offset
# - Runtime Parameters added
# - TrashContainer.top() and Well.top() now return objects of the same type
# - pipette.drop_tip() if location argument not specified the tips will be dropped at different locations in the bin
# - pipette.drop_tip() if location is specified, the tips will be dropped in the same place every time

# ----
# 2.17
# ----

# NOTHING NEW
# This protocol is exactly the same as 2.16 Smoke Test V3
# The only difference is the API version in the metadata
# There were no new positive test cases for 2.17
# The negative test cases are captured in the 2.17 dispense changes protocol

# ----
# 2.16
# ----

# - prepare_to_aspirate added
# - fixed_trash property changed
# - instrument_context.trash_container property changed

# ----
# 2.15
# ----

# - move_labware added - Manual Deck State Modification
# - ProtocolContext.load_adapter added
# - OFF_DECK location added

from opentrons import protocol_api, types
from opentrons.protocol_api import Labware
import dataclasses
import typing
from typing import List


metadata = {
    "protocolName": "Flex Smoke Test - v2.21",
    "author": "QA team",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}


#################
### CONSTANTS ###
#################

DeckSlots = List[
    "A1",
    "A2",
    "A3",
    "A4",
    "B1",
    "B2",
    "B3",
    "B4",
    "C1",
    "C2",
    "C3",
    "C4",
    "D1",
    "D2",
    "D3",
    "D4",
]

HEATER_SHAKER_ADAPTER_NAME = "opentrons_96_pcr_adapter"
HEATER_SHAKER_NAME = "heaterShakerModuleV1"
MAGNETIC_BLOCK_NAME = "magneticBlockV1"
TEMPERATURE_MODULE_ADAPTER_NAME = "opentrons_96_well_aluminum_block"
TEMPERATURE_MODULE_NAME = "temperature module gen2"
THERMOCYCLER_NAME = "thermocycler module gen2"
ABSORBANCE_READER = "absorbanceReaderV1"

DECK_RISER_NAME = "opentrons_flex_deck_riser"
TC_LID = "opentrons_tough_pcr_auto_sealing_lid"
LID_COUNT = 5

TIPRACK_96_ADAPTER_NAME = "opentrons_flex_96_tiprack_adapter"
TIPRACK_96_NAME = "opentrons_flex_96_tiprack_1000ul"

PIPETTE_96_CHANNEL_NAME = "flex_96channel_1000"

##############################
# Runtime Parameters Support #
##############################

# -------------------------- #
# Added in API version: 2.18 #
# -------------------------- #


def add_parameters(parameters: protocol_api.Parameters):
    """This is the standard use of parameters"""

    # We are using the defaults for every case.
    # Other tests cover regression testing for
    # other types of parameters and UI appearance
    # there are many tests in Analyses Battery that cover errors and edge cases

    parameters.add_str(
        variable_name="test_configuration",
        display_name="Test Configuration",
        description="Configuration of QA test to perform",
        default="full",
        choices=[{"display_name": "Full Smoke Test", "value": "full"}],
    )

    parameters.add_str(
        variable_name="reservoir_name",
        display_name="Reservoir Name",
        description="Name of the reservoir",
        default="nest_1_reservoir_290ml",
        choices={"display_name": "Nest 1 Well 290 mL", "value": "nest_1_reservoir_290ml"},
    )

    parameters.add_str(
        variable_name="well_plate_name",
        display_name="Well Plate Name",
        description="Name of the well plate",
        default="opentrons_96_wellplate_200ul_pcr_full_skirt",
        choices=[{"display_name": "Opentrons Tough 96 Well 200 µL", "value": "opentrons_96_wellplate_200ul_pcr_full_skirt"}],
    )

def run(ctx: protocol_api.ProtocolContext) -> None:

    ################
    ### FIXTURES ###
    ################

    waste_chute = ctx.load_waste_chute()

    ###############
    ### MODULES ###
    ###############
    deck_riser_adapter = ctx.load_adapter(DECK_RISER_NAME, "A4")
    thermocycler = ctx.load_module(THERMOCYCLER_NAME)  # A1 & B1
    magnetic_block = ctx.load_module(MAGNETIC_BLOCK_NAME, "A3")
    heater_shaker = ctx.load_module(HEATER_SHAKER_NAME, "C1")
    temperature_module = ctx.load_module(TEMPERATURE_MODULE_NAME, "D1")
    absorbance_module = ctx.load_module(ABSORBANCE_READER, "B3")

    lids: List[Labware] = [deck_riser_adapter.load_labware(TC_LID)]
    for i in range(LID_COUNT - 1):
        lids.append(lids[-1].load_labware(TC_LID))
    lids.reverse()

    thermocycler.open_lid()
    heater_shaker.open_labware_latch()
    absorbance_module.close_lid()
    absorbance_module.initialize('single', [600], 450)
    absorbance_module.open_lid()

    #######################
    ### MODULE ADAPTERS ###
    #######################

    temperature_module_adapter = temperature_module.load_adapter(TEMPERATURE_MODULE_ADAPTER_NAME)
    heater_shaker_adapter = heater_shaker.load_adapter(HEATER_SHAKER_ADAPTER_NAME)
    adapters = [temperature_module_adapter, heater_shaker_adapter]

    ##########################
    ### TEST CONFIGURATION ###
    ##########################

    test_config: TestConfiguration = TestConfiguration.get_configuration(
        ctx.params, [thermocycler, magnetic_block, temperature_module_adapter, heater_shaker_adapter, absorbance_module]
    )

    ###############
    ### LABWARE ###
    ###############

    source_reservoir = ctx.load_labware(test_config.reservoir_name, "D2")
    dest_pcr_plate = ctx.load_labware(test_config.well_plate_name, "C2")

    tip_rack_1 = ctx.load_labware(TIPRACK_96_NAME, "A2", adapter=TIPRACK_96_ADAPTER_NAME)
    tip_rack_adapter = tip_rack_1.parent

    tip_rack_2 = ctx.load_labware(TIPRACK_96_NAME, "C3")
    tip_rack_3 = ctx.load_labware(TIPRACK_96_NAME, "C4")
    tip_rack_5 = ctx.load_labware(TIPRACK_96_NAME, protocol_api.OFF_DECK) 

    tip_racks = [tip_rack_1 , tip_rack_2, tip_rack_3]

    ##########################
    ### PIPETTE DEFINITION ###
    ##########################

    pipette_96_channel = ctx.load_instrument(PIPETTE_96_CHANNEL_NAME, mount="left", tip_racks=tip_racks, liquid_presence_detection=True)
    pipette_96_channel.trash_container = waste_chute

    assert isinstance(pipette_96_channel.trash_container, protocol_api.WasteChute)

    ########################
    ### LOAD SOME LIQUID ###
    ########################

    water = ctx.define_liquid(name="water", description="High Quality H₂O", display_color="#42AB2D")
    source_reservoir.wells_by_name()["A1"].load_liquid(liquid=water, volume=29000)

    ################################
    ### GRIPPER LABWARE MOVEMENT ###
    ################################

    def get_disposal_preference():
        """
        Get the disposal preference based on the PREFER_MOVE_OFF_DECK flag.

        Returns:
            tuple: A tuple containing the disposal preference. The first element is the location preference,
                   either `protocol_api.OFF_DECK` or `waste_chute`. The second element is a boolean indicating
                   whether the gripper is being used or not.
        """
        return (protocol_api.OFF_DECK, False) if test_config.prefer_move_off_deck else (waste_chute, True)

    def run_moves(labware, move_sequence, reset_location):
        """
        Perform a series of moves for a given labware using specified move sequences.

        Will perform 2 versions of the moves:
            1. Moves to each location in the sequence, resetting to the reset location after each move.
            2. Moves to each location in the sequence, resetting to the reset location after all moves.

        Args:
            labware (str): The labware to be moved.
            move_sequences (list): A list of move sequences, where each sequence is a list of locations.
            reset_location (str): The location to reset the labware after each move sequence.
        """

        def move_to_locations(labware_to_move, move_tos, reset_after_each_move, reset_location):
            """
            Move the labware to the specified locations.

            Args:
                labware_to_move (str): The labware to be moved.
                move_tos (list): A list of locations to move the labware to.
                reset_after_each_move (bool): Flag indicating whether to reset the labware after each move.
                reset_location (str): The location to reset the labware after each move sequence.
            """

            def reset_labware():
                """
                Reset the labware to the reset location.
                """
                ctx.move_labware(labware_to_move, reset_location, use_gripper=True)

            if len(move_tos) == 0:
                return

            for location in move_tos:
                ctx.move_labware(labware_to_move, location, use_gripper=True)

                if reset_after_each_move:
                    reset_labware()

            if not reset_after_each_move:
                reset_labware()

        for move_tos in move_sequence.get_move_to_list():
            if test_config.move_reset_logic == "After Each Move":
                move_to_locations(labware, move_tos, True, reset_location)
            elif test_config.move_reset_logic == "After All Moves":
                move_to_locations(labware, move_tos, False, reset_location)
            else:
                move_to_locations(labware, move_tos, True, reset_location)
                move_to_locations(labware, move_tos, False, reset_location)

    def test_gripper_moves(): #remove >> many repititious moves
        """
        Function to test the movement of the gripper in various locations.

        This function contains several helper functions to perform the movement of labware using a gripper.
        Each function performs a sequence of moves, starting with a specific location on the deck.

        Args:
            None

        Returns:
            None
        """

        def deck_moves(labware, reset_location):
            """
            Function to perform the movement of labware, with the inital position being on the deck.

            Args:
                pcr_plate (str): The labware to be moved on the deck.
                reset_location (str): The reset location on the deck.

            Returns:
                None
            """
            run_moves(labware, test_config.moves.from_deck_move_sequence, reset_location)

        def staging_area_slot_3_moves(labware, reset_location):
            """
            Function to perform the movement of labware, with the inital position being on staging area slot 3.

            Args:
                labware (str): The labware to be moved in staging area slot 3.
                reset_location (str): The reset location in staging area slot 3.

            Returns:
                None
            """

            run_moves(labware, test_config.moves.from_staging_area_slot_3_move_sequence, reset_location)

        def staging_area_slot_4_moves(labware, reset_location):
            """
            Function to perform the movement of labware, with the inital position being on staging area slot 4.

            Args:
                labware (str): The labware to be moved in staging area slot 4.
                reset_location (str): The reset location in staging area slot 4.

            Returns:
                None
            """

            run_moves(labware, test_config.moves.from_staging_area_slot_4_move_sequence, reset_location)

        def module_moves(labware, module_locations):
            """
            Function to perform the movement of labware, with the inital position being on a module.

            Args:
                labware (str): The labware to be moved with modules.
                module_locations (list): The locations of the modules.

            Returns:
                None
            """

            move_tos = test_config.moves.from_module_move_sequence

            for module_starting_location in module_locations:
                temp_mod_locations = module_locations.copy()
                # Don't move to the starting location
                temp_mod_locations.remove(module_starting_location)

                # Set module move tos to everything but the module we are moving from
                move_tos.to_module_moves = temp_mod_locations

                # Reset to starting location
                ctx.move_labware(labware, module_starting_location, use_gripper=True)

                # do the moves
                run_moves(labware, move_tos, module_starting_location)

        DECK_MOVE_RESET_LOCATION = "C2"
        STAGING_AREA_SLOT_3_RESET_LOCATION = "C3"
        STAGING_AREA_SLOT_4_RESET_LOCATION = "D4"

        deck_moves(dest_pcr_plate, DECK_MOVE_RESET_LOCATION)

        ctx.move_labware(dest_pcr_plate, STAGING_AREA_SLOT_3_RESET_LOCATION, use_gripper=True)
        staging_area_slot_3_moves(dest_pcr_plate, STAGING_AREA_SLOT_3_RESET_LOCATION)

        ctx.move_labware(dest_pcr_plate, STAGING_AREA_SLOT_4_RESET_LOCATION, use_gripper=True)
        staging_area_slot_4_moves(dest_pcr_plate, STAGING_AREA_SLOT_4_RESET_LOCATION)

        module_locations = [thermocycler, magnetic_block, absorbance_module] + adapters
        module_moves(dest_pcr_plate, module_locations)

        ctx.move_labware(dest_pcr_plate, DECK_MOVE_RESET_LOCATION, use_gripper=True)

    def test_manual_moves():
        # In C4 currently
        ctx.move_labware(source_reservoir, "D4", use_gripper=False)

    def test_pipetting():
        def test_partial_tip_pickup_usage():
            pipette_96_channel.configure_nozzle_layout(style=protocol_api.COLUMN, start="A12")

            for i in range(1, test_config.partial_tip_pickup_column_count + 1):

                pipette_96_channel.pick_up_tip(tip_rack_2[f"A{i}"])

                pipette_96_channel.aspirate(5, source_reservoir["A1"])
                pipette_96_channel.touch_tip()
                pipette_96_channel.dispense(5, dest_pcr_plate[f"A{i}"])

                if i == 1:
                    ctx.pause(
                        "Watch this next tip drop in the waste chute. We are going to compare it against the next drop in the waste chute."
                    )

                if i == 2:
                    ctx.pause("Watch this next tip drop in the waste chute. It should drop in a different location than the previous drop.")

                if i == 1:
                    pipette_96_channel.drop_tip(waste_chute)
                else:
                    pipette_96_channel.drop_tip()

        def test_single_tip_pickup_usage():
            pipette_96_channel.configure_nozzle_layout(style=protocol_api.SINGLE, start="H12")

            for i in range(1, test_config.partial_tip_pickup_single_count):

                pipette_96_channel.pick_up_tip(tip_rack_2)

                pipette_96_channel.aspirate(5, source_reservoir["A1"])
                pipette_96_channel.touch_tip()

                pipette_96_channel.dispense(5, source_reservoir["A1"])
                pipette_96_channel.aspirate(500, source_reservoir["A1"])
                pipette_96_channel.dispense(500, source_reservoir["A1"])

                if i == 1:
                    ctx.pause(
                        "Watch this next tip drop in the waste chute. We are going to compare it against the next drop in the waste chute."
                    )

                if i == 2:
                    ctx.pause("Watch this next tip drop in the waste chute. It should drop in a different location than the previous drop.")

                if i == 1:
                    pipette_96_channel.drop_tip(waste_chute)
                else:
                    pipette_96_channel.drop_tip()

            # leave this dropping in waste chute, do not use get_disposal_preference
            # want to test partial drop
            ctx.move_labware(tip_rack_2, protocol_api.OFF_DECK)
            ctx.move_labware(tip_rack_5, new_location="C3")

        def test_row_tip_pickup_usage():
            pipette_96_channel.configure_nozzle_layout(style=protocol_api.ROW, start="H1")

            for i in range(1, test_config.partial_tip_pickup_row_count):

                pipette_96_channel.pick_up_tip(tip_rack_5)

                pipette_96_channel.mix(3, 500, source_reservoir["A1"])

                if i == 1:
                    ctx.pause(
                        "Watch this next tip drop in the waste chute. We are going to compare it against the next drop in the waste chute."
                    )

                if i == 2:
                    ctx.pause("Watch this next tip drop in the waste chute. It should drop in a different location than the previous drop.")

                if i == 1:
                    pipette_96_channel.drop_tip(waste_chute)
                else:
                    pipette_96_channel.drop_tip()

            # leave this dropping in waste chute, do not use get_disposal_preference
            # want to test partial drop
            ctx.move_labware(tip_rack_5, waste_chute, use_gripper=True)


        def test_full_tip_rack_usage():
            pipette_96_channel.configure_nozzle_layout(style=protocol_api.ALL, start="A1")
            pipette_96_channel.pick_up_tip(tip_rack_1["A1"])

            pipette_96_channel.aspirate(5, source_reservoir["A1"])
            pipette_96_channel.touch_tip()

            pipette_96_channel.air_gap(height=30)

            pipette_96_channel.blow_out(waste_chute)
            pipette_96_channel.prepare_to_aspirate()

            pipette_96_channel.aspirate(5, source_reservoir["A1"])
            pipette_96_channel.touch_tip()

            pipette_96_channel.air_gap(height=30)
            pipette_96_channel.blow_out(waste_chute)
            pipette_96_channel.prepare_to_aspirate()

            pipette_96_channel.aspirate(10, source_reservoir["A1"])
            pipette_96_channel.touch_tip()

            pipette_96_channel.dispense(10, dest_pcr_plate["A1"])
            pipette_96_channel.mix(repetitions=5, volume=15)
            pipette_96_channel.return_tip()

            ctx.move_labware(tip_rack_1, get_disposal_preference()[0], use_gripper=get_disposal_preference()[1])
            ctx.move_labware(tip_rack_3, tip_rack_adapter, use_gripper=True)

            pipette_96_channel.pick_up_tip(tip_rack_3["A1"])
            pipette_96_channel.transfer(
                volume=10,
                source=source_reservoir["A1"],
                dest=dest_pcr_plate["A1"],
                new_tip="never",
                touch_tip=True,
                blow_out=True,
                blowout_location="trash",
                mix_before=(3, 5),
                mix_after=(1, 5),
            )
            pipette_96_channel.return_tip()

        test_partial_tip_pickup_usage() 
        test_single_tip_pickup_usage()
        test_row_tip_pickup_usage()
        test_full_tip_rack_usage()

    def test_module_usage():

        def test_thermocycler():
            ctx.move_labware(
                dest_pcr_plate, 
                thermocycler, 
                use_gripper=True
            )
            for  lid in lids:
                ctx.move_labware(
                    lid,
                    dest_pcr_plate,
                    use_gripper=True
                )
                thermocycler.close_lid()
                thermocycler.set_block_temperature(test_config.module_temps.thermocycler_block, hold_time_seconds=5.0)
                thermocycler.set_lid_temperature(test_config.module_temps.thermocycler_lid)
                thermocycler.open_lid()
                ctx.move_labware(
                    lid,
                    waste_chute,
                    use_gripper=True
                )
            
            thermocycler.deactivate()

        def test_heater_shaker():
            heater_shaker.open_labware_latch()
            ctx.move_labware(
                dest_pcr_plate, 
                heater_shaker_adapter, 
                use_gripper=True
            )
            heater_shaker.close_labware_latch()

            heater_shaker.set_target_temperature(test_config.module_temps.heater_shaker)
            heater_shaker.set_and_wait_for_shake_speed(1000)
            heater_shaker.wait_for_temperature()

            heater_shaker.deactivate_heater()
            heater_shaker.deactivate_shaker()
            heater_shaker.open_labware_latch()

        def test_temperature_module():
            ctx.move_labware(
                dest_pcr_plate, 
                temperature_module_adapter, 
                use_gripper=True
            )
            temperature_module.set_temperature(test_config.module_temps.temperature_module)
            temperature_module.deactivate()

        def test_magnetic_block():
            pass
        def test_absorbance_reader():
            ctx.move_labware(
                dest_pcr_plate, 
                absorbance_module, 
                use_gripper=True
            )
            absorbance_module.close_lid()

            result = absorbance_module.read(export_filename="smoke_APR_data.csv")
            msg = f"single: {result}"
            ctx.comment(msg=msg)
            ctx.pause(msg=msg)
            absorbance_module.open_lid()
            ctx.move_labware(
                dest_pcr_plate, 
                "C2", 
                use_gripper=True
            )


        test_thermocycler()
        test_heater_shaker()
        test_temperature_module()
        test_magnetic_block()
        test_absorbance_reader()

    def test_labware_set_offset():
        """Test the labware.set_offset method."""
        ######################
        # labware.set_offset #
        ######################

        # -------------------------- #
        # Added in API version: 2.18 #
        # -------------------------- #

        SET_OFFSET_AMOUNT = 10.0
        ctx.move_labware(labware=source_reservoir, new_location=protocol_api.OFF_DECK, use_gripper=False)
        pipette_96_channel.pick_up_tip(tip_rack_3["A1"])
        pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())

        ctx.pause("Is the pipette tip in the middle of the PCR Plate, well A1, in slot C2? It should be at the LPC calibrated height.")

        dest_pcr_plate.set_offset(
            x=0.0,
            y=0.0,
            z=SET_OFFSET_AMOUNT,
        )

        pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())
        ctx.pause(
            "Is the pipette tip in the middle of the PCR Plate, well A1, in slot C2? It should be 10mm higher than the LPC calibrated height."
        )

        ctx.move_labware(labware=dest_pcr_plate, new_location="D2", use_gripper=False)
        pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())

        ctx.pause("Is the pipette tip in the middle of the PCR Plate, well A1, in slot D2? It should be at the LPC calibrated height.")

        dest_pcr_plate.set_offset(
            x=0.0,
            y=0.0,
            z=SET_OFFSET_AMOUNT,
        )

        pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())
        ctx.pause(
            "Is the pipette tip in the middle of the PCR Plate, well A1, in slot D2? It should be 10mm higher than the LPC calibrated height."
        )

        ctx.move_labware(labware=dest_pcr_plate, new_location="C2", use_gripper=False)
        pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())

        ctx.pause(
            "Is the pipette tip in the middle of the PCR Plate, well A1, in slot C2? It should be 10mm higher than the LPC calibrated height."
        )

        ctx.move_labware(labware=source_reservoir, new_location="D2", use_gripper=False)
        pipette_96_channel.move_to(source_reservoir.wells_by_name()["A1"].top())

        ctx.pause("Is the pipette tip in the middle of the reservoir , well A1, in slot D2? It should be at the LPC calibrated height.")

        pipette_96_channel.return_tip()
        ctx.move_labware(tip_rack_3, get_disposal_preference()[0], use_gripper=get_disposal_preference()[1])

        ctx.pause("!!!!!!!!!!YOU NEED TO REDO LPC!!!!!!!!!!")

    def test_unique_top_methods():
        """
        Test the unique top() methods for TrashBin and WasteChute.

        Well objects should remain the same
        """
        ########################
        # unique top() methods #
        ########################

        # ---------------------------- #
        # Changed in API version: 2.18 #
        # ---------------------------- #

        assert isinstance(waste_chute.top(), protocol_api.WasteChute)
        assert isinstance(source_reservoir.wells_by_name()["A1"].top(), types.Location)

    ###################################################################################################
    ### THE ORDER OF THESE FUNCTION CALLS MATTER. CHANGING THEM WILL CAUSE THE PROTOCOL NOT TO WORK ###
    ###################################################################################################
    test_pipetting()
    test_gripper_moves()
    test_module_usage()
    test_manual_moves()
    if test_config.test_set_offset:
        test_labware_set_offset()
    test_unique_top_methods()

    ###################################################################################################
    ### THE ORDER OF THESE FUNCTION CALLS MATTER. CHANGING THEM WILL CAUSE THE PROTOCOL NOT TO WORK ###
    ###################################################################################################


# Cannot test in this protocol
#           - Waste Chute w/ Lid
