"""Liquid sense testing."""
import argparse
from dataclasses import dataclass
from json import load as json_load
from pathlib import Path
import subprocess
from time import sleep
import os
from typing import List, Any, Optional, Dict
import traceback
import sys

from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.gravimetric import helpers, workarounds
from hardware_testing.data.csv_report import CSVReport
from hardware_testing.gravimetric.measurement.record import GravimetricRecorder
from hardware_testing.gravimetric.measurement.scale import Scale
from hardware_testing.drivers import (
    asair_sensor,
    mitutoyo_digimatic_indicator,
    list_ports_and_select,
)
from hardware_testing.data import (
    ui,
    create_run_id_and_start_time,
    get_git_description,
    get_testing_data_directory,
)
from opentrons_hardware.hardware_control.motion_planning import move_utils

from opentrons.protocol_api import InstrumentContext, ProtocolContext
from opentrons.protocol_engine.types import LabwareOffset

from hardware_testing.liquid_sense import execute
from .report import build_ls_report, store_config, store_serial_numbers
from .post_process import process_csv_directory, process_google_sheet

from hardware_testing.protocols.liquid_sense_lpc import (
    liquid_sense_ot3_p50_single_vial,
    liquid_sense_ot3_p50_multi_vial,
    liquid_sense_ot3_p200_96_vial,
    liquid_sense_ot3_p1000_96_vial,
    liquid_sense_ot3_p1000_single_vial,
    liquid_sense_ot3_p1000_multi_vial,
)

try:
    from abr_testing.automation import google_sheets_tool, google_drive_tool
except ImportError:
    ui.print_error(
        "Unable to import abr repo if this isn't a simulation push the abr_testing package"
    )
    pass

CREDENTIALS_PATH = "/var/lib/jupyter/notebooks/abr.json"

API_LEVEL = "2.21"

LABWARE_OFFSETS: List[LabwareOffset] = []

# NOTE: (sigler) plunger on 1ch/8ch won't move faster than ~20mm second
#       which means it take ~3.5 seconds to reach full plunger travel.
#       Therefore, there is no need for any probing in this test script to
#       take longer than 3.5 seconds.
# NOTE: (sigler) configuring the starting height of each probing sequence
#       not based on millimeters but instead on the number seconds it takes
#       before the tip contacts the meniscus will help make sure that adjusting
#       the Z-speed will inadvertently affect the pressure's rate-of-change
#       (which could happen if the meniscus seal is formed at wildly different
#       positions along the plunger travel).
MAX_PROBE_SECONDS = 3.5


LIQUID_SENSE_CFG: Dict[int, Dict[int, Any]] = {
    50: {
        1: liquid_sense_ot3_p50_single_vial,
        8: liquid_sense_ot3_p50_multi_vial,
    },
    200: {
        96: liquid_sense_ot3_p200_96_vial,
    },
    1000: {
        1: liquid_sense_ot3_p1000_single_vial,
        8: liquid_sense_ot3_p1000_multi_vial,
        96: liquid_sense_ot3_p1000_96_vial,
    },
}

PIPETTE_MODEL_NAME = {
    50: {
        1: "p50_single_flex",
        8: "p50_multi_flex",
    },
    1000: {
        1: "p1000_single_flex",
        8: "p1000_multi_flex",
        96: "p1000_96_flex",
    },
    200: {96: "p200_96_flex"},
}


