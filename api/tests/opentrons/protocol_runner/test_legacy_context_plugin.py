"""Tests for the PythonAndLegacyRunner's LegacyContextPlugin."""
import asyncio
import pytest
from anyio import to_thread
from decoy import Decoy, matchers
from datetime import datetime
from typing import Callable

from opentrons.legacy_commands.types import (
    CommandMessage as LegacyCommand,
    PauseMessage,
)
from opentrons.protocol_engine import (
    StateView,
    actions as pe_actions,
    commands as pe_commands,
)
from opentrons.legacy_broker import LegacyBroker
from opentrons.util.broker import ReadOnlyBroker

from opentrons.protocol_api.core.legacy.load_info import LoadInfo, LabwareLoadInfo

from opentrons.protocol_runner.legacy_command_mapper import LegacyCommandMapper
from opentrons.protocol_runner.legacy_context_plugin import LegacyContextPlugin

from opentrons.types import DeckSlotName

from opentrons_shared_data.labware.types import (
    LabwareDefinition2 as LabwareDefinition2Dict,
)


@pytest.fixture
def mock_legacy_broker(decoy: Decoy) -> LegacyBroker:
    """Get a mocked out `broker: LegacyBroker` dependency."""
    return decoy.mock(cls=LegacyBroker)


@pytest.fixture
def mock_equipment_broker(decoy: Decoy) -> ReadOnlyBroker[LoadInfo]:
    """Get a mocked out `equipment_broker: Broker` dependency."""
    return decoy.mock(cls=ReadOnlyBroker[LoadInfo])


@pytest.fixture
def mock_legacy_command_mapper(decoy: Decoy) -> LegacyCommandMapper:
    """Get a mocked out LegacyCommandMapper dependency."""
    return decoy.mock(cls=LegacyCommandMapper)


@pytest.fixture
def mock_state_view(decoy: Decoy) -> StateView:
    """Get a mock StateView."""
    return decoy.mock(cls=StateView)


@pytest.fixture
def mock_action_dispatcher(decoy: Decoy) -> pe_actions.ActionDispatcher:
    """Get a mock ActionDispatcher."""
    return decoy.mock(cls=pe_actions.ActionDispatcher)


@pytest.fixture
async def subject(
    mock_legacy_broker: LegacyBroker,
    mock_equipment_broker: ReadOnlyBroker[LoadInfo],
    mock_legacy_command_mapper: LegacyCommandMapper,
    mock_state_view: StateView,
    mock_action_dispatcher: pe_actions.ActionDispatcher,
) -> LegacyContextPlugin:
    """Get a configured LegacyContextPlugin with its dependencies mocked out."""
    plugin = LegacyContextPlugin(
        engine_loop=asyncio.get_running_loop(),
        broker=mock_legacy_broker,
        equipment_broker=mock_equipment_broker,
        legacy_command_mapper=mock_legacy_command_mapper,
    )
    plugin._configure(state=mock_state_view, action_dispatcher=mock_action_dispatcher)
    return plugin


class _ContextManager:
    """A placeholder in the shape of a context manager, to pass as a template to `decoy.mock()`."""

    def __enter__(self) -> None:
        raise NotImplementedError()

    def __exit__(self, type: object, value: object, traceback: object) -> None:
        raise NotImplementedError()


async def test_broker_subscribe_unsubscribe(
    decoy: Decoy,
    mock_legacy_broker: LegacyBroker,
    mock_equipment_broker: ReadOnlyBroker[LoadInfo],
    subject: LegacyContextPlugin,
) -> None:
    """It should subscribe to the brokers on setup and unsubscribe on teardown."""
    command_broker_unsubscribe: Callable[[], None] = decoy.mock(
        name="command_broker_unsubscribe"
    )
    equipment_broker_subscription_context = decoy.mock(cls=_ContextManager)

    decoy.when(
        mock_legacy_broker.subscribe(topic="command", handler=matchers.Anything())
    ).then_return(command_broker_unsubscribe)

    decoy.when(
        mock_equipment_broker.subscribed(callback=matchers.Anything())
    ).then_return(equipment_broker_subscription_context)

    subject.setup()
    await subject.teardown()

    decoy.verify(command_broker_unsubscribe())

    decoy.verify(
        [
            equipment_broker_subscription_context.__enter__(),  # type: ignore[func-returns-value]
            equipment_broker_subscription_context.__exit__(None, None, None),  # type: ignore[func-returns-value]
        ]
    )


