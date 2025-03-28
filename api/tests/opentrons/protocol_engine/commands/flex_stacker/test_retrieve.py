"""Test Flex Stacker retrieve command implementation."""

from datetime import datetime

import pytest
from decoy import Decoy, matchers
from typing import Type, Union

from opentrons.drivers.flex_stacker.types import StackerAxis
from opentrons.hardware_control.modules import FlexStacker, PlatformState
from opentrons.protocol_engine.commands.flex_stacker.common import (
    FlexStackerStallOrCollisionError,
    FlexStackerShuttleError,
)
from opentrons.protocol_engine.resources import ModelUtils

from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.update_types import (
    StateUpdate,
    FlexStackerStateUpdate,
    BatchLoadedLabwareUpdate,
    AddressableAreaUsedUpdate,
    LabwareLidUpdate,
)
from opentrons.protocol_engine.state.module_substates import (
    FlexStackerSubState,
    FlexStackerId,
)
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.commands import flex_stacker
from opentrons.protocol_engine.commands.command import SuccessData, DefinedErrorData
from opentrons.protocol_engine.commands.flex_stacker.retrieve import RetrieveImpl
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    ModuleLocation,
    ModuleModel,
    LoadedModule,
    OnModuleLocationSequenceComponent,
    OnAddressableAreaLocationSequenceComponent,
    OnCutoutFixtureLocationSequenceComponent,
    LabwareLocationSequence,
    OnLabwareLocation,
    OnLabwareLocationSequenceComponent,
    LoadedLabware,
)
from opentrons.protocol_engine.errors import CannotPerformModuleAction
from opentrons.types import DeckSlotName
from opentrons.protocol_engine.execution import LoadedLabwareData
from opentrons.protocol_engine.execution.equipment import LoadedLabwarePoolData

from opentrons_shared_data.labware.labware_definition import (
    LabwareDefinition,
)
from opentrons_shared_data.errors.exceptions import (
    FlexStackerStallError,
    FlexStackerShuttleMissingError,
)


def _prep_stacker_own_location(
    decoy: Decoy, state_view: StateView, stacker_id: str
) -> None:
    decoy.when(state_view.modules.get_location(stacker_id)).then_return(
        DeckSlotLocation(slotName=DeckSlotName(value="B3")),
    )
    decoy.when(state_view.modules.get(stacker_id)).then_return(
        LoadedModule(
            id=stacker_id,
            location=DeckSlotLocation(slotName=DeckSlotName(value="B3")),
            model=ModuleModel.FLEX_STACKER_MODULE_V1,
            serialNumber="HIIIII",
        )
    )
    decoy.when(
        state_view.modules.ensure_and_convert_module_fixture_location(
            deck_slot=DeckSlotName("B3"), model=ModuleModel.FLEX_STACKER_MODULE_V1
        )
    ).then_return("flexStackerV1B4")


def _stacker_base_loc_seq(stacker_id: str) -> LabwareLocationSequence:
    return [
        OnAddressableAreaLocationSequenceComponent(
            addressableAreaName="flexStackerV1B4"
        ),
        OnModuleLocationSequenceComponent(moduleId=stacker_id),
        OnCutoutFixtureLocationSequenceComponent(
            cutoutId="cutoutB3", possibleCutoutFixtureIds=["flexStackerModuleV1"]
        ),
    ]


@pytest.fixture
def subject(
    state_view: StateView, equipment: EquipmentHandler, model_utils: ModelUtils
) -> RetrieveImpl:
    """Get a retrieve command to test."""
    return RetrieveImpl(
        state_view=state_view, equipment=equipment, model_utils=model_utils
    )


async def test_retrieve_raises_when_empty(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: RetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    stacker_id: FlexStackerId,
) -> None:
    """It should raise an exception when called on an empty pool."""
    data = flex_stacker.RetrieveParams(moduleId=stacker_id)

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=flex_50uL_tiprack,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=0,
        max_pool_count=5,
        pool_overlap=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)

    with pytest.raises(
        CannotPerformModuleAction,
        match="Cannot retrieve labware from Flex Stacker because it contains no labware",
    ):
        await subject.execute(data)


