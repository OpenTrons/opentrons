"""Test Flex Stacker prepare shuttle command implementation."""

from datetime import datetime

import pytest
from decoy import Decoy, matchers

from opentrons.drivers.flex_stacker.types import StackerAxis
from opentrons.hardware_control.modules import FlexStacker
from opentrons.protocol_engine.commands.flex_stacker.common import (
    FlexStackerStallOrCollisionError,
)
from opentrons.protocol_engine.resources import ModelUtils
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    FlexStackerSubState,
    FlexStackerId,
)
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.commands import flex_stacker
from opentrons.protocol_engine.commands.command import SuccessData, DefinedErrorData
from opentrons.protocol_engine.commands.flex_stacker.prepare_shuttle import (
    PrepareShuttleImpl,
)

from opentrons_shared_data.errors.exceptions import FlexStackerStallError


@pytest.fixture
def subject(
    state_view: StateView, equipment: EquipmentHandler, model_utils: ModelUtils
) -> PrepareShuttleImpl:
    """Get a PrepareShuttle command to test."""
    return PrepareShuttleImpl(
        state_view=state_view, equipment=equipment, model_utils=model_utils
    )


async def test_home_command(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: PrepareShuttleImpl,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should return a success data."""
    data = flex_stacker.PrepareShuttleParams(moduleId=stacker_id)

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=None,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=0,
        max_pool_count=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)

    result = await subject.execute(data)

    decoy.verify(await stacker_hardware.home_all(), times=1)

    assert result == SuccessData(public=flex_stacker.PrepareShuttleResult())


async def test_home_command_with_stall_detected(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: PrepareShuttleImpl,
    model_utils: ModelUtils,
    stacker_id: FlexStackerId,
    stacker_hardware: FlexStacker,
) -> None:
    """It should return a success data."""
    err_id = "error-id"
    err_timestamp = datetime(year=2025, month=3, day=19)

    data = flex_stacker.PrepareShuttleParams(moduleId=stacker_id)

    fs_module_substate = FlexStackerSubState(
        module_id=stacker_id,
        pool_primary_definition=None,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=0,
        max_pool_count=0,
    )
    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id=stacker_id)
    ).then_return(fs_module_substate)
    decoy.when(model_utils.generate_id()).then_return(err_id)
    decoy.when(model_utils.get_timestamp()).then_return(err_timestamp)

    decoy.when(await stacker_hardware.home_all()).then_raise(
        FlexStackerStallError(serial="123", axis=StackerAxis.Z)
    )

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=FlexStackerStallOrCollisionError.model_construct(
            id=err_id,
            createdAt=err_timestamp,
            wrappedErrors=[matchers.Anything()],
        )
    )
