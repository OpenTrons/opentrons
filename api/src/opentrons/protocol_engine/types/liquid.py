"""Protocol engine types to do with liquids."""
from dataclasses import dataclass
from enum import Enum
from typing import Literal, Optional

from pydantic import RootModel, BaseModel, Field


class HexColor(RootModel[str]):
    """Hex color representation."""

    root: str = Field(pattern=r"^#(?:[0-9a-fA-F]{3,4}){1,2}$")


EmptyLiquidId = Literal["EMPTY"]
LiquidId = str | EmptyLiquidId


class Liquid(BaseModel):
    """Payload required to create a liquid."""

    id: str
    displayName: str
    description: str
    displayColor: Optional[HexColor] = None


class FluidKind(str, Enum):
    """A kind of fluid that can be inside a pipette."""

    LIQUID = "LIQUID"
    AIR = "AIR"


@dataclass(frozen=True)
class AspiratedFluid:
    """Fluid inside a pipette."""

    kind: FluidKind
    volume: float
