"""Mark10 Force Gauge Driver."""
from serial import Serial  # type: ignore[import]
from abc import ABC, abstractmethod
from time import time
from typing import List, Optional, Protocol
import asyncio
from opentrons.drivers.asyncio.communication import AsyncResponseSerialConnection

FG_BAUDRATE = 115200
DEFAULT_FG_TIMEOUT = 1
FG_TIMEOUT = 1
FG_ACK = ""
FG_ERROR_KEYWORD = "err"
FG_ASYNC_ERROR_ACK = "async"
DEFAULT_COMMAND_RETRIES = 0


logger = AsyncResponseSerialConnection.logger
#logger = logging.getLogger(__name__)

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
            "filename": "/data/stallguard/stallguard_test.log",
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

class Mark10ProtocolError(Exception):
    pass 

class Mark10Error(Exception):
    pass

class AbstractForceGaugeDriver(Protocol):
    """Protocol for the force gauge driver."""
    async def connect(self) -> None:
        """Connect to force gauge."""
        ...

    async def disconnect(self) -> None:
        """Disconnect to force gauge."""
        ...

    @abstractmethod
    def is_simulator(self) -> bool:
        """Is this a simulation."""
        ...

    async def read_force(self, timeout: float = 1.0) -> float:
        """Read Force in Newtons."""
        ...

class Mark10(AbstractForceGaugeDriver):
    """Mark10 Driver."""

    def __init__(self, connection: Serial) -> None:
        """
        Constructor

        Args:
            connection: Connection to the FLEX Stacker
        """
        self._force_guage = connection
        self._units = None

    @classmethod
    async def create(cls, port: str, baudrate: int,loop: Optional[asyncio.AbstractEventLoop]) -> "Mark10":
        """Create a Mark10 driver."""
        conn = Serial(port=port, baudrate=baudrate, timeout=FG_TIMEOUT)
        return Mark10(connection=conn)

    async def is_simulator(self) -> bool:
        """Is simulator."""
        return False

    async def connect(self) -> None:
        """Connect."""
        try:
            await self._force_guage.open()
            if not self._force_guage.is_open:
                raise Mark10Error("Unable to connect to force gauge")
        except Exception as e:
            logger.error(f"Error connecting to force gauge: {e}")
            raise Mark10Error("Unable to connect to force gauge")

    async def disconnect(self) -> None:
        """Disconnect."""
        try: 
            if self._force_guage.is_open:
                await self._force_guage.close()
                logger.info("Disconneted from force gauge")
        except Exception as e:
            logger.error(f"Error disconnecting for force gauge: {e}")
            raise Mark10Error("Unable to disconnect from force gauge")

    async def _write(self, data: bytes) -> None:
        """Non-blocking write operation."""
        try:
            # Offload write to another thread to avoid blocking the event loop
            await asyncio.to_thread(self._force_guage.write, data)
        except Exception as e:
            logger.error(f"Error writing to force gauge: {e}")
            raise Mark10Error("Unable to write to force gauge")


    async def _readline(self) -> str:
        """Non-blocking read operation."""
        try:
            # Offload readline to another thread to avoid blocking the event loop
            return await asyncio.to_thread(self._force_guage.readline)
        except Exception as e:
            logger.error(f"Error reading from force gauge: {e} ")
            raise Mark10Error("Unable to read from force gauge")

    async def read_force(self, timeout: float = 1.0) -> float:
        """Get Force in Newtons."""
        try:
            await self._write("?\r\n".encode("utf-8"))
            start_time = time()
            while time() < start_time + timeout:
                # Read the line asynchronously
                line = await self._readline()
                line = line.decode("utf-8").strip()
                try:
                    force_val, units = line.split(" ")
                    if units != "N":
                        await self._write("N\r\n")  # Set force gauge units to Newtons
                        print(f'Setting gauge units from {units} to "N" (newtons)')
                        continue
                    else:
                        return float(force_val)
                except ValueError as e:
                    print(e)
                    print(f'bad data: "{line}"')
                    continue
            raise TimeoutError(f"unable to read from gauge within {timeout} seconds")
        except Exception as e:
            logger.error(f"Error reading force: {e}")
            raise Mark10Error("Unable to read force from gauge")

    def reset_serial_buffers(self) -> None:
        """Reset the input and output serial buffers."""
        try:
            self._force_guage._serial.reset_input_buffer()
            self._force_guage._serial.reset_output_buffer()
        except Exception as e:
            logger.error(f"Error resetting serial buffers: {e}")
            raise Mark10Error("Unable to reset serial buffers")
