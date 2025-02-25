import os, sys
import asyncio
import csv
from hardware_testing.drivers import mark10
import threading
import argparse
import time

from opentrons.hardware_control.ot3api import OT3API
from hardware_testing.opentrons_api import helpers_ot3
from opentrons.drivers.flex_stacker.types import (
    StackerAxis,
    Direction,
    LEDColor,
    LEDPattern,
)

from opentrons.drivers.flex_stacker.driver import (
    STACKER_MOTION_CONFIG,
    STALLGUARD_CONFIG,
    FlexStackerDriver,
)

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

async def force_func(fg_var, sg_value, trial, axis, timer, timeout):
    timer.start()
    t = timer.elasped_time()
    dir = '/data/stallguard/'
    speed = STACKER_MOTION_CONFIG[axis]['move'].max_speed
    current = STACKER_MOTION_CONFIG[axis]['move'].current
    file_name = f'{axis}_SG_val_{sg_value}_Speed_{speed}_{current}_Amps.csv'
    with open(dir + file_name, 'a', newline = '') as file:
        writer = csv.writer(file)
        if trial == 1:
            fields = ["Time(s)", "Force(N)", "SG Value", "Trials"]
            writer.writerow(fields)
        while t < timeout:
            t = timer.elasped_time()
            fg_reading = await fg_var.read_force()
            data = [t, fg_reading, sg_value, trial]
            writer.writerow(data)
            # print(data)
            file.flush()
        file.close()

async def move(s, a, d, d_2):
    try:
        print(f'I am Moving')
        resp = await s.move_axis(axis = a,
                            direction = d, distance = d_2)
        print(f'Finished')
        return resp
    except Exception as e:
        raise(e)

def build_arg_parser():
    arg_parser = argparse.ArgumentParser(description="Motion Parameter Test Script")
    arg_parser.add_argument("-c", "--cycles", default = 5, type = int, help = "number of cycles to execute")
    arg_parser.add_argument("-a", "--axis", default = 'x', type = str, help = "Choose a Axis")
    arg_parser.add_argument("-f", "--force_gauge", required=False, action='store_false', help = "Force gauge")
    arg_parser.add_argument("-t", "--test", default="sg_test", choices=["sg_test","repeatability_test"])
    return arg_parser

async def main(args) -> None:
    t = Timer()
    axis_mapping = {
                    'x': {'total_travel': 202, 'axis': StackerAxis.X},
                    'z': {'total_travel': 202, 'axis': StackerAxis.Z},
                    'l': {'total_travel': 30, 'axis': StackerAxis.L},
                    }
    if args.axis.lower() in axis_mapping:
        config = axis_mapping[args.axis.lower()]
        TOTAL_TRAVEL = config['total_travel']
        test_axis = config['axis']
    else:
        raise ValueError("Axis not recognized from args options")  # More specific exception
    print(f'config: {STACKER_MOTION_CONFIG}')
    sg_start = 2
    sg_final = 12
    timeout = 7
    print(f'config: {STACKER_MOTION_CONFIG}')
    # api = await helpers_ot3.build_async_ot3_hardware_api(is_simulating = False)
    api = await OT3API.build_hardware_controller(loop=asyncio.get_running_loop())
    if args.force_gauge:
        force_gauge = await mark10.Mark10.create('/dev/ttyUSB0', 115200, loop=asyncio.get_running_loop())
    stacker = api.attached_modules[0]
    device_info = api.attached_modules[0].device_info
    test_functions = {
                    "sg_test": lambda: move(stacker, test_axis, Direction.EXTEND, TOTAL_TRAVEL),
                    "sg_home_test": lambda: stacker.home_axis(test_axis, Direction.EXTEND),
                    }
    await stacker.home_axis(StackerAxis.Z, Direction.RETRACT)
    await stacker.home_axis(StackerAxis.X, Direction.RETRACT)
    await stacker._driver.set_stallguard_threshold(test_axis, False, 4)
    await stacker.close_latch()
    await stacker.open_latch()
    sg_results = []
    stallguard_vals = [x for x in range(sg_start, sg_final+1)]
    for sg_value in stallguard_vals:
        for c in range(1, args.cycles+1):
            await stacker._driver.set_stallguard_threshold(test_axis, True, sg_value)
            if args.test in test_functions:
                move_task = asyncio.create_task(test_functions[args.test]())
            else:
                print(f"Unknown test type: {args.test}")
                return  # Or handle the unknown test case appropriately
            print(f"Cycle: {c}")
            print(f"Sg: {sg_value}")
            tasks_to_gather = [move_task]  # Start with move_task always included
            if args.force_gauge:
                fg_task = asyncio.create_task(force_func(force_gauge, sg_value, c, test_axis, t, timeout))
                tasks_to_gather.append(fg_task)  # Add fg_task if force_gauge is True
            try:
                results = await asyncio.gather(*tasks_to_gather)
                # print(results)
            except Exception as e:
                print(e)
                pass
            print(results)
            sg_results.append((sg_value,results[0]))
            await asyncio.sleep(1)
            await stacker._driver.set_stallguard_threshold(test_axis, False, sg_value)
            await stacker.home_axis(test_axis, Direction.RETRACT)
            await stacker._driver.set_stallguard_threshold(test_axis, True, sg_value)
        print(sg_results)

