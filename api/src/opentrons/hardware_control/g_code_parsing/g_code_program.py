from __future__ import annotations
from opentrons.hardware_control.emulation.app import \
    TEMPDECK_PORT, THERMOCYCLER_PORT, SMOOTHIE_PORT, MAGDECK_PORT
from opentrons.hardware_control.emulation.parser import Parser
from .g_code import GCode
from typing import List

from .g_code_watcher import GCodeWatcher


class GCodeProgram:
    """
    Class for parsing various G-Code files and programs into a
    list of GCode objects
    """

    DEVICE_LOOKUP_BY_PORT = {
        SMOOTHIE_PORT: 'smoothie',
        TEMPDECK_PORT: 'tempdeck',
        THERMOCYCLER_PORT: 'thermocycler',
        MAGDECK_PORT: 'magdeck',
    }

    @classmethod
    def from_log_file(cls, log_file_path: str) -> GCodeProgram:
        """
        Function to convert a log file generated by emulator
        to a GCodeProgram object
        :param log_file_path: Absolute path to log file

        :return: GCodeProgram object
        """
        with open(log_file_path, 'r') as file:
            write_matches = []
            for line in file.readlines():
                split_line = line.split('|')
                if len(split_line) == 3:
                    date, device, g_code = split_line

                    write_matches.extend(
                        [
                            GCode(
                                float(date),
                                device.strip(),
                                g_code.gcode,
                                g_code.params
                            )
                            for g_code
                            in Parser().parse(g_code)
                        ]
                    )
        return cls(write_matches)

    @classmethod
    def get_device(cls, serial_connection):
        serial_port = serial_connection.port
        device_port = serial_port[serial_port.rfind(':') + 1:]
        return cls.DEVICE_LOOKUP_BY_PORT[int(device_port)]

    @classmethod
    def from_g_code_watcher(cls, watcher: GCodeWatcher) -> GCodeProgram:
        """
        Function to convert command list collected by GCodeWatcher
        into GCodeProgram
        :param watcher: GCodeWatcher object
        :return: GCodeProgram object
        """
        g_codes = []
        for watcher_data in watcher.get_command_list():
            device = cls.get_device(watcher_data.serial_connection)
            g_codes.extend([
                GCode(
                    watcher_data.date,
                    device,
                    g_code.gcode,
                    g_code.params
                )
                for g_code in Parser().parse(watcher_data.raw_g_code)
            ])
        return cls(g_codes)

    def __init__(self, g_codes: List[GCode]):
        self._g_codes = g_codes

    @property
    def g_codes(self):
        """List of GCode objects"""
        return self._g_codes
