"""Test fixtures for stacker tests."""

import pytest

from decoy import Decoy

from opentrons.hardware_control.modules import FlexStacker
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.state.module_substates import (
    FlexStackerId,
)


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
