from opentrons.protocol_api import ProtocolContext
from hardware_testing.drivers.stacker import flex_stacker_driver
from hardware_testing.drivers.stacker.flex_stacker_driver import LABWARE_Z_HEIGHT, AXIS, DIR
from hardware_testing import data
from opentrons.hardware_control.types import OT3Mount, Axis
from opentrons import types as top_types
import csv
import threading
import serial.tools.list_ports
import time
from datetime import datetime

metadata = {"protocolName": "Flex Stacker Lifetime Test"}
requirements = {"robotType": "Flex", "apiLevel": "2.17"}

labware_library = {
    1:"opentrons_flex_96_tiprack_1000ul",
    2:"armadillo_96_wellplate_200ul_pcr_full_skirt",
    3:"biorad_384_wellplate_50ul", # armadillo_384
    4:"biorad_96_wellplate_200ul_pcr",
    5:"nest_12_reservoir_15ml",
    6:"nest_96_wellplate_2ml_deep",
    7:"nest_96_wellplate_100ul_pcr_full_skirt",
    8:"nest_96_wellplate_200ul_flat",
    9:"corning_12_wellplate_6.9ml_flat",
    10:"corning_24_wellplate_3.4ml_flat",
    11:"corning_96_wellplate_360ul_flat",
}


labware_height = LABWARE_Z_HEIGHT.OPENTRONS_TIPRACKS
labware = labware_library[1]
deck_slots = ["C1", "C2", "C3","D1", "D2", "D3"]
load_order = ["D3", "D2", "D1", "C3", "C2", "C1"]
# deck_slots = ["D1"]
cycles = 3987 #4104 #4610 #5062 #5071#5368 # quarter life = 5612^M
STACKER_HEIGHT = 12

test_data = {"Time(s)": None,
            "Cycle": None,
            "Stacker SN": None,
            "Last Position(G)": None,
            "State": None,
            "labware": None,
            "plate_num": None,
            "Error": None,
            }

# For data retrieval
motion_parameters = []

class TimerError(Exception):
    """A custom exception used to report errors in use of Timer class"""
class Timer:
    def __init__(self):
        self._start_time = None
        self._elasped_time = None

    def start(self):
        """Start a new timer"""
        self._start_time = time.perf_counter()

    def elasped_time(self):
        """report the elapsed time"""
        self._elasped_time = time.perf_counter() - self._start_time
        return self._elasped_time

    def stop_time(self):
        if self._start_time is None:
            raise TimerError(f"Timer is not running. Use .start() to start it")
        stop_time = time.perf_counter()

def unload_labware(stacker, test_data, log_file, f):
    try:
        stacker.unload_labware(labware_height)
    except Exception as e:
        test_data['Error'] = str(e)
        log_file.writerow(test_data)
        f.flush()
        raise(e)

def load_labware(stacker, test_data, log_file, f ):
    try:
        stacker.load_labware(labware_height)
    except Exception as e:
        test_data['Error'] = str(e)
        log_file.writerow(test_data)
        f.flush()
        raise(e)

def move_gripper(hardware):
    hardware.move_to(OT3Mount.GRIPPER, top_types.Point(553.0096874999999,
                                            43.50825000000002,
                                            163.89025))

def unload_labware_thread(protocol, stackers, test_data, log_file, f):
    try:
        stacker_1_thread = threading.Thread(target = unload_labware, args = (stackers[0],test_data, log_file, f, ))
        stacker_2_thread = threading.Thread(target = unload_labware, args = (stackers[1],test_data, log_file, f,))
        stacker_1_thread.start()
        stacker_2_thread.start()
        stacker_1_thread.join()
        stacker_2_thread.join()
    except Exception as e:
        test_data['Error'] = str(e)
        log_file.writerow(test_data)
        f.flush()
        raise(e)
        exc_info = sys.exc_info()

def load_labware_thread(protocol, stackers, test_data, log_file, f):
    try:
        stacker_1_thread = threading.Thread(target = load_labware, args = (stackers[0], test_data, log_file, f, ))
        stacker_2_thread = threading.Thread(target = load_labware, args = (stackers[1], test_data, log_file, f, ))
        stacker_1_thread.start()
        stacker_2_thread.start()
        stacker_1_thread.join()
        stacker_2_thread.join()
    except Exception as e:
        test_data['Error'] = str(e)
        log_file.writerow(test_data)
        f.flush()
        raise(e)
        raise("Something wrong happened")
#Things to do, ADD test details to csv

def stacker_manager(protocol, hardware, stacker):
    for j, slot in enumerate(deck_slots):
        print(f"\nCycle: {i+1}, Unload: #{j+1}\n")
        plate = protocol.load_labware(labware, stacker_platform)
        unload_stacker_thread(protocol, hardware, f_stacker)
        #f_stacker.unload_labware(labware_height)
        protocol.move_labware(plate, slot,
                        use_gripper=True,
                        pick_up_offset={"x": -3.0, "y": 0, "z": STACKER_HEIGHT},
                        drop_offset = {"x": 0, "y": 0, "z": 0})
        del protocol.deck[slot]

def scan_for_stackers():
    port_list = []
    ports = serial.tools.list_ports.comports()
    for port, desc, hwid in sorted(ports):
        port_list.append(port)
        print("{}: {} [{}]".format(port, desc, hwid))
    port_list.pop(0)
    print(f"ports: {port_list}")
    return port_list

