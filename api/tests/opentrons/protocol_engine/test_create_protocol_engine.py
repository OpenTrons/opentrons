"""Smoke tests for the ProtocolEngine creation factory."""
import pytest
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]

from opentrons_shared_data.deck import load as load_deck
from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.robot.types import RobotType

from opentrons.calibration_storage.helpers import uri_from_details
from opentrons.hardware_control import API as HardwareAPI
from opentrons.hardware_control.types import DoorState
from opentrons.protocol_engine import (
    ProtocolEngine,
    Config as EngineConfig,
    DeckType,
    error_recovery_policy,
)
from opentrons.protocol_engine.create_protocol_engine import create_protocol_engine

from opentrons.protocol_engine.types import DeckSlotLocation, LoadedLabware
from opentrons.types import DeckSlotName

from opentrons.protocols.api_support.deck_type import (
    STANDARD_OT2_DECK,
    SHORT_TRASH_DECK,
    STANDARD_OT3_DECK,
)


@pytest.fixture(scope="session")
def ot2_standard_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT2_DECK, 5)


@pytest.fixture(scope="session")
def ot2_short_trash_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 with short trash standard deck definition."""
    return load_deck(SHORT_TRASH_DECK, 5)


@pytest.fixture(scope="session")
def ot3_standard_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT3_DECK, 5)


@pytest.mark.parametrize(
    (
        "robot_type",
        "deck_type",
        "expected_deck_def",
    ),
    [
        (
            "OT-2 Standard",
            DeckType.OT2_STANDARD,
            lazy_fixture("ot2_standard_deck_def"),
        ),
        (
            "OT-2 Standard",
            DeckType.OT2_SHORT_TRASH,
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "OT-3 Standard",
            DeckType.OT3_STANDARD,
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
async def test_create_engine_initializes_state_with_no_fixed_trash(
    hardware_api: HardwareAPI,
    robot_type: RobotType,
    deck_type: DeckType,
    expected_deck_def: DeckDefinitionV5,
) -> None:
    """It should load deck geometry data into the store on create."""
    engine = await create_protocol_engine(
        hardware_api=hardware_api,
        config=EngineConfig(
            # robot_type chosen to match hardware_api.
            robot_type=robot_type,
            deck_type=deck_type,
        ),
        error_recovery_policy=error_recovery_policy.never_recover,
        load_fixed_trash=False,
    )
    state = engine.state_view

    assert isinstance(engine, ProtocolEngine)
    assert state.labware.get_deck_definition() == expected_deck_def
    assert state.labware.get_all() == []


@pytest.mark.parametrize(
    (
        "robot_type",
        "deck_type",
        "expected_deck_def",
        "expected_fixed_trash_def",
        "expected_fixed_trash_slot",
    ),
    [
        (
            "OT-2 Standard",
            DeckType.OT2_STANDARD,
            lazy_fixture("ot2_standard_deck_def"),
            lazy_fixture("ot2_fixed_trash_def"),
            DeckSlotName.FIXED_TRASH,
        ),
        (
            "OT-2 Standard",
            DeckType.OT2_SHORT_TRASH,
            lazy_fixture("ot2_short_trash_deck_def"),
            lazy_fixture("ot2_short_fixed_trash_def"),
            DeckSlotName.FIXED_TRASH,
        ),
        (
            "OT-3 Standard",
            DeckType.OT3_STANDARD,
            lazy_fixture("ot3_standard_deck_def"),
            lazy_fixture("ot3_fixed_trash_def"),
            DeckSlotName.SLOT_A3,
        ),
    ],
)
async def test_create_engine_initializes_state_with_fixed_trash(
    hardware_api: HardwareAPI,
    robot_type: RobotType,
    deck_type: DeckType,
    expected_deck_def: DeckDefinitionV5,
    expected_fixed_trash_def: LabwareDefinition,
    expected_fixed_trash_slot: DeckSlotName,
) -> None:
    """It should load deck geometry data into the store on create."""
    engine = await create_protocol_engine(
        hardware_api=hardware_api,
        config=EngineConfig(
            # robot_type chosen to match hardware_api.
            robot_type=robot_type,
            deck_type=deck_type,
        ),
        error_recovery_policy=error_recovery_policy.never_recover,
        load_fixed_trash=True,
    )
    state = engine.state_view

    assert isinstance(engine, ProtocolEngine)
    assert state.labware.get_deck_definition() == expected_deck_def
    assert state.labware.get_all() == [
        LoadedLabware(
            id="fixedTrash",
            loadName=expected_fixed_trash_def.parameters.loadName,
            definitionUri=uri_from_details(
                load_name=expected_fixed_trash_def.parameters.loadName,
                namespace=expected_fixed_trash_def.namespace,
                version=expected_fixed_trash_def.version,
            ),
            location=DeckSlotLocation(slotName=expected_fixed_trash_slot),
            offsetId=None,
        )
    ]


async def test_create_engine_initializes_state_with_door_state(
    hardware_api: HardwareAPI,
) -> None:
    """It should load current door status into the store on create."""
    hardware_api.door_state = DoorState.OPEN
    engine = await create_protocol_engine(
        hardware_api=hardware_api,
        config=EngineConfig(
            block_on_door_open=True,
            # Choice of robot and deck type are arbitrary.
            robot_type="OT-2 Standard",
            deck_type=DeckType.OT2_SHORT_TRASH,
        ),
        error_recovery_policy=error_recovery_policy.never_recover,
    )
    state = engine.state_view
    assert state.commands.get_is_door_blocking() is True
