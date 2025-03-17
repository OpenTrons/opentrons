"""Labware state store tests.

DEPRECATED: Testing LabwareStore independently of LabwareView is no
longer helpful. Try to add new tests to test_labware_state.py, where they can be
tested together, treating LabwareState as a private implementation detail.
"""

from typing import Optional
from opentrons.protocol_engine.state import update_types
import pytest

from datetime import datetime

from opentrons.calibration_storage.helpers import uri_from_details
from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons_shared_data.labware.labware_definition import (
    LabwareDefinition,
    LabwareDefinition2,
    Parameters2,
)
from opentrons.types import DeckSlotName

from opentrons.protocol_engine.types import (
    LabwareOffset,
    LabwareOffsetCreateInternal,
    LabwareOffsetVector,
    LegacyLabwareOffsetLocation,
    OnAddressableAreaOffsetLocationSequenceComponent,
    DeckSlotLocation,
    LoadedLabware,
    OFF_DECK_LOCATION,
)
from opentrons.protocol_engine.actions import (
    AddLabwareOffsetAction,
    AddLabwareDefinitionAction,
    SucceedCommandAction,
)
from opentrons.protocol_engine.state.labware import LabwareStore, LabwareState

from .command_fixtures import (
    create_comment_command,
)


@pytest.fixture
def subject(
    ot2_standard_deck_def: DeckDefinitionV5,
) -> LabwareStore:
    """Get a LabwareStore test subject."""
    return LabwareStore(
        deck_definition=ot2_standard_deck_def,
        deck_fixed_labware=[],
    )


def test_initial_state(
    ot2_standard_deck_def: DeckDefinitionV5,
    subject: LabwareStore,
) -> None:
    """It should create the labware store with preloaded fixed labware."""
    assert subject.state == LabwareState(
        deck_definition=ot2_standard_deck_def,
        labware_by_id={},
        labware_offsets_by_id={},
        definitions_by_uri={},
    )


def test_handles_add_labware_offset(
    subject: LabwareStore,
) -> None:
    """It should add the labware offset to the state and add the ID."""
    request = LabwareOffsetCreateInternal(
        definitionUri="offset-definition-uri",
        legacyLocation=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )

    resolved_offset = LabwareOffset(
        id="offset-id",
        createdAt=datetime(year=2021, month=1, day=2),
        definitionUri="offset-definition-uri",
        location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )

    subject.handle_action(
        AddLabwareOffsetAction(
            labware_offset_id="offset-id",
            created_at=datetime(year=2021, month=1, day=2),
            request=request,
        )
    )

    assert subject.state.labware_offsets_by_id == {"offset-id": resolved_offset}


@pytest.mark.parametrize(
    "display_name, offset_id", [("display-name", "offset-id"), (None, None)]
)
def test_handles_load_labware(
    subject: LabwareStore,
    well_plate_def: LabwareDefinition,
    display_name: Optional[str],
    offset_id: Optional[str],
) -> None:
    """It should add the labware data to the state."""
    offset_request = LabwareOffsetCreateInternal(
        definitionUri="offset-definition-uri",
        legacyLocation=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )

    command = create_comment_command()

    expected_definition_uri = uri_from_details(
        load_name=well_plate_def.parameters.loadName,
        namespace=well_plate_def.namespace,
        version=well_plate_def.version,
    )

    expected_labware_data = LoadedLabware(
        id="test-labware-id",
        loadName=well_plate_def.parameters.loadName,
        definitionUri=expected_definition_uri,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        offsetId=offset_id,
        displayName=display_name,
    )

    subject.handle_action(
        AddLabwareOffsetAction(
            request=offset_request,
            labware_offset_id="offset-id",
            created_at=datetime(year=2021, month=1, day=2),
        )
    )
    subject.handle_action(
        SucceedCommandAction(
            command=command,
            state_update=update_types.StateUpdate(
                loaded_labware=update_types.LoadedLabwareUpdate(
                    labware_id="test-labware-id",
                    definition=well_plate_def,
                    offset_id=offset_id,
                    display_name=display_name,
                    new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                ),
            ),
        )
    )

    assert subject.state.labware_by_id["test-labware-id"] == expected_labware_data

    assert subject.state.definitions_by_uri[expected_definition_uri] == well_plate_def


