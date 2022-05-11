"""Common test fixtures for runs route tests."""
import pytest
from decoy import Decoy

from robot_server.service.task_runner import TaskRunner
from robot_server.protocols import ProtocolStore
from robot_server.runs.run_store import RunStore
from robot_server.runs.engine_store import EngineStore, ProtocolEngine
from robot_server.runs.run_data_manager import RunDataManager


@pytest.fixture()
def mock_protocol_store(decoy: Decoy) -> ProtocolStore:
    """Get a mock ProtocolStore interface."""
    return decoy.mock(cls=ProtocolStore)


@pytest.fixture()
def mock_run_store(decoy: Decoy) -> RunStore:
    """Get a mock RunStore interface."""
    return decoy.mock(cls=RunStore)


@pytest.fixture()
def mock_engine_store(decoy: Decoy) -> EngineStore:
    """Get a mock EngineStore interface."""
    return decoy.mock(cls=EngineStore)


@pytest.fixture()
def mock_protocol_engine(decoy: Decoy) -> ProtocolEngine:
    """Get a mock EngineStore interface."""
    return decoy.mock(cls=EngineStore)


@pytest.fixture
def mock_run_data_manager(decoy: Decoy) -> RunDataManager:
    """Get a mock RunDataManager."""
    return decoy.mock(cls=RunDataManager)