async def test_command_broker_messages(
    decoy: Decoy,
    mock_legacy_broker: LegacyBroker,
    mock_equipment_broker: ReadOnlyBroker[LoadInfo],
    mock_legacy_command_mapper: LegacyCommandMapper,
    mock_action_dispatcher: pe_actions.ActionDispatcher,
    subject: LegacyContextPlugin,
) -> None:
    """It should dispatch commands from command broker messages."""
    # Capture the function that the plugin sets up as its command broker callback.
    # Also, ensure that all subscribe calls return an actual unsubscribe callable
    # (instead of Decoy's default `None`) so subject.teardown() works.
    command_handler_captor = matchers.Captor()
    decoy.when(
        mock_legacy_broker.subscribe(topic="command", handler=command_handler_captor)
    ).then_return(decoy.mock(name="command_broker_unsubscribe"))
    decoy.when(
        mock_equipment_broker.subscribed(callback=matchers.Anything())
    ).then_enter_with(None)

    subject.setup()

    handler: Callable[[LegacyCommand], None] = command_handler_captor.value

    legacy_command: PauseMessage = {
        "$": "before",
        "id": "message-id",
        "name": "command.PAUSE",
        "payload": {"userMessage": "hello", "text": "hello"},
        "error": None,
    }
    engine_command = pe_commands.Custom(
        id="command-id",
        key="command-key",
        status=pe_commands.CommandStatus.RUNNING,
        createdAt=datetime(year=2021, month=1, day=1),
        params=pe_commands.CustomParams(message="hello"),  # type: ignore[call-arg]
    )

    decoy.when(
        mock_legacy_command_mapper.map_command(command=legacy_command)
    ).then_return([pe_actions.SucceedCommandAction(engine_command)])

    await to_thread.run_sync(handler, legacy_command)

    await subject.teardown()

    decoy.verify(
        mock_action_dispatcher.dispatch(pe_actions.SucceedCommandAction(engine_command))
    )


async def test_equipment_broker_messages(
    decoy: Decoy,
    mock_legacy_broker: LegacyBroker,
    mock_equipment_broker: ReadOnlyBroker[LoadInfo],
    mock_legacy_command_mapper: LegacyCommandMapper,
    mock_action_dispatcher: pe_actions.ActionDispatcher,
    subject: LegacyContextPlugin,
    minimal_labware_def: LabwareDefinition2Dict,
) -> None:
    """It should dispatch commands from equipment broker messages."""
    # Capture the function that the plugin sets up as its labware load callback.
    labware_handler_captor = matchers.Captor()
    decoy.when(
        mock_legacy_broker.subscribe(topic="command", handler=matchers.Anything())
    ).then_return(decoy.mock(name="command_broker_unsubscribe"))
    decoy.when(
        mock_equipment_broker.subscribed(callback=labware_handler_captor)
    ).then_enter_with(None)

    subject.setup()

    handler: Callable[[LabwareLoadInfo], None] = labware_handler_captor.value

    load_info = LabwareLoadInfo(
        labware_definition=minimal_labware_def,
        labware_namespace="some_namespace",
        labware_load_name="some_load_name",
        labware_display_name=None,
        labware_version=123,
        deck_slot=DeckSlotName.SLOT_1,
        on_module=False,
        offset_id=None,
    )

    engine_command = pe_commands.Custom(
        id="command-id",
        key="command-key",
        status=pe_commands.CommandStatus.RUNNING,
        createdAt=datetime(year=2021, month=1, day=1),
        params=pe_commands.CustomParams(message="hello"),  # type: ignore[call-arg]
    )

    decoy.when(
        mock_legacy_command_mapper.map_equipment_load(load_info=load_info)
    ).then_return([pe_actions.SucceedCommandAction(command=engine_command)])

    await to_thread.run_sync(handler, load_info)

    await subject.teardown()

    decoy.verify(
        mock_action_dispatcher.dispatch(
            pe_actions.SucceedCommandAction(command=engine_command)
        ),
    )
