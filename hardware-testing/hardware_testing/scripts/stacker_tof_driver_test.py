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
    arg_parser.add_argument('-s', '--simulate', action="store_true", required=False, help='Simulate this test script')
    return arg_parser

class Stacker_TOF_Driver_Test:
    def __init__(
        self, simulate: bool
    ) -> None:
        self.simulate = simulate
        self.api = None
        self.mount = None
        self.home = None
        self.stackers = []
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
    test = Stacker_TOF_Driver_Test(args.simulate)
    asyncio.run(test.run())
