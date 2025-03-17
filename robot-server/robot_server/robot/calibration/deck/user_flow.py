from __future__ import annotations

import logging
from typing import (
    Any,
    Awaitable,
    Callable,
    Dict,
    List,
    Optional,
    Tuple,
    Union,
    cast,
)

from opentrons.calibration_storage import (
    helpers,
    types as cal_types,
)

from opentrons.calibration_storage.ot2.tip_length import (
    load_tip_length_calibration,
)
from opentrons.calibration_storage.ot2.pipette_offset import (
    clear_pipette_offset_calibrations,
)

from opentrons.hardware_control import robot_calibration as robot_cal
from opentrons.hardware_control import (
    HardwareControlAPI,
    OT2HardwareControlAPI,
    API,
    CriticalPoint,
    Pipette,
)
from opentrons.protocol_api import labware
from opentrons.protocol_api.core.legacy.deck import Deck
from opentrons.protocols.api_support.deck_type import (
    guess_from_global_config as guess_deck_type_from_global_config,
)
from opentrons.types import Mount, Point, Location
from opentrons.util import linal

from opentrons_shared_data.labware.types import LabwareDefinition2
from opentrons_shared_data.pipette.types import LabwareUri

from robot_server.robot.calibration.constants import TIP_RACK_LOOKUP_BY_MAX_VOL
from robot_server.service.errors import RobotServerError

from robot_server.service.session.models.command_definitions import (
    CalibrationCommand,
    DeckCalibrationCommand,
)
from robot_server.robot.calibration.constants import (
    MOVE_TO_DECK_SAFETY_BUFFER,
    MOVE_TO_TIP_RACK_SAFETY_BUFFER,
    POINT_ONE_ID,
    POINT_TWO_ID,
    POINT_THREE_ID,
    JOG_TO_DECK_SLOT,
)
import robot_server.robot.calibration.util as uf
from .constants import (
    DeckCalibrationState as State,
    TIP_RACK_SLOT,
    MOVE_POINT_STATE_MAP,
    SAVE_POINT_STATE_MAP,
)
from .state_machine import DeckCalibrationStateMachine
from .dev_types import SavedPoints, ExpectedPoints
from ..errors import CalibrationError
from ..helper_classes import RequiredLabware, AttachedPipette, SupportedCommands
from opentrons.protocol_engine.errors import HardwareNotSupportedError


MODULE_LOG = logging.getLogger(__name__)

"""
A collection of functions that allow a consumer to prepare and update
calibration data associated with the orientations of the robot's deck
and gantry system.
"""

# TODO: BC 2020-07-08: type all command logic here with actual Model type
COMMAND_HANDLER = Callable[..., Awaitable[None]]

COMMAND_MAP = Dict[str, COMMAND_HANDLER]


def tuplefy_cal_point_dicts(
    pt_dicts: Union[ExpectedPoints, SavedPoints]
) -> linal.SolvePoints:
    return (
        tuple(pt_dicts[POINT_ONE_ID]),  # type: ignore
        tuple(pt_dicts[POINT_TWO_ID]),
        tuple(pt_dicts[POINT_THREE_ID]),
    )


