"""Unit tests for robot_server.deck_configuration.validation."""

from opentrons_shared_data.deck import load as load_deck_definition

from robot_server.deck_configuration import validation as subject


def test_valid() -> None:
    """It should return an empty error list if the input is valid."""
    deck_definition = load_deck_definition("ot3_standard", version=5)
    cutout_fixtures = [
        subject.Placement(
            cutout_fixture_id=cutout_fixture_id,
            cutout_id=cutout_id,
            opentrons_module_serial_number=opentrons_module_serial_number,
        )
        for cutout_fixture_id, cutout_id, opentrons_module_serial_number in [
            ("singleLeftSlot", "cutoutA1", None),
            ("singleLeftSlot", "cutoutB1", None),
            ("singleLeftSlot", "cutoutC1", None),
            ("singleLeftSlot", "cutoutD1", None),
            ("singleCenterSlot", "cutoutA2", None),
            ("singleCenterSlot", "cutoutB2", None),
            ("singleCenterSlot", "cutoutC2", None),
            ("singleCenterSlot", "cutoutD2", None),
            ("stagingAreaRightSlot", "cutoutA3", None),
            ("singleRightSlot", "cutoutB3", None),
            ("stagingAreaRightSlot", "cutoutC3", None),
            ("singleRightSlot", "cutoutD3", None),
        ]
    ]
    assert subject.get_configuration_errors(deck_definition, cutout_fixtures) == set()


def test_invalid_empty_cutouts() -> None:
    """It should enforce that every cutout is occupied."""
    deck_definition = load_deck_definition("ot3_standard", version=5)
    cutout_fixtures = [
        subject.Placement(
            cutout_fixture_id=cutout_fixture_id,
            cutout_id=cutout_id,
            opentrons_module_serial_number=opentrons_module_serial_number,
        )
        for cutout_fixture_id, cutout_id, opentrons_module_serial_number in [
            ("singleLeftSlot", "cutoutA1", None),
            ("singleLeftSlot", "cutoutB1", None),
            ("singleLeftSlot", "cutoutC1", None),
            ("singleLeftSlot", "cutoutD1", None),
            ("singleCenterSlot", "cutoutA2", None),
            ("singleCenterSlot", "cutoutB2", None),
            # Invalid because we haven't placed anything into cutout C2 or D2.
            # ("singleCenterSlot", "cutoutC2", None),
            # ("singleCenterSlot", "cutoutD2", None),
            ("stagingAreaRightSlot", "cutoutA3", None),
            ("singleRightSlot", "cutoutB3", None),
            ("stagingAreaRightSlot", "cutoutC3", None),
            ("singleRightSlot", "cutoutD3", None),
        ]
    ]
    assert subject.get_configuration_errors(deck_definition, cutout_fixtures) == {
        subject.UnoccupiedCutoutError(cutout_id="cutoutC2"),
        subject.UnoccupiedCutoutError(cutout_id="cutoutD2"),
    }


def test_invalid_overcrowded_cutouts() -> None:
    """It should prevent you from putting multiple things into a single cutout."""
    deck_definition = load_deck_definition("ot3_standard", version=5)
    cutout_fixtures = [
        subject.Placement(
            cutout_fixture_id=cutout_fixture_id,
            cutout_id=cutout_id,
            opentrons_module_serial_number=opentrons_module_serial_number,
        )
        for cutout_fixture_id, cutout_id, opentrons_module_serial_number in [
            ("singleLeftSlot", "cutoutA1", None),
            ("singleLeftSlot", "cutoutB1", None),
            ("singleLeftSlot", "cutoutC1", None),
            ("singleLeftSlot", "cutoutD1", None),
            ("singleCenterSlot", "cutoutA2", None),
            ("singleCenterSlot", "cutoutB2", None),
            ("singleCenterSlot", "cutoutC2", None),
            ("singleCenterSlot", "cutoutD2", None),
            ("stagingAreaRightSlot", "cutoutA3", None),
            ("singleRightSlot", "cutoutB3", None),
            # Invalid because we're placing two things in cutout C3...
            ("stagingAreaRightSlot", "cutoutC3", None),
            ("stagingAreaRightSlot", "cutoutC3", None),
            # ...and two things in cutout D3.
            ("wasteChuteRightAdapterNoCover", "cutoutD3", None),
            ("singleRightSlot", "cutoutD3", None),
        ]
    ]
    assert subject.get_configuration_errors(deck_definition, cutout_fixtures) == {
        subject.OvercrowdedCutoutError(
            cutout_id="cutoutC3",
            cutout_fixture_ids=("stagingAreaRightSlot", "stagingAreaRightSlot"),
        ),
        subject.OvercrowdedCutoutError(
            cutout_id="cutoutD3",
            cutout_fixture_ids=("wasteChuteRightAdapterNoCover", "singleRightSlot"),
        ),
    }


