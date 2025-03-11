"""Test X Axis."""
from typing import List, Union, Tuple, Optional
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .driver import FlexStackerInterface as FlexStacker, FlexStackerStallError
from opentrons.drivers.flex_stacker.driver import STACKER_MOTION_CONFIG
from opentrons.drivers.flex_stacker.types import StackerAxis, Direction

TEST_AXIS = StackerAxis.Z
HOME_SPEED = STACKER_MOTION_CONFIG[TEST_AXIS]["home"].max_speed
HOME_CURRENT = STACKER_MOTION_CONFIG[TEST_AXIS]["home"].current

TEST_SPEEDS = [150, 165]  # mm/s
TEST_CURRENTS = [1.5, 1.0, 0.7, 0.6, 0.5]  # A rms
TEST_ACCELERATION = STACKER_MOTION_CONFIG[TEST_AXIS]["move"].acceleration
CURRENT_THRESHOD = 0.7  # A rms
TEST_TRIALS = 10
TEST_DIRECTIONS = [Direction.RETRACT, Direction.EXTEND]

# All units in mm
# This number SHOULD be the distance between the bottom and top lsw, currently
# it seems to be off, correct this for DVT
AXIS_TRAVEL = 137
BOTTOM_OFFSET = 10  # Distance to be off of springs above bottom lsw
TOP_OFFSET = 2  # this should be elimiated once we correct axis travel
AXIS_TOLERANCE = 1  # Distance tolerance of AXIS_TRAVEL in ONE direction
MOVEMENT_TOLERANCE = 0.5  # Maximum allowed movement error in ONE direction


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    lines: List[Union[CSVLine, CSVLineRepeating]] = []
    for speed in TEST_SPEEDS:
        for current in TEST_CURRENTS:
            tag = f"speed-{speed}-current-{current}"
            lines.append(
                CSVLine(f"{tag}-success-failed-pass%", [int, int, float, CSVResult])
            )
            lines.append(CSVLine(f"{tag}-extend-distance", [float] * TEST_TRIALS))
            lines.append(CSVLine(f"{tag}-retract-distance", [float] * TEST_TRIALS))
    return lines


async def test_extend_cycle(
    stacker: FlexStacker,
    speed: int,
    current: float,
) -> Tuple[bool, float]:
    """Test one extend cycle."""
    # Home to retract position if we are not already on the switch
    if not await stacker._driver.get_limit_switch(TEST_AXIS, Direction.RETRACT):
        await stacker.home_axis(TEST_AXIS, Direction.RETRACT)

    # move at homing speed off of the springs at the bottom
    await stacker.move_axis(
        TEST_AXIS, Direction.EXTEND, BOTTOM_OFFSET, HOME_SPEED, None, HOME_CURRENT
    )
    try:
        # Move at the testing speed/current to a position just before the limit
        # switch minus the expected tolerance
        extend_distance = (
            AXIS_TRAVEL
            - BOTTOM_OFFSET
            + TOP_OFFSET
            - AXIS_TOLERANCE
            - MOVEMENT_TOLERANCE
        )
        await stacker.move_axis(
            TEST_AXIS,
            Direction.EXTEND,
            extend_distance,
            speed,
            TEST_ACCELERATION,
            current,
        )

        # Move to the farthest position the limit switch could be
        check_distance = 2 * AXIS_TOLERANCE + 2 * MOVEMENT_TOLERANCE
        try:
            await stacker.move_axis(
                TEST_AXIS,
                Direction.EXTEND,
                check_distance,
                HOME_SPEED,
                0,
                HOME_CURRENT,
            )
        except Exception:
            pass
        # If limit switch is triggered, we did not stall
        if await stacker._driver.get_limit_switch(TEST_AXIS, Direction.EXTEND):
            # The limit switch was triggered within this amount of distance
            movement_distance = round(
                (AXIS_TRAVEL + TOP_OFFSET + AXIS_TOLERANCE + MOVEMENT_TOLERANCE), 2
            )
            ui.print_info(
                f"Z Axis, Extend, PASS, {speed}mm/s, {current}A, {movement_distance}mm"
            )
            return True, movement_distance
    except FlexStackerStallError:
        ui.print_error("unexpected axis stall!")
    # If we reach this point, limit switch did not trigger in expected distance
    # Probable stall, Movement distance is unknown, return 0
    return False, 0


