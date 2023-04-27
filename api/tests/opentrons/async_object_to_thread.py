from __future__ import annotations

import asyncio
import contextlib
import queue
import threading
import typing

from concurrent.futures import ThreadPoolExecutor


_T = typing.TypeVar("_T")


@contextlib.contextmanager
def async_object_to_thread(
    async_object_context_manager: typing.AsyncContextManager[_T],
) -> typing.Generator[typing.Tuple[_T, asyncio.AbstractEventLoop], None, None]:
    """Enter an async context manager in a worker thread.

    Returns the object that `async_object_context_manager` returned,
    and the event loop that it's running in.
    """
    with _run_loop_in_thread() as loop_in_thread:
        async_object = asyncio.run_coroutine_threadsafe(
            async_object_context_manager.__aenter__(),
            loop=loop_in_thread,
        ).result()

        try:
            yield async_object, loop_in_thread

        finally:
            exit = asyncio.run_coroutine_threadsafe(
                async_object_context_manager.__aexit__(None, None, None),
                loop=loop_in_thread,
            )
            exit.result()


@contextlib.contextmanager
def _run_loop_in_thread() -> typing.Generator[asyncio.AbstractEventLoop, None, None]:
    """Run an event loop in a worker thread.

    Entering this context manager spawns a thread, starts an asyncio event loop in it,
    and returns that loop.

    Exiting this context manager stops and cleans up the event loop, and then joins the thread.
    """
    loop_queue: "queue.SimpleQueue[asyncio.AbstractEventLoop]" = queue.SimpleQueue()

    def _in_thread() -> None:
        loop = asyncio.new_event_loop()

        # We assume that the lines above this will never fail,
        # so we will always reach this point to unblock the parent thread.
        loop_queue.put(loop)

        asyncio.set_event_loop(loop)
        loop.run_forever()

        # If we've reached here, the loop has been stopped from outside this thread. Clean it up.
        #
        # This cleanup is naive because asyncio makes it difficult and confusing to get it right.
        # Compare this with asyncio.run()'s cleanup, which:
        #
        # * Cancels and awaits any remaining tasks
        #   (according to the source code--this seems undocumented)
        # * Shuts down asynchronous generators
        #   (see asyncio.shutdown_asyncgens())
        # * Shuts down the default thread pool executor
        #   (see https://bugs.python.org/issue34037 and asyncio.shutdown_default_executor())
        #
        # In Python >=3.11, we should rewrite this to use asyncio.Runner,
        # which can take care of these nuances for us.
        loop.close()

    with ThreadPoolExecutor(max_workers=1) as executor:
        executor.submit(_in_thread)

        loop_in_thread = loop_queue.get()

        try:
            yield loop_in_thread
        finally:
            loop_in_thread.call_soon_threadsafe(loop_in_thread.stop)
