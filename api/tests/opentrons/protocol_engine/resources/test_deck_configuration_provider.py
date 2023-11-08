"""Test deck configuration provider."""
from typing import Set

import pytest
from pytest_lazyfixture import lazy_fixture  # type: ignore[import]

from opentrons_shared_data.deck import load as load_deck
from opentrons_shared_data.deck.dev_types import DeckDefinitionV4

from opentrons.protocol_engine.errors import (
    FixtureDoesNotExistError,
    CutoutDoesNotExistError,
    AddressableAreaDoesNotExistError,
)
from opentrons.protocol_engine.types import (
    AddressableArea,
    PotentialCutoutFixture,
    DeckPoint,
    Dimensions,
    AddressableOffsetVector,
    LabwareOffsetVector,
)
from opentrons.protocols.api_support.deck_type import (
    SHORT_TRASH_DECK,
    STANDARD_OT2_DECK,
    STANDARD_OT3_DECK,
)

from opentrons.protocol_engine.resources import deck_configuration_provider as subject


@pytest.fixture(scope="session")
def ot2_standard_deck_def() -> DeckDefinitionV4:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT2_DECK, 4)


@pytest.fixture(scope="session")
def ot2_short_trash_deck_def() -> DeckDefinitionV4:
    """Get the OT-2 standard deck definition."""
    return load_deck(SHORT_TRASH_DECK, 4)


@pytest.fixture(scope="session")
def ot3_standard_deck_def() -> DeckDefinitionV4:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT3_DECK, 4)