async def test_retract_cycle(
    stacker: FlexStacker,
    speed: int,
    current: float,
) -> Tuple[bool, float]:
    """Test one retract cycle."""
    # Home to extend position if we are not already on the switch
    if not await stacker._driver.get_limit_switch(TEST_AXIS, Direction.EXTEND):
        await stacker.home_axis(TEST_AXIS, Direction.EXTEND)

    try:
        # moving at the testing speed and current to just above the springs
        retract_distance: float = (AXIS_TRAVEL + TOP_OFFSET) - BOTTOM_OFFSET
        await stacker.move_axis(
            TEST_AXIS,
            Direction.RETRACT,
            retract_distance,
            speed,
            TEST_ACCELERATION,
            current,
        )

        # moving at homing speed to a position just before the limit
        # switch minus the expected tolerance
        retract_distance = BOTTOM_OFFSET - AXIS_TOLERANCE - MOVEMENT_TOLERANCE
        await stacker.move_axis(
            TEST_AXIS, Direction.RETRACT, retract_distance, HOME_SPEED, 0, HOME_CURRENT
        )

        # Move to the farthest position the limit switch could be
        check_distance = 2 * AXIS_TOLERANCE + 2 * MOVEMENT_TOLERANCE
        try:
            await stacker.move_axis(
                TEST_AXIS,
                Direction.RETRACT,
                check_distance,
                HOME_SPEED,
                0,
                HOME_CURRENT,
            )
        except Exception:
            pass
        # If limit switch is triggered, we did not stall
        if await stacker._driver.get_limit_switch(TEST_AXIS, Direction.RETRACT):
            # The limit switch was triggered within this amount of distance
            movement_distance = round(
                (AXIS_TRAVEL + TOP_OFFSET + AXIS_TOLERANCE + MOVEMENT_TOLERANCE), 2
            )
            ui.print_info(
                f"Z Axis, Retract, PASS, {speed}mm/s, {current}A, {movement_distance}mm"
            )
            return True, movement_distance
    except FlexStackerStallError:
        ui.print_error("unexpected axis stall!")
    # If we reach this point, limit switch did not trigger in expected distance
    # Probable stall, Movement distance is unknown, return 0
    return False, 0


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    for speed in TEST_SPEEDS:
        for current in TEST_CURRENTS:
            tag = f"speed-{speed}-current-{current}"
            ui.print_header(f"Z Speed: {speed} mm/s, Current: {current} A")
            trial = 0
            failures = 0
            extend_data: List[Optional[float]] = [None] * TEST_TRIALS
            retract_data: List[Optional[float]] = [None] * TEST_TRIALS
            while trial < TEST_TRIALS:
                # Test extend direction first
                extend, dist = await test_extend_cycle(stacker, speed, current)
                extend_data[trial] = dist
                if not extend:
                    ui.print_error(
                        f"Z Axis extend failed at speed {speed} mm/s, "
                        f"current {current} A, Distance {dist} mm"
                    )
                    failures += 1
                    trial += 1
                    continue

                # Test extend direction
                retract, dist = await test_retract_cycle(stacker, speed, current)
                retract_data[trial] = dist
                if not retract:
                    ui.print_error(
                        f"Z Axis retract failed at speed {speed} mm/s, "
                        f"current {current} A, Distance {dist} mm"
                    )
                    failures += 1
                trial += 1

            success_trials = trial - failures
            success_rate = (1 - failures / trial) * 100
            if current >= CURRENT_THRESHOD:
                # If current is above threshold, all trials must pass
                result = CSVResult.from_bool(success_rate == 100.0)
            else:
                result = CSVResult.PASS
            report(
                section,
                f"speed-{speed}-current-{current}-success-failed-pass%",
                [success_trials, failures, success_rate, result],
            )
            report(section, f"{tag}-extend-distance", extend_data)
            report(section, f"{tag}-retract-distance", retract_data)

            # Stop the test if any trial fails
            if result == CSVResult.FAIL:
                ui.print_error(
                    f"Z Axis failed at speed {speed} mm/s, current {current} A"
                )
                return
    # End test in home position
    await stacker.home_axis(TEST_AXIS, Direction.RETRACT)
