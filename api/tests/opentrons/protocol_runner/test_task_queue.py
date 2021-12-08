"""Tests for TaskQueue."""
import asyncio
import pytest
from decoy import Decoy
from opentrons.protocol_runner.task_queue import TaskQueue


async def test_set_run_func(decoy: Decoy) -> None:
    """It should be able to add a task for the "run" phase."""
    run_func = decoy.mock(is_async=True)

    subject = TaskQueue()
    subject.set_run_func(func=run_func)
    subject.start()
    await subject.join()

    decoy.verify(await run_func())


async def test_set_cleanup_func(decoy: Decoy) -> None:
    """It should be able to add a task for the "cleanup" phase."""
    cleanup_func = decoy.mock(is_async=True)

    subject = TaskQueue()
    subject.set_cleanup_func(func=cleanup_func)
    subject.start()
    await subject.join()

    decoy.verify(await cleanup_func(error=None))


async def test_passes_args(decoy: Decoy) -> None:
    """It should pass kwargs to the run phase function."""
    run_func = decoy.mock(is_async=True)

    subject = TaskQueue()
    subject.set_run_func(func=run_func, hello="world")
    subject.start()
    await subject.join()

    decoy.verify(await run_func(hello="world"))


async def test_cleanup_runs_second(decoy: Decoy) -> None:
    """It should run the "run" and "cleanup" funcs in order."""
    run_func = decoy.mock(is_async=True)
    cleanup_func = decoy.mock(is_async=True)

    subject = TaskQueue()
    subject.set_run_func(func=run_func)
    subject.set_cleanup_func(func=cleanup_func)
    subject.start()
    await subject.join()

    decoy.verify(
        await run_func(),
        await cleanup_func(error=None),
    )


async def test_cleanup_gets_run_error(decoy: Decoy) -> None:
    """It should verify "cleanup" func gets error raised in "run" func."""
    run_func = decoy.mock(is_async=True)
    cleanup_func = decoy.mock(is_async=True)
    error = RuntimeError("Oh no!")

    decoy.when(await run_func()).then_raise(error)

    subject = TaskQueue()
    subject.set_run_func(func=run_func)
    subject.set_cleanup_func(func=cleanup_func)
    subject.start()
    await subject.join()

    decoy.verify(await cleanup_func(error=error))


async def test_cleanup_does_not_run_if_cancelled(decoy: Decoy) -> None:
    """It should not run cleanup func if task is cancelled."""
    run_func = decoy.mock(is_async=True)
    cleanup_func = decoy.mock(is_async=True)
    error = asyncio.CancelledError()

    decoy.when(await run_func()).then_raise(error)

    subject = TaskQueue()
    subject.set_run_func(func=run_func)
    subject.set_cleanup_func(func=cleanup_func)
    subject.start()

    with pytest.raises(asyncio.CancelledError):
        await subject.join()

    decoy.verify(await cleanup_func(error=error), times=0)


async def test_join_waits_for_start() -> None:
    """It should wait until the queue is started when join is called."""
    subject = TaskQueue()
    join_task = asyncio.create_task(subject.join())

    await asyncio.sleep(0)
    assert join_task.done() is False

    subject.start()
    await join_task


async def test_start_runs_stuff_once(decoy: Decoy) -> None:
    """Calling `start` should no-op if already started."""
    run_func = decoy.mock(is_async=True)
    cleanup_func = decoy.mock(is_async=True)

    subject = TaskQueue()
    subject.set_run_func(func=run_func)
    subject.set_cleanup_func(func=cleanup_func)
    subject.start()
    subject.start()
    await subject.join()

    decoy.verify(await run_func(), times=1)
    decoy.verify(await cleanup_func(error=None), times=1)


async def test_stop(decoy: Decoy) -> None:
    """Calling `stop` cancel and allow `join` to finish."""
    run_func = decoy.mock(is_async=True)
    cleanup_func = decoy.mock(is_async=True)

    subject = TaskQueue()
    subject.set_run_func(func=run_func)
    subject.set_cleanup_func(func=cleanup_func)
    subject.start()
    subject.stop()

    with pytest.raises(asyncio.CancelledError):
        await subject.join()

    decoy.verify(await run_func(), times=0)
    decoy.verify(await cleanup_func(error=None), times=0)
