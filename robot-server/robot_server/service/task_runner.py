"""Background task runner.

This module is mostly a thin wrapper around fastapi.BackgroundTasks
that adds logging. It should be tested primarily through integration
and end-to-end tests.
"""
from fastapi import BackgroundTasks
from logging import getLogger
from typing import Awaitable, Callable

log = getLogger(__name__)


TaskFunc = Callable[[], Awaitable[None]]


class TaskRunner:
    def __init__(self, background_tasks: BackgroundTasks) -> None:
        """Initialize the TaskRunner.

        Add to any route handler with `FastAPI.Depends`.

        Arguments:
            background_tasks: FastAPI's background task system, fed in
                automatically by FastAPI's dependency injection system.
        """
        self._background_tasks = background_tasks

    def run(self, func: TaskFunc) -> None:
        """Run an async function in the background.

        Will log when the function completes, including any error
        that may occur.

        Arguments:
            func: An async, argumentless, None-returning function to run
                in the background. Use functools.partial to add arguments,
                if required.
        """
        func_name = func.__qualname__

        async def _run_async_task() -> None:
            try:
                await func()
                log.debug(f"Background task {func_name} succeeded")
            except Exception as e:
                log.warning(f"Background task {func_name} failed", exc_info=e)

        self._background_tasks.add_task(_run_async_task)
