"""Test the loadLid command."""

import inspect

import pytest
from decoy import Decoy

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from opentrons.protocol_engine.resources import labware_validation
from opentrons.protocol_engine.execution import LoadedLabwareData, EquipmentHandler
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.types import (
    OnLabwareLocation,
    OnLabwareLocationSequenceComponent,
    OnAddressableAreaLocationSequenceComponent,
)
from opentrons.protocol_engine.state.update_types import (
    LabwareLidUpdate,
    LoadedLabwareUpdate,
    StateUpdate,
)
from opentrons.protocol_engine.commands.command import SuccessData

from opentrons.protocol_engine.commands.load_lid import (
    LoadLidParams,
    LoadLidResult,
    LoadLidImplementation,
)


@pytest.fixture(autouse=True)
def patch_mock_labware_validation(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out labware_validations.py functions."""
    for name, func in inspect.getmembers(labware_validation, inspect.isfunction):
        monkeypatch.setattr(labware_validation, name, decoy.mock(func=func))


async def test_load_lid_on_tiprack(
    decoy: Decoy,
    tiprack_lid_def: LabwareDefinition,
    equipment: EquipmentHandler,
    state_view: StateView,
) -> None:
    """It should load a lid onto a labware."""
    subject = LoadLidImplementation(equipment=equipment, state_view=state_view)
    input_location = OnLabwareLocation(labwareId="some-labware-id")
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(location=input_location)
    ).then_return(input_location)
    decoy.when(
        await equipment.load_labware(
            load_name="someLid",
            namespace="someNamespace",
            version=1,
            location=input_location,
            labware_id=None,
        )
    ).then_return(
        LoadedLabwareData(
            labware_id="labware-id",
            definition=tiprack_lid_def,
            offsetId=None,
        )
    )

    decoy.when(
        labware_validation.validate_definition_is_lid(tiprack_lid_def)
    ).then_return(True)

    decoy.when(
        state_view.labware.raise_if_labware_cannot_be_stacked(
            top_labware_definition=tiprack_lid_def,
            bottom_labware_id=input_location.labwareId,
        )
    ).then_return(True)
    decoy.when(
        state_view.geometry.get_location_sequence(input_location.labwareId)
    ).then_return(
        [OnAddressableAreaLocationSequenceComponent(addressableAreaName="someAa")]
    )

    result = await subject.execute(
        LoadLidParams(
            location=input_location,
            loadName="someLid",
            namespace="someNamespace",
            version=1,
        )
    )
    assert result == SuccessData(
        public=LoadLidResult(
            definition=tiprack_lid_def,
            labwareId="labware-id",
            locationSequence=[
                OnLabwareLocationSequenceComponent(
                    labwareId=input_location.labwareId, lidId="labware-id"
                ),
                OnAddressableAreaLocationSequenceComponent(
                    addressableAreaName="someAa"
                ),
            ],
        ),
        state_update=StateUpdate(
            labware_lid=LabwareLidUpdate(
                parent_labware_ids=["some-labware-id"], lid_ids=["labware-id"]
            ),
            loaded_labware=LoadedLabwareUpdate(
                definition=tiprack_lid_def,
                labware_id="labware-id",
                offset_id=None,
                display_name=None,
                new_location=input_location,
            ),
        ),
    )
