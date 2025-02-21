"""Command models to retrieve a labware from a Flex Stacker."""

from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING, Any, Dict
from typing_extensions import Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors import (
    ErrorOccurrence,
    CannotPerformModuleAction,
    LocationIsOccupiedError,
)
from ...state import update_types
from ...types import (
    ModuleLocation,
    OnLabwareLocation,
    LabwareLocationSequence,
    LabwareLocation,
)
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from pydantic.json_schema import SkipJsonSchema
from opentrons.calibration_storage.helpers import uri_from_details

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler

RetrieveCommandType = Literal["flexStacker/retrieve"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class RetrieveParams(BaseModel):
    """Input parameters for a labware retrieval command."""

    moduleId: str = Field(
        ...,
        description="Unique ID of the Flex Stacker.",
    )
    namespace: str = Field(
        ...,
        description="The namespace the lid labware definition belongs to.",
    )
    version: int = Field(
        ...,
        description="The lid labware definition version.",
    )
    labwareId: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional ID to assign to this labware. If None, an ID "
        "will be generated.",
        json_schema_extra=_remove_default,
    )
    displayName: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional user-specified display name "
        "or label for this labware.",
        # NOTE: v4/5 JSON protocols will always have a displayName which will be the
        #  user-specified label OR the displayName property of the labware's definition.
        # TODO: Make sure v6 JSON protocols don't do that.
        json_schema_extra=_remove_default,
    )
    adapterId: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional ID to assign to an adapter. If None, an ID "
        "will be generated.",
        json_schema_extra=_remove_default,
    )
    adapterDisplayName: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional user-specified display name "
        "or label for an adapter.",
        # NOTE: v4/5 JSON protocols will always have a displayName which will be the
        #  user-specified label OR the displayName property of the labware's definition.
        # TODO: Make sure v6 JSON protocols don't do that.
        json_schema_extra=_remove_default,
    )
    lidId: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional ID to assign to a lid. If None, an ID "
        "will be generated.",
        json_schema_extra=_remove_default,
    )


