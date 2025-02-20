"""Test Flex Stacker empty command implementation."""

import pytest
from decoy import Decoy
from typing import cast
from unittest.mock import sentinel

from opentrons.protocol_engine.state.update_types import (
    StateUpdate,
    FlexStackerStateUpdate,
)

from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    FlexStackerSubState,
    FlexStackerId,
)
from opentrons.protocol_engine.execution import RunControlHandler
from opentrons.protocol_engine.commands.flex_stacker.empty import (
    EmptyImpl,
    EmptyParams,
    EmptyResult,
)
from opentrons.protocol_engine.types import StackerFillEmptyStrategy, DeckSlotLocation
from opentrons.protocol_engine.errors import (
    ModuleNotLoadedError,
    FlexStackerLabwarePoolNotYetDefinedError,
)
from opentrons.types import DeckSlotName


@pytest.fixture
def subject(state_view: StateView, run_control: RunControlHandler) -> EmptyImpl:
    """An EmptyImpl for testing."""
    return EmptyImpl(state_view=state_view, run_control=run_control)


@pytest.mark.parametrize(
    "current_count,count_param,target_count",
    [
        pytest.param(0, 0, 0, id="empty-to-empty"),
        pytest.param(5, 0, 0, id="full-to-empty"),
        pytest.param(5, 5, 5, id="full-noop"),
        pytest.param(4, 5, 4, id="size-capped"),
        pytest.param(4, 3, 3, id="not-full-empty"),
        pytest.param(5, 6, 5, id="overfull"),
        pytest.param(3, None, 0, id="default-count"),
    ],
)
async def test_empty_happypath(
    decoy: Decoy,
    state_view: StateView,
    subject: EmptyImpl,
    current_count: int,
    count_param: int | None,
    target_count: int,
) -> None:
    """It should empty a valid stacker's labware pool."""
    module_id = "some-module-id"
    stacker_state = FlexStackerSubState(
        module_id=cast(FlexStackerId, module_id),
        in_static_mode=sentinel.in_static_mode,
        hopper_labware_ids=[],
        pool_primary_definition=sentinel.pool_primary_definition,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=current_count,
    )
    decoy.when(state_view.modules.get_flex_stacker_substate(module_id)).then_return(
        stacker_state
    )
    params = EmptyParams(
        moduleId=module_id,
        count=count_param,
        message="some-message",
        strategy=StackerFillEmptyStrategy.LOGICAL,
    )
    result = await subject.execute(params)
    assert result.state_update == StateUpdate(
        flex_stacker_state_update=FlexStackerStateUpdate(
            module_id=module_id, pool_count=target_count
        )
    )
    assert result.public == EmptyResult(count=target_count)


async def test_empty_requires_stacker(
    decoy: Decoy, state_view: StateView, subject: EmptyImpl
) -> None:
    """It should require a stacker."""
    decoy.when(state_view.modules.get_flex_stacker_substate("asda")).then_raise(
        ModuleNotLoadedError(module_id="asda")
    )
    with pytest.raises(ModuleNotLoadedError):
        await subject.execute(
            EmptyParams(
                moduleId="asda",
                strategy=StackerFillEmptyStrategy.LOGICAL,
                message="blah",
                count=3,
            )
        )


async def test_empty_requires_constrained_pool(
    decoy: Decoy, state_view: StateView, subject: EmptyImpl
) -> None:
    """It should require a constrained labware pool."""
    module_id = "module-id"
    stacker_state = FlexStackerSubState(
        module_id=cast(FlexStackerId, module_id),
        in_static_mode=sentinel.in_static_mode,
        hopper_labware_ids=[],
        pool_primary_definition=None,
        pool_lid_definition=None,
        pool_adapter_definition=None,
        pool_count=3,
    )
    decoy.when(state_view.modules.get_flex_stacker_substate(module_id)).then_return(
        stacker_state
    )
    decoy.when(state_view.modules.get_location(module_id)).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_A3)
    )
    with pytest.raises(
        FlexStackerLabwarePoolNotYetDefinedError,
        match=".*The Flex Stacker in.*A3.*has not been configured yet and cannot be emptied.",
    ):
        await subject.execute(
            EmptyParams(
                moduleId=module_id,
                count=2,
                message="hello",
                strategy=StackerFillEmptyStrategy.LOGICAL,
            )
        )


async def test_pause_strategy_pauses(
    decoy: Decoy,
    state_view: StateView,
    run_control: RunControlHandler,
    subject: EmptyImpl,
) -> None:
    """It should pause the system when the pause strategy is used."""
    module_id = "some-module-id"
    current_count = 3
    count_param = 1
    target_count = 1
    stacker_state = FlexStackerSubState(
        module_id=cast(FlexStackerId, module_id),
        in_static_mode=sentinel.in_static_mode,
        hopper_labware_ids=[],
        pool_primary_definition=sentinel.pool_primary_definition,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=current_count,
    )
    decoy.when(state_view.modules.get_flex_stacker_substate(module_id)).then_return(
        stacker_state
    )
    params = EmptyParams(
        moduleId=module_id,
        count=count_param,
        message="some-message",
        strategy=StackerFillEmptyStrategy.MANUAL_WITH_PAUSE,
    )
    result = await subject.execute(params)
    assert result.state_update == StateUpdate(
        flex_stacker_state_update=FlexStackerStateUpdate(
            module_id=module_id, pool_count=target_count
        )
    )
    assert result.public == EmptyResult(count=target_count)
    decoy.verify(await run_control.wait_for_resume())