async def test_retrieve_primary_only(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: RetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should be able to retrieve a labware."""
    data = flex_stacker.RetrieveParams(moduleId=stacker_id)

    loaded_labware = LoadedLabware(
        id="labware-id",
        loadName="opentrons_flex_96_filtertiprack_50ul",
        definitionUri="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
        lid_id=None,
        offsetId=None,
        displayName="Opentrons Flex 96 Filter Tip Rack 50 µL",
        location=ModuleLocation(moduleId=stacker_id),
    )

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=flex_50uL_tiprack,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=1,
        max_pool_count=5,
        pool_overlap=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)

    decoy.when(
        await equipment.load_labware_pool_from_definitions(
            pool_primary_definition=flex_50uL_tiprack,
            pool_adapter_definition=None,
            pool_lid_definition=None,
            location=ModuleLocation(moduleId=stacker_id),
            primary_id=None,
            adapter_id=None,
            lid_id=None,
        )
    ).then_return(
        LoadedLabwarePoolData(
            primary_labware=loaded_labware, adapter_labware=None, lid_labware=None
        )
    )

    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            ModuleLocation(moduleId=stacker_id),
            {loaded_labware.id: loaded_labware},
        )
    ).then_return(_stacker_base_loc_seq(stacker_id))

    decoy.when(
        state_view.geometry.get_height_of_labware_stack(definitions=[flex_50uL_tiprack])
    ).then_return(4)

    _prep_stacker_own_location(decoy, state_view, stacker_id)

    result = await subject.execute(data)

    decoy.verify(await stacker_hardware.dispense_labware(labware_height=4), times=1)

    assert result == SuccessData(
        public=flex_stacker.RetrieveResult(
            labwareId="labware-id",
            primaryLocationSequence=_stacker_base_loc_seq(stacker_id),
            primaryLabwareURI="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
        ),
        state_update=StateUpdate(
            batch_loaded_labware=BatchLoadedLabwareUpdate(
                new_locations_by_id={"labware-id": ModuleLocation(moduleId=stacker_id)},
                offset_ids_by_id={"labware-id": None},
                display_names_by_id={
                    "labware-id": "Opentrons Flex 96 Filter Tip Rack 50 µL"
                },
                definitions_by_id={"labware-id": flex_50uL_tiprack},
            ),
            flex_stacker_state_update=FlexStackerStateUpdate(
                module_id=stacker_id,
                pool_count=0,
            ),
            addressable_area_used=AddressableAreaUsedUpdate(
                addressable_area_name="flexStackerV1B4"
            ),
        ),
    )


async def test_retrieve_primary_and_lid(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: RetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    tiprack_lid_def: LabwareDefinition,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should be able to retrieve a labware with a lid on it."""
    data = flex_stacker.RetrieveParams(moduleId=stacker_id)

    loaded_labware = LoadedLabware(
        id="labware-id",
        loadName="opentrons_flex_96_filtertiprack_50ul",
        definitionUri="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
        lid_id=None,
        offsetId=None,
        displayName="Opentrons Flex 96 Filter Tip Rack 50 µL",
        location=ModuleLocation(moduleId=stacker_id),
    )

    loaded_lid = LoadedLabware(
        id="lid-id",
        loadName="opentrons_flex_tiprack_lid",
        definitionUri="opentrons/opentrons_flex_tiprack_lid/1",
        lid_id=None,
        offsetId=None,
        displayName="Opentrons Flex Tiprack Lid",
        location=OnLabwareLocation(labwareId="labware-id"),
    )

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=flex_50uL_tiprack,
        pool_adapter_definition=None,
        pool_lid_definition=tiprack_lid_def,
        pool_count=1,
        max_pool_count=5,
        pool_overlap=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)

    decoy.when(
        await equipment.load_labware_pool_from_definitions(
            pool_primary_definition=flex_50uL_tiprack,
            pool_adapter_definition=None,
            pool_lid_definition=tiprack_lid_def,
            location=ModuleLocation(moduleId=stacker_id),
            primary_id=None,
            adapter_id=None,
            lid_id=None,
        )
    ).then_return(
        LoadedLabwarePoolData(
            primary_labware=loaded_labware, adapter_labware=None, lid_labware=loaded_lid
        )
    )

    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            ModuleLocation(moduleId=stacker_id),
            {
                "labware-id": loaded_labware,
                "lid-id": loaded_lid,
            },
        )
    ).then_return(_stacker_base_loc_seq(stacker_id))
    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            OnLabwareLocation(labwareId="labware-id"),
            {
                "labware-id": loaded_labware,
                "lid-id": loaded_lid,
            },
        )
    ).then_return(
        [OnLabwareLocationSequenceComponent(labwareId="labware-id", lidId="lid-id")]
        + _stacker_base_loc_seq(stacker_id)
    )

    decoy.when(
        state_view.geometry.get_height_of_labware_stack(
            definitions=[tiprack_lid_def, flex_50uL_tiprack]
        )
    ).then_return(8)

    _prep_stacker_own_location(decoy, state_view, stacker_id)
    result = await subject.execute(data)

    decoy.verify(await stacker_hardware.dispense_labware(labware_height=8), times=1)

    assert result == SuccessData(
        public=flex_stacker.RetrieveResult(
            labwareId="labware-id",
            lidId="lid-id",
            primaryLocationSequence=_stacker_base_loc_seq(stacker_id),
            primaryLabwareURI="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
            lidLocationSequence=(
                [
                    OnLabwareLocationSequenceComponent(
                        labwareId="labware-id", lidId="lid-id"
                    )
                ]
                + _stacker_base_loc_seq(stacker_id)
            ),
            lidLabwareURI="opentrons/opentrons_flex_tiprack_lid/1",
        ),
        state_update=StateUpdate(
            batch_loaded_labware=BatchLoadedLabwareUpdate(
                new_locations_by_id={
                    "labware-id": ModuleLocation(moduleId=stacker_id),
                    "lid-id": OnLabwareLocation(labwareId="labware-id"),
                },
                offset_ids_by_id={"labware-id": None, "lid-id": None},
                display_names_by_id={
                    "labware-id": "Opentrons Flex 96 Filter Tip Rack 50 µL",
                    "lid-id": "Opentrons Flex Tiprack Lid",
                },
                definitions_by_id={
                    "labware-id": flex_50uL_tiprack,
                    "lid-id": tiprack_lid_def,
                },
            ),
            flex_stacker_state_update=FlexStackerStateUpdate(
                module_id=stacker_id,
                pool_count=0,
            ),
            addressable_area_used=AddressableAreaUsedUpdate(
                addressable_area_name="flexStackerV1B4"
            ),
            labware_lid=LabwareLidUpdate(
                parent_labware_ids=["labware-id"], lid_ids=["lid-id"]
            ),
        ),
    )


