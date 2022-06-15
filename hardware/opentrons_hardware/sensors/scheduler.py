"""Sensor driver message scheduler."""
import asyncio
import logging
from contextlib import asynccontextmanager

from typing import Optional, Type, TypeVar, Callable, AsyncIterator, cast

from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    SensorOutputBinding,
    SensorType,
    MessageId,
)
from opentrons_hardware.firmware_bindings.arbitration_id import ArbitrationId

from opentrons_hardware.drivers.can_bus.can_messenger import (
    CanMessenger,
    WaitableCallback,
)

from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    ReadFromSensorRequest,
    PeripheralStatusRequest,
    SetSensorThresholdRequest,
    WriteToSensorRequest,
    BaselineSensorRequest,
    SensorThresholdResponse,
    ReadFromSensorResponse,
    PeripheralStatusResponse,
    BindSensorOutputRequest,
)
from opentrons_hardware.firmware_bindings.messages.messages import MessageDefinition
from opentrons_hardware.firmware_bindings.messages.payloads import (
    ReadFromSensorRequestPayload,
    PeripheralStatusRequestPayload,
    SetSensorThresholdRequestPayload,
    WriteToSensorRequestPayload,
    BaselineSensorRequestPayload,
    BindSensorOutputRequestPayload,
)
from opentrons_hardware.firmware_bindings.messages.fields import (
    SensorTypeField,
    SensorOutputBindingField,
    SensorThresholdModeField,
)

from opentrons_hardware.sensors.utils import (
    ReadSensorInformation,
    SensorDataType,
    WriteSensorInformation,
    PollSensorInformation,
    SensorThresholdInformation,
    SensorInformation,
)
from opentrons_hardware.firmware_bindings.utils import (
    UInt8Field,
    UInt16Field,
    UInt32Field,
)