def test_invalid_cutout_for_fixture() -> None:
    """Each fixture must be placed in a location that's valid for that particular fixture."""
    deck_definition = load_deck_definition("ot3_standard", version=5)
    cutout_fixtures = [
        subject.Placement(
            cutout_fixture_id=cutout_fixture_id,
            cutout_id=cutout_id,
            opentrons_module_serial_number=opentrons_module_serial_number,
        )
        for cutout_fixture_id, cutout_id, opentrons_module_serial_number in [
            ("singleLeftSlot", "cutoutA1", None),
            ("singleLeftSlot", "cutoutB1", None),
            ("singleLeftSlot", "cutoutC1", None),
            ("singleLeftSlot", "cutoutD1", None),
            ("singleCenterSlot", "cutoutA2", None),
            ("singleCenterSlot", "cutoutB2", None),
            # Invalid because wasteChuteRightAdapterNoCover can't be placed in cutout C2...
            ("wasteChuteRightAdapterNoCover", "cutoutC2", None),
            # ...nor can singleLeftSlot be placed in cutout D2.
            ("singleLeftSlot", "cutoutD2", None),
            ("stagingAreaRightSlot", "cutoutA3", None),
            ("singleRightSlot", "cutoutB3", None),
            ("stagingAreaRightSlot", "cutoutC3", None),
            ("singleRightSlot", "cutoutD3", None),
        ]
    ]
    assert subject.get_configuration_errors(deck_definition, cutout_fixtures) == {
        subject.InvalidLocationError(
            cutout_id="cutoutC2",
            cutout_fixture_id="wasteChuteRightAdapterNoCover",
            allowed_cutout_ids=frozenset(["cutoutD3"]),
        ),
        subject.InvalidLocationError(
            cutout_id="cutoutD2",
            cutout_fixture_id="singleLeftSlot",
            allowed_cutout_ids=frozenset(
                ["cutoutA1", "cutoutB1", "cutoutC1", "cutoutD1"]
            ),
        ),
    }


def test_unrecognized_cutout() -> None:
    """It should raise a sensible error if you pass a totally nonexistent cutout."""
    deck_definition = load_deck_definition("ot3_standard", version=5)
    cutout_fixtures = [
        subject.Placement(
            cutout_fixture_id=cutout_fixture_id,
            cutout_id=cutout_id,
            opentrons_module_serial_number=opentrons_module_serial_number,
        )
        for cutout_fixture_id, cutout_id, opentrons_module_serial_number in [
            ("singleLeftSlot", "cutoutA1", None),
            ("singleLeftSlot", "cutoutB1", None),
            ("singleLeftSlot", "cutoutC1", None),
            ("singleLeftSlot", "cutoutD1", None),
            ("singleCenterSlot", "cutoutA2", None),
            ("singleCenterSlot", "cutoutB2", None),
            ("singleCenterSlot", "cutoutC2", None),
            ("singleCenterSlot", "cutoutD2", None),
            ("singleRightSlot", "cutoutA3", None),
            ("singleRightSlot", "cutoutB3", None),
            ("singleRightSlot", "cutoutC3", None),
            ("singleRightSlot", "cutoutD3", None),
            # Invalid because "someUnrecognizedCutout" is not defined by the deck definition.
            ("singleRightSlot", "someUnrecognizedCutout", None),
        ]
    ]
    assert subject.get_configuration_errors(deck_definition, cutout_fixtures) == {
        subject.InvalidLocationError(
            cutout_fixture_id="singleRightSlot",
            cutout_id="someUnrecognizedCutout",
            allowed_cutout_ids=frozenset(
                ["cutoutA3", "cutoutB3", "cutoutC3", "cutoutD3"]
            ),
        )
    }


