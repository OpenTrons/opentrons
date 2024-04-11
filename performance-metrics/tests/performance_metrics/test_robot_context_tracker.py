"""Tests for the RobotContextTracker class in performance_metrics.robot_context_tracker."""

import asyncio
import pytest
from performance_metrics.robot_context_tracker import RobotContextTracker
from performance_metrics.datashapes import RobotContextStates
from time import sleep

# Corrected times in seconds
STARTING_TIME = 0.001
CALIBRATING_TIME = 0.002
ANALYZING_TIME = 0.003
RUNNING_TIME = 0.004
SHUTTING_DOWN_TIME = 0.005


@pytest.fixture
def robot_context_tracker() -> RobotContextTracker:
    """Fixture to provide a fresh instance of RobotContextTracker for each test."""
    return RobotContextTracker()


def test_robot_context_tracker(robot_context_tracker: RobotContextTracker) -> None:
    """Tests the tracking of various robot context states through RobotContextTracker."""

    @robot_context_tracker.track(state=RobotContextStates.STARTING_UP)
    def starting_robot() -> None:
        sleep(STARTING_TIME)

    @robot_context_tracker.track(state=RobotContextStates.CALIBRATING)
    def calibrating_robot() -> None:
        sleep(CALIBRATING_TIME)

    @robot_context_tracker.track(state=RobotContextStates.ANALYZING_PROTOCOL)
    def analyzing_protocol() -> None:
        sleep(ANALYZING_TIME)

    @robot_context_tracker.track(state=RobotContextStates.RUNNING_PROTOCOL)
    def running_protocol() -> None:
        sleep(RUNNING_TIME)

    @robot_context_tracker.track(state=RobotContextStates.SHUTTING_DOWN)
    def shutting_down_robot() -> None:
        sleep(SHUTTING_DOWN_TIME)

    # Ensure storage is initially empty
    assert (
        len(robot_context_tracker._storage) == 0
    ), "Storage should be initially empty."

    starting_robot()
    calibrating_robot()
    analyzing_protocol()
    running_protocol()
    shutting_down_robot()

    # Verify that all states were tracked
    assert len(robot_context_tracker._storage) == 5, "All states should be tracked."

    # Validate the sequence and accuracy of tracked states
    expected_states = [
        RobotContextStates.STARTING_UP,
        RobotContextStates.CALIBRATING,
        RobotContextStates.ANALYZING_PROTOCOL,
        RobotContextStates.RUNNING_PROTOCOL,
        RobotContextStates.SHUTTING_DOWN,
    ]
    for i, state in enumerate(expected_states):
        assert (
            RobotContextStates.from_id(robot_context_tracker._storage[i].state.state_id)
            == state
        ), f"State at index {i} should be {state}."


def test_multiple_operations_single_state(
    robot_context_tracker: RobotContextTracker,
) -> None:
    """Tests tracking multiple operations within a single robot context state."""

    @robot_context_tracker.track(state=RobotContextStates.RUNNING_PROTOCOL)
    def first_operation() -> None:
        sleep(RUNNING_TIME)

    @robot_context_tracker.track(state=RobotContextStates.RUNNING_PROTOCOL)
    def second_operation() -> None:
        sleep(RUNNING_TIME)

    first_operation()
    second_operation()

    assert (
        len(robot_context_tracker._storage) == 2
    ), "Both operations should be tracked."
    assert (
        robot_context_tracker._storage[0].state
        == robot_context_tracker._storage[1].state
        == RobotContextStates.RUNNING_PROTOCOL
    ), "Both operations should have the same state."


def test_exception_handling_in_tracked_function(
    robot_context_tracker: RobotContextTracker,
) -> None:
    """Ensures exceptions in tracked operations are handled correctly."""

    @robot_context_tracker.track(state=RobotContextStates.SHUTTING_DOWN)
    def error_prone_operation() -> None:
        sleep(SHUTTING_DOWN_TIME)
        raise RuntimeError("Simulated operation failure")

    with pytest.raises(RuntimeError):
        error_prone_operation()

    assert (
        len(robot_context_tracker._storage) == 1
    ), "Failed operation should still be tracked."
    assert (
        robot_context_tracker._storage[0].state == RobotContextStates.SHUTTING_DOWN
    ), "State should be correctly logged despite the exception."


@pytest.mark.asyncio
async def test_async_operation_tracking(
    robot_context_tracker: RobotContextTracker,
) -> None:
    """Tests tracking of an asynchronous operation."""

    @robot_context_tracker.track(state=RobotContextStates.ANALYZING_PROTOCOL)
    async def async_analyzing_operation() -> None:
        await asyncio.sleep(ANALYZING_TIME)

    await async_analyzing_operation()

    assert (
        len(robot_context_tracker._storage) == 1
    ), "Async operation should be tracked."
    assert (
        robot_context_tracker._storage[0].state == RobotContextStates.ANALYZING_PROTOCOL
    ), "State should be ANALYZING_PROTOCOL."


@pytest.mark.asyncio
async def test_async_operation_timing_accuracy(
    robot_context_tracker: RobotContextTracker,
) -> None:
    """Tests the timing accuracy of an async operation tracking."""

    @robot_context_tracker.track(state=RobotContextStates.RUNNING_PROTOCOL)
    async def async_running_operation() -> None:
        await asyncio.sleep(RUNNING_TIME)

    await async_running_operation()

    duration_data = robot_context_tracker._storage[0]
    measured_duration = (
        duration_data.duration_end
        - duration_data.duration_start
    )
    assert (
        abs(measured_duration - RUNNING_TIME * 1e9) < 1e7
    ), "Measured duration for async operation should closely match the expected duration."


@pytest.mark.asyncio
async def test_exception_in_async_operation(
    robot_context_tracker: RobotContextTracker,
) -> None:
    """Ensures exceptions in tracked async operations are correctly handled."""

    @robot_context_tracker.track(state=RobotContextStates.SHUTTING_DOWN)
    async def async_error_prone_operation() -> None:
        await asyncio.sleep(SHUTTING_DOWN_TIME)
        raise RuntimeError("Simulated async operation failure")

    with pytest.raises(RuntimeError):
        await async_error_prone_operation()

    assert (
        len(robot_context_tracker._storage) == 1
    ), "Failed async operation should still be tracked."
    assert (
        robot_context_tracker._storage[0].state == RobotContextStates.SHUTTING_DOWN
    ), "State should be SHUTTING_DOWN despite the exception."


@pytest.mark.asyncio
async def test_concurrent_async_operations(
    robot_context_tracker: RobotContextTracker,
) -> None:
    """Tests tracking of concurrent async operations."""

    @robot_context_tracker.track(state=RobotContextStates.CALIBRATING)
    async def first_async_calibrating() -> None:
        await asyncio.sleep(CALIBRATING_TIME)

    @robot_context_tracker.track(state=RobotContextStates.CALIBRATING)
    async def second_async_calibrating() -> None:
        await asyncio.sleep(CALIBRATING_TIME)

    await asyncio.gather(first_async_calibrating(), second_async_calibrating())

    assert (
        len(robot_context_tracker._storage) == 2
    ), "Both concurrent async operations should be tracked."
    assert all(
        data.state == RobotContextStates.CALIBRATING
        for data in robot_context_tracker._storage
    ), "All tracked operations should be in CALIBRATING state."
