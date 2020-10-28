"""Pub sub integration tests."""
from typing import AsyncGenerator

import pytest

from notify_server.clients import publisher, subscriber
from notify_server.models.event import Event
from notify_server.settings import Settings

pytestmark = pytest.mark.asyncio

TOPICS = 'topic1', 'topic2'


@pytest.fixture
async def two_publishers(settings: Settings) -> AsyncGenerator:
    """Create two publishers."""
    pub1 = publisher.create(settings.publisher_address.connection_string())
    pub2 = publisher.create(settings.publisher_address.connection_string())
    yield pub1, pub2
    await pub1.stop()
    await pub2.stop()


@pytest.fixture
async def subscriber_all_topics(settings: Settings) -> AsyncGenerator:
    """Create subscriber for all topics."""
    sub = subscriber.create(settings.subscriber_address.connection_string(),
                            TOPICS)
    yield sub
    await sub.stop()


@pytest.fixture
async def subscriber_first_topic(settings: Settings) -> AsyncGenerator:
    """Create subscriber for first topic."""
    sub = subscriber.create(settings.subscriber_address.connection_string(),
                            (TOPICS[0],))
    yield sub
    await sub.stop()


async def test_two_pub_two_sub_two_topics(
        server_fixture: AsyncGenerator,
        two_publishers: AsyncGenerator,
        subscriber_all_topics: AsyncGenerator,
        subscriber_first_topic: AsyncGenerator,
        event: Event) -> None:
    """Test that two publishers reaches two subscribers of different topics."""
    pub1, pub2 = two_publishers

    await pub1.send("topic1", event)
    await pub2.send("topic2", event)

    e = await subscriber_first_topic.next_event()
    assert e.topic == "topic1"
    assert e.event == event

    e = await subscriber_all_topics.next_event()
    assert e.topic == "topic1"
    assert e.event == event

    e = await subscriber_all_topics.next_event()
    assert e.topic == "topic2"
    assert e.event == event
