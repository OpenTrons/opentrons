"""Report."""
from dataclasses import fields
from enum import Enum
from typing import List, Tuple, Any, Dict

from hardware_testing.data.csv_report import (
    CSVReport,
    CSVSection,
    CSVLine,
)
from hardware_testing.gravimetric.measurement import (
    EnvironmentData,
    MeasurementData,
    MeasurementType,
)
from . import config
from .measurement import create_measurement_tag

"""
CSV Test Report:
 - Serial numbers:
   - Robot
   - Pipette
   - Scale
   - Environment sensor
   - Liquid temperature sensor
 - Config [excluding `labware_offsets`]:
   - name
   - pipette_volume
   - pipette_mount
   - tip_volume
   - trials
   - slot_scale
   - slot_tiprack
   - increment
   - low_volume
 - Volumes (per each):
   - Aspirate Average
   - Aspirate %CV
   - Aspirate %D
   - Dispense Average
   - Dispense %CV
   - Dispense %D
 - Trials (per each):
   - Aspirate micro-liters
   - Dispense micro-liters
 - Evaporation:
   - Aspirate average (grams)
   - Dispense average (grams)
 - Environment First/Last/Min/Max:
   - Pipette temperature
   - Air temperature
   - Air humidity
   - Air pressure
   - Liquid temperature
 - Measurements (per each):
   - Grams average
   - Grams %cv
   - Grams min
   - Grams max
   - Start time of samples
   - Duration of samples
   - Number of samples
   - Pipette Temperature
   - Air temperature
   - Air humidity
   - Air pressure
   - Liquid temperature
"""


class EnvironmentReportState(str, Enum):
    """Environment Report State."""

    FIRST = "environment-first"
    LAST = "environment-last"
    MIN = "environment-min"
    MAX = "environment-max"


def create_csv_test_report_photometric(
    volumes: List[float], trials: int, name: str, run_id: str
) -> CSVReport:
    """Create CSV test report."""
    env_info = [field.name.replace("_", "-") for field in fields(EnvironmentData)]
    meas_vols: List[Tuple[int, int, int]] = []

    for vol in volumes:
        meas_vols += [
            (
                vol,  # type: ignore[misc]
                0,
                trial,
            )
            for trial in range(trials)
        ]

    report = CSVReport(
        test_name=name,
        run_id=run_id,
        sections=[
            CSVSection(
                title="SERIAL-NUMBERS",
                lines=[
                    CSVLine("robot", [str]),
                    CSVLine("pipette", [str]),
                    CSVLine("tips_20ul", [str]),
                    CSVLine("tips_50ul", [str]),
                    CSVLine("tips_200ul", [str]),
                    CSVLine("tips_1000ul", [str]),
                    CSVLine("environment", [str]),
                    CSVLine("liquid", [str]),
                ],
            ),
            CSVSection(
                title="CONFIG",
                lines=[
                    CSVLine(field.name, [str])  # just convert to a string, always
                    for field in fields(config.PhotometricConfig)
                    if field.name not in config.PHOTO_CONFIG_EXCLUDE_FROM_REPORT
                ],
            ),
            CSVSection(
                title="MEASUREMENTS",
                lines=[
                    CSVLine(
                        create_measurement_tag(measurement, volume, channel, trial)
                        + f"-{e}",
                        [float],
                    )
                    for volume, channel, trial in meas_vols
                    for measurement in MeasurementType
                    for e in env_info
                    if volume is not None or trial < config.NUM_BLANK_TRIALS
                ],
            ),
        ],
    )
    return report


def store_config_pm(report: CSVReport, cfg: config.PhotometricConfig) -> None:
    """Store the config file list."""
    for field in fields(config.PhotometricConfig):
        if field.name in config.PHOTO_CONFIG_EXCLUDE_FROM_REPORT:
            continue
        val_str = str(getattr(cfg, field.name)).replace(" ", "")
        val_str = val_str.replace("[", "").replace("]", "").replace(",", "-")
        report("CONFIG", field.name, [val_str])


