import logging
from typing import List, Optional, Tuple, Awaitable, Callable, Dict, Any, cast
from typing_extensions import Literal

from opentrons.calibration_storage import (
    helpers,
    types as cal_types,
    get_robot_deck_attitude,
    save_robot_deck_attitude,
    get_custom_tiprack_definition_for_tlc,
    mark_bad_calibration,
)

from opentrons.calibration_storage.ot2 import (
    get_pipette_offset,
    save_pipette_calibration,
    load_tip_length_calibration,
    create_tip_length_data,
    save_tip_length_calibration,
)

from opentrons.calibration_storage.ot2.models import v1 as cal_models
from opentrons.types import Mount, Point, Location
from opentrons.hardware_control import (
    HardwareControlAPI,
    CriticalPoint,
    Pipette,
    robot_calibration,
    util,
)
from opentrons.protocol_api import labware
from opentrons.protocol_api.core.legacy.deck import Deck
from opentrons.protocols.api_support.constants import OPENTRONS_NAMESPACE
from opentrons.protocols.api_support.deck_type import (
    guess_from_global_config as guess_deck_type_from_global_config,
)

from opentrons_shared_data.labware.types import LabwareDefinition2

from robot_server.robot.calibration.constants import (
    MOVE_TO_DECK_SAFETY_BUFFER,
    MOVE_TO_TIP_RACK_SAFETY_BUFFER,
    JOG_TO_DECK_SLOT,
    CAL_BLOCK_SETUP_CAL_CHECK,
)
import robot_server.robot.calibration.util as uf
from robot_server.robot.calibration.helper_classes import (
    RobotHealthCheck,
    PipetteRank,
    PipetteInfo,
    RequiredLabware,
    SupportedCommands,
)

from robot_server.service.session.models.command_definitions import (
    CalibrationCommand,
    DeckCalibrationCommand,
    CheckCalibrationCommand,
)
from robot_server.service.errors import RobotServerError

from .util import (
    PointTypes,
    ReferencePoints,
    ComparisonStatePerCalibration,
    ComparisonStatePerPipette,
)
from .models import (
    ComparisonStatus,
    CheckAttachedPipette,
    TipComparisonMap,
    PipetteOffsetComparisonMap,
    DeckComparisonMap,
)
from .state_machine import CalibrationCheckStateMachine

from .constants import (
    PIPETTE_TOLERANCES,
    MOVE_POINT_STATE_MAP,
    CalibrationCheckState as State,
    TIPRACK_SLOT,
)
from ..errors import CalibrationError

MODULE_LOG = logging.getLogger(__name__)

"""
A collection of functions that allow a consumer to determine the health
of the current calibration saved on a robot.
"""

# TODO: BC 2020-07-08: type all command logic here with actual Model type
COMMAND_HANDLER = Callable[..., Awaitable[None]]

COMMAND_MAP = Dict[str, COMMAND_HANDLER]


