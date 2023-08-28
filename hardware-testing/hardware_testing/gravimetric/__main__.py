"""Gravimetric OT3."""
from json import load as json_load
from pathlib import Path
import argparse
from typing import List, Union, Dict, Optional, Any, Tuple
from dataclasses import dataclass
from opentrons.protocol_api import ProtocolContext
from . import report

from hardware_testing.data import create_run_id_and_start_time, ui, get_git_description
from hardware_testing.protocols import (
    gravimetric_ot3_p50_single,
    gravimetric_ot3_p50_multi,
    gravimetric_ot3_p1000_single,
    gravimetric_ot3_p1000_multi,
    gravimetric_ot3_p1000_96_50ul_tip,
    gravimetric_ot3_p1000_96_200ul_tip,
    gravimetric_ot3_p1000_96_1000ul_tip,
    photometric_ot3_p1000_96_50ul_tip,
    photometric_ot3_p1000_96_200ul_tip,
    gravimetric_ot3_p50_multi_50ul_tip_increment,
    gravimetric_ot3_p1000_multi_50ul_tip_increment,
    gravimetric_ot3_p1000_multi_200ul_tip_increment,
    gravimetric_ot3_p1000_multi_1000ul_tip_increment,
)

from . import execute, helpers, workarounds, execute_photometric
from .config import (
    GravimetricConfig,
    GANTRY_MAX_SPEED,
    PhotometricConfig,
    ConfigType,
    get_tip_volumes_for_qc,
)
from .measurement.record import GravimetricRecorder
from .measurement import DELAY_FOR_MEASUREMENT
from .measurement.scale import Scale
from .trial import TestResources, _change_pipettes
from .tips import get_tips
from hardware_testing.drivers import asair_sensor
from opentrons.protocol_api import InstrumentContext

# FIXME: bump to v2.15 to utilize protocol engine
API_LEVEL = "2.13"

LABWARE_OFFSETS: List[dict] = []

# Keyed by pipette volume, channel count, and tip volume in that order
GRAVIMETRIC_CFG = {
    50: {
        1: gravimetric_ot3_p50_single,
        8: gravimetric_ot3_p50_multi,
    },
    1000: {
        1: gravimetric_ot3_p1000_single,
        8: gravimetric_ot3_p1000_multi,
        96: gravimetric_ot3_p1000_96_1000ul_tip,
    },
}

GRAVIMETRIC_CFG_INCREMENT = {
    50: {
        1: {50: gravimetric_ot3_p50_single},
        8: {50: gravimetric_ot3_p50_multi_50ul_tip_increment},
    },
    1000: {
        1: {
            50: gravimetric_ot3_p1000_single,
            200: gravimetric_ot3_p1000_single,
            1000: gravimetric_ot3_p1000_single,
        },
        8: {
            50: gravimetric_ot3_p1000_multi_50ul_tip_increment,
            200: gravimetric_ot3_p1000_multi_200ul_tip_increment,
            1000: gravimetric_ot3_p1000_multi_1000ul_tip_increment,
        },
        96: {
            50: gravimetric_ot3_p1000_96_50ul_tip,
            200: gravimetric_ot3_p1000_96_200ul_tip,
            1000: gravimetric_ot3_p1000_96_1000ul_tip,
        },
    },
}

PHOTOMETRIC_CFG = {
    50: photometric_ot3_p1000_96_50ul_tip,
    200: photometric_ot3_p1000_96_200ul_tip,
}


