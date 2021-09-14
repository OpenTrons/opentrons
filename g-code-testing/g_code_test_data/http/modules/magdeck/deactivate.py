from opentrons import ThreadManager
from g_code_test_data.http.http_base import HTTPBase
from robot_server.service.legacy.routers.modules import post_serial_command
from robot_server.service.legacy.models.modules import SerialCommand
from opentrons.hardware_control.emulation.magdeck import SERIAL as magdeck_serial_num


class MagdeckDeactivate(HTTPBase):
    """
    Deactivate the magnets, returning them home
    """
    @staticmethod
    def main(hardware: ThreadManager):
        return post_serial_command(
            command=SerialCommand(command_type='deactivate'),
            serial=magdeck_serial_num,
            hardware=hardware
        )
