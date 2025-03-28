"""Protocol Engine types to do with liquid level detection."""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, model_serializer, field_validator


class SimulatedProbeResult(BaseModel):
    """A sentinel value to substitute for the resulting volume/height of a liquid probe during simulation."""

    operations_after_probe: List[float] = []
    net_liquid_exchanged_after_probe: float = 0.0

    @model_serializer
    def serialize_model(self) -> str:
        """Serialize instances of this class as a string."""
        return "SimulatedProbeResult"

    def __add__(
        self, other: float | SimulatedProbeResult
    ) -> float | SimulatedProbeResult:
        """Bypass addition and just return self."""
        return self

    def __sub__(
        self, other: float | SimulatedProbeResult
    ) -> float | SimulatedProbeResult:
        """Bypass subtraction and just return self."""
        return self

    def __radd__(
        self, other: float | SimulatedProbeResult
    ) -> float | SimulatedProbeResult:
        """Bypass addition and just return self."""
        return self

    def __rsub__(
        self, other: float | SimulatedProbeResult
    ) -> float | SimulatedProbeResult:
        """Bypass subtraction and just return self."""
        return self

    def __gt__(self, other: float | SimulatedProbeResult) -> bool:
        """Bypass 'greater than' and just return self."""
        return True

    def __lt__(self, other: float | SimulatedProbeResult) -> bool:
        """Bypass 'less than' and just return self."""
        return False

    def __ge__(self, other: float | SimulatedProbeResult) -> bool:
        """Bypass 'greater than or eaqual to' and just return self."""
        return True

    def __le__(self, other: float | SimulatedProbeResult) -> bool:
        """Bypass 'less than or equal to' and just return self."""
        return False

    def __eq__(self, other: object) -> bool:
        """A SimulatedProbeResult should only be equal to the same instance of its class."""
        if not isinstance(other, SimulatedProbeResult):
            return False
        return self is other

    def __neq__(self, other: object) -> bool:
        """A SimulatedProbeResult should only be equal to the same instance of its class."""
        if not isinstance(other, SimulatedProbeResult):
            return True
        return self is not other

    def simulate_probed_aspirate_dispense(self, volume: float) -> None:
        """Record the current state of aspirate/dispense calls."""
        self.net_liquid_exchanged_after_probe += volume
        self.operations_after_probe.append(volume)


LiquidTrackingType = SimulatedProbeResult | float


class LoadedVolumeInfo(BaseModel):
    """A well's liquid volume, initialized by a LoadLiquid, updated by Aspirate and Dispense."""

    volume: LiquidTrackingType | None = None
    last_loaded: datetime
    operations_since_load: int


class ProbedHeightInfo(BaseModel):
    """A well's liquid height, initialized by a LiquidProbe, cleared by Aspirate and Dispense."""

    height: LiquidTrackingType | None = None
    last_probed: datetime


class ProbedVolumeInfo(BaseModel):
    """A well's liquid volume, initialized by a LiquidProbe, updated by Aspirate and Dispense."""

    volume: LiquidTrackingType | None = None
    last_probed: datetime
    operations_since_probe: int


class WellInfoSummary(BaseModel):
    """Payload for a well's liquid info in StateSummary."""

    # TODO(cm): 3/21/25: refactor SimulatedLiquidProbe in a way that
    # doesn't require models like this one that are just using it to
    # need a custom validator
    @field_validator("probed_height", "probed_volume", mode="before")
    @classmethod
    def validate_simulated_probe_result(
        cls, input_val: object
    ) -> LiquidTrackingType | None:
        """Return the appropriate input to WellInfoSummary from json data."""
        if input_val is None:
            return None
        if isinstance(input_val, LiquidTrackingType):
            return input_val
        if isinstance(input_val, str) and input_val == "SimulatedProbeResult":
            return SimulatedProbeResult()
        raise ValueError(f"Invalid input value {input_val} to WellInfoSummary")

    labware_id: str
    well_name: str
    loaded_volume: Optional[float] = None
    probed_height: LiquidTrackingType | None = None
    probed_volume: LiquidTrackingType | None = None


@dataclass
class WellLiquidInfo:
    """Tracked and sensed information about liquid in a well."""

    probed_height: Optional[ProbedHeightInfo]
    loaded_volume: Optional[LoadedVolumeInfo]
    probed_volume: Optional[ProbedVolumeInfo]
