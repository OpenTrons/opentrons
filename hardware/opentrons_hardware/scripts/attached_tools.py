"""Attached tools script."""
import argparse
import asyncio
import logging
from logging.config import dictConfig

from opentrons_hardware.drivers.can_bus import CanMessenger
from opentrons_hardware.drivers.can_bus.build import build_driver
from .can_args import add_can_args, build_settings
from opentrons_hardware.hardware_control.tools.detector import ToolDetector
from opentrons_hardware.hardware_control.tools.errors import ToolDetectionFailure
from opentrons_hardware.drivers.can_bus.can_messenger import WaitableCallback


logger = logging.getLogger(__name__)

LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "basic": {"format": "%(asctime)s %(name)s %(levelname)s %(message)s"}
    },
    "handlers": {
        "file_handler": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "basic",
            "filename": "attached_tools.log",
            "maxBytes": 5000000,
            "level": logging.INFO,
            "backupCount": 3,
        },
    },
    "loggers": {
        "": {
            "handlers": ["file_handler"],
            "level": logging.INFO,
        },
    },
}


async def run_detector(
    retry_count: int, ready_wait_time_sec: float, detector: ToolDetector
) -> None:
    """Detect tool changes."""
    i = 1
    tool_generator = detector.detect()
    while True:
        try:
            await asyncio.wait_for(tool_generator.__anext__(), ready_wait_time_sec)
            break
        except asyncio.TimeoutError:
            logger.warning(
                f"Try {i}: Tool detection not ready "
                f"after {ready_wait_time_sec} seconds."
            )
            if i < retry_count:
                i += 1
            else:
                raise ToolDetectionFailure()


async def run(args: argparse.Namespace) -> None:
    """Entry point for script."""
    driver = await build_driver(build_settings(args))

    messenger = CanMessenger(driver)
    messenger.start()
    cb = WaitableCallback(messenger)
    detector = ToolDetector(messenger, cb)

    logger.info("Initiating head tool detector.")
    await run_detector(
        retry_count=args.retry_count,
        ready_wait_time_sec=args.timeout_seconds,
        detector=detector,
    )

    await messenger.stop()

    logger.info("Done")


def main() -> None:
    """Entry point."""
    dictConfig(LOG_CONFIG)

    parser = argparse.ArgumentParser(description="Head tool detector.")
    add_can_args(parser)

    parser.add_argument(
        "--retry-count",
        help="Number of times to retry tool detection.",
        type=int,
        default=3,
    )
    parser.add_argument(
        "--timeout-seconds", help="Number of seconds to wait.", type=float, default=2
    )

    args = parser.parse_args()

    asyncio.run(run(args))


if __name__ == "__main__":
    main()
