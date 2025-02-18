"""Test the loadLidStack command."""

import inspect

import pytest
from decoy import Decoy

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from opentrons.types import DeckSlotName

from opentrons.protocol_engine.resources import labware_validation
from opentrons.protocol_engine.execution import LoadedLabwareData, EquipmentHandler
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.types import (
    OnLabwareLocation,
    DeckSlotLocation,
    OnLabwareLocationSequenceComponent,
    OnAddressableAreaLocationSequenceComponent,
)
from opentrons.protocol_engine.state.update_types import (
    LoadedLidStackUpdate,
    StateUpdate,
)
from opentrons.protocol_engine.commands.command import SuccessData

from opentrons.protocol_engine.commands.load_lid_stack import (
    LoadLidStackParams,
    LoadLidStackResult,
    LoadLidStackImplementation,
)


@pytest.fixture(autouse=True)
def patch_mock_labware_validation(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out labware_validations.py functions."""
    for name, func in inspect.getmembers(labware_validation, inspect.isfunction):
        monkeypatch.setattr(labware_validation, name, decoy.mock(func=func))


async def test_load_lid_stack(
    decoy: Decoy,
    tiprack_lid_def: LabwareDefinition,
    lid_stack_def: LabwareDefinition,
    equipment: EquipmentHandler,
    state_view: StateView,
) -> None:
    """It should load a lid onto a labware."""
    subject = LoadLidStackImplementation(equipment=equipment, state_view=state_view)
    input_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_A1)

    data = LoadLidStackParams(
        location=input_location,
        loadName="someLid",
        namespace="someNamespace",
        version=1,
        quantity=3,
    )

    decoy.when(
        state_view.addressable_areas.raise_if_area_not_in_deck_configuration("A1")
    ).then_return(True)
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(location=input_location)
    ).then_return(input_location)

    decoy.when(
        await equipment.load_labware(
            load_name="protocol_engine_lid_stack_object",
            namespace="opentrons",
            version=1,
            location=input_location,
            labware_id=None,
        )
    ).then_return(
        LoadedLabwareData(
            labware_id="stack-labware-id",
            definition=lid_stack_def,
            offsetId=None,
        )
    )
    decoy.when(
        labware_validation.validate_definition_is_system(lid_stack_def)
    ).then_return(True)

    lids = [
        LoadedLabwareData(
            labware_id="lid-labware-1", definition=tiprack_lid_def, offsetId=None
        ),
        LoadedLabwareData(
            labware_id="lid-labware-2",
            definition=tiprack_lid_def,
            offsetId=None,
        ),
        LoadedLabwareData(
            labware_id="lid-labware-3", definition=tiprack_lid_def, offsetId=None
        ),
    ]

    decoy.when(
        await equipment.load_lids(
            load_name="someLid",
            namespace="someNamespace",
            version=1,
            location=OnLabwareLocation(labwareId="stack-labware-id"),
            quantity=3,
            labware_ids=None,
        )
    ).then_return(lids)

    stack_loc = OnAddressableAreaLocationSequenceComponent(addressableAreaName="A1")
    on_stack_loc = OnLabwareLocationSequenceComponent(
        labwareId="stack-labware-id", lidId=None
    )
    decoy.when(
        state_view.geometry.get_predicted_location_sequence(input_location)
    ).then_return([stack_loc])

    result = await subject.execute(data)
    expected_result = SuccessData(
        public=LoadLidStackResult(
            stackLabwareId="stack-labware-id",
            labwareIds=["lid-labware-1", "lid-labware-2", "lid-labware-3"],
            definition=tiprack_lid_def,
            stackDefinition=lid_stack_def,
            location=input_location,
            stackLocationSequence=[stack_loc],
            locationSequences=[
                [on_stack_loc, stack_loc],
                [
                    OnLabwareLocationSequenceComponent(
                        labwareId="lid-labware-1", lidId=None
                    ),
                    on_stack_loc,
                    stack_loc,
                ],
                [
                    OnLabwareLocationSequenceComponent(
                        labwareId="lid-labware-2", lidId=None
                    ),
                    OnLabwareLocationSequenceComponent(
                        labwareId="lid-labware-1", lidId=None
                    ),
                    on_stack_loc,
                    stack_loc,
                ],
            ],
        ),
        state_update=StateUpdate(
            loaded_lid_stack=LoadedLidStackUpdate(
                stack_id="stack-labware-id",
                stack_object_definition=lid_stack_def,
                stack_location=input_location,
                definition=tiprack_lid_def,
                new_locations_by_id={
                    "lid-labware-1": OnLabwareLocation(labwareId="stack-labware-id"),
                    "lid-labware-2": OnLabwareLocation(labwareId="lid-labware-1"),
                    "lid-labware-3": OnLabwareLocation(labwareId="lid-labware-2"),
                },
            )
        ),
    )
    assert result.public.locationSequences == expected_result.public.locationSequences
    assert result == result
