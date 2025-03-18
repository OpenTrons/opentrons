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
from opentrons.drivers.flex_stacker.types import (
    Direction,
    StackerAxis,
    LEDPattern,
    TOFSensor,
    TOFSensorState,
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
        stacker: FlexStacker, report: CSVReport, section: str, sensor: TOFSensor, labware: str
) -> None:
    """Test that we can detect labware with the TOF sensor."""
    if not stacker._simulating:
        # Cancel any on-going measurements and make sure sensor is enabled
        await stacker._driver.manage_tof_measurement(sensor, start=False)
        status = await stacker._driver.get_tof_sensor_status(sensor)
        if not status.ok or status.state != TOFSensorState.MEASURING:
            report(
                section,
                f"tof-{sensor.name}-empty-histogram",
                [   
                    False,
                    "INVALID_CONFIG",
                    CSVResult.FAIL,
                    [],
                ],
            )
            return

    open = not await stacker._driver.get_hopper_door_closed()
    if open:
        report(
            section,
            f"tof-{sensor.name}-{labware}-histogram",
            [   
                False,
                "HOPPER_OPEN",
                CSVResult.FAIL,
                [],
            ],
        )
        return

    print(f"Getting histogram for {sensor}.")
    bins = [40, 80]
    zones = [0,1,2,3]
    histogram = await stacker._driver.get_tof_histogram(sensor)
    detected = not labware_detected(histogram, sensor, bins, zones)
    measurement = {k: v for k, v in histogram.bins.items() if k not in zones}
    report(
        section,
        f"tof-{sensor.name}-empty-histogram-empty",
        [
            detected,
            CSVResult.from_bool(detected),
            measurement,
        ],
    )


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    # Reset LEDs to off
    if not stacker._simulating:
        ui.get_user_ready("Make sure both TOF sensors are installed.")
        await stacker._driver.set_led(0, pattern=LEDPattern.STATIC)

    if not stacker._simulating and not await tof_sensors_installed(stacker):
        print("FAILURE - Cannot start tests without tof sensors installed.")
        return

    print("Homing stacker X and Z axis.")
    await stacker.home_axis(StackerAxis.X, Direction.EXTEND)
    await stacker.home_axis(StackerAxis.Z, Direction.RETRACT)

    print("Disabling both TOF sensors.")
    await stacker._driver.enable_tof_sensor(TOFSensor.X, False)
    await stacker._driver.enable_tof_sensor(TOFSensor.Z, False)

    print("Test that we have no labware on the Z")
    ui.get_user_ready("Make sure there is no labware in the stacker and close the hopper door.")
    await stacker.close_latch()
    await stacker._driver.enable_tof_sensor(TOFSensor.Z, True)
    await test_tof_sensors_labware_detection(stacker, report, section, TOFSensor.Z, "empty")

    print("Test that we detect tiprack on the Z")
    ui.get_user_ready("Add 1 tiprack to the stacker Z and close the hopper door.")
    await stacker._driver.enable_tof_sensor(TOFSensor.Z, True)
    await test_tof_sensors_labware_detection(stacker, report, section, TOFSensor.Z, "tiprack")
