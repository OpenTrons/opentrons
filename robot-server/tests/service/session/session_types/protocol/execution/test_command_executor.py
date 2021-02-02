from mock import MagicMock, patch, PropertyMock, AsyncMock
from datetime import datetime
import pytest

from robot_server.service.session.command_execution.command import Command
from robot_server.service.session.errors import UnsupportedCommandException
from robot_server.service.session.models.command import SimpleCommandRequest
from robot_server.service.session.models.command_definitions import \
    ProtocolCommand
from robot_server.service.session.models.common import EmptyModel
from robot_server.service.session.session_types.protocol.execution import \
    command_executor
from robot_server.service.session.session_types.protocol.execution.command_executor import ProtocolCommandExecutor  # noqa: E501
from robot_server.service.session.session_types.protocol.execution.worker import _Worker  # noqa: E501
from robot_server.service.session.session_types.protocol.models import \
    ProtocolSessionEvent, EventSource


@pytest.fixture()
def mock_worker():
    m = AsyncMock(spec=_Worker)
    return m


@pytest.fixture
def protocol_command_executor(mock_worker):
    ProtocolCommandExecutor.create_worker = MagicMock(return_value=mock_worker)
    return ProtocolCommandExecutor(None, None)


@pytest.fixture
def dt() -> datetime:
    return datetime(2000, 4, 1)


@pytest.fixture
def patch_utc_now(dt: datetime):
    with patch.object(command_executor, 'utc_now') as p:
        p.return_value = dt
        yield p


@pytest.mark.parametrize(argnames="current_state,accepted_commands",
                         argvalues=[
                             ['loaded',
                              {ProtocolCommand.start_simulate,
                               ProtocolCommand.start_run}
                              ],
                             ['running',
                              {ProtocolCommand.cancel, ProtocolCommand.pause}
                              ],
                             ['finished',
                              {ProtocolCommand.start_simulate,
                               ProtocolCommand.start_run}
                              ],
                             ['stopped', {}],
                             ['paused',
                              {ProtocolCommand.cancel,
                               ProtocolCommand.resume}],
                             ['error', {}]
                         ])
async def test_command_state_reject(loop,
                                    current_state, accepted_commands,
                                    protocol_command_executor):
    """Test that commands are rejected based on state"""
    protocol_command_executor.current_state = current_state

    for protocol_command in ProtocolCommand:
        command = Command(request=SimpleCommandRequest(
            command=protocol_command,
            data=EmptyModel())
        )
        if protocol_command in accepted_commands:
            # Will not raise if in accepted commands
            await protocol_command_executor.execute(command)
        else:
            with pytest.raises(UnsupportedCommandException):
                await protocol_command_executor.execute(command)


@pytest.mark.parametrize(argnames="command,worker_method_name",
                         argvalues=[
                             [ProtocolCommand.start_run, "handle_run"],
                             [ProtocolCommand.start_simulate, "handle_simulate"],  # noqa: E501
                             [ProtocolCommand.cancel, "handle_cancel"],
                             [ProtocolCommand.pause, "handle_pause"],
                             [ProtocolCommand.resume, "handle_resume"]
                         ])
async def test_execute(loop, command, worker_method_name,
                       protocol_command_executor, mock_worker):
    # Patch the state command filter to allow all commands
    with patch.object(ProtocolCommandExecutor,
                      "STATE_COMMAND_MAP",
                      new={protocol_command_executor.current_state: ProtocolCommand}):  # noqa: E501
        protocol_command = Command(request=SimpleCommandRequest(
            command=command,
            data=EmptyModel())
        )
        await protocol_command_executor.execute(protocol_command)
        # Worker handler was called
        getattr(mock_worker, worker_method_name).assert_called_once()
        # Command is added to command list
        assert len(protocol_command_executor.events) == 1
        assert protocol_command_executor.events[0].event == command