class DeckCalibrationUserFlow:
    def __init__(self, hardware: HardwareControlAPI) -> None:
        if not isinstance(hardware, API):
            raise HardwareNotSupportedError("This command is supported by OT-2 only.")
        self._hardware = cast(OT2HardwareControlAPI, hardware)
        self._hw_pipette, self._mount = self._select_target_pipette()
        self._default_tipracks = self._get_default_tipracks()

        self._deck = Deck(guess_deck_type_from_global_config())
        self._tip_rack = self._get_tip_rack_lw()
        self._deck[TIP_RACK_SLOT] = self._tip_rack

        self._current_state = State.sessionStarted
        self._state_machine = DeckCalibrationStateMachine()

        self._tip_origin_pt: Optional[Point] = None
        self._z_height_reference: Optional[float] = None
        self._expected_points = self._build_expected_points_dict()
        self._saved_points: SavedPoints = {}

        self._command_map: COMMAND_MAP = {
            CalibrationCommand.load_labware: self.load_labware,
            CalibrationCommand.jog: self.jog,
            CalibrationCommand.pick_up_tip: self.pick_up_tip,
            CalibrationCommand.invalidate_tip: self.invalidate_tip,
            CalibrationCommand.save_offset: self.save_offset,
            CalibrationCommand.move_to_tip_rack: self.move_to_tip_rack,
            CalibrationCommand.move_to_deck: self.move_to_deck,
            CalibrationCommand.move_to_point_one: self.move_to_point_one,
            DeckCalibrationCommand.move_to_point_two: self.move_to_point_two,
            DeckCalibrationCommand.move_to_point_three: self.move_to_point_three,
            CalibrationCommand.exit: self.exit_session,
            CalibrationCommand.invalidate_last_action: self.invalidate_last_action,
        }
        self.hardware.set_robot_calibration(
            self.hardware.build_temporary_identity_calibration()
        )
        self._hw_pipette.reset_pipette_offset(self._mount, to_default=True)
        self._supported_commands = SupportedCommands(namespace="calibration")
        self._supported_commands.loadLabware = True

    @property
    def deck(self) -> Deck:
        return self._deck

    @property
    def hardware(self) -> OT2HardwareControlAPI:
        return self._hardware

    @property
    def mount(self) -> Mount:
        return self._mount

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
    def tip_origin(self, new_val: Optional[Point]) -> None:
        self._tip_origin_pt = new_val

    def reset_tip_origin(self) -> None:
        self._tip_origin_pt = None

    @property
    def supported_commands(self) -> List[str]:
        return self._supported_commands.supported()

    @property
    def current_state(self) -> State:
        return self._current_state

    def get_pipette(self) -> Optional[AttachedPipette]:
        # TODO(mc, 2020-09-17): s/tip_length/tipLength
        # TODO(mc, 2020-09-17): type of pipette_id does not match expected
        # type of AttachedPipette.serial
        return AttachedPipette(
            model=self._hw_pipette.model,
            name=self._hw_pipette.name,
            tipLength=self._hw_pipette.active_tip_settings.default_tip_length,
            mount=str(self._mount),
            serial=self._hw_pipette.pipette_id,
            defaultTipracks=self._default_tipracks,
        )

    def get_required_labware(self) -> List[RequiredLabware]:
        return [RequiredLabware.from_lw(self._tip_rack)]

    def _set_current_state(self, to_state: State) -> None:
        self._current_state = to_state

    def _select_target_pipette(self) -> Tuple[Pipette, Mount]:
        """
        Select pipette for calibration based on:
        1: smaller max volume
        2: single-channel over multi
        3: right mount over left
        """
        if not any(self._hardware.hardware_instruments.values()):
            raise RobotServerError(
                definition=CalibrationError.NO_PIPETTE_ATTACHED, flow="Deck Calibration"
            )
        pips = {m: p for m, p in self._hardware.hardware_instruments.items() if p}
        if len(pips) == 1:
            for mount, pip in pips.items():
                return pip, mount

        right_pip = pips[Mount.RIGHT]
        left_pip = pips[Mount.LEFT]
        if right_pip.liquid_class.max_volume == left_pip.liquid_class.max_volume:
            if right_pip.config.channels == left_pip.config.channels:
                return right_pip, Mount.RIGHT
            else:
                return sorted(
                    [(right_pip, Mount.RIGHT), (left_pip, Mount.LEFT)],
                    key=lambda p_m: p_m[0].config.channels,
                )[0]
        else:
            return sorted(
                [(right_pip, Mount.RIGHT), (left_pip, Mount.LEFT)],
                key=lambda p_m: p_m[0].liquid_class.max_volume,
            )[0]

    def _get_tip_rack_lw(
        self, tiprack_definition: Optional[LabwareDefinition2] = None
    ) -> labware.Labware:
        if tiprack_definition:
            return labware.load_from_definition(
                tiprack_definition, self._deck.position_for(TIP_RACK_SLOT)
            )
        else:
            pip_vol = self._hw_pipette.liquid_class.max_volume
            lw_load_name = TIP_RACK_LOOKUP_BY_MAX_VOL[str(pip_vol)].load_name
            return labware.load(lw_load_name, self._deck.position_for(TIP_RACK_SLOT))

    def _get_default_tipracks(self) -> list[LabwareDefinition2]:
        return uf.get_default_tipracks(
            cast(List[LabwareUri], self.hw_pipette.liquid_class.default_tipracks)
        )

    def _build_expected_points_dict(self) -> ExpectedPoints:
        pos_1 = self._deck.get_calibration_position(POINT_ONE_ID).position
        pos_2 = self._deck.get_calibration_position(POINT_TWO_ID).position
        pos_3 = self._deck.get_calibration_position(POINT_THREE_ID).position
        exp_pt: ExpectedPoints = {
            POINT_ONE_ID: Point(*pos_1)._replace(z=1.0),
            POINT_TWO_ID: Point(*pos_2)._replace(z=1.0),
            POINT_THREE_ID: Point(*pos_3)._replace(z=1.0),
        }
        return exp_pt

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
            f"DeckCalUserFlow handled command {name}, transitioned"
            f"from {self._current_state} to {next_state}"
        )

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

    async def load_labware(
        self,
        # tiprackDefinition comes from the HTTP client and is not validated by the time
        # it reaches here, hence us calling labware.verify_definition() below.
        tiprackDefinition: LabwareDefinition2,
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

    async def jog(self, vector: tuple[float, float, float]) -> None:
        await self._hardware.move_rel(mount=self._mount, delta=Point(*vector))

    async def move_to_tip_rack(self) -> None:
        if self._current_state == State.labwareLoaded:
            await self.hardware.home()
        await self._move(Location(self.tip_origin, None))

    async def move_to_deck(self) -> None:
        deck_pt = self._deck.get_slot_center(JOG_TO_DECK_SLOT)
        ydim = self._deck.get_slot_definition(JOG_TO_DECK_SLOT)["boundingBox"][
            "yDimension"
        ]
        new_pt = deck_pt - Point(0, (ydim / 2), deck_pt.z) + MOVE_TO_DECK_SAFETY_BUFFER
        to_loc = Location(new_pt, None)
        await self._move(to_loc)

    def _get_move_to_point_loc_by_state(self) -> Location:
        assert (
            self._z_height_reference is not None
        ), "saveOffset has not been called yet"
        pt_id = MOVE_POINT_STATE_MAP[self.current_state]
        coords = self._deck.get_calibration_position(pt_id).position
        loc = Location(Point(*coords), None)
        return loc.move(point=Point(0, 0, self._z_height_reference))

    async def move_to_point_one(self) -> None:
        await self._move(self._get_move_to_point_loc_by_state())

    async def move_to_point_two(self) -> None:
        await self._move(self._get_move_to_point_loc_by_state())

    async def move_to_point_three(self) -> None:
        await self._move(self._get_move_to_point_loc_by_state())

    async def save_offset(self) -> None:
        cur_pt = await self.get_current_point(critical_point=None)
        if self.current_state == State.joggingToDeck:
            self._z_height_reference = cur_pt.z
        else:
            pt_id = SAVE_POINT_STATE_MAP[self._current_state]
            self._saved_points[pt_id] = cur_pt

            if self._current_state == State.savingPointThree:
                self._save_attitude_matrix()
                # clear all pipette offset data
                clear_pipette_offset_calibrations()

    def _save_attitude_matrix(self) -> None:
        e = tuplefy_cal_point_dicts(self._expected_points)
        a = tuplefy_cal_point_dicts(self._saved_points)
        tiprack_hash = helpers.hash_labware_def(self._tip_rack._core.get_definition())
        pip_id = self._hw_pipette.pipette_id
        assert pip_id
        robot_cal.save_attitude_matrix(
            expected=e, actual=a, pipette_id=pip_id, tiprack_hash=tiprack_hash
        )

    def _get_tip_length(self) -> float:
        pip_id = self._hw_pipette.pipette_id
        assert pip_id
        definition = self._tip_rack._core.get_definition()
        # Assert for type checking. We expect this to always pass because
        # self._get_tip_rack_lw() limits itself to schema 2.
        assert definition["schemaVersion"] == 2
        try:
            return load_tip_length_calibration(pip_id, definition).tipLength
        except cal_types.TipLengthCalNotFound:
            tip_overlap = self._hw_pipette.tip_overlap["v0"].get(self._tip_rack.uri, 0)
            tip_length = self._tip_rack.tip_length
            return tip_length - tip_overlap

    async def pick_up_tip(self) -> None:
        await uf.pick_up_tip(self, tip_length=self._get_tip_length())

    async def invalidate_tip(self) -> None:
        await uf.invalidate_tip(self)

    async def return_tip(self) -> None:
        await uf.return_tip(self, tip_length=self._get_tip_length())

    async def _move(self, to_loc: Location) -> None:
        await uf.move(self, to_loc)

    async def exit_session(self) -> None:
        if self.hw_pipette.has_tip:
            await self.move_to_tip_rack()
            await self.return_tip()
        # reload new deck calibration
        self._hardware.reset_robot_calibration()
        self._hardware.reset_instrument()
        await self._hardware.home()

    async def invalidate_last_action(self) -> None:
        await self.hardware.home()
        await self._hardware.gantry_position(self.mount, refresh=True)
        if self._current_state != State.preparingPipette:
            trash = self._deck.get_fixed_trash()
            assert trash, "Bad deck setup"
            await uf.move(self, trash["A1"].top(), CriticalPoint.XY_CENTER)  # type: ignore[index]
            await self.hardware.drop_tip(self.mount)
        await self.move_to_tip_rack()
