"""Test Plunger."""
from typing import Tuple, Dict, Literal, Callable

from opentrons.hardware_control.ot3api import OT3API
from dataclasses import dataclass

import time
from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.opentrons_api.types import Axis, OT3Mount
import enum
import argparse
import csv
import asyncio
from datetime import datetime

class TestSection(enum.Enum):
    """Test Section."""

    PLUNGER = "PLUNGER"

@dataclass
class TestConfig:
    """Test Config."""

    simulate: bool
    tests: Dict[TestSection, Callable]
    pipette: Literal[200, 1000]

PLUNGER_MAX_SKIP_MM = 0.1
SPEEDS_TO_TEST: float= 25
CURRENTS_SPEEDS: Dict[float, float] = {
    0.7: SPEEDS_TO_TEST,
}
async def _is_plunger_still_aligned_with_encoder(
    api: OT3API,
) -> Tuple[float, float, bool]:
    enc_pos = await api.encoder_current_position_ot3(OT3Mount.LEFT)
    motor_pos = await api.current_position_ot3(OT3Mount.LEFT)
    p_enc = enc_pos[Axis.P_L]
    p_est = motor_pos[Axis.P_L]
    is_aligned = abs(p_est - p_enc) < PLUNGER_MAX_SKIP_MM
    return p_enc, p_est, is_aligned

async def main(args, cfg ) -> None:
    """Run."""
    pipette_string = "p1000_96_v3.4" if cfg.pipette == 1000 else "p200_96_v3.0"

    api = await helpers_ot3.build_async_ot3_hardware_api(
        is_simulating=cfg.simulate,
        pipette_left=pipette_string,
        stall_detection_enable=False,
    )
    ax = Axis.P_L
    mount = OT3Mount.LEFT
    settings = helpers_ot3.get_gantry_load_per_axis_motion_settings_ot3(api, ax)
    settings.max_speed = 25
    settings.acceleration = 100
    settings.run_current = 0.7 
    default_current = settings.run_current
    default_speed = settings.max_speed
    default_acceleration = 100
    top, bottom, _, _ = helpers_ot3.get_plunger_positions_ot3(api, mount)
    print(f"Settings: {settings}")

    async def position_check() -> bool:
        est, enc, aligned = await _is_plunger_still_aligned_with_encoder(api)
        print(f"Estimate: {est}, Encoder: {enc}, Aligned: {aligned}")
        return aligned
    
    await api.home_z(OT3Mount.LEFT)
    home_pos = await api.gantry_position(OT3Mount.LEFT)
    # LOOP THROUGH CURRENTS + SPEEDS
    today = datetime.now().strftime("%m-%d-%y_%H-%M")
    with open(f'/data/testing_data/P200H_test_plunger_speed_test_{today}.csv', 'w', newline='') as csvfile:
        test_data = {'time(s)': None, 
                     'cycle': None, 
                     'stall': None, 
                     'position': None,
                     'position_check': None,
                     'Error': None}
        writer = csv.DictWriter(csvfile, test_data)
        writer.writeheader()
        start_time = time.time()
        try:
            currents = list(CURRENTS_SPEEDS.keys())
            for cycle in range(1, args.cycles+1):
                print(f'Cycle: {cycle}')
                for current in sorted(currents, reverse=True):
                    speed = CURRENTS_SPEEDS[current]
                    # HOME
                    print("homing...")
                    await api.home([ax])
                    print(f"run-current set to {current} amps")
                    await helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
                        api,
                        ax,
                        run_current=current,
                    )
                    await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
                        api, ax, default_max_speed=speed, acceleration=default_acceleration
                    )
                    # MOVE DOWN
                    print(f"moving down {bottom} mm at {speed} mm/sec")
                    position_checked = await position_check()
                    print(f"position checked: {position_checked}")
                    try:
                        await helpers_ot3.move_plunger_absolute_ot3(
                            api, mount, bottom, speed=speed, motor_current=current
                        )
                        down_passed = await position_check()
                        test_data['time(s)'] = time.time() - start_time
                        test_data['cycle'] = cycle
                        test_data['position'] = 'bottom'
                        test_data['position_check'] = down_passed
                        test_data['stall'] = 'NONE'
                        print(test_data)
                        writer.writerow(test_data)
                        csvfile.flush()
                    except Exception as e:
                        print('STALL DETECTION')
                        down_passed = await position_check()
                        test_data['position_check'] = down_passed
                        test_data['stall'] = str('Failed to move plunger down')
                        test_data['Error'] = str(e)
                        print(test_data)
                        writer.writerow(test_data)
                        csvfile.flush()
                        print("homing...")
                        await helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
                            api, ax, run_current=default_current
                        )
                        await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
                            api, ax, default_max_speed=default_speed, acceleration=default_acceleration
                        )
                        await api._backend.set_active_current({Axis.P_L: default_current})
                        await api.home([ax])
                        await helpers_ot3.move_plunger_absolute_ot3(
                            api, mount, bottom, speed=default_speed, motor_current=default_current
                        )
                    # MOVE UP
                    print(f"moving up {top} mm at {speed} mm/sec")
                    position_checked = await position_check()
                    print(f"position checked: {position_checked}")
                    await helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
                        api,
                        ax,
                        run_current=current,
                    )
                    await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
                        api, ax, default_max_speed=speed, acceleration=default_acceleration
                    )
                    try:
                        await helpers_ot3.move_plunger_absolute_ot3(
                            api, mount, 0, speed=speed, motor_current=current
                        )
                        up_passed = await position_check()
                        test_data['time(s)'] = time.time() - start_time
                        test_data['cycle'] = cycle
                        test_data['position'] = 'top'
                        test_data['position_check'] = up_passed
                        print(test_data)
                        writer.writerow(test_data)
                        test_data['stall'] = 'NONE'
                        csvfile.flush()
                    except Exception as e:
                        print('STALL DETECTION')
                        up_passed = await position_check()
                        test_data['stall'] = str('Failed to move plunger down')
                        test_data['position_check'] = up_passed
                        test_data['Error'] = str(e)
                        print(test_data)
                        writer.writerow(test_data)
                        csvfile.flush()
                    # RESET CURRENTS AND HOME
                    print("homing...")
                    await helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
                        api, ax, run_current=default_current
                    )
                    await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
                        api, ax, default_max_speed=default_speed, acceleration=default_acceleration
                    )
                    await api._backend.set_active_current({Axis.P_L: default_current})

        except Exception as e:
            writer['Error'] = str(e)
            writer.writerow(test_data)
            csvfile.flush()
            raise Exception(f"Error StallDetection: {e}")
        
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cycles", type=int, default=100000)
    parser.add_argument("--simulate", action="store_true")
    parser.add_argument("--pipette", type=int, choices=[200, 1000], default=200)
    args = parser.parse_args()
    _config = TestConfig(
        simulate=args.simulate, tests=['PLUNGER'], pipette=args.pipette
    )
    
    asyncio.run(main(args, _config))
        
