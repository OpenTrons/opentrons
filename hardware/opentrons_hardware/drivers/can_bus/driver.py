"""The can bus transport."""
from __future__ import annotations

import asyncio
import platform
from typing import Optional

from can import Notifier, Bus, AsyncBufferedReader, Message, util

from .arbitration_id import ArbitrationId
from .message import CanMessage

if platform.system() == "Darwin":
    # Super bad monkey patch to deal with MAC issue:
    # https://github.com/hardbyte/python-can/issues/1117
    from can.interfaces.pcan import basic

    basic.TPCANMsgMac = basic.TPCANMsg
    basic.TPCANTimestampMac = basic.TPCANTimestamp
    from can.interfaces.pcan import pcan

    pcan.TPCANMsgMac = pcan.TPCANMsg
    pcan.TPCANTimestampMac = pcan.TPCANTimestamp
    # end super bad monkey patch


class CanDriver:
    """The can driver."""

    DEFAULT_CAN_NETWORK = "vcan0"
    DEFAULT_CAN_INTERFACE = "socketcan"
    DEFAULT_CAN_BITRATE = 0

    def __init__(self, bus: Bus, loop: asyncio.AbstractEventLoop) -> None:
        """Constructor.

        Args:
            bus: The can bus to communicate with
            loop: Event loop
        """
        self._bus = bus
        self._loop = loop
        self._reader = AsyncBufferedReader(loop=loop)
        self._notifier = Notifier(bus=self._bus, listeners=[self._reader], loop=loop)

    @classmethod
    async def build(
        cls,
        interface: str,
        channel: Optional[str] = None,
        bitrate: Optional[int] = None,
    ) -> CanDriver:
        """Build a CanDriver.

        Args:
            bitrate: The bitrate to use.
            interface: The interface for pycan to use.
                see https://python-can.readthedocs.io/en/master/interfaces.html
            channel: Optional channel

        Returns:
            A CanDriver instance.
        """
        return CanDriver(
            bus=Bus(channel=channel, bitrate=bitrate, interface=interface, fd=True),
            loop=asyncio.get_event_loop(),
        )

    @classmethod
    async def from_env(cls) -> CanDriver:
        """Build a CanDriver from env variables."""
        can_channel: str = util.load_environment_config().get(
            "channel", cls.DEFAULT_CAN_NETWORK
        )
        can_interface: str = util.load_environment_config().get(
            "interface", cls.DEFAULT_CAN_INTERFACE
        )
        can_bitrate: int = util.load_environment_config().get(
            "bitrate", cls.DEFAULT_CAN_BITRATE
        )

        return await CanDriver.build(can_interface, can_channel, can_bitrate)

    def shutdown(self) -> None:
        """Stop the driver."""
        self._notifier.stop()

    async def send(self, message: CanMessage) -> None:
        """Send a can message.

        Args:
            message: The message to send.

        Returns:
            None
        """
        m = Message(
            arbitration_id=message.arbitration_id.id,
            is_extended_id=True,
            is_fd=True,
            data=message.data,
        )
        await self._loop.run_in_executor(None, self._bus.send, m)

    async def read(self) -> CanMessage:
        """Read a message.

        Returns:
            A can message
        """
        ...
        m: Message = await self._reader.get_message()
        return CanMessage(
            arbitration_id=ArbitrationId(id=m.arbitration_id), data=m.data
        )

    def __aiter__(self) -> CanDriver:
        """Enter iterator.

        Returns:
            CanDriver
        """
        return self

    async def __anext__(self) -> CanMessage:
        """Async next.

        Returns:
            CanMessage

        """
        return await self.read()
