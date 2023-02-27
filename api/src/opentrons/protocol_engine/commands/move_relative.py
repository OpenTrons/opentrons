"""Move relative (jog) command payload, result, and implementation models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from ..types import MovementAxis
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate
from .pipetting_common import DestinationPositionResult

if TYPE_CHECKING:
    from ..execution import MovementHandler


MoveRelativeCommandType = Literal["moveRelative"]


class MoveRelativeParams(BaseModel):
    """Payload required for a MoveRelative command."""

    pipetteId: str = Field(..., description="Pipette to move.")
    axis: MovementAxis = Field(..., description="Axis along which to move.")
    distance: float = Field(
        ...,
        description=(
            "Distance to move in millimeters. A positive number will move"
            " towards the right (x), back (y), top (z) of the deck."
        ),
    )


class MoveRelativeResult(DestinationPositionResult):
    """Result data from the execution of a MoveRelative command."""

    pass


class MoveRelativeImplementation(
    AbstractCommandImpl[MoveRelativeParams, MoveRelativeResult]
):
    """Move relative command implementation."""

    def __init__(self, movement: MovementHandler, **kwargs: object) -> None:
        self._movement = movement

    async def execute(self, params: MoveRelativeParams) -> MoveRelativeResult:
        """Move (jog) a given pipette a relative distance."""
        result = await self._movement.move_relative(
            pipette_id=params.pipetteId,
            axis=params.axis,
            distance=params.distance,
        )

        return MoveRelativeResult(position=result.position)


class MoveRelative(BaseCommand[MoveRelativeParams, MoveRelativeResult]):
    """Command to move (jog) a given pipette a relative distance."""

    commandType: MoveRelativeCommandType = "moveRelative"
    params: MoveRelativeParams
    result: Optional[MoveRelativeResult]

    _ImplementationCls: Type[MoveRelativeImplementation] = MoveRelativeImplementation


class MoveRelativeCreate(BaseCommandCreate[MoveRelativeParams]):
    """Data to create a MoveRelative command."""

    commandType: MoveRelativeCommandType = "moveRelative"
    params: MoveRelativeParams

    _CommandCls: Type[MoveRelative] = MoveRelative
