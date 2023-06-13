"""Gravimetric OT3."""
import argparse
from typing import List

from opentrons.protocol_api import ProtocolContext

from hardware_testing.data import ui
from hardware_testing.protocols import (
    gravimetric_ot3_p50,
    gravimetric_ot3_p50_multi_50ul_tip,
    gravimetric_ot3_p1000,
    gravimetric_ot3_p1000_multi_50ul_tip,
    gravimetric_ot3_p1000_multi_200ul_tip,
    gravimetric_ot3_p1000_multi_1000ul_tip,
    photometric_ot3_p1000_96_50ul_tip,
    photometric_ot3_p1000_96_200ul_tip,
    photometric_ot3_p1000_96_1000ul_tip,
)

from . import execute, helpers, workarounds, execute_photometric
from .config import GravimetricConfig, GANTRY_MAX_SPEED, PhotometricConfig
from .measurement import DELAY_FOR_MEASUREMENT

LABWARE_OFFSETS: List[dict] = []

# Keyed by pipette volume, channel count, and tip volume in that order
PROTOCOL_CFG = {
    50: {
        1: {50: gravimetric_ot3_p50},
        8: {50: gravimetric_ot3_p50_multi_50ul_tip},
    },
    1000: {
        1: {
            50: gravimetric_ot3_p1000,
            200: gravimetric_ot3_p1000,
            1000: gravimetric_ot3_p1000,
        },
        8: {
            50: gravimetric_ot3_p1000_multi_50ul_tip,
            200: gravimetric_ot3_p1000_multi_200ul_tip,
            1000: gravimetric_ot3_p1000_multi_1000ul_tip,
        },
        96: {
            50: photometric_ot3_p1000_96_50ul_tip,
            200: photometric_ot3_p1000_96_200ul_tip,
            1000: photometric_ot3_p1000_96_1000ul_tip,
        },
    },
}


def run(
    protocol: ProtocolContext,
    pipette_volume: int,
    pipette_channels: int,
    tip_volume: int,
    trials: int,
    increment: bool,
    return_tip: bool,
    blank: bool,
    mix: bool,
    inspect: bool,
    user_volumes: bool,
    gantry_speed: int,
    scale_delay: int,
) -> None:
    """Run."""
    protocol_cfg = PROTOCOL_CFG[pipette_volume][pipette_channels][tip_volume]
    execute.run(
        protocol,
        GravimetricConfig(
            name=protocol_cfg.metadata["protocolName"],  # type: ignore[attr-defined]
            pipette_mount="left",
            pipette_volume=pipette_volume,
            pipette_channels=pipette_channels,
            tip_volume=tip_volume,
            trials=trials,
            labware_offsets=LABWARE_OFFSETS,
            labware_on_scale=protocol_cfg.LABWARE_ON_SCALE,  # type: ignore[attr-defined]
            slot_scale=protocol_cfg.SLOT_SCALE,  # type: ignore[attr-defined]
            slots_tiprack=protocol_cfg.SLOTS_TIPRACK[tip_volume],  # type: ignore[attr-defined]
            increment=increment,
            return_tip=return_tip,
            blank=blank,
            mix=mix,
            inspect=inspect,
            user_volumes=user_volumes,
            gantry_speed=gantry_speed,
            scale_delay=scale_delay,
        ),
    )


def run_pm(
    protocol: ProtocolContext,
    pipette_volume: int,
    tip_volume: int,
    trials: int,
    return_tip: bool,
    blank: bool,
    mix: bool,
    inspect: bool,
    user_volumes: bool,
    gantry_speed: int,
    touch_tip: bool,
) -> None:
    """Run."""
    protocol_cfg = PROTOCOL_CFG[pipette_volume][96][tip_volume]
    execute_photometric.run(
        protocol,
        PhotometricConfig(
            name=protocol_cfg.metadata["protocolName"],  # type: ignore[attr-defined]
            pipette_mount="left",
            pipette_volume=pipette_volume,
            tip_volume=tip_volume,
            trials=trials,
            labware_offsets=LABWARE_OFFSETS,
            photoplate=protocol_cfg.PHOTOPLATE_LABWARE,  # type: ignore[attr-defined]
            photoplate_slot=protocol_cfg.SLOT_PLATE,  # type: ignore[attr-defined]
            reservoir=protocol_cfg.RESERVOIR_LABWARE,  # type: ignore[attr-defined]
            reservoir_slot=protocol_cfg.SLOT_RESERVOIR,  # type: ignore[attr-defined]
            slots_tiprack=protocol_cfg.SLOTS_TIPRACK[tip_volume],  # type: ignore[attr-defined]
            return_tip=return_tip,
            mix=mix,
            inspect=inspect,
            user_volumes=user_volumes,
            gantry_speed=gantry_speed,
            touch_tip=touch_tip,
        ),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser("Pipette Testing")
    parser.add_argument("--simulate", action="store_true")
    parser.add_argument("--pipette", type=int, choices=[50, 1000], required=True)
    parser.add_argument("--channels", type=int, choices=[1, 8, 96], default=1)
    parser.add_argument("--tip", type=int, choices=[50, 200, 1000], required=True)
    parser.add_argument("--trials", type=int, required=True)
    parser.add_argument("--increment", action="store_true")
    parser.add_argument("--return-tip", action="store_true")
    parser.add_argument("--skip-labware-offsets", action="store_true")
    parser.add_argument("--blank", action="store_true")
    parser.add_argument("--mix", action="store_true")
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--user-volumes", action="store_true")
    parser.add_argument("--gantry-speed", type=int, default=GANTRY_MAX_SPEED)
    parser.add_argument("--scale-delay", type=int, default=DELAY_FOR_MEASUREMENT)
    parser.add_argument("--photometric", action="store_true")
    parser.add_argument("--touch-tip", action="store_true")
    args = parser.parse_args()
    if not args.simulate and not args.skip_labware_offsets:
        # getting labware offsets must be done before creating the protocol context
        # because it requires the robot-server to be running
        ui.print_title("SETUP")
        print("Starting opentrons-robot-server, so we can http GET labware offsets")
        offsets = workarounds.http_get_all_labware_offsets()
        print(f"found {len(offsets)} offsets:")
        for offset in offsets:
            print(f"\t{offset['createdAt']}:")
            print(f"\t\t{offset['definitionUri']}")
            print(f"\t\t{offset['vector']}")
            LABWARE_OFFSETS.append(offset)
    _protocol = PROTOCOL_CFG[args.pipette][args.channels][args.tip]
    _ctx = helpers.get_api_context(
        _protocol.requirements["apiLevel"],  # type: ignore[attr-defined]
        is_simulating=args.simulate,
    )
    if args.photometric:
        _ctx = helpers.get_api_context(
            _protocol.requirements["apiLevel"],  # type: ignore[attr-defined]
            is_simulating=args.simulate,
            deck_version="2",
        )
        run_pm(
            _ctx,
            args.pipette,
            args.tip,
            args.trials,
            args.return_tip,
            args.blank,
            args.mix,
            args.inspect,
            args.user_volumes,
            args.gantry_speed,
            args.touch_tip,
        )
    else:
        _ctx = helpers.get_api_context(
            _protocol.requirements["apiLevel"],  # type: ignore[attr-defined]
            is_simulating=args.simulate,
        )
        run(
            _ctx,
            args.pipette,
            args.channels,
            args.tip,
            args.trials,
            args.increment,
            args.return_tip,
            args.blank,
            args.mix,
            args.inspect,
            args.user_volumes,
            args.gantry_speed,
            args.scale_delay,
        )