class RetrieveResult(BaseModel):
    """Result data from a labware retrieval command."""

    labwareId: str = Field(
        ...,
        description="The labware ID of the primary retrieved labware.",
    )
    adapterId: str | None = Field(
        None,
        description="The optional Adapter Labware ID of the adapter under a primary labware.",
    )
    lidId: str | None = Field(
        None,
        description="The optional Lid Labware ID of the lid on a primary labware.",
    )
    primaryLocationSequence: LabwareLocationSequence = Field(
        ..., description="The origin location of the primary labware."
    )
    lidLocationSequence: LabwareLocationSequence | None = Field(
        None,
        description="The origin location of the adapter labware under a primary labware.",
    )
    adapterLocationSequence: LabwareLocationSequence | None = Field(
        None, description="The origin location of the lid labware on a primary labware."
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
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )

        if stacker_state.in_static_mode:
            raise CannotPerformModuleAction(
                "Cannot retrieve labware from Flex Stacker while in static mode"
            )

        stacker_loc = ModuleLocation(moduleId=params.moduleId)
        # Allow propagation of ModuleNotAttachedError.
        stacker_hw = self._equipment.get_module_hardware_api(stacker_state.module_id)

        try:
            self._state_view.labware.raise_if_labware_in_location(stacker_loc)
        except LocationIsOccupiedError:
            raise CannotPerformModuleAction(
                "Cannot retrieve a labware from Flex Stacker if the carriage is occupied"
            )

        state_update = update_types.StateUpdate()

        # If there is an adapter load it
        adapter_lw = None
        lid_lw = None
        definitions_by_id: Dict[str, LabwareDefinition] = {}
        offset_ids_by_id: Dict[str, str | None] = {}
        display_names_by_id: Dict[str, str | None] = {}
        new_locations_by_id: Dict[str, LabwareLocation] = {}
        if stacker_state.pool_adapter_definition is not None:
            adapter_lw = await self._equipment.load_labware(
                load_name=stacker_state.pool_adapter_definition.parameters.loadName,
                namespace=params.namespace,
                version=params.version,
                location=ModuleLocation(moduleId=params.moduleId),
                labware_id=params.adapterId,
            )
            definitions_by_id[adapter_lw.labware_id] = adapter_lw.definition
            offset_ids_by_id[adapter_lw.labware_id] = adapter_lw.offsetId
            display_names_by_id[
                adapter_lw.labware_id
            ] = adapter_lw.definition.metadata.displayName
            new_locations_by_id[adapter_lw.labware_id] = ModuleLocation(
                moduleId=params.moduleId
            )
        # Always load the primary labware
        if stacker_state.pool_primary_definition is None:
            raise CannotPerformModuleAction(
                f"Flex Stacker {params.moduleId} has no labware to retrieve"
            )
        loaded_labware = await self._equipment.load_labware(
            load_name=stacker_state.pool_primary_definition.parameters.loadName,
            namespace=params.namespace,
            version=params.version,
            location=ModuleLocation(moduleId=params.moduleId)
            if adapter_lw is None
            else OnLabwareLocation(labwareId=adapter_lw.labware_id),
            labware_id=params.labwareId,
        )
        definitions_by_id[loaded_labware.labware_id] = loaded_labware.definition
        offset_ids_by_id[loaded_labware.labware_id] = loaded_labware.offsetId
        display_names_by_id[
            loaded_labware.labware_id
        ] = loaded_labware.definition.metadata.displayName
        new_locations_by_id[loaded_labware.labware_id] = (
            ModuleLocation(moduleId=params.moduleId)
            if adapter_lw is None
            else OnLabwareLocation(labwareId=adapter_lw.labware_id)
        )
        # If there is a lid load it
        if stacker_state.pool_lid_definition is not None:
            lid_lw = await self._equipment.load_labware(
                load_name=stacker_state.pool_lid_definition.parameters.loadName,
                namespace=params.namespace,
                version=params.version,
                location=OnLabwareLocation(labwareId=loaded_labware.labware_id),
                labware_id=params.lidId,
            )
            definitions_by_id[lid_lw.labware_id] = lid_lw.definition
            offset_ids_by_id[lid_lw.labware_id] = lid_lw.offsetId
            display_names_by_id[
                lid_lw.labware_id
            ] = lid_lw.definition.metadata.displayName
            new_locations_by_id[lid_lw.labware_id] = OnLabwareLocation(
                labwareId=loaded_labware.labware_id
            )

        # Get the labware dimensions for the labware being retrieved,
        # which is the first one in the hopper labware id list
        primary_location_sequence = (
            self._state_view.geometry.get_predicted_location_sequence(
                new_locations_by_id[loaded_labware.labware_id]
            )
        )
        adapter_location_sequence = (
            self._state_view.geometry.get_predicted_location_sequence(
                new_locations_by_id[adapter_lw.labware_id]
            )
            if adapter_lw is not None
            else None
        )
        lid_location_sequence = (
            self._state_view.geometry.get_predicted_location_sequence(
                new_locations_by_id[lid_lw.labware_id]
            )
            if lid_lw is not None
            else None
        )

        # Get the Labware URIs where relevant
        primary_uri = str(
            uri_from_details(
                namespace=loaded_labware.definition.namespace,
                load_name=loaded_labware.definition.parameters.loadName,
                version=loaded_labware.definition.version,
            )
        )
        adapter_uri = (
            str(
                uri_from_details(
                    namespace=adapter_lw.definition.namespace,
                    load_name=adapter_lw.definition.parameters.loadName,
                    version=adapter_lw.definition.version,
                )
            )
            if adapter_lw is not None
            else None
        )
        lid_uri = (
            str(
                uri_from_details(
                    namespace=lid_lw.definition.namespace,
                    load_name=lid_lw.definition.parameters.loadName,
                    version=lid_lw.definition.version,
                )
            )
            if lid_lw is not None
            else None
        )

        labware_height = self._state_view.geometry.get_height_of_labware_stack(
            definitions=list(definitions_by_id.values())
        )

        if stacker_hw is not None:
            await stacker_hw.dispense_labware(labware_height=labware_height)

        # Update the state to reflect the labware is now in the Flex Stacker slot
        # todo(chb, 2025-02-19): This ModuleLocation piece should probably instead be an AddressableAreaLocation
        # but that has implications for where labware are set by things like module.load_labware(..) and what
        # happens when we move labware.
        stacker_area = (
            self._state_view.modules.ensure_and_convert_module_fixture_location(
                deck_slot=self._state_view.modules.get_location(
                    params.moduleId
                ).slotName,
                model=self._state_view.modules.get(params.moduleId).model,
            )
        )
        state_update.set_addressable_area_used(stacker_area)
        state_update.set_batch_loaded_labware(
            definitions_by_id=definitions_by_id,
            display_names_by_id=display_names_by_id,
            offset_ids_by_id=offset_ids_by_id,
            new_locations_by_id=new_locations_by_id,
        )
        state_update.update_flex_stacker_labware_pool_count(
            module_id=params.moduleId, count=stacker_state.pool_count - 1
        )

        if lid_lw is not None:
            state_update.set_lids(
                parent_labware_ids=[loaded_labware.labware_id],
                lid_ids=[lid_lw.labware_id],
            )

        state_update.retrieve_flex_stacker_labware(
            module_id=params.moduleId, labware_id=loaded_labware.labware_id
        )
        return SuccessData(
            public=RetrieveResult(
                labwareId=loaded_labware.labware_id,
                adapterId=adapter_lw.labware_id if adapter_lw is not None else None,
                lidId=lid_lw.labware_id if lid_lw is not None else None,
                primaryLocationSequence=primary_location_sequence,
                adapterLocationSequence=adapter_location_sequence,
                lidLocationSequence=lid_location_sequence,
                primaryLabwareURI=primary_uri,
                adapterLabwareURI=adapter_uri,
                lidLabwareURI=lid_uri,
            ),
            state_update=state_update,
        )


class Retrieve(BaseCommand[RetrieveParams, RetrieveResult, ErrorOccurrence]):
    """A command to retrieve a labware from a Flex Stacker."""

    commandType: RetrieveCommandType = "flexStacker/retrieve"
    params: RetrieveParams
    result: Optional[RetrieveResult] = None

    _ImplementationCls: Type[RetrieveImpl] = RetrieveImpl


class RetrieveCreate(BaseCommandCreate[RetrieveParams]):
    """A request to execute a Flex Stacker retrieve command."""

    commandType: RetrieveCommandType = "flexStacker/retrieve"
    params: RetrieveParams

    _CommandCls: Type[Retrieve] = Retrieve
