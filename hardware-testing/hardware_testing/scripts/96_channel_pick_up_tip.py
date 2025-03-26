"""Demo OT3 Gantry Functionality."""
import argparse
import asyncio
import csv
from typing import Tuple, Dict, Optional
import datetime
import os
import sys
import termios
import tty
import json

from opentrons.hardware_control.motion_utilities import target_position_from_plunger
from hardware_testing.opentrons_api.types import (
    OT3Mount,
    Axis,
    Point,
    CriticalPoint,
)
from opentrons.hardware_control.ot3api import OT3API
from hardware_testing.opentrons_api.helpers_ot3 import (
    build_async_ot3_hardware_api,
    get_plunger_positions_ot3,
)

import serial.tools.list_ports as serial_tool
from hardware_testing import data
from hardware_testing.drivers import mitutoyo_digimatic_indicator

aspirate_depth = 7
dispense_depth = 3
liquid_retract_dist = 12
liquid_retract_speed = 5
retract_dist = 100
retract_speed = 60

leak_test_time = 30
volume_test = 1000

PIPETTE_CHANNELS = 96
NOZZLE_COLUMNS = 12
NOZZLE_TO_NOZZLE_MM = 9

def dial_indicator_setup(port):
    gauge = mitutoyo_digimatic_indicator.Mitutoyo_Digimatic_Indicator(port=port)
    gauge.connect()
    return gauge

def getch():
    """
    fd: file descriptor stdout, stdin, stderr
    This functions gets a single input keyboard character from the user
    """

    def _getch():
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(fd)
            ch = sys.stdin.read(1)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        return ch

    return _getch()

async def jog(api: OT3API, position: Dict[Axis, float], cp: CriticalPoint) -> Dict[Axis, float]:
    step_size = [0.01, 0.05, 0.1, 0.5, 1, 10, 20, 50]
    step_length_index = 3
    step = step_size[step_length_index]
    xy_speed = 60
    za_speed = 65
    information_str = """
        Click  >>   i   << to move up
        Click  >>   k   << to move down
        Click  >>   a  << to move left
        Click  >>   d  << to move right
        Click  >>   w  << to move forward
        Click  >>   s  << to move back
        Click  >>   +   << to Increase the length of each step
        Click  >>   -   << to decrease the length of each step
        Click  >> Enter << to save position
        Click  >> q << to quit the test script
                    """
    print(information_str)
    while True:
        input = getch()
        if input == "a":
            # minus x direction
            sys.stdout.flush()
            await api.move_rel(
                mount, Point(-step_size[step_length_index], 0, 0), speed=xy_speed
            )

        elif input == "d":
            # plus x direction
            sys.stdout.flush()
            await api.move_rel(
                mount, Point(step_size[step_length_index], 0, 0), speed=xy_speed
            )

        elif input == "w":
            # minus y direction
            sys.stdout.flush()
            await api.move_rel(
                mount, Point(0, step_size[step_length_index], 0), speed=xy_speed
            )

        elif input == "s":
            # plus y direction
            sys.stdout.flush()
            await api.move_rel(
                mount, Point(0, -step_size[step_length_index], 0), speed=xy_speed
            )

        elif input == "i":
            sys.stdout.flush()
            await api.move_rel(
                mount, Point(0, 0, step_size[step_length_index]), speed=za_speed
            )

        elif input == "k":
            sys.stdout.flush()
            await api.move_rel(
                mount, Point(0, 0, -step_size[step_length_index]), speed=za_speed
            )

        elif input == "q":
            sys.stdout.flush()
            print("TEST CANCELLED")
            quit()

        elif input == "+":
            sys.stdout.flush()
            step_length_index = step_length_index + 1
            if step_length_index >= 7:
                step_length_index = 7
            step = step_size[step_length_index]

        elif input == "-":
            sys.stdout.flush()
            step_length_index = step_length_index - 1
            if step_length_index <= 0:
                step_length_index = 0
            step = step_size[step_length_index]

        elif input == "\r":
            sys.stdout.flush()
            position = await api.current_position_ot3(
                mount, refresh=True, critical_point=cp
            )
            print("\r\n")
            return position
        position = await api.current_position_ot3(
            mount, refresh=True, critical_point=cp
        )

        print(
            "Coordinates: ",
            round(position[Axis.X], 2),
            ",",
            round(position[Axis.Y], 2),
            ",",
            round(position[Axis.by_mount(mount)], 2),
            " Motor Step: ",
            step_size[step_length_index],
            end="",
        )
        print("\r", end="")

