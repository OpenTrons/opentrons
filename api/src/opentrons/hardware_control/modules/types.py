from __future__ import annotations
from enum import Enum
from dataclasses import dataclass
from typing import (
    Dict,
    List,
    NamedTuple,
    Callable,
    Any,
    Tuple,
    Awaitable,
    Union,
    Optional,
    cast,
    TYPE_CHECKING,
    TypeGuard,
)
from typing_extensions import TypedDict
from pathlib import Path

from opentrons.drivers.flex_stacker.types import (
    LimitSwitchStatus,
    PlatformStatus,
    StackerAxis,
)
from opentrons.drivers.rpi_drivers.types import USBPort

if TYPE_CHECKING:
    from opentrons_shared_data.module.types import (
        ThermocyclerModuleType,
        MagneticModuleType,
        TemperatureModuleType,
        HeaterShakerModuleType,
        MagneticBlockType,
        AbsorbanceReaderType,
        FlexStackerModuleType,
    )


class ThermocyclerStepBase(TypedDict):
    temperature: float


class ThermocyclerStep(ThermocyclerStepBase, total=False):
    hold_time_seconds: float
    hold_time_minutes: float


class ThermocyclerCycle(TypedDict):
    steps: List[ThermocyclerStep]
    repetitions: int


UploadFunction = Callable[[str, str, Dict[str, Any]], Awaitable[Tuple[bool, str]]]


ModuleDisconnectedCallback = Optional[Callable[[str, str | None], None]]


class MagneticModuleData(TypedDict):
    engaged: bool
    height: float


class TemperatureModuleData(TypedDict):
    currentTemp: float
    targetTemp: float | None


class HeaterShakerData(TypedDict):
    temperatureStatus: str
    speedStatus: str
    labwareLatchStatus: str
    currentTemp: float
    targetTemp: float | None
    currentSpeed: int
    targetSpeed: int | None
    errorDetails: str | None


class ThermocyclerData(TypedDict):
    lid: str
    lidTarget: float | None
    lidTemp: float
    lidTempStatus: str
    currentTemp: float | None
    targetTemp: float | None
    holdTime: float | None
    rampRate: float | None
    currentCycleIndex: int | None
    totalCycleCount: int | None
    currentStepIndex: int | None
    totalStepCount: int | None


class AbsorbanceReaderData(TypedDict):
    uptime: int
    deviceStatus: str
    lidStatus: str
    platePresence: str
    measureMode: str
    sampleWavelengths: List[int]
    referenceWavelength: int


class FlexStackerData(TypedDict):
    latchState: str
    platformState: str
    hopperDoorState: str
    axisStateX: str
    axisStateZ: str
    errorDetails: str | None


ModuleData = Union[
    Dict[Any, Any],  # This allows an empty dict as module data
    MagneticModuleData,
    TemperatureModuleData,
    HeaterShakerData,
    ThermocyclerData,
    AbsorbanceReaderData,
    FlexStackerData,
]


class ModuleDataValidator:
    @classmethod
    def is_magnetic_module_data(
        cls, data: ModuleData | None
    ) -> TypeGuard[MagneticModuleData]:
        return data is not None and "engaged" in data.keys()

    @classmethod
    def is_temperature_module_data(
        cls, data: ModuleData | None
    ) -> TypeGuard[TemperatureModuleData]:
        return data is not None and "targetTemp" in data.keys()

    @classmethod
    def is_heater_shaker_data(
        cls, data: ModuleData | None
    ) -> TypeGuard[HeaterShakerData]:
        return data is not None and "labwareLatchStatus" in data.keys()

    @classmethod
    def is_thermocycler_data(
        cls, data: ModuleData | None
    ) -> TypeGuard[ThermocyclerData]:
        return data is not None and "lid" in data.keys()

    @classmethod
    def is_absorbance_reader_data(
        cls, data: ModuleData | None
    ) -> TypeGuard[AbsorbanceReaderData]:
        return data is not None and "uptime" in data.keys()

    @classmethod
    def is_flex_stacker_data(
        cls, data: ModuleData | None
    ) -> TypeGuard[FlexStackerData]:
        return data is not None and "platformState" in data.keys()


