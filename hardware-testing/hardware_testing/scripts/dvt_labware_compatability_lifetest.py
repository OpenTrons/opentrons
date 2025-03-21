"""DVT Flex Stacker with 2 stackers.

This protocol is used to validate stacker store/dispense commands

"""

from opentrons.protocol_api import ParameterContext, ProtocolContext
from opentrons.protocol_api.module_contexts import (
    FlexStackerContext,
    # FlexStackerModule,
)
from datetime import datetime
import time
import os
import csv

metadata = {
    "protocolName": "Flex Stacker Labware Dispense/Store.",
    "author": "Opentrons <protocols@opentrons.com>",
    "description": "This protocol dispenses labware from one stacker and into"
    "another stacker, the second stacker then stores it, and the actions are"
    "reversed."
}
requirements = {
    "robotType": "Flex",
    "apiLevel": "2.23",
}

test_data = {
    "Cycles" : None,
    "Stacker SN": None,
    "State": None,
    "labware": None,
    "plate_num": None,
    "Error": None,

}

def add_parameters(parameters: ParameterContext) -> None:
    """Runtime parameters."""
    parameters.add_str(
        display_name="Target Labware",
        variable_name="labware_name",
        description="The labware that will be stored/dispensed.",
        default="opentrons_flex_96_tiprack_1000ul",
        choices=[
            {"display_name": "Opentrons 96 Tipack 50ul", "value": "opentrons_flex_96_tiprack_50ul"},
            {"display_name": "Opentrons 96 Tipack 200ul", "value": "opentrons_flex_96_tiprack_200ul"},
            {"display_name": "Opentrons 96 Tipack 1000ul", "value": "opentrons_flex_96_tiprack_1000ul"},
        ]
    )
    parameters.add_int(
        display_name="Cycles",
        variable_name="test_cycles",
        description="The number of cycles of dispensing/storing to perform.",
        default=5616,
        minimum=1,
        maximum=5616,
    )
    parameters.add_int(
        display_name="Labware Count",
        variable_name="labware_count",
        description="The number of labware in the stacker",
        default=6,
        minimum=1,
        maximum=6,
    )

    parameters.add_str(
        display_name="number of stackers",
        variable_name="stackers_mounted",
        description="choose the stackers that is on the deck.",
        default="D4 C4 B4 A4",
        choices=[
            {"display_name": "Configure 1", "value": "D4 C4 B4 A4"},
            {"display_name": "Configure 2", "value": "D4 C4"},
        ]
    )



tiprack_lid = "opentrons_flex_tiprack_lid"

