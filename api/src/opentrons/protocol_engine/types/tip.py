"""Protocol Engine types to deal with tips."""

from dataclasses import dataclass


@dataclass(frozen=True)
class TipGeometry:
    """Tip geometry data.

    Props:
        length: The effective length (total length minus overlap) of a tip in mm.
        diameter: Tip diameter in mm.
        volume: Maximum volume in µL.
    """

    length: float
    diameter: float
    volume: float
