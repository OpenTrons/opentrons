import logging
from typing import Dict, Awaitable, Callable, Any, Set, List, Optional, cast

from opentrons.types import Mount, Point, Location
from opentrons.hardware_control import HardwareControlAPI, CriticalPoint, Pipette
from opentrons.protocols.api_support.deck_type import (
    guess_from_global_config as guess_deck_type_from_global_config,
)
from opentrons.protocol_api import labware
from opentrons.protocol_api.core.legacy.deck import Deck

from opentrons_shared_data.labware.types import LabwareDefinition2
from opentrons_shared_data.pipette.types import LabwareUri

from robot_server.robot.calibration import util
from robot_server.service.errors import RobotServerError

from robot_server.service.session.models.command_definitions import CalibrationCommand
from ..errors import CalibrationError
from ..helper_classes import RequiredLabware, AttachedPipette, SupportedCommands
from ..constants import (
    TIP_RACK_LOOKUP_BY_MAX_VOL,
    CAL_BLOCK_SETUP_BY_MOUNT,
    MOVE_TO_TIP_RACK_SAFETY_BUFFER,
)
from .constants import TipCalibrationState as State, TIP_RACK_SLOT
from .state_machine import TipCalibrationStateMachine

MODULE_LOG = logging.getLogger(__name__)

"""
A collection of functions that allow a consumer to prepare and update
calibration data associated with the combination of a pipette tip type and a
unique (by serial number) physical pipette.
"""

# TODO: BC 2020-07-08: type all command logic here with actual Model type
COMMAND_HANDLER = Callable[..., Awaitable[None]]

COMMAND_MAP = Dict[str, COMMAND_HANDLER]


