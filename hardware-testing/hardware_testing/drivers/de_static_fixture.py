"""De-Static Fixture Driver."""
from abc import ABC, abstractmethod
import random
from serial import Serial  # type: ignore[import]
from time import sleep
from typing import List, Tuple
from typing_extensions import Final, Literal

from hardware_testing.data import ui
from opentrons.types import Point

from serial.tools.list_ports import comports  # type: ignore[import]
from serial import SerialException
from hardware_testing.drivers import list_ports_and_select

FIXTURE_REBOOT_TIME = 2
FIXTURE_NUM_CHANNELS: Final[int] = 8
FIXTURE_BAUD_RATE: Final[int] = 115200
FIXTURE_VERSION_REQUIRED = "1.0.0"

FIXTURE_CMD_TERMINATOR = "\r\n"
FIXTURE_CMD_GET_VERSION = "VERSION"
FIXTURE_CMD_GET_ALL_PRESSURE = "GETPRESSURE:15"

LOCATION_A1_LEFT = Point(x=14.4, y=74.5, z=71.2)
LOCATION_A1_RIGHT = LOCATION_A1_LEFT._replace(x=128 - 14.4)


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

    def enable_power_for_one_second(self) -> None:
        """Enable power for just 1x second."""
        ...


class SimDeStaticFixture(DeStaticFixtureBase):
    """Simulating DeStaticFixture."""

    def __init__(self, slot_side: str = "left") -> None:
        """Simulation of Pressure Fixture."""
        self._slot_side = slot_side

    def connect(self) -> None:
        """Connect."""
        return

    def disconnect(self) -> None:
        """Disconnect."""
        return

    def firmware_version(self) -> str:
        """Firmware version."""
        return FIXTURE_VERSION_REQUIRED

    def read_all_pressure_channel(self) -> List[float]:
        """Read Pressure for all channels."""
        pressure = [random.uniform(2.5, 2) for _ in range(FIXTURE_NUM_CHANNELS)]
        return pressure


def connect_to_fixture(
    simulate: bool, side: str = "left", autosearch: bool = True
) -> PressureFixtureBase:
    """Try to find and return an presure fixture, if not found return a simulator."""
    ui.print_title("Connecting to presure fixture")
    if not simulate:
        if not autosearch:
            port = list_ports_and_select(device_name="Pressure fixture")
            fixture = PressureFixture.create(port=port, slot_side=side)
            fixture.connect()
            ui.print_info(f"Found fixture on port {port}")
            return fixture
        else:
            ports = comports()
            assert ports
            for _port in ports:
                port = _port.device  # type: ignore[attr-defined]
                try:
                    ui.print_info(
                        f"Trying to connect to Pressure fixture on port {port}"
                    )
                    fixture = PressureFixture.create(port=port, slot_side=side)
                    fixture.connect()
                    ui.print_info(f"Found fixture on port {port}")
                    return fixture
                except:  # noqa: E722
                    pass
            use_sim = ui.get_user_answer("No pressure sensor found, use simulator?")
            if not use_sim:
                raise SerialException("No sensor found")
    ui.print_info("no fixture found returning simulator")
    return SimPressureFixture()


class PressureFixture(PressureFixtureBase):
    """OT3 Pressure Fixture Driver."""

    def __init__(self, connection: Serial, slot_side: str) -> None:
        """Constructor."""
        self._port = connection
        assert slot_side in ["left", "right"], f"Unexpected slot side: {slot_side}"
        self._slot_side = slot_side

    @classmethod
    def create(cls, port: str, slot_side: str = "left") -> "PressureFixture":
        """Create a Radwag scale driver."""
        conn = Serial()
        conn.port = port
        conn.baudrate = FIXTURE_BAUD_RATE
        conn.timeout = 1
        return PressureFixture(connection=conn, slot_side=slot_side)

    def connect(self) -> None:
        """Connect."""
        self._port.open()
        self._port.flushInput()
        # NOTE: device might take a few seconds to boot up
        sleep(FIXTURE_REBOOT_TIME)
        fw_version = self.firmware_version()
        assert (
            fw_version == FIXTURE_VERSION_REQUIRED
        ), f"unexpected pressure-fixture version: {fw_version}"

    def disconnect(self) -> None:
        """Disconnect."""
        self._port.close()

    def firmware_version(self) -> str:
        """Read the firmware version from the device."""
        cmd_str = f"{FIXTURE_CMD_GET_VERSION}{FIXTURE_CMD_TERMINATOR}"
        self._port.write(cmd_str.encode("utf-8"))
        return self._port.readline().decode("utf-8").strip()

    def read_all_pressure_channel(self) -> List[float]:
        """Reads from all the channels from the fixture."""
        cmd_str = f"{FIXTURE_CMD_GET_ALL_PRESSURE}{FIXTURE_CMD_TERMINATOR}"
        self._port.write(cmd_str.encode("utf-8"))
        response = self._port.readline().decode("utf-8")
        res_list = response.split(",")[:-1]  # ignore the last comma
        data_str = [d.split("=")[-1].strip() for d in res_list]  # remove PRESSURE=
        for i in range(len(data_str)):  # replace all -0.00 with 0.00
            if data_str[i] == "-0.00":
                data_str[i] = "0.00"
        data = [float(d) for d in data_str]  # convert to float
        if self._slot_side == "left":
            data.reverse()  # reverse order, so pipette channel 1 is at index 0
        return data


if __name__ == "__main__":
    port_name = input("type the port of the device (eg: COM1): ")
    fixture = PressureFixture.create(port=port_name, slot_side="left")
    fixture.connect()
    print(f"Device firmware version: {fixture.firmware_version()}")
    while True:
        readings = fixture.read_all_pressure_channel()
        print(readings)
        sleep(0.1)
