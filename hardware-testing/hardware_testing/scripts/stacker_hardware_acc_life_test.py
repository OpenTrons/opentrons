"""Flex Stacker Axis Accelerated Lifetime Test."""
import argparse
import asyncio
import csv
import os
import sys
import subprocess
import re
import time
import threading
from datetime import datetime

from hardware_testing import data
from opentrons.hardware_control.ot3api import OT3API
from hardware_testing.opentrons_api.types import OT3Mount, Axis
from hardware_testing.opentrons_api.helpers_ot3 import build_async_ot3_hardware_api
from hardware_testing.drivers.stacker import flex_stacker_driver

def build_arg_parser():
    arg_parser = argparse.ArgumentParser(description='Flex Stacker Axis Accelerated Lifetime Test')
    arg_parser.add_argument('-c', '--cycles', type=int, required=False, help='Sets the number of testing cycles', default=100)
    arg_parser.add_argument('-n', '--num_stacker', type=int, required=False, help='Sets the number of Flex Stackers', default=1)
    arg_parser.add_argument('-m', '--mode', choices=['sequential','parallel'], required=False, help='Sets the test mode for either sequential or parallel', default='sequential')
    arg_parser.add_argument('-s', '--simulate', action="store_true", required=False, help='Simulate this test script')
    return arg_parser

