"""Test UI LEDs."""

from typing import List, Union
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .driver import FlexStackerInterface as FlexStacker
from opentrons.drivers.flex_stacker.types import LEDColor, LEDPattern


COLORS = [
    LEDColor.RED,
    LEDColor.GREEN,
    LEDColor.BLUE,
    LEDColor.WHITE,
]


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine(f"{loc}-{color}", [CSVResult])
        for loc in ["internal", "external"]
        for color in COLORS
    ]


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    # Reset LEDs to off
    if not stacker._simulating:
        await stacker._driver.set_led(0, LEDColor.GREEN, False, LEDPattern.STATIC)
        await stacker._driver.set_led(0, LEDColor.GREEN, True, LEDPattern.STATIC)

    for external in [False, True]:
        for color in COLORS:
            tag = "external" if external else "internal"
            ui.print_header(f"Check {tag} {color}")
            if not stacker._simulating:
                await stacker._driver.set_led(1.0, color, external)
                led_on = ui.get_user_answer(f"Is the {tag} {color} LED on?")
                # turn off led before moving on
                await stacker._driver.set_led(0.0)
            else:
                led_on = True
            report(section, f"{tag}-{color}", [CSVResult.from_bool(led_on)])
