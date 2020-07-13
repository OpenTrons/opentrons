from typing import Dict, Awaitable, Callable, Any
from opentrons.types import Mount, Point
from opentrons.hardware_control import ThreadManager
from robot_server.service.session.models import CalibrationCommand, \
    TipLengthCalibrationCommand
from robot_server.robot.calibration.tip_length.state_machine import (
    TipCalibrationStateMachine
)
from robot_server.robot.calibration.tip_length.util import (
    TipCalibrationError as Error
)
from robot_server.robot.calibration.tip_length.constants import (
    TipCalibrationState as State,
)


"""
A collection of functions that allow a consumer to prepare and update
calibration data associated with the combination of a pipette tip type and a
unique (by serial number) physical pipette.
"""

# TODO: BC 2020-07-08: type all command logic here with actual Model type
COMMAND_HANDLER = Callable[..., Awaitable]

COMMAND_MAP = Dict[str, COMMAND_HANDLER]


class TipCalibrationUserFlow():
    def __init__(self,
                 hardware: ThreadManager,
                 mount: Mount = Mount.LEFT,
                 has_calibration_block=True):
        # TODO: require mount and has_calibration_block params
        self._has_calibration_block = has_calibration_block
        self._hardware = hardware
        self._current_state = State.sessionStarted
        self._state_machine = TipCalibrationStateMachine()
        self._mount = mount
        self._hw_pipette = self._hardware.attached_instruments[mount]
        if not self._hw_pipette:
            raise Error(f'No pipette found on {mount} mount,'
                        'cannot run tip length calibration')

        self._command_map: COMMAND_MAP = {
            CalibrationCommand.load_labware: self.load_labware,
            CalibrationCommand.jog: self.jog,
            CalibrationCommand.pick_up_tip: self.pick_up_tip,
            CalibrationCommand.invalidate_tip: self.invalidate_tip,
            CalibrationCommand.save_offset: self.save_offset,
            TipLengthCalibrationCommand.move_to_reference_point: self.move_to_reference_point,  # noqa: E501
            CalibrationCommand.exit: self.exit_session,
        }

    def _set_current_state(self, to_state: State):
        self._current_state = to_state

    async def handle_command(self,
                             name: Any,
                             data: Dict[Any, Any]):
        """
        Handle a client command

        :param name: Name of the command
        :param data: Data supplied in command
        :return: None
        """
        next_state = self._state_machine.get_next_state(self._current_state,
                                                        name)
        handler = self._command_map.get(name)
        if handler is not None:
            return await handler(**data)
        self._set_current_state(next_state)

    async def load_labware(self, *args):
        # TODO: load tip rack onto deck
        pass

    # TODO: make generic to move to tip in rack command?

    async def move_to_reference_point(self, *args):
        # TODO: move nozzle/tip to reference location (block || trash edge)
        pass

    async def save_offset(self, *args):
        # TODO: save the current nozzle/tip offset here
        pass

    async def jog(self, vector, *args):
        await self._hardware.move_rel(self._mount, Point(*vector))

    async def pick_up_tip(self, *args):
        saved_default = None
        if self._hw_pipette.config.channels > 1:
            # reduce pick up current for multichannel pipette picking up 1 tip
            saved_default = self._hw_pipette.config.pick_up_current
            self._hw_pipette.update_config_item('pick_up_current', 0.1)
        tip_length = self._hw_pipette.config.tip_length

        # TODO: get proper tip length from loaded tip rack
        # # Note: ABC DeckItem cannot have tiplength b/c of
        # # mod geometry contexts. Ignore type checking error here.
        # tiprack = self._deck[lw_info.slot]
        # full_length = tiprack.tip_length  # type: ignore
        # overlap_dict: Dict =\
        #     self.pipettes[mount]['tip_overlap']  # type: ignore
        # default = overlap_dict['default']
        # overlap = overlap_dict.get(
        #                         tiprack.uri,  # type: ignore
        #                         default)
        # tip_length = full_length - overlap
        # Do we need a fallback tip length here anymore?
        # tip_length = self.pipettes[mount]['fallback_tip_length']

        await self._hardware.pick_up_tip(self._mount, tip_length)
        if saved_default:
            self._hw_pipette.update_config_item('pick_up_current',
                                                saved_default)
        # TODO: save current location locally for returning tip later

    async def invalidate_tip(self, *args):
        # TODO: move back to pick up tip start location
        await self._hardware.drop_tip(self._mount)

    async def exit_session(self, *args):
        # TODO: move to saved (jogged to) pick up tip location, return tip
        pass