async def countdown(count_time: float):
    """
    This function loops through a countdown before checking the leak visually
    """
    time_suspend = 0
    while time_suspend < count_time:
        await asyncio.sleep(1)
        time_suspend += 1
        print(f"Remaining: {count_time-time_suspend} (s)", end="")
        print("\r", end="")
    print("")

async def move_to_point(api: OT3API, mount: OT3Mount, point: Tuple, cp: CriticalPoint):
    home_pos = api.get_instrument_max_height(mount, cp)
    pos = await api.current_position_ot3(mount, refresh=True, critical_point = cp)
    await api.move_to(mount,
                    Point(pos[Axis.X],
                        pos[Axis.Y],
                        home_pos))
    await api.move_to(mount,
                    Point(point.x,
                        point.y,
                        home_pos))
    await api.move_to(mount,
                    Point(point.x,
                        point.y,
                        point.z))

def load_config_(filename: str) -> Dict:
    """This function loads a given config file"""
    try:
        with open(filename, 'r') as file:
            data = json.load(file)
    except FileNotFoundError:
        print('Warning: {0} not found'.format(filename))
        data = {}
    except json.decoder.JSONDecodeError:
        print('Error: {0} is corrupt'.format(filename))
        data = {}
    return data

def save_config_(filename: str, data: str) -> Dict:
    """This function saves a given config file with data"""
    try:
        with open(filename, 'w') as file:
            json.dump(
                data, file, sort_keys=True, indent=4, separators=(',', ': ')
                    )
    except FileNotFoundError:
        print('Warning: {0} not found'.format(filename))
        data = {}
    except json.decoder.JSONDecodeError:
        print('Error: {0} is corrupt'.format(filename))
        data = {}
    return data

async def calibrate_tiprack(api: OT3API, mount: OT3Mount):
    cp = CriticalPoint.NOZZLE
    tiprack_loc = Point(
                    deck_slot['deck_slot'][args.tiprack_slot]['X'],
                    deck_slot['deck_slot'][args.tiprack_slot]['Y'],
                    deck_slot['deck_slot'][args.tiprack_slot]['Z'])
    print(tiprack_loc)
    print("Move to Tiprack")
    await move_to_point(api, mount, tiprack_loc, cp)
    current_position = await api.current_position_ot3(mount, cp)
    tiprack_loc = await jog(api, current_position, cp)
    tiprack_loc = Point(tiprack_loc[Axis.X],
                        tiprack_loc[Axis.Y],
                        tiprack_loc[Axis.by_mount(mount)])
    await api.pick_up_tip(
        mount, tip_length=(tip_length[args.tip_size]-tip_overlap))
    return tiprack_loc

