"""Test Flex Stacker store command implementation."""

from datetime import datetime
from unittest.mock import sentinel

import pytest
from decoy import Decoy, matchers

from opentrons.drivers.flex_stacker.types import StackerAxis
from opentrons.hardware_control.modules import FlexStacker
from opentrons.protocol_engine.commands.flex_stacker.common import (
    FlexStackerStallOrCollisionError,
)
from opentrons.protocol_engine.resources import ModelUtils

from opentrons.protocol_engine.state.update_types import (
    StateUpdate,
    FlexStackerStateUpdate,
    BatchLabwareLocationUpdate,
)

from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    FlexStackerSubState,
    FlexStackerId,
)
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.commands import flex_stacker
from opentrons.protocol_engine.commands.command import SuccessData, DefinedErrorData
from opentrons.protocol_engine.commands.flex_stacker.store import StoreImpl
from opentrons.protocol_engine.types import (
    OnAddressableAreaLocationSequenceComponent,
    OnModuleLocationSequenceComponent,
    InStackerHopperLocation,
    OnCutoutFixtureLocationSequenceComponent,
)
from opentrons.protocol_engine.errors import (
    CannotPerformModuleAction,
    LabwareNotLoadedOnModuleError,
    FlexStackerLabwarePoolNotYetDefinedError,
)

from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.errors.exceptions import FlexStackerStallError


@pytest.fixture
def subject(
    equipment: EquipmentHandler,
    state_view: StateView,
    model_utils: ModelUtils,
) -> StoreImpl:
    """Subject under test."""
    return StoreImpl(
        state_view=state_view, equipment=equipment, model_utils=model_utils
    )


async def test_store_raises_if_full(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    subject: StoreImpl,
    stacker_id: FlexStackerId,
    flex_50uL_tiprack: LabwareDefinition,
) -> None:
    """It should raise if called when the stacker is full."""
    data = flex_stacker.StoreParams(moduleId=stacker_id)

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=flex_50uL_tiprack,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=6,
        max_pool_count=6,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)
    with pytest.raises(
        CannotPerformModuleAction,
        match="Cannot store labware in Flex Stacker while it is full",
    ):
        await subject.execute(data)


async def test_store_raises_if_carriage_logically_empty(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    subject: StoreImpl,
    stacker_id: FlexStackerId,
    flex_50uL_tiprack: LabwareDefinition,
) -> None:
    """It should raise if called with a known-empty carriage."""
    data = flex_stacker.StoreParams(moduleId=stacker_id)

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
    decoy.when(state_view.labware.get_id_by_module(stacker_id)).then_raise(
        LabwareNotLoadedOnModuleError()
    )
    with pytest.raises(
        CannotPerformModuleAction,
        match="Cannot store labware if Flex Stacker carriage is empty",
    ):
        await subject.execute(data)


async def test_store_raises_if_not_configured(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    subject: StoreImpl,
    stacker_id: FlexStackerId,
) -> None:
    """It should raise if called before the stacker is configured."""
    data = flex_stacker.StoreParams(moduleId=stacker_id)
    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=None,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=1,
        max_pool_count=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)
    with pytest.raises(
        FlexStackerLabwarePoolNotYetDefinedError,
        match="The Flex Stacker has not been configured yet and cannot be filled.",
    ):
        await subject.execute(data)


