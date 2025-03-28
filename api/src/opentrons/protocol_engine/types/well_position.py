"""Protocol engine types to do with positions inside wells."""
from enum import Enum
from typing import Union, Literal

from pydantic import BaseModel, Field


class WellOrigin(str, Enum):
    """Origin of WellLocation offset.

    Props:
        TOP: the top-center of the well
        BOTTOM: the bottom-center of the well
        CENTER: the middle-center of the well
        MENISCUS: the meniscus-center of the well
    """

    TOP = "top"
    BOTTOM = "bottom"
    CENTER = "center"
    MENISCUS = "meniscus"


class PickUpTipWellOrigin(str, Enum):
    """The origin of a PickUpTipWellLocation offset.

    Props:
        TOP: the top-center of the well
        BOTTOM: the bottom-center of the well
        CENTER: the middle-center of the well
    """

    TOP = "top"
    BOTTOM = "bottom"
    CENTER = "center"


class DropTipWellOrigin(str, Enum):
    """The origin of a DropTipWellLocation offset.

    Props:
        TOP: the top-center of the well
        BOTTOM: the bottom-center of the well
        CENTER: the middle-center of the well
        DEFAULT: the default drop-tip location of the well,
            based on pipette configuration and length of the tip.
    """

    TOP = "top"
    BOTTOM = "bottom"
    CENTER = "center"
    DEFAULT = "default"


# This is deliberately a separate type from Vec3f to let components default to 0.
class WellOffset(BaseModel):
    """An offset vector in (x, y, z)."""

    x: float = 0
    y: float = 0
    z: float = 0


class WellLocation(BaseModel):
    """A relative location in reference to a well's location."""

    origin: WellOrigin = WellOrigin.TOP
    offset: WellOffset = Field(default_factory=WellOffset)
    volumeOffset: float = Field(
        default=0.0,
        description="""A volume of liquid, in µL, to offset the z-axis offset.""",
    )


class LiquidHandlingWellLocation(BaseModel):
    """A relative location in reference to a well's location.

    To be used with commands that handle liquids.
    """

    origin: WellOrigin = WellOrigin.TOP
    offset: WellOffset = Field(default_factory=WellOffset)
    volumeOffset: Union[float, Literal["operationVolume"]] = Field(
        default=0.0,
        description="""A volume of liquid, in µL, to offset the z-axis offset. When "operationVolume" is specified, this volume is pulled from the command volume parameter.""",
    )


class PickUpTipWellLocation(BaseModel):
    """A relative location in reference to a well's location.

    To be used for picking up tips.
    """

    origin: PickUpTipWellOrigin = PickUpTipWellOrigin.TOP
    offset: WellOffset = Field(default_factory=WellOffset)


class DropTipWellLocation(BaseModel):
    """Like WellLocation, but for dropping tips.

    Unlike a typical WellLocation, the location for a drop tip
    defaults to location based on the tip length rather than the well's top.
    """

    origin: DropTipWellOrigin = DropTipWellOrigin.DEFAULT
    offset: WellOffset = Field(default_factory=WellOffset)
