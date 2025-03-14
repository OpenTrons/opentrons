"""Test Flex Stacker fill command implementation."""

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
from opentrons.protocol_engine.commands.flex_stacker.fill import (
    FillImpl,
    FillParams,
    FillResult,
)
from opentrons.protocol_engine.types import StackerFillEmptyStrategy, DeckSlotLocation
from opentrons.protocol_engine.errors import (
    FlexStackerLabwarePoolNotYetDefinedError,
    ModuleNotLoadedError,
)
from opentrons.types import DeckSlotName


@pytest.fixture
def subject(state_view: StateView, run_control: RunControlHandler) -> FillImpl:
    """A FillImpl for testing."""
    return FillImpl(state_view=state_view, run_control=run_control)


@pytest.mark.parametrize(
    "current_count,count_param,max_pool_count",
    [
        pytest.param(0, 6, 6, id="empty-to-full"),
        pytest.param(6, 6, 6, id="full-noop"),
        pytest.param(6, 4, 6, id="size-minimum"),
        pytest.param(3, 4, 4, id="fill-not-to-full"),
        pytest.param(4, 7, 6, id="capped-by-max"),
        pytest.param(3, None, 6, id="default-count"),
    ],
)
async def test_fill_happypath(
    decoy: Decoy,
    state_view: StateView,
    subject: FillImpl,
    current_count: int,
    count_param: int | None,
    max_pool_count: int,
) -> None:
    """It should fill a valid stacker's labware pool."""
    module_id = "some-module-id"
    stacker_state = FlexStackerSubState(
        module_id=cast(FlexStackerId, module_id),
        pool_primary_definition=sentinel.pool_primary_definition,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=current_count,
        max_pool_count=max_pool_count,
    )
    decoy.when(state_view.modules.get_flex_stacker_substate(module_id)).then_return(
        stacker_state
    )
    params = FillParams(
        moduleId=module_id,
        count=count_param,
        message="some-message",
        strategy=StackerFillEmptyStrategy.LOGICAL,
    )
    result = await subject.execute(params)
    assert result.state_update == StateUpdate(
        flex_stacker_state_update=FlexStackerStateUpdate(
            module_id=module_id, pool_count=max_pool_count
        )
    )
    assert result.public == FillResult(count=max_pool_count)


async def test_fill_requires_stacker(
    decoy: Decoy, state_view: StateView, subject: FillImpl
) -> None:
    """It should require a stacker."""
    decoy.when(state_view.modules.get_flex_stacker_substate("asda")).then_raise(
        ModuleNotLoadedError(module_id="asda")
    )
    with pytest.raises(ModuleNotLoadedError):
        await subject.execute(
            FillParams(
                moduleId="asda",
                strategy=StackerFillEmptyStrategy.LOGICAL,
                message="blah",
                count=3,
            )
        )


async def test_fill_requires_constrained_pool(
    decoy: Decoy, state_view: StateView, subject: FillImpl
) -> None:
    """It should require a constrained labware pool."""
    module_id = "module-id"
    stacker_state = FlexStackerSubState(
        module_id=cast(FlexStackerId, module_id),
        pool_primary_definition=None,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=3,
        max_pool_count=0,
    )
    decoy.when(state_view.modules.get_flex_stacker_substate(module_id)).then_return(
        stacker_state
    )
    decoy.when(state_view.modules.get_location(module_id)).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_A3)
    )
    with pytest.raises(
        FlexStackerLabwarePoolNotYetDefinedError,
        match=".*The Flex Stacker in.*A3.*has not been configured yet and cannot be filled.",
    ):
        await subject.execute(
            FillParams(
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
    subject: FillImpl,
) -> None:
    """It should pause the system when the pause strategy is used."""
    current_count = 3
    count_param = 6
    max_pool_count = 6
    module_id = "some-module-id"
    stacker_state = FlexStackerSubState(
        module_id=cast(FlexStackerId, module_id),
        pool_primary_definition=sentinel.pool_primary_definition,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=current_count,
        max_pool_count=max_pool_count,
    )
    decoy.when(state_view.modules.get_flex_stacker_substate(module_id)).then_return(
        stacker_state
    )
    params = FillParams(
        moduleId=module_id,
        count=count_param,
        message="some-message",
        strategy=StackerFillEmptyStrategy.MANUAL_WITH_PAUSE,
    )
    result = await subject.execute(params)
    assert result.state_update == StateUpdate(
        flex_stacker_state_update=FlexStackerStateUpdate(
            module_id=module_id, pool_count=max_pool_count
        )
    )
    assert result.public == FillResult(count=max_pool_count)
    decoy.verify(await run_control.wait_for_resume())
