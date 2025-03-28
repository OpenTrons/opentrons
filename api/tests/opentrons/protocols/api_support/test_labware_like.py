from unittest.mock import MagicMock
import pytest
from opentrons.hardware_control.modules.types import TemperatureModuleModel
from opentrons.protocol_api import labware, OFF_DECK
from opentrons.protocols.api_support.labware_like import LabwareLike, LabwareLikeType
from opentrons.protocols.api_support.deck_type import STANDARD_OT2_DECK
from opentrons.protocol_api.core.legacy import module_geometry
from opentrons.protocol_api.core.legacy.deck import Deck
from opentrons.types import Location, Point
from opentrons.protocol_api.labware import Labware
from opentrons.protocol_api.core.legacy.module_geometry import ModuleGeometry

from opentrons_shared_data.labware.types import LabwareDefinition2


@pytest.fixture(scope="session")
def trough_definition() -> LabwareDefinition2:
    result = labware.get_labware_definition("usascientific_12_reservoir_22ml")
    assert result["schemaVersion"] == 2  # For type checking.
    return result


@pytest.fixture(scope="session")
def trough(trough_definition: LabwareDefinition2) -> Labware:
    deck = Deck(deck_type=STANDARD_OT2_DECK)
    return labware.load_from_definition(trough_definition, deck.position_for(1))


@pytest.fixture(scope="session")
def module() -> ModuleGeometry:
    deck = Deck(deck_type=STANDARD_OT2_DECK)
    mod = module_geometry.create_geometry(
        definition=module_geometry.load_definition(
            TemperatureModuleModel.TEMPERATURE_V2
        ),
        parent=deck.position_for("6"),
        configuration=None,
    )
    return mod


@pytest.fixture(scope="session")
def mod_trough(
    trough_definition: LabwareDefinition2, module: ModuleGeometry
) -> Labware:
    mod_trough = module.add_labware(
        labware.load_from_definition(trough_definition, module.location)
    )
    return mod_trough


def test_labware(trough: Labware) -> None:
    ll = LabwareLike(trough)
    assert ll.has_parent is True
    assert ll.parent.object == trough.parent
    assert ll.object == trough
    assert ll.object_type == LabwareLikeType.LABWARE


def test_well(trough: Labware) -> None:
    well = trough["A1"]
    ll = LabwareLike(well)
    assert ll.has_parent is True
    assert ll.parent.object == trough
    assert ll.object == well
    assert ll.object_type == LabwareLikeType.WELL


def test_module(module: ModuleGeometry) -> None:
    ll = LabwareLike(module)
    assert ll.has_parent is True
    assert ll.parent.object is module.parent
    assert ll.object is module
    assert ll.object_type == LabwareLikeType.MODULE
    assert ll.is_module
    assert ll.as_module() == module


def test_slot() -> None:
    ll = LabwareLike("1")
    assert ll.has_parent is False
    assert ll.parent.object is None
    assert ll.object == "1"
    assert ll.object_type == LabwareLikeType.SLOT


def test_empty() -> None:
    ll = LabwareLike(None)
    assert ll.has_parent is False
    assert ll.parent.object is None
    assert ll.object is None
    assert ll.object_type == LabwareLikeType.NONE


def test_off_deck() -> None:
    ll = LabwareLike(OFF_DECK)
    assert ll.has_parent is False
    assert ll.parent.object is None
    assert ll.object is OFF_DECK
    assert ll.object_type == LabwareLikeType.OFF_DECK


def test_module_parent(
    trough: Labware, module: ModuleGeometry, mod_trough: Labware
) -> None:
    assert LabwareLike(mod_trough).module_parent() == module
    assert LabwareLike(mod_trough["A1"]).module_parent() == module
    assert LabwareLike(module).module_parent() == module
    assert LabwareLike(trough).module_parent() is None
    assert LabwareLike("1").module_parent() is None


def test_first_parent(
    trough: Labware, module: ModuleGeometry, mod_trough: Labware
) -> None:
    assert LabwareLike(trough).first_parent() == "1"
    assert LabwareLike(trough["A2"]).first_parent() == "1"
    assert LabwareLike(None).first_parent() is None
    assert LabwareLike("6").first_parent() == "6"

    assert LabwareLike(mod_trough["A5"]).first_parent() == "6"
    assert LabwareLike(mod_trough).first_parent() == "6"
    assert LabwareLike(module).first_parent() == "6"

    # Set up recursion cycle test.
    mock_labware_geometry = MagicMock()
    mock_labware_geometry.parent = Location(
        point=Point(x=-0.75, y=-0.75, z=1), labware=mod_trough
    )
    assert hasattr(mod_trough._core, "get_geometry")
    mod_trough._core.get_geometry = MagicMock(return_value=mock_labware_geometry)

    with pytest.raises(RuntimeError):
        # make sure we catch cycles
        LabwareLike(mod_trough).first_parent()
