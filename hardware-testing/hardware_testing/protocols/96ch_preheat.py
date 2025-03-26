"""Heat up and wait for a 96ch to reach the desired temperature."""

from opentrons.protocol_api import ProtocolContext, ParameterContext
from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.types import Axis
from opentrons_hardware.sensors.scheduler import SensorScheduler
from opentrons_hardware.sensors.utils import (
    ReadSensorInformation,
)
from opentrons_hardware.sensors.sensor_types import SensorInformation
from opentrons_hardware.firmware_bindings.constants import NodeId, SensorId, SensorType
import asyncio
from opentrons_hardware.drivers.can_bus import CanMessenger


def add_parameters(parameters: ParameterContext) -> None:
    """Build the runtime parameters."""
    parameters.add_int(
        display_name="model type",
        variable_name="model_type",
        default=200,
        choices=[
            {"display_name": "200", "value": 200},
            {"display_name": "1000", "value": 1000},
        ],
        description="Select model type.",
    )

    parameters.add_int(
        display_name="Target Temperature",
        variable_name="temp",
        default=27,
        minimum=20,
        maximum=35,
        description="Set the target temperature for the pre-heat",
    )


metadata = {"protocolName": "96ch Pre-heating protocol"}

requirements = {"robotType": "Flex", "apiLevel": "2.21"}


def read_sensor(
    sensor: SensorInformation, messenger: CanMessenger, loop: asyncio.AbstractEventLoop
) -> float:
    """Read and return the current sensor information."""
    scheduler = SensorScheduler()
    sensor_data = loop.run_until_complete(
        scheduler.send_read(
            ReadSensorInformation(sensor=sensor, offset=False),
            can_messenger=messenger,
            timeout=1,
        )
    )
    sensor_floats = [d.to_float() for d in sensor_data]
    return sum(sensor_floats) / len(sensor_floats)


def get_motors_hot(ot3api: OT3API, loop: asyncio.AbstractEventLoop) -> None:
    """Adjust the motor hold currents to heat quicker."""
    axis_settings = {Axis.P_L: 1.5, Axis.Q: 1.5}
    loop.run_until_complete(ot3api.engage_axes([a for a in axis_settings.keys()]))
    loop.run_until_complete(
        ot3api._backend.set_hold_current(axis_settings)  # type: ignore [attr-defined]
    )


def run(ctx: ProtocolContext) -> None:
    """Run."""
    ot3api = ctx._core.get_hardware()
    if not ctx.is_simulating():
        messenger = ot3api._backend._messenger
        loop = ot3api._loop
    primary = SensorInformation(
        sensor_type=SensorType.temperature,
        sensor_id=SensorId.S0,
        node_id=NodeId.pipette_left,
    )
    secondary = SensorInformation(
        sensor_type=SensorType.temperature,
        sensor_id=SensorId.S1,
        node_id=NodeId.pipette_left,
    )
    _ = ctx.load_instrument(
        f"flex_96channel_{ctx.params.model_type}", "left"  # type: ignore [attr-defined]
    )
    if not ctx.is_simulating():
        current_temp_1 = read_sensor(primary, messenger, loop)
        current_temp_2 = read_sensor(secondary, messenger, loop)
        get_motors_hot(ot3api, loop)  # type: ignore [arg-type]
        avg_temp = (current_temp_1 + current_temp_2) / 2
        target = ctx.params.temp  # type: ignore [attr-defined]
        while avg_temp < target:
            ctx.delay(minutes=5, msg=f"Current temperature={avg_temp} target={target}")
            current_temp_1 = read_sensor(primary, messenger, loop)
            current_temp_2 = read_sensor(secondary, messenger, loop)
            avg_temp = (current_temp_1 + current_temp_2) / 2