def create_csv_test_report(
    volumes: List[float],
    pipette_channels: int,
    increment: bool,
    trials: int,
    name: str,
    run_id: str,
) -> CSVReport:
    """Create CSV test report."""
    env_info = [field.name.replace("_", "-") for field in fields(EnvironmentData)]
    meas_info = [field.name.replace("_", "-") for field in fields(MeasurementData)]
    if pipette_channels == 8 and not increment:
        pip_channels_tested = 8
    else:
        pip_channels_tested = 1
    meas_vols = [
        (
            None,  # volume
            0,  # channel (hardcoded to 1)
            trial,
        )
        for trial in range(config.NUM_BLANK_TRIALS)
    ]
    for vol in volumes:
        meas_vols += [
            (
                vol,  # type: ignore[misc]
                channel,
                trial,
            )
            for channel in range(pip_channels_tested)
            for trial in range(trials)
        ]

    # Get label for different volume stores, "channel_all", "channel_1" through channel count,
    # and "trial_1" through trial count
    volume_stat_type = (
        ["channel_all"]
        + [f"channel_{c+1}" for c in range(pip_channels_tested)]
        + [f"trial_{t+1}" for t in range(trials)]
    )

    def _field_type_not_using_typing(t: Any) -> Any:
        if t == List[int]:
            return list
        return t

    report = CSVReport(
        test_name=name,
        run_id=run_id,
        validate_meta_data=False,  # to avoid >3 columns in CSV (:shrug:)
        sections=[
            CSVSection(
                title="SERIAL-NUMBERS",
                lines=[
                    CSVLine("robot", [str]),
                    CSVLine("pipette", [str]),
                    CSVLine("tips_20ul", [str]),
                    CSVLine("tips_50ul", [str]),
                    CSVLine("tips_200ul", [str]),
                    CSVLine("tips_1000ul", [str]),
                    CSVLine("scale", [str]),
                    CSVLine("environment", [str]),
                    CSVLine("liquid", [str]),
                ],
            ),
            CSVSection(
                title="CONFIG",
                lines=[
                    CSVLine(field.name, [str])  # just convert to a string, always
                    for field in fields(config.GravimetricConfig)
                    if field.name not in config.GRAV_CONFIG_EXCLUDE_FROM_REPORT
                ],
            ),
            CSVSection(
                title="VOLUMES",
                lines=[
                    CSVLine(f"volume-{m}-{round(v, 2)}-{s}-{i}", [float, str])
                    for v in volumes
                    for s in volume_stat_type
                    for m in ["aspirate", "dispense"]
                    for i in [
                        "average",
                        "cv",
                        "d",
                        "celsius-pipette-avg",
                        "humidity-pipette-avg",
                    ]
                ],
            ),
            CSVSection(
                title="TRIALS",
                lines=[
                    CSVLine(
                        f"trial-{t + 1}-{m}-{round(v, 2)}-ul-channel_{c + 1}", [float]
                    )
                    for v in volumes
                    for c in range(pip_channels_tested)
                    for t in range(trials)
                    for m in ["aspirate", "dispense", "liquid_height"]
                ],
            ),
            CSVSection(
                title="EVAPORATION",
                lines=[
                    CSVLine("aspirate-average-ul", [float]),
                    CSVLine("dispense-average-ul", [float]),
                ],
            ),
            CSVSection(
                title="ENVIRONMENT",
                lines=[
                    CSVLine(f"{s}-{i}", [float])
                    for s in EnvironmentReportState
                    for i in env_info
                ],
            ),
            CSVSection(
                title="MEASUREMENTS",
                lines=[
                    CSVLine(
                        create_measurement_tag(measurement, volume, channel, trial)
                        + f"-{i}",
                        [float],
                    )
                    for volume, channel, trial in meas_vols
                    for measurement in MeasurementType
                    for i in meas_info
                    if volume is not None or trial < config.NUM_BLANK_TRIALS
                ],
            ),
            CSVSection(
                title="ENCODER",
                lines=[
                    CSVLine(
                        f"encoder-volume-{round(v, 2)}-channel_{c}"
                        f"-trial-{t + 1}-{i}-{d}",
                        [float],
                    )
                    for v in volumes
                    for c in range(pip_channels_tested)
                    for t in range(trials)
                    for i in ["start", "end"]
                    for d in ["target", "encoder", "drift"]
                ],
            ),
        ],
    )
    # NOTE: just immediately clear all the "isolate" flags on the volume section
    #       so that final CSV is guaranteed to not be filled with a bunch of "None"
    for line in report["VOLUMES"].lines:
        line.store(None, "")
    return report


