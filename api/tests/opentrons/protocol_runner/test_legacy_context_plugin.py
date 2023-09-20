"""Tests for the PythonAndLegacyRunner's LegacyContextPlugin."""
import pytest
from anyio import to_thread
from decoy import Decoy, matchers
from datetime import datetime
from typing import Callable

from opentrons.broker import Broker
from opentrons.equipment_broker import EquipmentBroker
from opentrons.commands.types import CommandMessage as LegacyCommand, PauseMessage
from opentrons.protocol_engine import (
    StateView,
    actions as pe_actions,
    commands as pe_commands,
)

from opentrons.protocol_runner.legacy_command_mapper import LegacyCommandMapper
from opentrons.protocol_runner.legacy_context_plugin import LegacyContextPlugin
from opentrons.protocol_runner.legacy_wrappers import (
    LegacyLoadInfo,
    LegacyLabwareLoadInfo,
)

from opentrons.types import DeckSlotName

from opentrons_shared_data.labware.dev_types import (
    LabwareDefinition as LabwareDefinitionDict,
)


@pytest.fixture
def mock_broker(decoy: Decoy) -> Broker:
    """Get a mocked out LegacyProtocolContext dependency."""
    return decoy.mock(cls=Broker)


@pytest.fixture
def mock_equipment_broker(decoy: Decoy) -> EquipmentBroker[LegacyLoadInfo]:
    """Get a mocked out LegacyProtocolContext dependency."""
    return decoy.mock(cls=EquipmentBroker)


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
def subject(
    mock_broker: Broker,
    mock_equipment_broker: EquipmentBroker[LegacyLoadInfo],
    mock_legacy_command_mapper: LegacyCommandMapper,
    mock_state_view: StateView,
    mock_action_dispatcher: pe_actions.ActionDispatcher,
) -> LegacyContextPlugin:
    """Get a configured LegacyContextPlugin with its dependencies mocked out."""
    plugin = LegacyContextPlugin(
        broker=mock_broker,
        equipment_broker=mock_equipment_broker,
        legacy_command_mapper=mock_legacy_command_mapper,
    )
    plugin._configure(state=mock_state_view, action_dispatcher=mock_action_dispatcher)
    return plugin


async def test_broker_subscribe_unsubscribe(
    decoy: Decoy,
    mock_broker: Broker,
    mock_equipment_broker: EquipmentBroker[LegacyLoadInfo],
    subject: LegacyContextPlugin,
) -> None:
    """It should subscribe to the brokers on setup and unsubscribe on teardown."""
    command_broker_unsubscribe: Callable[[], None] = decoy.mock()
    equipment_broker_unsubscribe: Callable[[], None] = decoy.mock()

    decoy.when(
        mock_broker.subscribe(topic="command", handler=matchers.Anything())
    ).then_return(command_broker_unsubscribe)

    decoy.when(
        mock_equipment_broker.subscribe(callback=matchers.Anything())
    ).then_return(equipment_broker_unsubscribe)

    subject.setup()
    await subject.teardown()

    decoy.verify(command_broker_unsubscribe())
    decoy.verify(equipment_broker_unsubscribe())


async def test_command_broker_messages(
    decoy: Decoy,
    mock_broker: Broker,
    mock_equipment_broker: EquipmentBroker[LegacyLoadInfo],
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
        mock_broker.subscribe(topic="command", handler=command_handler_captor)
    ).then_return(decoy.mock())
    decoy.when(
        mock_equipment_broker.subscribe(callback=matchers.Anything())
    ).then_return(decoy.mock())

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
    ).then_return([pe_actions.UpdateCommandAction(engine_command, private_result=None)])

    await to_thread.run_sync(handler, legacy_command)

    await subject.teardown()

    decoy.verify(
        mock_action_dispatcher.dispatch(
            pe_actions.UpdateCommandAction(engine_command, private_result=None)
        )
    )


async def test_equipment_broker_messages(
    decoy: Decoy,
    mock_broker: Broker,
    mock_equipment_broker: EquipmentBroker[LegacyLoadInfo],
    mock_legacy_command_mapper: LegacyCommandMapper,
    mock_action_dispatcher: pe_actions.ActionDispatcher,
    subject: LegacyContextPlugin,
    minimal_labware_def: LabwareDefinitionDict,
) -> None:
    """It should dispatch commands from equipment broker messages."""
    # Capture the function that the plugin sets up as its labware load callback.
    # Also, ensure that all subscribe calls return an actual unsubscribe callable
    # (instead of Decoy's default `None`) so subject.teardown() works.
    labware_handler_captor = matchers.Captor()
    decoy.when(
        mock_broker.subscribe(topic="command", handler=matchers.Anything())
    ).then_return(decoy.mock())
    decoy.when(
        mock_equipment_broker.subscribe(callback=labware_handler_captor)
    ).then_return(decoy.mock())

    subject.setup()

    handler: Callable[[LegacyLabwareLoadInfo], None] = labware_handler_captor.value

    load_info = LegacyLabwareLoadInfo(
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
    ).then_return((engine_command, None))

    await to_thread.run_sync(handler, load_info)

    await subject.teardown()

    decoy.verify(
        mock_action_dispatcher.dispatch(
            pe_actions.UpdateCommandAction(command=engine_command, private_result=None)
        ),
    )