@dataclass
class RunArgs:
    """Common resources across multiple runs."""

    tip_volumes: List[int]
    run_id: str
    pipette: InstrumentContext
    pipette_tag: str
    git_description: str
    recorder: GravimetricRecorder
    pipette_volume: int
    pipette_channels: int
    name: str
    environment_sensor: asair_sensor.AsairSensorBase
    trials: int
    z_speed: float
    return_tip: bool
    ctx: ProtocolContext
    protocol_cfg: Any
    test_report: CSVReport
    aspirate: bool
    dial_indicator: Optional[mitutoyo_digimatic_indicator.Mitutoyo_Digimatic_Indicator]
    plunger_speed: float
    trials_before_jog: int
    no_multi_pass: int
    test_well: str
    wet: bool
    dial_front_channel: bool

    @classmethod
    def _get_protocol_context(cls, args: argparse.Namespace) -> ProtocolContext:
        if not args.simulate and not args.skip_labware_offsets:
            # getting labware offsets must be done before creating the protocol context
            # because it requires the robot-server to be running
            ui.print_title("SETUP")
            ui.print_info(
                "Starting opentrons-robot-server, so we can http GET labware offsets"
            )
            LABWARE_OFFSETS.extend(workarounds.http_get_all_labware_offsets())
            ui.print_info(f"found {len(LABWARE_OFFSETS)} offsets:")
            for offset in LABWARE_OFFSETS:
                ui.print_info(f"\t{offset.createdAt}:")
                ui.print_info(f"\t\t{offset.definitionUri}")
                ui.print_info(f"\t\t{offset.vector}")
        # gather the custom labware (for simulation)
        custom_defs = {}
        if args.simulate:
            labware_dir = Path(__file__).parent.parent / "labware"
            custom_def_uris = [
                "radwag_pipette_calibration_vial",
                "dial_indicator",
            ]
            for def_uri in custom_def_uris:
                with open(labware_dir / def_uri / "1.json", "r") as f:
                    custom_def = json_load(f)
                custom_defs[def_uri] = custom_def
        _ctx = helpers.get_api_context(
            API_LEVEL,  # type: ignore[attr-defined]
            is_simulating=args.simulate,
            pipette_left=PIPETTE_MODEL_NAME[args.pipette][args.channels],
            extra_labware=custom_defs,
        )
        for offset in LABWARE_OFFSETS:
            engine = _ctx._core._engine_client._transport._engine  # type: ignore[attr-defined]
            engine.state_view._labware_store._add_labware_offset(offset)
        return _ctx

    @classmethod
    def build_run_args(cls, args: argparse.Namespace) -> "RunArgs":
        """Build."""
        _ctx = RunArgs._get_protocol_context(args)
        run_id, start_time = create_run_id_and_start_time()
        environment_sensor = asair_sensor.BuildAsairSensor(simulate=True)
        git_description = get_git_description()
        protocol_cfg = LIQUID_SENSE_CFG[args.pipette][args.channels]
        name = protocol_cfg.metadata["protocolName"]  # type: ignore[union-attr]
        ui.print_header("LOAD PIPETTE")
        pipette = _ctx.load_instrument(
            f"flex_{args.channels}channel_{args.pipette}", args.mount
        )
        loaded_labwares = _ctx.loaded_labwares
        if 12 in loaded_labwares.keys():
            trash = loaded_labwares[12]
        else:
            trash = _ctx.load_labware("opentrons_1_trash_3200ml_fixed", "A3")
        pipette.trash_container = trash
        pipette_tag = helpers._get_tag_from_pipette(pipette, False, False)

        trials = args.trials

        if args.tip == 0:
            if args.pipette == 1000:
                tip_volumes: List[int] = [50, 200, 1000]
            elif args.pipette == 50:
                tip_volumes = [50]
            else:
                tip_volumes = [20, 50, 200]
        else:
            tip_volumes = [args.tip]

        scale = Scale.build(simulate=True)
        recorder: GravimetricRecorder = execute._load_scale(
            name,
            scale,
            run_id,
            pipette_tag,
            start_time,
            simulating=True,
        )
        dial: Optional[mitutoyo_digimatic_indicator.Mitutoyo_Digimatic_Indicator] = None
        if not _ctx.is_simulating():
            dial_port = list_ports_and_select("Dial Indicator")
            dial = mitutoyo_digimatic_indicator.Mitutoyo_Digimatic_Indicator(
                port=dial_port
            )
            dial.connect()
        ui.print_info(f"pipette_tag {pipette_tag}")
        report = build_ls_report(name, run_id, trials, tip_volumes)
        report.set_tag(name)
        # go ahead and store the meta data now
        store_serial_numbers(
            report,
            pipette_tag,
            scale.read_serial_number(),
            environment_sensor.get_serial(),
            git_description,
        )

        store_config(
            report,
            name,
            args.pipette,
            tip_volumes,
            trials,
            "aspirate" if args.aspirate else "dispense",
            args.liquid,
            protocol_cfg.LABWARE_ON_SCALE,  # type: ignore[union-attr]
            args.z_speed,
        )
        return RunArgs(
            tip_volumes=tip_volumes,
            run_id=run_id,
            pipette=pipette,
            pipette_tag=pipette_tag,
            git_description=git_description,
            recorder=recorder,
            pipette_volume=args.pipette,
            pipette_channels=args.channels,
            name=name,
            environment_sensor=environment_sensor,
            trials=trials,
            z_speed=args.z_speed,
            return_tip=args.return_tip,
            ctx=_ctx,
            protocol_cfg=protocol_cfg,
            test_report=report,
            aspirate=args.aspirate,
            dial_indicator=dial,
            plunger_speed=args.plunger_speed,
            trials_before_jog=args.trials_before_jog,
            no_multi_pass=args.no_multi_pass,
            test_well=args.test_well,
            wet=args.wet,
            dial_front_channel=args.dial_front_channel,
        )


