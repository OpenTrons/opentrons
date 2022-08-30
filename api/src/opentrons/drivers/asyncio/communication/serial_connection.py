from __future__ import annotations

import asyncio
import logging
from typing import Optional

from opentrons.drivers.command_builder import CommandBuilder

from .errors import NoResponse, AlarmResponse, ErrorResponse
from .async_serial import AsyncSerial

log = logging.getLogger(__name__)


class SerialConnection:
    @classmethod
    async def create(
        cls,
        port: str,
        baud_rate: int,
        timeout: float,
        ack: str,
        name: Optional[str] = None,
        retry_wait_time_seconds: float = 0.1,
        loop: Optional[asyncio.AbstractEventLoop] = None,
        error_keyword: Optional[str] = None,
        alarm_keyword: Optional[str] = None,
        reset_buffer_before_write: bool = False,
        handle_async: bool = False,
        async_error_ack: Optional[str] = None,
    ) -> SerialConnection:
        """
        Create a connection.

        Args:
            port: url or port to connect to
            baud_rate: baud rate
            timeout: timeout in seconds
            ack: the command response ack
            name: the connection name
            retry_wait_time_seconds: how long to wait between retries.
            loop: optional event loop.
            error_keyword: optional string that will cause an
                           ErrorResponse exception when detected
                           (default: error)
            alarm_keyword: optional string that will cause an
                           AlarmResponse exception when detected
                           (default: alarm)
            reset_buffer_before_write: whether to reset the read buffer before
              every write

        Returns: SerialConnection
        """
        serial = await AsyncSerial.create(
            port=port,
            baud_rate=baud_rate,
            timeout=timeout,
            loop=loop,
            reset_buffer_before_write=reset_buffer_before_write,
        )
        name = name or port
        return cls(
            serial=serial,
            port=port,
            name=name,
            ack=ack,
            retry_wait_time_seconds=retry_wait_time_seconds,
            error_keyword=error_keyword or "error",
            alarm_keyword=alarm_keyword or "alarm",
            handle_async=handle_async,
            async_error_ack=async_error_ack or "async",
        )

    def __init__(
        self,
        serial: AsyncSerial,
        port: str,
        name: str,
        ack: str,
        retry_wait_time_seconds: float,
        error_keyword: str,
        alarm_keyword: str,
        handle_async: bool,
        async_error_ack: str,
    ) -> None:
        """
        Constructor

        Args:
            serial: AsyncSerial object
            port: url or port to connect to
            ack: the command response ack
            name: the connection name
            retry_wait_time_seconds: how long to wait between retries.
            error_keyword: string that will cause an ErrorResponse
                           exception when detected
            alarm_keyword: string that will cause an AlarmResponse
                           exception when detected
        """
        self._serial = serial
        self._port = port
        self._name = name
        self._ack = ack.encode()
        self._retry_wait_time_seconds = retry_wait_time_seconds
        self._send_data_lock = asyncio.Lock()
        self._error_keyword = error_keyword.lower()
        self._alarm_keyword = alarm_keyword.lower()
        self._handle_async = handle_async
        self._async_error_ack = async_error_ack.lower()

    async def send_command(
        self, command: CommandBuilder, retries: int = 0, timeout: Optional[float] = None
    ) -> str:
        """
        Send a command and return the response.

        Args:
            command: A command builder.
            retries: number of times to retry in case of timeout
            timeout: optional override of default timeout in seconds

        Returns: The command response

        Raises: SerialException
        """
        return await self.send_data(
            data=command.build(), retries=retries, timeout=timeout
        )

    async def send_dfu_command(self, command: CommandBuilder) -> None:
        """
        Send a dfu command to enter device bootloader.

        This method doesn't wait for a response after sending the command since the
        module port gets disconnected once it enters its bootloader.
        """
        encoded_command = command.build().encode()

        async with self._send_data_lock:
            log.debug(f"{self.name}: Write -> {encoded_command!r}")
            await self._serial.write(data=encoded_command)

    async def send_data(
        self, data: str, retries: int = 0, timeout: Optional[float] = None
    ) -> str:
        """
        Send data and return the response.

        Args:
            data: The data to send.
            retries: number of times to retry in case of timeout
            timeout: optional override of default timeout in seconds

        Returns: The command response

        Raises: SerialException
        """
        async with self._send_data_lock, self._serial.timeout_override(
            "timeout", timeout
        ):
            if (self._handle_async):
                return await self._send_data_async(data=data, retries=retries)
            else:
                return await self._send_data(data=data, retries=retries)

    async def _send_data(self, data: str, retries: int = 0) -> str:
        """
        Send data and return the response.

        Args:
            data: The data to send.
            retries: number of times to retry in case of timeout

        Returns: The command response

        Raises: SerialException
        """
        data_encode = data.encode()

        for retry in range(retries + 1):
            log.debug(f"{self.name}: Write -> {data_encode!r}")
            await self._serial.write(data=data_encode)

            response = await self._serial.read_until(match=self._ack)
            log.debug(f"{self.name}: Read <- {response!r}")

            if (
                self._ack in response
                or self._error_keyword.encode() in response.lower()
            ):
                # Remove ack from response
                response = response.replace(self._ack, b"")
                str_response = self.process_raw_response(
                    command=data, response=response.decode()
                )
                self.raise_on_error(response=str_response)
                return str_response

            log.info(f"{self.name}: retry number {retry}/{retries}")

            await self.on_retry()

        raise NoResponse(port=self._port, command=data)

    async def _send_data_async(self, data: str, retries: int = 0) -> str:
        """
        Send data and return the response.

        Args:
            data: The data to send.
            retries: number of times to retry in case of timeout

        Returns: The command response

        Raises: SerialException
        """
        data_encode = data.encode()

        for retry in range(retries + 1):
            log.debug(f"{self.name}: Write -> {data_encode!r}")
            await self._serial.write(data=data_encode)

            response = await self._serial.read_until(match=self._ack)
            log.debug(f"{self.name}: Read <- {response!r}")

            while self._async_error_ack.encode() in response.lower():
                #check for multiple a priori async errors
                response = await self._serial.read_until(match=self._ack)
                log.debug(f"{self.name}: Read <- {response!r}")

            if (self._ack in response):
                # Remove ack from response
                response = response.replace(self._ack, b"")
                str_response = self.process_raw_response(
                    command=data, response=response.decode()
                )
                self.raise_on_error(response=str_response)
                return str_response

            log.info(f"{self.name}: retry number {retry}/{retries}")

            await self.on_retry()

        raise NoResponse(port=self._port, command=data)

    async def open(self) -> None:
        """Open the connection."""
        await self._serial.open()

    async def close(self) -> None:
        """Close the connection."""
        await self._serial.close()

    async def is_open(self) -> bool:
        """Check if connection is open."""
        return await self._serial.is_open()

    @property
    def port(self) -> str:
        return self._port

    @property
    def name(self) -> str:
        return self._name

    def raise_on_error(self, response: str) -> None:
        """
        Raise an error if the response contains an error

        Args:
            response: response

        Returns: None

        Raises: SerialException
        """
        lower = response.lower()

        if self._alarm_keyword in lower:
            raise AlarmResponse(port=self._port, response=response)

        if self._error_keyword in lower:
            raise ErrorResponse(port=self._port, response=response)

    async def on_retry(self) -> None:
        """
        Opportunity for derived classes to perform action between retries. Default
        behaviour is to wait then re-open the connection.

        Returns: None
        """
        await asyncio.sleep(self._retry_wait_time_seconds)
        await self._serial.close()
        await self._serial.open()

    def process_raw_response(self, command: str, response: str) -> str:
        """
        Opportunity for derived classes to process the raw response. Default
         strips white space.

        Args:
            command: The sent command.
            response: The raw read response minus ack.

        Returns:
            processed response.
        """
        return response.strip()
