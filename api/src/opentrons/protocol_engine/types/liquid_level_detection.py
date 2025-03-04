"""Protocol Engine types to do with liquid level detection."""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, model_serializer


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

    def __eq__(self, other: object) -> bool:
        """A SimulatedProbeResult should only be equal to the same instance of its class."""
        if not isinstance(other, SimulatedProbeResult):
            return False
        return self is other

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