async def _main() -> None:
    today = datetime.date.today()
    directory = f'/data/96H_pick_up_tip_{datetime.datetime.now().strftime("%m_%d_%y")}'
    if not os.path.exists(directory):
        os.makedirs(directory)
    hw_api = await build_async_ot3_hardware_api(
        is_simulating=args.simulate, use_defaults=True
    )
    pipette_model = hw_api.get_all_attached_instr()[OT3Mount.LEFT]["pipette_id"]
    dial_data = {"Column_1": None, "Column_2": None, "Column_3": None, "Column_4": None, "Column_5": None, "Column_6": None,
                "Column_7": None, "Column_8": None, "Column_9": None, "Column_10": None, "Column_11": None, "Column_12": None}
    file_name = f"{directory}/full_pu_96_pipette_%s-%s.csv" % (
        "standard",
        datetime.datetime.now().strftime("%m-%d-%y_%H-%M"),
    )
    print(file_name)
    await hw_api.cache_instruments()
    await hw_api.home()
    await hw_api.home_plunger(mount)
    await hw_api.set_lights(rails=True)
    plunger_pos = get_plunger_positions_ot3(hw_api, mount)
    print(plunger_pos)
    home_position = await hw_api.current_position_ot3(mount)
    if (args.measure_nozzles):
        cp = CriticalPoint.NOZZLE
        home_wo_tip = await hw_api.current_position_ot3(mount, cp)
        initial_dial_loc = Point(
                            deck_slot['deck_slot'][args.dial_slot]['X'],
                            deck_slot['deck_slot'][args.dial_slot]['Y'],
                            home_wo_tip[Axis.by_mount(mount)]
        )
        print("Move Nozzle to Dial Indicator")
        await move_to_point(hw_api, mount, initial_dial_loc, cp)
        current_position = await hw_api.current_position_ot3(mount, cp)
        nozzle_loc = await jog(hw_api, current_position, cp)
        x_offset = 0
        y_offset = 0
        measurements = []
        measurement_map = {}
        nozzle_fname = f"{directory}/nozzle_data_96_pipette_%s-%s.csv" % (
        "standard",
        datetime.datetime.now().strftime("%m-%d-%y_%H-%M"),
        )
        with open(nozzle_fname, 'w', newline='') as csvfile:
            test_details = csv.writer(csvfile, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            test_details.writerow({'test details'})
            test_details.writerow({pipette_model})
            test_details.writerow({'96H Nozzle Flatness Testing'})
            log_file = csv.DictWriter(csvfile, dial_data)
            log_file.writeheader()
            # Iterate each nozzle onto the dial indicator to measure the flatness
            for nozzle_count in range(1, PIPETTE_CHANNELS + 1):
                cp = CriticalPoint.NOZZLE
                nozzle_position = Point(nozzle_loc[Axis.X] + x_offset,
                                        nozzle_loc[Axis.Y] + y_offset,
                                        nozzle_loc[Axis.by_mount(mount)])
                await move_to_point(hw_api, mount, nozzle_position, cp)
                await asyncio.sleep(2)
                nozzle_measurement = gauge.read()
                measurement_map.update({nozzle_count: nozzle_measurement})
                print("nozzle-",nozzle_count, "(mm): " , nozzle_measurement, end="")
                print("\r", end="")
                measurements.append(nozzle_measurement)
                if nozzle_count % NOZZLE_COLUMNS == 0:
                    d_str = ''
                    noz_count = 0
                    for m in measurements:
                        noz_count += 1
                        d_str += str(m) + ','
                        dial_data[f'Column_{noz_count}'] = m
                    log_file.writerow(dial_data)
                    csvfile.flush()
                    d_str = d_str[:-1] + '\n'
                    print(f"{d_str}")
                    # Reset Measurements list
                    measurements = []
                    print("\r\n")
                x_offset -= NOZZLE_TO_NOZZLE_MM
                if nozzle_count % NOZZLE_COLUMNS == 0:
                    y_offset += NOZZLE_TO_NOZZLE_MM
                if nozzle_count % NOZZLE_COLUMNS == 0:
                    x_offset = 0
            print(f'Nozzle Measurements: {measurement_map}')
            csvfile.close()
    # Calibrate to tiprack
    if args.calibrate:
        print("Calibrate Tiprack")
        pickup_loc = await calibrate_tiprack(hw_api, mount)
        deck_slot['deck_slot'][args.tiprack_slot][Axis.X.name] = pickup_loc.x
        deck_slot['deck_slot'][args.tiprack_slot][Axis.Y.name] = pickup_loc.y
        deck_slot['deck_slot'][args.tiprack_slot]['Z'] = pickup_loc.z
        save_config_(path+cal_fn, deck_slot)
    await hw_api.home_z(mount)
    cp = CriticalPoint.TIP
    # Calibrate Dial Indicator with single tip
    if args.dial_indicator:
        initial_dial_loc = Point(nozzle_loc[Axis.X],
                                nozzle_loc[Axis.Y],
                                nozzle_loc[Axis.by_mount(mount)])
        print("Move to Dial Indicator")
        await move_to_point(hw_api, mount, initial_dial_loc, cp)
        current_position = await hw_api.current_position_ot3(mount, cp)
        dial_loc = await jog(hw_api, current_position, cp)
        dial_loc = Point(dial_loc[Axis.X],
                            dial_loc[Axis.Y],
                            dial_loc[Axis.by_mount(mount)])
        deck_slot['deck_slot'][args.dial_slot][Axis.X.name] = dial_loc.x
        deck_slot['deck_slot'][args.dial_slot][Axis.Y.name] = dial_loc.y
        deck_slot['deck_slot'][args.dial_slot]['Z'] = dial_loc.z
        save_config_(path+cal_fn, deck_slot)
    # Start recording pick up tip overlaps
    with open(file_name, 'w', newline='') as pu_csvfile:
        test_details = csv.writer(pu_csvfile, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        test_details.writerow({'test details'})
        test_details.writerow({pipette_model})
        test_details.writerow({'96H Pick up Tip Testing-Default Settings'})
        log_file = csv.DictWriter(pu_csvfile, dial_data)
        log_file.writeheader()
        try:
            x_offset, y_offset = 0, 0
            while True:
                measurements = []
                cp = CriticalPoint.TIP
                for tip_count in range(1, PIPETTE_CHANNELS + 1):
                    cp = CriticalPoint.TIP
                    x_offset -= 9
                    if tip_count % NOZZLE_COLUMNS == 0:
                        y_offset += 9
                    if tip_count % NOZZLE_COLUMNS == 0:
                        x_offset = 0
                    await asyncio.sleep(2)
                    tip_measurement = gauge.read()
                    print("tip-",tip_count, "(mm): " ,tip_measurement, end="")
                    print("\r", end="")
                    tip_position = Point(dial_loc[0] + x_offset,
                                            dial_loc[1] + y_offset,
                                            dial_loc[2])
                    measurements.append(tip_measurement)
                    if tip_count % NOZZLE_COLUMNS == 0:
                        d_str = ''
                        noz_count = 0
                        for m in measurements:
                            noz_count += 1
                            d_str += str(m) + ','
                            dial_data[f'Column_{noz_count}'] = m
                        log_file.writerow(dial_data)
                        pu_csvfile.flush()
                        d_str = d_str[:-1] + '\n'
                        print(f"{d_str}")
                        # Reset Measurements list
                        measurements = []
                        print("\r\n")
                    await move_to_point(hw_api, mount, tip_position, cp)
                    tip_dist = await hw_api.encoder_current_position_ot3(mount, CriticalPoint.NOZZLE)
                    print(f'tip_position: {tip_dist[Axis.by_mount(mount)]}')
                drop_tip_location =  Point(30 , 60 , 110.5)
                await move_to_point(hw_api, mount, drop_tip_location, cp)
                await hw_api.drop_tip(mount)
                keyboard_input = input("Press Enter or Press 'q' to quit")
                if keyboard_input == 'q':
                    break
                cp = CriticalPoint.NOZZLE
                await move_to_point(hw_api, mount, pickup_loc, cp)
                initial_press_dist = await hw_api.encoder_current_position_ot3(mount, cp)
                print(f'inital press position: {initial_press_dist[Axis.by_mount(mount)]}')
                await hw_api.pick_up_tip(mount,
                                        tip_length=(tip_length[args.tip_size]-tip_overlap))

        except KeyboardInterrupt:
            await hw_api.disengage_axes([Axis.X, Axis.Y])
        finally:
            await hw_api.disengage_axes([Axis.X, Axis.Y])
            await hw_api.clean_up()


if __name__ == "__main__":
    slot_locs = [
        "A1",
        "A2",
        "A3",
        "B1",
        "B2",
        "B3:",
        "C1",
        "C2",
        "C3",
        "D1",
        "D2",
        "D3",
    ]
    parser = argparse.ArgumentParser()
    parser.add_argument("--simulate", action="store_true")
    parser.add_argument("--trough", action="store_true")
    parser.add_argument("--calibrate", action="store_true")
    parser.add_argument("--measure_nozzles", action="store_true")
    parser.add_argument("--mount", type=str, choices=["left", "right"], default="left")
    parser.add_argument("--tiprack_slot", type=str, choices=slot_locs, default="B2")
    parser.add_argument("--dial_slot", type=str, choices=slot_locs, default="C2")
    parser.add_argument("--trough_slot", type=str, choices=slot_locs, default="D1")
    parser.add_argument("--dial_indicator", action="store_true")
    parser.add_argument("--tip_size", type=str, default="T1K", help="Tip Size")
    args = parser.parse_args()
    path = '/data/testing_data/'
    cal_fn = 'calibrations.json'
    if args.calibrate:
        with open(path + cal_fn, 'r') as openfile:
            deck_slot = json.load(openfile)
            print(deck_slot)
    else:
        with open(path + cal_fn, 'r') as openfile:
            deck_slot = json.load(openfile)
    tip_length = {"T1K": 95.6, "T200": 58.35, "T50": 57.9, "T20": 52.0}
    tip_overlap = 10.5
    if args.mount == "left":
        mount = OT3Mount.LEFT
    else:
        mount = OT3Mount.RIGHT

    if args.dial_indicator:
        ports = serial_tool.comports()
        for port, desc, hwid in ports:
            print(f"{port}: {desc} [{hwid}]")
            if "GageWay" in desc:
                dial_port = port
        # GageWay SM from MicroRidge - GageWay SM from MicroRidge
        gauge = dial_indicator_setup(port=dial_port)
    asyncio.run(_main())