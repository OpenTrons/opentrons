"""Liquid Class."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class LiquidSettings:
    """Liquid Settings for both aspirate and dispense."""

    z_speed: Optional[float]  # mm/sec of mount during submerge/retract
    submerge_mm: Optional[float]  # millimeters below meniscus
    flow_rate: Optional[float]  # ul/sec
    delay: Optional[float]  # seconds
    retract_mm: Optional[float]  # millimeters above meniscus
    retract_delay: Optional[float]  # seconds to wait after retracting


@dataclass
class AspirateSettings(LiquidSettings):
    """Aspirate Settings."""

    air_gap: Optional[float]  # microliters


@dataclass
class DispenseSettings(LiquidSettings):
    """Dispense Settings."""

    push_out: Optional[float]  # microliters
    break_off_flow_acceleration: Optional[float]  # ul/sec^2
    blow_out: Optional[bool]


@dataclass
class LiquidClassSettings:
    """Liquid Class Settings."""

    aspirate: AspirateSettings
    dispense: DispenseSettings


def interpolate(
    a: LiquidClassSettings, b: LiquidClassSettings, factor: float
) -> LiquidClassSettings:
    """Interpolate."""

    def _interp(lower: Optional[float], upper: Optional[float]) -> float:
        assert lower is not None and upper is not None, f"lower={upper}, upper={upper}"
        return lower + ((upper - lower) * factor)

    return LiquidClassSettings(
        aspirate=AspirateSettings(
            z_speed=_interp(a.aspirate.z_speed, b.aspirate.z_speed),
            submerge_mm=_interp(a.aspirate.submerge_mm, b.aspirate.submerge_mm),
            flow_rate=_interp(a.aspirate.flow_rate, b.aspirate.flow_rate),
            delay=_interp(a.aspirate.delay, b.aspirate.delay),
            retract_mm=_interp(a.aspirate.retract_mm, b.aspirate.retract_mm),
            air_gap=_interp(a.aspirate.air_gap, b.aspirate.air_gap),
            retract_delay=_interp(a.aspirate.retract_delay, b.aspirate.retract_delay),
        ),
        dispense=DispenseSettings(
            z_speed=_interp(a.dispense.z_speed, b.dispense.z_speed),
            submerge_mm=_interp(a.dispense.submerge_mm, b.dispense.submerge_mm),
            flow_rate=_interp(a.dispense.flow_rate, b.dispense.flow_rate),
            break_off_flow_acceleration=_interp(
                a.dispense.break_off_flow_acceleration,
                b.dispense.break_off_flow_acceleration,
            ),
            delay=_interp(a.dispense.delay, b.dispense.delay),
            retract_mm=_interp(a.dispense.retract_mm, b.dispense.retract_mm),
            push_out=_interp(a.dispense.push_out, b.dispense.push_out),
            blow_out=a.dispense.blow_out or b.dispense.blow_out,
            retract_delay=_interp(a.dispense.retract_delay, b.dispense.retract_delay),
        ),
    )
