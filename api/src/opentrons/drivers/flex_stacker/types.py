from enum import Enum
from dataclasses import dataclass, fields
from typing import List, Dict, Optional

from opentrons.drivers.command_builder import CommandBuilder


class GCODE(str, Enum):

    MOVE_TO = "G0"
    MOVE_TO_SWITCH = "G5"
    HOME_AXIS = "G28"
    STOP_MOTORS = "M0"
    ENABLE_MOTORS = "M17"
    GET_RESET_REASON = "M114"
    DEVICE_INFO = "M115"
    GET_LIMIT_SWITCH = "M119"
    GET_MOVE_PARAMS = "M120"
    GET_PLATFORM_SENSOR = "M121"
    GET_DOOR_SWITCH = "M122"
    GET_INSTALL_DETECTED = "M123"
    GET_STALLGUARD_THRESHOLD = "M911"
    GET_MOTOR_DRIVER_REGISTER = "M920"
    GET_TOF_SENSOR_STATUS = "M215"
    GET_TOF_DRIVER_REGISTER = "M222"
    GET_TOF_MEASUREMENT = "M226"
    ENABLE_TOF_SENSOR = "M224"
    MANAGE_TOF_MEASUREMENT = "M225"
    SET_LED = "M200"
    SET_SERIAL_NUMBER = "M996"
    SET_RUN_CURRENT = "M906"
    SET_IHOLD_CURRENT = "M907"
    SET_STALLGUARD = "M910"
    SET_MOTOR_DRIVER_REGISTER = "M921"
    SET_TOF_DRIVER_REGISTER = "M223"
    ENTER_BOOTLOADER = "dfu"

    def build_command(self) -> CommandBuilder:
        """Build command."""
        return CommandBuilder().add_gcode(self)


STACKER_VID = 0x483
STACKER_PID = 0xEF24
STACKER_FREQ = 115200


class HardwareRevision(Enum):
    """Hardware Revision."""

    NFF = "nff"
    EVT = "a1"
    DVT = "b1"


@dataclass
class StackerInfo:
    """Stacker Info."""

    fw: str
    hw: HardwareRevision
    sn: str
    rr: int = 0

    def to_dict(self) -> Dict[str, str]:
        """Build command."""
        return {
            "serial": self.sn,
            "version": self.fw,
            "model": self.hw.value,
            "reset_reason": str(self.rr),
        }


class StackerAxis(str, Enum):
    """Stacker Axis."""

    X = "X"
    Z = "Z"
    L = "L"


class TOFSensor(str, Enum):
    """Stacker TOF sensor."""

    X = "X"
    Z = "Z"


class LEDColor(Enum):
    """Stacker LED Color."""

    WHITE = 0
    RED = 1
    GREEN = 2
    BLUE = 3
    YELLOW = 4


class LEDPattern(Enum):
    """Stacker LED Pattern."""

    STATIC = 0
    FLASH = 1
    PULSE = 2
    CONFIRM = 3


class Direction(Enum):
    """Direction."""

    RETRACT = 0  # negative
    EXTEND = 1  # positive

    def __str__(self) -> str:
        """Convert to tag for clear logging."""
        return "negative" if self == Direction.RETRACT else "positive"

    def opposite(self) -> "Direction":
        """Get opposite direction."""
        return Direction.EXTEND if self == Direction.RETRACT else Direction.RETRACT

    def distance(self, distance: float) -> float:
        """Get signed distance, where retract direction is negative."""
        return distance * -1 if self == Direction.RETRACT else distance


class TOFSensorState(Enum):
    """TOF Sensor state."""

    DISABLED = 0
    INITIALIZING = 1
    IDLE = 2
    MEASURING = 3
    ERROR = 4


class TOFSensorMode(Enum):
    """The mode the sensor is in."""

    UNKNOWN = 0
    MEASURE = 0x03
    BOOTLOADER = 0x80


@dataclass
class LimitSwitchStatus:
    """Stacker Limit Switch Statuses."""

    XE: bool
    XR: bool
    ZE: bool
    ZR: bool
    LR: bool

    @classmethod
    def get_fields(cls) -> List[str]:
        """Get fields."""
        return [f.name for f in fields(cls)]

    def get(self, axis: StackerAxis, direction: Direction) -> bool:
        """Get limit switch status."""
        if axis == StackerAxis.X:
            return self.XE if direction == Direction.EXTEND else self.XR
        if axis == StackerAxis.Z:
            return self.ZE if direction == Direction.EXTEND else self.ZR
        if direction == Direction.EXTEND:
            raise ValueError("Latch does not have extent limit switch")
        return self.LR


@dataclass
class PlatformStatus:
    """Stacker Platform Statuses."""

    E: bool
    R: bool

    @classmethod
    def get_fields(cls) -> List[str]:
        """Get fields."""
        return [f.name for f in fields(cls)]

    def get(self, direction: Direction) -> bool:
        """Get platform status."""
        return self.E if direction == Direction.EXTEND else self.R

    def to_dict(self) -> Dict[str, bool]:
        """Dict of the data."""
        return {
            "extent": self.E,
            "retract": self.R,
        }


@dataclass
class TOFSensorStatus:
    """Stacker TOF sensor status."""

    sensor: TOFSensor
    state: TOFSensorState
    mode: TOFSensorMode
    ok: bool


@dataclass
class MoveParams:
    """Move Parameters."""

    axis: Optional[StackerAxis] = None
    max_speed: Optional[float] = None
    acceleration: Optional[float] = None
    max_speed_discont: Optional[float] = None
    current: Optional[float] = 0

    @classmethod
    def get_fields(cls) -> List[str]:
        """Get parsing fields."""
        return ["M", "V", "A", "D"]


@dataclass
class StallGuardParams:
    """StallGuard Parameters."""

    axis: StackerAxis
    enabled: bool
    threshold: int


class MoveResult(str, Enum):
    """The result of a move command."""

    NO_ERROR = "ok"
    STALL_ERROR = "stall"
    UNKNOWN_ERROR = "unknown"


class MeasurementKind(Enum):
    """The kind of measurement to request."""

    HISTOGRAM = 0


@dataclass
class TOFMeasurement:
    """The start measurement data."""

    sensor: TOFSensor
    kind: MeasurementKind
    cancelled: bool
    total_bytes: int


@dataclass
class TOFMeasurementFrame:
    """Stacker TOF measurement frame."""

    sensor: TOFSensor
    frame_id: int
    data: bytes


@dataclass
class TOFMeasurementResult:
    """Stacker TOF measurement result."""

    sensor: TOFSensor
    kind: MeasurementKind
    bins: Dict[int, List[int]]
