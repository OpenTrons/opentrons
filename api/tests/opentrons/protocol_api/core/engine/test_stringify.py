"""Unit tests for `stringify`."""


from decoy import Decoy
from opentrons_shared_data.labware.labware_definition import LabwareDefinition2

from opentrons.protocol_api.core.engine import stringify as subject
from opentrons.protocol_engine.clients.sync_client import SyncClient
from opentrons.protocol_engine.types import (
    OFF_DECK_LOCATION,
    DeckSlotLocation,
    ModuleDefinition,
    ModuleLocation,
    OnLabwareLocation,
)
from opentrons.types import DeckSlotName


def _make_dummy_labware_definition(
    decoy: Decoy, display_name: str
) -> LabwareDefinition2:
    mock = decoy.mock(cls=LabwareDefinition2)
    decoy.when(mock.metadata.displayName).then_return(display_name)
    return mock


def _make_dummy_module_definition(decoy: Decoy, display_name: str) -> ModuleDefinition:
    mock = decoy.mock(cls=ModuleDefinition)
    decoy.when(mock.displayName).then_return(display_name)
    return mock


def test_well_on_labware_without_user_display_name(decoy: Decoy) -> None:
    """Test stringifying a well on a labware that doesn't have a user-defined label."""
    mock_client = decoy.mock(cls=SyncClient)
    decoy.when(
        mock_client.state.labware.get_user_specified_display_name("labware-id")
    ).then_return(None)
    decoy.when(mock_client.state.labware.get_definition("labware-id")).then_return(
        _make_dummy_labware_definition(decoy, "definition-display-name")
    )
    decoy.when(mock_client.state.labware.get_location("labware-id")).then_return(
        OFF_DECK_LOCATION
    )

    result = subject.well(
        engine_client=mock_client, well_name="well-name", labware_id="labware-id"
    )
    assert result == "well-name of definition-display-name on [off-deck]"


def test_well_on_labware_with_user_display_name(decoy: Decoy) -> None:
    """Test stringifying a well on a labware that does have a user-defined label."""
    mock_client = decoy.mock(cls=SyncClient)
    decoy.when(
        mock_client.state.labware.get_user_specified_display_name("labware-id")
    ).then_return("user-display-name")
    decoy.when(mock_client.state.labware.get_definition("labware-id")).then_return(
        _make_dummy_labware_definition(decoy, "definition-display-name")
    )
    decoy.when(mock_client.state.labware.get_location("labware-id")).then_return(
        OFF_DECK_LOCATION
    )

    result = subject.well(
        engine_client=mock_client, well_name="well-name", labware_id="labware-id"
    )
    assert result == "well-name of user-display-name on [off-deck]"


def test_well_on_labware_with_complicated_location(decoy: Decoy) -> None:
    """Test stringifying a well on a labware with a deeply-nested location."""
    mock_client = decoy.mock(cls=SyncClient)

    decoy.when(
        mock_client.state.labware.get_user_specified_display_name("labware-id-1")
    ).then_return(None)
    decoy.when(mock_client.state.labware.get_definition("labware-id-1")).then_return(
        _make_dummy_labware_definition(decoy, "lw-1-display-name")
    )
    decoy.when(mock_client.state.labware.get_location("labware-id-1")).then_return(
        OnLabwareLocation(labwareId="labware-id-2")
    )

    decoy.when(
        mock_client.state.labware.get_user_specified_display_name("labware-id-2")
    ).then_return(None)
    decoy.when(mock_client.state.labware.get_definition("labware-id-2")).then_return(
        _make_dummy_labware_definition(decoy, "lw-2-display-name")
    )
    decoy.when(mock_client.state.labware.get_location("labware-id-2")).then_return(
        ModuleLocation(moduleId="module-id")
    )

    decoy.when(mock_client.state.modules.get_definition("module-id")).then_return(
        _make_dummy_module_definition(decoy, "module-display-name")
    )
    decoy.when(mock_client.state.modules.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_C2)
    )

    result = subject.well(
        engine_client=mock_client, well_name="well-name", labware_id="labware-id-1"
    )
    assert (
        result
        == "well-name of lw-1-display-name on lw-2-display-name on module-display-name on slot C2"
    )
