from typing import Dict
from robot_server.service.session.models.command_definitions import (
    CommandDefinition,
    CalibrationCommand,
)
from robot_server.robot.calibration.util import SimpleStateMachine, StateTransitionError
from robot_server.robot.calibration.tip_length.constants import (
    TipCalibrationState as State,
)


TIP_LENGTH_TRANSITIONS: Dict[State, Dict[CommandDefinition, State]] = {
    State.sessionStarted: {CalibrationCommand.load_labware: State.labwareLoaded},
    State.labwareLoaded: {
        CalibrationCommand.move_to_reference_point: State.measuringNozzleOffset
    },
    State.measuringNozzleOffset: {
        CalibrationCommand.save_offset: State.measuringNozzleOffset,
        CalibrationCommand.jog: State.measuringNozzleOffset,
        CalibrationCommand.move_to_tip_rack: State.preparingPipette,
        CalibrationCommand.invalidate_last_action: State.measuringNozzleOffset,
    },
    State.preparingPipette: {
        CalibrationCommand.jog: State.preparingPipette,
        CalibrationCommand.pick_up_tip: State.inspectingTip,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.inspectingTip: {
        CalibrationCommand.invalidate_tip: State.preparingPipette,
        CalibrationCommand.move_to_reference_point: State.measuringTipOffset,
    },
    State.measuringTipOffset: {
        CalibrationCommand.save_offset: State.measuringTipOffset,
        CalibrationCommand.jog: State.measuringTipOffset,
        CalibrationCommand.move_to_tip_rack: State.calibrationComplete,
        CalibrationCommand.invalidate_last_action: State.preparingPipette,
    },
    State.WILDCARD: {CalibrationCommand.exit: State.sessionExited},
}


class TipCalibrationStateMachine:
    def __init__(self) -> None:
        self._state_machine = SimpleStateMachine(
            states=set(s for s in State), transitions=TIP_LENGTH_TRANSITIONS
        )

    def get_next_state(self, from_state: State, command: CommandDefinition) -> State:
        next_state = self._state_machine.get_next_state(from_state, command)
        if next_state:
            return next_state
        else:
            raise StateTransitionError(command, from_state)
