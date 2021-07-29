"""File runner interfaces for Python protocols."""
from opentrons.protocol_engine import ProtocolEngine

from .abstract_file_runner import AbstractFileRunner
from .protocol_file import ProtocolFile
from .python_reader import PythonFileReader
from .python_executor import PythonExecutor
from .context_creator import ContextCreator


class PythonFileRunner(AbstractFileRunner):
    """Python protocol file runner."""

    def __init__(
        self,
        file: ProtocolFile,
        file_reader: PythonFileReader,
        protocol_engine: ProtocolEngine,
        context_creator: ContextCreator,
        executor: PythonExecutor,
    ) -> None:
        """Initialize the runner with its protocol file and dependencies."""
        self._file = file
        self._file_reader = file_reader
        self._protocol_engine = protocol_engine
        self._context_creator = context_creator
        self._executor = executor

    def load(self) -> None:
        """Prepare to run the Python protocol file."""
        protocol = self._file_reader.read(protocol_file=self._file)
        context = self._context_creator.create()
        self._executor.load(protocol=protocol, context=context)

    async def run(self) -> None:
        """Run the protocol to completion."""
        self._protocol_engine.play()

        try:
            await self._executor.execute()
        finally:
            await self._protocol_engine.stop()
