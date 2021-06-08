"""Base transport interfaces for communicating with a Protocol Engine."""
from abc import ABC, abstractmethod
from asyncio import AbstractEventLoop, run_coroutine_threadsafe

from ..protocol_engine import ProtocolEngine
from ..state import StateView
from ..commands import CommandRequest, CommandResult


class AbstractSyncTransport(ABC):
    """Interface describing a sync. ProtocolEngine state/command transport."""

    @property
    @abstractmethod
    def state(self) -> StateView:
        """Get a view of the ProtocolEngine's state."""
        ...

    @abstractmethod
    def execute_command(
        self,
        request: CommandRequest,
        command_id: str,
    ) -> CommandResult:
        """Execute a ProtocolEngine command, blocking until the command completes.

        Args:
            request: The ProtocolEngine command request

        Returns:
            The command's result data.

        Raises:
            ProtocolEngineError: if the command execution is not successful,
                the specific error that cause the command to fail is raised.
        """
        ...


class ChildThreadTransport(AbstractSyncTransport):
    """Concrete transport implementation using asyncio.run_coroutine_threadsafe."""

    def __init__(self, engine: ProtocolEngine, loop: AbstractEventLoop) -> None:
        """Initialize a ProtocolEngine transport for use in a child thread.

        This adapter allows a client to make blocking command calls on its
        thread to the asynchronous ProtocolEngine running with an event loop
        in a different thread.

        Args:
            engine: An instance of a ProtocolEngine to interact with hardware
                and other run procedures.
            loop: An event loop running in the thread where the hardware
                interaction should occur. The thread this loop is running
                in should be different than the thread in which the Python
                protocol is running.
        """
        self._engine = engine
        self._loop = loop

    @property
    def state(self) -> StateView:
        """Get a view of the Protocol Engine's state."""
        return self._engine.state_view

    def execute_command(
        self,
        request: CommandRequest,
        command_id: str,
    ) -> CommandResult:
        """Execute a command synchronously on the main thread."""
        command = run_coroutine_threadsafe(
            self._engine.execute_command(request=request, command_id=command_id),
            loop=self._loop,
        ).result()

        if command.error is not None:
            raise command.error

        if command.result is None:
            raise ValueError(f"Missing result in {command}; this is a bug")

        return command.result