class LiveData(TypedDict):
    status: str
    data: ModuleData | None


class ModuleType(str, Enum):
    THERMOCYCLER: ThermocyclerModuleType = "thermocyclerModuleType"
    TEMPERATURE: TemperatureModuleType = "temperatureModuleType"
    MAGNETIC: MagneticModuleType = "magneticModuleType"
    HEATER_SHAKER: HeaterShakerModuleType = "heaterShakerModuleType"
    MAGNETIC_BLOCK: MagneticBlockType = "magneticBlockType"
    ABSORBANCE_READER: AbsorbanceReaderType = "absorbanceReaderType"
    FLEX_STACKER: FlexStackerModuleType = "flexStackerModuleType"

    @classmethod
    def from_model(cls, model: ModuleModel) -> ModuleType:
        if isinstance(model, MagneticModuleModel):
            return cls.MAGNETIC
        if isinstance(model, TemperatureModuleModel):
            return cls.TEMPERATURE
        if isinstance(model, ThermocyclerModuleModel):
            return cls.THERMOCYCLER
        if isinstance(model, HeaterShakerModuleModel):
            return cls.HEATER_SHAKER
        if isinstance(model, MagneticBlockModel):
            return cls.MAGNETIC_BLOCK
        if isinstance(model, AbsorbanceReaderModel):
            return cls.ABSORBANCE_READER
        if isinstance(model, FlexStackerModuleModel):
            return cls.FLEX_STACKER

    @classmethod
    def to_module_fixture_id(cls, module_type: ModuleType) -> str:
        if module_type == ModuleType.THERMOCYCLER:
            # Thermocyclers are "loaded" in B1 only
            return "thermocyclerModuleV2Front"
        if module_type == ModuleType.TEMPERATURE:
            return "temperatureModuleV2"
        if module_type == ModuleType.HEATER_SHAKER:
            return "heaterShakerModuleV1"
        if module_type == ModuleType.MAGNETIC_BLOCK:
            return "magneticBlockV1"
        if module_type == ModuleType.ABSORBANCE_READER:
            return "absorbanceReaderV1"
        if module_type == ModuleType.FLEX_STACKER:
            return "flexStackerModuleV1"
        else:
            raise ValueError(
                f"Module Type {module_type} does not have a related fixture ID."
            )


class MagneticModuleModel(str, Enum):
    MAGNETIC_V1: str = "magneticModuleV1"
    MAGNETIC_V2: str = "magneticModuleV2"


class TemperatureModuleModel(str, Enum):
    TEMPERATURE_V1: str = "temperatureModuleV1"
    TEMPERATURE_V2: str = "temperatureModuleV2"


class ThermocyclerModuleModel(str, Enum):
    THERMOCYCLER_V1: str = "thermocyclerModuleV1"
    THERMOCYCLER_V2: str = "thermocyclerModuleV2"


class HeaterShakerModuleModel(str, Enum):
    HEATER_SHAKER_V1: str = "heaterShakerModuleV1"


class MagneticBlockModel(str, Enum):
    MAGNETIC_BLOCK_V1: str = "magneticBlockV1"


class AbsorbanceReaderModel(str, Enum):
    ABSORBANCE_READER_V1: str = "absorbanceReaderV1"


class FlexStackerModuleModel(str, Enum):
    FLEX_STACKER_V1: str = "flexStackerModuleV1"


def module_model_from_string(model_string: str) -> ModuleModel:
    for model_enum in {
        MagneticModuleModel,
        TemperatureModuleModel,
        ThermocyclerModuleModel,
        HeaterShakerModuleModel,
        MagneticBlockModel,
        AbsorbanceReaderModel,
        FlexStackerModuleModel,
    }:
        try:
            return cast(ModuleModel, model_enum(model_string))
        except ValueError:
            pass
    raise ValueError(f"No such module model {model_string}")