@dataclass
class RunArgs:
    """Common resources across multiple runs."""

    tip_volumes: List[int]
    volumes: List[Tuple[int, List[float]]]
    run_id: str
    pipette: InstrumentContext
    pipette_tag: str
    operator_name: str
    git_description: str
    robot_serial: str
    tip_batchs: Dict[str, str]
    recorder: Optional[GravimetricRecorder]
    pipette_volume: int
    pipette_channels: int
    increment: bool
    name: str
    environment_sensor: asair_sensor.AsairSensorBase
    trials: int
    ctx: ProtocolContext
    protocol_cfg: Any
    test_report: report.CSVReport

    @classmethod
    def _get_protocol_context(cls, args: argparse.Namespace) -> ProtocolContext:
        if not args.simulate and not args.skip_labware_offsets:
            # getting labware offsets must be done before creating the protocol context
            # because it requires the robot-server to be running
            ui.print_title("SETUP")
            ui.print_info(
                "Starting opentrons-robot-server, so we can http GET labware offsets"
            )
            offsets = workarounds.http_get_all_labware_offsets()
            ui.print_info(f"found {len(offsets)} offsets:")
            for offset in offsets:
                ui.print_info(f"\t{offset['createdAt']}:")
                ui.print_info(f"\t\t{offset['definitionUri']}")
                ui.print_info(f"\t\t{offset['vector']}")
                LABWARE_OFFSETS.append(offset)
        # gather the custom labware (for simulation)
        custom_defs = {}
        if args.simulate:
            labware_dir = Path(__file__).parent.parent / "labware"
            custom_def_uris = [
                "radwag_pipette_calibration_vial",
                "opentrons_flex_96_tiprack_50ul_adp",
                "opentrons_flex_96_tiprack_200ul_adp",
                "opentrons_flex_96_tiprack_1000ul_adp",
            ]
            for def_uri in custom_def_uris:
                with open(labware_dir / def_uri / "1.json", "r") as f:
                    custom_def = json_load(f)
                custom_defs[def_uri] = custom_def
        _ctx = helpers.get_api_context(
            API_LEVEL,  # type: ignore[attr-defined]
            is_simulating=args.simulate,
            deck_version="2",
            extra_labware=custom_defs,
        )
        return _ctx

    @classmethod
    def build_run_args(cls, args: argparse.Namespace) -> "RunArgs":
        """Build."""
        _ctx = RunArgs._get_protocol_context(args)
        operator_name = helpers._get_operator_name(_ctx.is_simulating())
        robot_serial = helpers._get_robot_serial(_ctx.is_simulating())
        run_id, start_time = create_run_id_and_start_time()
        environment_sensor = asair_sensor.BuildAsairSensor(_ctx.is_simulating())
        git_description = get_git_description()
        if not args.photometric:
            scale = Scale.build(simulate=_ctx.is_simulating())
        ui.print_header("LOAD PIPETTE")
        pipette = helpers._load_pipette(
            _ctx,
            args.channels,
            args.pipette,
            "left",
            args.increment,
            args.gantry_speed if not args.photometric else None,
        )
        pipette_tag = helpers._get_tag_from_pipette(
            pipette, args.increment, args.user_volumes
        )
        recorder: Optional[GravimetricRecorder] = None
        kind = ConfigType.photometric if args.photometric else ConfigType.gravimetric
        tip_batches: Dict[str, str] = {}
        if args.tip == 0:
            tip_volumes: List[int] = get_tip_volumes_for_qc(
                args.pipette, args.channels, args.extra, args.photometric
            )
            for tip in tip_volumes:
                tip_batches[f"tips_{tip}ul"] = helpers._get_tip_batch(
                    _ctx.is_simulating(), tip
                )
        else:
            tip_volumes = [args.tip]
            tip_batches[f"tips_{args.tip}ul"] = helpers._get_tip_batch(
                _ctx.is_simulating(), args.tip
            )

        volumes: List[Tuple[int, List[float]]] = []
        for tip in tip_volumes:
            vls = helpers._get_volumes(
                _ctx,
                args.increment,
                args.channels,
                args.pipette,
                tip,
                args.user_volumes,
                kind,
                False,  # set extra to false so we always do the normal tests first
                args.channels,
            )
            if len(vls) > 0:
                volumes.append(
                    (
                        tip,
                        vls,
                    )
                )
        if args.extra:
            # if we use extra, add those tests after
            for tip in tip_volumes:
                vls = helpers._get_volumes(
                    _ctx,
                    args.increment,
                    args.channels,
                    args.pipette,
                    tip,
                    args.user_volumes,
                    kind,
                    True,
                    args.channels,
                )
                if len(vls) > 0:
                    volumes.append(
                        (
                            tip,
                            vls,
                        )
                    )
        if not volumes:
            raise ValueError("no volumes to test, check the configuration")
        volumes_list: List[float] = []
        for _, vls in volumes:
            volumes_list.extend(vls)

        if args.trials == 0:
            trials = helpers.get_default_trials(args.increment, kind, args.channels)
        else:
            trials = args.trials

        if args.photometric:
            protocol_cfg = PHOTOMETRIC_CFG[args.tip]
            name = protocol_cfg.metadata["protocolName"]  # type: ignore[attr-defined]
            report = execute_photometric.build_pm_report(
                test_volumes=volumes_list,
                run_id=run_id,
                pipette_tag=pipette_tag,
                operator_name=operator_name,
                git_description=git_description,
                tip_batches=tip_batches,
                environment_sensor=environment_sensor,
                trials=trials,
                name=name,
                robot_serial=robot_serial,
            )
        else:
            if args.increment:
                protocol_cfg = GRAVIMETRIC_CFG_INCREMENT[args.pipette][args.channels][
                    args.tip
                ]
            else:
                protocol_cfg = GRAVIMETRIC_CFG[args.pipette][args.channels]
            name = protocol_cfg.metadata["protocolName"]  # type: ignore[attr-defined]
            recorder = execute._load_scale(
                name, scale, run_id, pipette_tag, start_time, _ctx.is_simulating()
            )

            report = execute.build_gm_report(
                test_volumes=volumes_list,
                run_id=run_id,
                pipette_tag=pipette_tag,
                operator_name=operator_name,
                git_description=git_description,
                robot_serial=robot_serial,
                tip_batchs=tip_batches,
                recorder=recorder,
                pipette_channels=args.channels,
                increment=args.increment,
                name=name,
                environment_sensor=environment_sensor,
                trials=trials,
            )

        return RunArgs(
            tip_volumes=tip_volumes,
            volumes=volumes,
            run_id=run_id,
            pipette=pipette,
            pipette_tag=pipette_tag,
            operator_name=operator_name,
            git_description=git_description,
            robot_serial=robot_serial,
            tip_batchs=tip_batches,
            recorder=recorder,
            pipette_volume=args.pipette,
            pipette_channels=args.channels,
            increment=args.increment,
            name=name,
            environment_sensor=environment_sensor,
            trials=trials,
            ctx=_ctx,
            protocol_cfg=protocol_cfg,
            test_report=report,
        )


