"""Load lid stack command request, result, and implementation models."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Optional, Type, List, Any
from pydantic.json_schema import SkipJsonSchema
from typing_extensions import Literal

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from ..errors import LabwareIsNotAllowedInLocationError, ProtocolEngineError
from ..resources import fixture_validation, labware_validation
from ..types import (
    LoadableLabwareLocation,
    SYSTEM_LOCATION,
    OnLabwareLocation,
    DeckSlotLocation,
    AddressableAreaLocation,
    LabwareLocationSequence,
    OnLabwareLocationSequenceComponent,
)

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence
from ..state.update_types import StateUpdate

if TYPE_CHECKING:
    from ..state.state import StateView
    from ..execution import LoadedLabwareData, EquipmentHandler


LoadLidStackCommandType = Literal["loadLidStack"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


_LID_STACK_PE_LABWARE = "protocol_engine_lid_stack_object"
_LID_STACK_PE_NAMESPACE = "opentrons"
_LID_STACK_PE_VERSION = 1


class LoadLidStackParams(BaseModel):
    """Payload required to load a lid stack onto a location."""

    location: LoadableLabwareLocation = Field(
        ...,
        description="Location the lid stack should be loaded into.",
    )
    loadName: str = Field(
        ...,
        description="Name used to reference a lid labware definition.",
    )
    namespace: str = Field(
        ...,
        description="The namespace the lid labware definition belongs to.",
    )
    version: int = Field(
        ...,
        description="The lid labware definition version.",
    )
    stackLabwareId: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional ID to assign to the lid stack labware object created."
        "If None, an ID will be generated.",
        json_schema_extra=_remove_default,
    )
    labwareIds: List[str] | SkipJsonSchema[None] = Field(
        None,
        description="An optional list of IDs to assign to the lids in the stack."
        "If None, an ID will be generated.",
        json_schema_extra=_remove_default,
    )
    quantity: int = Field(
        ...,
        description="The quantity of lids to load.",
    )


class LoadLidStackResult(BaseModel):
    """Result data from the execution of a LoadLidStack command."""

    stackLabwareId: str = Field(
        ...,
        description="An ID to reference the lid stack labware object created.",
    )
    labwareIds: List[str] = Field(
        ...,
        description="A list of lid labware IDs to reference the lids in this stack by. The first ID is the bottom of the stack.",
    )
    definition: LabwareDefinition | None = Field(
        ...,
        description="The full definition data for this lid labware.",
    )
    location: LoadableLabwareLocation = Field(
        ..., description="The Location that the stack of lid labware has been loaded."
    )
    lidStackDefinition: LabwareDefinition | None = Field(
        None,
        description="The definition of the lid stack object. Optional for backwards-compatibility.",
    )
    stackLocationSequence: LabwareLocationSequence | None = Field(
        None,
        description="The location sequence for the lid stack labware object created.",
    )
    locationSequences: List[LabwareLocationSequence] | None = Field(
        None,
        description="The location sequences for the lids just loaded into the stack. These are in the same order as labwareIds.",
    )


class LoadLidStackImplementation(
    AbstractCommandImpl[LoadLidStackParams, SuccessData[LoadLidStackResult]]
):
    """Load lid stack command implementation."""

    def __init__(
        self, equipment: EquipmentHandler, state_view: StateView, **kwargs: object
    ) -> None:
        self._equipment = equipment
        self._state_view = state_view

    def _validate_location(self, params: LoadLidStackParams) -> LoadableLabwareLocation:
        if isinstance(params.location, AddressableAreaLocation):
            area_name = params.location.addressableAreaName
            if not (
                fixture_validation.is_deck_slot(params.location.addressableAreaName)
                or fixture_validation.is_abs_reader(params.location.addressableAreaName)
            ):
                raise LabwareIsNotAllowedInLocationError(
                    f"Cannot load {params.loadName} onto addressable area {area_name}"
                )
            self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
                area_name
            )
        elif isinstance(params.location, DeckSlotLocation):
            self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
                params.location.slotName.id
            )
        if params.quantity <= 0 and params.location != SYSTEM_LOCATION:
            raise ProtocolEngineError(
                message="Lid Stack Labware Object with quantity 0 must be loaded onto System Location."
            )
        return self._state_view.geometry.ensure_location_not_occupied(params.location)

    def _format_results(
        self,
        verified_location: LoadableLabwareLocation,
        lid_stack_object: LoadedLabwareData,
        loaded_lid_labwares: list[LoadedLabwareData],
        lid_labware_definition: LabwareDefinition | None,
    ) -> SuccessData[LoadLidStackResult]:
        stack_location_sequence = (
            self._state_view.geometry.get_predicted_location_sequence(verified_location)
        )
        loaded_lid_locations_by_id: dict[str, OnLabwareLocation] = {}
        loaded_lid_ids_ordered: list[str] = []
        loaded_lid_location_sequences_ordered: list[LabwareLocationSequence] = []
        lid_location_sequence_accumulated: LabwareLocationSequence = [
            OnLabwareLocationSequenceComponent(
                labwareId=lid_stack_object.labware_id, lidId=None
            )
        ] + stack_location_sequence
        load_location = OnLabwareLocation(labwareId=lid_stack_object.labware_id)
        last_lid_id: str | None = None
        for loaded_lid in loaded_lid_labwares:
            loaded_lid_locations_by_id[loaded_lid.labware_id] = load_location
            loaded_lid_ids_ordered.append(loaded_lid.labware_id)
            if last_lid_id is None:
                last_lid_id = loaded_lid.labware_id
            else:
                lid_location_sequence_accumulated = [
                    OnLabwareLocationSequenceComponent(
                        labwareId=last_lid_id, lidId=None
                    )
                ] + lid_location_sequence_accumulated
                last_lid_id = loaded_lid.labware_id
            loaded_lid_location_sequences_ordered.append(
                [loc for loc in lid_location_sequence_accumulated]
            )
            load_location = OnLabwareLocation(labwareId=loaded_lid.labware_id)

        state_update = StateUpdate()
        state_update.set_loaded_lid_stack(
            stack_id=lid_stack_object.labware_id,
            stack_object_definition=lid_stack_object.definition,
            stack_location=verified_location,
            locations=loaded_lid_locations_by_id,
            labware_definition=lid_labware_definition,
        )

        return SuccessData(
            public=LoadLidStackResult(
                stackLabwareId=lid_stack_object.labware_id,
                lidStackDefinition=lid_stack_object.definition,
                labwareIds=loaded_lid_ids_ordered,
                definition=lid_labware_definition,
                location=verified_location,
                stackLocationSequence=stack_location_sequence,
                locationSequences=loaded_lid_location_sequences_ordered,
            ),
            state_update=state_update,
        )

    async def execute(
        self, params: LoadLidStackParams
    ) -> SuccessData[LoadLidStackResult]:
        """Load definition and calibration data necessary for a lid stack."""
        verified_location = self._validate_location(params)

        lid_stack_object = await self._equipment.load_labware(
            load_name=_LID_STACK_PE_LABWARE,
            namespace=_LID_STACK_PE_NAMESPACE,
            version=_LID_STACK_PE_VERSION,
            location=verified_location,
            labware_id=params.stackLabwareId,
        )

        if not labware_validation.validate_definition_is_system(
            lid_stack_object.definition
        ):
            raise ProtocolEngineError(
                message="Lid Stack Labware Object Labware Definition does not contain required allowed role 'system'."
            )

        loaded_lid_labwares: list[LoadedLabwareData] = []
        lid_labware_definition: LabwareDefinition | None = None

        if params.quantity > 0:
            loaded_lid_labwares = await self._equipment.load_lids(
                load_name=params.loadName,
                namespace=params.namespace,
                version=params.version,
                location=OnLabwareLocation(labwareId=lid_stack_object.labware_id),
                quantity=params.quantity,
                labware_ids=params.labwareIds,
            )
            lid_labware_definition = loaded_lid_labwares[-1].definition
            if isinstance(verified_location, OnLabwareLocation):
                self._state_view.labware.raise_if_labware_cannot_be_stacked(
                    top_labware_definition=lid_labware_definition,
                    bottom_labware_id=verified_location.labwareId,
                )

        return self._format_results(
            verified_location,
            lid_stack_object,
            loaded_lid_labwares,
            lid_labware_definition,
        )


class LoadLidStack(
    BaseCommand[LoadLidStackParams, LoadLidStackResult, ErrorOccurrence]
):
    """Load lid stack command resource model."""

    commandType: LoadLidStackCommandType = "loadLidStack"
    params: LoadLidStackParams
    result: Optional[LoadLidStackResult] = None

    _ImplementationCls: Type[LoadLidStackImplementation] = LoadLidStackImplementation


class LoadLidStackCreate(BaseCommandCreate[LoadLidStackParams]):
    """Load lid stack command creation request."""

    commandType: LoadLidStackCommandType = "loadLidStack"
    params: LoadLidStackParams

    _CommandCls: Type[LoadLidStack] = LoadLidStack
