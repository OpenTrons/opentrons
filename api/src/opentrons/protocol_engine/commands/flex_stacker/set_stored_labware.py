"""Command models to configure the stored labware pool of a Flex Stacker.."""

from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors import (
    ErrorOccurrence,
)
from ...errors.exceptions import FlexStackerNotLogicallyEmptyError
from ...state import update_types

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler

SetStoredLabwareCommandType = Literal["flexStacker/setStoredlabware"]


class StackerStoredLabwareDetails(BaseModel):
    """The parameters defining a labware to be stored in the stacker."""

    loadName: str = Field(
        ..., description="Name used to reference the definition of this labware."
    )
    namespace: str = Field(
        ..., description="Namespace of the definition of this labware."
    )
    version: int = Field(..., description="Version of the definition of this labware.")


class SetStoredLabwareParams(BaseModel):
    """Input parameters for a setStoredLabware command."""

    moduleId: str = Field(
        ...,
        description="Unique ID of the Flex Stacker.",
    )
    initialCount: int = Field(
        ...,
        description=(
            "The number of labware that should be initially stored in the stacker. This number will be silently clamped to "
            "the maximum number of labware that will fit; do not rely on the parameter to know how many labware are in the stacker."
        ),
        ge=0,
    )
    primaryLabware: StackerStoredLabwareDetails = Field(
        ...,
        description="The details of the primary labware (i.e. not the lid or adapter, if any) stored in the stacker.",
    )
    lidLabware: StackerStoredLabwareDetails | None = Field(
        default=None,
        description="The details of the lid on the primary labware, if any.",
    )
    adapterLabware: StackerStoredLabwareDetails | None = Field(
        default=None,
        description="The details of the adapter under the primary labware, if any.",
    )


class SetStoredLabwareResult(BaseModel):
    """Result data from a setstoredlabware command."""

    primaryLabwareDefinition: LabwareDefinition = Field(
        ..., description="The definition of the primary labware."
    )
    lidLabwareDefinition: LabwareDefinition | None = Field(
        ..., description="The definition of the lid on the primary labware, if any."
    )
    adapterLabwareDefinition: LabwareDefinition | None = Field(
        ...,
        description="The definition of the adapter under the primary labware, if any.",
    )
    count: int = Field(
        ..., description="The number of labware loaded into the stacker labware pool."
    )


class SetStoredLabwareImpl(
    AbstractCommandImpl[SetStoredLabwareParams, SuccessData[SetStoredLabwareResult]]
):
    """Implementation of a setstoredlabware command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self, params: SetStoredLabwareParams
    ) -> SuccessData[SetStoredLabwareResult]:
        """Execute the setstoredlabwarecommand."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )
        error_messages: list[str] = []
        if stacker_state.hopper_labware_ids != []:
            error_messages.append(
                f"{len(stacker_state.hopper_labware_ids)} unique labware"
            )
        if stacker_state.pool_count != 0:
            error_messages.append(f"a pool of {stacker_state.pool_count} labware")
        if error_messages != []:
            # Note: this error catches if the protocol tells us the stacker is not empty, making this command
            # invalid at this point in the protocol. This error is not recoverable and should occur during
            # analysis; the protocol must be changed.
            raise FlexStackerNotLogicallyEmptyError(
                message=(
                    "The Flex Stacker must be known to be empty before reconfiguring its labware pool, but it has "
                    + " and ".join(error_messages)
                )
            )

        labware_def, _ = await self._equipment.load_definition_for_details(
            load_name=params.primaryLabware.loadName,
            namespace=params.primaryLabware.namespace,
            version=params.primaryLabware.version,
        )
        definition_stack = [labware_def]
        lid_def: LabwareDefinition | None = None
        if params.lidLabware:
            lid_def, _ = await self._equipment.load_definition_for_details(
                load_name=params.lidLabware.loadName,
                namespace=params.lidLabware.namespace,
                version=params.lidLabware.version,
            )
            definition_stack.insert(0, lid_def)
        adapter_def: LabwareDefinition | None = None
        if params.adapterLabware:
            adapter_def, _ = await self._equipment.load_definition_for_details(
                load_name=params.adapterLabware.loadName,
                namespace=params.adapterLabware.namespace,
                version=params.adapterLabware.version,
            )
            definition_stack.insert(-1, adapter_def)

        # TODO: propagate the limit on max height of the stacker
        count = min(params.initialCount, 5)

        state_update = (
            update_types.StateUpdate()
            .update_flex_stacker_labware_pool_definition(
                params.moduleId, labware_def, adapter_def, lid_def
            )
            .update_flex_stacker_labware_pool_count(params.moduleId, count)
        )
        return SuccessData(
            public=SetStoredLabwareResult(
                primaryLabwareDefinition=labware_def,
                lidLabwareDefinition=lid_def,
                adapterLabwareDefinition=adapter_def,
                count=count,
            ),
            state_update=state_update,
        )


class SetStoredLabware(
    BaseCommand[SetStoredLabwareParams, SetStoredLabwareResult, ErrorOccurrence]
):
    """A command to setstoredlabware the Flex Stacker."""

    commandType: SetStoredLabwareCommandType = "flexStacker/setStoredlabware"
    params: SetStoredLabwareParams
    result: Optional[SetStoredLabwareResult] = None

    _ImplementationCls: Type[SetStoredLabwareImpl] = SetStoredLabwareImpl


class SetStoredLabwareCreate(BaseCommandCreate[SetStoredLabwareParams]):
    """A request to execute a Flex Stacker SetStoredLabware command."""

    commandType: SetStoredLabwareCommandType = "flexStacker/setStoredlabware"
    params: SetStoredLabwareParams

    _CommandCls: Type[SetStoredLabware] = SetStoredLabware
