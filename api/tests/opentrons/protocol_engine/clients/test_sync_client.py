"""Tests for the Protocol Context's synchronous engine adapter.

Since Python protocol execution happens off the main thread, these tests call
the subject's methods in a synchronous context in a child thread to ensure:

- In the Protocol execution thread, calls are synchronous and block until
    command execution is complete.
- In the main thread, the Protocol Engine does its work in the main event
    loop, without blocking.
"""
import pytest
from decoy import Decoy, matchers

from opentrons_shared_data.labware.dev_types import LabwareDefinition
from opentrons.types import DeckSlotName
from opentrons.protocol_engine import DeckSlotLocation, commands
from opentrons.protocol_engine.clients import SyncClient, AbstractSyncTransport


UUID_MATCHER = matchers.StringMatching(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
)


@pytest.fixture
def decoy() -> Decoy:
    """Create a Decoy state container for this test suite."""
    return Decoy()


@pytest.fixture
def transport(decoy: Decoy) -> AbstractSyncTransport:
    """Get a stubbed out AbstractSyncTransport."""
    return decoy.create_decoy(spec=AbstractSyncTransport)  # type: ignore[misc]


@pytest.fixture
def subject(transport: AbstractSyncTransport) -> SyncClient:
    """Get a SyncProtocolEngine test subject."""
    return SyncClient(transport=transport)


@pytest.fixture
def stubbed_load_labware_result(
    decoy: Decoy,
    transport: AbstractSyncTransport,
    minimal_labware_def: LabwareDefinition
) -> commands.LoadLabwareResult:
    """Set up the protocol engine with default stubbed response for load labware."""
    request = commands.LoadLabwareRequest(
        location=DeckSlotLocation(slot=DeckSlotName.SLOT_5),
        loadName="some_labware",
        namespace="opentrons",
        version=1,
    )

    result = commands.LoadLabwareResult(
        labwareId="abc123",
        definition=minimal_labware_def,
        calibration=(1, 2, 3),
    )

    decoy.when(
        transport.execute_command(request=request, command_id=UUID_MATCHER)
    ).then_return(result)

    return result


def test_load_labware(
    stubbed_load_labware_result: commands.LoadLabwareResult,
    subject: SyncClient,
) -> None:
    """It should execute a load labware command."""
    result = subject.load_labware(
        location=DeckSlotLocation(slot=DeckSlotName.SLOT_5),
        load_name="some_labware",
        namespace="opentrons",
        version=1,
    )

    assert result == stubbed_load_labware_result
