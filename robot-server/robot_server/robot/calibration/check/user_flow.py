import logging
from typing import (
    List, Optional, Tuple, Awaitable,
    Callable, Dict, Any, TYPE_CHECKING)
from typing_extensions import Literal

from opentrons.calibration_storage import get, helpers
from opentrons.calibration_storage.types import (
    TipLengthCalNotFound, PipetteOffsetByPipetteMount)
from opentrons.types import Mount, Point, Location
from opentrons.hardware_control import (
    ThreadManager, CriticalPoint, Pipette, robot_calibration, util)
from opentrons.protocol_api import labware
from opentrons.config import feature_flags as ff
from opentrons.protocols.geometry.deck import Deck

from robot_server.robot.calibration.constants import (
    SHORT_TRASH_DECK, STANDARD_DECK, MOVE_TO_DECK_SAFETY_BUFFER,
    MOVE_TO_TIP_RACK_SAFETY_BUFFER, JOG_TO_DECK_SLOT,
    CAL_BLOCK_SETUP_CAL_CHECK)
import robot_server.robot.calibration.util as uf
from robot_server.robot.calibration.helper_classes import (
    RobotHealthCheck, PipetteRank, PipetteInfo,
    RequiredLabware)

from robot_server.service.session.models.command import (
    CalibrationCommand, CheckCalibrationCommand, DeckCalibrationCommand)
from robot_server.service.errors import RobotServerError

from .util import (
    PointTypes, ReferencePoints,
    ComparisonStatePerCalibration, ComparisonStatePerPipette)
from .models import (
    ComparisonStatus, CheckAttachedPipette,
    TipComparisonMap, PipetteOffsetComparisonMap,
    DeckComparisonMap)
from .state_machine import CalibrationCheckStateMachine

from .constants import (PIPETTE_TOLERANCES,
                        MOVE_POINT_STATE_MAP,
                        CalibrationCheckState as State,
                        TIPRACK_SLOT)
from ..errors import CalibrationError

if TYPE_CHECKING:
    from opentrons_shared_data.labware import LabwareDefinition

MODULE_LOG = logging.getLogger(__name__)

"""
A collection of functions that allow a consumer to determine the health
of the current calibration saved on a robot.
"""

# TODO: BC 2020-07-08: type all command logic here with actual Model type
COMMAND_HANDLER = Callable[..., Awaitable]

COMMAND_MAP = Dict[str, COMMAND_HANDLER]


