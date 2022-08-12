"""Liquid view tests."""
import pytest

from opentrons.protocol_engine.state.liquids import LiquidState, LiquidView
from opentrons.protocol_engine.commands.load_liquid import Liquid


@pytest.fixture
def subject() -> LiquidView:
    """Get a liquid view test subject."""
    state = LiquidState(
        liquids=[Liquid(id="water-id", display_name="water", description="water desc")]
    )

    return LiquidView(state)


def test_get_all(subject: LiquidView) -> None:
    """Should return a list of liquids."""
    assert subject.get_all() == [
        Liquid(id="water-id", display_name="water", description="water desc")
    ]
