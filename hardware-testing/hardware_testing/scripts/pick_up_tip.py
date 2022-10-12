"""Demo OT3 Gantry Functionality."""
import argparse
import ast
import asyncio
import csv
from typing import Tuple, Dict, Optional
from threading import Thread

from opentrons.hardware_control.motion_utilities import target_position_from_plunger
from hardware_testing.opentrons_api.types import GantryLoad, OT3Mount, OT3Axis, Point
from hardware_testing.opentrons_api.helpers_ot3 import (
    OT3API,
    build_async_ot3_hardware_api,
    GantryLoadSettings,
    set_gantry_load_per_axis_settings_ot3,
    home_ot3,
    get_endstop_position_ot3,
    move_plunger_absolute_ot3,
    update_pick_up_current,
    update_pick_up_distance
)

from hardware_testing import data
from hardware_testing.drivers.mark10 import Mark10

MOUNT = OT3Mount.LEFT
PIPETTE_SPEED = 10

SPEED_XY = 500
SPEED_Z = 250

pick_up_speed = 10
press_distance = 30

def _create_relative_point(axis: OT3Axis, distance: float) -> Point:
    if axis == OT3Axis.X:
        return Point(x=distance)
    elif axis == OT3Axis.Y:
        return Point(y=distance)
    elif axis == OT3Axis.Z_L or axis == OT3Axis.Z_R:
        return Point(z=distance)
    raise ValueError(f"Unexpected axis: {axis}")

async def get_encoder_position(
    api: OT3API, mount: OT3Mount) -> Dict[OT3Axis, float]:
    enc_position = await api.encoder_current_position(mount=MOUNT, refresh=True)
    return enc_position

async def jog(api: OT3API)-> Dict[OT3Axis, float]:
    jog = True
    cur_pos = await api.current_position_ot3(MOUNT)
    print(f"X: {cur_pos[0]}, Y: {cur_pos[1]}, Z: {cur_pos[2]}")
    while jog:
        print(f"Enter coordinates as example: 100,10,3")
        coord = ast.literal_eval(input('Enter Coordinates as: '))
        if isinstance(coord, tuple):
            api.move_to(MOUNT, Point(coord[0], coord[1], coord[2]))
            cur_pos = await api.current_position_ot3(MOUNT)
            print(f"X: {cur_pos[0]}, Y: {cur_pos[1]}, Z: {cur_pos[2]}")
        else:
            jog = False
    return  await api.current_position_ot3(MOUNT)

async def set_default_current_settings(api: OT3API, load: Optional[GantryLoad] = None):
    default_run_settings = {
        OT3Axis.X: GantryLoadSettings(
            max_speed=SPEED_XY,
            acceleration=2000,
            max_start_stop_speed=0,
            max_change_dir_speed=0,
            hold_current=0.1,
            run_current=1.4,
        ),
        OT3Axis.Y: GantryLoadSettings(
            max_speed=SPEED_XY,
            acceleration=2000,
            max_start_stop_speed=0,
            max_change_dir_speed=0,
            hold_current=0.1,
            run_current=1.4,
        ),
        OT3Axis.Z_L: GantryLoadSettings(
            max_speed=SPEED_Z,
            acceleration=1500,
            max_start_stop_speed=0,
            max_change_dir_speed=0,
            hold_current=0.1,
            run_current=1.0,
        ),
        OT3Axis.Z_R: GantryLoadSettings(
            max_speed=SPEED_Z,
            acceleration=1500,
            max_start_stop_speed=0,
            max_change_dir_speed=0,
            hold_current=0.1,
            run_current=1.0,
        ),
    }
    if load is None:
        LOAD = api.gantry_load
    set_gantry_load_per_axis_settings_ot3(api,
                                        default_run_settings,
                                        load=LOAD
                                        )
    await api.set_gantry_load(gantry_load=LOAD)