def test_handles_reload_labware(
    subject: LabwareStore,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should override labware data in the state."""
    command = create_comment_command()

    subject.handle_action(
        SucceedCommandAction(
            command=command,
            state_update=update_types.StateUpdate(
                loaded_labware=update_types.LoadedLabwareUpdate(
                    labware_id="test-labware-id",
                    definition=well_plate_def,
                    offset_id=None,
                    display_name="display-name",
                    new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                ),
            ),
        )
    )
    expected_definition_uri = uri_from_details(
        load_name=well_plate_def.parameters.loadName,
        namespace=well_plate_def.namespace,
        version=well_plate_def.version,
    )
    assert (
        subject.state.labware_by_id["test-labware-id"].definitionUri
        == expected_definition_uri
    )

    offset_request = LabwareOffsetCreateInternal(
        definitionUri="offset-definition-uri",
        legacyLocation=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    subject.handle_action(
        AddLabwareOffsetAction(
            request=offset_request,
            labware_offset_id="offset-id",
            created_at=datetime(year=2021, month=1, day=2),
        )
    )
    comment_command_2 = create_comment_command(
        command_id="comment-id-1",
    )
    subject.handle_action(
        SucceedCommandAction(
            command=comment_command_2,
            state_update=update_types.StateUpdate(
                labware_location=update_types.LabwareLocationUpdate(
                    new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                    offset_id="offset-id",
                    labware_id="test-labware-id",
                )
            ),
        )
    )

    expected_labware_data = LoadedLabware(
        id="test-labware-id",
        loadName=well_plate_def.parameters.loadName,
        definitionUri=expected_definition_uri,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        offsetId="offset-id",
        displayName="display-name",
    )
    assert subject.state.labware_by_id["test-labware-id"] == expected_labware_data
    assert subject.state.definitions_by_uri[expected_definition_uri] == well_plate_def


def test_handles_add_labware_definition(
    subject: LabwareStore,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should add the labware definition to the state."""
    expected_uri = uri_from_details(
        load_name=well_plate_def.parameters.loadName,
        namespace=well_plate_def.namespace,
        version=well_plate_def.version,
    )

    subject.handle_action(AddLabwareDefinitionAction(definition=well_plate_def))

    assert subject.state.definitions_by_uri[expected_uri] == well_plate_def


def test_handles_move_labware(
    subject: LabwareStore,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should update labware state with new location & offset."""
    comment_command = create_comment_command()
    offset_request = LabwareOffsetCreateInternal(
        definitionUri="offset-definition-uri",
        legacyLocation=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    subject.handle_action(
        AddLabwareOffsetAction(
            request=offset_request,
            labware_offset_id="old-offset-id",
            created_at=datetime(year=2021, month=1, day=2),
        )
    )
    subject.handle_action(
        SucceedCommandAction(
            command=comment_command,
            state_update=update_types.StateUpdate(
                loaded_labware=update_types.LoadedLabwareUpdate(
                    labware_id="my-labware-id",
                    definition=well_plate_def,
                    offset_id=None,
                    display_name="display-name",
                    new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                ),
            ),
        )
    )

    comment_2 = create_comment_command(
        command_id="my-command-id",
    )
    subject.handle_action(
        SucceedCommandAction(
            command=comment_2,
            state_update=update_types.StateUpdate(
                labware_location=update_types.LabwareLocationUpdate(
                    labware_id="my-labware-id",
                    offset_id="my-new-offset",
                    new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                ),
            ),
        )
    )

    assert subject.state.labware_by_id["my-labware-id"].location == DeckSlotLocation(
        slotName=DeckSlotName.SLOT_1
    )
    assert subject.state.labware_by_id["my-labware-id"].offsetId == "my-new-offset"


def test_handles_move_labware_off_deck(
    subject: LabwareStore,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should update labware state with new location & offset."""
    comment_command = create_comment_command()
    offset_request = LabwareOffsetCreateInternal(
        definitionUri="offset-definition-uri",
        legacyLocation=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    subject.handle_action(
        AddLabwareOffsetAction(
            request=offset_request,
            labware_offset_id="old-offset-id",
            created_at=datetime(year=2021, month=1, day=2),
        )
    )
    subject.handle_action(
        SucceedCommandAction(
            command=comment_command,
            state_update=update_types.StateUpdate(
                loaded_labware=update_types.LoadedLabwareUpdate(
                    labware_id="my-labware-id",
                    definition=well_plate_def,
                    offset_id=None,
                    display_name="display-name",
                    new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                ),
            ),
        )
    )

    comment_2 = create_comment_command(
        command_id="my-command-id",
    )
    subject.handle_action(
        SucceedCommandAction(
            command=comment_2,
            state_update=update_types.StateUpdate(
                labware_location=update_types.LabwareLocationUpdate(
                    labware_id="my-labware-id",
                    new_location=OFF_DECK_LOCATION,
                    offset_id=None,
                )
            ),
        )
    )
    assert subject.state.labware_by_id["my-labware-id"].location == OFF_DECK_LOCATION
    assert subject.state.labware_by_id["my-labware-id"].offsetId is None


def test_handle_batch_labware_loaded_update(
    subject: LabwareStore,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should consume batch_loaded_labware updates."""
    request = LabwareOffsetCreateInternal(
        definitionUri="offset-definition-uri",
        legacyLocation=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    subject.handle_action(
        AddLabwareOffsetAction(
            labware_offset_id="some-offset-id",
            created_at=datetime(year=2021, month=1, day=2),
            request=request,
        )
    )
    comment_command = create_comment_command()
    subject.handle_action(
        SucceedCommandAction(
            command=comment_command,
            state_update=update_types.StateUpdate(
                batch_loaded_labware=update_types.BatchLoadedLabwareUpdate(
                    new_locations_by_id={
                        "some-labware-id": DeckSlotLocation(
                            slotName=DeckSlotName.SLOT_1
                        ),
                        "some-other-labware-id": OFF_DECK_LOCATION,
                    },
                    offset_ids_by_id={
                        "some-labware-id": "some-offset-id",
                        "some-other-labware-id": None,
                    },
                    display_names_by_id={
                        "some-labware-id": "some-display-name",
                        "some-other-labware-id": None,
                    },
                    definitions_by_id={
                        "some-labware-id": LabwareDefinition2.model_construct(  # type: ignore[call-arg]
                            schemaVersion=2,
                            namespace="namespace-1",
                            version=1,
                            parameters=Parameters2.model_construct(  # type: ignore[call-arg]
                                loadName="load-name-1"
                            ),
                        ),
                        "some-other-labware-id": LabwareDefinition2.model_construct(  # type: ignore[call-arg]
                            schemaVersion=2,
                            namespace="namespace-2",
                            version=2,
                            parameters=Parameters2.model_construct(  # type: ignore[call-arg]
                                loadName="load-name-2"
                            ),
                        ),
                    },
                )
            ),
        )
    )
    some_labware = subject.state.labware_by_id["some-labware-id"]
    some_other_labware = subject.state.labware_by_id["some-other-labware-id"]
    assert some_labware.id == "some-labware-id"
    assert some_labware.location == DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    assert some_labware.loadName == "load-name-1"
    assert some_labware.definitionUri == "namespace-1/load-name-1/1"
    assert some_labware.offsetId == "some-offset-id"
    assert some_labware.displayName == "some-display-name"

    assert some_other_labware.id == "some-other-labware-id"
    assert some_other_labware.location == OFF_DECK_LOCATION
    assert some_other_labware.loadName == "load-name-2"
    assert some_other_labware.definitionUri == "namespace-2/load-name-2/2"
    assert some_other_labware.offsetId is None
    assert some_other_labware.displayName is None


def test_handle_batch_labware_location_update(
    subject: LabwareStore,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should consume batch_labware_location updates."""
    request = LabwareOffsetCreateInternal(
        definitionUri="offset-definition-uri",
        legacyLocation=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    subject.handle_action(
        AddLabwareOffsetAction(
            labware_offset_id="some-offset-id",
            created_at=datetime(year=2021, month=1, day=2),
            request=request,
        )
    )
    comment_command = create_comment_command()
    subject.handle_action(
        SucceedCommandAction(
            command=comment_command,
            state_update=update_types.StateUpdate(
                batch_loaded_labware=update_types.BatchLoadedLabwareUpdate(
                    new_locations_by_id={
                        "some-labware-id": DeckSlotLocation(
                            slotName=DeckSlotName.SLOT_1
                        ),
                        "some-other-labware-id": OFF_DECK_LOCATION,
                    },
                    offset_ids_by_id={
                        "some-labware-id": "some-offset-id",
                        "some-other-labware-id": None,
                    },
                    display_names_by_id={
                        "some-labware-id": "some-display-name",
                        "some-other-labware-id": None,
                    },
                    definitions_by_id={
                        "some-labware-id": LabwareDefinition2.model_construct(  # type: ignore[call-arg]
                            schemaVersion=2,
                            namespace="namespace-1",
                            version=1,
                            parameters=Parameters2.model_construct(  # type: ignore[call-arg]
                                loadName="load-name-1"
                            ),
                        ),
                        "some-other-labware-id": LabwareDefinition2.model_construct(  # type: ignore[call-arg]
                            schemaVersion=2,
                            namespace="namespace-2",
                            version=2,
                            parameters=Parameters2.model_construct(  # type: ignore[call-arg]
                                loadName="load-name-2"
                            ),
                        ),
                    },
                )
            ),
        )
    )
    comment_command2 = create_comment_command()
    subject.handle_action(
        SucceedCommandAction(
            command=comment_command2,
            state_update=update_types.StateUpdate(
                batch_labware_location=update_types.BatchLabwareLocationUpdate(
                    new_locations_by_id={
                        "some-labware-id": OFF_DECK_LOCATION,
                        "some-other-labware-id": DeckSlotLocation(
                            slotName=DeckSlotName.SLOT_1
                        ),
                    },
                    new_offset_ids_by_id={
                        "some-labware-id": None,
                        "some-other-labware-id": "some-offset-id",
                    },
                )
            ),
        )
    )
    some_labware = subject.state.labware_by_id["some-labware-id"]
    some_other_labware = subject.state.labware_by_id["some-other-labware-id"]
    assert some_labware.location == OFF_DECK_LOCATION
    assert some_labware.offsetId is None

    assert some_other_labware.location == DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    assert some_other_labware.offsetId == "some-offset-id"
