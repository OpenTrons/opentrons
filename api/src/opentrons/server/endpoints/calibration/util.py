import enum
from dataclasses import dataclass
from typing import (TypeVar, Generic, Type, Dict,
                    Optional, Callable, Set, Any)


class CalibrationCheckState(enum.Enum):
    sessionStarted = enum.auto()
    labwareLoaded = enum.auto()
    preparingPipette = enum.auto()
    checkingPointOne = enum.auto()
    checkingPointTwo = enum.auto()
    checkingPointThree = enum.auto()
    checkingHeight = enum.auto()
    cleaningUp = enum.auto()
    sessionExited = enum.auto()
    badCalibrationData = enum.auto()
    noPipettesAttached = enum.auto()


calibration_check_transitions = {

}
def leaveStateUnchanged(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return currentState

jog = leaveStateUnchanged
move = leaveStateUnchanged
pickUpTip = leaveStateUnchanged
dropTip = leaveStateUnchanged

def loadLabware(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.labwareLoaded

def preparePipette(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.preparingPipette

def checkPointOne(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.checkingPointOne

def checkPointTwo(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.checkingPointTwo

def checkPointThree(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.checkingPointThree

def checkHeight(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.checkingHeight

def cleanUp(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.cleaningUp

def exitSession(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.sessionExited

def invalidateTip(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.p

def rejectCalibration(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.badCalibratioData

def promptNoPipettesAttached(currentState: CalibrationCheckState) -> CalibrationCheckState:
    return CalibrationCheckState.noPipettesAttached



class CalibrationCheckVerbsForState:
    sessionStarted: {loadLabware}
    labwareLoaded = {preparePipette}
    preparingPipette = {jog, pickUpTip, checkPointOne}
    checkingPointOne = {jog, checkPointTwo}
    checkingPointTwo = {jog, checkPointThree}
    checkingPointThree = {jog, checkHeight}
    checkingHeight = {jog, cleanUp}
    cleaningUp = {dropTip, exitSession}
    badCalibrationData = {exitSession}
    noPipettesAttached = {exitSession}
    sessionExited = {}




check_normal_relationship_dict = {
    CalibrationCheckState.sessionStarted: CalibrationCheckState.labwareLoaded,
    CalibrationCheckState.labwareLoaded: CalibrationCheckState.pickingUpTip,
    CalibrationCheckState.pickingUpTip: CalibrationCheckState.checkingPointOne,
    CalibrationCheckState.checkingPointOne: CalibrationCheckState.checkingPointTwo,
    CalibrationCheckState.checkingPointTwo: CalibrationCheckState.checkingPointThree,
    CalibrationCheckState.checkingPointThree: CalibrationCheckState.checkingHeight,
    CalibrationCheckState.checkingHeight: CalibrationCheckState.droppingTip,
    CalibrationCheckState.droppingTip: CalibrationCheckState.sessionExited
}

exit = CalibrationCheckState.sessionExit
check_exit_relationship_dict = {
    CalibrationCheckState.badCalibrationData: exit,
    CalibrationCheckState.checkHeight: exit,
    CalibrationCheckState.noPipettesAttached: exit,
    CalibrationCheckState.dropTip: exit
}

nopips = CalibrationCheckState.noPipettesAttached
badcal = CalibrationCheckState.badCalibratioData
check_error_relationship_dict = {
    CalibrationCheckState.sessionStart: nopips,
    CalibrationCheckState.loadLabware: badcal,
    CalibrationCheckState.checkPointOne: badcal,
    CalibrationCheckState.checkPointTwo: badcal,
    CalibrationCheckState.checkPointThree: badcal,
    CalibrationCheckState.checkHeight: badcal,
    CalibrationCheckState.invalidateTip: CalibrationCheckState.pickUpTip
}

check_relationship_requires_move_dict = {
    CalibrationCheckState.moveToTipRack: CalibrationCheckState.move,
    CalibrationCheckState.checkPointOne: CalibrationCheckState.move,
    CalibrationCheckState.checkPointTwo: CalibrationCheckState.move,
    CalibrationCheckState.checkPointThree: CalibrationCheckState.move,
    CalibrationCheckState.checkHeight: CalibrationCheckState.move
}

StateEnumType = TypeVar('StateEnumType', bound=enum.Enum)
Relationship = Dict[StateEnumType, StateEnumType]


class State():
    def __init__(self,
                 name: str,
                 on_enter: Callable = None,
                 on_exit: Callable = None):
        self._name = name
        self._on_enter = on_enter
        self._on_exit = on_exit

    def enter(self) -> str:
        return self._on_enter()

    def exit(self) -> str:
        return self._on_exit()

    @property
    def name(self) -> str:
        return self._name

class Transition:
    trigger: str
    from_state_name: str
    to_state_name: str
    before: Callable = None
    after: Callable = None
    condition: Callable[Any, boolean] = None

    def execute(self, get_state_by_name, set_current_state):
        if not self.condition():
            return False
        self.before()
        get_state_by_name(self.from_state_name).exit()
        set_current_state(self.to_state_name)
        get_state_by_name(self.to_state_name).enter()
        self.after()
        return True

class StateMachineError(Exception):
    def __init__(self, msg: str) -> None:
        self.msg = msg or ''
        super().__init__()

    def __repr__(self):
        return f'<StateMachineError: {self.msg}'

    def __str__(self):
        return f'StateMachineError: {self.msg}'

class NewStateMachine():
    def __init__(self,
                 states: Set[State],
                 transitions: Set[Transition],
                 initial_state_name: str):
        self._states = states
        self._current_state = None
        self._set_current_state(initial_state_name)
        self._events = {}
        self._transitions = {}
        for t in transitions:
            self.add_transition(**t)

    def _get_state_by_name(self, name: str) -> State:
        return next((state for state in self._states
                     if state.name == name), None)

    def _set_current_state(self, state_name: str):
        goal_state = self._find_state_by_name(state_name)
        assert goal_state, f"state {state_name} doesn't exist in machine"
        self._current_state = stat
        return None

    def _dispatch_trigger(self, triggger, *args, **kwargs):
        if self._current_state.name not in self._events[trigger]:
            raise StateMachineError(f'cannot trigger event {trigger}' \
                                    f' from state {self._current_state.name}')
        try:
            for transition in self._events[trigger][self._current_state.name]:
                if transition.execute(self._get_state_by_name, self._set_current_state,
                                      *args, **kwargs):
                    break
        except Exception:
            raise StateMachineError(f'event {trigger} failed to'
                                    f'transition from {self._current_state.name}')

    def add_state(self, state: State):
        self._states.add(state)

    def add_transition(self,
                       trigger: str,
                       from_state: State,
                       to_state: State,
                       conditions: Callable[Any, boolean] = None):
        assert self._find_state_by_name(from_state),\
            f"state {from_state} doesn't exist in machine"
        assert self._find_state_by_name(to_state),\
            f"state {to_state} doesn't exist in machine"
        if trigger not in self._events:
            setattr(self, trigger,
                    partial(self._dispatch_trigger(trigger)))
        self._events[trigger] = {**self._events[trigger],
                                 transition.from_state: [
                                        *self._events[trigger][from_state],
                                        Transition(from_state,
                                                   to_state,
                                                   conditions)
                                        ]
                                }

class StateMachine(Generic[StateEnumType]):
    """
    A class for building a mealy state machine pattern based on
    steps provided to this class.
    """
    def __init__(
            self, states: Type[StateEnumType], rel: Relationship,
            exit: Relationship, error: Relationship,
            first_state: StateEnumType, move: Relationship = None):
        self._states = states
        self._relationship = rel
        self._exit_relationship = exit
        self._error_relationship = error
        self._move_relationship = move if move else {}
        self._current_state = first_state

    def get_state(self, state_name: str) -> StateEnumType:
        return getattr(self._states, state_name)

    def update_state(
            self,
            state_name: Optional[StateEnumType] = None, next: bool = False):
        if state_name and next:
            self._current_state = self._iterate_thru_relationships(state_name)
        elif state_name:
            self._current_state = state_name
        else:
            self._current_state = self.next_state

    def _iterate_thru_relationships(
            self, state_name: StateEnumType) -> StateEnumType:
        rel_list = [
            self._relationship,
            self._exit_relationship,
            self._error_relationship]
        for relationship in rel_list:
            next_state = self._find_next(state_name, relationship)
            if next_state != self.current_state:
                return next_state
        return self.current_state

    def _find_next(
            self, input: StateEnumType,
            relationship_enum: Relationship) -> StateEnumType:
        """
        Next state will either check the input or the current state to see
        if it can find a relationship in any of the enum classes provided.
        """
        output = relationship_enum.get(input)
        if output:
            return self.get_state(output.name)
        else:
            return self.get_state(input.name)

    @property
    def current_state(self) -> StateEnumType:
        return self._current_state

    @property
    def next_state(self) -> StateEnumType:
        """
        The next state based on current state only. For session status msg.
        """
        return self._iterate_thru_relationships(self.current_state)

    def requires_move(self, state: StateEnumType) -> bool:
        return bool(self._move_relationship.get(state))


class CalibrationCheckMachine(StateMachine[CalibrationCheckState]):
    def __init__(self) -> None:
        super().__init__(CalibrationCheckState,
                         check_normal_relationship_dict,
                         check_exit_relationship_dict,
                         check_error_relationship_dict,
                         CalibrationCheckState.sessionStart,
                         check_relationship_requires_move_dict)