class TipCalibrationUserFlow:
    def __init__(
        self,
        hardware: HardwareControlAPI,
        mount: Mount,
        has_calibration_block: bool,
        tip_rack: Optional[LabwareDefinition2] = None,
    ) -> None:
        self._hardware = hardware
        self._mount = mount
        self._has_calibration_block = has_calibration_block
        pip = self._hardware.hardware_instruments[mount]
        if not pip:
            raise RobotServerError(
                definition=CalibrationError.NO_PIPETTE_ON_MOUNT, mount=mount
            )
        self._hw_pipette = pip
        self._tip_origin_pt: Optional[Point] = None
        self._nozzle_height_at_reference: Optional[float] = None

        self._deck = Deck(guess_deck_type_from_global_config())
        self._tip_rack = self._get_tip_rack_lw(tip_rack)
        self._initialize_deck()

        self._current_state = State.sessionStarted
        self._state_machine = TipCalibrationStateMachine()

        self._command_map: COMMAND_MAP = {
            CalibrationCommand.load_labware: self.load_labware,
            CalibrationCommand.jog: self.jog,
            CalibrationCommand.pick_up_tip: self.pick_up_tip,
            CalibrationCommand.invalidate_tip: self.invalidate_tip,
            CalibrationCommand.save_offset: self.save_offset,
            CalibrationCommand.move_to_reference_point: self.move_to_reference_point,
            CalibrationCommand.move_to_tip_rack: self.move_to_tip_rack,
            CalibrationCommand.invalidate_last_action: self.invalidate_last_action,
            CalibrationCommand.exit: self.exit_session,
        }
        self._default_tipracks = util.get_default_tipracks(
            cast(List[LabwareUri], self.hw_pipette.liquid_class.default_tipracks)
        )
        self._supported_commands = SupportedCommands(namespace="calibration")
        self._supported_commands.loadLabware = True

    def _set_current_state(self, to_state: State) -> None:
        self._current_state = to_state

    @property
    def hardware(self) -> HardwareControlAPI:
        return self._hardware

    @property
    def mount(self) -> Mount:
        return self._mount

    @property
    def deck(self) -> Deck:
        return self._deck

    @property
    def hw_pipette(self) -> Pipette:
        return self._hw_pipette

    @property
    def tip_origin(self) -> Point:
        if self._tip_origin_pt:
            return self._tip_origin_pt
        else:
            return (
                self._tip_rack.wells()[0].top().point + MOVE_TO_TIP_RACK_SAFETY_BUFFER
            )

    @tip_origin.setter
    def tip_origin(self, new_val: Point) -> None:
        self._tip_origin_pt = new_val

    def reset_tip_origin(self) -> None:
        self._tip_origin_pt = None

    @property
    def supported_commands(self) -> List[str]:
        return self._supported_commands.supported()

    @property
    def current_state(self) -> State:
        return self._current_state

    def get_pipette(self) -> AttachedPipette:
        return AttachedPipette(
            model=self._hw_pipette.model,
            name=self._hw_pipette.name,
            tipLength=self._hw_pipette.active_tip_settings.default_tip_length,
            mount=str(self._mount),
            serial=self._hw_pipette.pipette_id,
            defaultTipracks=self._default_tipracks,
        )

    def get_required_labware(self) -> List[RequiredLabware]:
        slots = self._deck.get_non_fixture_slots()
        lw_by_slot = {s: self._deck[s] for s in slots if self._deck[s]}
        return [
            RequiredLabware.from_lw(lw, s)  # type: ignore
            for s, lw in lw_by_slot.items()
        ]

    async def handle_command(self, name: Any, data: Dict[Any, Any]) -> None:
        """
        Handle a client command

        :param name: Name of the command
        :param data: Data supplied in command
        :return: None
        """
        next_state = self._state_machine.get_next_state(self._current_state, name)

        handler = self._command_map.get(name)
        if handler is not None:
            await handler(**data)
        self._set_current_state(next_state)
        MODULE_LOG.debug(
            f"TipCalUserFlow handled command {name}, transitioned"
            f"from {self._current_state} to {next_state}"
        )

    async def load_labware(
        self,
        # tiprackDefinition comes from the HTTP client and is not validated by the time
        # it reaches here, hence us calling labware.verify_definition() below.
        tiprackDefinition: Optional[LabwareDefinition2] = None,
    ) -> None:
        self._supported_commands.loadLabware = False
        if tiprackDefinition:
            verified_definition = labware.verify_definition(tiprackDefinition)
            # todo(mm, 2025-02-13): Move schema validation to the FastAPI layer and turn
            # this schemaVersion assertion into a proper HTTP API 422 error.
            # https://opentrons.atlassian.net/browse/EXEC-1230
            assert verified_definition["schemaVersion"] == 2
            self._tip_rack = self._get_tip_rack_lw(verified_definition)
            if self._deck[TIP_RACK_SLOT]:
                del self._deck[TIP_RACK_SLOT]
            self._deck[TIP_RACK_SLOT] = self._tip_rack

    async def move_to_tip_rack(self) -> None:
        await self._move(Location(self.tip_origin, None))

    async def save_offset(self) -> None:
        if self._current_state == State.measuringNozzleOffset:
            # critical point would default to nozzle for z height
            cur_pt = await self.get_current_point(critical_point=None)
            self._nozzle_height_at_reference = cur_pt.z
        elif self._current_state == State.measuringTipOffset:
            assert self._hw_pipette.has_tip
            assert self._nozzle_height_at_reference is not None
            # set critical point explicitly to nozzle
            cur_pt = await self.get_current_point(critical_point=CriticalPoint.NOZZLE)

            util.save_tip_length_calibration(
                pipette_id=self._hw_pipette.pipette_id,  # type: ignore[arg-type]
                tip_length_offset=cur_pt.z - self._nozzle_height_at_reference,
                tip_rack=self._tip_rack,
            )

    def _get_default_tip_length(self) -> float:
        tiprack: labware.Labware = self._deck[TIP_RACK_SLOT]  # type: ignore
        full_length = tiprack.tip_length
        overlap_dict: Dict[str, float] = self._hw_pipette.tip_overlap["v0"]
        overlap = overlap_dict.get(tiprack.uri, 0)
        return full_length - overlap

    @property
    def critical_point_override(self) -> Optional[CriticalPoint]:
        return (
            CriticalPoint.FRONT_NOZZLE
            if self._hw_pipette.config.channels == 8
            else None
        )

    async def get_current_point(
        self,
        critical_point: Optional[CriticalPoint] = None,
    ) -> Point:
        return await self._hardware.gantry_position(self._mount, critical_point)

    async def jog(self, vector: tuple[float, float, float]) -> None:
        await self._hardware.move_rel(mount=self._mount, delta=Point(*vector))

    async def move_to_reference_point(self) -> None:
        cal_block_target_well: Optional[labware.Well] = None

        if self._has_calibration_block:
            cb_setup = CAL_BLOCK_SETUP_BY_MOUNT[self._mount]
            calblock: labware.Labware = self._deck[cb_setup.slot]  # type: ignore
            cal_block_target_well = calblock.wells_by_name()[cb_setup.well]

        ref_loc = util.get_reference_location(
            deck=self._deck, cal_block_target_well=cal_block_target_well
        )
        await self._move(ref_loc)

    async def pick_up_tip(self) -> None:
        await util.pick_up_tip(self, tip_length=self._get_default_tip_length())

    async def invalidate_tip(self) -> None:
        await util.invalidate_tip(self)

    async def exit_session(self) -> None:
        if self.hw_pipette.has_tip:
            await self.move_to_tip_rack()
            await self.return_tip()
        await self._hardware.home()

    def _get_tip_rack_lw(
        self, tip_rack_def: Optional[LabwareDefinition2]
    ) -> labware.Labware:
        position = self._deck.position_for(TIP_RACK_SLOT)
        if tip_rack_def is None:
            pip_vol = self._hw_pipette.liquid_class.max_volume
            tr_load_name = TIP_RACK_LOOKUP_BY_MAX_VOL[str(pip_vol)].load_name
            return labware.load(tr_load_name, position)
        try:
            return labware.load_from_definition(tip_rack_def, position)
        except Exception:
            raise RobotServerError(definition=CalibrationError.BAD_LABWARE_DEF)

    def _get_alt_tip_racks(self) -> Set[str]:
        pip_vol = self._hw_pipette.liquid_class.max_volume
        return set(TIP_RACK_LOOKUP_BY_MAX_VOL[str(pip_vol)].alternatives)

    def _initialize_deck(self) -> None:
        self._deck[TIP_RACK_SLOT] = self._tip_rack

        if self._has_calibration_block:
            cb_setup = CAL_BLOCK_SETUP_BY_MOUNT[self._mount]
            self._deck[cb_setup.slot] = labware.load(
                cb_setup.load_name, self._deck.position_for(cb_setup.slot)
            )

    async def return_tip(self) -> None:
        await util.return_tip(self, tip_length=self._get_default_tip_length())

    async def _move(self, to_loc: Location) -> None:
        await util.move(self, to_loc)

    async def invalidate_last_action(self) -> None:
        if self._current_state == State.measuringNozzleOffset:
            await self.hardware.home()
            await self._hardware.gantry_position(self.mount, refresh=True)
            await self.move_to_reference_point()
        elif self._current_state == State.preparingPipette:
            await self.hardware.home()
            await self._hardware.gantry_position(self.mount, refresh=True)
            await self.move_to_tip_rack()
        else:
            await self.hardware.home()
            await self._hardware.gantry_position(self.mount, refresh=True)
            trash = self._deck.get_fixed_trash()
            assert trash, "Bad deck setup"
            await util.move(self, trash["A1"].top(), CriticalPoint.XY_CENTER)  # type: ignore[index]
            await self.hardware.drop_tip(self.mount)
            await self.move_to_tip_rack()