@dataclass(kw_only=True)
class ModuleAtPort:
    port: str
    name: str
    serial: Optional[str] = None
    usb_port: USBPort = USBPort(name="", port_number=0)


@dataclass(kw_only=True)
class SimulatingModule:
    serial_number: str
    model: Optional[str]


@dataclass(kw_only=True)
class SimulatingModuleAtPort(ModuleAtPort, SimulatingModule):
    pass


class BundledFirmware(NamedTuple):
    """Represents a versioned firmware file, generally bundled into the fs"""

    version: str
    path: Path

    def __repr__(self) -> str:
        return f"<BundledFirmware {self.version}, path={self.path}>"


class ModuleInfo(NamedTuple):
    model: str  # A module model such as "magneticModuleV2"
    fw_version: str  # The version of the firmware
    hw_revision: str  # the revision of the hardware
    serial: str  # the serial number


# TODO(mc, 2022-01-18): replace with enum
ModuleModel = Union[
    MagneticModuleModel,
    TemperatureModuleModel,
    ThermocyclerModuleModel,
    HeaterShakerModuleModel,
    MagneticBlockModel,
    AbsorbanceReaderModel,
    FlexStackerModuleModel,
]


class MagneticStatus(str, Enum):
    ENGAGED = "engaged"
    DISENGAGED = "disengaged"


class TemperatureStatus(str, Enum):
    HOLDING = "holding at target"
    COOLING = "cooling"
    HEATING = "heating"
    IDLE = "idle"
    ERROR = "error"


class SpeedStatus(str, Enum):
    HOLDING = "holding at target"
    ACCELERATING = "speeding up"
    DECELERATING = "slowing down"
    IDLE = "idle"
    ERROR = "error"


class HeaterShakerStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    ERROR = "error"


class AbsorbanceReaderStatus(str, Enum):
    IDLE = "idle"
    MEASURING = "measuring"
    ERROR = "error"


class LidStatus(str, Enum):
    ON = "on"
    OFF = "off"
    UNKNOWN = "unknown"
    ERROR = "error"


class FlexStackerStatus(str, Enum):
    IDLE = "idle"
    DISPENSING = "dispensing"
    STORING = "storing"
    ERROR = "error"


class PlatformState(str, Enum):
    UNKNOWN = "unknown"
    EXTENDED = "extended"
    RETRACTED = "retracted"

    @classmethod
    def from_status(cls, status: PlatformStatus) -> "PlatformState":
        """Get the state from the platform status."""
        if status.E and not status.R:
            return cls.EXTENDED
        if status.R and not status.E:
            return cls.RETRACTED
        return cls.UNKNOWN


class StackerAxisState(str, Enum):
    UNKNOWN = "unknown"
    EXTENDED = "extended"
    RETRACTED = "retracted"

    @classmethod
    def from_status(
        cls, status: LimitSwitchStatus, axis: StackerAxis
    ) -> "StackerAxisState":
        """Get the axis state from the limit switch status."""
        match axis:
            case StackerAxis.X:
                if status.XE and not status.XR:
                    return cls.EXTENDED
                if status.XR and not status.XE:
                    return cls.RETRACTED
            case StackerAxis.Z:
                if status.ZE and not status.ZR:
                    return cls.EXTENDED
                if status.ZR and not status.ZE:
                    return cls.RETRACTED
            case StackerAxis.L:
                return cls.EXTENDED if status.LR else cls.RETRACTED
        return cls.UNKNOWN


class LatchState(str, Enum):
    CLOSED = "closed"
    OPENED = "opened"

    @classmethod
    def from_state(cls, state: StackerAxisState) -> "LatchState":
        """Get the latch state from the axis state."""
        return cls.CLOSED if state == StackerAxisState.EXTENDED else cls.OPENED


class HopperDoorState(str, Enum):
    CLOSED = "closed"
    OPENED = "opened"

    @classmethod
    def from_state(cls, state: bool) -> "HopperDoorState":
        """Get the hopper door state from the door state boolean."""
        return cls.CLOSED if state else cls.OPENED