def test_unrecognized_cutout_fixture() -> None:
    """It should raise a sensible error if you pass a totally nonexistent cutout fixture."""
    deck_definition = load_deck_definition("ot3_standard", version=5)
    cutout_fixtures = [
        subject.Placement(
            cutout_fixture_id=cutout_fixture_id,
            cutout_id=cutout_id,
            opentrons_module_serial_number=opentrons_module_serial_number,
        )
        for cutout_fixture_id, cutout_id, opentrons_module_serial_number in [
            ("singleLeftSlot", "cutoutA1", None),
            ("singleLeftSlot", "cutoutB1", None),
            ("singleLeftSlot", "cutoutC1", None),
            ("singleLeftSlot", "cutoutD1", None),
            ("singleCenterSlot", "cutoutA2", None),
            ("singleCenterSlot", "cutoutB2", None),
            ("singleCenterSlot", "cutoutC2", None),
            ("singleCenterSlot", "cutoutD2", None),
            ("singleRightSlot", "cutoutA3", None),
            ("singleRightSlot", "cutoutB3", None),
            ("singleRightSlot", "cutoutC3", None),
            # Invalid because "someUnrecognizedCutoutFixture" is not defined by the deck definition.
            ("someUnrecognizedCutoutFixture", "cutoutD3", None),
        ]
    ]
    assert subject.get_configuration_errors(deck_definition, cutout_fixtures) == {
        subject.UnrecognizedCutoutFixtureError(
            cutout_fixture_id="someUnrecognizedCutoutFixture",
            allowed_cutout_fixture_ids=frozenset(
                [
                    "singleLeftSlot",
                    "singleCenterSlot",
                    "singleRightSlot",
                    "stagingAreaRightSlot",
                    "wasteChuteRightAdapterCovered",
                    "wasteChuteRightAdapterNoCover",
                    "stagingAreaSlotWithWasteChuteRightAdapterCovered",
                    "stagingAreaSlotWithWasteChuteRightAdapterNoCover",
                    "trashBinAdapter",
                    "thermocyclerModuleV2Rear",
                    "thermocyclerModuleV2Front",
                    "heaterShakerModuleV1",
                    "temperatureModuleV2",
                    "magneticBlockV1",
                    "absorbanceReaderV1",
                    "stagingAreaSlotWithMagneticBlockV1",
                    "flexStackerModuleV1",
                    "flexStackerModuleV1WithWasteChuteRightAdapterCovered",
                    "flexStackerModuleV1WithWasteChuteRightAdapterNoCover",
                    "flexStackerModuleV1WithMagneticBlockV1",
                ]
            ),
        )
    }


def test_invalid_serial_number() -> None:
    """It should raise a sensible error if you fail to provide a serial number for a fixture that requires one."""
    deck_definition = load_deck_definition("ot3_standard", version=5)
    cutout_fixtures = [
        subject.Placement(
            cutout_fixture_id=cutout_fixture_id,
            cutout_id=cutout_id,
            opentrons_module_serial_number=opentrons_module_serial_number,
        )
        for cutout_fixture_id, cutout_id, opentrons_module_serial_number in [
            ("thermocyclerModuleV2Rear", "cutoutA1", "ABC"),
            # Invalid, because the Thermocycler V2 Front fixture requires a serial number
            ("thermocyclerModuleV2Front", "cutoutB1", None),
            ("singleLeftSlot", "cutoutC1", None),
            ("singleLeftSlot", "cutoutD1", None),
            ("singleCenterSlot", "cutoutA2", None),
            ("singleCenterSlot", "cutoutB2", None),
            ("singleCenterSlot", "cutoutC2", None),
            ("singleCenterSlot", "cutoutD2", None),
            ("singleRightSlot", "cutoutA3", None),
            ("singleRightSlot", "cutoutB3", None),
            ("singleRightSlot", "cutoutC3", None),
            ("singleRightSlot", "cutoutD3", None),
        ]
    ]
    assert subject.get_configuration_errors(deck_definition, cutout_fixtures) == {
        subject.InvalidSerialNumberError(
            cutout_fixture_id="thermocyclerModuleV2Front",
            cutout_id="cutoutB1",
        )
    }