class Stacker_Axis_Acc_Lifetime_Test:
    def __init__(
        self, simulate: bool, cycles: int, num_stacker: int, mode: str
    ) -> None:
        self.simulate = simulate
        self.cycles = cycles
        self.num_stacker = num_stacker
        self.mode = mode
        self.api = None
        self.mount = None
        self.home = None
        self.stackers = []
        self.test_files = []
        self.serial_port_name = "/dev/"
        self.port_list = None
        self.labware_height = flex_stacker_driver.LABWARE_Z_HEIGHT.OPENTRONS_TIPRACKS
        self.axes = [Axis.X, Axis.Y, Axis.Z_L, Axis.Z_R]
        self.test_data = {
            "Cycle":"None",
            "Gripper":"None",
            "Stacker":"None",
            "State":"None",
            "XE":"None",
            "XR":"None",
            "ZE":"None",
            "ZR":"None",
            "LR":"None",
        }
        self.stackerAll_active = False
        self.stackerA_active = False
        self.stackerB_active = False
        self.stackerC_active = False
        self.stackerD_active = False

    async def test_setup(self):
        self.api = await build_async_ot3_hardware_api(is_simulating=self.simulate, use_defaults=True)
        self.mount = OT3Mount.GRIPPER
        await self.stacker_setup()
        await self.gripper_setup()
        self.file_setup()
        print(f"\n-> Starting Stacker Test!\n")
        self.start_time = time.time()

    async def stacker_setup(self):
        res = subprocess.check_output(["ls", "-la", "/dev"])
        self.port_list = re.findall(r'ot_module_flexstacker[0-9]', res.decode())
        for port in self.port_list:
            stacker = flex_stacker_driver.FlexStacker(None).create(f"{self.serial_port_name}{port}")
            stacker.set_led(power=1, color=flex_stacker_driver.LEDColor.GREEN, pattern=flex_stacker_driver.LEDPattern.STATIC)
            stacker.setup_stall_detection()
            self.stackers.append(stacker)

    async def gripper_setup(self):
        await self.api.cache_instruments()
        if self.simulate:
            self.gripper_id = "SIMULATION"
        else:
            self.gripper_id = self.api._gripper_handler.get_gripper().gripper_id
        self.test_data["Gripper"] = str(self.gripper_id)

    def file_setup(self):
        class_name = self.__class__.__name__
        self.test_name = class_name.lower()
        self.test_header = self.dict_keys_to_line(self.test_data)
        self.test_id = data.create_run_id()
        self.test_date = "run-" + datetime.utcnow().strftime("%y-%m-%d")
        self.test_path = data.create_folder_for_test_data(self.test_name)
        print("FILE PATH = ", self.test_path)
        for stacker in self.stackers:
            serial_number = stacker.get_device_serial_number()
            self.test_tag = f"cycles{self.cycles}_{self.mode}_{serial_number}"
            test_file = data.create_file_name(self.test_name, self.test_id, self.test_tag)
            self.test_files.append(test_file)
            data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=test_file, data=self.test_header)
            print("FILE NAME = ", test_file)

    def dict_keys_to_line(self, dict):
        return str.join(",", list(dict.keys()))+"\n"

    def dict_values_to_line(self, dict):
        return str.join(",", list(dict.values()))+"\n"

    def run_threading(self):
        # # Define threads
        stackerA_thread = threading.Thread(target = self.move_stackerA, args = (self.stackers[0], self.test_files[0],))
        stackerB_thread = threading.Thread(target = self.move_stackerB, args = (self.stackers[1], self.test_files[1],))
        if self.num_stacker >= 3:
            stackerC_thread = threading.Thread(target = self.move_stackerC, args = (self.stackers[2], self.test_files[2],))
        if self.num_stacker == 4:
            stackerD_thread = threading.Thread(target = self.move_stackerD, args = (self.stackers[3], self.test_files[3],))
        # # Start threads
        stackerA_thread.start()
        stackerB_thread.start()
        if self.num_stacker >= 3:
            stackerC_thread.start()
        if self.num_stacker == 4:
            stackerD_thread.start()
        # # Join threads
        stackerA_thread.join()
        stackerB_thread.join()
        if self.num_stacker >= 3:
            stackerC_thread.join()
        if self.num_stacker == 4:
            stackerD_thread.join()

    def move_stackerA(self, stacker, test_file):
        cycle = 1
        self.stackerA_active = True
        try:
            while self.stackerA_active and cycle <= self.cycles:
                print(f"\n-> StackerA Test Cycle {cycle}/{self.cycles}")
                serial_number = stacker.get_device_serial_number()
                test_dataA = self.test_data.copy()
                test_dataA["Cycle"] = str(cycle)
                test_dataA["Stacker"] = serial_number

                stacker.unload_labware(self.labware_height)
                sensor_states = stacker.get_sensor_states()
                stacker_state = "Unloaded"
                test_dataA["State"] = stacker_state
                test_dataA.update(sensor_states)
                test_data = self.dict_values_to_line(test_dataA)
                data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=test_file, data=test_data)

                stacker.load_labware(self.labware_height)
                sensor_states = stacker.get_sensor_states()
                stacker_state = "Loaded"
                test_dataA["State"] = stacker_state
                test_dataA.update(sensor_states)
                test_data = self.dict_values_to_line(test_dataA)
                data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=test_file, data=test_data)
                cycle += 1
        except flex_stacker_driver.MotorStallError:
            print(f"\nStacker {serial_number}: Stall Error Detected!")
            self.exit_stacker()
        except flex_stacker_driver.CommandTimeoutError:
            print(f"\nStacker {serial_number}: Timeout Expired!")
            self.exit_stacker()
        except KeyboardInterrupt:
            self.exit_stacker()

    def move_stackerB(self, stacker, test_file):
        cycle = 1
        self.stackerB_active = True
        try:
            while self.stackerB_active and cycle <= self.cycles:
                print(f"\n-> StackerB Test Cycle {cycle}/{self.cycles}")
                serial_number = stacker.get_device_serial_number()
                test_dataB = self.test_data.copy()
                test_dataB["Cycle"] = str(cycle)
                test_dataB["Stacker"] = serial_number

                stacker.unload_labware(self.labware_height)
                sensor_states = stacker.get_sensor_states()
                stacker_state = "Unloaded"
                test_dataB["State"] = stacker_state
                test_dataB.update(sensor_states)
                test_data = self.dict_values_to_line(test_dataB)
                data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=test_file, data=test_data)

                stacker.load_labware(self.labware_height)
                sensor_states = stacker.get_sensor_states()
                stacker_state = "Loaded"
                test_dataB["State"] = stacker_state
                test_dataB.update(sensor_states)
                test_data = self.dict_values_to_line(test_dataB)
                data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=test_file, data=test_data)
                cycle += 1
        except flex_stacker_driver.MotorStallError:
            print(f"\nStacker {serial_number}: Stall Error Detected!")
            self.exit_stacker()
        except flex_stacker_driver.CommandTimeoutError:
            print(f"\nStacker {serial_number}: Timeout Expired!")
            self.exit_stacker()
        except KeyboardInterrupt:
            self.exit_stacker()

    def move_stackerC(self, stacker, test_file):
        cycle = 1
        self.stackerC_active = True
        try:
            while self.stackerC_active and cycle <= self.cycles:
                print(f"\n-> StackerC Test Cycle {cycle}/{self.cycles}")
                serial_number = stacker.get_device_serial_number()
                test_dataC = self.test_data.copy()
                test_dataC["Cycle"] = str(cycle)
                test_dataC["Stacker"] = serial_number

                stacker.unload_labware(self.labware_height)
                sensor_states = stacker.get_sensor_states()
                stacker_state = "Unloaded"
                test_dataC["State"] = stacker_state
                test_dataC.update(sensor_states)
                test_data = self.dict_values_to_line(test_dataC)
                data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=test_file, data=test_data)

                stacker.load_labware(self.labware_height)
                sensor_states = stacker.get_sensor_states()
                stacker_state = "Loaded"
                test_dataC["State"] = stacker_state
                test_dataC.update(sensor_states)
                test_data = self.dict_values_to_line(test_dataC)
                data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=test_file, data=test_data)
                cycle += 1
        except flex_stacker_driver.MotorStallError:
            print(f"\nStacker {serial_number}: Stall Error Detected!")
            self.exit_stacker()
        except flex_stacker_driver.CommandTimeoutError:
            print(f"\nStacker {serial_number}: Timeout Expired!")
            self.exit_stacker()
        except KeyboardInterrupt:
            self.exit_stacker()

    def move_stackerD(self, stacker, test_file):
        cycle = 1
        self.stackerD_active = True
        try:
            while self.stackerD_active and cycle <= self.cycles:
                print(f"\n-> StackerD Test Cycle {cycle}/{self.cycles}")
                serial_number = stacker.get_device_serial_number()
                test_dataD = self.test_data.copy()
                test_dataD["Cycle"] = str(cycle)
                test_dataD["Stacker"] = serial_number

                stacker.unload_labware(self.labware_height)
                sensor_states = stacker.get_sensor_states()
                stacker_state = "Unloaded"
                test_dataD["State"] = stacker_state
                test_dataD.update(sensor_states)
                test_data = self.dict_values_to_line(test_dataD)
                data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=test_file, data=test_data)

                stacker.load_labware(self.labware_height)
                sensor_states = stacker.get_sensor_states()
                stacker_state = "Loaded"
                test_dataD["State"] = stacker_state
                test_dataD.update(sensor_states)
                test_data = self.dict_values_to_line(test_dataD)
                data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=test_file, data=test_data)
                cycle += 1
        except flex_stacker_driver.MotorStallError:
            print(f"\nStacker {serial_number}: Stall Error Detected!")
            self.exit_stacker()
        except flex_stacker_driver.CommandTimeoutError:
            print(f"\nStacker {serial_number}: Timeout Expired!")
            self.exit_stacker()
        except KeyboardInterrupt:
            self.exit_stacker()

    async def _stacker_mode(self):
        # Sequential Mode
        if self.mode == "sequential":
            self.stackerAll_active = True
            while self.stackerAll_active:
                for i in range(self.cycles):
                    cycle = i + 1
                    print(f"\n-> Starting Test Cycle {cycle}/{self.cycles}")
                    try:
                        for stacker in self.stackers:
                            print(f"-> Unloading Labware...")
                            stacker.unload_labware(self.labware_height)
                            serial_number = stacker.get_device_serial_number()
                            sensor_states = stacker.get_sensor_states()
                            stacker_state = "Unloaded"
                            self.test_data["Cycle"] = str(cycle)
                            self.test_data["Stacker"] = serial_number
                            self.test_data["State"] = stacker_state
                            self.test_data.update(sensor_states)
                            test_data = self.dict_values_to_line(self.test_data)
                            for file in self.test_files:
                                if serial_number in file:
                                    data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=file, data=test_data)

                        for stacker in self.stackers:
                            print(f"-> Loading Labware...")
                            stacker.load_labware(self.labware_height)
                            serial_number = stacker.get_device_serial_number()
                            sensor_states = stacker.get_sensor_states()
                            stacker_state = "Loaded"
                            self.test_data["Cycle"] = str(cycle)
                            self.test_data["Stacker"] = serial_number
                            self.test_data["State"] = stacker_state
                            self.test_data.update(sensor_states)
                            test_data = self.dict_values_to_line(self.test_data)
                            for file in self.test_files:
                                if serial_number in file:
                                    data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=file, data=test_data)

                    except flex_stacker_driver.MotorStallError:
                        print("\nStall Error Detected!")
                        self.exit_stacker()
                    except KeyboardInterrupt:
                        self.exit_stacker()
        # Parallel Mode
        else:
            self.run_threading()

    async def _home(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home()
        self.home = await api.gantry_position(mount)

    async def exit(self):
        if self.api:
            await self.api.disengage_axes(self.axes)

    def exit_stacker(self):
        self.stackerAll_active = False
        self.stackerA_active = False
        self.stackerB_active = False
        self.stackerC_active = False
        self.stackerD_active = False

    async def run(self) -> None:
        try:
            await self.test_setup()
            if self.api and self.mount:
                await self._home(self.api, self.mount)
                await self._stacker_mode()
        except Exception as e:
            await self.exit()
            raise e
        except KeyboardInterrupt:
            await self.exit()
            print("\nTest Cancelled!")
        finally:
            await self.exit()
            print("\nTest Completed!")

if __name__ == '__main__':
    print("\nFlex Stacker Axis Accelerated Lifetime Test\n")
    arg_parser = build_arg_parser()
    args = arg_parser.parse_args()
    test = Stacker_Axis_Acc_Lifetime_Test(args.simulate, args.cycles, args.num_stacker, args.mode)
    asyncio.run(test.run())
