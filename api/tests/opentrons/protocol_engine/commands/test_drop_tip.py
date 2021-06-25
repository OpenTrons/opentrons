"""Test pick up tip commands."""
from decoy import Decoy

from opentrons.protocol_engine.execution import (
    EquipmentHandler,
    MovementHandler,
    PipettingHandler,
)

from opentrons.protocol_engine.commands.drop_tip import (
    DropTipData,
    DropTipResult,
    DropTipImplementation,
)


async def test_drop_tip_implementation(
    decoy: Decoy,
    equipment: EquipmentHandler,
    movement: MovementHandler,
    pipetting: PipettingHandler,
) -> None:
    """A DropTip command should have an execution implementation."""
    subject = DropTipImplementation(
        equipment=equipment,
        movement=movement,
        pipetting=pipetting,
    )

    data = DropTipData(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
    )

    result = await subject.execute(data)

    assert result == DropTipResult()

    decoy.verify(
        await pipetting.drop_tip(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
        )
    )
