"""Utilities for gathering motor position/status for an OT3 axis."""
import asyncio
from typing import Set, Tuple
import logging
from opentrons_hardware.drivers.can_bus.can_messenger import (
    CanMessenger,
    WaitableCallback,
    MultipleMessagesWaitableCallback,
)
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    MotorPositionRequest,
    MotorPositionResponse,
)
from opentrons_hardware.firmware_bindings.arbitration_id import ArbitrationId
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    MessageId,
    MotorPositionFlags,
)

from .types import NodeMap


log = logging.getLogger(__name__)


MotorPositionStatus = NodeMap[Tuple[float, float, bool, bool]]


async def _parser_motor_position_response(
    reader: WaitableCallback,
) -> MotorPositionStatus:
    data = {}
    async for response, arb_id in reader:
        assert isinstance(response, MotorPositionResponse)
        node = NodeId(arb_id.parts.originating_node_id)
        data.update(
            {
                node: (
                    float(response.payload.current_position.value / 1000.0),
                    float(response.payload.encoder_position.value) / 1000.0,
                    bool(
                        response.payload.position_flags.value
                        & MotorPositionFlags.stepper_position_ok.value
                    ),
                    bool(
                        response.payload.position_flags.value
                        & MotorPositionFlags.encoder_position_ok.value
                    ),
                )
            }
        )
    return data


async def get_motor_position(
    can_messenger: CanMessenger, nodes: Set[NodeId], timeout: float = 1.0
) -> MotorPositionStatus:
    """Request node to respond with motor and encoder status."""
    data: MotorPositionStatus = {}

    def _listener_filter(arbitration_id: ArbitrationId) -> bool:
        return (NodeId(arbitration_id.parts.originating_node_id) in nodes) and (
            MessageId(arbitration_id.parts.message_id)
            == MotorPositionResponse.message_id
        )

    with MultipleMessagesWaitableCallback(
        can_messenger,
        _listener_filter,
        len(nodes),
    ) as reader:
        await can_messenger.send(
            node_id=NodeId.broadcast, message=MotorPositionRequest()
        )
        try:
            data = await asyncio.wait_for(
                _parser_motor_position_response(reader),
                timeout,
            )
        except asyncio.TimeoutError:
            log.warning("Motor position timed out")
    return data
