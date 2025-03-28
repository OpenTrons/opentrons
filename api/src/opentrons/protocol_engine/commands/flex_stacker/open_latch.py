"""Command models to open the latch of a Flex Stacker."""

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

OpenLatchCommandType = Literal["flexStacker/openLatch"]


class OpenLatchParams(BaseModel):
    """The parameters defining how a stacker should open its latch."""

    moduleId: str = Field(..., description="Unique ID of the Flex Stacker")


class OpenLatchResult(BaseModel):
    """Result data from a stacker OpenLatch command."""


class OpenLatchImpl(AbstractCommandImpl[OpenLatchParams, SuccessData[OpenLatchResult]]):
    """Implementation of a stacker OpenLatch command."""

    def __init__(
        self, state_view: StateView, equipment: EquipmentHandler, **kwargs: object
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: OpenLatchParams) -> SuccessData[OpenLatchResult]:
        """Execute the stacker OpenLatch command."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )
        stacker_hw = self._equipment.get_module_hardware_api(stacker_state.module_id)

        if stacker_hw is not None:
            await stacker_hw.open_latch()
        return SuccessData(public=OpenLatchResult())


class OpenLatch(BaseCommand[OpenLatchParams, OpenLatchResult, ErrorOccurrence]):
    """A command to OpenLatch the Flex Stacker of labware."""

    commandType: OpenLatchCommandType = "flexStacker/openLatch"
    params: OpenLatchParams
    result: Optional[OpenLatchResult] = None

    _ImplementationCls: Type[OpenLatchImpl] = OpenLatchImpl


class OpenLatchCreate(BaseCommandCreate[OpenLatchParams]):
    """A request to execute a Flex Stacker OpenLatch command."""

    commandType: OpenLatchCommandType = "flexStacker/openLatch"
    params: OpenLatchParams

    _CommandCls: Type[OpenLatch] = OpenLatch
