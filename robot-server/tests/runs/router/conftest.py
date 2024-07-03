"""Common test fixtures for runs route tests."""
import pytest
from decoy import Decoy

from robot_server.protocols.protocol_store import ProtocolStore
from robot_server.runs.run_auto_deleter import RunAutoDeleter
from robot_server.runs.run_store import RunStore
from robot_server.runs.run_orchestrator_store import RunOrchestratorStore
from robot_server.runs.run_data_manager import RunDataManager
from robot_server.maintenance_runs.maintenance_run_orchestrator_store import (
    MaintenanceRunOrchestratorStore,
)
from robot_server.deck_configuration.store import DeckConfigurationStore

from opentrons.protocol_engine import ProtocolEngine


@pytest.fixture()
def mock_protocol_store(decoy: Decoy) -> ProtocolStore:
    """Get a mock ProtocolStore interface."""
    return decoy.mock(cls=ProtocolStore)


@pytest.fixture()
def mock_run_store(decoy: Decoy) -> RunStore:
    """Get a mock RunStore interface."""
    return decoy.mock(cls=RunStore)


@pytest.fixture()
def mock_run_orchestrator_store(decoy: Decoy) -> RunOrchestratorStore:
    """Get a mock EngineStore interface."""
    return decoy.mock(cls=RunOrchestratorStore)


@pytest.fixture()
def mock_protocol_engine(decoy: Decoy) -> ProtocolEngine:
    """Get a mock EngineStore interface."""
    return decoy.mock(cls=ProtocolEngine)


@pytest.fixture
def mock_run_data_manager(decoy: Decoy) -> RunDataManager:
    """Get a mock RunDataManager."""
    return decoy.mock(cls=RunDataManager)


@pytest.fixture()
def mock_run_auto_deleter(decoy: Decoy) -> RunAutoDeleter:
    """Get a mock RunAutoDeleter interface."""
    return decoy.mock(cls=RunAutoDeleter)


@pytest.fixture()
def mock_maintenance_run_orchestrator_store(
    decoy: Decoy,
) -> MaintenanceRunOrchestratorStore:
    """Get a mock MaintenanceRunOrchestratorStore interface."""
    return decoy.mock(cls=MaintenanceRunOrchestratorStore)


@pytest.fixture
def mock_deck_configuration_store(decoy: Decoy) -> DeckConfigurationStore:
    """Get a mock DeckConfigurationStore."""
    return decoy.mock(cls=DeckConfigurationStore)
