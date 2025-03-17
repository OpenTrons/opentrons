"""Test load labware commands."""

import inspect

import pytest
from decoy import Decoy

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from opentrons.types import DeckSlotName

from opentrons.protocol_engine.errors import (
    LabwareNotLoadedError,
)

from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    OnAddressableAreaLocationSequenceComponent,
)
from opentrons.protocol_engine.execution import ReloadedLabwareData, EquipmentHandler
from opentrons.protocol_engine.resources import labware_validation
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.update_types import (
    LabwareLocationUpdate,
    StateUpdate,
)

from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.reload_labware import (
    ReloadLabwareParams,
    ReloadLabwareResult,
    ReloadLabwareImplementation,
)


@pytest.fixture(autouse=True)
def patch_mock_labware_validation(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out labware_validation.py functions."""
    for name, func in inspect.getmembers(labware_validation, inspect.isfunction):
        monkeypatch.setattr(labware_validation, name, decoy.mock(func=func))


async def test_reload_labware_implementation(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    equipment: EquipmentHandler,
    state_view: StateView,
) -> None:
    """A ReloadLabware command should have an execution implementation."""
    subject = ReloadLabwareImplementation(equipment=equipment, state_view=state_view)

    data = ReloadLabwareParams(
        labwareId="my-labware-id",
    )

    decoy.when(await equipment.reload_labware(labware_id="my-labware-id",)).then_return(
        ReloadedLabwareData(
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
            offsetId="labware-offset-id",
        )
    )
    decoy.when(
        state_view.geometry.get_predicted_location_sequence(
            DeckSlotLocation(slotName=DeckSlotName.SLOT_4)
        )
    ).then_return([OnAddressableAreaLocationSequenceComponent(addressableAreaName="4")])

    result = await subject.execute(data)

    assert result == SuccessData(
        public=ReloadLabwareResult(
            labwareId="my-labware-id",
            offsetId="labware-offset-id",
            locationSequence=[
                OnAddressableAreaLocationSequenceComponent(addressableAreaName="4")
            ],
        ),
        state_update=StateUpdate(
            labware_location=LabwareLocationUpdate(
                labware_id="my-labware-id",
                new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
                offset_id="labware-offset-id",
            )
        ),
    )


async def test_reload_labware_raises_labware_does_not_exist(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    equipment: EquipmentHandler,
    state_view: StateView,
) -> None:
    """A ReloadLabware command should raise if the specified labware is not loaded."""
    subject = ReloadLabwareImplementation(equipment=equipment, state_view=state_view)

    data = ReloadLabwareParams(
        labwareId="my-labware-id",
    )

    decoy.when(
        await equipment.reload_labware(
            labware_id="my-labware-id",
        )
    ).then_raise(LabwareNotLoadedError("What labware is this!"))

    with pytest.raises(LabwareNotLoadedError):
        await subject.execute(data)
