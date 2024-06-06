"""Module for tracking robot context and execution duration for different operations."""

import inspect
from pathlib import Path
import platform

from functools import partial, wraps
from time import perf_counter_ns
import typing

from performance_metrics.datashapes import (
    RawContextData,
)
from performance_metrics.metrics_store import MetricsStore
from opentrons_shared_data.performance.dev_types import (
    RobotContextState,
    SupportsTracking,
    MetricsMetadata,
    UnderlyingFunction,
    UnderlyingFunctionReturn,
    UnderlyingFunctionParameters,
)


def _get_timing_function() -> typing.Callable[[], int]:
    """Returns a timing function for the current platform."""
    time_function: typing.Callable[[], int]
    if platform.system() == "Linux":
        from time import clock_gettime_ns, CLOCK_REALTIME

        time_function = typing.cast(
            typing.Callable[[], int], partial(clock_gettime_ns, CLOCK_REALTIME)
        )
    else:
        from time import time_ns

        time_function = time_ns

    return time_function


timing_function = _get_timing_function()


class RobotContextTracker(SupportsTracking):
    """Tracks and stores robot context and execution duration for different operations."""

    METADATA_NAME: typing.Final[
        typing.Literal["robot_context_data"]
    ] = "robot_context_data"

    def __init__(self, storage_location: Path, should_track: bool) -> None:
        """Initializes the RobotContextTracker with an empty storage list."""
        self._store = MetricsStore[RawContextData](
            MetricsMetadata(
                name=self.METADATA_NAME,
                storage_dir=storage_location,
                headers=RawContextData.headers(),
            )
        )
        self._should_track = should_track

        if self._should_track:
            self._store.setup()

    def track(
        self,
        state: RobotContextState,
    ) -> typing.Callable[[UnderlyingFunction], UnderlyingFunction]:
        """Tracks the given function and its execution duration.

        If tracking is disabled, the function is called immediately and its result is returned.

        Args:
            func_to_track: The function to track.
            state: The state of the robot context during the function execution.
            *args: The arguments to pass to the function.
            **kwargs: The keyword arguments to pass to the function.

        Returns:
            If the function executes successfully, its return value is returned.
            If the function raises an exception, the exception the function raised is raised.
        """

        def inner_decorator(func_to_track: UnderlyingFunction) -> UnderlyingFunction:
            if not self._should_track:
                return func_to_track

            if inspect.iscoroutinefunction(func_to_track):

                @wraps(func_to_track)
                async def async_wrapper(
                    *args: UnderlyingFunctionParameters.args,
                    **kwargs: UnderlyingFunctionParameters.kwargs
                ) -> UnderlyingFunctionReturn:
                    function_start_time = timing_function()
                    duration_start_time = perf_counter_ns()

                    try:
                        result = typing.cast(
                            UnderlyingFunctionReturn,
                            await func_to_track(*args, **kwargs),
                        )
                    finally:
                        duration_end_time = perf_counter_ns()

                        self._store.add(
                            RawContextData(
                                func_start=function_start_time,
                                duration=duration_end_time - duration_start_time,
                                state=state,
                            )
                        )

                    return result

                return async_wrapper
            else:

                @wraps(func_to_track)
                def wrapper(
                    *args: UnderlyingFunctionParameters.args,
                    **kwargs: UnderlyingFunctionParameters.kwargs
                ) -> UnderlyingFunctionReturn:
                    function_start_time = timing_function()
                    duration_start_time = perf_counter_ns()

                    try:
                        result = typing.cast(
                            UnderlyingFunctionReturn, func_to_track(*args, **kwargs)
                        )
                    finally:
                        duration_end_time = perf_counter_ns()

                        self._store.add(
                            RawContextData(
                                func_start=function_start_time,
                                duration=duration_end_time - duration_start_time,
                                state=state,
                            )
                        )

                    return result

                return wrapper

        return inner_decorator

    def store(self) -> None:
        """Returns the stored context data and clears the storage list."""
        if not self._should_track:
            return
        self._store.store()
