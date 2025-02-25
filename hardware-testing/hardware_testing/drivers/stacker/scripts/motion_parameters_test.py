import os
import sys
sys.path.append('../../')
from hardware_testing.drivers import stacker
from hardware_testing.drivers.stacker import AXIS, DIR
from hardware_testing.drivers import mitutoyo_digimatic_indicator as dial_indicator
import csv
import time
from typing import Dict
import numpy as np
import argparse

TEST_PARAMETERS: Dict[str, Dict[str, Dict[str, Dict[str, float]]]] = {
    "Plate_stacker": {
        "X": {
            "SPEED": {"MIN": 50, "MAX": 300, "INC": 50},
            "ACCEL": {"MIN": 100, "MAX": 2000, "INC": 500},
            "CURRENT": {"MIN": 0.5, "MAX": 2.0, "INC": 0.1}
        },
        "Z": {
            "SPEED": {"MIN": 50, "MAX": 300, "INC": 50},
            "ACCEL": {"MIN": 100, "MAX": 2000, "INC": 10},
            "CURRENT": {"MIN": 0.7, "MAX": 2.0, "INC": 0.1}
        },
        "L": {
            "SPEED": {"MIN": 100, "MAX": 100, "INC": 10},
            "ACCEL": {"MIN": 800, "MAX": 800, "INC": 50},
            "CURRENT": {"MIN": 0.8, "MAX": 0.8, "INC": 0.1}
        },
    },
}
# print(f'{TEST_PARAMETERS}')

def build_arg_parser():
    arg_parser = argparse.ArgumentParser(description="Motion Parameter Test Script")
    arg_parser.add_argument("-c", "--cycles", default = 5, help = "number of cycles to execute")
    arg_parser.add_argument("-a", "--axis", default = AXIS.L, help = "Choose a Axis")
    arg_parser.add_argument("-g", "--gauge", default = False, type=bool,  help = "gauge")
    # arg_parser.add_argument("-")
    return arg_parser

def parameter_range(test_axis: str, p_type: str) -> np.ndarray:
    """Makes a range of a parameter based on start, stop, step."""
    start = TEST_PARAMETERS["Plate_stacker"][test_axis][p_type]["MIN"]
    step = TEST_PARAMETERS["Plate_stacker"][test_axis][p_type]["INC"]

    if step == 0:
        return np.array([start])
    else:
        # add step to stop to make range inclusive
        stop = TEST_PARAMETERS["Plate_stacker"][test_axis][p_type]["MAX"] + step*0.5
        # print(start)
        # print(stop)
        # print(step)
        return np.arange(start, stop, step)


TABLE_RESULTS_KEY: Dict[str, Dict[float, int]] = {}

# dictionary containing lists of all speed/accel/current combinations to for each axis
def make_test_list(test_axis) -> Dict[str, list]:
    """Make test list dictionary."""
    test_axis = list(test_axis)
    complete_test_list: Dict[str, list] = {}
    for axis_t in test_axis:
        axis_test_list = []
        TABLE_RESULTS_KEY[axis_t] = {}
        c_i = 0
        s_i = 0
        a_i = 0
        for current_t in parameter_range(axis_t, "CURRENT"):
            TABLE_RESULTS_KEY[axis_t][current_t] = c_i
            c_i = c_i + 1
            s_i = 0
            for speed_t in parameter_range(axis_t, "SPEED"):
                TABLE_RESULTS_KEY[axis_t][speed_t] = s_i
                s_i = s_i + 1
                a_i = 0
                for accel_t in parameter_range(axis_t, "ACCEL"):
                    TABLE_RESULTS_KEY[axis_t][accel_t] = a_i
                    a_i = a_i + 1
                    axis_test_list.append(
                        {"CURRENT": current_t, "SPEED": speed_t, "ACCEL": accel_t}
                    )

        complete_test_list[axis_t] = axis_test_list

    return complete_test_list


