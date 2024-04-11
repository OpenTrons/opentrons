"""Module for measuring and storing execution durations of functions.

Provides a `FunctionTimer` class that can be used as a decorator to measure
the execution time of both synchronous and asynchronous functions, utilizing high-resolution
performance counters for accuracy.
"""

from time import perf_counter_ns, clock_gettime_ns, CLOCK_REALTIME
from types import TracebackType
from typing import (
    Type,
    Tuple,
)
from performance_metrics.datashapes import RawDurationData
from contextlib import AbstractAsyncContextManager, AbstractContextManager


class FunctionTimer(AbstractAsyncContextManager, AbstractContextManager):  # type: ignore
    """A decorator class for measuring and storing the execution duration of functions.

    It supports both synchronous and asynchronous functions.
    """

    def __init__(self) -> None:
        self._func_start_time: int | None = None
        self._duration_start_time: int | None = None
        self._duration_end_time: int | None = None

    def _begin_timing(self) -> Tuple[int, int]:
        """Starts the timing process, capturing both the current real-time and a high-resolution performance counter.

        Returns:
            A tuple containing the current real-time (`clock_gettime_ns(CLOCK_REALTIME)`) and an initial performance counter (`perf_counter_ns()`). Both values are measured in nanoseconds.
        """
        return clock_gettime_ns(CLOCK_REALTIME), perf_counter_ns()

    def _end_timing(self) -> int:
        """Ends the timing process, capturing the final high-resolution performance counter.

        Returns:
            The final performance counter, measured in nanoseconds.
        """
        return perf_counter_ns()

    def __enter__(self) -> "FunctionTimer":
        """Set the start time of the function."""
        self._func_start_time, self._duration_start_time = self._begin_timing()
        return self

    def __exit__(
        self,
        exc_type: Type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        """Set the end time of the function."""
        self._duration_end_time = self._end_timing()

    async def __aenter__(self) -> "FunctionTimer":
        """Set the start time of the function."""
        self._func_start_time, self._duration_start_time = self._begin_timing()
        return self

    async def __aexit__(
        self,
        exc_type: Type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        """Set the end time of the function."""
        self._duration_end_time = self._end_timing()

    def get_data(self) -> RawDurationData:
        """Returns the duration data for the function.

        Returns:
            RawDurationData: The duration data for the function.
        """
        assert self._func_start_time is not None
        assert self._duration_start_time is not None
        assert self._duration_end_time is not None

        return RawDurationData(
            func_start=self._func_start_time,
            duration_start=self._duration_start_time,
            duration_end=self._duration_end_time,
        )