def build_gravimetric_cfg(
    protocol: ProtocolContext,
    tip_volume: int,
    increment: bool,
    return_tip: bool,
    blank: bool,
    mix: bool,
    user_volumes: bool,
    gantry_speed: int,
    scale_delay: int,
    isolate_channels: List[int],
    extra: bool,
    jog: bool,
    same_tip: bool,
    run_args: RunArgs,
) -> GravimetricConfig:
    """Build."""
    return GravimetricConfig(
        name=run_args.name,
        pipette_mount="left",
        pipette_volume=run_args.pipette_volume,
        pipette_channels=run_args.pipette_channels,
        tip_volume=tip_volume,
        trials=run_args.trials,
        labware_offsets=LABWARE_OFFSETS,
        labware_on_scale=run_args.protocol_cfg.LABWARE_ON_SCALE,  # type: ignore[attr-defined]
        slot_scale=run_args.protocol_cfg.SLOT_SCALE,  # type: ignore[attr-defined]
        slots_tiprack=run_args.protocol_cfg.SLOTS_TIPRACK[tip_volume],  # type: ignore[attr-defined]
        increment=increment,
        return_tip=return_tip,
        blank=blank,
        mix=mix,
        user_volumes=user_volumes,
        gantry_speed=gantry_speed,
        scale_delay=scale_delay,
        isolate_channels=isolate_channels,
        kind=ConfigType.gravimetric,
        extra=extra,
        jog=jog,
        same_tip=same_tip,
    )


def build_photometric_cfg(
    protocol: ProtocolContext,
    tip_volume: int,
    return_tip: bool,
    mix: bool,
    user_volumes: bool,
    touch_tip: bool,
    refill: bool,
    extra: bool,
    jog: bool,
    same_tip: bool,
    run_args: RunArgs,
) -> PhotometricConfig:
    """Run."""
    return PhotometricConfig(
        name=run_args.name,
        pipette_mount="left",
        pipette_volume=run_args.pipette_volume,
        pipette_channels=96,
        increment=False,
        tip_volume=tip_volume,
        trials=run_args.trials,
        labware_offsets=LABWARE_OFFSETS,
        photoplate=run_args.protocol_cfg.PHOTOPLATE_LABWARE,  # type: ignore[attr-defined]
        photoplate_slot=run_args.protocol_cfg.SLOT_PLATE,  # type: ignore[attr-defined]
        reservoir=run_args.protocol_cfg.RESERVOIR_LABWARE,  # type: ignore[attr-defined]
        reservoir_slot=run_args.protocol_cfg.SLOT_RESERVOIR,  # type: ignore[attr-defined]
        slots_tiprack=run_args.protocol_cfg.SLOTS_TIPRACK[tip_volume],  # type: ignore[attr-defined]
        return_tip=return_tip,
        mix=mix,
        user_volumes=user_volumes,
        touch_tip=touch_tip,
        refill=refill,
        kind=ConfigType.photometric,
        extra=extra,
        jog=jog,
        same_tip=same_tip,
    )


