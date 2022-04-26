"""Sensor driver message scheduler."""
import asyncio
import logging

from typing import Optional

from opentrons_hardware.firmware_bindings import NodeId
from opentrons_hardware.drivers.can_bus.can_messenger import (
    CanMessenger,
    WaitableCallback,
)

from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    ReadFromSensorRequest,
    SetSensorThresholdRequest,
    WriteToSensorRequest,
    BaselineSensorRequest,
    SensorThresholdResponse,
    ReadFromSensorResponse,
)
from opentrons_hardware.firmware_bindings.messages.payloads import (
    ReadFromSensorRequestPayload,
    SetSensorThresholdRequestPayload,
    WriteToSensorRequestPayload,
    BaselineSensorRequestPayload,
)
from opentrons_hardware.firmware_bindings.messages.fields import (
    SensorTypeField,
)

from opentrons_hardware.sensors.utils import (
    ReadSensorInformation,
    SensorDataType,
    WriteSensorInformation,
    PollSensorInformation,
)
from opentrons_hardware.firmware_bindings.utils import (
    UInt8Field,
    UInt16Field,
    UInt32Field,
    Int32Field,
)

log = logging.getLogger(__name__)


class SensorScheduler:
    """Sensor message scheduler."""

    async def run_poll(
        self, sensor: PollSensorInformation, can_messenger: CanMessenger, timeout: int
    ) -> Optional[SensorDataType]:
        """Send poll message."""
        with WaitableCallback(can_messenger) as reader:
            data: Optional[SensorDataType] = None
            await can_messenger.send(
                node_id=sensor.node_id,
                message=BaselineSensorRequest(
                    payload=BaselineSensorRequestPayload(
                        sensor=SensorTypeField(sensor.sensor_type),
                        sample_rate=UInt16Field(sensor.poll_for),
                    )
                ),
            )
            try:
                data = await asyncio.wait_for(
                    self._wait_for_response(sensor.node_id, reader), timeout
                )
            except asyncio.TimeoutError:
                log.warning("Sensor poll timed out")
            finally:
                return data

    async def send_write(
        self, sensor: WriteSensorInformation, can_messenger: CanMessenger
    ) -> None:
        """Send write message."""
        await can_messenger.send(
            node_id=sensor.node_id,
            message=WriteToSensorRequest(
                payload=WriteToSensorRequestPayload(
                    sensor=SensorTypeField(sensor.sensor_type),
                    data=UInt32Field(sensor.data.to_int),
                    # TODO(lc, 03-29-2022, actually pass in a register value)
                    reg_address=UInt8Field(0x0),
                )
            ),
        )

    async def send_read(
        self, sensor: ReadSensorInformation, can_messenger: CanMessenger, timeout: int
    ) -> Optional[SensorDataType]:
        """Send read message."""
        with WaitableCallback(can_messenger) as reader:
            data: Optional[SensorDataType] = None
            await can_messenger.send(
                node_id=sensor.node_id,
                message=ReadFromSensorRequest(
                    payload=ReadFromSensorRequestPayload(
                        sensor=SensorTypeField(sensor.sensor_type),
                        offset_reading=UInt8Field(int(sensor.offset)),
                    )
                ),
            )
            try:
                data = await asyncio.wait_for(
                    self._wait_for_response(sensor.node_id, reader), timeout
                )
                print("wait_for_response done")
            except asyncio.TimeoutError:
                log.warning("Sensor Read timed out")
            finally:
                return data

    async def read(
        self,
        can_messenger: CanMessenger,
        node_id: NodeId,
    ) -> Optional[SensorDataType]:
        """Helper function for the get_report sensor driver.

        This simply retrieves CAN messages without first
        sending a ReadFromSensorRequest.
        """
        data: Optional[SensorDataType] = SensorDataType.build(0)
        with WaitableCallback(can_messenger) as reader:
            try:
                data = await self._wait_for_response(node_id, reader)
                print(" read data = ", data)

            except asyncio.TimeoutError:
                log.warning("Sensor Read timed out")
            finally:
                return data

    async def send_threshold(
        self, sensor: WriteSensorInformation, can_messenger: CanMessenger, timeout: int
    ) -> Optional[SensorDataType]:
        """Send threshold message."""
        with WaitableCallback(can_messenger) as reader:
            data: Optional[SensorDataType] = None
            await can_messenger.send(
                node_id=sensor.node_id,
                message=SetSensorThresholdRequest(
                    payload=SetSensorThresholdRequestPayload(
                        sensor=SensorTypeField(sensor.sensor_type),
                        threshold=Int32Field(sensor.data.to_int),
                    )
                ),
            )
            try:
                data = await asyncio.wait_for(
                    self._wait_for_response(sensor.node_id, reader), timeout
                )
            except asyncio.TimeoutError:
                log.warning("Sensor Read timed out")
            finally:
                return data

    @staticmethod
    async def _wait_for_response(
        node_id: NodeId, reader: WaitableCallback
    ) -> Optional[SensorDataType]:
        """Listener for receiving messages back."""
        async for response, arbitration_id in reader:
            if arbitration_id.parts.originating_node_id == node_id:
                if isinstance(response, ReadFromSensorResponse):
                    return SensorDataType.build(response.payload.sensor_data)
                elif isinstance(response, SensorThresholdResponse):
                    return SensorDataType.build(response.payload.threshold)
        return None