def test_unexpected_serial_number() -> None:
    """It should raise a sensible error if you provide a serial number for a fixture that DOES NOT require one."""
    deck_definition = load_deck_definition("ot3_standard", version=5)
    cutout_fixtures = [
        subject.Placement(
            cutout_fixture_id=cutout_fixture_id,
            cutout_id=cutout_id,
            opentrons_module_serial_number=opentrons_module_serial_number,
        )
        for cutout_fixture_id, cutout_id, opentrons_module_serial_number in [
            # Invalid, single slot fixtures do not have serial numbers
            ("singleLeftSlot", "cutoutA1", "ABC"),
            ("singleLeftSlot", "cutoutB1", None),
            ("singleLeftSlot", "cutoutC1", None),
            ("singleLeftSlot", "cutoutD1", None),
            ("singleCenterSlot", "cutoutA2", None),
            ("singleCenterSlot", "cutoutB2", None),
            ("singleCenterSlot", "cutoutC2", None),
            ("singleCenterSlot", "cutoutD2", None),
            ("singleRightSlot", "cutoutA3", None),
            ("singleRightSlot", "cutoutB3", None),
            ("singleRightSlot", "cutoutC3", None),
            ("singleRightSlot", "cutoutD3", None),
        ]
    ]
    assert subject.get_configuration_errors(deck_definition, cutout_fixtures) == {
        subject.UnexpectedSerialNumberError(
            cutout_fixture_id="singleLeftSlot",
            cutout_id="cutoutA1",
            opentrons_module_serial_number="ABC",
        )
    }


# new test to raise error if not all members of a fixture group are loaded into the deck config
def test_missing_group_fixture() -> None:
    """It should raise a sensible error if you fail to provide all members of a fixture group in a deck configuration."""
    deck_definition = load_deck_definition("ot3_standard", version=5)
    cutout_fixtures = [
        subject.Placement(
            cutout_fixture_id=cutout_fixture_id,
            cutout_id=cutout_id,
            opentrons_module_serial_number=opentrons_module_serial_number,
        )
        for cutout_fixture_id, cutout_id, opentrons_module_serial_number in [
            ("thermocyclerModuleV2Rear", "cutoutA1", "ABC"),
            # Invalid, because the Thermocycler V2 Rear fixture above requires a Front fixture be loaded as well
            ("singleLeftSlot", "cutoutB1", None),
            ("singleLeftSlot", "cutoutC1", None),
            ("singleLeftSlot", "cutoutD1", None),
            ("singleCenterSlot", "cutoutA2", None),
            ("singleCenterSlot", "cutoutB2", None),
            ("singleCenterSlot", "cutoutC2", None),
            ("singleCenterSlot", "cutoutD2", None),
            ("singleRightSlot", "cutoutA3", None),
            ("singleRightSlot", "cutoutB3", None),
            ("singleRightSlot", "cutoutC3", None),
            ("singleRightSlot", "cutoutD3", None),
        ]
    ]
    assert subject.get_configuration_errors(deck_definition, cutout_fixtures) == {
        subject.MissingGroupFixtureError(
            cutout_fixture_id="thermocyclerModuleV2Rear",
            cutout_id="cutoutA1",
            missing_fixture_id="thermocyclerModuleV2Front",
        )
    }
