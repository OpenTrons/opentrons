"""Test Z Axis."""
from typing import List, Union
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .utils import test_limit_switches_per_direction
from .driver import FlexStackerInterface as FlexStacker
from opentrons.drivers.flex_stacker.types import StackerAxis, Direction


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine(
            "limit-switch-trigger-positive-untrigger-negative", [bool, bool, CSVResult]
        ),
        CSVLine(
            "limit-switch-trigger-negative-untrigger-positive", [bool, bool, CSVResult]
        ),
    ]


async def run(stacker: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    await test_limit_switches_per_direction(
        stacker, StackerAxis.Z, Direction.EXTEND, report, section
    )

    await test_limit_switches_per_direction(
        stacker, StackerAxis.Z, Direction.RETRACT, report, section
    )
