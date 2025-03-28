"""Test TOF Sensor Comms."""

from typing import List, Union
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .driver import FlexStackerInterface as FlexStacker
from opentrons.drivers.flex_stacker.types import (
    Direction,
    StackerAxis,
    LEDPattern,
    TOFSensor,
)


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    lines: List[Union[CSVLine, CSVLineRepeating]] = [
        CSVLine("tof-X-enabled", [CSVResult]),
        CSVLine("tof-X-disabled", [CSVResult]),
        CSVLine("tof-Z-enabled", [CSVResult]),
        CSVLine("tof-Z-disabled", [CSVResult]),
        CSVLine(
            f"tof-{TOFSensor.X}-histogram",
            [CSVResult, str],
        ),
        CSVLine(
            f"tof-{TOFSensor.Z}-histogram",
            [CSVResult, str],
        ),
    ]
    return lines


async def tof_sensors_installed(stacker: FlexStacker) -> bool:
    """Check if the tof sensor are installed."""
    tof_x = await stacker._driver.get_tof_sensor_status(TOFSensor.X)
    tof_z = await stacker._driver.get_tof_sensor_status(TOFSensor.Z)
    return tof_x.ok and tof_z.ok


async def test_tof_sensors_for_comms(
    stacker: FlexStacker,
    sensor: TOFSensor,
    enable: bool,
    report: CSVReport,
    section: str,
) -> None:
    """Test the communication of the tof sensor."""
    ui.print_header(f"TOF Sensor - {sensor} sensor.")
    # Set the state of the target sensor
    await stacker._driver.enable_tof_sensor(sensor, enable)
    status = await stacker._driver.get_tof_sensor_status(sensor)
    enabled = "enabled" if enable else "disabled"
    report(
        section,
        f"tof-{sensor.name}-{enabled}",
        [
            CSVResult.from_bool(enable == status.ok),
        ],
    )


async def test_get_tof_sensor_histogram(
    stacker: FlexStacker, report: CSVReport, section: str, sensor: TOFSensor
) -> None:
    """Test that we can request and store histogram measurements from this TOF sensor."""
    print(f"Getting histogram for {sensor}.")
    histogram = await stacker._driver.get_tof_histogram(sensor)
    report(
        section,
        f"tof-{sensor.name}-histogram",
        [
            CSVResult.PASS,
            histogram.bins,
        ],
    )


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    # Reset LEDs to off
    if not stacker._simulating:
        ui.get_user_ready("Make sure both TOF sensors are installed.")
        ui.get_user_ready("Make sure there is no labware in the stacker.")
        await stacker._driver.set_led(0, pattern=LEDPattern.STATIC)

    print("Homing stacker X and Z axis.")
    await stacker.home_axis(StackerAxis.X, Direction.EXTEND)
    await stacker.home_axis(StackerAxis.Z, Direction.RETRACT)

    print("Test TOF sensor I2C communication")
    # disable the opposite sensor so we can test one at a time
    await stacker._driver.enable_tof_sensor(TOFSensor.X, True)
    await test_tof_sensors_for_comms(stacker, TOFSensor.X, False, report, section)
    await test_tof_sensors_for_comms(stacker, TOFSensor.X, True, report, section)

    await stacker._driver.enable_tof_sensor(TOFSensor.Z, True)
    await test_tof_sensors_for_comms(stacker, TOFSensor.Z, False, report, section)
    await test_tof_sensors_for_comms(stacker, TOFSensor.Z, True, report, section)

    print("Test TOF sensor get histogram")
    await test_get_tof_sensor_histogram(stacker, report, section, TOFSensor.X)
    await test_get_tof_sensor_histogram(stacker, report, section, TOFSensor.Z)
