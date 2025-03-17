"""Test Flex Stacker set stored labware command implementation."""

import pytest
from decoy import Decoy
from typing import Any, cast
from unittest.mock import sentinel

from opentrons.protocol_engine.state.update_types import (
    StateUpdate,
    FlexStackerStateUpdate,
    FlexStackerPoolConstraint,
)

from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    FlexStackerSubState,
    FlexStackerId,
)
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.flex_stacker.set_stored_labware import (
    SetStoredLabwareImpl,
    SetStoredLabwareParams,
    SetStoredLabwareResult,
    StackerStoredLabwareDetails,
)
from opentrons.protocol_engine.types import OverlapOffset
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from opentrons.protocol_engine.errors import (
    FlexStackerNotLogicallyEmptyError,
)


@pytest.fixture
def subject(state_view: StateView, equipment: EquipmentHandler) -> SetStoredLabwareImpl:
    """A FillImpl for testing."""
    return SetStoredLabwareImpl(state_view=state_view, equipment=equipment)


@pytest.mark.parametrize(
    "adapter_labware,lid_labware,pool_definition",
    [
        pytest.param(
            StackerStoredLabwareDetails(
                loadName="adapter-name", namespace="adapter-namespace", version=2
            ),
            StackerStoredLabwareDetails(
                loadName="lid-name", namespace="lid-namespace", version=3
            ),
            FlexStackerPoolConstraint(
                max_pool_count=10,
                primary_definition=sentinel.primary_definition,
                lid_definition=sentinel.lid_definition,
                adapter_definition=sentinel.adapter_definition,
            ),
            id="all-specified",
        ),
        pytest.param(
            None,
            None,
            FlexStackerPoolConstraint(
                max_pool_count=10,
                primary_definition=sentinel.primary_definition,
                lid_definition=None,
                adapter_definition=None,
            ),
            id="none-specified",
        ),
        pytest.param(
            None,
            StackerStoredLabwareDetails(
                loadName="lid-name", namespace="lid-namespace", version=3
            ),
            FlexStackerPoolConstraint(
                max_pool_count=10,
                primary_definition=sentinel.primary_definition,
                lid_definition=sentinel.lid_definition,
                adapter_definition=None,
            ),
            id="lid-only",
        ),
        pytest.param(
            StackerStoredLabwareDetails(
                loadName="adapter-name", namespace="adapter-namespace", version=2
            ),
            None,
            FlexStackerPoolConstraint(
                max_pool_count=10,
                primary_definition=sentinel.primary_definition,
                lid_definition=None,
                adapter_definition=sentinel.adapter_definition,
            ),
            id="adapter-only",
        ),
    ],
)
async def test_set_stored_labware_happypath(
    adapter_labware: StackerStoredLabwareDetails | None,
    lid_labware: StackerStoredLabwareDetails | None,
    pool_definition: FlexStackerPoolConstraint,
    decoy: Decoy,
    subject: SetStoredLabwareImpl,
    equipment: EquipmentHandler,
    state_view: StateView,
    flex_50uL_tiprack: LabwareDefinition,
    tiprack_adapter_def: LabwareDefinition,
    tiprack_lid_def: LabwareDefinition,
) -> None:
    """It should load all possible main/lid/adapter combos."""
    module_id = "module-id"
    pool_definition.primary_definition = flex_50uL_tiprack
    pool_definition.lid_definition = (
        tiprack_lid_def if pool_definition.lid_definition is not None else None
    )
    pool_definition.adapter_definition = (
        tiprack_adapter_def if pool_definition.adapter_definition is not None else None
    )
    lid_definition: Any = None
    adapter_definition: Any = None
    params = SetStoredLabwareParams(
        moduleId=module_id,
        primaryLabware=StackerStoredLabwareDetails(
            loadName="main-name", namespace="main-namespace", version=1
        ),
        lidLabware=lid_labware,
        adapterLabware=adapter_labware,
        initialCount=3,
    )
    decoy.when(state_view.modules.get_flex_stacker_substate(module_id)).then_return(
        FlexStackerSubState(
            module_id=cast(FlexStackerId, module_id),
            pool_primary_definition=None,
            pool_adapter_definition=None,
            pool_lid_definition=None,
            pool_count=0,
            max_pool_count=0,
        )
    )
    decoy.when(
        await equipment.load_definition_for_details(
            load_name="main-name",
            namespace="main-namespace",
            version=1,
        )
    ).then_return((flex_50uL_tiprack, sentinel.unused))

    if lid_labware:
        decoy.when(
            await equipment.load_definition_for_details(
                load_name=lid_labware.loadName,
                namespace=lid_labware.namespace,
                version=lid_labware.version,
            )
        ).then_return((tiprack_lid_def, sentinel.unused))
        lid_definition = tiprack_lid_def
    if adapter_labware:
        decoy.when(
            await equipment.load_definition_for_details(
                load_name=adapter_labware.loadName,
                namespace=adapter_labware.namespace,
                version=adapter_labware.version,
            )
        ).then_return((tiprack_adapter_def, sentinel.unused))
        adapter_definition = tiprack_adapter_def

    decoy.when(
        state_view.geometry.get_height_of_labware_stack(
            [
                x
                for x in [
                    lid_definition,
                    flex_50uL_tiprack,
                    adapter_definition,
                ]
                if x is not None
            ]
        )
    ).then_return(sentinel.pool_height)

    # pool_definitions = [x for x in [lid_definition, sentinel.primary_definition, adapter_definition,] if x is not None]
    if lid_labware and adapter_labware:
        decoy.when(
            state_view._labware.get_labware_overlap_offsets(
                adapter_definition, tiprack_lid_def.parameters.loadName
            )
        ).then_return(OverlapOffset(x=0, y=0, z=0))
    elif lid_labware:
        decoy.when(
            state_view._labware.get_labware_overlap_offsets(
                flex_50uL_tiprack, tiprack_lid_def.parameters.loadName
            )
        ).then_return(OverlapOffset(x=0, y=0, z=0))
    elif adapter_labware:
        decoy.when(
            state_view._labware.get_labware_overlap_offsets(
                adapter_definition, flex_50uL_tiprack.parameters.loadName
            )
        ).then_return(OverlapOffset(x=0, y=0, z=0))
    else:
        decoy.when(
            state_view._labware.get_labware_overlap_offsets(
                flex_50uL_tiprack, flex_50uL_tiprack.parameters.loadName
            )
        ).then_return(OverlapOffset(x=0, y=0, z=0))

    decoy.when(
        state_view.modules.stacker_max_pool_count_by_height(
            module_id, sentinel.pool_height, 0.0
        )
    ).then_return(10)

    result = await subject.execute(params)
    decoy.verify(
        state_view.labware.raise_if_stacker_labware_pool_is_not_valid(
            flex_50uL_tiprack, lid_definition, adapter_definition
        )
    )

    assert result == SuccessData(
        public=SetStoredLabwareResult.model_construct(
            primaryLabwareDefinition=flex_50uL_tiprack,
            lidLabwareDefinition=lid_definition,
            adapterLabwareDefinition=adapter_definition,
            count=3,
        ),
        state_update=StateUpdate(
            flex_stacker_state_update=FlexStackerStateUpdate(
                module_id=module_id, pool_constraint=pool_definition, pool_count=3
            )
        ),
    )