def _main(
    args: argparse.Namespace,
    run_args: RunArgs,
    tip: int,
    volumes: List[float],
) -> None:
    union_cfg: Union[PhotometricConfig, GravimetricConfig]
    if args.photometric:
        cfg_pm: PhotometricConfig = build_photometric_cfg(
            run_args.ctx,
            tip,
            args.return_tip,
            args.mix,
            args.user_volumes,
            args.touch_tip,
            args.refill,
            args.extra,
            args.jog,
            args.same_tip,
            run_args,
        )
        union_cfg = cfg_pm
    else:
        cfg_gm: GravimetricConfig = build_gravimetric_cfg(
            run_args.ctx,
            tip,
            args.increment,
            args.return_tip,
            False if args.no_blank else True,
            args.mix,
            args.user_volumes,
            args.gantry_speed,
            args.scale_delay,
            args.isolate_channels if args.isolate_channels else [],
            args.extra,
            args.jog,
            args.same_tip,
            run_args,
        )

        union_cfg = cfg_gm
    ui.print_header("GET PARAMETERS")

    for v in volumes:
        ui.print_info(f"\t{v} uL")
    all_channels_same_time = (
        getattr(union_cfg, "increment", False) or union_cfg.pipette_channels == 96
    )
    test_resources = TestResources(
        ctx=run_args.ctx,
        pipette=run_args.pipette,
        tipracks=helpers._load_tipracks(
            run_args.ctx, union_cfg, use_adapters=args.channels == 96
        ),
        test_volumes=volumes,
        tips=get_tips(
            run_args.ctx,
            run_args.pipette,
            tip,
            all_channels=all_channels_same_time,
        ),
        env_sensor=run_args.environment_sensor,
        recorder=run_args.recorder,
        test_report=run_args.test_report,
    )

    if args.photometric:
        execute_photometric.run(cfg_pm, test_resources)
    else:
        execute.run(cfg_gm, test_resources)


if __name__ == "__main__":
    parser = argparse.ArgumentParser("Pipette Testing")
    parser.add_argument("--simulate", action="store_true")
    parser.add_argument("--pipette", type=int, choices=[50, 1000], required=True)
    parser.add_argument("--channels", type=int, choices=[1, 8, 96], default=1)
    parser.add_argument("--tip", type=int, choices=[0, 50, 200, 1000], default=0)
    parser.add_argument("--trials", type=int, default=0)
    parser.add_argument("--increment", action="store_true")
    parser.add_argument("--return-tip", action="store_true")
    parser.add_argument("--skip-labware-offsets", action="store_true")
    parser.add_argument("--no-blank", action="store_true")
    parser.add_argument("--mix", action="store_true")
    parser.add_argument("--user-volumes", action="store_true")
    parser.add_argument("--gantry-speed", type=int, default=GANTRY_MAX_SPEED)
    parser.add_argument("--scale-delay", type=int, default=DELAY_FOR_MEASUREMENT)
    parser.add_argument("--photometric", action="store_true")
    parser.add_argument("--touch-tip", action="store_true")
    parser.add_argument("--refill", action="store_true")
    parser.add_argument("--isolate-channels", nargs="+", type=int, default=None)
    parser.add_argument("--extra", action="store_true")
    parser.add_argument("--jog", action="store_true")
    parser.add_argument("--same-tip", action="store_true")
    args = parser.parse_args()
    run_args = RunArgs.build_run_args(args)
    try:
        if not run_args.ctx.is_simulating():
            ui.get_user_ready("CLOSE the door, and MOVE AWAY from machine")
        for tip, volumes in run_args.volumes:
            hw = run_args.ctx._core.get_hardware()
            _main(args, run_args, tip, volumes)
    finally:
        if run_args.recorder is not None:
            ui.print_info("ending recording")
            run_args.recorder.stop()
            run_args.recorder.deactivate()
        _change_pipettes(run_args.ctx, run_args.pipette)
    print("done\n\n")