async def test_retrieve_primary_and_adapter(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: RetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    tiprack_adapter_def: LabwareDefinition,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should be able to retrieve a labware on an adapter."""
    data = flex_stacker.RetrieveParams(moduleId=stacker_id)

    loaded_adapter = LoadedLabware(
        id="adapter-id",
        loadName="opentrons_flex_96_tiprack_adapter",
        definitionUri="opentrons/opentrons_flex_96_tiprack_adapter/1",
        lid_id=None,
        offsetId=None,
        displayName="Opentrons Flex 96 Tip Rack Adapter",
        location=ModuleLocation(moduleId=stacker_id),
    )

    loaded_labware = LoadedLabware(
        id="labware-id",
        loadName="opentrons_flex_96_filtertiprack_50ul",
        definitionUri="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
        lid_id=None,
        offsetId=None,
        displayName="Opentrons Flex 96 Filter Tip Rack 50 µL",
        location=OnLabwareLocation(labwareId=loaded_adapter.id),
    )

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=flex_50uL_tiprack,
        pool_adapter_definition=tiprack_adapter_def,
        pool_lid_definition=None,
        pool_count=1,
        max_pool_count=5,
        pool_overlap=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)
    decoy.when(
        await equipment.load_labware_from_definition(
            definition=tiprack_adapter_def,
            location=ModuleLocation(moduleId=stacker_id),
            labware_id=None,
            labware_pending_load={},
        )
    ).then_return(LoadedLabwareData("adapter-id", tiprack_adapter_def, None))

    decoy.when(
        await equipment.load_labware_pool_from_definitions(
            pool_primary_definition=flex_50uL_tiprack,
            pool_adapter_definition=tiprack_adapter_def,
            pool_lid_definition=None,
            location=ModuleLocation(moduleId=stacker_id),
            primary_id=None,
            adapter_id=None,
            lid_id=None,
        )
    ).then_return(
        LoadedLabwarePoolData(
            primary_labware=loaded_labware,
            adapter_labware=loaded_adapter,
            lid_labware=None,
        )
    )

    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            ModuleLocation(moduleId=stacker_id),
            {
                "adapter-id": loaded_adapter,
                "labware-id": loaded_labware,
            },
        )
    ).then_return(_stacker_base_loc_seq(stacker_id))
    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            OnLabwareLocation(labwareId="adapter-id"),
            {
                "adapter-id": loaded_adapter,
                "labware-id": loaded_labware,
            },
        )
    ).then_return(
        [OnLabwareLocationSequenceComponent(labwareId="adapter-id", lidId=None)]
        + _stacker_base_loc_seq(stacker_id)
    )

    decoy.when(
        state_view.geometry.get_height_of_labware_stack(
            definitions=[flex_50uL_tiprack, tiprack_adapter_def]
        )
    ).then_return(12)

    _prep_stacker_own_location(decoy, state_view, stacker_id)
    result = await subject.execute(data)

    decoy.verify(await stacker_hardware.dispense_labware(labware_height=12), times=1)

    assert result == SuccessData(
        public=flex_stacker.RetrieveResult(
            labwareId="labware-id",
            adapterId="adapter-id",
            primaryLocationSequence=(
                [OnLabwareLocationSequenceComponent(labwareId="adapter-id", lidId=None)]
                + _stacker_base_loc_seq(stacker_id)
            ),
            primaryLabwareURI="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
            adapterLocationSequence=_stacker_base_loc_seq(stacker_id),
            adapterLabwareURI="opentrons/opentrons_flex_96_tiprack_adapter/1",
        ),
        state_update=StateUpdate(
            batch_loaded_labware=BatchLoadedLabwareUpdate(
                new_locations_by_id={
                    "labware-id": OnLabwareLocation(labwareId="adapter-id"),
                    "adapter-id": ModuleLocation(moduleId=stacker_id),
                },
                offset_ids_by_id={"labware-id": None, "adapter-id": None},
                display_names_by_id={
                    "labware-id": "Opentrons Flex 96 Filter Tip Rack 50 µL",
                    "adapter-id": "Opentrons Flex 96 Tip Rack Adapter",
                },
                definitions_by_id={
                    "labware-id": flex_50uL_tiprack,
                    "adapter-id": tiprack_adapter_def,
                },
            ),
            flex_stacker_state_update=FlexStackerStateUpdate(
                module_id=stacker_id,
                pool_count=0,
            ),
            addressable_area_used=AddressableAreaUsedUpdate(
                addressable_area_name="flexStackerV1B4"
            ),
        ),
    )


async def test_retrieve_primary_adapter_and_lid(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: RetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    tiprack_adapter_def: LabwareDefinition,
    tiprack_lid_def: LabwareDefinition,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should be able to retrieve a labware on an adapter."""
    data = flex_stacker.RetrieveParams(moduleId=stacker_id)

    loaded_adapter = LoadedLabware(
        id="adapter-id",
        loadName="opentrons_flex_96_tiprack_adapter",
        definitionUri="opentrons/opentrons_flex_96_tiprack_adapter/1",
        lid_id=None,
        offsetId=None,
        displayName="Opentrons Flex 96 Tip Rack Adapter",
        location=ModuleLocation(moduleId=stacker_id),
    )

    loaded_labware = LoadedLabware(
        id="labware-id",
        loadName="opentrons_flex_96_filtertiprack_50ul",
        definitionUri="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
        lid_id=None,
        offsetId=None,
        displayName="Opentrons Flex 96 Filter Tip Rack 50 µL",
        location=OnLabwareLocation(labwareId=loaded_adapter.id),
    )

    loaded_lid = LoadedLabware(
        id="lid-id",
        loadName="opentrons_flex_tiprack_lid",
        definitionUri="opentrons/opentrons_flex_tiprack_lid/1",
        lid_id=None,
        offsetId=None,
        displayName="Opentrons Flex Tiprack Lid",
        location=OnLabwareLocation(labwareId="labware-id"),
    )

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=flex_50uL_tiprack,
        pool_adapter_definition=tiprack_adapter_def,
        pool_lid_definition=tiprack_lid_def,
        pool_count=1,
        max_pool_count=5,
        pool_overlap=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)

    decoy.when(
        await equipment.load_labware_pool_from_definitions(
            pool_primary_definition=flex_50uL_tiprack,
            pool_adapter_definition=tiprack_adapter_def,
            pool_lid_definition=tiprack_lid_def,
            location=ModuleLocation(moduleId=stacker_id),
            primary_id=None,
            adapter_id=None,
            lid_id=None,
        )
    ).then_return(
        LoadedLabwarePoolData(
            primary_labware=loaded_labware,
            adapter_labware=loaded_adapter,
            lid_labware=loaded_lid,
        )
    )

    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            ModuleLocation(moduleId=stacker_id),
            {
                "adapter-id": loaded_adapter,
                "labware-id": loaded_labware,
                "lid-id": loaded_lid,
            },
        )
    ).then_return(_stacker_base_loc_seq(stacker_id))
    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            OnLabwareLocation(labwareId="adapter-id"),
            {
                "adapter-id": loaded_adapter,
                "labware-id": loaded_labware,
                "lid-id": loaded_lid,
            },
        )
    ).then_return(
        [OnLabwareLocationSequenceComponent(labwareId="adapter-id", lidId=None)]
        + _stacker_base_loc_seq(stacker_id)
    )
    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            OnLabwareLocation(labwareId="labware-id"),
            {
                "adapter-id": loaded_adapter,
                "labware-id": loaded_labware,
                "lid-id": loaded_lid,
            },
        )
    ).then_return(
        [
            OnLabwareLocationSequenceComponent(labwareId="labware-id", lidId="lid-id"),
            OnLabwareLocationSequenceComponent(labwareId="adapter-id", lidId=None),
        ]
        + _stacker_base_loc_seq(stacker_id)
    )

    decoy.when(
        state_view.geometry.get_height_of_labware_stack(
            definitions=[tiprack_lid_def, flex_50uL_tiprack, tiprack_adapter_def]
        )
    ).then_return(16)

    _prep_stacker_own_location(decoy, state_view, stacker_id)
    result = await subject.execute(data)

    decoy.verify(await stacker_hardware.dispense_labware(labware_height=16), times=1)

    assert result == SuccessData(
        public=flex_stacker.RetrieveResult(
            labwareId="labware-id",
            adapterId="adapter-id",
            lidId="lid-id",
            primaryLocationSequence=(
                [OnLabwareLocationSequenceComponent(labwareId="adapter-id", lidId=None)]
                + _stacker_base_loc_seq(stacker_id)
            ),
            primaryLabwareURI="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
            adapterLocationSequence=_stacker_base_loc_seq(stacker_id),
            adapterLabwareURI="opentrons/opentrons_flex_96_tiprack_adapter/1",
            lidLocationSequence=(
                [
                    OnLabwareLocationSequenceComponent(
                        labwareId="labware-id", lidId="lid-id"
                    ),
                    OnLabwareLocationSequenceComponent(
                        labwareId="adapter-id", lidId=None
                    ),
                ]
                + _stacker_base_loc_seq(stacker_id)
            ),
            lidLabwareURI="opentrons/opentrons_flex_tiprack_lid/1",
        ),
        state_update=StateUpdate(
            batch_loaded_labware=BatchLoadedLabwareUpdate(
                new_locations_by_id={
                    "labware-id": OnLabwareLocation(labwareId="adapter-id"),
                    "adapter-id": ModuleLocation(moduleId=stacker_id),
                    "lid-id": OnLabwareLocation(labwareId="labware-id"),
                },
                offset_ids_by_id={
                    "labware-id": None,
                    "adapter-id": None,
                    "lid-id": None,
                },
                display_names_by_id={
                    "labware-id": "Opentrons Flex 96 Filter Tip Rack 50 µL",
                    "adapter-id": "Opentrons Flex 96 Tip Rack Adapter",
                    "lid-id": "Opentrons Flex Tiprack Lid",
                },
                definitions_by_id={
                    "labware-id": flex_50uL_tiprack,
                    "adapter-id": tiprack_adapter_def,
                    "lid-id": tiprack_lid_def,
                },
            ),
            flex_stacker_state_update=FlexStackerStateUpdate(
                module_id=stacker_id,
                pool_count=0,
            ),
            addressable_area_used=AddressableAreaUsedUpdate(
                addressable_area_name="flexStackerV1B4"
            ),
            labware_lid=LabwareLidUpdate(
                parent_labware_ids=["labware-id"], lid_ids=["lid-id"]
            ),
        ),
    )