async def test_set_stored_labware_requires_empty_hopper(
    decoy: Decoy,
    state_view: StateView,
    subject: SetStoredLabwareImpl,
) -> None:
    """It should fail if the hopper is not empty."""
    module_id = "module-id"
    decoy.when(state_view.modules.get_flex_stacker_substate(module_id)).then_return(
        FlexStackerSubState(
            module_id=cast(FlexStackerId, module_id),
            pool_primary_definition=None,
            pool_adapter_definition=None,
            pool_lid_definition=None,
            pool_count=2,
            max_pool_count=6,
        )
    )
    with pytest.raises(FlexStackerNotLogicallyEmptyError):
        await subject.execute(
            SetStoredLabwareParams(
                moduleId=module_id,
                primaryLabware=StackerStoredLabwareDetails(
                    loadName="main-name", namespace="main-namespace", version=1
                ),
                lidLabware=None,
                adapterLabware=None,
                initialCount=3,
            )
        )


@pytest.mark.parametrize("input_count,output_count", [(None, 6), (2, 2), (7, 6)])
async def test_set_stored_labware_limits_count(
    input_count: int | None,
    output_count: int,
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: SetStoredLabwareImpl,
    flex_50uL_tiprack: LabwareDefinition,
) -> None:
    """It should default and limit the input count."""
    module_id = "module-id"
    params = SetStoredLabwareParams(
        moduleId=module_id,
        primaryLabware=StackerStoredLabwareDetails(
            loadName="opentrons_flex_96_filtertiprack_50ul",
            namespace="opentrons",
            version=1,
        ),
        lidLabware=None,
        adapterLabware=None,
        initialCount=input_count,
    )
    decoy.when(state_view.modules.get_flex_stacker_substate(module_id)).then_return(
        FlexStackerSubState(
            module_id=cast(FlexStackerId, module_id),
            pool_primary_definition=None,
            pool_adapter_definition=None,
            pool_lid_definition=None,
            pool_count=0,
            max_pool_count=0,
        )
    )
    decoy.when(
        await equipment.load_definition_for_details(
            load_name="opentrons_flex_96_filtertiprack_50ul",
            namespace="opentrons",
            version=1,
        )
    ).then_return(
        (flex_50uL_tiprack, "opentrons/opentrons_flex_96_filtertiprack_50ul/1")
    )

    decoy.when(
        state_view._labware.get_labware_overlap_offsets(
            flex_50uL_tiprack, "opentrons_flex_96_filtertiprack_50ul"
        )
    ).then_return(OverlapOffset(x=0, y=0, z=0))

    decoy.when(
        state_view.geometry.get_height_of_labware_stack([flex_50uL_tiprack])
    ).then_return(sentinel.pool_height)

    decoy.when(
        state_view.modules.stacker_max_pool_count_by_height(
            module_id, sentinel.pool_height, 0.0
        )
    ).then_return(6)

    result = await subject.execute(params)
    assert result == SuccessData(
        public=SetStoredLabwareResult.model_construct(
            primaryLabwareDefinition=flex_50uL_tiprack,
            lidLabwareDefinition=None,
            adapterLabwareDefinition=None,
            count=output_count,
        ),
        state_update=StateUpdate(
            flex_stacker_state_update=FlexStackerStateUpdate(
                module_id=module_id,
                pool_constraint=FlexStackerPoolConstraint(
                    max_pool_count=6,
                    primary_definition=flex_50uL_tiprack,
                    lid_definition=None,
                    adapter_definition=None,
                ),
                pool_count=output_count,
            )
        ),
    )
