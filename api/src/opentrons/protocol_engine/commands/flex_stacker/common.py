"""Common flex stacker base models."""
from typing import Literal

from ...errors import ErrorOccurrence
from opentrons_shared_data.errors import ErrorCodes


class FlexStackerStallOrCollisionError(ErrorOccurrence):
    """Returned when the motor driver detects a stall."""

    isDefined: bool = True
    errorType: Literal["flexStackerStallOrCollision"] = "flexStackerStallOrCollision"

    errorCode: str = ErrorCodes.FLEX_STACKER_STALL_OR_COLLISION_DETECTED.value.code
    detail: str = ErrorCodes.FLEX_STACKER_STALL_OR_COLLISION_DETECTED.value.detail
