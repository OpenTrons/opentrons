"""Test aspirate commands."""
from decoy import Decoy

from opentrons.protocol_engine import WellLocation, WellOrigin, WellOffset, DeckPoint
from opentrons.protocol_engine.execution import PipettingHandler
from opentrons.protocol_engine.execution.pipetting import VolumePointResult

from opentrons.protocol_engine.commands.aspirate import (
    AspirateParams,
    AspirateResult,
    AspirateImplementation,
)


async def test_aspirate_implementation(
    decoy: Decoy,
    pipetting: PipettingHandler,
) -> None:
    """An Aspirate should have an execution implementation."""
    subject = AspirateImplementation(pipetting=pipetting)

    location = WellLocation(origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1))

    data = AspirateParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=location,
        volume=50,
        flowRate=1.23,
    )

    decoy.when(
        await pipetting.aspirate(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=location,
            volume=50,
            flow_rate=1.23,
        )
    ).then_return(VolumePointResult(volume=42, position=DeckPoint(x=1, y=2, z=3)))

    result = await subject.execute(data)

    assert result == AspirateResult(volume=42, position=DeckPoint(x=1, y=2, z=3))
