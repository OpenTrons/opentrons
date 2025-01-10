"""Command models to retrieve a labware from a Flex Stacker."""
from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...state import update_types

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler

RetrieveCommandType = Literal["flexStacker/retrieve"]


class RetrieveParams(BaseModel):
    """Input parameters for a labware retrieval command."""

    moduleId: str = Field(
        ...,
        description="Unique ID of the Flex Stacker.",
    )


class RetrieveResult(BaseModel):
    """Result data from a labware retrieval command."""


class RetrieveImpl(AbstractCommandImpl[RetrieveParams, SuccessData[RetrieveResult]]):
    """Implementation of a labware retrieval command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: RetrieveParams) -> SuccessData[RetrieveResult]:
        """Execute the labware retrieval command."""
        state_update = update_types.StateUpdate()
        stacker_substate = self._state_view.modules.get_flex_stacker_substate(
            module_id=params.moduleId
        )

        # Allow propagation of ModuleNotAttachedError.
        stacker = self._equipment.get_module_hardware_api(stacker_substate.module_id)

        if stacker is not None:
            await stacker.dispense()

        return SuccessData(public=RetrieveResult(), state_update=state_update)


class Retrieve(BaseCommand[RetrieveParams, RetrieveResult, ErrorOccurrence]):
    """A command to retrieve a labware from a Flex Stacker."""

    commandType: RetrieveCommandType = "flexStacker/retrieve"
    params: RetrieveParams
    result: Optional[RetrieveResult]

    _ImplementationCls: Type[RetrieveImpl] = RetrieveImpl


class RetrieveCreate(BaseCommandCreate[RetrieveParams]):
    """A request to execute a Flex Stacker retrieve command."""

    commandType: RetrieveCommandType = "flexStacker/retrieve"
    params: RetrieveParams

    _CommandCls: Type[Retrieve] = Retrieve
