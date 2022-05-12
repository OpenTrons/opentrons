"""The can bus transport."""
from __future__ import annotations
import logging
import asyncio
import platform
from typing import Optional

from can import Notifier, Bus, AsyncBufferedReader, Message

from opentrons_hardware.firmware_bindings.arbitration_id import ArbitrationId
from opentrons_hardware.firmware_bindings.message import CanMessage
from .errors import ErrorFrameCanError
from .abstract_driver import AbstractCanDriver

log = logging.getLogger(__name__)


if platform.system() == "Darwin":
    # TODO (amit, 2021-09-29): remove hacks to support `pcan` when we don't
    #  need it anymore.
    #  Super bad monkey patch to deal with MAC issue:
    #  https://github.com/hardbyte/python-can/issues/1117
    from can.interfaces.pcan import basic

    basic.TPCANMsgMac = basic.TPCANMsg
    basic.TPCANMsgFDMac = basic.TPCANMsgFD
    basic.TPCANTimestampMac = basic.TPCANTimestamp

    from can.interfaces.pcan import pcan

    pcan.TPCANMsgMac = pcan.TPCANMsg
    pcan.TPCANMsgFDMac = pcan.TPCANMsgFD
    pcan.TPCANTimestampMac = pcan.TPCANTimestamp
    # end super bad monkey patch


class CanDriver(AbstractCanDriver):
    """The can driver."""

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
        log.info(f"CAN connect: {interface}-{channel}-{bitrate}")
        extra_kwargs = {}
        if interface == "pcan":
            # Special FDCAN parameters for use of PCAN driver.
            extra_kwargs = {
                "f_clock_mhz": 20,
                "nom_brp": 5,
                "nom_tseg1": 13,
                "nom_tseg2": 2,
                "nom_sjw": 16,
            }
        return CanDriver(
            bus=Bus(
                channel=channel,
                bitrate=bitrate,
                interface=interface,
                fd=True,
                **extra_kwargs,
            ),
            loop=asyncio.get_event_loop(),
        )

    def shutdown(self) -> None:
        """Stop the driver."""
        self._notifier.stop()
        self._bus.shutdown()

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

        Raises:
            ErrorFrameCanError
        """
        m: Message = await self._reader.get_message()
        if m.is_error_frame:
            log.error("Error frame encountered")
            raise ErrorFrameCanError(message=repr(m))

        return CanMessage(
            arbitration_id=ArbitrationId(id=m.arbitration_id), data=m.data
        )
