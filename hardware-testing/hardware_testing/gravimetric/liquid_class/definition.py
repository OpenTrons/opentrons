"""Liquid Class."""
from dataclasses import dataclass


@dataclass
class LiquidSettings:
    """Liquid Settings for both aspirate and dispense."""

    z_submerge_depth: float  # millimeters below meniscus
    plunger_acceleration: float  # ul/sec/sec
    plunger_flow_rate: float  # ul/sec
    delay: float  # seconds
    z_retract_discontinuity: float  # mm/sec
    z_retract_height: float  # millimeters above meniscus


@dataclass
class AspirateSettings(LiquidSettings):
    """Aspirate Settings."""

    leading_air_gap: float  # microliters
    trailing_air_gap: float  # microliters


@dataclass
class DispenseSettings(LiquidSettings):
    """Dispense Settings."""

    blow_out_submerged: float  # microliters


@dataclass
class LiquidClassSettings:
    """Liquid Class Settings."""

    aspirate: AspirateSettings
    dispense: DispenseSettings


def interpolate(
    a: LiquidClassSettings, b: LiquidClassSettings, factor: float
) -> LiquidClassSettings:
    """Interpolate."""

    def _interp(lower: float, upper: float) -> float:
        return lower + ((upper - lower) * factor)

    return LiquidClassSettings(
        aspirate=AspirateSettings(
            z_submerge_depth=_interp(
                a.aspirate.z_submerge_depth, b.aspirate.z_submerge_depth
            ),
            plunger_acceleration=_interp(
                a.aspirate.plunger_acceleration, b.aspirate.plunger_acceleration
            ),
            plunger_flow_rate=_interp(
                a.aspirate.plunger_flow_rate, b.aspirate.plunger_flow_rate
            ),
            delay=_interp(a.aspirate.delay, b.aspirate.delay),
            z_retract_discontinuity=_interp(
                a.aspirate.z_retract_discontinuity, b.aspirate.z_retract_discontinuity
            ),
            z_retract_height=_interp(
                a.aspirate.z_retract_height, b.aspirate.z_retract_height
            ),
            leading_air_gap=_interp(
                a.aspirate.leading_air_gap, b.aspirate.leading_air_gap
            ),
            trailing_air_gap=_interp(
                a.aspirate.trailing_air_gap, b.aspirate.trailing_air_gap
            ),
        ),
        dispense=DispenseSettings(
            z_submerge_depth=_interp(
                a.dispense.z_submerge_depth, b.dispense.z_submerge_depth
            ),
            plunger_acceleration=_interp(
                a.dispense.plunger_acceleration, b.dispense.plunger_acceleration
            ),
            plunger_flow_rate=_interp(
                a.dispense.plunger_flow_rate, b.dispense.plunger_flow_rate
            ),
            delay=_interp(a.dispense.delay, b.dispense.delay),
            z_retract_discontinuity=_interp(
                a.dispense.z_retract_discontinuity, b.dispense.z_retract_discontinuity
            ),
            z_retract_height=_interp(
                a.dispense.z_retract_height, b.dispense.z_retract_height
            ),
            blow_out_submerged=_interp(
                a.dispense.blow_out_submerged, b.dispense.blow_out_submerged
            ),
        ),
    )
