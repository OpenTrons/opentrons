"""Labware state store tests."""
import pytest
from typing import Dict, Optional, cast

from opentrons_shared_data.deck.dev_types import DeckDefinitionV2
from opentrons_shared_data.pipette.dev_types import LabwareUri
from opentrons.protocols.models import LabwareDefinition
from opentrons.types import DeckSlotName, Point

from opentrons.protocol_engine import errors
from opentrons.protocol_engine.types import DeckSlotLocation, Dimensions
from opentrons.protocol_engine.state.labware import (
    LabwareState,
    LabwareView,
    LabwareData,
)


def get_labware_view(
    labware_by_id: Optional[Dict[str, LabwareData]] = None,
    labware_definitions_by_uri: Optional[Dict[str, LabwareDefinition]] = None,
    deck_definition: Optional[DeckDefinitionV2] = None,
) -> LabwareView:
    """Get a labware view test subject."""
    state = LabwareState(
        labware_by_id=labware_by_id or {},
        labware_definitions_by_uri=labware_definitions_by_uri or {},
        deck_definition=deck_definition or cast(DeckDefinitionV2, {"fake": True}),
    )

    return LabwareView(state=state)


def test_get_labware_data_bad_id() -> None:
    """get_labware_data_by_id should raise if labware ID doesn't exist."""
    subject = get_labware_view()

    with pytest.raises(errors.LabwareDoesNotExistError):
        subject.get_labware_data_by_id("asdfghjkl")


def test_get_labware_data_by_id() -> None:
    """It should retrieve labware data from the state."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-definition-uri"),
                calibration=(1, 2, 3),
            )
        }
    )

    assert subject.get_labware_data_by_id("plate-id") == LabwareData(
        location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
        uri=cast(LabwareUri, "some-definition-uri"),
        calibration=(1, 2, 3),
    )


def test_get_labware_definition(well_plate_def: LabwareDefinition) -> None:
    """It should get a labware's definition from the state."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-definition-uri"),
                calibration=(1, 2, 3),
            )
        },
        labware_definitions_by_uri={"some-definition-uri": well_plate_def},
    )

    assert subject.get_labware_definition("plate-id") == well_plate_def


def test_get_labware_definition_bad_id() -> None:
    """get_labware_definition should raise if labware definition doesn't exist."""
    subject = get_labware_view()

    with pytest.raises(errors.LabwareDefinitionDoesNotExistError):
        subject.get_definition_by_uri(cast(LabwareUri, "not-a-uri"))


def test_get_all_labware(
    well_plate_def: LabwareDefinition,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should return all labware."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-definition-uri"),
                calibration=(1, 2, 3),
            ),
            "reservoir-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_2),
                uri=cast(LabwareUri, "other-definition-uri"),
                calibration=(4, 5, 6),
            ),
        }
    )

    all_labware = subject.get_all_labware()

    assert all_labware == [
        ("plate-id", subject.get_labware_data_by_id("plate-id")),
        ("reservoir-id", subject.get_labware_data_by_id("reservoir-id")),
    ]


def test_get_labware_location() -> None:
    """It should return labware location."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-definition-uri"),
                calibration=(1, 2, 3),
            )
        }
    )

    result = subject.get_labware_location("plate-id")

    assert result == DeckSlotLocation(slot=DeckSlotName.SLOT_1)


def test_get_labware_has_quirk(
    well_plate_def: LabwareDefinition,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should return whether a labware by ID has a given quirk."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-plate-uri"),
                calibration=(1, 2, 3),
            ),
            "reservoir-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_2),
                uri=cast(LabwareUri, "some-reservoir-uri"),
                calibration=(4, 5, 6),
            ),
        },
        labware_definitions_by_uri={
            "some-plate-uri": well_plate_def,
            "some-reservoir-uri": reservoir_def,
        },
    )

    well_plate_has_center_quirk = subject.get_labware_has_quirk(
        labware_id="plate-id",
        quirk="centerMultichannelOnWells",
    )

    reservoir_has_center_quirk = subject.get_labware_has_quirk(
        labware_id="reservoir-id",
        quirk="centerMultichannelOnWells",
    )

    assert well_plate_has_center_quirk is False
    assert reservoir_has_center_quirk is True


def test_quirks(
    well_plate_def: LabwareDefinition,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should return a labware's quirks."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-plate-uri"),
                calibration=(1, 2, 3),
            ),
            "reservoir-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_2),
                uri=cast(LabwareUri, "some-reservoir-uri"),
                calibration=(4, 5, 6),
            ),
        },
        labware_definitions_by_uri={
            "some-plate-uri": well_plate_def,
            "some-reservoir-uri": reservoir_def,
        },
    )

    well_plate_quirks = subject.get_quirks("plate-id")
    reservoir_quirks = subject.get_quirks("reservoir-id")

    assert well_plate_quirks == []
    assert reservoir_quirks == ["centerMultichannelOnWells", "touchTipDisabled"]


def test_get_well_definition_bad_id(well_plate_def: LabwareDefinition) -> None:
    """get_well_definition should raise if well name doesn't exist."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-plate-uri"),
                calibration=(1, 2, 3),
            ),
        },
        labware_definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    with pytest.raises(errors.WellDoesNotExistError):
        subject.get_well_definition(labware_id="plate-id", well_name="foobar")


