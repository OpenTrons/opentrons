import logging
import asyncio
import argparse
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Any, Type, Sequence, Callable, Optional, Tuple, cast
from logging.config import dictConfig
# from opentrons.types import Point
from opentrons_hardware.drivers.can_bus.abstract_driver import AbstractCanDriver
from opentrons_hardware.firmware_bindings.constants import NodeId, SensorType
from opentrons_hardware.scripts.can_args import add_can_args, build_settings
from opentrons_hardware.drivers.can_bus.build import build_driver

from .utils import SensorRun, handle_capacitive_sensor, handle_environment_sensor, handle_pressure_sensor

GetInputFunc = Callable[[str], str]
OutputFunc = Callable[[str], None]


class InvalidInput(Exception):
    """Invalid input exception."""

    pass


def create_choices(enum_type: Type[Enum]) -> Sequence[str]:
    """Create choice strings.

    Args:
        enum_type: enum

    Returns:
        a collection of strings describing the choices in enum.

    """
    # mypy wants type annotation for v.
    return [f"{i}: {v.name}" for (i, v) in enumerate(enum_type)]  # type: ignore[var-annotated]  # noqa: E501


def prompt_enum(get_user_input: GetInputFunc, output_func: OutputFunc
) -> SensorType:
    """Prompt to choose a member of the enum.

    Args:
        output_func: Function to output text to user.
        get_user_input: Function to get user input.
        enum_type: an enum type

    Returns:
        The choice.

    """
    output_func(f"choose {SensorType.__name__}:")
    for row in create_choices(SensorType):
        output_func(f"\t{row}")

    try:
        return list(SensorType)[int(get_user_input("enter sensor: "))]
    except (ValueError, IndexError) as e:
        raise InvalidInput(str(e))

def prompt_str_input(
    prompt_name: str, get_user_input: GetInputFunc) -> str:
    """Prompt to choose a member of the enum.

    Args:
        output_func: Function to output text to user.
        get_user_input: Function to get user input.
        enum_type: an enum type

    Returns:
        The choice.

    """
    try:
        return str(get_user_input(f"type in {prompt_name}:"))
    except (ValueError, IndexError) as e:
        raise InvalidInput(str(e))

def prompt_int_input(
    prompt_name: str, get_user_input: GetInputFunc) -> int:
    """Prompt to choose a member of the enum.

    Args:
        output_func: Function to output text to user.
        get_user_input: Function to get user input.
        enum_type: an enum type

    Returns:
        The choice.

    """
    try:
        return int(get_user_input(f"{prompt_name}:"))
    except (ValueError, IndexError) as e:
        raise InvalidInput(str(e))


# def prompt_positions(get_user_input: GetInputFunc, output_func: OutputFunc) -> Optional[Dict[str, Point]]:
#     """Prompt to choose a member of the enum.

#     Args:
#         output_func: Function to output text to user.
#         get_user_input: Function to get user input.
#         enum_type: an enum type

#     Returns:
#         The choice.

#     """
#     positions = {'start': Point(0, 0, 0), 'end': Point(0, 0, 0)}
#     text = """
#     The capacitive sensor requires two positions for data aquisition. \n
#     The start position will be the location for the pipette to move to before beginning measurement. \n
#     The end position is the location for the pipette to move to while taking measurements. \n
#     """

#     try:
#         output_func(text)
#         for key in positions.keys():
#             get_user_input(f"type in {key}:")
#         return positions
#     except (ValueError, IndexError) as e:
#         raise InvalidInput(str(e))

def prompt_message(get_user_input: GetInputFunc, output_func: OutputFunc) -> Tuple[SensorRun, bool]:
    sensor_type = prompt_enum(get_user_input, output_func)
    device_id = prompt_str_input('device id', get_user_input)
    pipette_mount = prompt_str_input('pipette_mount', get_user_input)
    auto_zero = prompt_int_input('auto zero', get_user_input)
    minutes = prompt_int_input('script run time in minutes', get_user_input)
    output_to_csv = bool(prompt_int_input('output to csv', get_user_input))

    positions: Optional[Dict[str, Any]] = None
    # if sensor_type == SensorType.capacitive:
    #     positions = prompt_positions(get_user_input, output_func)

    sensor_run = SensorRun(sensor_type, device_id, bool(auto_zero), minutes, pipette_mount, positions)
    return sensor_run, output_to_csv

async def send_sensor_command(driver: AbstractCanDriver, command: SensorRun, csv: bool) -> None:
    if command.pipette_mount == 'left':
        node = NodeId.pipette_left
    else:
        node = NodeId.pipette_right
    if SensorRun.sensor_type == SensorType.pressure:
        await handle_pressure_sensor(command, driver, node, csv, log)        
    elif SensorRun.sensor_type == SensorType.capacitive:
        await handle_capacitive_sensor(command, driver, node, csv, log)
    else:
        await handle_environment_sensor(command, driver, node, csv, log)


async def ui_task(can_driver: AbstractCanDriver) -> None:
    """UI task to create and send messages.

    Args:
        can_driver: Can driver.

    Returns: None.
    """
    while True:
        try:
            # Run sync prompt message in threadpool executor.
            sensor_command, to_csv = await asyncio.get_event_loop().run_in_executor(
                None, prompt_message, input, print
            )
            await send_sensor_command(can_driver, sensor_command, to_csv)
        except InvalidInput as e:
            print(str(e))


async def run(args: argparse.Namespace) -> None:
    """Entry point for script."""
    driver = await build_driver(build_settings(args))

    loop = asyncio.get_event_loop()
    fut = asyncio.gather(
        loop.create_task(loop.create_task(ui_task(driver))
    ))
    try:
        await fut
    except KeyboardInterrupt:
        fut.cancel()
    except asyncio.CancelledError:
        pass
    finally:
        driver.shutdown()


log = logging.getLogger(__name__)

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
            "filename": "sensors.log",
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

def main() -> None:
    """Entry point."""
    dictConfig(LOG_CONFIG)

    parser = argparse.ArgumentParser(description="Test communicating with sensors.")
    add_can_args(parser)

    args = parser.parse_args()

    asyncio.run(run(args))


if __name__ == "__main__":
    main()
