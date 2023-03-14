"""Demo OT3 Gantry Functionality."""
import argparse
import ast
import asyncio
import csv
import time
from typing import Tuple, Dict, Optional
from threading import Thread
import datetime
import os
import sys
import termios
import tty
import json

from opentrons.hardware_control.motion_utilities import target_position_from_plunger
from hardware_testing.opentrons_api.types import (
    OT3Mount,
    OT3Axis,
    Point,
    CriticalPoint,
)
from hardware_testing.opentrons_api.helpers_ot3 import (
    build_async_ot3_hardware_api,
    home_ot3,
    move_plunger_absolute_ot3,
    move_plunger_relative_ot3,
    get_plunger_positions_ot3,
    update_pick_up_current,
    update_pick_up_distance,
)

from opentrons.config.types import LiquidProbeSettings

from hardware_testing import data
from hardware_testing.drivers.mark10 import Mark10
from hardware_testing.drivers import mitutoyo_digimatic_indicator

aspirate_depth = 7
liquid_retract_dist = 12
liquid_retract_speed = 5
retract_dist = 100
retract_speed = 60

leak_test_time = 30


def dict_keys_to_line(dict):
    return str.join(",", list(dict.keys())) + "\n"


def file_setup(test_data, details):
    today = datetime.date.today()
    test_name = "{}-pick_up-up-test".format(
        details[0],  # Pipette model
    )
    test_header = dict_keys_to_line(test_data)
    test_tag = "-{}".format(today.strftime("%b-%d-%Y"))
    test_id = data.create_run_id()
    test_path = data.create_folder_for_test_data(test_name)
    test_file = data.create_file_name(test_name, test_id, test_tag)
    data.append_data_to_file(test_name, test_file, test_header)
    print("FILE PATH = ", test_path)
    print("FILE NAME = ", test_file)
    return test_name, test_file


def dial_indicator_setup():
    gauge = mitutoyo_digimatic_indicator.Mitutoyo_Digimatic_Indicator(
        port="/dev/ttyUSB1"
    )
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


async def jog(api, position, cp) -> Dict[OT3Axis, float]:
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
            round(position[OT3Axis.X], 2),
            ",",
            round(position[OT3Axis.Y], 2),
            ",",
            round(position[OT3Axis.by_mount(mount)], 2),
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


