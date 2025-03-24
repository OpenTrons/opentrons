"""De-Static Fixture Driver."""
from abc import ABC, abstractmethod
from serial import Serial  # type: ignore[import]
from time import sleep
from typing_extensions import Final


FIXTURE_BAUD_RATE: Final[int] = 115200
FIXTURE_CMD_GET_IS_ENABLED = "?"
FIXTURE_CMD_SET_ENABLE = "enable"
FIXTURE_RESPONSE_ENABLED = "on"
FIXTURE_RESPONSE_DISABLED = "off"
FIXTURE_ENABLE_DELAY_SECONDS = 0.1


class DeStaticFixtureBase(ABC):
    """Base Class if DeStaticFixture."""

    @abstractmethod
    def connect(self) -> None:
        """Connect to the USB serial port."""
        ...

    @abstractmethod
    def disconnect(self) -> None:
        """Disconnect from the USB serial port."""
        ...

    @abstractmethod
    def is_enabled(self) -> bool:
        """Read status of de-static bar power."""
        ...

    @abstractmethod
    def enable_power_for_one_second(self) -> None:
        """Enable power for just 1x second."""
        ...


class SimDeStaticFixture(DeStaticFixtureBase):
    """Simulating DeStaticFixture."""

    def connect(self) -> None:
        """Connect to the USB serial port."""
        return

    def disconnect(self) -> None:
        """Disconnect from the USB serial port."""
        return

    def is_enabled(self) -> bool:
        """Read status of de-static bar power."""
        return False

    def enable_power_for_one_second(self) -> None:
        """Enable power for just 1x second."""
        return


class DeStaticFixture(DeStaticFixtureBase):
    """Simulating DeStaticFixture."""

    def __init__(self, port_name: str) -> None:
        """Constructor."""
        self._port: Serial = Serial()
        self._port.port = port_name
        self._port.baudrate = FIXTURE_BAUD_RATE

    def connect(self) -> None:
        """Connect to the USB serial port."""
        self._port.open()
        self._port.flushInput()

    def disconnect(self) -> None:
        """Disconnect from the USB serial port."""
        self._port.close()

    def is_enabled(self) -> bool:
        """Read status of de-static bar power."""
        self._port.flushInput()
        self._port.write(FIXTURE_CMD_GET_IS_ENABLED.encode("utf-8"))
        res = self._port.readline().decode("utf-8").strip()
        return bool(res.lower() == FIXTURE_RESPONSE_ENABLED)

    def enable_power_for_one_second(self) -> None:
        """Enable power for just 1x second."""
        self._port.write(FIXTURE_CMD_SET_ENABLE.encode("utf-8"))
        sleep(FIXTURE_ENABLE_DELAY_SECONDS)
        assert self.is_enabled()
