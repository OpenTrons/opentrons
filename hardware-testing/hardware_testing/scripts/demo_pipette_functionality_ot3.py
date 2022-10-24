"""Demo OT3 Gantry Functionality."""
import argparse
import asyncio
from typing import Tuple

from hardware_testing.opentrons_api.types import GantryLoad, OT3Mount, OT3Axis, Point
from hardware_testing.opentrons_api.helpers_ot3 import (
    OT3API,
    build_async_ot3_hardware_api,
    home_ot3,
    get_endstop_position_ot3,
    move_plunger_absolute_ot3,
)

MOUNT = OT3Mount.LEFT
LOAD = GantryLoad.NONE
PIPETTE_SPEED = 10


def _create_relative_point(axis: OT3Axis, distance: float) -> Point:
    if axis == OT3Axis.X:
        return Point(x=distance)
    elif axis == OT3Axis.Y:
        return Point(y=distance)
    elif axis == OT3Axis.Z_L or axis == OT3Axis.Z_R:
        return Point(z=distance)
    raise ValueError(f"Unexpected axis: {axis}")


async def _test_encoder(api: OT3API, distance: float = 10) -> None:
    pos_start = await api.current_position(mount=MOUNT, refresh=True)
    enc_start = await api.encoder_current_position(mount=MOUNT, refresh=True)
    input("ready?")
    await move_plunger_absolute_ot3(api, MOUNT, distance)
    pos_end = await api.current_position_ot3(mount=MOUNT, refresh=True)
    enc_end = await api.encoder_current_position(mount=MOUNT, refresh=True)
    print(f"Position:\n\tstart={pos_start}\n\tend={pos_end}")
    print(f"Encoder:\n\tstart={enc_start}\n\tend={enc_end}")


async def _test_limit_switch(
    api: OT3API, axis: OT3Axis, tolerance: float = 0.5
) -> None:
    def _points_before_after_switch(tolerance_delta: Point) -> Tuple[Point, Point]:
        endstop_pos = get_endstop_position_ot3(api, mount=MOUNT)
        pos_not_touching = endstop_pos - tolerance_delta
        pos_touching = endstop_pos + tolerance_delta
        return pos_not_touching, pos_touching

    # calculate two positions: 1) before the switch, and 2) after the switch
    poses = _points_before_after_switch(_create_relative_point(axis, tolerance))
    # now move close, but don't touch
    await api.move_to(mount=MOUNT, abs_position=poses[0])
    switches = await api.get_limit_switches()
    assert (
        switches[axis] is False
    ), f"switch on axis {axis} is PRESSED when it should not be"
    # finally, move so that we definitely are touching the switch
    await api.move_to(mount=MOUNT, abs_position=poses[1])
    switches = await api.get_limit_switches()
    assert (
        switches[axis] is True
    ), f"switch on axis {axis} is NOT pressed when it should be"


async def _main(is_simulating: bool) -> None:
    api = await build_async_ot3_hardware_api(is_simulating=is_simulating)
    await api.cache_instruments()
    await home_ot3(api, [OT3Axis.X, OT3Axis.Y, OT3Axis.Z_L, OT3Axis.Z_R])
    switches = await api.get_limit_switches()
    print(f"Switches: {switches}")
    await api.home_plunger(MOUNT)
    await _test_encoder(api, distance=10)
    input("Enter to disengage the pipette")
    await api.disengage_axes([OT3Axis.of_main_tool_actuator(MOUNT)])
    input("ENTER to re-engage")
    await api.engage_axes([OT3Axis.of_main_tool_actuator(MOUNT)])
    input("Check Motor if engaged")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--simulate", action="store_true")
    args = parser.parse_args()
    asyncio.run(_main(args.simulate))
