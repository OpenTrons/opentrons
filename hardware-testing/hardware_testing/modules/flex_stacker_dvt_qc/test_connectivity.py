"""Test Connectivity."""
from typing import List, Union

from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from opentrons.drivers.flex_stacker.types import HardwareRevision
from .driver import FlexStackerInterface as FlexStacker


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine("usb-get-device-info", [str, str, str, CSVResult]),
        CSVLine("eeprom-set-serial-number", [str, str, CSVResult]),
        CSVLine("led-blinking", [bool, CSVResult]),
    ]


async def test_gcode(stacker: FlexStacker, report: CSVReport) -> None:
    """Send and receive response for GCODE M115."""
    success = True
    info = await stacker._driver.get_device_info()
    if info.hw != HardwareRevision.DVT:
        ui.print_warning(f"Hardware Revision is {info.hw}, expected DVT")
    report(
        "CONNECTIVITY",
        "usb-get-device-info",
        [info.fw, info.hw, info.sn, CSVResult.from_bool(success)],
    )


async def test_eeprom(stacker: FlexStacker, report: CSVReport) -> None:
    """Set serial number and make sure device info is updated accordingly."""
    success = True
    if not stacker._simulating:
        serial = input("SCAN device barcode: ")
    else:
        serial = "STACKER-SIMULATOR-SN"
    await stacker._driver.set_serial_number(serial)
    report.set_tag(serial)
    info = await stacker._driver.get_device_info()
    if info.sn != serial:
        ui.print_error("Serial number is not set properly")
        success = False
    report(
        "CONNECTIVITY",
        "eeprom-set-serial-number",
        [serial, info.sn, CSVResult.from_bool(success)],
    )


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    ui.print_header("USB Communication")
    await test_gcode(stacker, report)

    ui.print_header("EEPROM Communication")
    await test_eeprom(stacker, report)