@pytest.mark.parametrize(
    ("cutout_fixture_id", "expected_display_name", "deck_def"),
    [
        ("singleStandardSlot", "Standard Slot", lazy_fixture("ot2_standard_deck_def")),
        (
            "singleStandardSlot",
            "Standard Slot",
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "singleRightSlot",
            "Standard Slot Right",
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_cutout_fixture_by_id(
    cutout_fixture_id: str,
    expected_display_name: str,
    deck_def: DeckDefinitionV4,
) -> None:
    """It should get the cutout fixture given the cutout fixture id."""
    cutout_fixture = subject.get_cutout_fixture_by_id(cutout_fixture_id, deck_def)
    assert cutout_fixture["displayName"] == expected_display_name


def test_get_cutout_fixture_by_id_raises(
    ot3_standard_deck_def: DeckDefinitionV4,
) -> None:
    """It should raise if the given cutout fixture id does not exist."""
    with pytest.raises(FixtureDoesNotExistError):
        subject.get_cutout_fixture_by_id("the_fun_fixture", ot3_standard_deck_def)


@pytest.mark.parametrize(
    (
        "addressable_area_name",
        "expected_cutout_id",
        "expected_potential_fixtures",
        "deck_def",
    ),
    [
        (
            "3",
            "cutout3",
            {
                PotentialCutoutFixture(
                    cutout_id="cutout3",
                    cutout_fixture_id="singleStandardSlot",
                )
            },
            lazy_fixture("ot2_standard_deck_def"),
        ),
        (
            "3",
            "cutout3",
            {
                PotentialCutoutFixture(
                    cutout_id="cutout3",
                    cutout_fixture_id="singleStandardSlot",
                )
            },
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "D3",
            "cutoutD3",
            {
                PotentialCutoutFixture(
                    cutout_id="cutoutD3", cutout_fixture_id="singleRightSlot"
                ),
                PotentialCutoutFixture(
                    cutout_id="cutoutD3", cutout_fixture_id="stagingAreaRightSlot"
                ),
            },
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_potential_cutout_fixtures(
    addressable_area_name: str,
    expected_cutout_id: str,
    expected_potential_fixtures: Set[PotentialCutoutFixture],
    deck_def: DeckDefinitionV4,
) -> None:
    """It should get a cutout id and a set of potential cutout fixtures for an addressable area name."""
    cutout_id, potential_fixtures = subject.get_potential_cutout_fixtures(
        addressable_area_name, deck_def
    )
    assert cutout_id == expected_cutout_id
    assert potential_fixtures == expected_potential_fixtures


def test_get_potential_cutout_fixtures_raises(
    ot3_standard_deck_def: DeckDefinitionV4,
) -> None:
    """It should raise if there is no fixtures that provide the requested area."""
    with pytest.raises(AssertionError):
        subject.get_potential_cutout_fixtures("the_fun_area", ot3_standard_deck_def)


@pytest.mark.parametrize(
    ("cutout_id", "expected_deck_point", "deck_def"),
    [
        (
            "cutout5",
            DeckPoint(x=132.5, y=90.5, z=0.0),
            lazy_fixture("ot2_standard_deck_def"),
        ),
        (
            "cutout5",
            DeckPoint(x=132.5, y=90.5, z=0.0),
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "cutoutC2",
            DeckPoint(x=164.0, y=107, z=0.0),
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_cutout_position(
    cutout_id: str,
    expected_deck_point: DeckPoint,
    deck_def: DeckDefinitionV4,
) -> None:
    """It should get the deck position for the requested cutout id."""
    cutout_position = subject.get_cutout_position(cutout_id, deck_def)
    assert cutout_position == expected_deck_point


def test_get_cutout_position_raises(
    ot3_standard_deck_def: DeckDefinitionV4,
) -> None:
    """It should raise if there is no cutout with that ID in the deck definition."""
    with pytest.raises(CutoutDoesNotExistError):
        subject.get_cutout_position("the_fun_cutout", ot3_standard_deck_def)


# TODO put in fixed trash for OT2 decks
@pytest.mark.parametrize(
    ("addressable_area_name", "expected_addressable_area", "deck_def"),
    [
        (
            "1",
            AddressableArea(
                area_name="1",
                display_name="Slot 1",
                bounding_box=Dimensions(x=128.0, y=86.0, z=0),
                position=AddressableOffsetVector(x=1, y=2, z=3),
                compatible_module_types=[],
                drop_tip_offset=None,
                drop_labware_offset=None,
            ),
            lazy_fixture("ot2_standard_deck_def"),
        ),
        (
            "1",
            AddressableArea(
                area_name="1",
                display_name="Slot 1",
                bounding_box=Dimensions(x=128.0, y=86.0, z=0),
                position=AddressableOffsetVector(x=1, y=2, z=3),
                compatible_module_types=[],
                drop_tip_offset=None,
                drop_labware_offset=None,
            ),
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "D1",
            AddressableArea(
                area_name="D1",
                display_name="Slot D1",
                bounding_box=Dimensions(x=128.0, y=86.0, z=0),
                position=AddressableOffsetVector(x=1, y=2, z=3),
                compatible_module_types=[],
                drop_tip_offset=None,
                drop_labware_offset=None,
            ),
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            "movableTrash",
            AddressableArea(
                area_name="movableTrash",
                display_name="Trash Bin",
                bounding_box=Dimensions(x=246.5, y=91.5, z=40),
                position=AddressableOffsetVector(x=-16, y=-0.75, z=3),
                compatible_module_types=[],
                drop_tip_offset=LabwareOffsetVector(x=123.25, y=45.75, z=40.0),
                drop_labware_offset=None,
            ),
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            "gripperWasteChute",
            AddressableArea(
                area_name="gripperWasteChute",
                display_name="Gripper Waste Chute",
                bounding_box=Dimensions(x=155.0, y=86.0, z=154.0),
                position=AddressableOffsetVector(x=-12.5, y=2, z=3),
                compatible_module_types=[],
                drop_tip_offset=None,
                drop_labware_offset=LabwareOffsetVector(x=64, y=29, z=136.5),
            ),
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_addressable_area_from_name(
    addressable_area_name: str,
    expected_addressable_area: AddressableArea,
    deck_def: DeckDefinitionV4,
) -> None:
    """It should get the deck position for the requested cutout id."""
    addressable_area = subject.get_addressable_area_from_name(
        addressable_area_name, DeckPoint(x=1, y=2, z=3), deck_def
    )
    assert addressable_area == expected_addressable_area


def test_get_addressable_area_from_name_raises(
    ot3_standard_deck_def: DeckDefinitionV4,
) -> None:
    """It should raise if there is no addressable area by that name in the deck."""
    with pytest.raises(AddressableAreaDoesNotExistError):
        subject.get_addressable_area_from_name(
            "the_fun_area", DeckPoint(x=1, y=2, z=3), ot3_standard_deck_def
        )
