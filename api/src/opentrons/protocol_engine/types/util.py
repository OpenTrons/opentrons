"""Protocol engine utility types for model components."""
from dataclasses import dataclass

from pydantic import BaseModel


@dataclass(frozen=True)
class Dimensions:
    """Dimensions of an object in deck-space."""

    x: float
    y: float
    z: float


class Vec3f(BaseModel):
    """A 3D vector of floats."""

    x: float
    y: float
    z: float
