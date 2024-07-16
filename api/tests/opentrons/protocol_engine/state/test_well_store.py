"""Liquid state store tests."""
import pytest
from opentrons.protocol_engine.state.wells import WellStore
from opentrons.protocol_engine.types import WellDetails
from opentrons.protocol_engine.actions.actions import SucceedCommandAction

from .command_fixtures import create_liquid_probe_command


@pytest.fixture
def subject() -> WellStore:
    """Liquid store test subject."""
    return WellStore()


def test_handles_liquid_probe_success(subject: WellStore) -> None:
    """It should add the well to the state after a successful liquid probe."""
    well_details = WellDetails(labware_id="labware-id", well_name="well-name")

    liquid_probe = create_liquid_probe_command()

    subject.handle_action(
        SucceedCommandAction(private_result=None, command=liquid_probe)
    )

    assert len(subject.state.current_liquid_heights) == 1

    assert subject.state.current_liquid_heights[well_details] == 0.5
