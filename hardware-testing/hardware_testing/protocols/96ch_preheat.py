"""Heat up and wait for a 96ch to reach the desired temperature."""

from opentrons.protocol_api import ProtocolContext, ParameterContext
from opentrons.hardware_control.adapters import SynchronousAdapter
from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.types import Axis, OT3AxisMap
from opentrons_hardware.sensors.sensor_driver import SensorDriver
from opentrons_hardware.sensors.sensor_types import EnvironmentSensor
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


async def read_sensor(self, sensor: EnvironmentSensor) -> float:
    """Read and return the current sensor information."""

    s_driver = SensorDriver()
    sensor_data = await s_driver.read(
            can_messenger=self._backend._messenger,
            sensor=sensor, offset=False,
        )
    assert sensor_data.temperature is not None
    return sensor_data.temperature.to_float()


def get_motors_hot(ot3api: SynchronousAdapter) -> None:
    """Adjust the motor hold currents to heat quicker."""

    axis_settings = {Axis.P_L: 1.5, Axis.Q: 1.5}
    ot3api.engage_axes([a for a in axis_settings.keys()])


def run(ctx: ProtocolContext) -> None:
    """Run."""
    ot3api = ctx._core.get_hardware()
    if not ctx.is_simulating():
        messenger = ot3api._backend._messenger
        OT3API.read_sensor = read_sensor
    primary = EnvironmentSensor.build(
        sensor_id=SensorId.S0,
        node_id=NodeId.pipette_left,
    )
    secondary =  EnvironmentSensor.build(
        sensor_id=SensorId.S1,
        node_id=NodeId.pipette_left,
    )
    _ = ctx.load_instrument(
        f"flex_96channel_{ctx.params.model_type}", "left"  # type: ignore [attr-defined]
    )
    if not ctx.is_simulating():
        current_temp_1 = ot3api.read_sensor(primary)
        current_temp_2 = ot3api.read_sensor(secondary)
        get_motors_hot(ot3api)  # type: ignore [arg-type]
        avg_temp = (current_temp_1 + current_temp_2) / 2
        target = ctx.params.temp  # type: ignore [attr-defined]
        while avg_temp < target:
            current_temp_1 = ot3api.read_sensor(primary)
            current_temp_2 = ot3api.read_sensor(secondary)
            avg_temp = (current_temp_1 + current_temp_2) / 2
            ctx.delay(seconds=15, msg=f"Current temperature {avg_temp} target={target}")
