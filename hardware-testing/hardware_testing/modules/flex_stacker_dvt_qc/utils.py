"""Utility functions for the Flex Stacker EVT QC module."""
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
)

from .driver import FlexStackerInterface as FlexStacker
from opentrons.drivers.flex_stacker.types import StackerAxis, Direction


async def test_limit_switches_per_direction(
    stacker: FlexStacker,
    axis: StackerAxis,
    direction: Direction,
    report: CSVReport,
    section: str,
    speed: float | None = None,
    acceleration: float | None = None,
    current: float | None = None,
) -> None:
    """Sequence to test the limit switch for one direction."""
    ui.print_header(f"{axis} Limit Switch - {direction} direction")
    # first make sure switch is not already triggered by moving in the opposite direction
    if await stacker._driver.get_limit_switch(axis, direction):
        print(f"{direction} switch already triggered, moving away...\n")
        SAFE_DISTANCE_MM = 10

        await stacker.move_axis(
            axis, direction.opposite(), SAFE_DISTANCE_MM, speed, acceleration, current
        )

    # move until the limit switch is reached
    print(f"moving towards {direction} limit switch...\n")
    await stacker.home_axis(axis, direction, speed, acceleration, current)

    result = await stacker._driver.get_limit_switch(axis, direction)
    opposite_result = not await stacker._driver.get_limit_switch(
        axis, direction.opposite()
    )
    print(f"{direction} switch triggered: {result}")
    print(f"{direction.opposite()} switch untriggered: {opposite_result}")
    report(
        section,
        f"limit-switch-trigger-{direction}-untrigger-{direction.opposite()}",
        [result, opposite_result, CSVResult.from_bool(result and opposite_result)],
    )
