"""Asynchronous task queue to accomplish a protocol run."""
import asyncio
import logging
from functools import partial
from typing import Any, Awaitable, Callable, Optional
from typing_extensions import Protocol as Callback


log = logging.getLogger(__name__)


class CleanupFunc(Callback):
    """Expected cleanup function signature."""

    def __call__(self, error: Optional[Exception]) -> Any:
        """Cleanup, optionally taking an error thrown.

        Return value will not be used.
        """
        ...


class TaskQueue:
    """A queue of async tasks to run.

    Once started, a TaskQueue may not be re-used.
    """

    def __init__(self) -> None:
        """Initialize the TaskQueue."""
        self._run_func: Optional[Callable[[], Any]] = None
        self._cleanup_func: Optional[CleanupFunc] = None
        self._run_task: Optional["asyncio.Task[None]"] = None
        self._run_started_event: asyncio.Event = asyncio.Event()

    def add_run_func(
        self,
        func: Callable[..., Awaitable[Any]],
        **kwargs: Any,
    ) -> None:
        """Add the protocol run task to the queue.

        The "run" task will be run first, before the "cleanup" task.
        """
        self._run_func = partial(func, **kwargs)

    def add_cleanup_func(self, func: CleanupFunc) -> None:
        """Add the run cleanup task to the queue.

        The "cleanup" task will run after the "run" task, and will be passed
        any exceptions raised by the "run" task.
        """
        self._cleanup_func = func

    def start(self) -> None:
        """Start running tasks in the queue."""
        if self._run_task is None:
            self._run_task = asyncio.create_task(self._run())
            self._run_started_event.set()

    async def join(self) -> None:
        """Wait for the background run task to complete, propagating errors."""
        await self._run_started_event.wait()

        if self._run_task:
            await self._run_task

    async def _run(self) -> None:
        error = None

        try:
            if self._run_func is not None:
                await self._run_func()
        except Exception as e:
            error = e
        finally:
            if self._cleanup_func is not None:
                await self._cleanup_func(error=error)
            elif error:
                log.warning(
                    "Exception raised during protocol run was not handled",
                    exc_info=error,
                )
                raise error
