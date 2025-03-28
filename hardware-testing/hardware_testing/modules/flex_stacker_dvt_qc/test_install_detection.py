"""Test Window Installed Detection."""


from typing import List, Union
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .driver import FlexStackerInterface as FlexStacker


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine("window-detected-high", [CSVResult]),
        CSVLine("window-not-detected-low", [CSVResult]),
    ]


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    ui.print_header("Window Detected")
    if not stacker._simulating:
        ui.get_user_ready("Attach to detection pins")
    detected = await stacker._driver.get_installation_detected()
    report(section, "window-detected-high", [CSVResult.from_bool(detected)])

    ui.print_header("Window Not Detected")
    if not stacker._simulating:
        ui.get_user_ready("Remove from detection pins")
    not_detected = not await stacker._driver.get_installation_detected()
    report(section, "window-not-detected-low", [CSVResult.from_bool(not_detected)])
