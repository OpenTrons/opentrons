from typing import Dict, Type

from robot_server.service.session.models.command_definitions import (
    CommandDefinition,
    CalibrationCommand,
)
from robot_server.robot.calibration.util import SimpleStateMachine, StateTransitionError
from .constants import (
    PipetteOffsetCalibrationState as POCState,
    PipetteOffsetWithTipLengthCalibrationState as POWTState,
)

PipetteOffsetTransitions = Dict[POCState, Dict[CommandDefinition, POCState]]
PipetteOffsetWithTLTransitions = Dict[POWTState, Dict[CommandDefinition, POWTState]]
PIP_OFFSET_CAL_TRANSITIONS: PipetteOffsetTransitions = {
    POCState.sessionStarted: {CalibrationCommand.load_labware: POCState.labwareLoaded},
    POCState.labwareLoaded: {
        CalibrationCommand.move_to_tip_rack: POCState.preparingPipette,
    },
    POCState.preparingPipette: {
        CalibrationCommand.jog: POCState.preparingPipette,
        CalibrationCommand.pick_up_tip: POCState.inspectingTip,
        CalibrationCommand.invalidate_last_action: POCState.preparingPipette,
    },
    POCState.inspectingTip: {
        CalibrationCommand.invalidate_tip: POCState.preparingPipette,
        CalibrationCommand.move_to_deck: POCState.joggingToDeck,
    },
    POCState.joggingToDeck: {
        CalibrationCommand.jog: POCState.joggingToDeck,
        CalibrationCommand.save_offset: POCState.joggingToDeck,
        CalibrationCommand.move_to_point_one: POCState.savingPointOne,
        CalibrationCommand.invalidate_last_action: POCState.preparingPipette,
    },
    POCState.savingPointOne: {
        CalibrationCommand.jog: POCState.savingPointOne,
        CalibrationCommand.save_offset: POCState.calibrationComplete,
        CalibrationCommand.invalidate_last_action: POCState.preparingPipette,
    },
    POCState.calibrationComplete: {
        CalibrationCommand.move_to_tip_rack: POCState.calibrationComplete,
    },
    POCState.WILDCARD: {CalibrationCommand.exit: POCState.sessionExited},
}

PIP_OFFSET_WITH_TL_TRANSITIONS: PipetteOffsetWithTLTransitions = {
    POWTState.sessionStarted: {
        CalibrationCommand.load_labware: POWTState.labwareLoaded
    },
    POWTState.labwareLoaded: {
        CalibrationCommand.move_to_reference_point: POWTState.measuringNozzleOffset
    },
    POWTState.measuringNozzleOffset: {
        CalibrationCommand.save_offset: POWTState.measuringNozzleOffset,
        CalibrationCommand.jog: POWTState.measuringNozzleOffset,
        CalibrationCommand.move_to_tip_rack: POWTState.preparingPipette,
        CalibrationCommand.invalidate_last_action: POWTState.measuringNozzleOffset,
    },
    POWTState.preparingPipette: {
        CalibrationCommand.jog: POWTState.preparingPipette,
        CalibrationCommand.pick_up_tip: POWTState.inspectingTip,
        CalibrationCommand.invalidate_last_action: POWTState.preparingPipette,
    },
    POWTState.inspectingTip: {
        CalibrationCommand.invalidate_tip: POWTState.preparingPipette,
        CalibrationCommand.move_to_reference_point: POWTState.measuringTipOffset,
    },
    POWTState.measuringTipOffset: {
        CalibrationCommand.jog: POWTState.measuringTipOffset,
        CalibrationCommand.save_offset: POWTState.tipLengthComplete,
        CalibrationCommand.invalidate_last_action: POWTState.preparingPipette,
    },
    POWTState.tipLengthComplete: {
        CalibrationCommand.set_has_calibration_block: POWTState.tipLengthComplete,
        CalibrationCommand.move_to_deck: POWTState.joggingToDeck,
    },
    POWTState.joggingToDeck: {
        CalibrationCommand.jog: POWTState.joggingToDeck,
        CalibrationCommand.save_offset: POWTState.joggingToDeck,
        CalibrationCommand.move_to_point_one: POWTState.savingPointOne,
        CalibrationCommand.invalidate_last_action: POWTState.preparingPipette,
    },
    POWTState.savingPointOne: {
        CalibrationCommand.jog: POWTState.savingPointOne,
        CalibrationCommand.save_offset: POWTState.calibrationComplete,
        CalibrationCommand.invalidate_last_action: POWTState.preparingPipette,
    },
    POWTState.calibrationComplete: {
        CalibrationCommand.move_to_tip_rack: POWTState.calibrationComplete,
    },
    POWTState.WILDCARD: {CalibrationCommand.exit: POWTState.sessionExited},
}


class PipetteOffsetCalibrationStateMachine:
    def __init__(self) -> None:
        self._state_machine = SimpleStateMachine(
            states=set(s for s in POCState), transitions=PIP_OFFSET_CAL_TRANSITIONS
        )
        self._state = POCState
        self._current_state = POCState.sessionStarted

    @property
    def state(self) -> Type[POCState]:
        return self._state

    @property
    def current_state(self) -> POCState:
        return self._current_state

    def set_state(self, state: POCState) -> None:
        self._current_state = state

    def get_next_state(
        self, from_state: POCState, command: CommandDefinition
    ) -> POCState:
        next_state = self._state_machine.get_next_state(from_state, command)
        if next_state:
            return next_state
        else:
            raise StateTransitionError(command, from_state)


class PipetteOffsetWithTipLengthStateMachine:
    def __init__(self) -> None:
        self._state_machine = SimpleStateMachine(
            states=set(s for s in POWTState),
            transitions=PIP_OFFSET_WITH_TL_TRANSITIONS,
        )
        self._state = POWTState
        self._current_state = POWTState.sessionStarted

    @property
    def state(self) -> Type[POWTState]:
        return self._state

    @property
    def current_state(self) -> POWTState:
        return self._current_state

    def set_state(self, state: POWTState) -> None:
        self._current_state = state

    def get_next_state(
        self, from_state: POWTState, command: CommandDefinition
    ) -> POWTState:
        next_state = self._state_machine.get_next_state(from_state, command)
        if next_state:
            return next_state
        else:
            raise StateTransitionError(command, from_state)