class TestOnProtocolEvent:

    async def test_topic_session_payload(self, protocol_command_executor):
        mock_session = MagicMock()
        mock_session.state = "some_state"
        await protocol_command_executor.on_protocol_event({
            'topic': 'session',
            'payload': mock_session
        })
        assert protocol_command_executor.current_state == "some_state"

    async def test_topic_dict_payload(self, protocol_command_executor):
        await protocol_command_executor.on_protocol_event({
            'topic': 'session',
            'payload': {
                'state': 'some_state'
            }
        })
        assert protocol_command_executor.current_state == "some_state"

    @pytest.mark.parametrize(argnames="payload",
                             argvalues=[{},
                                        {'topic': 'soosion'},
                                        {'$': 'soosion'}
                                        ])
    async def test_body_invalid(self, protocol_command_executor, payload):
        ProtocolCommandExecutor.current_state = PropertyMock()
        await protocol_command_executor.on_protocol_event(payload)
        assert len(protocol_command_executor.events) == 0
        ProtocolCommandExecutor.current_state.assert_not_called()

    async def test_before(self, protocol_command_executor, patch_utc_now, dt):
        payload = {
            '$': 'before',
            'name': 'some event',
            'payload': {
                'text': 'this is what happened'
            }
        }
        await protocol_command_executor.on_protocol_event(payload)
        assert protocol_command_executor.events == [
            ProtocolSessionEvent(source=EventSource.protocol_event,
                                 event="some event.start",
                                 commandId="1",
                                 timestamp=dt,
                                 params={'text': 'this is what happened'})
        ]

    async def test_before_text_is_none(self, protocol_command_executor,
                                       patch_utc_now, dt):
        payload = {
            '$': 'before',
            'name': 'some event',
            'payload': {
                'text': None
            }
        }
        await protocol_command_executor.on_protocol_event(payload)
        assert protocol_command_executor.events == [
            ProtocolSessionEvent(source=EventSource.protocol_event,
                                 event="some event.start",
                                 commandId="1",
                                 timestamp=dt,
                                 params={'text': None})
        ]

    async def test_before_text_is_format_string(self,
                                                protocol_command_executor,
                                                patch_utc_now,
                                                dt):
        payload = {
            '$': 'before',
            'name': 'some event',
            'payload': {
                'text': '{oh} {no}',
                'oh': 2,
                'no': 5
            }
        }
        await protocol_command_executor.on_protocol_event(payload)
        assert protocol_command_executor.events == [
            ProtocolSessionEvent(source=EventSource.protocol_event,
                                 event="some event.start",
                                 commandId="1",
                                 timestamp=dt,
                                 params={'text': '2 5'})
        ]

    async def test_after(self, protocol_command_executor, patch_utc_now, dt):
        payload = {
            '$': 'after',
            'name': 'some event',
            'payload': {
                'text': 'this is it',
                'return': "done"
            }
        }
        protocol_command_executor._id_maker.create_id()
        await protocol_command_executor.on_protocol_event(payload)
        assert protocol_command_executor.events == [
            ProtocolSessionEvent(source=EventSource.protocol_event,
                                 event="some event.end",
                                 commandId="1",
                                 timestamp=dt,
                                 result="done"
                                 )
        ]

    async def test_ids(self, protocol_command_executor, patch_utc_now, dt):
        before = {
            '$': 'before',
            'name': 'event'
        }
        after = {
            '$': 'after',
            'name': 'event'
        }

        await protocol_command_executor.on_protocol_event(before)
        await protocol_command_executor.on_protocol_event(after)

        await protocol_command_executor.on_protocol_event(before)
        await protocol_command_executor.on_protocol_event(before)
        await protocol_command_executor.on_protocol_event(after)
        await protocol_command_executor.on_protocol_event(after)

        await protocol_command_executor.on_protocol_event(before)
        await protocol_command_executor.on_protocol_event(before)
        await protocol_command_executor.on_protocol_event(before)
        await protocol_command_executor.on_protocol_event(after)
        await protocol_command_executor.on_protocol_event(after)
        await protocol_command_executor.on_protocol_event(after)

        await protocol_command_executor.on_protocol_event(before)
        await protocol_command_executor.on_protocol_event(after)

        ids = [x.commandId for x in protocol_command_executor.events]
        assert ids == [
            "1", "1",
            "2", "3", "3", "2",
            "4", "5", "6", "6", "5", "4",
            "7", "7"
        ]