def run(protocol: ProtocolContext) -> None:
    hardware = protocol._hw_manager.hardware
    hardware.cache_instruments()
    
    _timer = Timer()
    gripper_instr = OT3Mount.GRIPPER
    stacker_platform_1 = "A4"
    stacker_platform_2 = "B4"
    stacker_platform_3 = "C4"
    stacker_platform_4 = "D4"
    stacker_slot = "D3"
    _timer.start()
    #Scan for ports automatically and assign them a variable
    # Based on how many ports are found, create that amount of variables
    f_name = f'/data/stacker_lifetime_data/unload_and_load_stacker_lifetime_test_{datetime.now().strftime("%m_%d_%y_%H_%M")}.csv'
    with open(f_name, 'w', newline='') as f:
        test_details = csv.writer(f, delimiter = ',', quotechar = '"', quoting = csv.QUOTE_MINIMAL)
        test_details.writerow({'test Details'})
        test_details.writerow(['Flex Stacker'])
        log_file = csv.DictWriter(f, test_data)
        log_file.writeheader()
        ports = scan_for_stackers()
        try:
            stacker_num = 0
            stackers = []
            SNs = []
            for s in hardware.attached_modules:
                stacker_num += 1
                globals()[f'f_stacker_{stacker_num}'] = s
                globals()[f'f_stacker_{stacker_num}'].home(AXIS.X, DIR.POSITIVE_HOME)
                SNs.append(globals()[f'f_stacker_{stacker_num}'].get_device_serial_number())
                stackers.append(globals()[f'f_stacker_{stacker_num}'])
            print("Stackers enabled")
            print(f'Number of Cycles to be Completed :{cycles}')
            num_plates = 6
            for c in range(1, cycles+1):
                print(f'Cycles: {c}')
                for plates in range(1, num_plates+1):
                    plate_1 = protocol.load_labware(labware, stacker_platform_1)
                    plate_2 = protocol.load_labware(labware, stacker_platform_3)
                    unload_labware_thread(protocol, stackers[:2], test_data, log_file, f)
                    e_time = _timer.elasped_time()
                    test_data['Time(s)'] = e_time
                    test_data['Cycle'] = c
                    test_data["Stacker SN"] = SNs[:2]
                    test_data['Last Position(G)'] = "None"
                    test_data['State'] = 'unload'
                    test_data['labware'] = labware_height.name
                    test_data['plate_num'] = plates
                    test_data['Error'] = "None"
                    log_file.writerow(test_data)
                    f.flush()
                    protocol.move_labware(plate_1, stacker_platform_2,
                                                use_gripper=True,
                                                pick_up_offset={"x": -3.0, "y": 0, "z": STACKER_HEIGHT},
                                                drop_offset = {"x": -3.0, "y": 0, "z": STACKER_HEIGHT})
                    protocol.move_labware(plate_2, stacker_platform_4,
                                                use_gripper=True,
                                                pick_up_offset={"x": -3.0, "y": 0, "z": STACKER_HEIGHT},
                                                drop_offset = {"x": -3.0, "y": 0, "z": STACKER_HEIGHT})
                    load_labware_thread(protocol, stackers[2:], test_data, log_file, f)
                    del protocol.deck['A4']
                    del protocol.deck['B4']
                    del protocol.deck['C4']
                    del protocol.deck['D4']
                    e_time = _timer.elasped_time()
                    test_data['Time(s)'] = e_time
                    test_data['Cycle'] = c
                    test_data["Stacker SN"] = SNs[2:]
                    test_data['Last Position(G)'] = "None"
                    test_data['State'] = 'load'
                    test_data['labware'] = labware_height.name
                    test_data['plate_num'] = plates
                    test_data['Error'] = "None"
                    log_file.writerow(test_data)
                    f.flush()

                for plates in range(1, num_plates+1):
                    plate_1 = protocol.load_labware(labware, stacker_platform_2)
                    plate_2 = protocol.load_labware(labware, stacker_platform_4)
                    unload_labware_thread(protocol, stackers[2:], test_data, log_file, f)
                    e_time = _timer.elasped_time()
                    test_data['Time(s)'] = e_time
                    test_data['Cycle'] = c
                    test_data["Stacker SN"] = SNs[2:]
                    test_data['Last Position(G)'] = "None"
                    test_data['State'] = 'unload'
                    test_data['labware'] = labware_height.name
                    test_data['plate_num'] = plates
                    test_data['Error'] = "None"
                    log_file.writerow(test_data)
                    f.flush()
                    protocol.move_labware(plate_1, stacker_platform_1,
                                                use_gripper=True,
                                                pick_up_offset={"x": -3.0, "y": 0, "z": STACKER_HEIGHT},
                                                drop_offset = {"x": -3.0, "y": 0, "z": STACKER_HEIGHT})
                    protocol.move_labware(plate_2, stacker_platform_3,
                                                use_gripper=True,
                                                pick_up_offset={"x": -3.0, "y": 0, "z": STACKER_HEIGHT},
                                                drop_offset = {"x": -3.0, "y": 0, "z": STACKER_HEIGHT})
                    load_labware_thread(protocol, stackers[:2], test_data, log_file, f)
                    del protocol.deck['A4']
                    del protocol.deck['B4']
                    del protocol.deck['C4']
                    del protocol.deck['D4']
                    e_time = _timer.elasped_time()
                    test_data['Time(s)'] = e_time
                    test_data['Cycle'] = c
                    test_data["Stacker SN"] = SNs[:2]
                    test_data['Last Position(G)'] = "None"
                    test_data['State'] = 'load'
                    test_data['labware'] = labware_height.name
                    test_data['plate_num'] = plates
                    test_data['Error'] = "None"
                    log_file.writerow(test_data)
                    f.flush()
                hardware.home_z(gripper_instr)
            f.close()
        except Exception as e:
            test_data['Error'] = str(e)
            log_file.writerow(test_data)
            f.flush()
            print(e)
        finally:
            print("Test Completed")
