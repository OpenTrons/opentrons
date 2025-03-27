"""Test Flex Stacker unsafe manual retrieve command implementation."""

import pytest
from decoy import Decoy

from opentrons.hardware_control.modules import FlexStacker
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
from opentrons.protocol_engine.commands import unsafe
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.unsafe.unsafe_manual_retrieve import (
    UnsafeManualRetrieveImpl,
)
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
from opentrons.hardware_control.modules.types import PlatformState


@pytest.fixture
def stacker_id() -> FlexStackerId:
    """Get a consistent ID for a stacker."""
    return FlexStackerId("flex-stacker-id")


@pytest.fixture
def stacker_hardware(
    decoy: Decoy, equipment: EquipmentHandler, stacker_id: FlexStackerId
) -> FlexStacker:
    """Get a mocked hardware stacker."""
    hardware = decoy.mock(cls=FlexStacker)
    decoy.when(equipment.get_module_hardware_api(stacker_id)).then_return(hardware)
    return hardware


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
) -> UnsafeManualRetrieveImpl:
    """Get a retrieve command to test."""
    return UnsafeManualRetrieveImpl(
        state_view=state_view, equipment=equipment, model_utils=model_utils
    )


async def test_manual_retrieve_raises_when_empty(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: UnsafeManualRetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    stacker_id: FlexStackerId,
) -> None:
    """It should raise an exception when called on an empty pool."""
    data = unsafe.UnsafeManualRetrieveParams(moduleId=stacker_id)

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=flex_50uL_tiprack,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=0,
        max_pool_count=5,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)

    with pytest.raises(
        CannotPerformModuleAction,
        match="Cannot retrieve labware from Flex Stacker because it contains no labware",
    ):
        await subject.execute(data)


async def test_manual_retrieve_primary_only(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: UnsafeManualRetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should be able to retrieve a labware."""
    data = unsafe.UnsafeManualRetrieveParams(moduleId=stacker_id)

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

    decoy.when(stacker_hardware.platform_state).then_return(PlatformState.EXTENDED)

    result = await subject.execute(data)

    assert result == SuccessData(
        public=unsafe.UnsafeManualRetrieveResult(
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


async def test_manual_retrieve_primary_and_lid(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: UnsafeManualRetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    tiprack_lid_def: LabwareDefinition,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should be able to retrieve a labware with a lid on it."""
    data = unsafe.UnsafeManualRetrieveParams(moduleId=stacker_id)

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
    decoy.when(stacker_hardware.platform_state).then_return(PlatformState.EXTENDED)

    result = await subject.execute(data)

    assert result == SuccessData(
        public=unsafe.UnsafeManualRetrieveResult(
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


async def test_manual_retrieve_primary_and_adapter(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: UnsafeManualRetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    tiprack_adapter_def: LabwareDefinition,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should be able to retrieve a labware on an adapter."""
    data = unsafe.UnsafeManualRetrieveParams(moduleId=stacker_id)

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
    decoy.when(stacker_hardware.platform_state).then_return(PlatformState.EXTENDED)

    result = await subject.execute(data)

    assert result == SuccessData(
        public=unsafe.UnsafeManualRetrieveResult(
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


async def test_manual_retrieve_primary_adapter_and_lid(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: UnsafeManualRetrieveImpl,
    flex_50uL_tiprack: LabwareDefinition,
    tiprack_adapter_def: LabwareDefinition,
    tiprack_lid_def: LabwareDefinition,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should be able to retrieve a labware on an adapter."""
    data = unsafe.UnsafeManualRetrieveParams(moduleId=stacker_id)

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
    decoy.when(stacker_hardware.platform_state).then_return(PlatformState.EXTENDED)

    result = await subject.execute(data)

    assert result == SuccessData(
        public=unsafe.UnsafeManualRetrieveResult(
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


async def test_manual_retrieve_fails_due_to_platform_state(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    subject: UnsafeManualRetrieveImpl,
    model_utils: ModelUtils,
    stacker_id: FlexStackerId,
    flex_50uL_tiprack: LabwareDefinition,
    stacker_hardware: FlexStacker,
) -> None:
    """It should raise a CannotPerformModuleAction error."""
    data = unsafe.UnsafeManualRetrieveParams(moduleId=stacker_id)
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

    decoy.when(stacker_hardware.platform_state).then_return(PlatformState.UNKNOWN)
    with pytest.raises(
        CannotPerformModuleAction,
        match="Cannot manually retrieve a labware from Flex Stacker if the carriage is not in gripper position.",
    ):
        await subject.execute(data)
