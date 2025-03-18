"""Test TOF Sensor Functional."""

from typing import List, Union

from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)
from hardware_testing.modules.flex_stacker_dvt_qc.utils import labware_detected

from .driver import FlexStackerInterface as FlexStacker
from .utils import NUMBER_OF_BINS, NUMBER_OF_ZONES
from opentrons.drivers.flex_stacker.types import (
    Direction,
    StackerAxis,
    LEDPattern,
    TOFSensor,
)


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    lines: List[Union[CSVLine, CSVLineRepeating]] = [
        CSVLine(
            f"tof-{TOFSensor.X}-histogram-empty",
            [bool, str, CSVResult, str],
        ),
        CSVLine(
            f"tof-{TOFSensor.Z}-histogram-empty",
            [bool, str, CSVResult, str],
        ),
        CSVLine(
            f"tof-{TOFSensor.X}-histogram-tiprack",
            [bool, str, CSVResult, str],
        ),
        CSVLine(
            f"tof-{TOFSensor.Z}-histogram-tiprack",
            [bool, str, CSVResult, str],
        ),
    ]
    return lines


async def tof_sensors_installed(stacker: FlexStacker) -> bool:
    """Check if the tof sensor are installed."""
    tof_x = await stacker._driver.get_tof_sensor_status(TOFSensor.X)
    tof_z = await stacker._driver.get_tof_sensor_status(TOFSensor.Z)
    return tof_x.ok and tof_z.ok


async def test_tof_sensors_labware_detection(
    stacker: FlexStacker,
    report: CSVReport,
    section: str,
    sensor: TOFSensor,
    labware: str,
) -> None:
    """Test that we can detect labware with the TOF sensor."""
    open = not await stacker._driver.get_hopper_door_closed()
    if open:
        print("Failed: Make sure to close the stacker door.")
        report(
            section,
            f"tof-{sensor.name}-histogram-{labware}",
            [
                False,
                "HOPPER_OPEN",
                CSVResult.FAIL,
                [],
            ],
        )
        return

    print(f"Getting histogram for {sensor}.")
    bins = list(range(NUMBER_OF_BINS))
    zones = list(range(NUMBER_OF_ZONES))
    histogram = await stacker._driver.get_tof_histogram(sensor)
    diff = labware_detected(histogram.bins, sensor, bins, zones)
    labware_expected = labware != "empty"
    result = labware_expected == bool(diff)
    report(
        section,
        f"tof-{sensor.name}-histogram-{labware}",
        [
            result,
            "HISTOGRAM",
            CSVResult.from_bool(result),
            histogram.bins,
        ],
    )


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    # Reset LEDs to off
    if not stacker._simulating:
        ui.get_user_ready("Make sure both TOF sensors are installed.")
        await stacker._driver.set_led(0, pattern=LEDPattern.STATIC)

    print("Homing stacker X and Z axis.")
    await stacker.home_axis(StackerAxis.X, Direction.EXTEND)
    await stacker.home_axis(StackerAxis.Z, Direction.RETRACT)

    print("Test that we have no labware on the X")
    ui.get_user_ready("Make sure there is no labware on the stacker gripper position")
    await stacker.home_axis(StackerAxis.X, Direction.RETRACT)
    await test_tof_sensors_labware_detection(
        stacker, report, section, TOFSensor.X, "empty"
    )

    print("Test that we detect tiprack on the X home position")
    await stacker.home_axis(StackerAxis.X, Direction.EXTEND)
    ui.get_user_ready("Add 1 tiprack to the stacker X")
    await stacker.home_axis(StackerAxis.X, Direction.RETRACT)
    await test_tof_sensors_labware_detection(
        stacker, report, section, TOFSensor.X, "tiprack"
    )
    await stacker.home_axis(StackerAxis.X, Direction.EXTEND)

    print("Test that we have no labware on the Z")
    ui.get_user_ready(
        "Make sure there is no labware in the stacker and close the hopper door"
    )
    await stacker.close_latch()
    await test_tof_sensors_labware_detection(
        stacker, report, section, TOFSensor.Z, "empty"
    )

    print("Test that we detect tiprack on the Z")
    ui.get_user_ready("Add 1 tiprack to the stacker Z and close the hopper door")
    await test_tof_sensors_labware_detection(
        stacker, report, section, TOFSensor.Z, "tiprack"
    )
