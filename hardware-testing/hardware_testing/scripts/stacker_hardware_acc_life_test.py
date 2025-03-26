"""Flex Stacker Axis Accelerated Lifetime Test."""
import argparse
import asyncio
import subprocess
import re
import time
import threading
from datetime import datetime
from hardware_testing import data
from opentrons.hardware_control.ot3api import OT3API
from hardware_testing.opentrons_api.types import OT3Mount, Axis
from hardware_testing.opentrons_api.helpers_ot3 import build_async_ot3_hardware_api
from opentrons.drivers.flex_stacker.driver import (
    FlexStackerDriver,
    STACKER_MOTION_CONFIG,
)
from opentrons.drivers.flex_stacker.types import (
    Direction,
    LEDColor,
    LEDPattern,
    MoveResult,
    StackerAxis,
    StallGuardParams,
)
from opentrons_shared_data.errors.exceptions import FlexStackerStallError
from typing import Optional
from opentrons.hardware_control.modules.types import (
    StackerAxisState,
)

# Stallguard defaults
STALLGUARD_CONFIG = {
    StackerAxis.X: StallGuardParams(StackerAxis.X, True, 2),
    StackerAxis.Z: StallGuardParams(StackerAxis.Z, True, 2),
}


async def _prepare_for_action(stacker: FlexStackerDriver) -> bool:
    """Helper to prepare axis for dispensing or storing labware."""
    # TODO: check if we need to home first
    await home_axis(stacker, StackerAxis.X, Direction.EXTEND)
    print("1_pfa")
    await home_axis(stacker, StackerAxis.Z, Direction.RETRACT)
    print("2_pfa")
    await close_latch(stacker)
    print("3_pfa")
    return True


async def reset_stall_detected(stacker: FlexStackerDriver) -> None:
    """Sets the statusbar to normal."""
    await stacker.set_led(power=0.5, color=LEDColor.GREEN, pattern=LEDPattern.STATIC)
    stacker._stall_detected = False


async def move_axis(
    stacker: FlexStackerDriver,
    axis: StackerAxis,
    direction: Direction,
    distance: float,
    speed: Optional[float] = None,
    acceleration: Optional[float] = None,
    current: Optional[float] = None,
) -> bool:
    """Move the axis in a direction by the given distance in mm."""
    default = STACKER_MOTION_CONFIG[axis]["move"]
    await stacker.set_run_current(
        axis, current if current is not None else default.run_current
    )
    await stacker.set_ihold_current(axis, default.hold_current)
    motion_params = default.move_params.update(
        max_speed=speed, acceleration=acceleration
    )
    distance = direction.distance(distance)
    res = await stacker.move_in_mm(axis, distance, params=motion_params)
    if res == MoveResult.STALL_ERROR:
        stacker._stall_detected = True
        raise FlexStackerStallError(stacker._device_info["serial"], axis)
    return res == MoveResult.NO_ERROR


async def home_axis(
    stacker: FlexStackerDriver,
    axis: StackerAxis,
    direction: Direction,
    speed: Optional[float] = None,
    acceleration: Optional[float] = None,
    current: Optional[float] = None,
) -> bool:
    default = STACKER_MOTION_CONFIG[axis]["home"]
    await stacker.set_run_current(
        axis, current if current is not None else default.run_current
    )
    print(f"{axis} of {stacker}")
    await stacker.set_ihold_current(axis, default.hold_current)
    print(f"ihold current {default.hold_current} {stacker}")
    motion_params = default.move_params.update(
        max_speed=speed, acceleration=acceleration
    )
    
    success = await stacker.move_to_limit_switch(
        axis=axis, direction=direction, params=motion_params
    )
    print("move limit switch")
    print(success)
    if success == MoveResult.STALL_ERROR:
        stacker._stall_detected = True
        raise FlexStackerStallError(stacker.device_info["serial"], axis)
    return success == MoveResult.NO_ERROR


async def get_limit_switch_status(stacker: FlexStackerDriver) -> None:
    """Get the limit switch status."""
    status = await stacker.get_limit_switches_status()
    stacker.limit_switch_status = {
        axis: StackerAxisState.from_status(status, axis) for axis in StackerAxis
    }


async def close_latch(
    stacker: FlexStackerDriver,
    velocity: Optional[float] = None,
    acceleration: Optional[float] = None,
) -> bool:
    """Close the latch, dropping any labware its holding."""
    # Dont move the latch if its already closed.
    await get_limit_switch_status(stacker)
    if stacker.limit_switch_status[StackerAxis.L] == StackerAxisState.EXTENDED:
        return True
    success = await home_axis(
        stacker,
        StackerAxis.L,
        Direction.RETRACT,
        speed=velocity,
        acceleration=acceleration,
    )
    # Check that the latch is closed.
    await get_limit_switch_status(stacker)
    return (
        success
        and stacker.limit_switch_status[StackerAxis.L] == StackerAxisState.EXTENDED
    )


