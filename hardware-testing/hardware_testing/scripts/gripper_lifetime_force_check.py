"""Gripper Lifetime Force Check."""
import asyncio
import argparse
import string
import time

import logging
from logging.config import dictConfig

from opentrons_shared_data.deck import load
from opentrons.hardware_control.ot3api import OT3API
from opentrons_hardware.hardware_control.gripper_settings import (
    set_error_tolerance,
)
from hardware_testing import data
from hardware_testing.opentrons_api.types import OT3Mount, Point
from hardware_testing.opentrons_api.types import Axis as OT3Axis
from hardware_testing.opentrons_api.helpers_ot3 import (
    build_async_ot3_hardware_api,
)
from opentrons.hardware_control.motion_utilities import (
    target_position_from_relative,
)
from hardware_testing.drivers import (
    mark10,
)
from hardware_testing.opentrons_api import helpers_ot3

def build_arg_parser():
    arg_parser = argparse.ArgumentParser(description='OT-3 Gripper Lifetime Test')
    arg_parser.add_argument('-c', '--cycles', type=int, required=False, help='Number of testing cycles', default=10)
    arg_parser.add_argument('-f', '--force', type=int, required=False, help='Set the gripper force in Newtons', default=20)
    arg_parser.add_argument('-t', '--time', type=int, required=False, help='Set the gripper hold time in seconds', default=10)
    arg_parser.add_argument('-s', '--simulate', action="store_true", required=False, help='Simulate this test script')
    return arg_parser

class Gripper_Force_Check:
    def __init__(
        self, simulate: bool, cycles: int, force: float, time: float
    ) -> None:
        self.simulate = simulate
        self.cycles = cycles
        self.grip_force = force
        self.hold_time = time
        self.api = None
        self.mount = None
        self.home = None
        self.gripper_id = None
        self.cycle = None
        self.current_state = None
        self.GRIP_HEIGHT = Point(0, 0, -85) # mm
        self.axes = [OT3Axis.G, OT3Axis.Z_G]
        self.test_data = {
            "Time":"None",
            "Cycle":"None",
            "Gripper":"None",
            "Input Force":"None",
            "Output Force":"None",
        }
        self.force_gauge = None
        self.force_gauge_port = "/dev/ttyUSB0"
        self.class_name = self.__class__.__name__
        self.run_id = None

    async def test_setup(self):
        self.file_setup()
        self.gauge_setup()
        self.api = await build_async_ot3_hardware_api(is_simulating=self.simulate, use_defaults=True)
        await set_error_tolerance(self.api._backend._messenger, 15, 15)
        self.mount = OT3Mount.GRIPPER
        if self.simulate:
            self.gripper_id = "SIMULATION"
        else:
            self.gripper_id = self.api._gripper_handler.get_gripper().gripper_id
        self.test_data["Gripper"] = str(self.gripper_id)
        self.test_data["Input Force"] = str(self.grip_force)
        self.deck_definition = load("ot3_standard", version=3)
        await self.api.home()
        print(f"\nStarting Gripper Lifetime Force Check!\n")
        self.start_time = time.time()

    def file_setup(self):
        class_name = self.__class__.__name__
        self.test_name = class_name.lower()
        self.test_tag = f"force_{self.grip_force}"
        self.test_header = self.dict_keys_to_line(self.test_data)
        self.run_id = data.create_run_id()
        self.test_path = data.create_folder_for_test_data(self.test_name)
        self.test_file = data.create_file_name(self.test_name, self.run_id, self.test_tag)
        data.append_data_to_file(self.test_name, self.run_id, self.test_file, self.test_header)
        print("FILE PATH = ", self.test_path)
        print("FILE NAME = ", self.test_file)

    def gauge_setup(self):
        self.force_gauge = mark10.Mark10.create(port=self.force_gauge_port)
        self.force_gauge.connect()

    def dict_keys_to_line(self, dict):
        return str.join(",", list(dict.keys()))+"\n"

    def dict_values_to_line(self, dict):
        return str.join(",", list(dict.values()))+"\n"

    def _get_stable_force(self) -> float:
        _reading = True
        _try = 1
        while _reading:
            forces = []
            for i in range(5):
                if self.simulate:
                    data = 0.0
                else:
                    data = self.force_gauge.read_force()
                forces.append(data)
            _variance = round(abs(max(forces) - min(forces)), 5)
            print(f"Try #{_try} Variance = {_variance}")
            _try += 1
            if _variance < 0.1:
                _reading = False
        force = sum(forces) / len(forces)
        return force

    def _record_data(self):
        elapsed_time = (time.time() - self.start_time)/60
        self.test_data["Time"] = str(round(elapsed_time, 3))
        self.test_data["Cycle"] = str(self.cycle)
        test_data = self.dict_values_to_line(self.test_data)
        data.append_data_to_file(self.test_name, self.run_id, self.test_file, test_data)

    async def _read_gripper(
        self, api: OT3API
    ) -> None:
        await api.grip(self.grip_force)
        time.sleep(self.hold_time)
        force = self._get_stable_force()
        self.test_data["Output Force"] = str(force)
        await api.ungrip()
        print(f"Cycle #{self.cycle}: Force = {force} N")

    async def _move_gripper(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        target_position = target_position_from_relative(mount, self.GRIP_HEIGHT, api._current_position)
        await api._move(target_position)
        time.sleep(1.0)

    async def _home_gripper(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home(self.axes)

    async def exit(self):
        print("\nExiting...")
        if self.api and self.mount:
            await self._home_gripper(self.api, self.mount)

    async def run(self) -> None:
        try:
            await self.test_setup()
            if self.api and self.mount:
                await self._home_gripper(self.api, self.mount)
                # move to slot5 where gauge location
                grip_pos = helpers_ot3.get_slot_calibration_square_position_ot3(5)
                grip_pos = grip_pos + Point(x=2, y=-42, z=75+50) # apply offset
                await helpers_ot3.move_to_arched_ot3(self.api, self.mount, grip_pos)
                await helpers_ot3.jog_mount_ot3(self.api, OT3Mount.GRIPPER)

                # await self._move_gripper(self.api, self.mount)
                for i in range(self.cycles):
                    self.cycle = i + 1
                    print(f"\n-> Starting Test Cycle {self.cycle}/{self.cycles}")
                    await self._read_gripper(self.api)
                    self._record_data()
                    time.sleep(1.0)
        except Exception as e:
            await self.exit()
            raise e
        except KeyboardInterrupt:
            await self.exit()
            print("Test Cancelled!")
        finally:
            await self.exit()
            print("Test Completed!")

if __name__ == '__main__':
    print("\nOT-3 Gripper Lifetime Force Check\n")
    arg_parser = build_arg_parser()
    args = arg_parser.parse_args()
    test = Gripper_Force_Check(args.simulate, args.cycles, args.force, args.time)
    asyncio.run(test.run())
