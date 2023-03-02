"""Gravimetric OT3."""
import argparse
from pathlib import Path

from opentrons.protocol_api import ProtocolContext
from opentrons.config import infer_config_base_dir, IS_ROBOT

from hardware_testing.gravimetric import execute
from hardware_testing.gravimetric import helpers


metadata = {"apiLevel": "2.13", "protocolName": "gravimetric-ot3"}


def run(protocol: ProtocolContext) -> None:
    """Run."""
    execute.run(
        protocol,
        execute.ExecuteGravConfig(
            name=metadata["protocolName"],
            pipette_mount="left",
            pipette_volume=50,
            tip_volume=50,
            trials=10,
            slot_vial=4,
            slot_tiprack=7,
        ),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser("Pipette Testing")
    parser.add_argument(
        "--simulate", action="store_true", help="If set, the protocol will be simulated"
    )
    args = parser.parse_args()
    _ctx = helpers.get_api_context(
        metadata["apiLevel"],
        is_simulating=args.simulate,
        pipette_left="p50_single_v3.3",
    )
    _ctx.home()
    run(_ctx)