log = logging.getLogger(__name__)
ResponseType = TypeVar("ResponseType", bound=MessageDefinition)


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

                def _format(message: ReadFromSensorResponse) -> SensorDataType:
                    return SensorDataType.build(message.payload.sensor_data)

                data = await asyncio.wait_for(
                    self._wait_for_response(
                        sensor.node_id, reader, ReadFromSensorResponse, _format
                    ),
                    timeout,
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

                def _format(response: ReadFromSensorResponse) -> SensorDataType:
                    return SensorDataType.build(response.payload.sensor_data)

                data = await asyncio.wait_for(
                    self._wait_for_response(
                        sensor.node_id, reader, ReadFromSensorResponse, _format
                    ),
                    timeout,
                )
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

        def _format(response: ReadFromSensorResponse) -> SensorDataType:
            return SensorDataType.build(response.payload.sensor_data)

        with WaitableCallback(can_messenger) as reader:
            try:
                data = await self._wait_for_response(
                    node_id, reader, ReadFromSensorResponse, _format
                )
            except asyncio.TimeoutError:
                log.warning("Sensor Read timed out")
            finally:
                return data

    async def send_threshold(
        self,
        sensor: SensorThresholdInformation,
        can_messenger: CanMessenger,
        timeout: float = 1.0,
    ) -> Optional[SensorDataType]:
        """Send threshold message."""
        with WaitableCallback(can_messenger) as reader:
            data: Optional[SensorDataType] = None
            await can_messenger.send(
                node_id=sensor.node_id,
                message=SetSensorThresholdRequest(
                    payload=SetSensorThresholdRequestPayload(
                        sensor=SensorTypeField(sensor.sensor_type),
                        threshold=sensor.data.backing,
                        mode=SensorThresholdModeField(sensor.mode.value),
                    )
                ),
            )
            try:

                def _format(response: SensorThresholdResponse) -> SensorDataType:
                    return SensorDataType.build(response.payload.threshold)

                data = await asyncio.wait_for(
                    self._wait_for_response(
                        sensor.node_id, reader, SensorThresholdResponse, _format
                    ),
                    timeout,
                )
            except asyncio.TimeoutError:
                log.warning("Sensor Read timed out")
            finally:
                return data

    @staticmethod
    async def _wait_for_response(
        node_id: NodeId,
        reader: WaitableCallback,
        response_def: Type[ResponseType],
        response_handler: Callable[[ResponseType], Optional[SensorDataType]],
    ) -> Optional[SensorDataType]:
        """Listener for receiving messages back."""
        async for response, arbitration_id in reader:
            if arbitration_id.parts.originating_node_id == node_id:
                if isinstance(response, response_def):
                    return response_handler(response)
        return None

    @staticmethod
    async def _read_peripheral_response(
        node_id: NodeId,
        reader: WaitableCallback,
    ) -> bool:
        """Waits for and sends back PeripheralStatusResponse."""
        async for response, arbitration_id in reader:
            if arbitration_id.parts.originating_node_id == node_id:
                if isinstance(response, PeripheralStatusResponse):
                    return bool(response.payload.status)
        return False

    async def request_peripheral_status(
        self,
        sensor: SensorType,
        node_id: NodeId,
        can_messenger: CanMessenger,
        timeout: int,
    ) -> bool:
        """Send threshold message."""
        with WaitableCallback(can_messenger) as reader:
            status = False
            await can_messenger.send(
                node_id=node_id,
                message=PeripheralStatusRequest(
                    payload=PeripheralStatusRequestPayload(
                        sensor=SensorTypeField(sensor),
                    )
                ),
            )

            try:
                response = asyncio.wait_for(
                    self._read_peripheral_response(node_id, reader), timeout
                )
                status = await response
            except asyncio.TimeoutError:
                log.warning("Sensor Read timed out")
            finally:
                return status

    @staticmethod
    def _log_sensor_output(message: MessageDefinition, arb: ArbitrationId) -> None:
        if isinstance(message, ReadFromSensorResponse):
            log.info(
                f"{SensorType(message.payload.sensor.value).name}: "
                f"{SensorDataType.build(message.payload.sensor_data).to_float()}"
            )

    @asynccontextmanager
    async def bind_sync(
        self,
        target_sensor: SensorInformation,
        can_messenger: CanMessenger,
        timeout: float = 0.5,
        log: bool = False,
    ) -> AsyncIterator[None]:
        """While acquired, bind the specified sensor to control sync."""
        flags = [SensorOutputBinding.sync]
        if log:
            flags.append(SensorOutputBinding.report)
        await can_messenger.send(
            node_id=target_sensor.node_id,
            message=BindSensorOutputRequest(
                payload=BindSensorOutputRequestPayload(
                    sensor=SensorTypeField(target_sensor.sensor_type),
                    binding=SensorOutputBindingField.from_flags(flags),
                )
            ),
        )
        try:
            if log:
                can_messenger.add_listener(self._log_sensor_output)
            yield
        finally:
            if log:
                can_messenger.remove_listener(self._log_sensor_output)
            await can_messenger.send(
                node_id=target_sensor.node_id,
                message=BindSensorOutputRequest(
                    payload=BindSensorOutputRequestPayload(
                        sensor=SensorTypeField(target_sensor.sensor_type),
                        binding=SensorOutputBindingField(
                            SensorOutputBinding.none.value
                        ),
                    )
                ),
            )

    @asynccontextmanager
    async def capture_output(
        self,
        target_sensor: SensorInformation,
        can_messenger: CanMessenger,
    ) -> AsyncIterator["asyncio.Queue[float]"]:
        """While acquired, capture the sensor's logging output."""
        response_queue: "asyncio.Queue[float]" = asyncio.Queue()

        def _logging_listener(
            message: MessageDefinition, arb_id: ArbitrationId
        ) -> None:
            payload = cast(ReadFromSensorResponse, message).payload
            response_queue.put_nowait(
                SensorDataType.build(payload.sensor_data).to_float()
            )

        def _filter(arbitration_id: ArbitrationId) -> bool:
            return (
                NodeId(arbitration_id.parts.originating_node_id)
                == target_sensor.node_id
            ) and (
                MessageId(arbitration_id.parts.message_id)
                == MessageId.read_sensor_response
            )

        can_messenger.add_listener(_logging_listener, _filter)
        await can_messenger.send(
            node_id=target_sensor.node_id,
            message=BindSensorOutputRequest(
                payload=BindSensorOutputRequestPayload(
                    sensor=SensorTypeField(target_sensor.sensor_type),
                    binding=SensorOutputBindingField(SensorOutputBinding.report.value),
                )
            ),
        )
        try:
            yield response_queue
        finally:
            can_messenger.remove_listener(_logging_listener)
            await can_messenger.send(
                node_id=target_sensor.node_id,
                message=BindSensorOutputRequest(
                    payload=BindSensorOutputRequestPayload(
                        sensor=SensorTypeField(target_sensor.sensor_type),
                        binding=SensorOutputBindingField(
                            SensorOutputBinding.none.value
                        ),
                    )
                ),
            )