async def _main() -> None:
    today = datetime.date.today()
    slot_loc = {
        "A1": (13.42, 394.92, 110),
        "A2": (177.32, 394.92, 110),
        "A3": (341.03, 394.92, 110),
        "B1": (13.42, 288.42, 110),
        "B2": (177.32, 288.92, 110),
        "B3": (341.03, 288.92, 110),
        "C1": (13.42, 181.92, 110),
        "C2": (177.32, 181.92, 110),
        "C3": (341.03, 181.92, 110),
        "D1": (13.42, 75.5, 110),
        "D2": (177.32, 75.5, 110),
        "D3": (341.03, 75.5, 110),
    }
    hw_api = await build_async_ot3_hardware_api(
        is_simulating=args.simulate, use_defaults=True
    )
    tip_length = {"T1K": 85.7, "T50": 57.9}
    pipette_model = hw_api._pipette_handler.hardware_instruments[mount].name
    dial_data = {"Tip": None, "Tip Height": None}
    details = [pipette_model]
    test_n, test_f = file_setup(dial_data, details)
    print(test_n)
    print(test_f)
    await home_ot3(hw_api, [OT3Axis.Z_L, OT3Axis.Z_R,  OT3Axis.X, OT3Axis.Y])
    await hw_api.home_plunger(mount)
    plunger_pos = get_plunger_positions_ot3(hw_api, mount)
    home_position = await hw_api.current_position_ot3(mount)
    global stop_threads
    global motion
    if args.fg_jog:
        cp = CriticalPoint.NOZZLE
        await hw_api.move_to(
            mount,
            Point(
                slot_loc["D2"][0],
                slot_loc["D2"][1],
                home_position[OT3Axis.by_mount(mount)],
            ),
        )
        current_position = await hw_api.current_position_ot3(mount)
        print("Move to Force Gauge")
        fg_loc = await jog(hw_api, current_position, cp)
        fg_loc = [fg_loc[OT3Axis.X], fg_loc[OT3Axis.Y], fg_loc[OT3Axis.by_mount(mount)]]
        await hw_api.home_z(mount, allow_home_other=False)

    if args.tiprack:
        await hw_api.move_to(
            mount,
            Point(
                slot_loc["B2"][0],
                slot_loc["B2"][1],
                home_position[OT3Axis.by_mount(mount)],
            ),
        )
        cp = CriticalPoint.NOZZLE
        print("Move to Tiprack")
        current_position = await hw_api.current_position_ot3(mount)
        tiprack_loc = await jog(hw_api, current_position, cp)
        init_tip_loc = await hw_api.encoder_current_position_ot3(
            mount, CriticalPoint.NOZZLE
        )
        # Move pipette to Force Gauge press location
        final_tip_loc = await hw_api.pick_up_tip(
            mount, tip_length=tip_length[args.tip_size]
        )
        home_with_tip = await hw_api.current_position_ot3(
            mount, critical_point=CriticalPoint.TIP
        )
        tiprack_loc = [
            tiprack_loc[OT3Axis.X],
            tiprack_loc[OT3Axis.Y],
            tiprack_loc[OT3Axis.by_mount(mount)],
        ]

    if args.dial_indicator:
        await hw_api.move_to(
            mount,
            Point(
                slot_loc["C2"][0],
                slot_loc["C2"][1],
                home_with_tip[OT3Axis.by_mount(mount)],
            ),
        )
        cp = CriticalPoint.TIP
        print("Move to Tiprack")
        current_position = await hw_api.current_position_ot3(mount)
        dial_loc = await jog(hw_api, current_position, cp)
        dial_loc = [
            dial_loc[OT3Axis.X],
            dial_loc[OT3Axis.Y],
            dial_loc[OT3Axis.by_mount(mount)],
        ]

    if args.trough:
        await hw_api.move_to(
            mount,
            Point(
                slot_loc["B3"][0],
                slot_loc["B3"][1],
                home_with_tip[OT3Axis.by_mount(mount)],
            ),
        )
        cp = CriticalPoint.TIP
        print("Move  to Trough")
        current_position = await hw_api.current_position_ot3(mount)
        trough_loc = await jog(hw_api, current_position, cp)
        trough_loc = [
            trough_loc[OT3Axis.X],
            trough_loc[OT3Axis.Y],
            trough_loc[OT3Axis.by_mount(mount)],
        ]
        await hw_api.move_to(
            mount,
            Point(trough_loc[0], trough_loc[1], home_with_tip[OT3Axis.by_mount(mount)]),
            critical_point=CriticalPoint.TIP,
        )
        # Move to trash slot
        await hw_api.move_to(
            mount,
            Point(
                slot_loc["A3"][0] + 50,
                slot_loc["A3"][1] - 20,
                home_with_tip[OT3Axis.by_mount(mount)],
            ),
            critical_point=CriticalPoint.TIP,
        )
        await hw_api.drop_tip(mount)

    lp_file_name = "/var/pressure_sensor_data_P-{}_Z-{}-{}.csv".format(
        args.plunger_speed, args.mount_speed, today.strftime("%b-%d-%Y")
    )
    liquid_probe_settings = LiquidProbeSettings(
        max_z_distance=args.max_z_distance,
        min_z_distance=args.min_z_distance,
        mount_speed=args.mount_speed,
        plunger_speed=args.plunger_speed,
        sensor_threshold_pascals=args.sensor_threshold,
        expected_liquid_height=args.expected_liquid_height,
        log_pressure=args.log_pressure,
        aspirate_while_sensing=False,
        data_file=lp_file_name,
    )
    try:
        while True:
            # #-----------------------Force Gauge-----------------------------------
            # Set Motor current by tester
            m_current = float(input("motor_current in amps: "))
            await hw_api.move_to(
                mount,
                Point(fg_loc[0], fg_loc[1], home_position[OT3Axis.by_mount(mount)]),
            )
            # # Move pipette to Force Gauge calibrated location
            await hw_api.move_to(mount, Point(fg_loc[0], fg_loc[1], fg_loc[2]))
            init_fg_loc = await hw_api.encoder_current_position_ot3(
                mount, CriticalPoint.NOZZLE
            )
            init_fg_loc = init_fg_loc[OT3Axis.by_mount(mount)]
            location = "Force_Gauge"
            force_thread = Thread(
                target=force_record,
                args=(
                    m_current,
                    location,
                    pipette_model,
                ),
            )
            force_thread.start()
            await update_pick_up_current(hw_api, mount, m_current)
            init_tip_loc = await hw_api.encoder_current_position_ot3(
                mount, CriticalPoint.NOZZLE
            )
            # Move pipette to Force Gauge press location
            final_tip_loc = await hw_api.pick_up_tip(
                mount, tip_length=tip_length[args.tip_size]
            )

            home_with_tip = await hw_api.current_position_ot3(
                mount, critical_point=CriticalPoint.TIP
            )
            await asyncio.sleep(2)
            final_fg_loc = await hw_api.encoder_current_position_ot3(
                mount, CriticalPoint.NOZZLE
            )
            final_fg_loc = final_fg_loc[OT3Axis.by_mount(mount)]
            print(final_fg_loc)
            motion = False
            stop_threads = True
            force_thread.join()  # Thread Finished
            await hw_api.remove_tip(mount)
            await hw_api.home_z(mount, allow_home_other=False)

            # -----------------------Tiprack------------------------------------
            # Move over to the TipRack location and
            await hw_api.move_to(
                mount,
                Point(
                    tiprack_loc[0],
                    tiprack_loc[1],
                    home_position[OT3Axis.by_mount(mount)],
                ),
            )

            # Move Pipette to top of Tip Rack Location
            await hw_api.move_to(
                mount, Point(tiprack_loc[0], tiprack_loc[1], tiprack_loc[2]), speed=65
            )
            location = "Tiprack"
            global encoder_end
            encoder_end = None
            # Start recording the encoder
            init_tip_loc = await hw_api.encoder_current_position_ot3(
                mount, CriticalPoint.NOZZLE
            )
            print(f"Start encoder: {init_tip_loc}")
            init_tip_loc = init_tip_loc[OT3Axis.by_mount(mount)]
            encoder_position = init_tip_loc
            # Press Pipette into the tip
            await update_pick_up_current(hw_api, mount, m_current)
            # Move pipette to Force Gauge press location
            final_tip_loc = await hw_api.pick_up_tip(
                mount, tip_length=tip_length[args.tip_size]
            )
            home_with_tip = await hw_api.current_position_ot3(
                mount, critical_point=CriticalPoint.TIP
            )
            encoder_end = final_tip_loc[OT3Axis.by_mount(mount)]
            # final_tip_loc = await hw_api.encoder_current_position_ot3(mount, CriticalPoint.NOZZLE)
            print(f"End Encoder: {final_tip_loc}")
            final_tip_loc = final_tip_loc[OT3Axis.by_mount(mount)]
            enc_record(m_current, location, init_tip_loc, final_tip_loc)
            # Home Z
            await hw_api.home([OT3Axis.by_mount(mount)])
            # Move over to the dial indicator
            await hw_api.move_to(
                mount,
                Point(dial_loc[0], dial_loc[1], home_with_tip[OT3Axis.by_mount(mount)]),
            )
            # Move over to the dial indicator
            await hw_api.move_to(
                mount,
                Point(dial_loc[0], dial_loc[1], dial_loc[2]),
            )
            await asyncio.sleep(1)
            tip_measurement = gauge.read()
            d_str = f"{pipette_model}, {tip_measurement}, Tip \n"
            data.append_data_to_file(test_n, test_f, d_str)
            # Move over to the dial indicator
            await hw_api.move_to(
                mount,
                Point(dial_loc[0], dial_loc[1], home_with_tip[OT3Axis.by_mount(mount)]),
            )
            # -----------------------Aspirate-----------------------------------
            await hw_api.move_to(
                mount,
                Point(
                    trough_loc[0], trough_loc[1], home_with_tip[OT3Axis.by_mount(mount)]
                ),
            )
            # Move to offset from trough
            await hw_api.move_to(
                mount, Point(trough_loc[0], trough_loc[1], trough_loc[2])
            )
            # Move the plunger to the top position
            await move_plunger_absolute_ot3(hw_api, mount, plunger_pos[0])
            # Liquid Probe
            liquid_height = await hw_api.liquid_probe(
                mount, probe_settings=liquid_probe_settings
            )
            print("I'm here")

            liquid_height = await hw_api.current_position_ot3(
                mount, critical_point=CriticalPoint.TIP
            )
            # await move_plunger_relative_ot3(hw_api, mount, 1.5, None, speed = 2) # P50S
            await move_plunger_relative_ot3(hw_api, mount, 0.25, None, speed=2)  # P1KS
            await hw_api.move_to(
                mount, Point(trough_loc[0], trough_loc[1], trough_loc[2])
            )
            # Prepare to aspirate before descending to trough well
            await hw_api.prepare_for_aspirate(mount)
            # Descend to aspirate depth
            await hw_api.move_to(
                mount,
                Point(
                    liquid_height[OT3Axis.X],
                    liquid_height[OT3Axis.Y],
                    liquid_height[OT3Axis.by_mount(mount)] - aspirate_depth,
                ),
                speed=5,
                critical_point=CriticalPoint.TIP,
            )
            # Aspirate
            await hw_api.aspirate(mount)
            cur_pos = await hw_api.current_position_ot3(
                mount, critical_point=CriticalPoint.TIP
            )
            z_pos = cur_pos[OT3Axis.by_mount(mount)]
            # Retract from liquid with retract speed
            await hw_api.move_to(
                mount,
                Point(trough_loc[0], trough_loc[1], z_pos + liquid_retract_dist),
                speed=liquid_retract_speed,
                critical_point=CriticalPoint.TIP,
            )
            await hw_api.move_to(
                mount,
                Point(
                    trough_loc[0], trough_loc[1], home_with_tip[OT3Axis.by_mount(mount)]
                ),
                critical_point=CriticalPoint.TIP,
            )
            await countdown(count_time=leak_test_time)
            input("Check to see if the pipette is leaking")
            await hw_api.move_to(
                mount,
                Point(trough_loc[0], trough_loc[1], trough_loc[2]),
                critical_point=CriticalPoint.TIP,
            )
            await hw_api.move_to(
                mount,
                Point(trough_loc[0], trough_loc[1], trough_loc[2] - aspirate_depth),
                speed=5,
                critical_point=CriticalPoint.TIP,
            )
            await hw_api.dispense(mount)
            await hw_api.blow_out(mount)
            # --------------------Drop Tip--------------------------------------
            current_position = await hw_api.current_position_ot3(
                mount, critical_point=CriticalPoint.TIP
            )
            await hw_api.move_to(
                mount,
                Point(
                    trough_loc[0], trough_loc[1], home_with_tip[OT3Axis.by_mount(mount)]
                ),
                critical_point=CriticalPoint.TIP,
            )
            input("Feel the Tip")
            # Move to trash slot
            await hw_api.move_to(
                mount,
                Point(
                    slot_loc["A3"][0] + 50,
                    slot_loc["A3"][1] - 20,
                    home_with_tip[OT3Axis.by_mount(mount)],
                ),
                critical_point=CriticalPoint.TIP,
            )
            await hw_api.drop_tip(mount)

        await hw_api.disengage_axes([OT3Axis.X, OT3Axis.Y, OT3Axis.Z_L, OT3Axis.Z_R])
    except KeyboardInterrupt:
        await hw_api.disengage_axes([OT3Axis.X, OT3Axis.Y, OT3Axis.Z_L, OT3Axis.Z_R])
    finally:
        await hw_api.disengage_axes([OT3Axis.X, OT3Axis.Y, OT3Axis.Z_L, OT3Axis.Z_R])
        await hw_api.clean_up()


