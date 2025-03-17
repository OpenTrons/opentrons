"""Test OT3 Plunger."""
import argparse
import asyncio

from hardware_testing.opentrons_api import types
from hardware_testing.opentrons_api import helpers_ot3


async def _main(is_simulating: bool) -> None:
    api = await helpers_ot3.build_async_ot3_hardware_api(
        is_simulating=is_simulating, pipette_left="p1000_single_v3.3"
    )
    mount = types.OT3Mount.LEFT
    pipette = api.hardware_pipettes[mount.to_mount()]
    if not pipette:
        raise RuntimeError("No pipette on the left mount")

    # home the plunger
    await api.home_plunger(mount)

    # move the plunger based on volume (aspirate/dispense)
    api.add_tip(mount, tip_length=10)
    await api.prepare_for_aspirate(mount)
    max_vol = pipette.working_volume
    for vol in [max_vol, max_vol / 2, max_vol / 10]:
        await api.aspirate(mount, volume=vol)
        await api.dispense(mount, volume=vol, is_full_dispense=True)
        await api.prepare_for_aspirate(mount)
    api.remove_tip(mount)

    # move the plunger based on position (millimeters)
    plunger_poses = helpers_ot3.get_plunger_positions_ot3(api, mount)
    top, bottom, blowout, drop_tip = plunger_poses
    await helpers_ot3.move_plunger_absolute_ot3(api, mount, bottom)  # absolute
    await helpers_ot3.move_plunger_relative_ot3(api, mount, -10)  # relative
    await helpers_ot3.move_plunger_absolute_ot3(api, mount, blowout)
    await helpers_ot3.move_plunger_absolute_ot3(
        api, mount, drop_tip, speed=5, motor_current=1.0
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--simulate", action="store_true")
    args = parser.parse_args()
    asyncio.run(_main(args.simulate))