class CheckCalibrationUserFlow:
    def __init__(
            self, hardware: 'ThreadManager',
            has_calibration_block: bool = False,
            tip_rack_defs: Optional[List['LabwareDefinition']] = None):
        self._hardware = hardware
        self._state_machine = CalibrationCheckStateMachine()
        self._current_state = State.sessionStarted
        self._reference_points = ReferencePoints(
            tip=PointTypes(),
            height=PointTypes(),
            one=PointTypes(),
            two=PointTypes(),
            three=PointTypes()
        )
        self._comparison_map = ComparisonStatePerPipette(
            first=ComparisonStatePerCalibration(),
            second=ComparisonStatePerCalibration()
        )
        deck_load_name = SHORT_TRASH_DECK if ff.short_fixed_trash() \
            else STANDARD_DECK
        self._deck = Deck(load_name=deck_load_name)
        self._tip_racks: Optional[List['LabwareDefinition']] = tip_rack_defs
        self._active_pipette, self._pip_info = self._select_starting_pipette()

        self._has_calibration_block = has_calibration_block

        self._tip_origin_pt: Optional[Point] = None
        self._z_height_reference: Optional[float] = None

        self._active_tiprack = self._load_active_tiprack()
        self._load_cal_block()

        self._command_map: COMMAND_MAP = {
            CalibrationCommand.load_labware: self.transition,
            CalibrationCommand.jog: self.jog,
            CalibrationCommand.pick_up_tip: self.pick_up_tip,
            CalibrationCommand.invalidate_tip: self.invalidate_tip,
            CheckCalibrationCommand.compare_point: self.update_comparison_map,
            CalibrationCommand.move_to_tip_rack: self.move_to_tip_rack,
            CalibrationCommand.move_to_reference_point: self.move_to_reference_point,  # noqa: E501
            CalibrationCommand.move_to_deck: self.move_to_deck,
            CalibrationCommand.move_to_point_one: self.move_to_point_one,
            DeckCalibrationCommand.move_to_point_two: self.move_to_point_two,
            DeckCalibrationCommand.move_to_point_three: self.move_to_point_three,  # noqa: E501
            CheckCalibrationCommand.switch_pipette: self.change_active_pipette,
            CheckCalibrationCommand.return_tip: self.return_tip,
            CheckCalibrationCommand.transition: self.transition,
            CalibrationCommand.invalidate_last_action: self.invalidate_last_action,  # noqa: E501
            CalibrationCommand.exit: self.exit_session,
        }

    @property
    def deck(self) -> Deck:
        return self._deck

    @property
    def hardware(self) -> ThreadManager:
        return self._hardware

    @property
    def tip_origin(self) -> Point:
        if self._tip_origin_pt:
            return self._tip_origin_pt
        else:
            return self.active_tiprack.wells()[0].top().point +\
                MOVE_TO_TIP_RACK_SAFETY_BUFFER

    @tip_origin.setter
    def tip_origin(self, new_val: Optional[Point]):
        self._tip_origin_pt = new_val

    def reset_tip_origin(self):
        self._tip_origin_pt = None

    @property
    def current_state(self) -> State:
        return self._current_state

    @property
    def mount(self) -> Mount:
        return self.active_pipette.mount

    @property
    def active_pipette(self) -> PipetteInfo:
        return self._active_pipette

    @property
    def comparison_map(self) -> ComparisonStatePerPipette:
        return self._comparison_map

    @property
    def active_tiprack(self) -> labware.Labware:
        return self._active_tiprack

    @property
    def hw_pipette(self) -> Pipette:
        return self._get_hw_pipettes()[0]

    async def transition(self):
        pass

    async def change_active_pipette(self):
        second_pip =\
            self._get_pipette_by_rank(PipetteRank.second)
        if not second_pip:
            raise RobotServerError(
                definition=CalibrationError.UNMET_STATE_TRANSITION_REQ,
                state=self._current_state,
                handler="change_active_pipette",
                condition="second pipette")
        self._active_pipette = second_pip
        del self._deck[TIPRACK_SLOT]
        self._active_tiprack = self._load_active_tiprack()

    def _set_current_state(self, to_state: State):
        self._current_state = to_state

    @property
    def critical_point_override(self) -> Optional[CriticalPoint]:
        return (CriticalPoint.FRONT_NOZZLE if
                self.hw_pipette.config.channels == 8 else None)

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
            await handler(**data)
        self._set_current_state(next_state)
        MODULE_LOG.debug(
            f'CalibrationCheckUserFlow handled command {name}, transitioned'
            f'from {self._current_state} to {next_state}')

    def get_required_labware(self) -> List[RequiredLabware]:
        slots = self._deck.get_non_fixture_slots()
        lw_by_slot = {s: self._deck[s] for s in slots if self._deck[s]}
        return [
            RequiredLabware.from_lw(lw, s)  # type: ignore
            for s, lw in lw_by_slot.items()]

    def get_active_tiprack(self) -> RequiredLabware:
        return RequiredLabware.from_lw(self.active_tiprack)

    def _select_starting_pipette(
            self) -> Tuple[PipetteInfo, List[PipetteInfo]]:
        """
        Select pipette for calibration based on:
        1: larger max volume
        2: single-channel over multi
        3: right mount over left
        """
        if not any(self._hardware._attached_instruments.values()):
            raise RobotServerError(
                definition=CalibrationError.NO_PIPETTE_ATTACHED,
                flow='Calibration Health Check')
        pips = {m: p for m, p in self._hardware._attached_instruments.items()
                if p}
        # TODO(lc - 10/30): Clean up repeated logic here by fetching/storing
        # calibrations at the beginning of the session
        self._check_valid_calibrations(pips)
        if len(pips) == 1:
            for mount, pip in pips.items():
                pip_calibration = \
                    self._get_stored_pipette_offset_cal(pip, mount)
                info = PipetteInfo(
                    channels=pip.config.channels,
                    rank=PipetteRank.first,
                    max_volume=pip.config.max_volume,
                    mount=mount,
                    tip_rack=self._get_tiprack_by_pipette_volume(
                        pip.config.max_volume, pip_calibration))
                return info, [info]

        right_pip = pips[Mount.RIGHT]
        left_pip = pips[Mount.LEFT]
        r_calibration =\
            self._get_stored_pipette_offset_cal(right_pip, Mount.RIGHT)
        l_calibration =\
            self._get_stored_pipette_offset_cal(left_pip, Mount.LEFT)
        r_info = PipetteInfo(
            channels=right_pip.config.channels,
            max_volume=right_pip.config.max_volume,
            rank=PipetteRank.first,
            mount=Mount.RIGHT,
            tip_rack=self._get_tiprack_by_pipette_volume(
                right_pip.config.max_volume, r_calibration))
        l_info = PipetteInfo(
            channels=left_pip.config.channels,
            max_volume=left_pip.config.max_volume,
            rank=PipetteRank.first,
            mount=Mount.LEFT,
            tip_rack=self._get_tiprack_by_pipette_volume(
                left_pip.config.max_volume, l_calibration))
        if left_pip.config.max_volume > right_pip.config.max_volume or \
                right_pip.config.channels > left_pip.config.channels:
            r_info.rank = PipetteRank.second
            return l_info, [l_info, r_info]
        else:
            l_info.rank = PipetteRank.second
            return r_info, [r_info, l_info]

    def _get_tip_length_from_pipette(
            self, mount, pipette) -> Optional[float]:
        pip_offset = get.get_pipette_offset(
            pipette.pipette_id, mount)
        if not pip_offset or not pip_offset.uri:
            return None
        details = helpers.details_from_uri(pip_offset.uri)
        position = self._deck.position_for(TIPRACK_SLOT)
        tiprack = labware.load(load_name=details.load_name,
                               namespace=details.namespace,
                               version=details.version,
                               parent=position)
        return get.load_tip_length_calibration(
            pipette.pipette_id,
            tiprack._implementation.get_definition(),
            '')['tipLength']

    def _check_valid_calibrations(self, pipettes: Dict):
        deck = get.get_robot_deck_attitude()
        tip_length = all(
            self._get_tip_length_from_pipette(mount, pip)
            for mount, pip in pipettes.items())
        pipette = all(
            get.get_pipette_offset(
                pip.pipette_id, mount)
            for mount, pip in pipettes.items())
        if not deck or not pipette or not tip_length:
            raise RobotServerError(
                definition=CalibrationError.UNCALIBRATED_ROBOT,
                flow='Calibration Health Check')
        deck_state =\
            robot_calibration.validate_attitude_deck_calibration(deck)
        if deck_state != util.DeckTransformState.OK:
            raise RobotServerError(
                definition=CalibrationError.UNCALIBRATED_ROBOT,
                flow='Calibration Health Check')

    async def get_current_point(
            self,
            critical_point: CriticalPoint = None) -> Point:
        return await self._hardware.gantry_position(self.mount,
                                                    critical_point)

    def _get_pipette_by_rank(self, rank: PipetteRank) -> \
            Optional[PipetteInfo]:
        try:
            return next(p for p in self._pip_info
                        if p.rank == rank)
        except StopIteration:
            return None

    def _is_checking_both_mounts(self):
        return len(self._pip_info) == 2

    def _get_volume_from_tiprack_def(
            self, tip_rack_def: 'LabwareDefinition') -> float:
        first_well = tip_rack_def['wells']['A1']
        return float(first_well['totalLiquidVolume'])

    def _load_cal_block(self):
        if self._has_calibration_block:
            cb_setup = CAL_BLOCK_SETUP_CAL_CHECK
            self._deck[cb_setup.slot] = labware.load(
                cb_setup.load_name,
                self._deck.position_for(cb_setup.slot))

    def _get_stored_pipette_offset_cal(
            self, pipette: Pipette = None,
            mount: Mount = None) -> PipetteOffsetByPipetteMount:
        if not pipette or not mount:
            pip_offset = get.get_pipette_offset(
                self.hw_pipette.pipette_id,  # type: ignore
                self.mount)
        else:
            pip_offset = get.get_pipette_offset(
                pipette.pipette_id,  # type: ignore
                mount)
        assert pip_offset, 'No Pipette Offset Found'
        return pip_offset

    @staticmethod
    def _get_tr_lw(tip_rack_def: Optional['LabwareDefinition'],
                   existing_calibration: PipetteOffsetByPipetteMount,
                   volume: float,
                   position: Location) -> labware.Labware:
        """ Find the right tiprack to use. Specifically,

        - If it's specified from above, use that
        - If it's not, and we have a calibration, use that
        - If we don't, use the default
        """
        if tip_rack_def:
            uri = helpers.uri_from_definition(tip_rack_def)
            if uri == existing_calibration.uri:
                return labware.load_from_definition(
                    tip_rack_def, position)
            else:
                raise RobotServerError(
                    definition=CalibrationError.BAD_LABWARE_DEF)
        elif existing_calibration.uri:
            try:
                details \
                     = helpers.details_from_uri(existing_calibration.uri)
                return labware.load(load_name=details.load_name,
                                    namespace=details.namespace,
                                    version=details.version,
                                    parent=position)
            except (IndexError, ValueError, FileNotFoundError):
                pass
        raise RobotServerError(
            definition=CalibrationError.BAD_LABWARE_DEF)

    def _load_active_tiprack(self) -> labware.Labware:
        """
        load onto the deck the default opentrons tip rack labware for this
        pipette and return the tip rack labware. If tip_rack_def is supplied,
        load specific tip rack from def onto the deck and return the labware.


        """
        active_max_vol = self.active_pipette.max_volume
        existing_calibration = self._get_stored_pipette_offset_cal()
        tr_lw = self._get_tiprack_by_pipette_volume(
            active_max_vol, existing_calibration)
        self._deck[TIPRACK_SLOT] = tr_lw
        return tr_lw

    def _get_tiprack_by_pipette_volume(
            self, volume: float,
            existing_calibration: PipetteOffsetByPipetteMount
            ) -> labware.Labware:
        tip_rack_def = None
        if self._tip_racks:
            for rack_def in self._tip_racks:
                tiprack_vol = self._get_volume_from_tiprack_def(rack_def)
                if volume == tiprack_vol:
                    tip_rack_def = rack_def

        return self._get_tr_lw(
            tip_rack_def, existing_calibration,
            volume, self._deck.position_for(TIPRACK_SLOT))

    def _get_hw_pipettes(self) -> List[Pipette]:
        # Return a list of instruments, ordered with the active pipette first
        active_mount = self.active_pipette.mount
        hw_instruments = self._hardware._attached_instruments
        if active_mount == Mount.RIGHT:
            other_mount = Mount.LEFT
        else:
            other_mount = Mount.RIGHT
        if self._is_checking_both_mounts():
            return [hw_instruments[active_mount], hw_instruments[other_mount]]
        else:
            return [hw_instruments[active_mount]]

    def _get_ordered_info_pipettes(self) -> List[PipetteInfo]:
        active_rank = self.active_pipette.rank
        if active_rank == PipetteRank.first:
            other_rank = PipetteRank.second
        else:
            other_rank = PipetteRank.first
        pip1 = self._get_pipette_by_rank(active_rank)
        assert pip1
        if self._is_checking_both_mounts():
            pip2 = self._get_pipette_by_rank(other_rank)
            assert pip2
            return [pip1, pip2]
        else:
            return [pip1]

    def get_instruments(self) -> List[CheckAttachedPipette]:
        """
        Public property to help format the current pipettes
        being used for a given session for the client.
        """
        hw_pips = self._get_hw_pipettes()
        info_pips = self._get_ordered_info_pipettes()
        return [
            CheckAttachedPipette(
                model=hw_pip.model,
                name=hw_pip.name,
                tipLength=hw_pip.config.tip_length,
                tipRackLoadName=info_pip.tip_rack.load_name,
                tipRackDisplay=info_pip.tip_rack._implementation.get_definition()['metadata']['displayName'],  # noqa: E501
                tipRackUri=info_pip.tip_rack.uri,
                rank=info_pip.rank.value,
                mount=str(info_pip.mount),
                serial=hw_pip.pipette_id)  # type: ignore[arg-type]
            for hw_pip, info_pip in zip(hw_pips, info_pips)]

    def get_active_pipette(self) -> CheckAttachedPipette:
        # TODO(mc, 2020-09-17): type of pipette_id does not match expected
        # type of AttachedPipette.serial
        assert self.hw_pipette
        assert self.active_pipette
        display_name =\
            self.active_pipette.tip_rack._implementation.get_definition()['metadata']['displayName']  # noqa: E501
        return CheckAttachedPipette(
            model=self.hw_pipette.model,
            name=self.hw_pipette.name,
            tipLength=self.hw_pipette.config.tip_length,
            tipRackLoadName=self.active_pipette.tip_rack.load_name,
            tipRackDisplay=display_name,
            tipRackUri=self.active_pipette.tip_rack.uri,
            rank=self.active_pipette.rank.value,
            mount=str(self.mount),
            serial=self.hw_pipette.pipette_id)  # type: ignore[arg-type]

    def _determine_threshold(self) -> Point:
        """
        Helper function used to determine the threshold for comparison
        based on the state currently being compared and the pipette.
        """
        active_pipette = self.active_pipette

        pipette_type = ''
        if active_pipette and active_pipette.mount:
            pipette_type = str(self._get_hw_pipettes()[0].name)

        is_p1000 = pipette_type in ['p1000_single_gen2', 'p1000_single']
        is_p20 = pipette_type in \
            ['p20_single_gen2', 'p10_single', 'p20_multi_gen2', 'p10_multi']
        cross_states = [
            State.comparingPointOne,
            State.comparingPointTwo,
            State.comparingPointThree]
        if is_p1000 and self.current_state == State.comparingTip:
            return PIPETTE_TOLERANCES['p1000_tip']
        elif is_p20 and self.current_state == State.comparingTip:
            return PIPETTE_TOLERANCES['p20_tip']
        elif self.current_state == State.comparingTip:
            return PIPETTE_TOLERANCES['p300_tip']
        if is_p1000 and self.current_state in cross_states:
            return PIPETTE_TOLERANCES['p1000_crosses']
        elif is_p1000 and self.current_state == State.comparingHeight:
            return PIPETTE_TOLERANCES['p1000_height']
        elif is_p20 and self.current_state in cross_states:
            return PIPETTE_TOLERANCES['p20_crosses']
        elif self.current_state in cross_states:
            return PIPETTE_TOLERANCES['p300_crosses']
        else:
            return PIPETTE_TOLERANCES['other_height']

    @staticmethod
    def _check_and_update_status(
            new_status: RobotHealthCheck,
            old_status: RobotHealthCheck
            ) -> Literal['IN_THRESHOLD', 'OUTSIDE_THRESHOLD']:
        if old_status == RobotHealthCheck.OUTSIDE_THRESHOLD:
            return old_status.value
        else:
            return new_status.value

    def _update_compare_status_by_state(
            self, rank: PipetteRank,
            info: ComparisonStatus,
            status: RobotHealthCheck) -> ComparisonStatePerCalibration:
        intermediate_map = getattr(self._comparison_map, rank.name)
        if self.current_state == State.comparingTip:
            tip = TipComparisonMap(
                status=status.value, comparingTip=info)
            intermediate_map.set_value('tipLength', tip)
        elif self.current_state == State.comparingHeight:
            pip = PipetteOffsetComparisonMap(
                status=status.value, comparingHeight=info)
            intermediate_map.set_value('pipetteOffset', pip)
        elif self.current_state == State.comparingPointOne:
            updated_status =\
                self._check_and_update_status(
                    status, intermediate_map.pipetteOffset.status)
            intermediate_map.pipetteOffset.comparingPointOne = info
            intermediate_map.pipetteOffset.status = updated_status
            deck = DeckComparisonMap(
                status=status.value, comparingPointOne=info)
            intermediate_map.set_value('deck', deck)
        elif self.current_state == State.comparingPointTwo:
            updated_status =\
                self._check_and_update_status(
                    status, intermediate_map.deck.status)
            intermediate_map.deck.status = updated_status
            intermediate_map.deck.comparingPointTwo = info
        elif self.current_state == State.comparingPointThree:
            updated_status =\
                self._check_and_update_status(
                    status, intermediate_map.deck.status)
            intermediate_map.deck.status = updated_status
            intermediate_map.deck.comparingPointThree = info
        return intermediate_map

    async def update_comparison_map(self):
        ref_pt, jogged_pt = self._get_reference_points_by_state()
        rank = self.active_pipette.rank
        threshold_vector = self._determine_threshold()

        if (ref_pt is not None and jogged_pt is not None):
            diff_magnitude = None
            if threshold_vector.z == 0.0:
                diff_magnitude = ref_pt._replace(z=0.0).magnitude_to(
                        jogged_pt._replace(z=0.0))
            elif threshold_vector.x == 0.0 and \
                    threshold_vector.y == 0.0:
                diff_magnitude = ref_pt._replace(
                        x=0.0, y=0.0).magnitude_to(jogged_pt._replace(
                                                    x=0.0, y=0.0))
            assert diff_magnitude is not None, \
                'step comparisons must check z or (x and y) magnitude'

            threshold_mag = Point(0, 0, 0).magnitude_to(
                    threshold_vector)
            exceeds = diff_magnitude > threshold_mag
            status = RobotHealthCheck.IN_THRESHOLD

            if exceeds:
                status = RobotHealthCheck.OUTSIDE_THRESHOLD

            info = ComparisonStatus(differenceVector=(jogged_pt - ref_pt),
                                    thresholdVector=threshold_vector,
                                    exceedsThreshold=exceeds)
            intermediate_map =\
                self._update_compare_status_by_state(rank, info, status)
            self._comparison_map.set_value(rank.name, intermediate_map)

    def _get_reference_points_by_state(self):
        saved_points = self._reference_points
        if self.current_state == State.comparingTip:
            initial = saved_points.tip.initial_point +\
                    Point(0, 0, self._get_tip_length())
            return initial,\
                saved_points.tip.final_point
        elif self.current_state == State.comparingHeight:
            return saved_points.height.initial_point,\
                saved_points.height.final_point
        elif self.current_state == State.comparingPointOne:
            return saved_points.one.initial_point,\
                saved_points.one.final_point
        elif self.current_state == State.comparingPointTwo:
            return saved_points.two.initial_point,\
                saved_points.two.final_point
        elif self.current_state == State.comparingPointThree:
            return saved_points.three.initial_point,\
                saved_points.three.final_point

    async def register_initial_point(self):
        """
        Here we will register the initial and final
        points to the current point before jogging
        in the instance that a user doesn't jog at
        all.
        """
        critical_point = self.critical_point_override
        current_point = \
            await self.get_current_point(critical_point)
        if self.current_state == State.comparingNozzle:
            self._reference_points.tip.initial_point = \
                current_point
            self._reference_points.tip.final_point = \
                current_point
        elif self.current_state == State.inspectingTip:
            self._reference_points.height.initial_point = \
                current_point
            self._reference_points.height.final_point = \
                current_point
        elif self.current_state == State.comparingHeight:
            self._reference_points.one.initial_point = \
                current_point
            self._reference_points.one.final_point = \
                current_point
        elif self.current_state == State.comparingPointOne:
            self._reference_points.two.initial_point = \
                current_point
            self._reference_points.two.final_point = \
                current_point
        elif self.current_state == State.comparingPointTwo:
            self._reference_points.three.initial_point = \
                current_point
            self._reference_points.three.final_point = \
                current_point

    async def register_final_point(self):
        critical_point = self.critical_point_override
        current_point = \
            await self.get_current_point(critical_point)
        if self.current_state == State.comparingTip:
            self._reference_points.tip.final_point = \
                current_point
        elif self.current_state == State.comparingHeight:
            self._reference_points.height.final_point = \
                current_point + MOVE_TO_DECK_SAFETY_BUFFER
            self._z_height_reference = current_point.z
        elif self.current_state == State.comparingPointOne:
            self._reference_points.one.final_point = \
                current_point
        elif self.current_state == State.comparingPointTwo:
            self._reference_points.two.final_point = \
                current_point
        elif self.current_state == State.comparingPointThree:
            self._reference_points.three.final_point = \
                current_point

    def _get_tip_length(self) -> float:
        pip_id = self.hw_pipette.pipette_id
        assert pip_id
        assert self.active_tiprack
        try:
            return get.load_tip_length_calibration(
                pip_id,
                self.active_tiprack._implementation.get_definition(),
                '')['tipLength']
        except TipLengthCalNotFound:
            tip_overlap = self.hw_pipette.config.tip_overlap.get(
                self.active_tiprack.uri,
                self.hw_pipette.config.tip_overlap['default'])
            tip_length = self.active_tiprack.tip_length
            return tip_length - tip_overlap

    async def move_to_tip_rack(self):
        if not self.active_tiprack:
            raise RobotServerError(
                definition=CalibrationError.UNMET_STATE_TRANSITION_REQ,
                state=self.current_state,
                handler="move_to_tip_rack",
                condition="active tiprack")
        await self.register_initial_point()
        await self._move(Location(self.tip_origin, None))

    async def move_to_deck(self):
        deck_pt = self._deck.get_slot_center(JOG_TO_DECK_SLOT)
        ydim = self._deck.get_slot_definition(
            JOG_TO_DECK_SLOT)['boundingBox']['yDimension']
        new_pt = deck_pt - Point(0, (ydim/2), deck_pt.z) + \
            MOVE_TO_DECK_SAFETY_BUFFER
        to_loc = Location(new_pt, None)
        await self._move(to_loc)
        await self.register_initial_point()

    def _get_move_to_point_loc_by_state(self) -> Location:
        assert self._z_height_reference is not None, \
            "comparePoint has not been called yet"
        pt_id = MOVE_POINT_STATE_MAP[self._current_state]
        coords = self._deck.get_calibration_position(pt_id).position
        loc = Location(Point(*coords), None)
        return loc.move(point=Point(0, 0, self._z_height_reference))

    async def move_to_reference_point(self):
        if self._has_calibration_block:
            cb_setup = CAL_BLOCK_SETUP_CAL_CHECK
            calblock: labware.Labware = \
                self._deck[cb_setup.slot]  # type: ignore
            cal_block_target_well = calblock.wells_by_name()[cb_setup.well]
        else:
            cal_block_target_well = None
        ref_loc = uf.get_reference_location(
            deck=self._deck,
            cal_block_target_well=cal_block_target_well)
        await self._move(ref_loc)

    async def move_to_point_one(self):
        await self._move(self._get_move_to_point_loc_by_state())
        await self.register_initial_point()

    async def move_to_point_two(self):
        await self._move(self._get_move_to_point_loc_by_state())
        await self.register_initial_point()

    async def move_to_point_three(self):
        await self._move(self._get_move_to_point_loc_by_state())
        await self.register_initial_point()

    async def jog(self, vector):
        await self._hardware.move_rel(mount=self.mount,
                                      delta=Point(*vector))
        await self.register_final_point()

    async def pick_up_tip(self):
        await uf.pick_up_tip(self, tip_length=self._get_tip_length())

    async def invalidate_tip(self):
        await uf.invalidate_tip(self)

    async def return_tip(self):
        await uf.return_tip(self, tip_length=self._get_tip_length())

    async def _move(self, to_loc: Location):
        await uf.move(self, to_loc)

    async def invalidate_last_action(self):
        await self.hardware.home()
        await self.hardware.gantry_position(self.mount, refresh=True)
        if self._current_state != State.comparingNozzle:
            trash = self._deck.get_fixed_trash()
            assert trash, 'Bad deck setup'
            await uf.move(self, trash['A1'].top(), CriticalPoint.XY_CENTER)
            await self.hardware.drop_tip(self.mount)
        await self.move_to_tip_rack()

    async def exit_session(self):
        if self.hw_pipette.has_tip:
            await self.move_to_tip_rack()
            await self.return_tip()
        await self._hardware.home()