class CheckCalibrationUserFlow:
    def __init__(
        self,
        hardware: HardwareControlAPI,
        has_calibration_block: bool = False,
        tip_rack_defs: Optional[List[LabwareDefinition2]] = None,
    ) -> None:
        self._hardware = hardware
        self._state_machine = CalibrationCheckStateMachine()
        self._current_state = State.sessionStarted
        self._reference_points = ReferencePoints(
            tip=PointTypes(),
            height=PointTypes(),
            one=PointTypes(),
            two=PointTypes(),
            three=PointTypes(),
        )
        self._comparison_map = ComparisonStatePerPipette(
            first=ComparisonStatePerCalibration(),
            second=ComparisonStatePerCalibration(),
        )
        self._deck = Deck(guess_deck_type_from_global_config())
        self._filtered_hw_pips = self._filter_hw_pips()
        (
            self._deck_calibration,
            self._pipette_calibrations,
            self._tip_lengths,
        ) = self._get_current_calibrations()
        self._check_valid_calibrations()

        self._tip_racks: Optional[List[LabwareDefinition2]] = tip_rack_defs
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
            CalibrationCommand.move_to_reference_point: self.move_to_reference_point,
            CalibrationCommand.move_to_deck: self.move_to_deck,
            CalibrationCommand.move_to_point_one: self.move_to_point_one,
            DeckCalibrationCommand.move_to_point_two: self.move_to_point_two,
            DeckCalibrationCommand.move_to_point_three: self.move_to_point_three,
            CheckCalibrationCommand.switch_pipette: self.change_active_pipette,
            CheckCalibrationCommand.return_tip: self.return_tip,
            CheckCalibrationCommand.transition: self.transition,
            CalibrationCommand.invalidate_last_action: self.invalidate_last_action,
            CalibrationCommand.exit: self.exit_session,
        }
        self._supported_commands = SupportedCommands(namespace="calibration")

    @property
    def deck(self) -> Deck:
        return self._deck

    @property
    def hardware(self) -> HardwareControlAPI:
        return self._hardware

    @property
    def tip_origin(self) -> Point:
        if self._tip_origin_pt:
            return self._tip_origin_pt
        else:
            return (
                self.active_tiprack.wells()[0].top().point
                + MOVE_TO_TIP_RACK_SAFETY_BUFFER
            )

    @tip_origin.setter
    def tip_origin(self, new_val: Optional[Point]) -> None:
        self._tip_origin_pt = new_val

    def reset_tip_origin(self) -> None:
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

    @property
    def supported_commands(self) -> List[str]:
        return self._supported_commands.supported()

    async def transition(
        self, tiprackDefinition: Optional[LabwareDefinition2] = None
    ) -> None:
        pass

    async def change_active_pipette(self) -> None:
        second_pip = self._get_pipette_by_rank(PipetteRank.second)
        if not second_pip:
            raise RobotServerError(
                definition=CalibrationError.UNMET_STATE_TRANSITION_REQ,
                state=self._current_state,
                handler="change_active_pipette",
                condition="second pipette",
            )
        self._active_pipette = second_pip
        del self._deck[TIPRACK_SLOT]
        self._active_tiprack = self._load_active_tiprack()
        self.reset_tip_origin()

    def _set_current_state(self, to_state: State) -> None:
        self._current_state = to_state

    @property
    def critical_point_override(self) -> Optional[CriticalPoint]:
        return (
            CriticalPoint.FRONT_NOZZLE if self.hw_pipette.config.channels == 8 else None
        )

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
            f"CalibrationCheckUserFlow handled command {name}, transitioned"
            f"from {self._current_state} to {next_state}"
        )

    def get_required_labware(self) -> List[RequiredLabware]:
        slots = self._deck.get_non_fixture_slots()
        lw_by_slot = {s: self._deck[s] for s in slots if self._deck[s]}
        return [
            RequiredLabware.from_lw(lw, s)  # type: ignore
            for s, lw in lw_by_slot.items()
        ]

    def get_active_tiprack(self) -> RequiredLabware:
        return RequiredLabware.from_lw(self.active_tiprack)

    def _filter_hw_pips(self) -> Dict[Mount, Pipette]:
        hw_instr = self._hardware.hardware_instruments
        return {m: p for m, p in hw_instr.items() if p}

    def _select_starting_pipette(self) -> Tuple[PipetteInfo, List[PipetteInfo]]:
        """
        Select pipette for calibration based on:
        1: larger max volume
        2: single-channel over multi
        3: right mount over left
        """
        if not any(self._hardware.hardware_instruments.values()):
            raise RobotServerError(
                definition=CalibrationError.NO_PIPETTE_ATTACHED,
                flow="Calibration Health Check",
            )
        pips = self._filtered_hw_pips
        # TODO(lc - 10/30): Clean up repeated logic here by fetching/storing
        # calibrations at the beginning of the session
        if len(pips) == 1:
            for mount, pip in pips.items():
                pip_calibration = self._pipette_calibrations[mount]
                # This assert reflects an assumption from before this code was type-checked.
                # Ideally, this would be ensured statically.
                assert pip_calibration is not None
                info = PipetteInfo(
                    channels=pip.config.channels,
                    rank=PipetteRank.first,
                    max_volume=pip.liquid_class.max_volume,
                    mount=mount,
                    tip_rack=self._get_tiprack_by_pipette_volume(
                        pip.liquid_class.max_volume, pip_calibration
                    ),
                    default_tipracks=uf.get_default_tipracks(
                        # `type: ignore` to narrow list[str] to list[LabwareURI].
                        pip.liquid_class.default_tipracks  # type: ignore[arg-type]
                    ),
                )
                return info, [info]

        right_pip = pips[Mount.RIGHT]
        left_pip = pips[Mount.LEFT]
        r_calibration = self._get_stored_pipette_offset_cal(right_pip, Mount.RIGHT)
        l_calibration = self._get_stored_pipette_offset_cal(left_pip, Mount.LEFT)
        r_info = PipetteInfo(
            channels=right_pip.config.channels,
            max_volume=right_pip.liquid_class.max_volume,
            rank=PipetteRank.first,
            mount=Mount.RIGHT,
            tip_rack=self._get_tiprack_by_pipette_volume(
                right_pip.liquid_class.max_volume, r_calibration
            ),
            default_tipracks=uf.get_default_tipracks(
                # `type: ignore` to narrow list[str] to list[LabwareURI].
                right_pip.liquid_class.default_tipracks  # type: ignore[arg-type]
            ),
        )
        l_info = PipetteInfo(
            channels=left_pip.config.channels,
            max_volume=left_pip.liquid_class.max_volume,
            rank=PipetteRank.first,
            mount=Mount.LEFT,
            tip_rack=self._get_tiprack_by_pipette_volume(
                left_pip.liquid_class.max_volume, l_calibration
            ),
            default_tipracks=uf.get_default_tipracks(
                # `type: ignore` to narrow list[str] to list[LabwareURI].
                left_pip.liquid_class.default_tipracks  # type: ignore[arg-type]
            ),
        )
        if (
            left_pip.liquid_class.max_volume > right_pip.liquid_class.max_volume
            or right_pip.config.channels > left_pip.config.channels
        ):
            r_info.rank = PipetteRank.second
            return l_info, [l_info, r_info]
        else:
            l_info.rank = PipetteRank.second
            return r_info, [r_info, l_info]

    # todo(mm, 2025-02-14): These return types are the source of a lot of ignored and
    # asserted-away type errors in this file. Double-check that they're actually correct.
    def _get_current_calibrations(
        self,
    ) -> tuple[
        cal_models.DeckCalibrationModel | None,
        dict[Mount, cal_models.InstrumentOffsetModel | None],
        dict[Mount, cal_models.TipLengthModel | None],
    ]:
        deck = get_robot_deck_attitude()
        pipette_offsets = {
            m: get_pipette_offset(p.pipette_id, m)
            for m, p in self._filtered_hw_pips.items()
            if p.pipette_id is not None
        }
        tip_lengths = {
            m: self._get_tip_length_from_pipette(m, p)
            for m, p in self._filtered_hw_pips.items()
        }
        return deck, pipette_offsets, tip_lengths

    def _get_tip_length_from_pipette(
        self, mount: Mount, pipette: Pipette
    ) -> Optional[cal_models.TipLengthModel]:
        if not pipette.pipette_id:
            return None
        pip_offset = get_pipette_offset(pipette.pipette_id, mount)
        if not pip_offset or not pip_offset.uri:
            return None
        details = helpers.details_from_uri(pip_offset.uri)
        position = self._deck.position_for(TIPRACK_SLOT)
        if details.namespace == OPENTRONS_NAMESPACE:
            # todo(mm, 2025-02-13): This can probably replaced with a load from
            # shared-data. We don't need a whole Labware object.
            tiprack = labware.load(
                load_name=details.load_name,
                namespace=details.namespace,
                version=details.version,
                parent=position,
            )
            tiprack_def = tiprack._core.get_definition()
        else:
            tiprack_def = get_custom_tiprack_definition_for_tlc(pip_offset.uri)
        # todo(mm, 2025-02-13): Unclear if this assert is actually always safe.
        # https://opentrons.atlassian.net/browse/EXEC-1230
        assert tiprack_def["schemaVersion"] == 2
        return load_tip_length_calibration(pipette.pipette_id, tiprack_def)

    def _check_valid_calibrations(self) -> None:
        deck = self._deck_calibration
        tip_length = all(tl for tl in self._tip_lengths.values())
        pipette = all(po for po in self._pipette_calibrations.values())
        if not deck or not pipette or not tip_length:
            raise RobotServerError(
                definition=CalibrationError.UNCALIBRATED_ROBOT,
                flow="Calibration Health Check",
            )
        deck_state = robot_calibration.validate_attitude_deck_calibration(
            # fixme(mm, 2025-02-14): This is passing the wrong type and it happens
            # to work because the two types share the same attribute names.
            # This is from before this file was type-checked.
            deck  # type: ignore[arg-type]
        )
        if deck_state != util.DeckTransformState.OK:
            raise RobotServerError(
                definition=CalibrationError.UNCALIBRATED_ROBOT,
                flow="Calibration Health Check",
            )

    async def get_current_point(
        self,
        critical_point: Optional[CriticalPoint] = None,
    ) -> Point:
        return await self._hardware.gantry_position(self.mount, critical_point)

    def _get_pipette_by_rank(self, rank: PipetteRank) -> Optional[PipetteInfo]:
        try:
            return next(p for p in self._pip_info if p.rank == rank)
        except StopIteration:
            return None

    def _is_checking_both_mounts(self) -> bool:
        return len(self._pip_info) == 2

    def _get_volume_from_tiprack_def(self, tip_rack_def: LabwareDefinition2) -> float:
        first_well = tip_rack_def["wells"]["A1"]
        return float(first_well["totalLiquidVolume"])

    def _load_cal_block(self) -> None:
        if self._has_calibration_block:
            cb_setup = CAL_BLOCK_SETUP_CAL_CHECK
            self._deck[cb_setup.slot] = labware.load(
                cb_setup.load_name, self._deck.position_for(cb_setup.slot)
            )

    def _get_stored_pipette_offset_cal(
        self,
        pipette: Optional[Pipette] = None,
        mount: Optional[Mount] = None,
    ) -> cal_models.InstrumentOffsetModel:
        if not pipette or not mount:
            pip_offset = get_pipette_offset(
                self.hw_pipette.pipette_id or "", self.mount
            )
        else:
            pip_offset = get_pipette_offset(pipette.pipette_id or "", mount)
        assert pip_offset, "No Pipette Offset Found"
        return pip_offset

    @staticmethod
    def _get_tr_lw(
        tip_rack_def: Optional[LabwareDefinition2],
        existing_calibration: cal_models.InstrumentOffsetModel,
        volume: float,
        position: Location,
    ) -> labware.Labware:
        """Find the right tiprack to use. Specifically,

        - If it's specified from above, use that
        - If it's not, and we have a calibration, use that
        - If we don't, use the default
        """
        if tip_rack_def:
            uri = helpers.uri_from_definition(tip_rack_def)
            if uri == existing_calibration.uri:
                return labware.load_from_definition(tip_rack_def, position)
            else:
                raise RobotServerError(definition=CalibrationError.BAD_LABWARE_DEF)
        elif existing_calibration.uri:
            try:
                details = helpers.details_from_uri(existing_calibration.uri)
                if not details.namespace == OPENTRONS_NAMESPACE:
                    tiprack_def = get_custom_tiprack_definition_for_tlc(
                        existing_calibration.uri
                    )
                    return labware.load_from_definition(
                        definition=tiprack_def, parent=position
                    )
                return labware.load(
                    load_name=details.load_name,
                    namespace=details.namespace,
                    version=details.version,
                    parent=position,
                )
            except (IndexError, ValueError, FileNotFoundError):
                pass
        raise RobotServerError(definition=CalibrationError.BAD_LABWARE_DEF)

    def _load_active_tiprack(self) -> labware.Labware:
        """
        load onto the deck the default opentrons tip rack labware for this
        pipette and return the tip rack labware. If tip_rack_def is supplied,
        load specific tip rack from def onto the deck and return the labware.


        """
        active_max_vol = self.active_pipette.max_volume
        existing_calibration = self._get_stored_pipette_offset_cal()
        tr_lw = self._get_tiprack_by_pipette_volume(
            active_max_vol, existing_calibration
        )
        self._deck[TIPRACK_SLOT] = tr_lw
        return tr_lw

    def _get_tiprack_by_pipette_volume(
        self, volume: float, existing_calibration: cal_models.InstrumentOffsetModel
    ) -> labware.Labware:
        tip_rack_def = None
        if self._tip_racks:
            for rack_def in self._tip_racks:
                tiprack_vol = self._get_volume_from_tiprack_def(rack_def)
                if volume == tiprack_vol:
                    tip_rack_def = rack_def

        return self._get_tr_lw(
            tip_rack_def,
            existing_calibration,
            volume,
            self._deck.position_for(TIPRACK_SLOT),
        )

    def _get_hw_pipettes(self) -> List[Pipette]:
        # Return a list of instruments, ordered with the active pipette first
        active_mount = self.active_pipette.mount
        hw_instruments = self._hardware.hardware_instruments
        if active_mount == Mount.RIGHT:
            other_mount = Mount.LEFT
        else:
            other_mount = Mount.RIGHT
        if self._is_checking_both_mounts():
            return [
                cast(Pipette, hw_instruments[active_mount]),
                cast(Pipette, hw_instruments[other_mount]),
            ]
        else:
            return [cast(Pipette, hw_instruments[active_mount])]

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
                tipLength=hw_pip.active_tip_settings.default_tip_length,
                tipRackLoadName=info_pip.tip_rack.load_name,
                tipRackDisplay=info_pip.tip_rack._core.get_definition()["metadata"][
                    "displayName"
                ],
                tipRackUri=info_pip.tip_rack.uri,
                rank=info_pip.rank.value,
                mount=str(info_pip.mount),
                serial=hw_pip.pipette_id,
                defaultTipracks=info_pip.default_tipracks,
            )
            for hw_pip, info_pip in zip(hw_pips, info_pips)
        ]

    def get_active_pipette(self) -> CheckAttachedPipette:
        # TODO(mc, 2020-09-17): type of pipette_id does not match expected
        # type of AttachedPipette.serial
        assert self.hw_pipette
        assert self.active_pipette
        display_name = self.active_pipette.tip_rack._core.get_definition()["metadata"][
            "displayName"
        ]
        return CheckAttachedPipette(
            model=self.hw_pipette.model,
            name=self.hw_pipette.name,
            tipLength=self.hw_pipette.active_tip_settings.default_tip_length,
            tipRackLoadName=self.active_pipette.tip_rack.load_name,
            tipRackDisplay=display_name,
            tipRackUri=self.active_pipette.tip_rack.uri,
            rank=self.active_pipette.rank.value,
            mount=str(self.mount),
            serial=self.hw_pipette.pipette_id,
            defaultTipracks=self.active_pipette.default_tipracks,
        )

    def _determine_threshold(self) -> Point:
        """
        Helper function used to determine the threshold for comparison
        based on the state currently being compared and the pipette.
        """
        active_pipette = self.active_pipette

        pipette_type = ""
        if active_pipette and active_pipette.mount:
            pipette_type = str(self._get_hw_pipettes()[0].name)

        is_p1000 = pipette_type in ["p1000_single_gen2", "p1000_single"]
        is_p20 = pipette_type in [
            "p20_single_gen2",
            "p10_single",
            "p20_multi_gen2",
            "p10_multi",
        ]
        cross_states = [
            State.comparingPointOne,
            State.comparingPointTwo,
            State.comparingPointThree,
        ]
        if is_p1000 and self.current_state == State.comparingTip:
            return PIPETTE_TOLERANCES["p1000_tip"]
        elif is_p20 and self.current_state == State.comparingTip:
            return PIPETTE_TOLERANCES["p20_tip"]
        elif self.current_state == State.comparingTip:
            return PIPETTE_TOLERANCES["p300_tip"]
        if is_p1000 and self.current_state in cross_states:
            return PIPETTE_TOLERANCES["p1000_crosses"]
        elif is_p1000 and self.current_state == State.comparingHeight:
            return PIPETTE_TOLERANCES["p1000_height"]
        elif is_p20 and self.current_state in cross_states:
            return PIPETTE_TOLERANCES["p20_crosses"]
        elif self.current_state in cross_states:
            return PIPETTE_TOLERANCES["p300_crosses"]
        else:
            return PIPETTE_TOLERANCES["other_height"]

    @staticmethod
    def _check_and_update_status(
        new_status: RobotHealthCheck, old_status: RobotHealthCheck
    ) -> Literal["IN_THRESHOLD", "OUTSIDE_THRESHOLD"]:
        if old_status is RobotHealthCheck.OUTSIDE_THRESHOLD:
            # Not sure why mypy thinks this .value is Any.
            return old_status.value  # type: ignore[no-any-return]
        else:
            return new_status.value

    def _update_compare_status_by_state(
        self, rank: PipetteRank, info: ComparisonStatus, status: RobotHealthCheck
    ) -> ComparisonStatePerCalibration:
        intermediate_map: ComparisonStatePerCalibration = getattr(
            self._comparison_map, rank.name
        )
        is_second_pipette = self.active_pipette.rank == PipetteRank.second
        only_one_pipette = not self._is_checking_both_mounts()
        deck_comparison_state = is_second_pipette or only_one_pipette
        if self.current_state == State.comparingTip:
            tip = TipComparisonMap(status=status.value, comparingTip=info)
            intermediate_map.set_value("tipLength", tip)
        elif self.current_state == State.comparingHeight:
            pip = PipetteOffsetComparisonMap(status=status.value, comparingHeight=info)
            intermediate_map.set_value("pipetteOffset", pip)
        elif self.current_state == State.comparingPointOne:
            # This assert reflects an assumption from before this code was type-checked.
            # Ideally, this would be ensured statically.
            assert intermediate_map.pipetteOffset is not None
            old_status = RobotHealthCheck.status_from_string(
                intermediate_map.pipetteOffset.status
            )
            updated_status = self._check_and_update_status(status, old_status)
            intermediate_map.pipetteOffset.comparingPointOne = info
            intermediate_map.pipetteOffset.status = updated_status
            if deck_comparison_state:
                deck = DeckComparisonMap(status=status.value, comparingPointOne=info)
                intermediate_map.set_value("deck", deck)
        elif self.current_state == State.comparingPointTwo and deck_comparison_state:
            # This assert reflects an assumption from before this code was type-checked.
            # Ideally, this would be ensured statically.
            assert intermediate_map.deck is not None
            old_status = RobotHealthCheck.status_from_string(
                intermediate_map.deck.status
            )
            updated_status = self._check_and_update_status(status, old_status)
            intermediate_map.deck.status = updated_status
            intermediate_map.deck.comparingPointTwo = info
        elif self.current_state == State.comparingPointThree and deck_comparison_state:
            # This assert reflects an assumption from before this code was type-checked.
            # Ideally, this would be ensured statically.
            assert intermediate_map.deck is not None
            old_status = RobotHealthCheck.status_from_string(
                intermediate_map.deck.status
            )
            updated_status = self._check_and_update_status(status, old_status)
            intermediate_map.deck.status = updated_status
            intermediate_map.deck.comparingPointThree = info
        return intermediate_map

    def _mark_bad(self) -> None:
        pipette_offset_states = [State.comparingHeight, State.comparingPointOne]
        deck_calibration_states = [
            State.comparingPointOne,
            State.comparingPointTwo,
            State.comparingPointThree,
        ]
        active_mount = self.active_pipette.mount
        is_second_pipette = self.active_pipette.rank == PipetteRank.second
        only_one_pipette = not self._is_checking_both_mounts()
        pipette_state = is_second_pipette or only_one_pipette
        if self.current_state == State.comparingTip:
            tl_at_active_mount = self._tip_lengths[active_mount]
            # This assert reflects an assumption from before this code was type-checked.
            # Ideally, this would be ensured statically.
            assert tl_at_active_mount is not None
            marked_tl_calibration = mark_bad_calibration.mark_bad(
                tl_at_active_mount, cal_types.SourceType.calibration_check
            )
            tip_definition = self.active_tiprack._core.get_definition()
            # Assert for type checking. This should always pass because
            # self._get_tr_lw() should only deal with labware schema 2.
            assert tip_definition["schemaVersion"] == 2
            tip_length_dict = create_tip_length_data(
                definition=tip_definition,
                # fixme(mm, 2025-02-14): .tip_length does not exist on this type but
                # tipLength does. Investigate how (or if?) this has ever worked.
                # This is from before this file was type-checked.
                length=marked_tl_calibration.tip_length,  # type: ignore[attr-defined]
                cal_status=marked_tl_calibration.status,
            )
            save_tip_length_calibration(
                # fixme(mm, 2025-02-14): .pipette does not exist on TipLengthModel,
                # though it does exist on TipLengthCalibration. Investigate how (or if?)
                # this has ever worked. This is from before this file was type-checked.
                marked_tl_calibration.pipette,  # type: ignore[attr-defined]
                tip_length_dict,
            )
        elif self.current_state == State.comparingPointOne and pipette_state:
            # Here if we're on the second pipette, but the first slot we
            # should make sure we mark both pipette cal and deck cal as bad.
            pc_at_active_mount = self._pipette_calibrations[active_mount]
            # This assert reflects an assumption from before this code was type-checked.
            # Ideally, this would be ensured statically.
            assert pc_at_active_mount is not None
            marked_pipette_calibration = mark_bad_calibration.mark_bad(
                pc_at_active_mount,
                cal_types.SourceType.calibration_check,
            )
            # This assert reflects an assumption from before this code was type-checked.
            # Ideally, this would be ensured statically.
            assert self._deck_calibration is not None
            deck_calibration = mark_bad_calibration.mark_bad(
                self._deck_calibration, cal_types.SourceType.calibration_check
            )
            pipette_id = self.hw_pipette.pipette_id
            assert pipette_id, "Cannot update pipette offset calibraion"
            save_pipette_calibration(
                offset=Point(*marked_pipette_calibration.offset),
                pip_id=pipette_id,
                mount=active_mount,
                tiprack_hash=marked_pipette_calibration.tiprack,
                tiprack_uri=marked_pipette_calibration.uri,
                cal_status=marked_pipette_calibration.status,
            )
            save_robot_deck_attitude(
                transform=deck_calibration.attitude,
                pip_id=deck_calibration.pipette_calibrated_with,
                lw_hash=deck_calibration.tiprack,
                source=deck_calibration.source,
                cal_status=deck_calibration.status,
            )
        elif self.current_state in pipette_offset_states:
            pc_at_active_mount = self._pipette_calibrations[active_mount]
            # This assert reflects an assumption from before this code was type-checked.
            # Ideally, this would be ensured statically.
            assert pc_at_active_mount is not None
            marked_pipette_calibration = mark_bad_calibration.mark_bad(
                pc_at_active_mount,
                cal_types.SourceType.calibration_check,
            )
            pipette_id = self.hw_pipette.pipette_id
            assert pipette_id, "Cannot update pipette offset calibraion"
            save_pipette_calibration(
                offset=Point(*marked_pipette_calibration.offset),
                pip_id=pipette_id,
                mount=active_mount,
                tiprack_hash=marked_pipette_calibration.tiprack,
                tiprack_uri=marked_pipette_calibration.uri,
                cal_status=marked_pipette_calibration.status,
            )
        elif self.current_state in deck_calibration_states and pipette_state:
            # This assert reflects an assumption from before this code was type-checked.
            # Ideally, this would be ensured statically.
            assert self._deck_calibration is not None
            marked_deck_calibration = mark_bad_calibration.mark_bad(
                self._deck_calibration, cal_types.SourceType.calibration_check
            )
            save_robot_deck_attitude(
                transform=marked_deck_calibration.attitude,
                pip_id=marked_deck_calibration.pipette_calibrated_with,
                lw_hash=marked_deck_calibration.tiprack,
                source=marked_deck_calibration.source,
                cal_status=marked_deck_calibration.status,
            )

    async def update_comparison_map(self) -> None:
        ref_pt, jogged_pt = self._get_reference_points_by_state()
        rank = self.active_pipette.rank
        threshold_vector = self._determine_threshold()

        if ref_pt is not None and jogged_pt is not None:
            diff_magnitude = None
            if threshold_vector.z == 0.0:
                diff_magnitude = ref_pt._replace(z=0.0).magnitude_to(
                    jogged_pt._replace(z=0.0)
                )
            elif threshold_vector.x == 0.0 and threshold_vector.y == 0.0:
                diff_magnitude = ref_pt._replace(x=0.0, y=0.0).magnitude_to(
                    jogged_pt._replace(x=0.0, y=0.0)
                )
            assert (
                diff_magnitude is not None
            ), "step comparisons must check z or (x and y) magnitude"

            threshold_mag = Point(0, 0, 0).magnitude_to(threshold_vector)
            exceeds = diff_magnitude > threshold_mag
            status = RobotHealthCheck.IN_THRESHOLD

            if exceeds:
                self._mark_bad()
                status = RobotHealthCheck.OUTSIDE_THRESHOLD

            info = ComparisonStatus(
                differenceVector=list(jogged_pt - ref_pt),
                thresholdVector=list(threshold_vector),
                exceedsThreshold=exceeds,
            )
            intermediate_map = self._update_compare_status_by_state(rank, info, status)
            self._comparison_map.set_value(rank.name, intermediate_map)

    # todo(mm, 2025-02-14): This `type: ignore[return]` is because mypy thinks we're
    # missing some cases. Investigate this to see if any of those missed cases matter
    # in practice.
    def _get_reference_points_by_state(self) -> tuple[Point, Point]:  # type: ignore[return]
        saved_points = self._reference_points
        if self.current_state == State.comparingTip:
            return saved_points.tip.initial_point, saved_points.tip.final_point
        elif self.current_state == State.comparingHeight:
            return saved_points.height.initial_point, saved_points.height.final_point
        elif self.current_state == State.comparingPointOne:
            return saved_points.one.initial_point, saved_points.one.final_point
        elif self.current_state == State.comparingPointTwo:
            return saved_points.two.initial_point, saved_points.two.final_point
        elif self.current_state == State.comparingPointThree:
            return saved_points.three.initial_point, saved_points.three.final_point

    async def register_initial_point(self) -> None:
        """
        Here we will register the initial and final
        points to the current point before jogging
        in the instance that a user doesn't jog at
        all.
        """
        critical_point = self.critical_point_override
        current_point = await self.get_current_point(critical_point)
        if self.current_state == State.comparingNozzle:
            self._reference_points.tip.initial_point = current_point
            self._reference_points.tip.final_point = current_point
        elif self.current_state == State.comparingTip:
            self._reference_points.height.initial_point = current_point
            self._reference_points.height.final_point = current_point
        elif self.current_state == State.comparingHeight:
            self._reference_points.one.initial_point = current_point
            self._reference_points.one.final_point = current_point
        elif self.current_state == State.comparingPointOne:
            self._reference_points.two.initial_point = current_point
            self._reference_points.two.final_point = current_point
        elif self.current_state == State.comparingPointTwo:
            self._reference_points.three.initial_point = current_point
            self._reference_points.three.final_point = current_point

    async def register_final_point(self) -> None:
        critical_point = self.critical_point_override
        current_point = await self.get_current_point(critical_point)
        if self.current_state == State.comparingNozzle:
            # The reference point is unique in that
            # a user might jog after moving to this
            # position so we need to do a final save
            # every time a jog command is issued.
            self._reference_points.tip.initial_point = current_point
        elif self.current_state == State.comparingTip:
            self._reference_points.tip.final_point = current_point
        elif self.current_state == State.comparingHeight:
            self._reference_points.height.final_point = (
                current_point + MOVE_TO_DECK_SAFETY_BUFFER._replace(y=0.0)
            )
            self._z_height_reference = current_point.z
        elif self.current_state == State.comparingPointOne:
            self._reference_points.one.final_point = current_point
        elif self.current_state == State.comparingPointTwo:
            self._reference_points.two.final_point = current_point
        elif self.current_state == State.comparingPointThree:
            self._reference_points.three.final_point = current_point

    def _get_tip_length(self) -> float:
        pip_id = self.hw_pipette.pipette_id
        assert pip_id
        assert self.active_tiprack
        definition = self.active_tiprack._core.get_definition()
        # Assert for type checking. This should always pass because
        # self._get_tr_lw() should only deal with labware schema 2.
        assert definition["schemaVersion"] == 2
        try:
            return load_tip_length_calibration(pip_id, definition).tipLength
        except cal_types.TipLengthCalNotFound:
            tip_overlap = self.hw_pipette.tip_overlap["v0"].get(
                self.active_tiprack.uri, self.hw_pipette.tip_overlap["v0"]["default"]
            )
            tip_length = self.active_tiprack.tip_length
            return tip_length - tip_overlap

    async def move_to_tip_rack(self) -> None:
        if not self.active_tiprack:
            raise RobotServerError(
                definition=CalibrationError.UNMET_STATE_TRANSITION_REQ,
                state=self.current_state,
                handler="move_to_tip_rack",
                condition="active tiprack",
            )
        await self.register_initial_point()
        await self._move(Location(self.tip_origin, None))

    async def move_to_deck(self) -> None:
        deck_pt = self._deck.get_slot_center(JOG_TO_DECK_SLOT)
        ydim = self._deck.get_slot_definition(JOG_TO_DECK_SLOT)["boundingBox"][
            "yDimension"
        ]
        new_pt = deck_pt - Point(0, (ydim / 2), deck_pt.z) + MOVE_TO_DECK_SAFETY_BUFFER
        to_loc = Location(new_pt, None)
        await self._move(to_loc)
        await self.register_initial_point()

    def _get_move_to_point_loc_by_state(self) -> Location:
        assert (
            self._z_height_reference is not None
        ), "comparePoint has not been called yet"
        pt_id = MOVE_POINT_STATE_MAP[self._current_state]
        coords = self._deck.get_calibration_position(pt_id).position
        loc = Location(Point(*coords), None)
        return loc.move(point=Point(0, 0, self._z_height_reference))

    async def move_to_reference_point(self) -> None:
        cal_block_target_well: Optional[labware.Well] = None
        if self._has_calibration_block:
            cb_setup = CAL_BLOCK_SETUP_CAL_CHECK
            calblock: labware.Labware = self._deck[cb_setup.slot]  # type: ignore
            cal_block_target_well = calblock.wells_by_name()[cb_setup.well]

        ref_loc = uf.get_reference_location(
            deck=self._deck, cal_block_target_well=cal_block_target_well
        )
        await self._move(ref_loc)
        await self.register_final_point()

    async def move_to_point_one(self) -> None:
        await self._move(self._get_move_to_point_loc_by_state())
        await self.register_initial_point()

    async def move_to_point_two(self) -> None:
        await self._move(self._get_move_to_point_loc_by_state())
        await self.register_initial_point()

    async def move_to_point_three(self) -> None:
        await self._move(self._get_move_to_point_loc_by_state())
        await self.register_initial_point()

    async def jog(self, vector: tuple[float, float, float]) -> None:
        await self._hardware.move_rel(mount=self.mount, delta=Point(*vector))
        await self.register_final_point()

    async def pick_up_tip(self) -> None:
        await uf.pick_up_tip(self, tip_length=self._get_tip_length())

    async def invalidate_tip(self) -> None:
        await uf.invalidate_tip(self)

    async def return_tip(self) -> None:
        await uf.return_tip(self, tip_length=self._get_tip_length())
        await self.hardware.retract(self.mount)

    async def _move(self, to_loc: Location) -> None:
        await uf.move(self, to_loc)

    async def invalidate_last_action(self) -> None:
        if self._current_state not in (State.comparingNozzle, State.preparingPipette):
            await self.hardware.home()
            await self.hardware.gantry_position(self.mount, refresh=True)
            trash = self._deck.get_fixed_trash()
            assert trash, "Bad deck setup"
            await uf.move(self, trash["A1"].top(), CriticalPoint.XY_CENTER)  # type: ignore[index]
            await self.hardware.drop_tip(self.mount)
            await self.move_to_tip_rack()
        elif self._current_state == State.comparingNozzle:
            await self.hardware.retract(self.mount)
            await self.move_to_reference_point()
        else:  # preparingPipette
            await self.hardware.home()
            await self.hardware.gantry_position(self.mount, refresh=True)
            await self.move_to_tip_rack()

    async def exit_session(self) -> None:
        if self.hw_pipette.has_tip:
            await self.move_to_tip_rack()
            await self.return_tip()
        # reload new deck calibration
        self._hardware.reset_robot_calibration()
        await self._hardware.home()
