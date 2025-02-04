import csv
import time
from datetime import datetime
from opentrons.protocol_api import ProtocolContext
from hardware_testing.drivers.stacker import flex_stacker_driver

metadata = {"protocolName": "Flex Stacker Plate-Reader Gripper Test"}
requirements = {"robotType": "Flex", "apiLevel": "2.21"}

STACKER_HEIGHT = 12
CYCLES = 10

# Define Spreadsheet Parameters
test_name = "stacker_platereader_gripper_test"
test_tag = f""
test_time = datetime.utcnow().strftime("%y-%m-%d-%H-%M-%S")
test_id = f"_run-{test_time}"
file_format = ".csv"
file_name = test_name + test_tag + test_id + file_format
file_folder = "/data/testing_data/stacker_platereader_gripper_test/"
file_path = file_folder + file_name
file_header = ["Time","Cycle","Stacker ID","Stacker State","Lid State"]

labware = "armadillo_96_wellplate_200ul_pcr_full_skirt"
labware_height = flex_stacker_driver.LABWARE_Z_HEIGHT.BIORAD_HARDSHELL_PCR

def run(protocol: ProtocolContext) -> None:
    # Record Test Data
    def record_data(cycle, stacker_id, stacker_state, lid_state):
        print(f"Cycle: {cycle}, Stacker: {stacker_id}, State: {stacker_state}")
        print("Recording...")
        if not protocol.is_simulating():
            elapsed_time = (time.time() - start_time)/60
            timestamp = round(elapsed_time, 3)
            test_data = [timestamp, cycle, stacker_id, stacker_state, lid_state]
            with open(file_path, 'a+') as f:
                writer = csv.writer(f)
                writer.writerow(test_data)

    # Create Spreadsheet
    if not protocol.is_simulating():
        with open(file_path, 'a+') as f:
            writer = csv.writer(f)
            writer.writerow(file_header)

    # Protocol Setup
    hardware = protocol._hw_manager.hardware
    hardware.cache_instruments()
    plate_reader = protocol.load_module("absorbanceReaderV1", "C3")
    plate_reader.open_lid()
    stacker_platform_1 = "D4"
    stacker_platform_2 = "B4"
    deck_slot_1 = "D3"
    deck_slot_2 = "B3"
    stacker_plate_1 = protocol.load_labware(labware, stacker_platform_1)
    stacker_plate_2 = protocol.load_labware(labware, stacker_platform_2)
    if not protocol.is_simulating():
        f_stacker_1 = flex_stacker_driver.FlexStacker(None).create('/dev/ttyACM1')
        f_stacker_2 = flex_stacker_driver.FlexStacker(None).create('/dev/ttyACM2')

    # Protocol Run
    start_time = time.time()
    for i in range(CYCLES):
        cycle = i + 1
        print(f"Starting Test Cycle: {cycle}/{CYCLES}")
        protocol.delay(5)
        # Unload Labware
        if not protocol.is_simulating():
            lid_state = plate_reader.is_lid_on()
            f_stacker_1.unload_labware(labware_height)
            record_data(cycle, 1, "Unloaded", lid_state)
            f_stacker_2.unload_labware(labware_height)
            record_data(cycle, 2, "Unloaded", lid_state)

        # Move/Read Plate 1
        protocol.move_labware(stacker_plate_1, plate_reader,
                                use_gripper=True,
                                pick_up_offset={"x": -3, "y": 0, "z": STACKER_HEIGHT})
        plate_reader.close_lid()
        protocol.delay(2)
        lid_state = plate_reader.is_lid_on()
        record_data(cycle, 1, "Unloaded", lid_state)
        plate_reader.open_lid()
        protocol.move_labware(stacker_plate_1, stacker_platform_1,
                                use_gripper=True,
                                drop_offset={"x": -3, "y": 0, "z": STACKER_HEIGHT})

        # Move/Read Plate 2
        protocol.move_labware(stacker_plate_2, plate_reader,
                                use_gripper=True,
                                pick_up_offset={"x": -3, "y": 0, "z": STACKER_HEIGHT})
        plate_reader.close_lid()
        protocol.delay(2)
        lid_state = plate_reader.is_lid_on()
        record_data(cycle, 2, "Unloaded", lid_state)
        plate_reader.open_lid()
        protocol.move_labware(stacker_plate_2, stacker_platform_2,
                                use_gripper=True,
                                drop_offset={"x": -3, "y": 0, "z": STACKER_HEIGHT})
        # Load Labware
        if not protocol.is_simulating():
            lid_state = plate_reader.is_lid_on()
            f_stacker_1.load_labware(labware_height)
            record_data(cycle, 1, "Loaded", lid_state)
            f_stacker_2.load_labware(labware_height)
            record_data(cycle, 2, "Loaded", lid_state)
