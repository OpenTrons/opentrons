"""Heater-Shaker Module sub-state."""
from dataclasses import dataclass
from typing import NewType, Optional, List

from opentrons.protocol_engine.errors import CannotPerformModuleAction

AbsorbanceReaderId = NewType("AbsorbanceReaderId", str)
AbsorbanceReaderLidId = NewType("AbsorbanceReaderLidId", str)


@dataclass(frozen=True)
class AbsorbanceReaderSubState:
    """Absorbance-Plate-Reader-specific state."""

    module_id: AbsorbanceReaderId
    configured: bool
    measured: bool
    is_lid_on: bool
    data: Optional[List[float]]
    configured_wavelength: Optional[int]

    def raise_if_lid_status_not_expected(self, lid_on_expected: bool) -> None:
        """Raise if the lid status is not correct."""
        match = self.is_lid_on is lid_on_expected
        if not match:
            raise CannotPerformModuleAction(
                "Cannot perform lid action because the lid is already "
                f"{'closed' if self.is_lid_on else 'open'}"
            )
