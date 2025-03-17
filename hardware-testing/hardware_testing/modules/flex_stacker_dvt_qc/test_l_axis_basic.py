"""Test L Axis."""
from typing import List, Union
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .driver import FlexStackerInterface as FlexStacker
from opentrons.drivers.flex_stacker.types import StackerAxis, Direction


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine("trigger-latch-switch", [CSVResult]),
        CSVLine("release/open-latch", [CSVResult]),
        CSVLine("hold/close-latch", [CSVResult]),
    ]


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    ui.print_header("Latch Switch Trigger")
    if not await stacker._driver.get_limit_switch(StackerAxis.L, Direction.RETRACT):
        ui.print_info("Switch is not triggered, try to trigger it by closing latch...")
        if not await stacker.close_latch():
            ui.print_error("!!! Failed to close latch !!!")
            report(section, "trigger-latch-switch", [CSVResult.FAIL])
            return

    report(section, "trigger-latch-switch", [CSVResult.PASS])

    ui.print_header("Latch Release/Open")
    success = await stacker.open_latch()
    report(section, "release/open-latch", [CSVResult.from_bool(success)])

    ui.print_header("Latch Hold/Close")
    if not success:
        ui.print_error("Latch must be open to close it")
        report(section, "hold/close-latch", [CSVResult.FAIL])
    else:
        success = await stacker.close_latch()
        report(section, "hold/close-latch", [CSVResult.from_bool(success)])
