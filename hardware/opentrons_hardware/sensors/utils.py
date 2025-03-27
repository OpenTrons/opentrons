"""Sensor helper classes."""
from dataclasses import dataclass

from typing import Literal

from opentrons_hardware.firmware_bindings.constants import (
    SensorThresholdMode,
)
from opentrons_hardware.sensors.types import SensorDataType
from opentrons_hardware.sensors.sensor_types import SensorInformation

from opentrons_hardware.drivers.can_bus.can_messenger import CanMessenger
from opentrons_hardware.firmware_bindings.constants import NodeId
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    IncreaseEvoTipDispenseCountRequestRequest,
)


async def send_evo_dispense_count_increase(
    messenger: CanMessenger, tool: Literal[NodeId.pipette_left, NodeId.pipette_right]
) -> None:
    """Tell a pipette to increase it's evo-tip-dispense-count in eeprom."""
    request = IncreaseEvoTipDispenseCountRequestRequest()

    await messenger.ensure_send(node_id=tool, message=request, expected_nodes=[tool])


@dataclass
class WriteSensorInformation:
    """Write sensor information."""

    sensor: SensorInformation
    data: SensorDataType


@dataclass
class SensorThresholdInformation:
    """Set a sensor threshold or request an autoset."""

    sensor: SensorInformation
    data: SensorDataType
    mode: SensorThresholdMode


@dataclass
class ReadSensorInformation:
    """Read sensor information."""

    sensor: SensorInformation
    offset: bool


@dataclass
class BaselineSensorInformation:
    """Poll sensor information."""

    sensor: SensorInformation
    number_of_reads: int
    offset: bool = False
