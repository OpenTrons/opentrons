from typing import AsyncGenerator

import pytest
from mock import MagicMock, patch
from starlette.websockets import WebSocket
from robot_server.service.notifications import handle_subscriber
from robot_server.settings import get_settings


@pytest.fixture
def mock_socket() -> MagicMock:
    """A mock websocket."""
    return MagicMock(spec=WebSocket)


async def test_create_subscriber(
        mock_socket: MagicMock) -> None:
    """Test that a subscriber is created correctly."""
    with patch.object(handle_subscriber, "create") as mock_create_sub:
        with patch.object(handle_subscriber, "route_events") as mock_route:
            await handle_subscriber.handle_socket(mock_socket, ["a", "b"])
            mock_create_sub.assert_called_once_with(
                get_settings().notification_server_subscriber_address,
                ["a", "b"]
            )
            mock_route.assert_called_once()


async def test_route_events(
        mock_socket: MagicMock,
        mock_subscriber: AsyncGenerator,
        topic_event) -> None:
    """Test that an event is read from subscriber and sent to websocket."""
    with patch.object(handle_subscriber, "send") as mock_send:
        await handle_subscriber.route_events(mock_socket,
                                             mock_subscriber)
        mock_send.assert_called_once_with(mock_socket, topic_event)


async def test_send_entry(
        topic_event,
        mock_socket: MagicMock) -> None:
    """Test that entry is sent as json."""
    await handle_subscriber.send(mock_socket, topic_event)
    mock_socket.send_text.assert_called_once_with(topic_event.json())
