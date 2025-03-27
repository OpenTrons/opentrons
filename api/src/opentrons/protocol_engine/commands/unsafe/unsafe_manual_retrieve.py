"""Command models to manually retrieve a labware from a Flex Stacker in an unsafe situation."""

from __future__ import annotations
from typing import Literal, TYPE_CHECKING, Any, Union, Optional
from typing_extensions import Type

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from ..command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)
from ..flex_stacker.common import FlexStackerStallOrCollisionError
from ...errors import (
    ErrorOccurrence,
    CannotPerformModuleAction,
    LocationIsOccupiedError,
    FlexStackerLabwarePoolNotYetDefinedError,
)
from ...resources import ModelUtils
from ...state import update_types
from ...types import (
    ModuleLocation,
    LabwareLocationSequence,
    LabwareLocation,
    LoadedLabware,
)
from opentrons.hardware_control.modules.types import PlatformState
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from ..flex_stacker.retrieve import RetrieveResult

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.state.module_substates import FlexStackerSubState
    from opentrons.protocol_engine.execution import EquipmentHandler

UnsafeManualRetrieveCommandType = Literal["unsafe/manualRetrieve"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class UnsafeManualRetrieveParams(BaseModel):
    """Input parameters for a labware retrieval command."""

    moduleId: str = Field(
        ...,
        description="Unique ID of the Flex Stacker.",
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
        json_schema_extra=_remove_default,
    )
    adapterId: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional ID to assign to an adapter. If None, an ID "
        "will be generated.",
        json_schema_extra=_remove_default,
    )
    lidId: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional ID to assign to a lid. If None, an ID "
        "will be generated.",
        json_schema_extra=_remove_default,
    )


class UnsafeManualRetrieveResult(RetrieveResult):
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


_ExecuteReturn = Union[
    SuccessData[UnsafeManualRetrieveResult],
    DefinedErrorData[FlexStackerStallOrCollisionError],
]


