"""ProtocolEngine shared test fixtures."""
import pytest
from datetime import datetime, timedelta
from mock import AsyncMock, MagicMock  # type: ignore[attr-defined]
from decoy import Decoy

from opentrons_shared_data.deck import load as load_deck
from opentrons_shared_data.deck.dev_types import DeckDefinitionV2
from opentrons_shared_data.labware import load_definition
from opentrons.protocols.models import LabwareDefinition
from opentrons.protocols.api_support.constants import STANDARD_DECK, SHORT_TRASH_DECK
from opentrons.util.helpers import utc_now
from opentrons.hardware_control.api import API as HardwareController

from opentrons.protocol_engine import (
    ProtocolEngine,
    StateStore,
    StateView,
    CommandHandlers,
    ResourceProviders,
)

from opentrons.protocol_engine.execution import (
    EquipmentHandler,
    MovementHandler,
    PipettingHandler,
)

from opentrons.protocol_engine.resources import (
    IdGenerator,
    LabwareDataProvider,
    DeckDataProvider,
)


@pytest.fixture
def decoy() -> Decoy:
    """Get a fresh Decoy state container."""
    return Decoy()


@pytest.fixture
def now() -> datetime:
    """Get the current UTC time."""
    return utc_now()


@pytest.fixture
def later(now: datetime) -> datetime:
    """Get a future time."""
    return utc_now() + timedelta(seconds=42)


@pytest.fixture
def even_later(later: datetime) -> datetime:
    """Get a future time."""
    return later + timedelta(minutes=42)


@pytest.fixture
def mock_state_store() -> MagicMock:
    """Get a mock in the shape of a StateStore."""
    return MagicMock(spec=StateStore)


@pytest.fixture
def mock_state_view() -> MagicMock:
    """Get a mock in the shape of a StateView."""
    # TODO(mc, 2021-01-04): Replace with mock_state_view in execution/conftest.py
    return MagicMock(spec=StateView)


@pytest.fixture
def mock_hardware() -> AsyncMock:
    """Get an asynchronous mock in the shape of a HardwareController."""
    # TODO(mc, 2021-01-04): Replace with mock_hw_controller
    return AsyncMock(spec=HardwareController)


@pytest.fixture
def mock_handlers() -> AsyncMock:
    """Get an asynchronous mock in the shape of CommandHandlers."""
    # TODO(mc, 2021-01-04): Replace with mock_cmd_handlers
    return CommandHandlers(
        equipment=AsyncMock(spec=EquipmentHandler),
        movement=AsyncMock(spec=MovementHandler),
        pipetting=AsyncMock(spec=PipettingHandler),
    )


@pytest.fixture
def mock_cmd_handlers(decoy: Decoy) -> CommandHandlers:
    """Get a mock in the shape of a CommandHandlers container."""
    return decoy.create_decoy(spec=CommandHandlers)


@pytest.fixture
def mock_hw_controller(decoy: Decoy) -> HardwareController:
    """Get a mock in the shape of a HardwareController."""
    return decoy.create_decoy(spec=HardwareController)


@pytest.fixture
def mock_resources() -> AsyncMock:
    """Get an asynchronous mock in the shape of ResourceProviders."""
    # TODO(mc, 2020-11-18): AsyncMock around ResourceProviders doesn't propagate
    # async. mock downwards into children properly, so this has to be manually
    # set up this way for now
    return ResourceProviders(
        id_generator=MagicMock(spec=IdGenerator),
        labware_data=AsyncMock(spec=LabwareDataProvider),
        deck_data=AsyncMock(spec=DeckDataProvider),
    )


@pytest.fixture(scope="session")
def standard_deck_def() -> DeckDefinitionV2:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_DECK, 2)


@pytest.fixture(scope="session")
def short_trash_deck_def() -> DeckDefinitionV2:
    """Get the OT-2 short-trash deck definition."""
    return load_deck(SHORT_TRASH_DECK, 2)


@pytest.fixture(scope="session")
def fixed_trash_def() -> LabwareDefinition:
    """Get the definition of the OT-2 standard fixed trash."""
    return LabwareDefinition.parse_obj(
        load_definition("opentrons_1_trash_1100ml_fixed", 1)
    )


@pytest.fixture(scope="session")
def short_fixed_trash_def() -> LabwareDefinition:
    """Get the definition of the OT-2 short fixed trash."""
    return LabwareDefinition.parse_obj(
        load_definition("opentrons_1_trash_850ml_fixed", 1)
    )


@pytest.fixture(scope="session")
def well_plate_def() -> LabwareDefinition:
    """Get the definition of a 96 well plate."""
    return LabwareDefinition.parse_obj(
        load_definition("corning_96_wellplate_360ul_flat", 1)
    )


@pytest.fixture(scope="session")
def reservoir_def() -> LabwareDefinition:
    """Get the definition of single-row reservoir."""
    return LabwareDefinition.parse_obj(
        load_definition("nest_12_reservoir_15ml", 1)
    )


@pytest.fixture(scope="session")
def tip_rack_def() -> LabwareDefinition:
    """Get the definition of Opentrons 300 uL tip rack."""
    return LabwareDefinition.parse_obj(
        load_definition("opentrons_96_tiprack_300ul", 1)
    )


@pytest.fixture
def store(standard_deck_def: DeckDefinitionV2) -> StateStore:
    """Get an actual StateStore."""
    return StateStore(
        deck_definition=standard_deck_def,
        deck_fixed_labware=[],
    )


@pytest.fixture
def engine(
    mock_state_store: MagicMock,
    mock_handlers: AsyncMock
) -> ProtocolEngine:
    """Get a ProtocolEngine with its dependencies mocked out."""
    return ProtocolEngine(
        state_store=mock_state_store,
        handlers=mock_handlers,
    )
