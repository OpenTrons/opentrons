"""
Command type definitions.

Definitions should be grouped into thematic namespaces.
"""
import typing
from enum import Enum
from typing_extensions import Self


class CommandDefinition(str, Enum):
    _localname: str

    """The base of command definition enumerations."""

    def __new__(cls, value: str) -> Self:
        """Create a string enum."""
        # https://docs.python.org/3/library/enum.html#when-to-use-new-vs-init
        namespace = cls.namespace()
        full_name = f"{namespace}.{value}" if namespace else value
        obj = str.__new__(cls, full_name)
        obj._value_ = full_name
        obj._localname = value
        return obj

    @staticmethod
    def namespace() -> str | None:
        """
        Override to create a namespace for the member definitions. The
         namespace will be used to make the value of the enum. It will
         be "{namespace}.{value}"
        """
        return None

    @property
    def localname(self) -> str:
        """Get the name of the command without the namespace"""
        return self._localname


class RobotCommand(CommandDefinition):
    """Robot commands"""

    home_all_motors = "homeAllMotors"
    home_pipette = "homePipette"
    toggle_lights = "toggleLights"

    @staticmethod
    def namespace():
        return "robot"


class ProtocolCommand(CommandDefinition):
    """Protocol commands"""

    start_run = "startRun"
    start_simulate = "startSimulate"
    cancel = "cancel"
    pause = "pause"
    resume = "resume"

    @staticmethod
    def namespace():
        return "protocol"


class EquipmentCommand(CommandDefinition):
    load_labware = "loadLabware"
    load_pipette = "loadPipette"

    @staticmethod
    def namespace():
        return "equipment"


class PipetteCommand(CommandDefinition):
    aspirate = "aspirate"
    dispense = "dispense"
    drop_tip = "dropTip"
    pick_up_tip = "pickUpTip"

    @staticmethod
    def namespace():
        return "pipette"


class CalibrationCommand(CommandDefinition):
    """Shared Between Calibration Flows"""

    load_labware = "loadLabware"
    jog = "jog"
    set_has_calibration_block = "setHasCalibrationBlock"
    move_to_tip_rack = "moveToTipRack"
    move_to_point_one = "moveToPointOne"
    move_to_deck = "moveToDeck"
    move_to_reference_point = "moveToReferencePoint"
    pick_up_tip = "pickUpTip"
    confirm_tip_attached = "confirmTip"
    invalidate_tip = "invalidateTip"
    save_offset = "saveOffset"
    exit = "exitSession"
    invalidate_last_action = "invalidateLastAction"

    @staticmethod
    def namespace():
        return "calibration"


class DeckCalibrationCommand(CommandDefinition):
    """Deck Calibration Specific"""

    move_to_point_two = "moveToPointTwo"
    move_to_point_three = "moveToPointThree"

    @staticmethod
    def namespace():
        return "calibration.deck"


class CheckCalibrationCommand(CommandDefinition):
    """Check Calibration Health Specific"""

    compare_point = "comparePoint"
    switch_pipette = "switchPipette"
    return_tip = "returnTip"
    transition = "transition"

    @staticmethod
    def namespace():
        return "calibration.check"


CommandDefinitionType = typing.Union[
    RobotCommand,
    CalibrationCommand,
    CheckCalibrationCommand,
    DeckCalibrationCommand,
    ProtocolCommand,
    PipetteCommand,
    EquipmentCommand,
]
"""A Union of all CommandDefinition enumerations accepted"""
