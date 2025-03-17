"""Flex Stacker TOF Sensor Driver Test."""
import argparse
import asyncio
import csv
import os
import sys
import time
import threading
from datetime import datetime

from hardware_testing import data
from opentrons.hardware_control.ot3api import OT3API
from hardware_testing.opentrons_api.types import OT3Mount, Axis
from hardware_testing.opentrons_api.helpers_ot3 import build_async_ot3_hardware_api
from opentrons.drivers.flex_stacker.types import StackerAxis, Direction, LEDColor, LEDPattern, TOFSensor, MeasurementKind

def build_arg_parser():
    arg_parser = argparse.ArgumentParser(description='Flex Stacker TOF Driver Test')
    arg_parser.add_argument('-a', '--axis', choices=['X','Z'], required=False, help='Sets the TOF sensor axis', default='X')
    arg_parser.add_argument('-z', '--zones', nargs="*", type=int, required=False, help='Sets the zone numbers for histogram data (0-9)', default=[1,2,3])
    arg_parser.add_argument('-n', '--labware_amount', type=int, required=False, help='Sets the labware amount', default=1)
    arg_parser.add_argument('-l', '--log', type=float, required=False, help='Sets the log duration (min)', default=0.1)
    arg_parser.add_argument('-s', '--simulate', action="store_true", required=False, help='Simulate this test script')
    return arg_parser

class Stacker_TOF_Driver_Test:
    def __init__(
        self, simulate: bool, axis, zones, labware_amount
    ) -> None:
        self.simulate = simulate
        self.tof_axis = axis
        self.tof_zones = zones
        self.labware_amount = labware_amount
        self.api = None
        self.mount = None
        self.home = None
        self.data_path = "/data/testing_data/"
        self.test_folder = "stacker_tof_baseline"
        self.test_path = self.data_path + self.test_folder
        self.axes = [Axis.X, Axis.Y, Axis.Z_L, Axis.Z_R]

    async def test_setup(self):
        self.api = await build_async_ot3_hardware_api(is_simulating=self.simulate, use_defaults=True)
        self.mount = OT3Mount.LEFT
        await self.stacker_setup()
        print(f"\n-> Starting Stacker TOF Sensor Test!\n")
        self.start_time = time.time()

    async def stacker_setup(self):
        self.api.attached_modules[0].device_info

    async def read_stacker_tof(self, axis):
        await self.api.attached_modules[0].home_axis(StackerAxis.X, Direction.EXTEND)
        hist = await self.api.attached_modules[0]._driver.get_tof_histogram(axis)
        print(f"+++ TOF Sensor {axis} Measurement +++\n")
        for k,v in hist.bins.items():
            print(f"-> Zone {k} = {v}\n")

    def log_histogram(self, duration, labware = False, labware_num = 0):
        self.create_folder(self.log_folder)
        if labware:
            self.create_file(True, labware_num)
        else:
            self.create_file()
        filename = f"{self.log_folder}/{self.log_file}"
        self.start_time = time.time()
        with open(filename, 'w+') as f:
            writer = csv.writer(f)
            elapsed_time = (time.time() - self.start_time)/60
            while elapsed_time < duration:
                elapsed_time = (time.time() - self.start_time)/60
                hist_list = self.get_histogram_zone(args.zones)
                for hist in hist_list:
                    zone = self.get_zone(hist)
                    bins = self.histogram_to_list(hist)
                    data = [elapsed_time] + [zone] + bins
                    writer.writerow(data)
                    f.flush()
                time.sleep(1.0)
            f.close()
        return filename

    def create_folder(self, folder):
        if not os.path.exists(folder):
            os.makedirs(folder)

    def create_file(self, labware = False, labware_num = 0):
        current_datetime = self.datetime.strftime("%m-%d-%y_%H-%M")
        if labware:
            filename = f"TOF_ZONE{args.zones}_LAB{labware_num}_{current_datetime}.csv".replace(" ","")
        else:
            filename = f"TOF_ZONE{args.zones}_{current_datetime}.csv".replace(" ","")
        self.log_file = filename
        print(f"File Name: {self.log_file}")

    async def _home(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home()
        self.home = await api.gantry_position(mount)

    async def exit(self):
        if self.api:
            await self.api.disengage_axes(self.axes)

    async def run(self) -> None:
        try:
            await self.test_setup()
            if self.api and self.mount:
                await self._home(self.api, self.mount)
            await self.read_stacker_tof(TOFSensor.X)
            await self.read_stacker_tof(TOFSensor.Z)
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
    print("\nFlex Stacker TOF Sensor Driver Test\n")
    arg_parser = build_arg_parser()
    args = arg_parser.parse_args()
    test = Stacker_TOF_Driver_Test(args.simulate, args.axis, args.zones, args.labware_amount)
    asyncio.run(test.run())