async def set_current_settings(api: OT3API, motor_current: float, load: Optional[GantryLoad] = None):
    z_pickup_run_settings = {
        OT3Axis.X: GantryLoadSettings(
            max_speed=SPEED_XY,
            acceleration=2000,
            max_start_stop_speed=0,
            max_change_dir_speed=0,
            hold_current=0.1,
            run_current=1.4,
        ),
        OT3Axis.Y: GantryLoadSettings(
            max_speed=SPEED_XY,
            acceleration=2000,
            max_start_stop_speed=0,
            max_change_dir_speed=0,
            hold_current=0.1,
            run_current=1.4,
        ),
        OT3Axis.Z_L: GantryLoadSettings(
            max_speed=SPEED_Z,
            acceleration=1500,
            max_start_stop_speed=0,
            max_change_dir_speed=0,
            hold_current=0.1,
            run_current=motor_current,
        ),
        OT3Axis.Z_R: GantryLoadSettings(
            max_speed=SPEED_Z,
            acceleration=1500,
            max_start_stop_speed=0,
            max_change_dir_speed=0,
            hold_current=0.1,
            run_current=motor_current,
        ),
    }
    if load is None:
        LOAD = api.gantry_load
    set_gantry_load_per_axis_settings_ot3(api,
                                            z_pickup_run_settings,
                                            load=LOAD)
    await api.set_gantry_load(gantry_load=LOAD)

async def pick_up_function(api: OT3API,
                            loc, speed, press_distance):
    # Pick up tip function
    await api.move_to(MOUNT,
                        Point(loc[0], loc[1], loc_[2]-press_distance),
                        speed = speed)

async def update_tip_spec(api, action):
    if action == 'pickup':
        realmount = OT3Mount.from_mount(MOUNT)
        spec, _add_tip_to_instrs = api._pipette_handler.plan_check_pick_up_tip(
            realmount, 78.5, None, None
        )
        _add_tip_to_instrs()
    elif action == 'drop_tip':
        realmount = OT3Mount.from_mount(MOUNT)
        spec, _remove = self._pipette_handler.plan_check_drop_tip(realmount, home_after)
        _remove()
    else:
        raise("Pass a pickup or drop_tip to function")

async def _main(api: OT3API) -> None:
    hw_api = await build_async_ot3_hardware_api(is_simulating=args.simulate,
                                    use_defaults=True)
    await set_default_current_settings(api)
    await home_ot3(api, [OT3Axis.X, OT3Axis.Y, OT3Axis.Z_L, OT3Axis.Z_R])
    await api.cache_instruments()
    await api.home_plunger(MOUNT)
    if args.fg_jog:
        fg_loc = await jog(api)
    if args.tiprack:
        tiprack_loc = await jog(api)
    if args.trough:
        trough_loc = await jog(api)

    while True:
        await set_default_current_settings(api)
        cur_pos = await api.current_position_ot3(MOUNT)
        z_pos = cur_pos[OT3Axis.by_mount(MOUNT)]
        m_current = float(input("motor_current in amps: "))
        await api.move_to(MOUNT, Point(fg_loc[0], fg_loc[1], z_pos))
        # Move pipette to Force Gauge calibrated location
        await api.move_to(MOUNT, Point(fg_loc[0], fg_loc[1], fg_loc[2]))
        location = 'Force_Gauge'
        force_thread = Thread(target=force_record, args=(m_current,location,))
        encoder_position = get_encoder_position(api, MOUNT)
        force_thread.start()
        await set_current_settings(api, m_current)
        # Move pipette to Force Gauge press location
        await api.move_to(MOUNT,
                            Point(fg_loc[0], fg_loc[1], fg_loc[2] - press_distance),
                            speed = pick_up_speed)
        encoder_position = get_encoder_position(api, MOUNT)
        stop_threads = True
        force_thread.join() #Thread Finished
        # -365 is for the other robot
        await set_default_current_settings(api)
        await api.home_z(MOUNT, allow_home_other = False)
        # Obtain the current position of the Z mount
        cur_pos = await api.current_position_ot3(MOUNT)
        z_pos = cur_pos[OT3Axis.by_mount(MOUNT)]
        # Move over to the TipRack location and
        await api.move_to(MOUNT, Point(tiprack_loc[0], tip_rack_loc[1], z_pos))
        # Start recording the encoder
        location = 'Tiprack'
        enc_thread = Thread(target=force_record, args=(m_current,location,))
        encoder_start = get_encoder_position(api, MOUNT)
        enc_thread.start()
        # Move Pipette to top of Tip Rack Location
        await api.move_to(MOUNT, Point(tiprack_loc[0], tiprack_loc[1], tip_rack_loc[2]))
        # Press Pipette into the tip
        await set_current_settings(api, m_current)
        await api.move_to(MOUNT,
                            Point(tiprack_loc[0],
                                tiprack_loc[1],
                                tip_rack_loc[2]-press_distance),
                                speed = pick_up_speed
                        )
        encoder_end = get_encoder_position(api, MOUNT)
        stop_threads = True
        enc_thread.join() #Thread Finished
        # Reset Current Settings
        await set_default_current_settings(api)
        # Home Z
        await api.home_z(MOUNT, allow_home_other = False)
        input("Feel the Tip")
    hw_api.clean_up()

    # cur_pos = await api.current_position_ot3(MOUNT)
    # z_pos = cur_pos[OT3Axis.by_mount(MOUNT)]
    # await api.move_to(MOUNT, Point(302, 58.5, z_pos))
    # await update_pick_up_current(api, MOUNT, 0.01)
    # await update_pick_up_distance(api, MOUNT, 100)
    # await api.pick_up_tip(MOUNT, 78.3)
    # await api.drop_tip(MOUNT, home_after = False)
    await api.disengage_axes([OT3Axis.of_main_tool_actuator(MOUNT)])

