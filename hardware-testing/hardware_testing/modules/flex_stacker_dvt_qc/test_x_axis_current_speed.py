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
from opentrons.drivers.flex_stacker.driver import (
    STACKER_MOTION_CONFIG,
    STALLGUARD_CONFIG,
)
from opentrons.drivers.flex_stacker.types import StackerAxis, Direction

TEST_AXIS = StackerAxis.X
HOME_SPEED = STACKER_MOTION_CONFIG[TEST_AXIS]["home"].move_params.max_speed
HOME_CURRENT = STACKER_MOTION_CONFIG[TEST_AXIS]["home"].run_current
STALLTHRESHOLD = STALLGUARD_CONFIG[TEST_AXIS].threshold

TEST_SPEEDS = [200, 220]  # mm/s
TEST_CURRENTS = [1.5, 0.7, 0.5, 0.4, 0.3]  # A rms
TEST_ACCELERATION = STACKER_MOTION_CONFIG[TEST_AXIS]["move"].move_params.acceleration
CURRENT_THRESHOD = 0.5  # A rms
TEST_TRIALS = 10

# All units in mm
AXIS_TRAVEL = 193.5  # The distance from limit switch to limit switch
OFFSET = 2  # The distance to be off the springs from the limit switch
AXIS_TOLERANCE = 0.5  # Distance tolerance of AXIS_TRAVEL in ONE direction
LIMIT_SWICH_CHECK = 0.1
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


async def test_cycle_per_direction(
    stacker: FlexStacker,
    direction: Direction,
    speed: int,
    current: float,
) -> Tuple[bool, float]:
    """Test one cycle."""
    # Home to opposite position if we are not already on the switch
    if not await stacker._driver.get_limit_switch(TEST_AXIS, direction.opposite()):
        await stacker.home_axis(TEST_AXIS, direction.opposite())

    # Move at homing speed off the springs
    await stacker.move_axis(
        TEST_AXIS, direction, OFFSET, HOME_SPEED, None, HOME_CURRENT
    )

    try:
        # moving at the testing speed and current to just before the springs
        # minus the tolerances
        test_distance = AXIS_TRAVEL - (2 * OFFSET) - AXIS_TOLERANCE - MOVEMENT_TOLERANCE
        await stacker.move_axis(
            TEST_AXIS, direction, test_distance, speed, TEST_ACCELERATION, current
        )

        # Move to the farthest position the limit switch could be
        check_distance = OFFSET + 2 * AXIS_TOLERANCE + 2 * MOVEMENT_TOLERANCE
        try:
            await stacker.move_axis(
                TEST_AXIS,
                direction,
                check_distance,
                HOME_SPEED,
                0,
                HOME_CURRENT,
            )
        except Exception:
            pass

        if await stacker._driver.get_limit_switch(TEST_AXIS, direction):
            # The limit switch was triggered within this amount of distance
            movement_distance = round(
                (AXIS_TRAVEL + OFFSET + AXIS_TOLERANCE + MOVEMENT_TOLERANCE), 1
            )
            ui.print_info(
                f"X Axis, {direction}, PASS, {speed}mm/s, {current}A, {movement_distance}mm"
            )
            return True, movement_distance
    except FlexStackerStallError:
        ui.print_error("unexpected axis stall!")
    # If we reach this point, limit switch did not trigger in expected distance
    # Probable stall, Movement distance is unknown, return 0
    return False, 0


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    # Home to retract position if we are not already on the switch
    if not await stacker._driver.get_limit_switch(TEST_AXIS, Direction.RETRACT):
        await stacker.home_axis(TEST_AXIS, Direction.RETRACT)
    await stacker._driver.set_stallguard_threshold(TEST_AXIS, False, STALLTHRESHOLD)
    for speed in TEST_SPEEDS:
        for current in TEST_CURRENTS:
            tag = f"speed-{speed}-current-{current}"
            ui.print_header(f"X Speed: {speed} mm/s, Current: {current} A")
            trial = 0
            failures = 0
            extend_data: List[Optional[float]] = [None] * TEST_TRIALS
            retract_data: List[Optional[float]] = [None] * TEST_TRIALS
            while trial < TEST_TRIALS:
                # Test extend direction first
                extend, dist = await test_cycle_per_direction(
                    stacker, Direction.EXTEND, speed, current
                )
                extend_data[trial] = dist
                if not extend:
                    ui.print_error(
                        f"X Axis extend failed at speed {speed} mm/s, "
                        f"current {current} A, Distance {dist} mm"
                    )
                    failures += 1
                    trial += 1
                    continue

                # Test extend direction
                retract, dist = await test_cycle_per_direction(
                    stacker, Direction.RETRACT, speed, current
                )
                retract_data[trial] = dist
                if not retract:
                    ui.print_error(
                        f"X Axis retract failed at speed {speed} mm/s, "
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
                f"{tag}-success-failed-pass%",
                [success_trials, failures, success_rate, result],
            )
            report(section, f"{tag}-extend-distance", extend_data)
            report(section, f"{tag}-retract-distance", retract_data)

            # Stop the test if any trial fails
            if result == CSVResult.FAIL:
                ui.print_error(
                    f"X Axis failed at speed {speed} mm/s, current {current} A"
                )
                return

    await stacker._driver.set_stallguard_threshold(TEST_AXIS, True, STALLTHRESHOLD)
    # End test in gripper position
    await stacker.home_axis(TEST_AXIS, Direction.EXTEND)