def force_record(motor_current, location, pipette_model):
    global stop_threads
    global motion
    file_name = (
        "/home/root/.opentrons/testing_data/force_data/force_pu_test_%s-%s-%s.csv"
        % (
            motor_current,
            datetime.datetime.now().strftime("%m-%d-%y_%H-%M"),
            location,
        )
    )
    print(file_name)
    with open(file_name, "w", newline="") as f:
        test_data = {
            "Time(s)": None,
            "Force(N)": None,
            "M_current(amps)": None,
            "pipette_model": None,
        }
        log_file = csv.DictWriter(f, test_data)
        log_file.writeheader()
        start_time = time.perf_counter()
        try:
            motion = True
            stop_threads = False
            while motion:
                reading = float(fg.read_force())
                test_data["Time(s)"] = time.perf_counter() - start_time
                test_data["Force(N)"] = reading
                test_data["M_current(amps)"] = motor_current
                test_data["pipette_model"] = pipette_model
                log_file.writerow(test_data)
                print(test_data)
                f.flush()
                if stop_threads:
                    break
        except KeyboardInterrupt:
            print("Test Cancelled")
            test_data["Errors"] = "Test Cancelled"
            f.flush()
        except Exception as e:
            print("ERROR OCCURED")
            test_data["Errors"] = e
            f.flush()
            raise e
        print("Test done")
        f.flush()
        f.close()


