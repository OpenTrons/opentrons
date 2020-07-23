from typing import Dict
from robot_server.service.session.models import CommandDefinition, \
    TipLengthCalibrationCommand, CalibrationCommand
from robot_server.robot.calibration.tip_length.util import (
    SimpleStateMachine,
    TipCalibrationError as Error
)
from robot_server.robot.calibration.tip_length.constants import (
    TipCalibrationState as State,
)


TIP_LENGTH_TRANSITIONS: Dict[State, Dict[CommandDefinition, State]] = {
    State.sessionStarted: {
        CalibrationCommand.load_labware: State.labwareLoaded
    },
    State.labwareLoaded: {
        TipLengthCalibrationCommand.move_to_reference_point: State.measuringNozzleOffset  # noqa: e501
    },
    State.measuringNozzleOffset: {
        CalibrationCommand.save_offset: State.measuringNozzleOffset,
        CalibrationCommand.jog: State.measuringNozzleOffset,
        TipLengthCalibrationCommand.move_to_tip_rack: State.preparingPipette # noqa: e501
    },
    State.preparingPipette: {
        CalibrationCommand.jog: State.preparingPipette,
        CalibrationCommand.pick_up_tip: State.preparingPipette,
        CalibrationCommand.invalidate_tip: State.preparingPipette,
        TipLengthCalibrationCommand.move_to_reference_point: State.measuringTipOffset,  # noqa: e501
        TipLengthCalibrationCommand.move_to_tip_rack: State.preparingPipette # noqa: e501
    },
    State.measuringTipOffset: {
        CalibrationCommand.save_offset: State.measuringTipOffset,
        CalibrationCommand.jog: State.measuringTipOffset,
        TipLengthCalibrationCommand.move_to_tip_rack: State.calibrationComplete
    },
    State.WILDCARD: {
        CalibrationCommand.exit: State.sessionExited
    }
}


class TipCalibrationStateMachine:
    def __init__(self):
        self._state_machine = SimpleStateMachine(
            states=set(s for s in State),
            transitions=TIP_LENGTH_TRANSITIONS
        )

    def get_next_state(self, from_state: State, command: CommandDefinition):
        next_state = self._state_machine.get_next_state(from_state, command)
        if next_state:
            return next_state
        else:
            raise Error(f"Cannot call {command} command from {from_state}.")
