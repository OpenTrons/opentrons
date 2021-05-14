from datetime import timedelta, datetime

import pytest
from mock import patch, MagicMock
from typing import Any

from robot_server import util


@pytest.fixture
def mock_start_time():
    return datetime(2020, 5, 1)


@pytest.fixture
def mock_utc_now(mock_start_time):
    """Mock util.utc_now.

    First call will be mock_start_time. Subsequent calls will increment by
    1 day."""
    class _TimeIncrementer:
        def __init__(self, t):
            self._time = t

        def __call__(self, *args, **kwargs):
            ret = self._time
            self._time += timedelta(days=1)
            return ret

    with patch.object(util, 'utc_now') as p:
        p.side_effect = _TimeIncrementer(mock_start_time)
        yield p


def test_duration(mock_utc_now, mock_start_time):
    with util.duration() as t:
        pass

    assert t.start == mock_start_time
    assert t.end == mock_start_time + timedelta(days=1)


def test_duration_raises(mock_utc_now, mock_start_time):
    try:
        with util.duration() as t:
            raise AssertionError()
    except AssertionError:
        pass

    assert t.start == mock_start_time
    assert t.end == mock_start_time + timedelta(days=1)


async def test_call_once():
    return_value: Any = dict()
    mock = MagicMock(return_value=return_value)

    @util.call_once
    async def f(arg1):
        return mock(arg1)

    # Call wrapped twice
    a = await f(1)
    b = await f(2)
    # Results are the same object
    assert a is b is return_value
    # Mock is only called once.
    mock.assert_called_once_with(1)
