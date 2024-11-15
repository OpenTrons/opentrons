"""Test Environmental Sensor."""
from asyncio import sleep
from typing import List, Union, Literal

from opentrons.hardware_control.ot3api import OT3API

from opentrons_hardware.firmware_bindings.constants import SensorId

from hardware_testing.data import ui
from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.opentrons_api.types import OT3Mount
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
    CSVLine,
    CSVLineRepeating,
)


NUM_SAMPLES = 10
INTER_SAMPLE_DELAY_SECONDS = 0.25
TEMPERATURE_THRESHOLD = [10, 40]
HUMIDITY_THRESHOLD = [10, 90]


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine(
            f"environment-{sensor_id.name}-celsius-humidity", [float, float, CSVResult]
        )
        for sensor_id in [SensorId.S0, SensorId.S1]
    ]


def _remove_outliers_and_average(values: List[float]) -> float:
    no_outliers = sorted(values)[1:-1]
    return sum(no_outliers) / len(no_outliers)


async def run(
    api: OT3API, report: CSVReport, section: str, pipette: Literal[200, 1000]
) -> None:
    """Run."""
    await api.home_z(OT3Mount.LEFT)
    slot_5 = helpers_ot3.get_slot_calibration_square_position_ot3(5)
    home_pos = await api.gantry_position(OT3Mount.LEFT)
    await api.move_to(OT3Mount.LEFT, slot_5._replace(z=home_pos.z))
    for sensor_id in [SensorId.S0, SensorId.S1]:
        ui.print_header(sensor_id.name.upper())
        celsius_samples = []
        humidity_samples = []
        air_params = True
        print(f"averaging {NUM_SAMPLES} samples:")
        print("\tc\th")
        for _ in range(NUM_SAMPLES):
            c, h = await helpers_ot3.get_temperature_humidity_ot3(
                api, OT3Mount.LEFT, sensor_id
            )
            c = round(c, 2)
            h = round(h, 2)
            print(f"\t{c}\t{h}")
            celsius_samples.append(c)
            humidity_samples.append(h)
            if not api.is_simulator:
                await sleep(INTER_SAMPLE_DELAY_SECONDS)
        celsius = _remove_outliers_and_average(celsius_samples)
        humidity = _remove_outliers_and_average(humidity_samples)
        print(f"[{sensor_id.name}] Celsius = {round(celsius, 2)} degrees")
        print(f"[{sensor_id.name}] Humidity = {round(humidity, 2)} percent")
        air_params = (
            air_params & True
            if TEMPERATURE_THRESHOLD[0] <= celsius <= TEMPERATURE_THRESHOLD[1]
            and HUMIDITY_THRESHOLD[0] <= humidity <= HUMIDITY_THRESHOLD[1]
            else False
        )

        report(
            section,
            f"environment-{sensor_id.name}-celsius-humidity",
            [celsius, humidity, CSVResult.from_bool(air_params)],
        )
