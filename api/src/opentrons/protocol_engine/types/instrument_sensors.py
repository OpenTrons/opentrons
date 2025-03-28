"""Protocol engine types involving instrument sensors."""
from enum import Enum

from opentrons.hardware_control.types import (
    TipStateType as HwTipStateType,
    InstrumentProbeType,
)


class InstrumentSensorId(str, Enum):
    """Primary and secondary sensor ids."""

    PRIMARY = "primary"
    SECONDARY = "secondary"
    BOTH = "both"

    def to_instrument_probe_type(self) -> InstrumentProbeType:
        """Convert to InstrumentProbeType."""
        return {
            InstrumentSensorId.PRIMARY: InstrumentProbeType.PRIMARY,
            InstrumentSensorId.SECONDARY: InstrumentProbeType.SECONDARY,
            InstrumentSensorId.BOTH: InstrumentProbeType.BOTH,
        }[self]


class TipPresenceStatus(str, Enum):
    """Tip presence status reported by a pipette."""

    PRESENT = "present"
    ABSENT = "absent"
    UNKNOWN = "unknown"

    def to_hw_state(self) -> HwTipStateType:
        """Convert to hardware tip state."""
        assert self != TipPresenceStatus.UNKNOWN
        return {
            TipPresenceStatus.PRESENT: HwTipStateType.PRESENT,
            TipPresenceStatus.ABSENT: HwTipStateType.ABSENT,
        }[self]

    @classmethod
    def from_hw_state(cls, state: HwTipStateType) -> "TipPresenceStatus":
        """Convert from hardware tip state."""
        return {
            HwTipStateType.PRESENT: TipPresenceStatus.PRESENT,
            HwTipStateType.ABSENT: TipPresenceStatus.ABSENT,
        }[state]