def test_get_well_definition(well_plate_def: LabwareDefinition) -> None:
    """It should return a well definition by well ID."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-plate-uri"),
                calibration=(1, 2, 3),
            ),
        },
        labware_definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    expected_well_def = well_plate_def.wells["B2"]
    result = subject.get_well_definition(labware_id="plate-id", well_name="B2")

    assert result == expected_well_def


def test_get_tip_length_raises_with_non_tip_rack(
    well_plate_def: LabwareDefinition,
) -> None:
    """It should raise if you try to get the tip length of a regular labware."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-plate-uri"),
                calibration=(1, 2, 3),
            ),
        },
        labware_definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    with pytest.raises(errors.LabwareIsNotTipRackError):
        subject.get_tip_length("plate-id")


def test_get_tip_length_gets_length_from_definition(
    tip_rack_def: LabwareDefinition,
) -> None:
    """It should return the tip length from the definition."""
    subject = get_labware_view(
        labware_by_id={
            "tip-rack-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-tip-rack-uri"),
                calibration=(1, 2, 3),
            ),
        },
        labware_definitions_by_uri={"some-tip-rack-uri": tip_rack_def},
    )

    length = subject.get_tip_length("tip-rack-id")
    assert length == tip_rack_def.parameters.tipLength


def test_get_labware_uri_from_definition(tip_rack_def: LabwareDefinition) -> None:
    """It should return the labware's definition URI."""
    subject = get_labware_view(
        labware_by_id={
            "tip-rack-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-tip-rack-uri"),
                calibration=(1, 2, 3),
            ),
        },
        labware_definitions_by_uri={"some-tip-rack-uri": tip_rack_def},
    )

    result = subject.get_definition_uri(labware_id="tip-rack-id")
    assert result == "some-tip-rack-uri"


def test_is_tiprack(
    tip_rack_def: LabwareDefinition, reservoir_def: LabwareDefinition
) -> None:
    """It should determine if labware is a tip rack."""
    subject = get_labware_view(
        labware_by_id={
            "tip-rack-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-tip-rack-uri"),
                calibration=(1, 2, 3),
            ),
            "reservoir-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_2),
                uri=cast(LabwareUri, "some-reservoir-uri"),
                calibration=(4, 5, 6),
            ),
        },
        labware_definitions_by_uri={
            "some-tip-rack-uri": tip_rack_def,
            "some-reservoir-uri": reservoir_def,
        },
    )

    assert subject.is_tiprack(labware_id="tip-rack-id") is True
    assert subject.is_tiprack(labware_id="reservoir-id") is False


def test_get_load_name(reservoir_def: LabwareDefinition) -> None:
    """It should return the load name."""
    subject = get_labware_view(
        labware_by_id={
            "reservoir-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_2),
                uri=cast(LabwareUri, "some-reservoir-uri"),
                calibration=(4, 5, 6),
            ),
        },
        labware_definitions_by_uri={"some-reservoir-uri": reservoir_def},
    )

    result = subject.get_load_name("reservoir-id")

    assert result == reservoir_def.parameters.loadName


def test_get_dimensions(well_plate_def: LabwareDefinition) -> None:
    """It should compute the dimensions of a labware."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": LabwareData(
                location=DeckSlotLocation(slot=DeckSlotName.SLOT_1),
                uri=cast(LabwareUri, "some-plate-uri"),
                calibration=(1, 2, 3),
            ),
        },
        labware_definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    result = subject.get_dimensions(labware_id="plate-id")

    assert result == Dimensions(
        x=well_plate_def.dimensions.xDimension,
        y=well_plate_def.dimensions.yDimension,
        z=well_plate_def.dimensions.zDimension,
    )


def test_get_deck_definition(standard_deck_def: DeckDefinitionV2) -> None:
    """It should get the deck definition from the state."""
    subject = get_labware_view(deck_definition=standard_deck_def)

    assert subject.get_deck_definition() == standard_deck_def


def test_get_slot_definition(standard_deck_def: DeckDefinitionV2) -> None:
    """It should return a deck slot's definition."""
    subject = get_labware_view(deck_definition=standard_deck_def)

    result = subject.get_slot_definition(DeckSlotName.SLOT_6)

    assert result["id"] == "6"
    assert result == standard_deck_def["locations"]["orderedSlots"][5]


def test_get_slot_definition_raises_with_bad_slot_name(
    standard_deck_def: DeckDefinitionV2,
) -> None:
    """It should raise a SlotDoesNotExistError if a bad slot name is given."""
    subject = get_labware_view(deck_definition=standard_deck_def)

    with pytest.raises(errors.SlotDoesNotExistError):
        # note: normally the typechecker should catch this, but clients may
        # not be using typechecking or our enums
        subject.get_slot_definition(42)  # type: ignore[arg-type]


def test_get_slot_position(standard_deck_def: DeckDefinitionV2) -> None:
    """It should get the absolute location of a deck slot's origin."""
    subject = get_labware_view(deck_definition=standard_deck_def)

    slot_pos = standard_deck_def["locations"]["orderedSlots"][2]["position"]
    result = subject.get_slot_position(DeckSlotName.SLOT_3)

    assert result == Point(x=slot_pos[0], y=slot_pos[1], z=slot_pos[2])
