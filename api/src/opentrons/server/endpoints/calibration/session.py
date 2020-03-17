import typing
from uuid import uuid4
from pydantic import UUID4

from opentrons.hardware_control.types import Axis

from .models import AttachedPipette
from .util import CalibrationCheckMachine

if typing.TYPE_CHECKING:
    from opentrons.hardware_control import ThreadManager  # noqa(F501)

"""
A set of endpoints that can be used to create a session for any deck
calibration tasks such as checking your calibration data, performing mount
offset or a deck transform.
"""


class SessionManager:
    """Small wrapper to keep track of deck calibration sessions created."""
    def __init__(self):
        self._sessions = {}

    @property
    def sessions(self):
        return self._sessions

    @sessions.setter
    def sessions(self, key: str, value: 'CalibrationSession'):
        self._sessions[key] = value


class CalibrationSession:
    """Class that controls state of the current deck calibration session"""
    def __init__(
            self,
            hardware: 'ThreadManager',
            type: str = None):
        self.token = uuid4()
        self._pipettes = self._key_by_uuid(hardware.get_attached_instruments())
        self._hardware = hardware
        self.state_machine = CalibrationCheckMachine()
        self.state_machine.set_start("sessionStart")

    def _key_by_uuid(self, new_pipettes: typing.Dict) -> typing.Dict:
        pipette_dict = {}
        for mount, data in new_pipettes.items():
            token = uuid4()
            data['mount_axis'] = Axis.by_mount(mount)
            data['plunger_axis'] = Axis.of_plunger(mount)
            pipette_dict[token] = {**data}
        return pipette_dict

    async def cache_instruments(self):
        await self.hardware.cache_instruments()
        new_dict = self._key_by_uuid(self.hardware.get_attached_instruments())
        self._pipettes.update(new_dict)

    @property
    def hardware(self):
        return self._hardware

    def current_pipette(self, uuid: UUID4) -> 'AttachedPipette':
        return self._pipettes[uuid]