def force_record(motor_current, location):
    file_name = "results/force_pu_test_%s-%s-%s.csv" %(motor_current,
                            datetime.datetime.now().strftime("%m-%d-%y_%H-%M"),
                            location)
    print(file_name)
    with open(file_name, 'w', newline='') as f:
        test_data = {'time(s)':None,
                    'Force(N)':None,
                    'M_current(amps)':None,
                    'enc_pos(mm)': None}
        log_file = csv.DictWriter(f, test_data)
        log_file.writeheader()
        fg._timer.start()
        try:
            motion = True
            while motion:
                reading = float(FG.get_reading())
                test_data['time(s)'] = fg._timer.elasped_time()
                test_data['Force(N)'] = reading
                test_data['M_current(amps)'] = motor_current
                test_data['encoder_pos(mm)'] = encoder_position
                log_file.writerow(test_data)
                print(test_data)
                f.flush()
                if stop_threads:
                    break
        except KeyboardInterrupt:
            print("Test Cancelled")
            test_data['Errors'] = "Test Cancelled"
            f.flush()
        except Exception as e:
            print("ERROR OCCURED")
            test_data['Errors'] = e
            f.flush()
            raise e
        print("Test done")
        f.flush()
        f.close()

def enc_record(motor_current, location):
    file_name = "results/enc_pu_test_%s-%s-%s.csv" %(motor_current,
                            datetime.datetime.now().strftime("%m-%d-%y_%H-%M"),
                            location)
    print(file_name)
    with open(file_name, 'w', newline='') as f:
        test_data = {'time(s)':None,
                    'start_enc_pos':None,
                    'end_enc_pos(mm)': None}
        log_file = csv.DictWriter(f, test_data)
        log_file.writeheader()
        fg._timer.start()
        try:
            motion = True
            stop_threads = False
            while motion:
                reading = float(FG.get_reading())
                test_data['time(s)'] = fg._timer.elasped_time()
                test_data['start_enc_pos(mm)'] = encoder_start
                test_data['end_enc_pos(mm)'] = encoder_end
                log_file.writerow(test_data)
                print(test_data)
                f.flush()
                if stop_threads:
                    break
        except KeyboardInterrupt:
            print("Test Cancelled")
            test_data['Errors'] = "Test Cancelled"
            f.flush()
        except Exception as e:
            print("ERROR OCCURED")
            test_data['Errors'] = e
            f.flush()
            raise e
        print("Test done")
        f.flush()
        f.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--simulate", action="store_true")
    parser.add_argument("--fg_jog", action="store_true")
    parser.add_argument("--trough", action="store_true")
    parser.add_argument("--tiprack", action="store_true")
    parser.add_argument("--cycles", type=int,
                            default = 1000, help = "Number of Cycles to run")
    parser.add_argument("--port", type=str,
                        default = '/dev/ttyUSB0', help = "Force Gauge Port")
    args = parser.parse_args()
    fg = Mark10.create(port=args.port)
    fg.connect()
    asyncio.run(_main(args.simulate))