if __name__ == "__main__":
    move_utils.MINIMUM_DISPLACEMENT = 0.01

    parser = argparse.ArgumentParser("Pipette Testing")
    parser.add_argument("--simulate", action="store_true")
    parser.add_argument("--pipette", type=int, choices=[50, 200, 1000], required=True)
    parser.add_argument("--mount", type=str, choices=["left", "right"], default="left")
    parser.add_argument("--channels", type=int, choices=[1, 8, 96], default=1)
    parser.add_argument("--tip", type=int, choices=[0, 20, 50, 200, 1000], default=0)
    parser.add_argument("--return-tip", action="store_true")
    parser.add_argument("--trials", type=int, default=10)
    parser.add_argument("--trials-before-jog", type=int, default=10)
    parser.add_argument("--z-speed", type=float, default=5)
    parser.add_argument("--aspirate", action="store_true")
    parser.add_argument("--plunger-speed", type=float, default=5)
    parser.add_argument("--no-multi-pass", action="store_true")
    parser.add_argument("--wet", action="store_true")
    parser.add_argument("--starting-tip", type=str, default="A1")
    parser.add_argument("--test-well", type=str, default="A1")
    parser.add_argument("--p-solo-time", type=float, default=0)
    parser.add_argument(
        "--google-sheet-name", type=str, default="LLD-Shared-Data-96ch-200ul"
    )
    parser.add_argument(
        "--gd-parent-folder", type=str, default="1b2V85fDPA0tNqjEhyHOGCWRZYgn8KsGf"
    )
    parser.add_argument("--liquid", type=str, default="unknown")
    parser.add_argument("--skip-labware-offsets", action="store_true")
    parser.add_argument("--dial-front-channel", action="store_true")

    args = parser.parse_args()

    run_args = RunArgs.build_run_args(args)
    exit_error = 0
    serial_logger: Optional[subprocess.Popen] = None
    data_dir = get_testing_data_directory()
    data_file = f"/{data_dir}/{run_args.name}/{run_args.run_id}/serial.log"
    try:
        if not run_args.ctx.is_simulating():
            ui.print_info(f"logging can data to {data_file}")
            serial_logger = subprocess.Popen(
                [f"python3 -m opentrons_hardware.scripts.can_mon > {data_file}"],
                shell=True,
            )
            sleep(1)
            # Connect to Google Sheet
            ui.print_info(f"robot has credentials: {os.path.exists(CREDENTIALS_PATH)}")
            google_sheet: Optional[
                google_sheets_tool.google_sheet
            ] = google_sheets_tool.google_sheet(
                CREDENTIALS_PATH, args.google_sheet_name, 0
            )
            sheet_id = google_sheet.create_worksheet(run_args.run_id)  # type: ignore[union-attr]
            try:
                sys.path.insert(0, "/var/lib/jupyter/notebooks/")

                google_drive: Optional[
                    google_drive_tool.google_drive
                ] = google_drive_tool.google_drive(
                    CREDENTIALS_PATH,
                    args.gd_parent_folder,
                    "rhyann.clarke@opentrons.com",
                )
            except ImportError:
                raise ImportError(
                    "Run on robot. Make sure google_drive_tool.py is in jupyter notebook."
                )
        else:
            google_sheet = None
            sheet_id = None
            google_drive = None
        hw = run_args.ctx._core.get_hardware()
        ui.print_info("homing...")
        run_args.ctx.home()
        for tip in run_args.tip_volumes:
            execute.run(tip, run_args, google_sheet, sheet_id, args.starting_tip)
    except Exception as e:
        ui.print_error(f"got error {e}")
        ui.print_error(traceback.format_exc())
        exit_error = 1
    finally:
        if run_args.recorder is not None:
            ui.print_info("ending recording")
        if not run_args.ctx.is_simulating() and serial_logger:
            ui.print_info("killing serial log")
            serial_logger.terminate()
        if run_args.dial_indicator is not None:
            run_args.dial_indicator.disconnect()
        run_args.test_report.save_to_disk()
        run_args.test_report.print_results()
        ui.print_info("done\n\n")
        if not run_args.ctx.is_simulating():
            new_folder_name = (
                f"MS{args.z_speed}_PS{args.plunger_speed}_{run_args.run_id}"
            )
            try:
                process_csv_directory(
                    f"{data_dir}/{run_args.name}/{run_args.run_id}",
                    run_args.tip_volumes,
                    run_args.trials,
                    google_sheet,
                    google_drive,
                    run_args.run_id,
                    sheet_id,
                    new_folder_name,
                    make_graph=False,
                )
                # Log to Google Sheet
                if args.aspirate is False:
                    plunger_direction = "dispense"
                else:
                    plunger_direction = "aspirate"
                test_info = [
                    run_args.run_id,
                    run_args.pipette_tag,
                    args.pipette,
                    args.tip,
                    args.z_speed,
                    args.plunger_speed,
                    "threshold",
                    plunger_direction,
                ]
                process_google_sheet(google_sheet, run_args, test_info, sheet_id)
            except Exception as e:
                ui.print_error("error making graphs or logging data on google sheet")
                ui.print_error(f"got error {e}")
                ui.print_error(traceback.format_exc())
                exit_error = 2

        run_args.ctx.cleanup()
        if not args.simulate:
            helpers_ot3.restart_server_ot3()
        os._exit(exit_error)
