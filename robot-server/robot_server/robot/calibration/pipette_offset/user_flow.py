import logging
from typing import (
    Any,
    Awaitable,
    Callable,
    Dict,
    List,
    NoReturn,
    Optional,
    Union,
    Tuple,
    cast,
)
from opentrons.calibration_storage import (
    helpers,
)

from opentrons.calibration_storage.ot2 import (
    load_tip_length_calibration,
    get_pipette_offset,
    save_pipette_calibration,
    delete_pipette_offset_file,
)

from opentrons.calibration_storage.ot2 import models
from opentrons.calibration_storage.types import (
    TipLengthCalNotFound,
)
from opentrons.hardware_control import HardwareControlAPI, CriticalPoint, Pipette
from opentrons.protocols.api_support.deck_type import (
    guess_from_global_config as guess_deck_type_from_global_config,
)
from opentrons_shared_data.pipette.types import LabwareUri
from opentrons.protocol_api import labware
from opentrons.protocol_api.core.legacy.deck import Deck
from opentrons.types import Mount, Point, Location
from robot_server.service.errors import RobotServerError
from robot_server.service.session.models.command_definitions import CalibrationCommand
from robot_server.robot.calibration import util
from robot_server.robot.calibration.constants import (
    TIP_RACK_LOOKUP_BY_MAX_VOL,
    POINT_ONE_ID,
    MOVE_TO_DECK_SAFETY_BUFFER,
    MOVE_TO_TIP_RACK_SAFETY_BUFFER,
    CAL_BLOCK_SETUP_BY_MOUNT,
    JOG_TO_DECK_SLOT,
)
from ..errors import CalibrationError
from ..helper_classes import RequiredLabware, AttachedPipette, SupportedCommands
from .constants import (
    PipetteOffsetCalibrationState as POCState,
    PipetteOffsetWithTipLengthCalibrationState as POWTState,
    TIP_RACK_SLOT,
)
from .state_machine import (
    PipetteOffsetCalibrationStateMachine,
    PipetteOffsetWithTipLengthStateMachine,
)

from opentrons_shared_data.labware.types import LabwareDefinition2


MODULE_LOG = logging.getLogger(__name__)

"""
A collection of functions that allow a consumer to prepare and update
calibration data associated with the position of a specific physical
pipette attached to the gantry, in relation to the deck
"""

# TODO: BC 2020-07-08: type all command logic here with actual Model type
COMMAND_HANDLER = Callable[..., Awaitable[None]]

COMMAND_MAP = Dict[str, COMMAND_HANDLER]
PipetteOffsetStateMachine = Union[
    PipetteOffsetCalibrationStateMachine, PipetteOffsetWithTipLengthStateMachine
]
PipetteOffsetState = Union[POWTState, POCState]


