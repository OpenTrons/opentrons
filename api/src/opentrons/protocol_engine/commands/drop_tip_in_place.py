"""Drop tip in place command request, result, and implementation models."""
from __future__ import annotations
from opentrons.protocol_engine.state import update_types
from pydantic import Field, BaseModel
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from .pipetting_common import PipetteIdMixin
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..execution import TipHandler


DropTipInPlaceCommandType = Literal["dropTipInPlace"]


class DropTipInPlaceParams(PipetteIdMixin):
    """Payload required to drop a tip in place."""

    homeAfter: Optional[bool] = Field(
        None,
        description=(
            "Whether to home this pipette's plunger after dropping the tip."
            " You should normally leave this unspecified to let the robot choose"
            " a safe default depending on its hardware."
        ),
    )


class DropTipInPlaceResult(BaseModel):
    """Result data from the execution of a DropTipInPlace command."""

    pass


class DropTipInPlaceImplementation(
    AbstractCommandImpl[DropTipInPlaceParams, SuccessData[DropTipInPlaceResult, None]]
):
    """Drop tip in place command implementation."""

    def __init__(
        self,
        tip_handler: TipHandler,
        **kwargs: object,
    ) -> None:
        self._tip_handler = tip_handler

    async def execute(
        self, params: DropTipInPlaceParams
    ) -> SuccessData[DropTipInPlaceResult, None]:
        """Drop a tip using the requested pipette."""
        await self._tip_handler.drop_tip(
            pipette_id=params.pipetteId, home_after=params.homeAfter
        )

        state_update = update_types.StateUpdate()

        state_update.update_pipette_tip_state(
            pipette_id=params.pipetteId, tip_geometry=None
        )

        return SuccessData(
            public=DropTipInPlaceResult(), private=None, state_update=state_update
        )


class DropTipInPlace(
    BaseCommand[DropTipInPlaceParams, DropTipInPlaceResult, ErrorOccurrence]
):
    """Drop tip in place command model."""

    commandType: DropTipInPlaceCommandType = "dropTipInPlace"
    params: DropTipInPlaceParams
    result: Optional[DropTipInPlaceResult]

    _ImplementationCls: Type[
        DropTipInPlaceImplementation
    ] = DropTipInPlaceImplementation


class DropTipInPlaceCreate(BaseCommandCreate[DropTipInPlaceParams]):
    """Drop tip in place command creation request model."""

    commandType: DropTipInPlaceCommandType = "dropTipInPlace"
    params: DropTipInPlaceParams

    _CommandCls: Type[DropTipInPlace] = DropTipInPlace
