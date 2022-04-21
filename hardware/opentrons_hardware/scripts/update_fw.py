"""Firmware update script."""
import argparse
import asyncio
import logging
from logging.config import dictConfig

from typing_extensions import Final

from opentrons_hardware.drivers.can_bus import CanMessenger
from opentrons_hardware.drivers.can_bus.build import build_driver
from opentrons_hardware.firmware_bindings import NodeId
from opentrons_hardware.firmware_update.run import run_update
from .can_args import add_can_args, build_settings


logger = logging.getLogger(__name__)

LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "basic": {"format": "%(asctime)s %(name)s %(levelname)s %(message)s"}
    },
    "handlers": {
        "stream_handler": {
            "class": "logging.StreamHandler",
            "formatter": "basic",
            "level": logging.DEBUG,
        },
    },
    "loggers": {
        "": {
            "handlers": ["stream_handler"],
            "level": logging.DEBUG,
        },
    },
}

TARGETS: Final = {
    "head": NodeId.head,
    "gantry-x": NodeId.gantry_x,
    "gantry-y": NodeId.gantry_y,
    "pipette-left": NodeId.pipette_left,
    "pipette-right": NodeId.pipette_right,
    "gripper": NodeId.gripper,
}


async def run(args: argparse.Namespace) -> None:
    """Entry point for script."""
    target = TARGETS[args.target]
    retry_count = args.retry_count
    timeout_seconds = args.timeout_seconds
    erase = not args.no_erase

    driver = await build_driver(build_settings(args))

    messenger = CanMessenger(driver)
    messenger.start()

    try:
        await run_update(
            messenger=messenger,
            node_id=target,
            hex_file=args.file,
            retry_count=retry_count,
            timeout_seconds=timeout_seconds,
            erase=erase,
        )
    finally:
        await messenger.stop()

    logger.info("Done")


def main() -> None:
    """Entry point."""
    dictConfig(LOG_CONFIG)

    parser = argparse.ArgumentParser(description="FW Update.")
    add_can_args(parser)

    parser.add_argument(
        "--target",
        help="The FW subsystem to be updated.",
        type=str,
        required=True,
        choices=TARGETS.keys(),
    )
    parser.add_argument(
        "--file",
        help="Path to hex file containing the FW executable.",
        type=argparse.FileType("r"),
        required=True,
    )
    parser.add_argument(
        "--retry-count",
        help="Number of times to retry bootloader detection.",
        type=int,
        default=3,
    )
    parser.add_argument(
        "--timeout-seconds", help="Number of seconds to wait.", type=float, default=10
    )
    parser.add_argument(
        "--no-erase",
        help="Don't erase existing application from flash.",
        action="store_true",
        default=False,
    )

    args = parser.parse_args()

    asyncio.run(run(args))


if __name__ == "__main__":
    main()
