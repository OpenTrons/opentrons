"""Common test fixtures for runs route tests."""
import pytest
from decoy import Decoy

from robot_server.maintenance_runs.maintenance_run_orchestrator_store import (
    MaintenanceRunOrchestratorStore,
)
from robot_server.maintenance_runs.maintenance_run_data_manager import (
    MaintenanceRunDataManager,
)
from opentrons.protocol_engine import ProtocolEngine
from robot_server.deck_configuration.store import DeckConfigurationStore


@pytest.fixture()
def mock_maintenance_run_orchestrator_store(
    decoy: Decoy,
) -> MaintenanceRunOrchestratorStore:
    """Get a mock MaintenanceRunOrchestratorStore interface."""
    return decoy.mock(cls=MaintenanceRunOrchestratorStore)


@pytest.fixture()
def mock_protocol_engine(decoy: Decoy) -> ProtocolEngine:
    """Get a mock MaintenanceRunOrchestratorStore interface."""
    return decoy.mock(cls=ProtocolEngine)


@pytest.fixture
def mock_maintenance_run_data_manager(decoy: Decoy) -> MaintenanceRunDataManager:
    """Get a mock RunDataManager."""
    return decoy.mock(cls=MaintenanceRunDataManager)


@pytest.fixture
def mock_deck_configuration_store(decoy: Decoy) -> DeckConfigurationStore:
    """Get a mock DeckConfigurationStore."""
    return decoy.mock(cls=DeckConfigurationStore)