class PipetteOffsetCalibrationUserFlow:
    def __init__(
        self,
        hardware: HardwareControlAPI,
        mount: Mount = Mount.RIGHT,
        recalibrate_tip_length: bool = False,
        has_calibration_block: bool = False,
        tip_rack_def: Optional[LabwareDefinition2] = None,
    ) -> None:
        self._hardware = hardware
        self._mount = mount

        pip = self._hardware.hardware_instruments[mount]
        if not pip:
            raise RobotServerError(
                definition=CalibrationError.NO_PIPETTE_ON_MOUNT, mount=mount
            )
        self._hw_pipette = pip

        self._deck = Deck(guess_deck_type_from_global_config())

        self._saved_offset_this_session = False

        point_one_pos = self._deck.get_calibration_position(POINT_ONE_ID).position
        self._cal_ref_point = Point(*point_one_pos)

        self._tip_origin_pt: Optional[Point] = None
        self._nozzle_height_at_reference: Optional[float] = None

        self._using_default_tiprack = False

        existing_offset_calibration = self._get_stored_pipette_offset_cal()
        self._load_tip_rack(tip_rack_def, existing_offset_calibration)

        existing_tip_length_calibration = self._get_stored_tip_length_cal()
        perform_tip_length = (
            recalibrate_tip_length or not existing_tip_length_calibration
        )

        if perform_tip_length and has_calibration_block:
            self._load_calibration_block()
            self._has_calibration_block: bool = has_calibration_block
        else:
            self._has_calibration_block = False

        self._has_calibrated_tip_length: bool = (
            self._get_stored_tip_length_cal() is not None or self._using_default_tiprack
        )

        self._sm = self._determine_state_machine(perform_tip_length)

        self._current_state = self._sm.state.sessionStarted

        self._should_perform_tip_length = perform_tip_length

        self._command_map: COMMAND_MAP = {
            CalibrationCommand.load_labware: self.load_labware,
            CalibrationCommand.move_to_reference_point: self.move_to_reference_point,
            CalibrationCommand.jog: self.jog,
            CalibrationCommand.pick_up_tip: self.pick_up_tip,
            CalibrationCommand.invalidate_tip: self.invalidate_tip,
            CalibrationCommand.save_offset: self.save_offset,
            CalibrationCommand.move_to_tip_rack: self.move_to_tip_rack,
            CalibrationCommand.move_to_deck: self.move_to_deck,
            CalibrationCommand.move_to_point_one: self.move_to_point_one,
            CalibrationCommand.set_has_calibration_block: self.set_has_calibration_block,
            CalibrationCommand.exit: self.exit_session,
            CalibrationCommand.invalidate_last_action: self.invalidate_last_action,
        }

        self._hw_pipette.reset_pipette_offset(self._mount, to_default=True)
        self._default_tipracks = util.get_default_tipracks(
            cast(List[LabwareUri], self.hw_pipette.liquid_class.default_tipracks)
        )
        self._supported_commands = SupportedCommands(namespace="calibration")
        self._supported_commands.loadLabware = True

    @property
    def deck(self) -> Deck:
        return self._deck

    @property
    def mount(self) -> Mount:
        return self._mount

    @property
    def hardware(self) -> HardwareControlAPI:
        return self._hardware

    @property
    def hw_pipette(self) -> Pipette:
        return self._hw_pipette

    @property
    def current_state(self) -> PipetteOffsetState:
        # Currently, mypy can't interpret enum
        # values being saved as variables. Although
        # using python's built-in typing methods
        # correctly reveals that this is an enum,
        # mypy believes it is a string.
        return self._sm.current_state

    @property
    def has_calibrated_tip_length(self) -> bool:
        return self._has_calibrated_tip_length

    @property
    def should_perform_tip_length(self) -> bool:
        return self._should_perform_tip_length

    @should_perform_tip_length.setter
    def should_perform_tip_length(self, value: bool) -> None:
        self._should_perform_tip_length = value

    def get_pipette(self) -> AttachedPipette:
        # TODO(mc, 2020-09-17): s/tip_length/tipLength
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

    async def set_has_calibration_block(self, hasBlock: bool) -> None:
        if self._has_calibration_block and not hasBlock:
            self._remove_calibration_block()
        elif hasBlock and not self._has_calibration_block:
            self._load_calibration_block()
        self._has_calibration_block = hasBlock

    def _get_tip_rack_lw(self) -> labware.Labware:
        pip_vol = self._hw_pipette.liquid_class.max_volume
        lw_load_name = TIP_RACK_LOOKUP_BY_MAX_VOL[str(pip_vol)].load_name
        return labware.load(lw_load_name, self._deck.position_for(TIP_RACK_SLOT))

    async def handle_command(self, name: Any, data: Dict[Any, Any]) -> None:
        """
        Handle a client command

        :param name: Name of the command
        :param data: Data supplied in command
        :return: None
        """
        # Here we need to get the current state in the state machine's
        # state enum because otherwise mypy will confuse which type
        # the state is.
        state = getattr(self._sm.state, self._sm.current_state)
        next_state = self._sm.get_next_state(state, name)

        handler = self._command_map.get(name)
        if handler is not None:
            await handler(**data)
        self._sm.set_state(
            # This `type: ignore` is because self._sm can be one of two types.
            # This should be safe in practice since we got next_state from self._sm.
            next_state  # type: ignore[arg-type]
        )
        MODULE_LOG.debug(
            f"PipetteOffsetCalUserFlow handled command {name}, transitioned"
            f"from {self._sm.current_state} to {next_state}"
        )

    @property
    def critical_point_override(self) -> Optional[CriticalPoint]:
        return (
            CriticalPoint.FRONT_NOZZLE
            if self._hw_pipette.config.channels == 8
            else None
        )

    async def get_current_point(self, critical_point: Optional[CriticalPoint]) -> Point:
        return await self._hardware.gantry_position(self._mount, critical_point)

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
            existing_offset_calibration = self._get_stored_pipette_offset_cal()
            self._load_tip_rack(verified_definition, existing_offset_calibration)

    async def jog(self, vector: tuple[float, float, float]) -> None:
        await self._hardware.move_rel(mount=self._mount, delta=Point(*vector))

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

    async def move_to_tip_rack(self) -> None:
        if (
            self._sm.current_state == self._sm.state.labwareLoaded
            and not self.has_calibrated_tip_length
            and not self.should_perform_tip_length
        ):
            self._flag_unmet_transition_req(
                command_handler="move_to_tip_rack",
                unmet_condition="not performing tip length calibration",
            )
        await self._move(Location(self.tip_origin, None))

    @staticmethod
    def _determine_state_machine(perform_tip_length: bool) -> PipetteOffsetStateMachine:
        if perform_tip_length:
            return PipetteOffsetWithTipLengthStateMachine()
        else:
            return PipetteOffsetCalibrationStateMachine()

    def _get_stored_tip_length_cal(self) -> Optional[float]:
        try:
            definition = self._tip_rack._core.get_definition()
            # Assert for type checking. This should always pass because
            # self._get_tr_lw() limits itself to schema 2.
            assert definition["schemaVersion"] == 2
            return load_tip_length_calibration(
                self._hw_pipette.pipette_id or "", definition
            ).tipLength
        except TipLengthCalNotFound:
            return None

    def _get_stored_pipette_offset_cal(
        self,
    ) -> Optional[models.v1.InstrumentOffsetModel]:
        if self._hw_pipette.pipette_id is None:
            return None
        return get_pipette_offset(self._hw_pipette.pipette_id, self._mount)

    def _get_tip_length(self) -> float:
        stored_tip_length_cal = self._get_stored_tip_length_cal()
        if stored_tip_length_cal is None or self._should_perform_tip_length:
            tip_overlap = self._hw_pipette.tip_overlap["v0"].get(self._tip_rack.uri, 0)
            tip_length = self._tip_rack.tip_length
            return tip_length - tip_overlap
        else:
            return stored_tip_length_cal

    def _load_calibration_block(self) -> None:
        cb_setup = CAL_BLOCK_SETUP_BY_MOUNT[self._mount]
        self._deck[cb_setup.slot] = labware.load(
            cb_setup.load_name, self._deck.position_for(cb_setup.slot)
        )

    def _remove_calibration_block(self) -> None:
        cb_setup = CAL_BLOCK_SETUP_BY_MOUNT[self._mount]
        del self._deck[cb_setup.slot]

    @staticmethod
    def _get_tr_lw(
        tip_rack_def: Optional[LabwareDefinition2],
        existing_calibration: Optional[models.v1.InstrumentOffsetModel],
        volume: float,
        position: Location,
    ) -> Tuple[bool, labware.Labware]:
        """Find the right tiprack to use. Specifically,

        - If it's specified from above, use that
        - If it's not, and we have a calibration, use that
        - If we don't, use the default
        """
        if tip_rack_def:
            return False, labware.load_from_definition(tip_rack_def, position)
        if existing_calibration and existing_calibration.uri:
            try:
                details = helpers.details_from_uri(existing_calibration.uri)
                return True, labware.load(
                    load_name=details.load_name,
                    namespace=details.namespace,
                    version=details.version,
                    parent=position,
                )
            except (IndexError, ValueError, FileNotFoundError):
                pass
        tr_load_name = TIP_RACK_LOOKUP_BY_MAX_VOL[str(volume)].load_name
        return True, labware.load(tr_load_name, position)

    def _load_tip_rack(
        self,
        tip_rack_def: Optional[LabwareDefinition2],
        existing_calibration: Optional[models.v1.InstrumentOffsetModel],
    ) -> None:
        """
        load onto the deck the default opentrons tip rack labware for this
        pipette and return the tip rack labware. If tip_rack_def is supplied,
        load specific tip rack from def onto the deck and return the labware.
        """
        self._using_default_tiprack, self._tip_rack = self._get_tr_lw(
            tip_rack_def,
            existing_calibration,
            self._hw_pipette.liquid_class.max_volume,
            self._deck.position_for(TIP_RACK_SLOT),
        )
        if self._deck[TIP_RACK_SLOT]:
            del self._deck[TIP_RACK_SLOT]
        self._deck[TIP_RACK_SLOT] = self._tip_rack

    def _flag_unmet_transition_req(
        self, command_handler: str, unmet_condition: str
    ) -> NoReturn:
        raise RobotServerError(
            definition=CalibrationError.UNMET_STATE_TRANSITION_REQ,
            handler=command_handler,
            state=self._sm.current_state,
            condition=unmet_condition,
        )

    async def move_to_deck(self) -> None:
        current_state = self._sm.current_state
        if (
            not self.has_calibrated_tip_length
            and current_state == self._sm.state.inspectingTip
        ):
            self._flag_unmet_transition_req(
                command_handler="move_to_deck",
                unmet_condition="tip length calibration data exists",
            )
        if (
            self.should_perform_tip_length
            and isinstance(self._sm.state, POWTState)
            and current_state == self._sm.state.tipLengthComplete
            and self._saved_offset_this_session
        ):
            self._flag_unmet_transition_req(
                command_handler="move_to_deck",
                unmet_condition="offset not saved this session",
            )
        deck_pt = self._deck.get_slot_center(JOG_TO_DECK_SLOT)
        ydim = self._deck.get_slot_definition(JOG_TO_DECK_SLOT)["boundingBox"][
            "yDimension"
        ]
        new_pt = deck_pt + Point(0, -1 * ydim / 2, 0) + MOVE_TO_DECK_SAFETY_BUFFER
        to_loc = Location(new_pt, None)
        await self._move(to_loc)
        self._should_perform_tip_length = False

    async def move_to_point_one(self) -> None:
        assert (
            self._z_height_reference is not None
        ), "saveOffset has not been called yet"
        target_loc = Location(self._cal_ref_point, None)
        target = target_loc.move(point=Point(0, 0, self._z_height_reference))
        await self._move(target)

    async def save_offset(self) -> None:
        cur_pt = await self.get_current_point(critical_point=None)
        current_state = self._sm.current_state
        if current_state == self._sm.state.joggingToDeck:
            self._z_height_reference = cur_pt.z
        elif current_state == self._sm.state.savingPointOne:
            if self._hw_pipette.config.channels > 1:
                cur_pt = await self.get_current_point(
                    critical_point=CriticalPoint.FRONT_NOZZLE
                )
            tiprack_hash = helpers.hash_labware_def(
                self._tip_rack._core.get_definition()
            )
            offset = self._cal_ref_point - cur_pt
            save_pipette_calibration(
                offset=offset,
                mount=self._mount,
                pip_id=self._hw_pipette.pipette_id or "",
                tiprack_hash=tiprack_hash,
                tiprack_uri=self._tip_rack.uri,
            )
            self._saved_offset_this_session = True
        elif (
            isinstance(current_state, POWTState)
            and current_state == POWTState.measuringNozzleOffset
        ):
            self._nozzle_height_at_reference = cur_pt.z
        elif (
            isinstance(current_state, POWTState)
            and current_state == POWTState.measuringTipOffset
        ):
            assert self._hw_pipette.has_tip
            assert self._nozzle_height_at_reference is not None
            # set critical point explicitly to nozzle
            noz_pt = await self.get_current_point(critical_point=CriticalPoint.NOZZLE)
            util.save_tip_length_calibration(
                pipette_id=self._hw_pipette.pipette_id,  # type: ignore[arg-type]
                tip_length_offset=noz_pt.z - self._nozzle_height_at_reference,
                tip_rack=self._tip_rack,
            )
            delete_pipette_offset_file(self._hw_pipette.pipette_id or "", self.mount)
            new_tip_length = self._get_stored_tip_length_cal()
            self._has_calibrated_tip_length = new_tip_length is not None
            # load the new tip length for the rest of the session
            self._hw_pipette.current_tip_length = (
                new_tip_length  # type: ignore[assignment]
            )
            await self.hardware.retract(self._mount, 20)

    async def move_to_reference_point(self) -> None:
        if not self.should_perform_tip_length and self._sm.current_state in (
            self._sm.state.labwareLoaded,
            self._sm.state.inspectingTip,
        ):
            self._flag_unmet_transition_req(
                command_handler="move_to_reference_point",
                unmet_condition="performing additional tip length calibration",
            )

        cal_block_target_well: Optional[labware.Well] = None
        if self._has_calibration_block:
            cb_setup = CAL_BLOCK_SETUP_BY_MOUNT[self._mount]
            calblock: labware.Labware = self._deck[cb_setup.slot]  # type: ignore
            cal_block_target_well = calblock.wells_by_name()[cb_setup.well]

        ref_loc = util.get_reference_location(
            deck=self._deck, cal_block_target_well=cal_block_target_well
        )
        await self._move(ref_loc)

    async def invalidate_last_action(self) -> None:
        if self._sm.current_state == POWTState.measuringNozzleOffset:
            await self._hardware.home()
            await self._hardware.gantry_position(self.mount, refresh=True)
            await self.move_to_reference_point()
        elif self._sm.current_state == self._sm.state.preparingPipette:
            self.reset_tip_origin()
            await self._hardware.home()
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

    async def pick_up_tip(self) -> None:
        await util.pick_up_tip(self, tip_length=self._get_tip_length())

    async def invalidate_tip(self) -> None:
        await util.invalidate_tip(self)

    async def return_tip(self) -> None:
        await util.return_tip(self, tip_length=self._get_tip_length())

    async def _move(self, to_loc: Location) -> None:
        await util.move(self, to_loc)

    async def exit_session(self) -> None:
        if self.hw_pipette.has_tip:
            await self.move_to_tip_rack()
            await self.return_tip()
        # reload new pipette offset data by resetting instrument
        self._hardware.reset_instrument(self._mount)
        await self._hardware.home()
