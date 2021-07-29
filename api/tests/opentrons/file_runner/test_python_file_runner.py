"""Tests for a PythonFileRunner interface."""
import pytest
from pathlib import Path
from decoy import Decoy

from opentrons.protocol_engine import ProtocolEngine
from opentrons.protocol_api_experimental import ProtocolContext
from opentrons.file_runner import PythonFileRunner, ProtocolFile, ProtocolFileType
from opentrons.file_runner.python_reader import PythonFileReader, PythonProtocol
from opentrons.file_runner.python_executor import PythonExecutor
from opentrons.file_runner.context_creator import ContextCreator


@pytest.fixture
def protocol_engine(decoy: Decoy) -> ProtocolEngine:
    """Get a mock ProtocolEngine."""
    return decoy.mock(cls=ProtocolEngine)


@pytest.fixture
def protocol_file(decoy: Decoy) -> ProtocolFile:
    """Get a PythonProtocolFile value fixture."""
    return ProtocolFile(file_type=ProtocolFileType.PYTHON, file_path=Path("/dev/null"))


@pytest.fixture
def python_protocol(decoy: Decoy) -> PythonProtocol:
    """Get a mock PythonProtocol object."""
    return decoy.mock(cls=PythonProtocol)


@pytest.fixture
def protocol_context(decoy: Decoy) -> ProtocolContext:
    """Get a mock ProtocolContext API interface."""
    return decoy.mock(cls=ProtocolContext)


@pytest.fixture
def file_reader(decoy: Decoy) -> PythonFileReader:
    """Get a mock FileReader."""
    return decoy.mock(cls=PythonFileReader)


@pytest.fixture
def context_creator(decoy: Decoy) -> ContextCreator:
    """Get a mock ContextCreator."""
    return decoy.mock(cls=ContextCreator)


@pytest.fixture
def executor(decoy: Decoy) -> PythonExecutor:
    """Get a mock PythonExecutor."""
    return decoy.mock(cls=PythonExecutor)


@pytest.fixture
def subject(
    protocol_engine: ProtocolEngine,
    protocol_file: ProtocolFile,
    file_reader: PythonFileReader,
    context_creator: ContextCreator,
    executor: PythonExecutor,
) -> PythonFileRunner:
    """Get a PythonFileRunner test subject with its dependencies mocked out."""
    return PythonFileRunner(
        file=protocol_file,
        file_reader=file_reader,
        protocol_engine=protocol_engine,
        context_creator=context_creator,
        executor=executor,
    )


def test_python_runner_load(
    decoy: Decoy,
    protocol_file: ProtocolFile,
    file_reader: PythonFileReader,
    python_protocol: PythonProtocol,
    context_creator: ContextCreator,
    protocol_context: ProtocolContext,
    executor: PythonExecutor,
    subject: PythonFileRunner,
) -> None:
    """It should be able to load the module and prepare a ProtocolContext."""
    decoy.when(file_reader.read(protocol_file=protocol_file)).then_return(
        python_protocol
    )
    decoy.when(context_creator.create()).then_return(protocol_context)

    subject.load()

    decoy.verify(executor.load(protocol=python_protocol, context=protocol_context))


async def test_python_runner_run(
    decoy: Decoy,
    protocol_engine: ProtocolEngine,
    executor: PythonExecutor,
    subject: PythonFileRunner,
) -> None:
    """It should be able to run the protocol to completion."""
    await subject.run()
    decoy.verify(
        protocol_engine.play(),
        await executor.execute(),
        await protocol_engine.stop(),
    )


async def test_python_runner_run_always_stops(
    decoy: Decoy,
    protocol_engine: ProtocolEngine,
    executor: PythonExecutor,
    subject: PythonFileRunner,
) -> None:
    """It should stop the engine even if Python execution fails."""
    decoy.when(await executor.execute()).then_raise(RuntimeError("oh no"))

    with pytest.raises(RuntimeError, match="oh no"):
        await subject.run()

    decoy.verify(
        await protocol_engine.stop(),
        times=1,
    )
