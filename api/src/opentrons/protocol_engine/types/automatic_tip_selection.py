"""Protocol engine types dealing with automatic tip selection."""
from enum import Enum
from typing import Optional

from pydantic import (
    BaseModel,
    Field,
)


class NextTipInfo(BaseModel):
    """Next available tip labware and well name data."""

    labwareId: str = Field(
        ...,
        description="The labware ID of the tip rack where the next available tip(s) are located.",
    )
    tipStartingWell: str = Field(
        ..., description="The (starting) well name of the next available tip(s)."
    )


class NoTipReason(Enum):
    """The cause of no tip being available for a pipette and tip rack(s)."""

    NO_AVAILABLE_TIPS = "noAvailableTips"
    STARTING_TIP_WITH_PARTIAL = "startingTipWithPartial"
    INCOMPATIBLE_CONFIGURATION = "incompatibleConfiguration"


class NoTipAvailable(BaseModel):
    """No available next tip data."""

    noTipReason: NoTipReason = Field(
        ..., description="The reason why no next available tip could be provided."
    )
    message: Optional[str] = Field(
        None, description="Optional message explaining why a tip wasn't available."
    )
