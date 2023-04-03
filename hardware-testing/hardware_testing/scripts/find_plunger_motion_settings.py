"""Find plunger motion settings."""
import argparse
import asyncio

from opentrons.hardware_control.ot3api import OT3API

from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.opentrons_api.types import OT3Axis, OT3Mount


TEST_PASS_FAIL_MM = 0.1
TEST_NUM_TRIALS = 3

TEST_MAX_SPEED = 40  # mm/sec (creates ~600 ul/sec for P1000)
TEST_CURRENT = [0.3, 0.4, 0.5, 0.7, 1.0]  # amps
TEST_DISCONTINUITIES = [50, 30, 20, 15, 12, 10]  # mm/sec
TEST_ACCELERATIONS = [200, 150, 120, 100, 80]  # mm/sec/sec

DEFAULT_HOLD_CURRENT = 0.1

HOMING_CURRENT = 1.0
HOMING_SPEED = 10
HOMING_ACCELERATION = 50


async def _motion_settings(
    api: OT3API,
    mount: OT3Mount,
    current: float,
    discontinuity: float,
    acceleration: float,
    speed: float,
) -> None:
    pip_ax = OT3Axis.of_main_tool_actuator(mount)
    helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
        api, axis=pip_ax, hold_current=DEFAULT_HOLD_CURRENT, run_current=current
    )
    helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
        api,
        axis=pip_ax,
        acceleration=acceleration,
        default_max_speed=speed,
        max_speed_discontinuity=discontinuity,
        direction_change_speed_discontinuity=discontinuity,
    )
    await api.set_gantry_load(api.gantry_load)


async def _home(api: OT3API, mount: OT3Mount) -> None:
    pip_ax = OT3Axis.of_main_tool_actuator(mount)
    await _motion_settings(
        api,
        mount,
        current=HOMING_CURRENT,
        discontinuity=HOMING_SPEED,
        acceleration=HOMING_ACCELERATION,
        speed=HOMING_SPEED,
    )
    await api.home([pip_ax])
    # FIXME: moving plunger is required to align motor and encoder
    #        during simulation
    top, _, _, _ = helpers_ot3.get_plunger_positions_ot3(api, mount)
    await helpers_ot3.move_plunger_absolute_ot3(api, mount, top)


async def _test_dispense(
    api: OT3API,
    mount: OT3Mount,
    current: float,
    discontinuity: float,
    acceleration: float,
    speed: float = TEST_MAX_SPEED,
) -> bool:
    await _motion_settings(
        api,
        mount,
        current=current,
        discontinuity=discontinuity,
        acceleration=acceleration,
        speed=speed,
    )
    pip_ax = OT3Axis.of_main_tool_actuator(mount)
    _, _, blow_out, _ = helpers_ot3.get_plunger_positions_ot3(api, mount)
    position_ot3 = await api.current_position_ot3(mount)
    encoders_ot3 = await api.encoder_current_position_ot3(mount)
    diff = abs(encoders_ot3[pip_ax] - position_ot3[pip_ax])
    assert diff < TEST_PASS_FAIL_MM, (
        f"beginning test without encoder ({encoders_ot3[pip_ax]}) "
        f"and motor ({position_ot3[pip_ax]}) aligned"
    )
    await helpers_ot3.move_plunger_absolute_ot3(api, mount, blow_out)
    encoders_ot3 = await api.encoder_current_position_ot3(mount)
    diff = abs(encoders_ot3[pip_ax] - blow_out)
    return diff < TEST_PASS_FAIL_MM


async def _test_trails(
    api: OT3API,
    mount: OT3Mount,
    current: float,
    discontinuity: float,
    acceleration: float,
    speed: float,
) -> bool:
    for i in range(TEST_NUM_TRIALS):
        await _home(api, mount)
        passed = await _test_dispense(
            api,
            mount,
            current=current,
            discontinuity=discontinuity,
            acceleration=acceleration,
            speed=speed,
        )
        if not passed:
            print("fail")
            return False
        print(f"pass {i + 1}/{TEST_NUM_TRIALS}")
    return True


async def _main(is_simulating: bool) -> None:
    api = await helpers_ot3.build_async_ot3_hardware_api(
        is_simulating=is_simulating, pipette_left="p1000_single_v3.3"
    )
    mount = OT3Mount.LEFT
    pipette = api.hardware_pipettes[mount.to_mount()]
    if not pipette:
        raise RuntimeError("No pipette on the left mount")

    good_settings = []
    for current in TEST_CURRENT:
        for discontinuity in TEST_DISCONTINUITIES:
            print(
                f"testing discontinuity {discontinuity} mm/sec "
                f"at current {current} amps"
            )
            passed = await _test_trails(
                api,
                mount,
                current=current,
                discontinuity=discontinuity,
                acceleration=min(TEST_ACCELERATIONS),
                speed=discontinuity,
            )
            if passed:
                good_settings.append([current, discontinuity, None])
                break
    for i, vals in enumerate(good_settings):
        current, discontinuity, _ = vals  # type: ignore[assignment]
        for acceleration in TEST_ACCELERATIONS:
            print(
                f"testing acceleration {acceleration} mm/sec^2 "
                f"at current {current} amps and {discontinuity} mm/sec"
            )
            passed = await _test_trails(
                api,
                mount,
                current=current,
                discontinuity=discontinuity,
                acceleration=acceleration,
                speed=TEST_MAX_SPEED,
            )
            if passed:
                good_settings[i][-1] = acceleration
                break
    print("RESULTS")
    print("current\t\tdiscontinuity\tacceleration")
    for current, discontinuity, acceleration in good_settings:  # type: ignore[assignment]
        print(f"{current}\t\t{discontinuity}\t\t{acceleration}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--simulate", action="store_true")
    args = parser.parse_args()
    asyncio.run(_main(args.simulate))