def store_config_gm(report: CSVReport, cfg: config.GravimetricConfig) -> None:
    """Store the config file list."""
    for field in fields(config.GravimetricConfig):
        if field.name in config.GRAV_CONFIG_EXCLUDE_FROM_REPORT:
            continue
        val_str = str(getattr(cfg, field.name)).replace(" ", "")
        val_str = val_str.replace("[", "").replace("]", "").replace(",", "-")
        report("CONFIG", field.name, [val_str])


def store_serial_numbers_pm(
    report: CSVReport,
    robot: str,
    pipette: str,
    tips: Dict[str, str],
    environment: str,
    liquid: str,
) -> None:
    """Report serial numbers."""
    report("SERIAL-NUMBERS", "robot", [robot])
    report("SERIAL-NUMBERS", "pipette", [pipette])
    for tip in tips.keys():
        report("SERIAL-NUMBERS", tip, [tips[tip]])
    report("SERIAL-NUMBERS", "environment", [environment])
    report("SERIAL-NUMBERS", "liquid", [liquid])


def store_measurements_pm(
    report: CSVReport,
    tag: str,
    data: EnvironmentData,
) -> None:
    """Report measurement."""
    for field in fields(EnvironmentData):
        f_tag = field.name.replace("_", "-")
        report("MEASUREMENTS", f"{tag}-{f_tag}", [getattr(data, field.name)])


def store_serial_numbers(
    report: CSVReport,
    robot: str,
    pipette: str,
    tips: Dict[str, str],
    scale: str,
    environment: str,
    liquid: str,
) -> None:
    """Report serial numbers."""
    report.set_robot_id(robot)
    report.set_device_id(pipette, pipette)
    report("SERIAL-NUMBERS", "robot", [robot])
    report("SERIAL-NUMBERS", "pipette", [pipette])
    for tip in tips.keys():
        report("SERIAL-NUMBERS", tip, [tips[tip]])
    report("SERIAL-NUMBERS", "scale", [scale])
    report("SERIAL-NUMBERS", "environment", [environment])
    report("SERIAL-NUMBERS", "liquid", [liquid])


def store_volume_all(
    report: CSVReport,
    mode: str,
    volume: float,
    average: float,
    cv: float,
    d: float,
    flag: str = "",
) -> None:
    """Report volume."""
    assert mode in ["aspirate", "dispense"]
    vol_in_tag = str(round(volume, 2))
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-channel_all-average",
        [round(average, 2), flag],
    )
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-channel_all-cv",
        [round(cv * 100.0, 2), flag],
    )
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-channel_all-d",
        [round(d * 100.0, 2), flag],
    )


def store_volume_per_channel(
    report: CSVReport,
    mode: str,
    volume: float,
    channel: int,
    average: float,
    cv: float,
    d: float,
    celsius: float,
    humidity: float,
    flag: str = "",
) -> None:
    """Report volume."""
    assert mode in ["aspirate", "dispense"]
    vol_in_tag = str(round(volume, 2))
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-channel_{channel + 1}-average",
        [round(average, 2), flag],
    )
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-channel_{channel + 1}-cv",
        [round(cv * 100.0, 2), flag],
    )
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-channel_{channel + 1}-d",
        [round(d * 100.0, 2), flag],
    )
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-channel_{channel + 1}-celsius-pipette-avg",
        [round(celsius, 2), flag],
    )
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-channel_{channel + 1}-humidity-pipette-avg",
        [round(humidity, 2), flag],
    )


def store_volume_per_trial(
    report: CSVReport,
    mode: str,
    volume: float,
    trial: int,
    average: float,
    cv: float,
    d: float,
    flag: str = "",
) -> None:
    """Report volume."""
    assert mode in ["aspirate", "dispense"]
    vol_in_tag = str(round(volume, 2))
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-trial_{trial + 1}-average",
        [round(average, 2), flag],
    )
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-trial_{trial + 1}-cv",
        [round(cv * 100.0, 2), flag],
    )
    report(
        "VOLUMES",
        f"volume-{mode}-{vol_in_tag}-trial_{trial + 1}-d",
        [round(d * 100.0, 2), flag],
    )