async def test_store_raises_if_stall(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    subject: StoreImpl,
    model_utils: ModelUtils,
    stacker_id: FlexStackerId,
    flex_50uL_tiprack: LabwareDefinition,
    stacker_hardware: FlexStacker,
) -> None:
    """It should raise a stall error."""
    data = flex_stacker.StoreParams(moduleId=stacker_id)
    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=flex_50uL_tiprack,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=0,
        max_pool_count=999,
    )

    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)

    decoy.when(state_view.labware.get_id_by_module(module_id=stacker_id)).then_return(
        "labware-id"
    )
    decoy.when(
        state_view.labware.get_labware_stack_from_parent("labware-id")
    ).then_return(["labware-id"])
    decoy.when(state_view.labware.get_definition("labware-id")).then_return(
        flex_50uL_tiprack
    )
    decoy.when(
        state_view.geometry.get_height_of_labware_stack([flex_50uL_tiprack])
    ).then_return(4)

    decoy.when(state_view.geometry.get_location_sequence("labware-id")).then_return(
        [
            OnModuleLocationSequenceComponent(moduleId=stacker_id),
            OnAddressableAreaLocationSequenceComponent(
                addressableAreaName="flexStackerV1B4",
            ),
        ]
    )
    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            InStackerHopperLocation(moduleId=stacker_id)
        )
    ).then_return(
        [
            InStackerHopperLocation(moduleId=stacker_id),
            OnCutoutFixtureLocationSequenceComponent(
                cutoutId="cutoutA3", possibleCutoutFixtureIds=["flexStackerModuleV1"]
            ),
        ]
    )

    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)

    decoy.when(await stacker_hardware.store_labware(labware_height=4)).then_raise(
        FlexStackerStallError(serial="123", axis=StackerAxis.Z)
    )

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=FlexStackerStallOrCollisionError.model_construct(
            id=error_id,
            createdAt=error_timestamp,
            wrappedErrors=[matchers.Anything()],
        ),
        state_update=StateUpdate(),
    )


@pytest.mark.parametrize(
    argnames=["pool_adapter", "pool_lid", "param_adapter", "param_lid"],
    argvalues=[
        pytest.param(
            sentinel.pool_adapter,
            sentinel.pool_lid,
            None,
            sentinel.pool_lid,
            id="missing-adapter",
        ),
        pytest.param(
            sentinel.pool_adapter, None, None, None, id="missing-adapter-no-lid"
        ),
        pytest.param(
            sentinel.pool_adapter,
            sentinel.pool_lid,
            sentinel.pool_adapter,
            None,
            id="missing-lid",
        ),
        pytest.param(None, sentinel.pool_lid, None, None, id="missing-lid-no-adapter"),
        pytest.param(
            None, None, sentinel.param_adapter, None, id="extra-adapter-no-lid"
        ),
        pytest.param(
            None,
            sentinel.pool_lid,
            sentinel.param_adapter,
            sentinel.pool_lid,
            id="extra-adapter",
        ),
        pytest.param(
            sentinel.pool_adapter,
            None,
            sentinel.pool_adapter,
            sentinel.param_lid,
            id="extra-lid",
        ),
        pytest.param(None, None, None, sentinel.param_lid, id="extra-lid-no-adapter"),
        pytest.param(
            None,
            None,
            sentinel.param_adapter,
            sentinel.param_lid,
            id="extra-lid-and-adapter",
        ),
        pytest.param(
            sentinel.pool_adapter,
            sentinel.pool_lid,
            None,
            None,
            id="missing-lid-and-adapter",
        ),
        pytest.param(
            sentinel.pool_adapter,
            sentinel.pool_lid,
            sentinel.pool_adapter,
            sentinel.param_lid,
            id="wrong-lid",
        ),
        pytest.param(
            None, sentinel.pool_lid, None, sentinel.param_lid, id="wrong-lid-no-adapter"
        ),
        pytest.param(
            sentinel.pool_adapter,
            sentinel.pool_lid,
            sentinel.param_adapter,
            sentinel.pool_lid,
            id="wrong-adapter",
        ),
        pytest.param(
            sentinel.pool_adapter,
            None,
            sentinel.param_adapter,
            None,
            id="wrong-adapter-no-lid",
        ),
        pytest.param(
            sentinel.pool_adapter,
            sentinel.pool_lid,
            sentinel.param_adapter,
            sentinel.param_lid,
            id="wrong-lid-and-adapter",
        ),
    ],
)
async def test_store_raises_if_labware_does_not_match(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: StoreImpl,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
    pool_adapter: LabwareDefinition | None,
    pool_lid: LabwareDefinition | None,
    param_adapter: LabwareDefinition | None,
    param_lid: LabwareDefinition | None,
) -> None:
    """It should raise if the labware to be stored does not match the labware pool parameters."""
    data = flex_stacker.StoreParams(moduleId=stacker_id)

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=sentinel.primary,
        pool_adapter_definition=pool_adapter,
        pool_lid_definition=pool_lid,
        pool_count=0,
        max_pool_count=5,
    )

    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)

    if param_adapter is not None:
        decoy.when(
            state_view.labware.get_id_by_module(module_id=stacker_id)
        ).then_return("adapter-id")
        if param_lid is not None:
            decoy.when(
                state_view.labware.get_labware_stack_from_parent("adapter-id")
            ).then_return(["lid-id", "labware-id", "adapter-id"])
        else:
            decoy.when(
                state_view.labware.get_labware_stack_from_parent("adapter-id")
            ).then_return(["labware-id", "adapter-id"])
    else:
        decoy.when(
            state_view.labware.get_id_by_module(module_id=stacker_id)
        ).then_return("labware-id")
        if param_lid is not None:
            decoy.when(
                state_view.labware.get_labware_stack_from_parent("labware-id")
            ).then_return(["lid-id", "labware-id"])
        else:
            decoy.when(
                state_view.labware.get_labware_stack_from_parent("labware-id")
            ).then_return(["labware-id"])

    decoy.when(state_view.labware.get_definition("labware-id")).then_return(
        sentinel.primary
    )
    if param_lid is not None:
        decoy.when(state_view.labware.get_definition("lid-id")).then_return(param_lid)
    if param_adapter is not None:
        decoy.when(state_view.labware.get_definition("adapter-id")).then_return(
            param_adapter
        )

    with pytest.raises(
        CannotPerformModuleAction,
        match="Cannot store labware stack that does not correspond with Flex Stacker configuration",
    ):
        await subject.execute(data)


