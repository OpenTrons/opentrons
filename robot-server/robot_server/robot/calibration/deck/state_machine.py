from typing import Dict

from robot_server.service.session.models.command_definitions import (
    CommandDefinition,
    CalibrationCommand,
    DeckCalibrationCommand as DeckCalCommand,
)
from robot_server.robot.calibration.util import SimpleStateMachine, StateTransitionError
from .constants import DeckCalibrationState as State


DECK_CALIBRATION_TRANSITIONS: Dict[State, Dict[CommandDefinition, State]] = {
    State.sessionStarted: {CalibrationCommand.load_labware: State.labwareLoaded},
    State.labwareLoaded: {CalibrationCommand.move_to_tip_rack: State.preparingPipette},
    State.preparingPipette: {
        CalibrationCommand.jog: State.preparingPipette,
        CalibrationCommand.pick_up_tip: State.inspectingTip,
        CalibrationCommand.move_to_tip_rack: State.preparingPipette,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.inspectingTip: {
        CalibrationCommand.invalidate_tip: State.preparingPipette,
        CalibrationCommand.move_to_deck: State.joggingToDeck,
    },
    State.joggingToDeck: {
        CalibrationCommand.jog: State.joggingToDeck,
        CalibrationCommand.save_offset: State.joggingToDeck,
        CalibrationCommand.move_to_point_one: State.savingPointOne,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.savingPointOne: {
        CalibrationCommand.jog: State.savingPointOne,
        CalibrationCommand.save_offset: State.savingPointOne,
        DeckCalCommand.move_to_point_two: State.savingPointTwo,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.savingPointTwo: {
        CalibrationCommand.jog: State.savingPointTwo,
        CalibrationCommand.save_offset: State.savingPointTwo,
        DeckCalCommand.move_to_point_three: State.savingPointThree,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.savingPointThree: {
        CalibrationCommand.jog: State.savingPointThree,
        CalibrationCommand.save_offset: State.savingPointThree,
        CalibrationCommand.move_to_tip_rack: State.calibrationComplete,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.WILDCARD: {CalibrationCommand.exit: State.sessionExited},
}


class DeckCalibrationStateMachine:
    def __init__(self) -> None:
        self._state_machine = SimpleStateMachine(
            states=set(s for s in State), transitions=DECK_CALIBRATION_TRANSITIONS
        )

    def get_next_state(self, from_state: State, command: CommandDefinition) -> State:
        next_state = self._state_machine.get_next_state(from_state, command)
        if next_state:
            return next_state
        else:
            raise StateTransitionError(command, from_state)