def store_encoder(
    report: CSVReport,
    volume: float,
    channel: int,
    trial: int,
    estimate_bottom: float,
    encoder_bottom: float,
    estimate_aspirated: float,
    encoder_aspirated: float,
) -> None:
    """Store encoder information."""
    vol_in_tag = str(round(volume, 5))
    report(
        "ENCODER",
        f"encoder-volume-{vol_in_tag}-channel_{channel}-trial-{trial + 1}-start-target",
        [round(estimate_bottom, 5)],
    )
    report(
        "ENCODER",
        f"encoder-volume-{vol_in_tag}-channel_{channel}-trial-{trial + 1}-start-encoder",
        [round(encoder_bottom, 5)],
    )
    report(
        "ENCODER",
        f"encoder-volume-{vol_in_tag}-channel_{channel}-trial-{trial + 1}-start-drift",
        [round(encoder_bottom - estimate_bottom, 5)],
    )
    report(
        "ENCODER",
        f"encoder-volume-{vol_in_tag}-channel_{channel}-trial-{trial + 1}-end-target",
        [round(estimate_aspirated, 5)],
    )
    report(
        "ENCODER",
        f"encoder-volume-{vol_in_tag}-channel_{channel}-trial-{trial + 1}-end-encoder",
        [round(encoder_aspirated, 5)],
    )
    report(
        "ENCODER",
        f"encoder-volume-{vol_in_tag}-channel_{channel}-trial-{trial + 1}-end-drift",
        [round(encoder_aspirated - estimate_aspirated, 5)],
    )


def get_volume_results_all(
    report: CSVReport, mode: str, volume: float
) -> Tuple[float, float, float]:
    """Get volume results."""
    assert mode in ["aspirate", "dispense"]
    vol_in_tag = str(round(volume, 2))
    average = report["VOLUMES"][f"volume-{mode}-{vol_in_tag}-channel_all-average"]
    cv = report["VOLUMES"][f"volume-{mode}-{vol_in_tag}-channel_all-cv"]
    d = report["VOLUMES"][f"volume-{mode}-{vol_in_tag}-channel_all-d"]
    return average.data[0], cv.data[0], d.data[0]  # type: ignore[union-attr]


def get_volume_results_per_channel(
    report: CSVReport, mode: str, volume: float, channel: int
) -> Tuple[float, float, float]:
    """Get volume results."""
    assert mode in ["aspirate", "dispense"]
    vol_in_tag = str(round(volume, 2))
    average = report["VOLUMES"][
        f"volume-{mode}-{vol_in_tag}-channel_{channel + 1}-average"
    ]
    cv = report["VOLUMES"][f"volume-{mode}-{vol_in_tag}-channel_{channel + 1}-cv"]
    d = report["VOLUMES"][f"volume-{mode}-{vol_in_tag}-channel_{channel + 1}-d"]
    return average.data[0], cv.data[0], d.data[0]  # type: ignore[union-attr]


def store_trial(
    report: CSVReport,
    trial: int,
    volume: float,
    channel: int,
    aspirate: float,
    dispense: float,
    liquid_height: float,
) -> None:
    """Report trial."""
    vol_in_tag = str(round(volume, 2))
    report(
        "TRIALS",
        f"trial-{trial + 1}-aspirate-{vol_in_tag}-ul-channel_{channel + 1}",
        [aspirate],
    )
    report(
        "TRIALS",
        f"trial-{trial + 1}-dispense-{vol_in_tag}-ul-channel_{channel + 1}",
        [dispense],
    )
    report(
        "TRIALS",
        f"trial-{trial + 1}-liquid_height-{vol_in_tag}-ul-channel_{channel + 1}",
        [liquid_height],
    )


def store_average_evaporation(
    report: CSVReport, aspirate: float, dispense: float
) -> None:
    """Report average evaporation."""
    report("EVAPORATION", "aspirate-average-ul", [aspirate])
    report("EVAPORATION", "dispense-average-ul", [dispense])


def store_environment(
    report: CSVReport,
    state: EnvironmentReportState,
    data: EnvironmentData,
) -> None:
    """Report environment."""
    for field in fields(EnvironmentData):
        f_tag = field.name.replace("_", "-")
        report("ENVIRONMENT", f"{state}-{f_tag}", [getattr(data, field.name)])


def store_measurement(
    report: CSVReport,
    tag: str,
    data: MeasurementData,
) -> None:
    """Report measurement."""
    for field in fields(MeasurementData):
        f_tag = field.name.replace("_", "-")
        report("MEASUREMENTS", f"{tag}-{f_tag}", [getattr(data, field.name)])
