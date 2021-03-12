"""
USB Simulating Driver.

A class to convert info from the usb bus into a
more readable format.
"""
from typing import List, Set

from .interfaces import USBDriverInterface
from .types import USBPort


class USBBusSimulator(USBDriverInterface):
    def __init__(self):
        self._usb_dev: List[USBPort] = self.read_usb_bus()
        self._sorted = set()

    @staticmethod
    def read_bus() -> List[str]:
        """
        Read the USB Bus information.

        Use the sys bus path to find all of the USBs with
        active devices connected to them.
        """
        return ['']

    @staticmethod
    def convert_port_path(full_port_path: str) -> USBPort:
        """
        Convert port path.

        Take the value returned from the USB bus and format
        that information into a dataclass
        :param full_port_path: The string port path
        :returns: The USBPort dataclass
        """
        pass

    @property
    def usb_dev(self) -> List[USBPort]:
        """
        USBBus property: usb_dev.

        :returns: The list of ports found from
        the usb bus.
        """
        return self._usb_dev

    @usb_dev.setter
    def usb_dev(self, ports: List[USBPort]) -> None:
        """
        USBBus setter: usb_dev.

        :param ports: The list of ports found from
        the usb bus.
        """
        self._usb_dev = ports

    @property
    def sorted_ports(self) -> Set:
        """
        USBBus property: sorted_ports.

        :returns: The set of sorted ports
        """
        return self._sorted

    @sorted_ports.setter
    def sorted_ports(self, sorted: Set) -> None:
        """
        USBBus setter: sorted_ports.

        :param sorted: The updated set of usb ports.
        """
        self._sorted = sorted

    def read_usb_bus(self) -> List[USBPort]:
        """
        Read usb bus

        Take the value returned from the USB bus and match
        the paths to the expected port paths for modules.
        :returns: A list of matching ports as dataclasses
        """
        return []

    def find_port(self, device_path: str) -> USBPort:
        """
        Find port.

        Take the value returned from the USB bus and match
        the paths to the expected port paths for modules.
        :param device_path: The device path of a module, which
        generally contains tty/tty* in its name.
        :returns: The matching port, or an empty port dataclass
        """
        return USBPort(
            name='', sub_names=[], hub=None,
            port_number=None, device_path=device_path)

    def sort_ports(self) -> None:
        pass
