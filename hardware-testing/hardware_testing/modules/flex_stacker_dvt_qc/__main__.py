"""FLEX Stacker DVT QC."""
from os import environ

# NOTE: this is required to get WIFI test to work
if "OT_SYSTEM_VERSION" not in environ:
    environ["OT_SYSTEM_VERSION"] = "0.0.0"

import argparse
import asyncio
from pathlib import Path
from typing import Tuple

from hardware_testing.data import ui
from hardware_testing.data.csv_report import CSVReport

from .config import TestSection, TestConfig, build_report, TESTS
from .driver import FlexStackerInterface, PlatformState


async def build_stacker_report(
    is_simulating: bool,
) -> Tuple[CSVReport, FlexStackerInterface]:
    """Report setup for FLEX Stacker qc script."""
    test_name = Path(__file__).parent.name.replace("_", "-")
    ui.print_title(test_name.upper())

    stacker = (
        await FlexStackerInterface.build_simulator()
        if is_simulating
        else await FlexStackerInterface.build()
    )

    report = build_report(test_name)
    report.set_operator(
        "simulating" if is_simulating else input("enter OPERATOR name: ")
    )
    return report, stacker


async def _main(cfg: TestConfig) -> None:
    # BUILD REPORT
    report, stacker = await build_stacker_report(cfg.simulate)

    if not cfg.simulate:
        # Perform initial checks before starting tests
        # 1. estop should not be pressed
        # 2. platform should be removed
        if await stacker.get_estop():
            ui.print_error("ESTOP is pressed, please release it before starting")
            ui.get_user_ready("Release ESTOP")
            if stacker.get_estop():
                ui.print_error("ESTOP is still pressed, cannot start tests")
                return

        platform_state = await stacker.get_platform_state()
        if platform_state is not PlatformState.UNKNOWN:
            ui.print_error("Platform must be removed from the carrier before starting")
            ui.get_user_ready("Remove platform from {platform_state.value}")
            if await stacker.get_platform_state() is not PlatformState.UNKNOWN:
                ui.print_error("Platform is still detected, cannot start tests")
                return

    device_info = await stacker._driver.get_device_info()
    report.set_tag(device_info.sn if device_info.sn else "UNKNOWN")

    # RUN TESTS
    try:
        for section, test_run in cfg.tests.items():
            ui.print_title(section.value)
            await test_run(stacker, report, section.value)
    except Exception as e:
        ui.print_error(f"An error occurred: {e}")

    # SAVE REPORT
    ui.print_title("DONE")
    report.save_to_disk()
    report.print_results()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--simulate", action="store_true")
    # add each test-section as a skippable argument (eg: --skip-connectivity)
    for s in TestSection:
        parser.add_argument(f"--skip-{s.value.lower()}", action="store_true")
        parser.add_argument(f"--only-{s.value.lower()}", action="store_true")
    args = parser.parse_args()
    _t_sections = {s: f for s, f in TESTS if getattr(args, f"only_{s.value.lower()}")}
    if _t_sections:
        assert (
            len(list(_t_sections.keys())) < 2
        ), 'use "--only" for just one test, not multiple tests'
    else:
        _t_sections = {
            s: f for s, f in TESTS if not getattr(args, f"skip_{s.value.lower()}")
        }
    _config = TestConfig(simulate=args.simulate, tests=_t_sections)
    asyncio.run(_main(_config))