def record_test_data(test_data, cycle, SNs, state, labware, plate_num, log_file, csvfile):
    test_data['Cycles'] = cycle
    test_data['Stacker SN'] = SNs
    test_data['State'] = state
    test_data['labware'] = labware
    test_data['plate_num'] = plate_num
    test_data['error'] = None
    log_file.writerow(test_data)
    csvfile.flush()


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    directory = f'/data/dvt_stacker_lifetime_{datetime.now().strftime("%m_%d_%y")}'
    if not os.path.exists(directory):
        os.makedirs(directory)
    labware_name = protocol.params.labware_name
    labware_count = protocol.params.labware_count
    test_cycles = protocol.params.test_cycles
    stackers_mounted = protocol.params.stackers_mounted
    deck_slots_for_stackers = stackers_mounted.split()

    # ======================= Stacker Setup ======================
    stacker_num = 0
    SNs = []
    num_of_stackers = len(deck_slots_for_stackers)
    for d in deck_slots_for_stackers:
        stacker_num += 1
        globals()[f'f_stacker_{stacker_num}'] : FlexStackerContext = protocol.load_module( # type: ignore
                                                                    "flexStackerModuleV1", d
                                                                )
        if stacker_num % 2 == 0:
            globals()[f'f_stacker_{stacker_num}'].set_stored_labware(
                                        load_name=labware_name,
                                        count=0,  # always zero so we can store the labware
                                        lid=tiprack_lid,
                                    )
        else:  
            globals()[f'f_stacker_{stacker_num}'].set_stored_labware(
                                                                    load_name=labware_name,
                                                                    count=6,
                                                                    lid=tiprack_lid,
                                                                )
    
        SNs.append(globals()[f'f_stacker_{stacker_num}']._core.get_serial_number())
    f_name = f'{directory}/labware_compatablitiy_lifetime_test_{datetime.now().strftime("%m_%d_%y_%H_%M")}.csv'
    # ======================= RETRIEVE/STORE TIPRACKS ======================
    if not protocol.is_simulating():
        with open(f_name, 'w', newline='') as csvfile:
            test_details = csv.writer(csvfile, delimiter = ',', quotechar = '"', quoting = csv.QUOTE_MINIMAL)
            test_details.writerow({'test details'})
            test_details.writerow({'Flex Stacker'})
            log_file = csv.DictWriter(csvfile, test_data)
            log_file.writeheader()
            try:
                for cycle in range(test_cycles):
                    labware_list = []
                    protocol.comment(f"Starting cycle: {cycle} for {labware_name}")
                    for _ in range(labware_count):
                        if num_of_stackers == 4:
                            # ---------------------Retrieve labware Stacker A---------------------------------
                            lw = globals()[f'f_stacker_{1}'].retrieve()
                            record_test_data(test_data, cycle, SNs[0], "retrieve", labware_name, _, log_file, csvfile)
                            protocol.move_labware(lw, globals()[f'f_stacker_{2}'], use_gripper=True)
                            # ---------------------Store labware Stacker B---------------------------------
                            globals()[f'f_stacker_{2}'].store()
                            record_test_data(test_data, cycle, SNs[1], "Store", labware_name, _, log_file, csvfile)
                            labware_list.append(lw)
                            # ---------------------Retrieve labware Stacker C---------------------------------
                            lw = globals()[f'f_stacker_{3}'].retrieve()
                            record_test_data(test_data, cycle, SNs[2], "retrieve", labware_name, _, log_file, csvfile)
                            protocol.move_labware(lw, globals()[f'f_stacker_{4}'], use_gripper=True)
                            # ---------------------Store labware Stacker D---------------------------------
                            globals()[f'f_stacker_{4}'].store()
                            record_test_data(test_data, cycle, SNs[3], "Store", labware_name, _, log_file, csvfile)
                            labware_list.append(lw)

                        elif num_of_stackers == 2:
                            # ---------------------Retrieve labware Stacker A---------------------------------
                            lw = globals()[f'f_stacker_{1}'].retrieve()
                            record_test_data(test_data, cycle, SNs[0], "retrieve", labware_name, _, log_file, csvfile)
                            protocol.move_labware(lw, globals()[f'f_stacker_{2}'], use_gripper=True)
                            # ---------------------Store labware Stacker B---------------------------------
                            globals()[f'f_stacker_{2}'].store()
                            record_test_data(test_data, cycle, SNs[1], "store", labware_name, _, log_file, csvfile)
                            labware_list.append(lw)

                    for _ in labware_list:
                        if num_of_stackers == 4:
                            # go backwards
                            # ---------------------Store labware Stacker B---------------------------------
                            lw = globals()[f'f_stacker_{2}'].retrieve()
                            record_test_data(test_data, cycle, SNs[1], "retrieve", labware_name, _, log_file, csvfile)
                            protocol.move_labware(lw, globals()[f'f_stacker_{1}'], use_gripper=True)
                            # ---------------------Retrieve labware Stacker A---------------------------------
                            globals()[f'f_stacker_{1}'].store()
                            record_test_data(test_data, cycle, SNs[0], "Store", labware_name, _, log_file, csvfile)

                            # go backwards
                            # ---------------------Store labware Stacker D---------------------------------
                            lw = globals()[f'f_stacker_{4}'].retrieve()
                            record_test_data(test_data, cycle, SNs[3], "retrieve", labware_name, _, log_file, csvfile)
                            protocol.move_labware(lw, globals()[f'f_stacker_{3}'], use_gripper=True)
                            # ---------------------Store labware Stacker C---------------------------------
                            globals()[f'f_stacker_{3}'].store()
                            record_test_data(test_data, cycle, SNs[2], "store", labware_name, _, log_file, csvfile)

                        elif num_of_stackers == 2:
                            # go backwards
                            # ---------------------Store labware Stacker B---------------------------------
                            lw = globals()[f'f_stacker_{2}'].retrieve()
                            record_test_data(test_data, cycle, SNs[1], "retrieve", labware_name, _, log_file, csvfile)
                            protocol.move_labware(lw, globals()[f'f_stacker_{1}'], use_gripper=True)
                            # ---------------------Retrieve labware Stacker A---------------------------------
                            record_test_data(test_data, cycle, SNs[0], "store", labware_name, _, log_file, csvfile)
                            globals()[f'f_stacker_{1}'].store()

            except Exception as e:
                test_data['Error'] = e
                log_file.writerow(test_data)
                csvfile.flush()