"""Test Flex Stacker open latch command implementation."""

import pytest
from decoy import Decoy

from opentrons.hardware_control.modules import FlexStacker
from opentrons.protocol_engine.resources import ModelUtils
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    FlexStackerSubState,
    FlexStackerId,
)
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.commands import flex_stacker
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.flex_stacker.open_latch import (
    OpenLatchImpl,
)


@pytest.fixture
def subject(
    state_view: StateView, equipment: EquipmentHandler, model_utils: ModelUtils
) -> OpenLatchImpl:
    """Get a OpenLatch command to test."""
    return OpenLatchImpl(
        state_view=state_view, equipment=equipment, model_utils=model_utils
    )


async def test_open_latch_command(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: OpenLatchImpl,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should return a success data."""
    data = flex_stacker.OpenLatchParams(moduleId=stacker_id)

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=None,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=0,
        max_pool_count=0,
        pool_overlap=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)

    result = await subject.execute(data)

    decoy.verify(await stacker_hardware.open_latch(), times=1)

    assert result == SuccessData(public=flex_stacker.OpenLatchResult())
