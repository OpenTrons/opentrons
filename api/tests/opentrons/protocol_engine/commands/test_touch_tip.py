"""Test touch tip commands."""
from decoy import Decoy

from opentrons.protocol_engine import WellLocation, WellOffset, DeckPoint
from opentrons.protocol_engine.execution import PipettingHandler
from opentrons.protocol_engine.state import StateView

from opentrons.protocol_engine.commands.touch_tip import (
    TouchTipParams,
    TouchTipResult,
    TouchTipImplementation,
)


async def test_touch_tip_implementation(
    decoy: Decoy,
    pipetting: PipettingHandler,
    state_view: StateView,
) -> None:
    """A TouchTip command should have an execution implementation."""
    subject = TouchTipImplementation(pipetting=pipetting, state_view=state_view)

    data = TouchTipParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=WellLocation(offset=WellOffset(x=1, y=2, z=3)),
        radius=0.456,
        speed=42.0,
    )

    decoy.when(
        await pipetting.touch_tip(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=WellLocation(offset=WellOffset(x=1, y=2, z=3)),
            radius=0.456,
            speed=42.0,
        )
    ).then_return(DeckPoint(x=4, y=5, z=6))

    result = await subject.execute(data)

    assert result == TouchTipResult(position=DeckPoint(x=4, y=5, z=6))
