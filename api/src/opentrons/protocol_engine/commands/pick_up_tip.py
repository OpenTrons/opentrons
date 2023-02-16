"""Pick up tip command request, result, and implementation models."""
from __future__ import annotations
from pydantic import Field
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from .pipetting_common import (
    PipetteIdMixin,
    WellLocationMixin,
    DestinationPositionResult,
)
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate

if TYPE_CHECKING:
    from ..execution import PipettingHandler


PickUpTipCommandType = Literal["pickUpTip"]


class PickUpTipParams(PipetteIdMixin, WellLocationMixin):
    """Payload needed to move a pipette to a specific well."""

    pass


class PickUpTipResult(DestinationPositionResult):
    """Result data from the execution of a PickUpTip."""

    # Tip volume has a default ONLY for parsing data from earlier versions, which did not include this in the result
    tipVolume: float = Field(
        0,
        description="Maximum volume of liquid that the picked up tip can hold, in µL.",
        gt=0,
    )


class PickUpTipImplementation(AbstractCommandImpl[PickUpTipParams, PickUpTipResult]):
    """Pick up tip command implementation."""

    def __init__(self, pipetting: PipettingHandler, **kwargs: object) -> None:
        self._pipetting = pipetting

    async def execute(self, params: PickUpTipParams) -> PickUpTipResult:
        """Move to and pick up a tip using the requested pipette."""
        result = await self._pipetting.pick_up_tip(
            pipette_id=params.pipetteId,
            labware_id=params.labwareId,
            well_name=params.wellName,
            well_location=params.wellLocation,
        )

        return PickUpTipResult(tipVolume=result.volume, position=result.position)


class PickUpTip(BaseCommand[PickUpTipParams, PickUpTipResult]):
    """Pick up tip command model."""

    commandType: PickUpTipCommandType = "pickUpTip"
    params: PickUpTipParams
    result: Optional[PickUpTipResult]

    _ImplementationCls: Type[PickUpTipImplementation] = PickUpTipImplementation


class PickUpTipCreate(BaseCommandCreate[PickUpTipParams]):
    """Pick up tip command creation request model."""

    commandType: PickUpTipCommandType = "pickUpTip"
    params: PickUpTipParams

    _CommandCls: Type[PickUpTip] = PickUpTip
