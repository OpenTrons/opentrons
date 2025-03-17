"""Command models to retrieve a labware from a Flex Stacker."""

from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING, Type, Union

from pydantic import BaseModel, Field

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
    LabwareNotLoadedOnModuleError,
    FlexStackerLabwarePoolNotYetDefinedError,
)
from ...resources import ModelUtils
from ...state import update_types
from ...types import (
    LabwareLocationSequence,
    InStackerHopperLocation,
)

from opentrons_shared_data.errors.exceptions import FlexStackerStallError
from opentrons.calibration_storage.helpers import uri_from_details


if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.state.module_substates import FlexStackerSubState
    from opentrons.protocol_engine.execution import EquipmentHandler


StoreCommandType = Literal["flexStacker/store"]


class StoreParams(BaseModel):
    """Input parameters for a labware storage command."""

    moduleId: str = Field(
        ...,
        description="Unique ID of the flex stacker.",
    )


class StoreResult(BaseModel):
    """Result data from a labware storage command."""

    eventualDestinationLocationSequence: LabwareLocationSequence | None = Field(
        None,
        description=(
            "The full location in which all labware moved by this command will eventually reside."
        ),
    )
    primaryOriginLocationSequence: LabwareLocationSequence | None = Field(
        None, description=("The origin location of the primary labware.")
    )
    primaryLabwareId: str | None = Field(
        None, description="The primary labware in the stack that was stored."
    )
    adapterOriginLocationSequence: LabwareLocationSequence | None = Field(
        None, description=("The origin location of the adapter labware, if any.")
    )
    adapterLabwareId: str | None = Field(
        None, description="The adapter in the stack that was stored, if any."
    )
    lidOriginLocationSequence: LabwareLocationSequence | None = Field(
        None, description=("The origin location of the lid labware, if any.")
    )
    lidLabwareId: str | None = Field(
        None, description="The lid in the stack that was stored, if any."
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
    SuccessData[StoreResult],
    DefinedErrorData[FlexStackerStallOrCollisionError],
]


class StoreImpl(AbstractCommandImpl[StoreParams, _ExecuteReturn]):
    """Implementation of a labware storage command."""

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

    def _verify_labware_to_store(
        self, params: StoreParams, stacker_state: FlexStackerSubState
    ) -> tuple[str, str | None, str | None]:
        try:
            bottom_id = self._state_view.labware.get_id_by_module(params.moduleId)
        except LabwareNotLoadedOnModuleError:
            raise CannotPerformModuleAction(
                "Cannot store labware if Flex Stacker carriage is empty"
            )
        labware_ids = self._state_view.labware.get_labware_stack_from_parent(bottom_id)
        labware_defs = [
            self._state_view.labware.get_definition(id) for id in labware_ids
        ]

        lid_id: str | None = None

        pool_list = stacker_state.get_pool_definition_ordered_list()
        assert pool_list is not None
        if len(labware_ids) != len(pool_list):
            raise CannotPerformModuleAction(
                "Cannot store labware stack that does not correspond with Flex Stacker configuration"
            )
        if stacker_state.pool_lid_definition is not None:
            if labware_defs[-1] != stacker_state.pool_lid_definition:
                raise CannotPerformModuleAction(
                    "Cannot store labware stack that does not correspond with Flex Stacker configuration"
                )
            lid_id = labware_ids[-1]

        if stacker_state.pool_adapter_definition is not None:
            if (
                labware_defs[0] != stacker_state.pool_adapter_definition
                or labware_defs[1] != stacker_state.pool_primary_definition
            ):
                raise CannotPerformModuleAction(
                    "Cannot store labware stack that does not correspond with Flex Stacker configuration"
                )
            else:
                return labware_ids[1], labware_ids[0], lid_id
        else:
            if labware_defs[0] != stacker_state.pool_primary_definition:
                raise CannotPerformModuleAction(
                    "Cannot store labware stack that does not correspond with Flex Stacker configuration"
                )
            return labware_ids[0], None, lid_id

    async def execute(self, params: StoreParams) -> _ExecuteReturn:
        """Execute the labware storage command."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )

        if stacker_state.pool_count == stacker_state.max_pool_count:
            raise CannotPerformModuleAction(
                "Cannot store labware in Flex Stacker while it is full"
            )

        pool_definitions = stacker_state.get_pool_definition_ordered_list()
        if pool_definitions is None:
            raise FlexStackerLabwarePoolNotYetDefinedError(
                message="The Flex Stacker has not been configured yet and cannot be filled."
            )

        primary_id, maybe_adapter_id, maybe_lid_id = self._verify_labware_to_store(
            params, stacker_state
        )

        # Allow propagation of ModuleNotAttachedError.
        stacker_hw = self._equipment.get_module_hardware_api(stacker_state.module_id)

        eventual_target_location_sequence = (
            self._state_view.geometry.get_predicted_location_sequence(
                InStackerHopperLocation(moduleId=params.moduleId)
            )
        )
        stack_height = self._state_view.geometry.get_height_of_labware_stack(
            pool_definitions
        )

        state_update = update_types.StateUpdate()
        try:
            if stacker_hw is not None:
                await stacker_hw.store_labware(labware_height=stack_height)
        except FlexStackerStallError as e:
            return DefinedErrorData(
                public=FlexStackerStallOrCollisionError(
                    id=self._model_utils.generate_id(),
                    createdAt=self._model_utils.get_timestamp(),
                    wrappedErrors=[
                        ErrorOccurrence.from_failed(
                            id=self._model_utils.generate_id(),
                            createdAt=self._model_utils.get_timestamp(),
                            error=e,
                        )
                    ],
                ),
            )

        id_list = [
            id for id in (primary_id, maybe_adapter_id, maybe_lid_id) if id is not None
        ]

        state_update.set_batch_labware_location(
            new_locations_by_id={
                id: InStackerHopperLocation(moduleId=params.moduleId) for id in id_list
            },
            new_offset_ids_by_id={id: None for id in id_list},
        )

        state_update.update_flex_stacker_labware_pool_count(
            module_id=params.moduleId, count=stacker_state.pool_count + 1
        )
        if stacker_state.pool_primary_definition is None:
            raise FlexStackerLabwarePoolNotYetDefinedError(
                "The Primary Labware must be defined in the stacker pool."
            )

        return SuccessData(
            public=StoreResult(
                eventualDestinationLocationSequence=eventual_target_location_sequence,
                primaryOriginLocationSequence=self._state_view.geometry.get_location_sequence(
                    primary_id
                ),
                primaryLabwareId=primary_id,
                adapterOriginLocationSequence=(
                    self._state_view.geometry.get_location_sequence(maybe_adapter_id)
                    if maybe_adapter_id is not None
                    else None
                ),
                adapterLabwareId=maybe_adapter_id,
                lidOriginLocationSequence=(
                    self._state_view.geometry.get_location_sequence(maybe_lid_id)
                    if maybe_lid_id is not None
                    else None
                ),
                lidLabwareId=maybe_lid_id,
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


class Store(BaseCommand[StoreParams, StoreResult, ErrorOccurrence]):
    """A command to store a labware in a Flex Stacker."""

    commandType: StoreCommandType = "flexStacker/store"
    params: StoreParams
    result: Optional[StoreResult] = None

    _ImplementationCls: Type[StoreImpl] = StoreImpl


class StoreCreate(BaseCommandCreate[StoreParams]):
    """A request to execute a Flex Stacker store command."""

    commandType: StoreCommandType = "flexStacker/store"
    params: StoreParams

    _CommandCls: Type[Store] = Store