async def repeatablity_test(args) -> None:
    t = Timer()
    timeout = 8
    axis_mapping = {
                    'x': {'total_travel': 202, 'axis': StackerAxis.X},
                    'z': {'total_travel': 202, 'axis': StackerAxis.Z},
                    'l': {'total_travel': 30, 'axis': StackerAxis.L},
                    }
    if args.axis.lower() in axis_mapping:
        config = axis_mapping[args.axis.lower()]
        TOTAL_TRAVEL = config['total_travel']
        test_axis = config['axis']
    else:
        raise ValueError("Axis not recognized from args options")  # More specific exception
    print(f'config: {STACKER_MOTION_CONFIG}')
    # api = await helpers_ot3.build_async_ot3_hardware_api(is_simulating = False)
    api = await OT3API.build_hardware_controller(loop=asyncio.get_running_loop())
    if args.force_gauge:
        force_gauge = await mark10.Mark10.create('/dev/ttyUSB0', 115200, loop=asyncio.get_running_loop())
    stacker = api.attached_modules[0]
    device_info = api.attached_modules[0].device_info
    # sg_value = 2
    sg_value = int(input("Enter SG Value: "))
    # await stacker.home_axis(StackerAxis.X, Direction.EXTEND)
    await stacker.home_axis(StackerAxis.Z, Direction.RETRACT)
    await stacker.home_axis(StackerAxis.X, Direction.RETRACT)
    await stacker.close_latch()
    await stacker.open_latch()
    test_functions = {
                    "sg_test": lambda: move(stacker, test_axis, Direction.EXTEND, TOTAL_TRAVEL),
                    "sg_home_test": lambda: stacker.home_axis(test_axis, Direction.EXTEND),
                    }
    for c in range(1, args.cycles+1):
        await stacker._driver.set_stallguard_threshold(test_axis, True, sg_value)
        if args.test in test_functions:
            move_task = asyncio.create_task(test_functions[args.test]())
        else:
            print(f"Unknown test type: {args.test}")
            return  # Or handle the unknown test case appropriately
        if args.force_gauge:
            fg_task = asyncio.create_task(force_func(force_gauge, sg_value, c, test_axis, t, timeout))
        print(f"Cycle: {c}")
        try:
            if args.force_gauge:
                await asyncio.gather(move_task, fg_task)
            else:
                await asyncio.gather(move_task)
        except Exception as e:
            print(e)
        await asyncio.sleep(1)
        await stacker._driver.set_stallguard_threshold(test_axis, False, sg_value)
        await stacker.home_axis(test_axis, Direction.RETRACT)
        await stacker._driver.set_stallguard_threshold(test_axis, True, sg_value)

if __name__ == '__main__':
    arg_parser = build_arg_parser()
    options = arg_parser.parse_args()
    asyncio.run(main(options))