class UnsafeManualRetrieveImpl(
    AbstractCommandImpl[UnsafeManualRetrieveParams, _ExecuteReturn]
):
    """Implementation of a labware retrieval command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment
        self._model_utils = model_utils

    async def _load_labware_from_pool(
        self, params: UnsafeManualRetrieveParams, stacker_state: FlexStackerSubState
    ) -> tuple[UnsafeManualRetrieveResult, update_types.StateUpdate]:
        state_update = update_types.StateUpdate()

        # Always load the primary labware
        if stacker_state.pool_primary_definition is None:
            raise CannotPerformModuleAction(
                f"Flex Stacker {params.moduleId} has no labware to manually retrieve."
            )

        # Load the Stacker Pool Labwares
        loaded_labware_pool = await self._equipment.load_labware_pool_from_definitions(
            pool_primary_definition=stacker_state.pool_primary_definition,
            pool_adapter_definition=stacker_state.pool_adapter_definition,
            pool_lid_definition=stacker_state.pool_lid_definition,
            location=ModuleLocation(moduleId=params.moduleId),
            primary_id=params.labwareId,
            adapter_id=params.labwareId,
            lid_id=params.lidId,
        )

        # Dictionaries for state updates and location sequencing
        definitions_by_id: dict[str, LabwareDefinition] = {}
        definitions_by_id[
            loaded_labware_pool.primary_labware.id
        ] = stacker_state.pool_primary_definition
        offset_ids_by_id: dict[str, Optional[str]] = {}
        display_names_by_id: dict[str, str | None] = {}
        new_locations_by_id: dict[str, LabwareLocation] = {}
        labware_by_id: dict[str, LoadedLabware] = {}

        for loaded_labware in (
            loaded_labware_pool.primary_labware,
            loaded_labware_pool.adapter_labware,
            loaded_labware_pool.lid_labware,
        ):
            if loaded_labware:
                offset_ids_by_id[loaded_labware.id] = loaded_labware.offsetId
                display_names_by_id[loaded_labware.id] = loaded_labware.displayName
                new_locations_by_id[loaded_labware.id] = loaded_labware.location
                labware_by_id[loaded_labware.id] = loaded_labware
        if loaded_labware_pool.adapter_labware and stacker_state.pool_adapter_definition is not None:
            definitions_by_id[
                loaded_labware_pool.adapter_labware.id
            ] = stacker_state.pool_adapter_definition
        if loaded_labware_pool.lid_labware and stacker_state.pool_lid_definition is not None:
            definitions_by_id[
                loaded_labware_pool.lid_labware.id
            ] = stacker_state.pool_lid_definition

        # Get the labware dimensions for the labware being retrieved,
        # which is the first one in the hopper labware id list
        primary_location_sequence = (
            self._state_view.geometry.get_predicted_location_sequence(
                new_locations_by_id[loaded_labware_pool.primary_labware.id],
                labware_by_id,
            )
        )
        adapter_location_sequence = (
            self._state_view.geometry.get_predicted_location_sequence(
                new_locations_by_id[loaded_labware_pool.adapter_labware.id],
                labware_by_id,
            )
            if loaded_labware_pool.adapter_labware is not None
            else None
        )
        lid_location_sequence = (
            self._state_view.geometry.get_predicted_location_sequence(
                new_locations_by_id[loaded_labware_pool.lid_labware.id],
                labware_by_id,
            )
            if loaded_labware_pool.lid_labware is not None
            else None
        )

        state_update.set_batch_loaded_labware(
            definitions_by_id=definitions_by_id,
            display_names_by_id=display_names_by_id,
            offset_ids_by_id=offset_ids_by_id,
            new_locations_by_id=new_locations_by_id,
        )
        state_update.update_flex_stacker_labware_pool_count(
            module_id=params.moduleId, count=stacker_state.pool_count - 1
        )

        if loaded_labware_pool.lid_labware is not None:
            state_update.set_lids(
                parent_labware_ids=[loaded_labware_pool.primary_labware.id],
                lid_ids=[loaded_labware_pool.lid_labware.id],
            )

        return (
            UnsafeManualRetrieveResult(
                labwareId=loaded_labware_pool.primary_labware.id,
                adapterId=loaded_labware_pool.adapter_labware.id
                if loaded_labware_pool.adapter_labware is not None
                else None,
                lidId=loaded_labware_pool.lid_labware.id
                if loaded_labware_pool.lid_labware is not None
                else None,
                primaryLocationSequence=primary_location_sequence,
                adapterLocationSequence=adapter_location_sequence,
                lidLocationSequence=lid_location_sequence,
                primaryLabwareURI=loaded_labware_pool.primary_labware.definitionUri,
                adapterLabwareURI=loaded_labware_pool.adapter_labware.definitionUri
                if loaded_labware_pool.adapter_labware is not None
                else None,
                lidLabwareURI=loaded_labware_pool.lid_labware.definitionUri
                if loaded_labware_pool.lid_labware is not None
                else None,
            ),
            state_update,
        )

    async def execute(self, params: UnsafeManualRetrieveParams) -> _ExecuteReturn:
        """Execute the labware retrieval command."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )

        pool_definitions = stacker_state.get_pool_definition_ordered_list()
        if pool_definitions is None:
            location = self._state_view.modules.get_location(params.moduleId)
            raise FlexStackerLabwarePoolNotYetDefinedError(
                message=f"The Flex Stacker in {location} has not been configured yet and cannot be filled."
            )

        if stacker_state.pool_count == 0:
            raise CannotPerformModuleAction(
                message="Cannot retrieve labware from Flex Stacker because it contains no labware"
            )

        stacker_loc = ModuleLocation(moduleId=params.moduleId)
        # Allow propagation of ModuleNotAttachedError.
        stacker_hw = self._equipment.get_module_hardware_api(stacker_state.module_id)

        # Validate that the stacker is fully in the gripper position
        if (
            stacker_hw is not None
            and stacker_hw.platform_state != PlatformState.EXTENDED
        ):
            raise CannotPerformModuleAction(
                "Cannot manually retrieve a labware from Flex Stacker if the carriage is not in gripper position."
            )

        try:
            # In theory given this is an unsafe manual retrieve this should never raise
            self._state_view.labware.raise_if_labware_in_location(stacker_loc)
        except LocationIsOccupiedError:
            raise CannotPerformModuleAction(
                "Cannot retrieve a labware from Flex Stacker if the carriage is occupied"
            )

        retrieve_result, state_update = await self._load_labware_from_pool(
            params, stacker_state
        )

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

        return SuccessData(
            public=retrieve_result,
            state_update=state_update,
        )


class UnsafeManualRetrieve(
    BaseCommand[UnsafeManualRetrieveParams, UnsafeManualRetrieveResult, ErrorOccurrence]
):
    """A command to manually retrieve a labware from a Flex Stacker."""

    commandType: UnsafeManualRetrieveCommandType = "unsafe/manualRetrieve"
    params: UnsafeManualRetrieveParams
    result: UnsafeManualRetrieveResult | None = None

    _ImplementationCls: Type[UnsafeManualRetrieveImpl] = UnsafeManualRetrieveImpl


class UnsafeManualRetrieveCreate(BaseCommandCreate[UnsafeManualRetrieveParams]):
    """A request to execute a Flex Stacker manual retrieve command."""

    commandType: UnsafeManualRetrieveCommandType = "unsafe/manualRetrieve"
    params: UnsafeManualRetrieveParams

    _CommandCls: Type[UnsafeManualRetrieve] = UnsafeManualRetrieve