@pytest.mark.parametrize(
    "shared_data_error,protocol_engine_error",
    [
        (
            FlexStackerStallError(serial="123", axis=StackerAxis.Z),
            FlexStackerStallOrCollisionError,
        ),
        (
            FlexStackerShuttleMissingError(
                serial="123",
                expected_state=PlatformState.EXTENDED,
                shuttle_state=PlatformState.UNKNOWN,
            ),
            FlexStackerShuttleError,
        ),
    ],
)
async def test_retrieve_raises_recoverable_error(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    subject: RetrieveImpl,
    model_utils: ModelUtils,
    stacker_id: FlexStackerId,
    flex_50uL_tiprack: LabwareDefinition,
    stacker_hardware: FlexStacker,
    shared_data_error: Exception,
    protocol_engine_error: Type[
        Union[FlexStackerStallOrCollisionError, FlexStackerShuttleError]
    ],
) -> None:
    """It should raise a stall error."""
    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    data = flex_stacker.RetrieveParams(moduleId=stacker_id)
    loaded_labware = LoadedLabware(
        id="labware-id",
        loadName="opentrons_flex_96_filtertiprack_50ul",
        definitionUri="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
        lid_id=None,
        offsetId=None,
        displayName="Opentrons Flex 96 Filter Tip Rack 50 µL",
        location=ModuleLocation(moduleId=stacker_id),
    )

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=flex_50uL_tiprack,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=1,
        max_pool_count=999,
        pool_overlap=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)
    decoy.when(
        await equipment.load_labware_pool_from_definitions(
            pool_primary_definition=flex_50uL_tiprack,
            pool_adapter_definition=None,
            pool_lid_definition=None,
            location=ModuleLocation(moduleId=stacker_id),
            primary_id=None,
            adapter_id=None,
            lid_id=None,
        )
    ).then_return(
        LoadedLabwarePoolData(
            primary_labware=loaded_labware, adapter_labware=None, lid_labware=None
        )
    )

    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            ModuleLocation(moduleId=stacker_id),
            labware_pending_load={"labware-id": loaded_labware},
        )
    ).then_return(_stacker_base_loc_seq(stacker_id))

    decoy.when(
        state_view.geometry.get_height_of_labware_stack(definitions=[flex_50uL_tiprack])
    ).then_return(16)

    _prep_stacker_own_location(decoy, state_view, stacker_id)

    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)

    decoy.when(await stacker_hardware.dispense_labware(labware_height=16)).then_raise(
        shared_data_error
    )

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=protocol_engine_error.model_construct(
            id=error_id,
            createdAt=error_timestamp,
            wrappedErrors=[matchers.Anything()],
        ),
        state_update=StateUpdate(),
    )
