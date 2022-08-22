"""Custom payload fields."""
from __future__ import annotations

from typing import Iterable, List, Iterator

import binascii
import enum

from opentrons_hardware.firmware_bindings import utils, ErrorCode
from opentrons_hardware.firmware_bindings.constants import (
    ToolType,
    SensorType,
    SensorId,
    PipetteName,
    SensorOutputBinding,
    SensorThresholdMode,
    PipetteTipActionType,
)


class FirmwareShortSHADataField(utils.BinaryFieldBase[bytes]):
    """The short hash in a device info.

    This is sized to hold the default size of an abbreviated Git hash,
    what you get when you do git rev-parse --short HEAD. If we ever
    need to increase the size of that abbreviated ID, we'll need to
    increase this too.
    """

    NUM_BYTES = 7
    FORMAT = f"{NUM_BYTES}s"


class VersionFlags(enum.Enum):
    """Flags in the version field."""

    BUILD_IS_EXACT_COMMIT = 0x1
    BUILD_IS_EXACT_VERSION = 0x2
    BUILD_IS_FROM_CI = 0x4


class VersionFlagsField(utils.UInt32Field):
    """A field for version flags."""

    def __repr__(self) -> str:
        """Print version flags."""
        flags_list = [
            flag.name for flag in VersionFlags if bool(self.value & flag.value)
        ]
        return f"{self.__class__.__name__}(value={','.join(flags_list)})"


class TaskNameDataField(utils.BinaryFieldBase[bytes]):
    """The name field of TaskInfoResponsePayload."""

    NUM_BYTES = 12
    FORMAT = f"{NUM_BYTES}s"


class ToolField(utils.UInt8Field):
    """A tool field."""

    def __repr__(self) -> str:
        """Print out a tool string."""
        try:
            tool_val = ToolType(self.value).name
        except ValueError:
            tool_val = str(self.value)
        return f"{self.__class__.__name__}(value={tool_val})"


class FirmwareUpdateDataField(utils.BinaryFieldBase[bytes]):
    """The data field of FirmwareUpdateData."""

    NUM_BYTES = 56
    FORMAT = f"{NUM_BYTES}s"


class ErrorCodeField(utils.UInt16Field):
    """Error code field."""

    def __repr__(self) -> str:
        """Print error code."""
        try:
            error = ErrorCode(self.value).name
        except ValueError:
            error = str(self.value)
        return f"{self.__class__.__name__}(value={error})"


class SensorTypeField(utils.UInt8Field):
    """sensor type."""

    def __repr__(self) -> str:
        """Print sensor."""
        try:
            sensor_val = SensorType(self.value).name
        except ValueError:
            sensor_val = str(self.value)
        return f"{self.__class__.__name__}(value={sensor_val})"


class SensorIdField(utils.UInt8Field):
    """sensor id."""

    def __repr__(self) -> str:
        """Print sensor id."""
        try:
            sensor_id = SensorId(self.value).name
        except ValueError:
            sensor_id = str(self.value)
        return f"{self.__class__.__name__}(value={sensor_id})"


class PipetteNameField(utils.UInt16Field):
    """high-level pipette name field."""

    def __repr__(self) -> str:
        """Print pipette."""
        try:
            pipette_val = PipetteName(self.value).name
        except ValueError:
            pipette_val = str(self.value)
        return f"{self.__class__.__name__}(value={pipette_val})"


class SerialField(utils.BinaryFieldBase[bytes]):
    """The full serial number of a pipette or gripper."""

    NUM_BYTES = 20
    FORMAT = f"{NUM_BYTES}s"

    @classmethod
    def from_string(cls, t: str) -> SerialField:
        """Create from a string."""
        return cls(binascii.unhexlify(t)[: cls.NUM_BYTES])


class SerialDataCodeField(utils.BinaryFieldBase[bytes]):
    """The serial number Datacode of a pipette or gripper.

    This is sized to handle only the datecode part of the serial
    number; the full field can be synthesized from this, the
    model number, and the name.
    """

    NUM_BYTES = 12
    FORMAT = f"{NUM_BYTES}s"

    @classmethod
    def from_string(cls, t: str) -> SerialDataCodeField:
        """Create from a string."""
        return cls(binascii.unhexlify(t)[: cls.NUM_BYTES])


class SensorThresholdModeField(utils.UInt8Field):
    """sensor threshold mode."""

    def __repr__(self) -> str:
        """Print sensor."""
        try:
            sensor_val = SensorThresholdMode(self.value).name
        except ValueError:
            sensor_val = str(self.value)
        return f"{self.__class__.__name__}(value={sensor_val})"


class SensorOutputBindingField(utils.UInt8Field):
    """sensor type."""

    @classmethod
    def from_flags(
        cls, flags: Iterable[SensorOutputBinding]
    ) -> "SensorOutputBindingField":
        """Build a binding with a set of flags."""
        backing = 0
        for flag in flags:
            backing |= flag.value
        return cls.build(backing)

    def to_flags(self) -> List[SensorOutputBinding]:
        """Get the list of flags in the binding."""

        def _flags() -> Iterator[SensorOutputBinding]:
            for flag in SensorOutputBinding:
                if flag == SensorOutputBinding.none:
                    continue
                if bool(flag.value & self.value):
                    yield flag

        return list(_flags())

    def __repr__(self) -> str:
        """Print version flags."""
        flags_list = [
            flag.name for flag in SensorOutputBinding if bool(self.value & flag.value)
        ]
        return f"{self.__class__.__name__}(value={','.join(flags_list)})"


class EepromDataField(utils.BinaryFieldBase[bytes]):
    """The data portion of an eeprom read/write message."""

    NUM_BYTES = 8
    FORMAT = f"{NUM_BYTES}s"

    @classmethod
    def from_string(cls, t: str) -> EepromDataField:
        """Create from a string."""
        return cls(binascii.unhexlify(t)[: cls.NUM_BYTES])


class PipetteTipActionTypeField(utils.UInt8Field):
    """pipette tip action type."""

    def __repr__(self) -> str:
        """Print tip action."""
        try:
            action_type = PipetteTipActionType(self.value).name
        except ValueError:
            action_type = str(self.value)
        return f"{self.__class__.__name__}(value={action_type})"