async def open_latch(
    stacker: FlexStackerDriver,
    velocity: Optional[float] = None,
    acceleration: Optional[float] = None,
) -> bool:
    """Open the latch."""
    MAX_TRAVEL = {
        StackerAxis.X: 194.0,
        StackerAxis.Z: 139.5,
        StackerAxis.L: 22.0,
    }
    # Dont move the latch if its already opened.
    if stacker.limit_switch_status[StackerAxis.L] == StackerAxisState.RETRACTED:
        return True
    # The latch only has one limit switch, so we have to travel a fixed distance
    # to open the latch.
    success = await move_axis(
        stacker,
        StackerAxis.L,
        Direction.EXTEND,
        distance=MAX_TRAVEL[StackerAxis.L],
        speed=velocity,
        acceleration=acceleration,
    )
    # Check that the latch is opened.
    await get_limit_switch_status(stacker)
    axis_state = stacker.limit_switch_status[StackerAxis.L]
    return success and axis_state == StackerAxisState.RETRACTED


async def _move_and_home_axis(
    stacker: FlexStackerDriver,
    axis: StackerAxis,
    direction: Direction,
    offset: float = 0,
) -> bool:
    MAX_TRAVEL = {
        StackerAxis.X: 194.0,
        StackerAxis.Z: 139.5,
        StackerAxis.L: 22.0,
    }
    distance = MAX_TRAVEL[axis] - offset
    await move_axis(stacker, axis, direction, distance)
    return await stacker.home_axis(axis, direction)


async def dispense_labware(stacker: FlexStackerDriver, labware_height: float) -> bool:
    """Dispenses the next labware in the stacker."""
    print("inside dispense labware")
    await reset_stall_detected(stacker)
    OFFSET_SM = 5.0
    OFFSET_MD = 10.0
    await _prepare_for_action(stacker)
    print("1")
    # Move platform along the X then Z axis
    await _move_and_home_axis(stacker, StackerAxis.X, Direction.RETRACT, OFFSET_SM)
    await _move_and_home_axis(stacker, StackerAxis.Z, Direction.EXTEND, OFFSET_SM)
    print("2")
    # Transfer
    await open_latch(stacker)
    print("3")
    await move_axis(stacker, StackerAxis.Z, Direction.RETRACT, (labware_height / 2) + 2)
    print("4")
    await close_latch(stacker)
    print("5")
    # Move platform along the Z then X axis
    offset = labware_height / 2 + OFFSET_MD
    await _move_and_home_axis(stacker, StackerAxis.Z, Direction.RETRACT, offset)
    print("6")
    await _move_and_home_axis(stacker, StackerAxis.X, Direction.EXTEND, OFFSET_SM)
    return True


async def store_labware(stacker: FlexStackerDriver, labware_height: float) -> bool:
    """Stores a labware in the stacker."""
    await _prepare_for_action(stacker)
    OFFSET_SM = 5.0
    OFFSET_MD = 10.0
    OFFSET_LG = 20.0
    MEDIUM_LABWARE_Z_LIMIT = 20.0
    MAX_TRAVEL = {
        StackerAxis.X: 194.0,
        StackerAxis.Z: 139.5,
        StackerAxis.L: 22.0,
    }
    # Move X then Z axis
    offset = OFFSET_MD if labware_height < MEDIUM_LABWARE_Z_LIMIT else OFFSET_LG * 2
    distance = MAX_TRAVEL[StackerAxis.Z] - (labware_height / 2) - offset
    await _move_and_home_axis(stacker, StackerAxis.X, Direction.RETRACT, OFFSET_SM)
    await move_axis(stacker, StackerAxis.Z, Direction.EXTEND, distance)
    # Transfer
    await open_latch(stacker)
    z_speed = (
        STACKER_MOTION_CONFIG[StackerAxis.Z]["move"].move_params.max_speed or 0
    ) / 2
    await move_axis(
        stacker, StackerAxis.Z, Direction.EXTEND, (labware_height / 2), z_speed
    )
    await home_axis(stacker, StackerAxis.Z, Direction.EXTEND, z_speed)
    await close_latch(stacker)

    # Move Z then X axis
    await _move_and_home_axis(stacker, StackerAxis.Z, Direction.RETRACT, OFFSET_LG)
    await _move_and_home_axis(stacker, StackerAxis.X, Direction.EXTEND, OFFSET_SM)
    return True


