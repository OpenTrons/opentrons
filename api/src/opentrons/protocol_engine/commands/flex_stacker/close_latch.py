"""Command models to close the latch of a Flex Stacker."""

from __future__ import annotations

from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors import (
    ErrorOccurrence,
)

if TYPE_CHECKING:
    from ...state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler

CloseLatchCommandType = Literal["flexStacker/closeLatch"]


class CloseLatchParams(BaseModel):
    """The parameters defining how a stacker should close its latch."""

    moduleId: str = Field(..., description="Unique ID of the Flex Stacker")


class CloseLatchResult(BaseModel):
    """Result data from a stacker CloseLatch command."""


class CloseLatchImpl(
    AbstractCommandImpl[CloseLatchParams, SuccessData[CloseLatchResult]]
):
    """Implementation of a stacker CloseLatch command."""

    def __init__(
        self, state_view: StateView, equipment: EquipmentHandler, **kwargs: object
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: CloseLatchParams) -> SuccessData[CloseLatchResult]:
        """Execute the stacker CloseLatch command."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )
        stacker_hw = self._equipment.get_module_hardware_api(stacker_state.module_id)

        if stacker_hw is not None:
            await stacker_hw.close_latch()
        return SuccessData(public=CloseLatchResult())


class CloseLatch(BaseCommand[CloseLatchParams, CloseLatchResult, ErrorOccurrence]):
    """A command to CloseLatch the Flex Stacker of labware."""

    commandType: CloseLatchCommandType = "flexStacker/closeLatch"
    params: CloseLatchParams
    result: Optional[CloseLatchResult] = None

    _ImplementationCls: Type[CloseLatchImpl] = CloseLatchImpl


class CloseLatchCreate(BaseCommandCreate[CloseLatchParams]):
    """A request to execute a Flex Stacker CloseLatch command."""

    commandType: CloseLatchCommandType = "flexStacker/closeLatch"
    params: CloseLatchParams

    _CommandCls: Type[CloseLatch] = CloseLatch
