from typing import Dict

from robot_server.service.session.models.command_definitions import (
    CommandDefinition,
    CalibrationCommand,
    DeckCalibrationCommand,
    CheckCalibrationCommand,
)
from robot_server.robot.calibration.util import SimpleStateMachine, StateTransitionError

from .constants import CalibrationCheckState as State


CALIBRATION_CHECK_TRANSITIONS: Dict[State, Dict[CommandDefinition, State]] = {
    State.sessionStarted: {CalibrationCommand.load_labware: State.labwareLoaded},
    State.labwareLoaded: {
        CalibrationCommand.move_to_reference_point: State.comparingNozzle
    },
    State.comparingNozzle: {
        CalibrationCommand.jog: State.comparingNozzle,
        CalibrationCommand.move_to_tip_rack: State.preparingPipette,
        CalibrationCommand.invalidate_last_action: State.comparingNozzle,
    },
    State.preparingPipette: {
        CalibrationCommand.jog: State.preparingPipette,
        CalibrationCommand.pick_up_tip: State.inspectingTip,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.inspectingTip: {
        CalibrationCommand.invalidate_tip: State.preparingPipette,
        CalibrationCommand.move_to_reference_point: State.comparingTip,
    },
    State.comparingTip: {
        CheckCalibrationCommand.compare_point: State.comparingTip,
        CalibrationCommand.jog: State.comparingTip,
        CalibrationCommand.move_to_deck: State.comparingHeight,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.comparingHeight: {
        CalibrationCommand.jog: State.comparingHeight,
        CheckCalibrationCommand.compare_point: State.comparingHeight,
        CalibrationCommand.move_to_point_one: State.comparingPointOne,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.comparingPointOne: {
        CalibrationCommand.jog: State.comparingPointOne,
        CheckCalibrationCommand.compare_point: State.comparingPointOne,
        DeckCalibrationCommand.move_to_point_two: State.comparingPointTwo,
        CalibrationCommand.move_to_tip_rack: State.returningTip,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.comparingPointTwo: {
        CalibrationCommand.jog: State.comparingPointTwo,
        CheckCalibrationCommand.compare_point: State.comparingPointTwo,
        DeckCalibrationCommand.move_to_point_three: State.comparingPointThree,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.comparingPointThree: {
        CalibrationCommand.jog: State.comparingPointThree,
        CheckCalibrationCommand.compare_point: State.comparingPointThree,
        CalibrationCommand.move_to_tip_rack: State.returningTip,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.returningTip: {
        CheckCalibrationCommand.return_tip: State.returningTip,
        CheckCalibrationCommand.transition: State.resultsSummary,
        CheckCalibrationCommand.switch_pipette: State.labwareLoaded,
    },
    State.WILDCARD: {CalibrationCommand.exit: State.sessionExited},
}


class CalibrationCheckStateMachine:
    def __init__(self) -> None:
        self._state_machine = SimpleStateMachine(
            states=set(s for s in State), transitions=CALIBRATION_CHECK_TRANSITIONS
        )

    def get_next_state(self, from_state: State, command: CommandDefinition) -> State:
        next_state = self._state_machine.get_next_state(from_state, command)
        if next_state:
            return next_state
        else:
            raise StateTransitionError(command, from_state)
