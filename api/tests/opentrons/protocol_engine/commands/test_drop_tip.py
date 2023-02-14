"""Test pick up tip commands."""
from decoy import Decoy

from opentrons.protocol_engine import WellLocation, WellOffset, DeckPoint
from opentrons.protocol_engine.execution import PipettingHandler

from opentrons.protocol_engine.commands.drop_tip import (
    DropTipParams,
    DropTipResult,
    DropTipImplementation,
)


async def test_drop_tip_implementation(
    decoy: Decoy,
    pipetting: PipettingHandler,
) -> None:
    """A DropTip command should have an execution implementation."""
    subject = DropTipImplementation(pipetting=pipetting)

    data = DropTipParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=WellLocation(offset=WellOffset(x=1, y=2, z=3)),
    )

    decoy.when(
        await pipetting.drop_tip(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=WellLocation(offset=WellOffset(x=1, y=2, z=3)),
            home_after=None,
        )
    ).then_return(DeckPoint(x=4, y=5, z=6))

    result = await subject.execute(data)

    assert result == DropTipResult(position=DeckPoint(x=4, y=5, z=6))
