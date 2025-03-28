"""Protocol engine types to do with liquid handling."""

from dataclasses import dataclass
from typing import Dict


@dataclass
class FlowRates:
    """Default and current flow rates for a pipette."""

    default_blow_out: Dict[str, float]
    default_aspirate: Dict[str, float]
    default_dispense: Dict[str, float]