async def test_store(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    stacker_id: FlexStackerId,
    subject: StoreImpl,
    stacker_hardware: FlexStacker,
    flex_50uL_tiprack: LabwareDefinition,
) -> None:
    """It should stroe the labware on the stack."""
    data = flex_stacker.StoreParams(moduleId=stacker_id)

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

    decoy.when(state_view.labware.get_id_by_module(module_id=stacker_id)).then_return(
        "labware-id"
    )
    decoy.when(
        state_view.labware.get_labware_stack_from_parent("labware-id")
    ).then_return(["labware-id"])
    decoy.when(state_view.labware.get_definition("labware-id")).then_return(
        flex_50uL_tiprack
    )
    decoy.when(
        state_view.geometry.get_height_of_labware_stack([flex_50uL_tiprack])
    ).then_return(4)

    decoy.when(state_view.geometry.get_location_sequence("labware-id")).then_return(
        [
            OnModuleLocationSequenceComponent(moduleId=stacker_id),
            OnAddressableAreaLocationSequenceComponent(
                addressableAreaName="flexStackerV1B4",
            ),
        ]
    )
    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            InStackerHopperLocation(moduleId=stacker_id)
        )
    ).then_return(
        [
            InStackerHopperLocation(moduleId=stacker_id),
            OnCutoutFixtureLocationSequenceComponent(
                cutoutId="cutoutA3", possibleCutoutFixtureIds=["flexStackerModuleV1"]
            ),
        ]
    )

    result = await subject.execute(data)

    decoy.verify(await stacker_hardware.store_labware(labware_height=4), times=1)
    assert result == SuccessData(
        public=flex_stacker.StoreResult(
            primaryOriginLocationSequence=[
                OnModuleLocationSequenceComponent(moduleId=stacker_id),
                OnAddressableAreaLocationSequenceComponent(
                    addressableAreaName="flexStackerV1B4",
                ),
            ],
            primaryLabwareId="labware-id",
            eventualDestinationLocationSequence=[
                InStackerHopperLocation(moduleId=stacker_id),
                OnCutoutFixtureLocationSequenceComponent(
                    cutoutId="cutoutA3",
                    possibleCutoutFixtureIds=["flexStackerModuleV1"],
                ),
            ],
            primaryLabwareURI="opentrons/opentrons_flex_96_filtertiprack_50ul/1",
        ),
        state_update=StateUpdate(
            batch_labware_location=BatchLabwareLocationUpdate(
                new_locations_by_id={
                    "labware-id": InStackerHopperLocation(moduleId=stacker_id)
                },
                new_offset_ids_by_id={"labware-id": None},
            ),
            flex_stacker_state_update=FlexStackerStateUpdate(
                module_id=stacker_id,
                pool_count=1,
            ),
        ),
    )