def enc_record(motor_current, location, init_enc_pos, final_enc_pos):
    file_name = (
        "/home/root/.opentrons/testing_data/enc_data/enc_pu_test_%s-%s-%s.csv"
        % (
            motor_current,
            datetime.datetime.now().strftime("%m-%d-%y_%H-%M"),
            location,
        )
    )
    print(file_name)
    with open(file_name, "w", newline="") as f:
        test_data = {
            "time(s)": None,
            "motor_current": None,
            "start_enc_pos": None,
            "end_enc_pos(mm)": None,
        }
        log_file = csv.DictWriter(f, test_data)
        log_file.writeheader()
        start_time = time.perf_counter()
        try:
            test_data["time(s)"] = time.perf_counter() - start_time
            test_data["motor_current"] = motor_current
            test_data["start_enc_pos(mm)"] = init_enc_pos
            test_data["end_enc_pos(mm)"] = final_enc_pos
            log_file.writerow(test_data)
            print(test_data)
            f.flush()
        except KeyboardInterrupt:
            print("Test Cancelled")
            test_data["Errors"] = "Test Cancelled"
            f.flush()
        except Exception as e:
            print("ERROR OCCURED")
            test_data["Errors"] = e
            f.flush()
            raise e
        print("Test done")
        f.flush()
        f.close()


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
    parser.add_argument("--fg_jog", action="store_true", default=True)
    parser.add_argument("--trough", action="store_true", default=True)
    parser.add_argument("--tiprack", action="store_true", default=True)
    parser.add_argument("--mount", type=str, choices=["left", "right"], default="left")
    parser.add_argument("--tiprack_slot", type=str, choices=slot_locs, default="B2")
    parser.add_argument("--dial_slot", type=str, choices=slot_locs, default="C2")
    parser.add_argument("--trough_slot", type=str, choices=slot_locs, default="B3")
    parser.add_argument("--fg", action="store_true", default=True)
    parser.add_argument("--dial_indicator", action="store_true", default=True)
    parser.add_argument("--tip_size", type=str, default="T1K", help="Tip Size")
    parser.add_argument("--max_z_distance", type=float, default=40)
    parser.add_argument("--min_z_distance", type=float, default=5)
    parser.add_argument("--mount_speed", type=float, default=5)
    parser.add_argument("--plunger_speed", type=float, default=11)
    parser.add_argument(
        "--sensor_threshold", type=float, default=160, help="Threshold in Pascals"
    )
    parser.add_argument("--expected_liquid_height", type=int, default=0)
    parser.add_argument("--log_pressure", action="store_true")
    parser.add_argument(
        "--port", type=str, default="/dev/ttyUSB0", help="Force Gauge Port"
    )
    args = parser.parse_args()
    if args.mount == "left":
        mount = OT3Mount.LEFT
    else:
        mount = OT3Mount.RIGHT
    if args.fg:
        fg = Mark10.create(port=args.port)
        fg.connect()

    if args.dial_indicator:

        gauge = dial_indicator_setup()
    asyncio.run(_main())