if __name__ == '__main__':
    arg_parser = build_arg_parser()
    options = arg_parser.parse_args()
    s = stacker.FlexStacker(None).create('/dev/ttyACM1')
    if options.gauge == True:
        print('Connecting to dial indicator')
        gauge = dial_indicator.Mitutoyo_Digimatic_Indicator('/dev/ttyUSB0')
        gauge.connect()
        home_reading = gauge.read_stable()
        print(f'home reading: {home_reading}')
    test_axis = AXIS.L
    # # Home the Axis being tested
    # s.set_run_current(1.5, test_axis)
    s.set_ihold_current(0.6, test_axis)
    list_1 = make_test_list(test_axis)
    # Loop through motor current
    # Loop through accelerations
    # Loop through velocity
    s.close_latch()
    s.open_latch()
    title_time = time.time()
    if test_axis == AXIS.X:
        TOTAL_TRAVEL = 192.5
        s.home(test_axis, DIR.POSITIVE_HOME)
        axis_str = 'X'
        sw_axis = 'XE'
        msd = s.max_speed_discontinuity_x
        run_current = 1.5
    elif test_axis == AXIS.Z:
        TOTAL_TRAVEL = 136
        s.home(test_axis, DIR.NEGATIVE_HOME)
        axis_str = 'Z'
        sw_axis = 'ZE'
        msd = s.max_speed_discontinuity_z
        run_current = 1.5
    elif test_axis == AXIS.L:
        TOTAL_TRAVEL = 22
        s.home(test_axis, DIR.NEGATIVE_HOME)
        axis_str = 'L'
        sw_axis = 'LR'
        msd = s.max_speed_discontinuity_l
        run_current = 0.8
    else:
        raise("NO AXIS CHOSEN!!!")
    with open(f'/data/motion_parameters_{test_axis}_msd_{msd}_{title_time}.csv', 'w', newline='') as file:
        writer = csv.writer(file)
        fields = ["Cycle", "Position 1", "Position 2", "Position 3",
                    "SW_State_1", "SW_STATE_2", "SW_STATE_3", "MOTOR_CURRENT", "VELOCITY", "ACCELERATION"]
        writer.writerow(fields)
        for c in range(1, options.cycles+1):
            print(f'Cycle Count: {c}')
            for settings in list_1[axis_str]:
                print(settings)
                sw_states = s.get_sensor_states()
                print(sw_states)
                if sw_states[sw_axis] == '1':
                    sw_state_1 = sw_states[sw_axis]
                    print(f'Limite Switch Statues: {sw_state_1}')
                    time.sleep(1)
                    if options.gauge == True:
                        home_reading = gauge.read_stable()
                        print(f'home reading: {home_reading}')
                        t0 = time.time()
                else:
                    s.set_run_current(run_current, test_axis)
                    s.home(test_axis, DIR.POSITIVE_HOME, s.home_speed, s.home_acceleration)
                    if options.gauge == True:
                        home_reading = gauge.read_stable()
                        t0 = time.time()
                        print(f'home reading: {home_reading}')
                        sw_state_1 = s.get_sensor_states()[sw_axis]
                        print(f'SW state 1: {sw_state_1}')
                s.set_run_current(settings['CURRENT'], test_axis)
                t1 = time.time()
                delta_1 = t1 - t0
                print(f'time: {delta_1}')
                s.move(test_axis,
                                TOTAL_TRAVEL, # 202 - 4 = 201
                                DIR.NEGATIVE,
                                settings['SPEED'],
                                settings['ACCEL'])
                t2 = time.time()
                delta_2 = t2 - t1
                print(f'time: {delta_2}')
                s.move(test_axis,
                                TOTAL_TRAVEL-5, # 202 -4 = 200
                                DIR.POSITIVE,
                                settings['SPEED'],
                                settings['ACCEL'])
                t3 = time.time()
                delta_3 = t3 - t2
                print(f'time: {delta_3}')
                sw_state_2 = s.get_sensor_states()[sw_axis]
                print(f'SW State 2: {sw_state_2}')
                time.sleep(1)
                if options.gauge == True:
                    position_2 = gauge.read_stable()
                    print(f'position_2: {position_2}')
                s.set_run_current(1.5, test_axis)
                s.move(test_axis,
                                5, # 201 - 200 = 1
                                DIR.POSITIVE,
                                settings['SPEED'],
                                settings['ACCEL'])
                t4 = time.time()
                delta_4 = t4 - t3
                print(f'time: {delta_3}')
                sw_state_3 = s.get_sensor_states()[sw_axis]
                print(f'SW State 3: {sw_state_3}')
                time.sleep(1)
                if options.gauge == True:
                    position_3 = gauge.read_stable()
                    print(f'position_3: {position_3}')
                    data = [c, home_reading, position_2, position_3, sw_state_1, sw_state_2, sw_state_3,
                            settings['CURRENT'], settings['SPEED'], settings['ACCEL'],
                            msd, t0, t1, t2, t3, t4]
                    writer.writerow(data)
                    file.flush()
        # Move to full distance - 1mm, measure the limit switch,
        # Move 1mm to photo interrupter and read switch state
        # Record
        # Home
