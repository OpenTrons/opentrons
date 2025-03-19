"""Command models to engage a user to empty a Flex Stacker."""

from __future__ import annotations

from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors import (
    ErrorOccurrence,
)
from ...errors.exceptions import FlexStackerLabwarePoolNotYetDefinedError
from ...state import update_types
from ...types import StackerFillEmptyStrategy
from opentrons.calibration_storage.helpers import uri_from_details

if TYPE_CHECKING:
    from ...state.state import StateView
    from ...execution import RunControlHandler

EmptyCommandType = Literal["flexStacker/empty"]


class EmptyParams(BaseModel):
    """The parameters defining how a stacker should be emptied."""

    moduleId: str = Field(..., description="Unique ID of the Flex Stacker")

    strategy: StackerFillEmptyStrategy = Field(
        ...,
        description=(
            "How to empty the stacker. "
            "If manualWithPause, pause the protocol until the client sends an interaction, and mark "
            "the labware pool as empty thereafter. If logical, do not pause but immediately apply the "
            "specified count."
        ),
    )

    message: str | None = Field(
        None,
        description="The message to display on connected clients during a manualWithPause strategy empty.",
    )

    count: int | None = Field(
        None,
        description=(
            "The new count of labware in the pool. If None, default to an empty pool. If this number is "
            "larger than the amount of labware currently in the pool, default to the smaller amount. "
            "Do not use the value in the parameters as an outside observer; instead, use the count value "
            "from the results."
        ),
        ge=0,
    )


class EmptyResult(BaseModel):
    """Result data from a stacker empty command."""

    count: int = Field(
        ..., description="The new amount of labware stored in the stacker labware pool."
    )
    primaryLabwareURI: str = Field(
        ...,
        description="The labware definition URI of the primary labware.",
    )
    adapterLabwareURI: str | None = Field(
        None,
        description="The labware definition URI of the adapter labware.",
    )
    lidLabwareURI: str | None = Field(
        None,
        description="The labware definition URI of the lid labware.",
    )


class EmptyImpl(AbstractCommandImpl[EmptyParams, SuccessData[EmptyResult]]):
    """Implementation of a stacker empty command."""

    def __init__(
        self, state_view: StateView, run_control: RunControlHandler, **kwargs: object
    ) -> None:
        self._state_view = state_view
        self._run_control = run_control

    async def execute(self, params: EmptyParams) -> SuccessData[EmptyResult]:
        """Execute the stacker empty command."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )

        if stacker_state.pool_primary_definition is None:
            location = self._state_view.modules.get_location(params.moduleId)
            raise FlexStackerLabwarePoolNotYetDefinedError(
                message=f"The Flex Stacker in {location} has not been configured yet and cannot be emptied."
            )

        count = params.count if params.count is not None else 0

        new_count = min(stacker_state.pool_count, count)

        state_update = (
            update_types.StateUpdate().update_flex_stacker_labware_pool_count(
                params.moduleId, new_count
            )
        )

        if params.strategy == StackerFillEmptyStrategy.MANUAL_WITH_PAUSE:
            await self._run_control.wait_for_resume()

        if stacker_state.pool_primary_definition is None:
            raise FlexStackerLabwarePoolNotYetDefinedError(
                "The Primary Labware must be defined in the stacker pool."
            )

        return SuccessData(
            public=EmptyResult(
                count=new_count,
                primaryLabwareURI=uri_from_details(
                    stacker_state.pool_primary_definition.namespace,
                    stacker_state.pool_primary_definition.parameters.loadName,
                    stacker_state.pool_primary_definition.version,
                ),
                adapterLabwareURI=uri_from_details(
                    stacker_state.pool_adapter_definition.namespace,
                    stacker_state.pool_adapter_definition.parameters.loadName,
                    stacker_state.pool_adapter_definition.version,
                )
                if stacker_state.pool_adapter_definition is not None
                else None,
                lidLabwareURI=uri_from_details(
                    stacker_state.pool_lid_definition.namespace,
                    stacker_state.pool_lid_definition.parameters.loadName,
                    stacker_state.pool_lid_definition.version,
                )
                if stacker_state.pool_lid_definition is not None
                else None,
            ),
            state_update=state_update,
        )


class Empty(BaseCommand[EmptyParams, EmptyResult, ErrorOccurrence]):
    """A command to empty the Flex Stacker of labware."""

    commandType: EmptyCommandType = "flexStacker/empty"
    params: EmptyParams
    result: Optional[EmptyResult] = None

    _ImplementationCls: Type[EmptyImpl] = EmptyImpl


class EmptyCreate(BaseCommandCreate[EmptyParams]):
    """A request to execute a Flex Stacker empty command."""

    commandType: EmptyCommandType = "flexStacker/empty"
    params: EmptyParams

    _CommandCls: Type[Empty] = Empty