def build_arg_parser():
    arg_parser = argparse.ArgumentParser(
        description="Flex Stacker Axis Accelerated Lifetime Test"
    )
    arg_parser.add_argument(
        "-c",
        "--cycles",
        type=int,
        required=False,
        help="Sets the number of testing cycles",
        default=10,
    )
    arg_parser.add_argument(
        "-n",
        "--num_stacker",
        type=int,
        required=False,
        help="Sets the number of Flex Stackers",
        default=1,
    )
    arg_parser.add_argument(
        "-m",
        "--mode",
        choices=["sequential", "parallel"],
        required=False,
        help="Sets the test mode for either sequential or parallel",
        default="sequential",
    )
    arg_parser.add_argument(
        "-s",
        "--simulate",
        action="store_true",
        required=False,
        help="Simulate this test script",
    )
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
        self.labware_height = 122
        self.axes = [Axis.X, Axis.Y, Axis.Z_L, Axis.Z_R]
        self.test_data = {
            "Cycle": "None",
            "Stacker": "None",
            "State": "None",
            "XE": "None",
            "XR": "None",
            "ZE": "None",
            "ZR": "None",
            "LR": "None",
        }
        self.stackerAll_active = False
        self.stackerA_active = False
        self.stackerB_active = False
        self.stackerC_active = False
        self.stackerD_active = False

    async def test_setup(self):
        self.api = await build_async_ot3_hardware_api(
            is_simulating=self.simulate, use_defaults=True
        )
        for module in self.api.attached_modules:
            # stop pollers
            await module._poller.stop()

        self.mount = OT3Mount.LEFT
        await self.stacker_setup()
        await self.file_setup()
        print(f"\n-> Starting Stacker Test!\n")
        self.start_time = time.time()

    async def stacker_setup(self):
        res = subprocess.check_output(["ls", "-la", "/dev"])
        self.port_list = re.findall(r"ot_module_flexstacker[0-9]", res.decode())
        for (port, stacker_amount) in zip(self.port_list, range(self.num_stacker)):
            stacker = await FlexStackerDriver.create(
                port=f"{self.serial_port_name}{port}", loop=asyncio.get_running_loop()
            )
            stacker._stall_detected = False
            stacker._device_info = (await stacker.get_device_info()).to_dict()
            # Enable stall guard
            for axis, config in STALLGUARD_CONFIG.items():
                await stacker.set_stallguard_threshold(
                    axis, config.enabled, config.threshold
                )
            await reset_stall_detected(stacker)
            self.stackers.append(stacker)

    async def file_setup(self):
        class_name = self.__class__.__name__
        self.test_name = class_name.lower()
        self.test_header = self.dict_keys_to_line(self.test_data)
        self.test_id = data.create_run_id()
        self.test_date = "run-" + datetime.utcnow().strftime("%y-%m-%d")
        self.test_path = data.create_folder_for_test_data(self.test_name)
        print("FILE PATH = ", self.test_path)
        for stacker in self.stackers:
            serial_number = stacker._device_info["serial"]
            fw = stacker._device_info["version"]
            print(f"{serial_number} and {fw}")
            self.test_tag = f"cycles{self.cycles}_{self.mode}_{serial_number}"
            test_file = data.create_file_name(
                self.test_name, self.test_id, self.test_tag
            )
            self.test_files.append(test_file)
            data.append_data_to_file(
                test_name=self.test_name,
                run_id=self.test_date,
                file_name=test_file,
                data=self.test_header,
            )
            print("FILE NAME = ", test_file)

    def dict_keys_to_line(self, dict):
        return str.join(",", list(dict.keys())) + "\n"

    def dict_values_to_line(self, dict):
        return ",".join(map(str, dict.values())) + "\n"
    
    async def move_stacker(self, stacker, test_file, label):
        cycle = 1
        setattr(self, f"stacker{label}_active", True)
        while getattr(self, f"stacker{label}_active") and cycle <= self.cycles:
            print(f"\n-> Stacker{label} Test Cycle {cycle}/{self.cycles}")
            await reset_stall_detected(stacker)
            serial_number = stacker._device_info["serial"]
            test_data = self.test_data.copy()
            test_data["Cycle"] = str(cycle)
            test_data["Stacker"] = serial_number
            print("Dispensing labware")
            await dispense_labware(stacker, self.labware_height)
            sensor_states = await stacker.get_limit_switches_status()
            stacker_state = "Unloaded"
            test_data["State"] = stacker_state
            
            sensor_states_dict = {
                "XE": sensor_states.XE,
                "XR": sensor_states.XR,
                "ZE": sensor_states.ZE,
                "ZR": sensor_states.ZR,
                "LR": sensor_states.LR,
            }
            test_data.update(sensor_states_dict)
            test_data_line = self.dict_values_to_line(test_data)
            data.append_data_to_file(
                test_name=self.test_name,
                run_id=self.test_date,
                file_name=test_file,
                data=test_data_line,
            )
            print("storing labware")
            await store_labware(stacker, self.labware_height)
            sensor_states = await stacker.get_limit_switches_status()
            stacker_state = "Loaded"
            test_data["State"] = stacker_state
            
            sensor_states_dict = {
                "XE": sensor_states.XE,
                "XR": sensor_states.XR,
                "ZE": sensor_states.ZE,
                "ZR": sensor_states.ZR,
                "LR": sensor_states.LR,
            }
            test_data.update(sensor_states_dict)
            test_data_line = self.dict_values_to_line(test_data)
            data.append_data_to_file(
                test_name=self.test_name,
                run_id=self.test_date,
                file_name=test_file,
                data=test_data_line,
            )
            cycle += 1
        

    async def run_async_tasks(self):
        tasks = [
            self.move_stacker(self.stackers[i], self.test_files[i], chr(65 + i))
            for i in range(self.num_stacker)
        ]
        print(tasks)
        await asyncio.gather(*tasks)  # Run all tasks concurrently
        
    def run_threading(self):
        asyncio.create_task(self.run_async_tasks())
    
    async def _stacker_mode(self):
        # Sequential Mode
        if self.mode == "sequential":
            cycle = 1
            self.stackerAll_active = True
            serial_number = None
            try:
                while self.stackerAll_active and cycle <= self.cycles:
                    print(f"\n-> Starting Test Cycle {cycle}/{self.cycles}")
                    for stacker in self.stackers:
                        await reset_stall_detected(stacker)
                        serial_number = stacker._device_info["serial"]
                        print(f"-> Unloading Labware...")
                        await dispense_labware(stacker, self.labware_height)
                        sensor_states = await stacker.get_limit_switches_status()
                        stacker_state = "Unloaded"
                        self.test_data["Cycle"] = str(cycle)
                        self.test_data["Stacker"] = serial_number
                        self.test_data["State"] = stacker_state
                        sensor_states_dict = {
                            "XE": sensor_states.XE,
                            "XR": sensor_states.XR,
                            "ZE": sensor_states.ZE,
                            "ZR": sensor_states.ZR,
                            "LR": sensor_states.LR,
                        }
                        self.test_data.update(sensor_states_dict)
                        test_data = self.dict_values_to_line(self.test_data)
                        for file in self.test_files:
                            if serial_number in file:
                                data.append_data_to_file(
                                    test_name=self.test_name,
                                    run_id=self.test_date,
                                    file_name=file,
                                    data=test_data,
                                )

                    for stacker in self.stackers:
                        print(f"-> Loading Labware...")
                        serial_number = stacker._device_info["serial"]
                        await store_labware(stacker, self.labware_height)
                        # Turns red in store_labware function
                        sensor_states = await stacker.get_limit_switches_status()
                        stacker_state = "Loaded"
                        self.test_data["Cycle"] = str(cycle)
                        self.test_data["Stacker"] = serial_number
                        self.test_data["State"] = stacker_state
                        sensor_states_dict = {
                            "XE": sensor_states.XE,
                            "XR": sensor_states.XR,
                            "ZE": sensor_states.ZE,
                            "ZR": sensor_states.ZR,
                            "LR": sensor_states.LR,
                        }
                        self.test_data.update(sensor_states_dict)
                        test_data = self.dict_values_to_line(self.test_data)
                        for file in self.test_files:
                            if serial_number in file:
                                data.append_data_to_file(
                                    test_name=self.test_name,
                                    run_id=self.test_date,
                                    file_name=file,
                                    data=test_data,
                                )

                    cycle += 1
            except FlexStackerStallError:
                print(f"\nStacker {serial_number}: Stall Error Detected!")
                self.exit_stacker()
            except KeyboardInterrupt:
                self.exit_stacker()
            except Exception as e:
                print(f"\nStacker {serial_number}: Unexpected Error - {e}")
                self.exit_stacker()
        else:
            await self.run_async_tasks()

    async def _home(self, api: OT3API, mount: OT3Mount) -> None:
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


if __name__ == "__main__":
    print("\nFlex Stacker Axis Accelerated Lifetime Test\n")
    arg_parser = build_arg_parser()
    args = arg_parser.parse_args()
    test = Stacker_Axis_Acc_Lifetime_Test(
        args.simulate, args.cycles, args.num_stacker, args.mode
    )
    asyncio.run(test.run())
