"""Test UV Lockout Switch."""


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
        CSVLine("open-door-open-circuit", [bool, bool, CSVResult]),
        CSVLine("closed-door-closed-circuit", [bool, bool, CSVResult]),
    ]


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    ui.print_header("Manual measurement of UV Lockout Switch")
    if not stacker._simulating:
        ui.get_user_ready("Open the hopper door")
        door_open = not await stacker._driver.get_hopper_door_closed()
        if door_open:
            ui.print_info("Meausre between J1 and J4")
            open = not ui.get_user_answer("Is there continuity (closed circuit)?")
            # circuit should be open
            report(
                section,
                "open-door-open-circuit",
                [door_open, open, CSVResult.from_bool(door_open and open)],
            )
        else:
            ui.print_error("Door did not open")
            report(
                section, "open-door-open-circuit", [door_open, False, CSVResult.FAIL]
            )

        ui.get_user_ready("Close the hopper door")
        door_closed = await stacker._driver.get_hopper_door_closed()
        if door_closed:
            closed = ui.get_user_answer("Is there continuity (closed circuit)?")
            report(
                section,
                "closed-door-closed-circuit",
                [door_closed, closed, CSVResult.from_bool(door_closed and closed)],
            )
        else:
            ui.print_error("Door did not close")
            report(
                section,
                "closed-door-closed-circuit",
                [door_closed, False, CSVResult.FAIL],
            )
