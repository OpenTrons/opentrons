from typing import Dict

import pytest
from decoy import Decoy

from opentrons_shared_data.labware.types import LabwareDefinition2, WellDefinition2
from opentrons.protocol_api import Labware

from opentrons.hardware_control.modules.types import (
    MagneticModuleModel,
    TemperatureModuleModel,
    ThermocyclerModuleModel,
    HeaterShakerModuleModel,
    ModuleModel,
)

from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_api import labware, validation
from opentrons.protocol_api.core.labware import AbstractLabware
from opentrons.protocol_api.core.well import AbstractWellCore
from opentrons.protocol_api.core.legacy import module_geometry
from opentrons.protocol_api.core.legacy.legacy_labware_core import LegacyLabwareCore
from opentrons.protocol_api.core.legacy.legacy_well_core import LegacyWellCore
from opentrons.protocol_api.core.legacy.well_geometry import WellGeometry

from opentrons.calibration_storage import helpers
from opentrons.types import Point, Location

test_data: Dict[str, WellDefinition2] = {
    "circular_well_json": {
        "shape": "circular",
        "depth": 40,
        "totalLiquidVolume": 100,
        "diameter": 30,
        "x": 40,
        "y": 50,
        "z": 3,
    },
    "rectangular_well_json": {
        "shape": "rectangular",
        "depth": 20,
        "totalLiquidVolume": 200,
        "xDimension": 120,
        "yDimension": 50,
        "x": 45,
        "y": 10,
        "z": 22,
    },
}


def test_well_init() -> None:
    slot = Location(Point(1, 2, 3), 1)  # type: ignore[arg-type]
    well_name = "circular_well_json"
    has_tip = False
    well1 = labware.Well(
        parent=None,  # type: ignore[arg-type]
        core=LegacyWellCore(
            well_geometry=WellGeometry(
                well_props=test_data[well_name],
                parent_point=slot.point,
                parent_object=slot.labware,  # type: ignore[arg-type]
            ),
            display_name=well_name,
            has_tip=has_tip,
            name="A1",
        ),
        api_version=APIVersion(2, 13),
    )
    assert well1.geometry.diameter == test_data[well_name]["diameter"]  # type: ignore[typeddict-item]
    assert well1.geometry._length is None
    assert well1.geometry._width is None

    well2_name = "rectangular_well_json"
    well2 = labware.Well(
        parent=None,  # type: ignore[arg-type]
        core=LegacyWellCore(
            well_geometry=WellGeometry(
                well_props=test_data[well2_name],
                parent_point=slot.point,
                parent_object=slot.labware,  # type: ignore[arg-type]
            ),
            display_name=well2_name,
            has_tip=has_tip,
            name="A1",
        ),
        api_version=APIVersion(2, 13),
    )
    assert well2.geometry.diameter is None
    assert well2.geometry._length == test_data[well2_name]["xDimension"]  # type: ignore[typeddict-item]
    assert well2.geometry._width == test_data[well2_name]["yDimension"]  # type: ignore[typeddict-item]


def test_top() -> None:
    slot = Location(Point(4, 5, 6), 1)  # type: ignore[arg-type]
    well_name = "circular_well_json"
    has_tip = False
    well = labware.Well(
        parent=None,  # type: ignore[arg-type]
        core=LegacyWellCore(
            well_geometry=WellGeometry(
                well_props=test_data[well_name],
                parent_point=slot.point,
                parent_object=slot.labware,  # type: ignore[arg-type]
            ),
            display_name=well_name,
            has_tip=has_tip,
            name="A1",
        ),
        api_version=APIVersion(2, 13),
    )
    well_data = test_data[well_name]
    expected_x = well_data["x"] + slot.point.x
    expected_y = well_data["y"] + slot.point.y
    expected_z = well_data["z"] + well_data["depth"] + slot.point.z
    assert well.top() == Location(Point(expected_x, expected_y, expected_z), well)


def test_bottom() -> None:
    slot = Location(Point(7, 8, 9), 1)  # type: ignore[arg-type]
    well_name = "rectangular_well_json"
    has_tip = False
    well = labware.Well(
        parent=None,  # type: ignore[arg-type]
        core=LegacyWellCore(
            well_geometry=WellGeometry(
                well_props=test_data[well_name],
                parent_point=slot.point,
                parent_object=slot.labware,  # type: ignore[arg-type]
            ),
            display_name=well_name,
            has_tip=has_tip,
            name="A1",
        ),
        api_version=APIVersion(2, 13),
    )
    well_data = test_data[well_name]
    expected_x = well_data["x"] + slot.point.x
    expected_y = well_data["y"] + slot.point.y
    expected_z = well_data["z"] + slot.point.z
    assert well.bottom() == Location(Point(expected_x, expected_y, expected_z), well)


def test_from_center_cartesian() -> None:
    slot1 = Location(Point(10, 11, 12), 1)  # type: ignore[arg-type]
    well_name = "circular_well_json"
    has_tip = False
    well1 = labware.Well(
        parent=None,  # type: ignore[arg-type]
        core=LegacyWellCore(
            well_geometry=WellGeometry(
                well_props=test_data[well_name],
                parent_point=slot1.point,
                parent_object=slot1.labware,  # type: ignore[arg-type]
            ),
            display_name=well_name,
            has_tip=has_tip,
            name="A1",
        ),
        api_version=APIVersion(2, 13),
    )

    percent1_x = 1
    percent1_y = 1
    percent1_z = -0.5
    point1 = well1.from_center_cartesian(percent1_x, percent1_y, percent1_z)

    # slot.x + well.x + 1 * well.diamter/2
    expected_x: float = 10 + 40 + 15
    # slot.y + well.y + 1 * well.diamter/2
    expected_y: float = 11 + 50 + 15
    # slot.z + well.z + (1 - 0.5) * well.depth/2
    expected_z: float = 12 + 3 + 20 - 10

    assert point1.x == expected_x
    assert point1.y == expected_y
    assert point1.z == expected_z

    slot2 = Location(Point(13, 14, 15), 1)  # type: ignore[arg-type]
    well2_name = "rectangular_well_json"
    has_tip = False
    well2 = labware.Well(
        parent=None,  # type: ignore[arg-type]
        core=LegacyWellCore(
            well_geometry=WellGeometry(
                well_props=test_data[well2_name],
                parent_point=slot2.point,
                parent_object=slot2.labware,  # type: ignore[arg-type]
            ),
            display_name=well2_name,
            has_tip=has_tip,
            name="A1",
        ),
        api_version=APIVersion(2, 13),
    )
    percent2_x = -0.25
    percent2_y = 0.1
    percent2_z = 0.9
    point2 = well2.geometry.from_center_cartesian(percent2_x, percent2_y, percent2_z)

    # slot.x + well.x - 0.25 * well.length/2
    expected_x = 13 + 45 - 15
    # slot.y + well.y + 0.1 * well.width/2
    expected_y = 14 + 10 + 2.5
    # slot.z + well.z + (1 + 0.9) * well.depth/2
    expected_z = 15 + 22 + 19

    assert point2.x == expected_x
    assert point2.y == expected_y
    assert point2.z == expected_z


@pytest.fixture
def corning_96_wellplate_360ul_flat_def() -> LabwareDefinition2:
    labware_name = "corning_96_wellplate_360ul_flat"
    result = labware.get_labware_definition(labware_name)
    assert result["schemaVersion"] == 2
    return result


@pytest.fixture
def corning_96_wellplate_360ul_flat(
    corning_96_wellplate_360ul_flat_def: LabwareDefinition2,
) -> Labware:
    return labware.Labware(
        core=LegacyLabwareCore(
            definition=corning_96_wellplate_360ul_flat_def,
            parent=Location(Point(0, 0, 0), "Test Slot"),
        ),
        api_version=APIVersion(2, 13),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )


@pytest.fixture
def opentrons_96_tiprack_300ul_def() -> LabwareDefinition2:
    labware_name = "opentrons_96_tiprack_300ul"
    result = labware.get_labware_definition(labware_name)
    assert result["schemaVersion"] == 2
    return result


@pytest.fixture
def opentrons_96_tiprack_300ul(
    opentrons_96_tiprack_300ul_def: LabwareDefinition2,
) -> Labware:
    return labware.Labware(
        core=LegacyLabwareCore(
            definition=opentrons_96_tiprack_300ul_def,
            parent=Location(Point(0, 0, 0), "Test Slot"),
        ),
        api_version=APIVersion(2, 13),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )


def test_back_compat(corning_96_wellplate_360ul_flat: Labware) -> None:
    lw = corning_96_wellplate_360ul_flat

    # Note that this test uses the display name of wells to test for equality,
    # because dimensional parameters could be subject to modification through
    # calibration, whereas here we are testing for "identity" in a way that is
    # related to the combination of well name, labware name, and slot name
    well_a1_name = repr(lw.wells_by_name()["A1"])
    well_b2_name = repr(lw.wells_by_name()["B2"])
    well_c3_name = repr(lw.wells_by_name()["C3"])

    w2 = lw.well(0)
    assert repr(w2) == well_a1_name

    w3 = lw.well("A1")
    assert repr(w3) == well_a1_name

    w4 = lw.wells("B2")
    assert repr(w4[0]) == well_b2_name

    w5 = lw.wells(9, 21, 25, 27)
    assert len(w5) == 4
    assert repr(w5[0]) == well_b2_name

    w6 = lw.wells("A1", "B2", "C3")
    assert all(
        [
            repr(well[0]) == well[1]
            for well in zip(w6, [well_a1_name, well_b2_name, well_c3_name])
        ]
    )

    w7 = lw.rows("A")
    assert len(w7) == 1
    assert repr(w7[0][0]) == well_a1_name

    w8 = lw.rows("A", "C")
    assert len(w8) == 2
    assert repr(w8[0][0]) == well_a1_name
    assert repr(w8[1][2]) == well_c3_name

    w11 = lw.columns("2", "3", "6")
    assert len(w11) == 3
    assert repr(w11[1][2]) == well_c3_name


def test_well_parent(corning_96_wellplate_360ul_flat: Labware) -> None:
    lw = corning_96_wellplate_360ul_flat
    parent = Location(Point(7, 8, 9), lw)
    well_name = "circular_well_json"
    has_tip = True
    well = labware.Well(
        parent=lw,
        core=LegacyWellCore(
            well_geometry=WellGeometry(
                well_props=test_data[well_name],
                parent_point=parent.point,
                parent_object=parent.labware.as_labware()._core,  # type: ignore[arg-type]
            ),
            display_name=well_name,
            has_tip=has_tip,
            name="A1",
        ),
        api_version=APIVersion(2, 13),
    )
    assert well.parent == lw
    assert well.top().labware.object == well
    assert well.top().labware.parent.object == lw
    assert well.bottom().labware.object == well
    assert well.bottom().labware.parent.object == lw
    assert well.center().labware.object == well
    assert well.center().labware.parent.object == lw


def test_tip_tracking_init(
    corning_96_wellplate_360ul_flat: Labware, opentrons_96_tiprack_300ul: Labware
) -> None:
    tiprack = opentrons_96_tiprack_300ul
    assert tiprack.is_tiprack
    for well in tiprack.wells():
        assert well.has_tip

    lw = corning_96_wellplate_360ul_flat
    assert not lw.is_tiprack
    for well in lw.wells():
        assert not well.has_tip


def test_use_tips(opentrons_96_tiprack_300ul: Labware) -> None:
    tiprack = opentrons_96_tiprack_300ul
    well_list = tiprack.wells()

    # Test only using one tip
    tiprack.use_tips(well_list[0])
    assert not well_list[0].has_tip
    for well in well_list[1:]:
        assert well.has_tip

    # Test using a whole column
    tiprack.use_tips(well_list[8], num_channels=8)
    for well in well_list[8:16]:
        assert not well.has_tip
    assert well_list[7].has_tip
    assert well_list[16].has_tip

    # Test using a partial column from the top
    tiprack.use_tips(well_list[16], num_channels=4)
    for well in well_list[16:20]:
        assert not well.has_tip
    for well in well_list[20:24]:
        assert well.has_tip

    # Test using a partial column where the number of tips that get picked up
    # is less than the number of channels (e.g.: an 8-channel pipette picking
    # up 4 tips from the bottom half of a column)
    tiprack.use_tips(well_list[28], num_channels=4)
    for well in well_list[24:28]:
        assert well.has_tip
    for well in well_list[28:32]:
        assert not well.has_tip
    for well in well_list[32:]:
        assert well.has_tip


def test_select_next_tip(
    opentrons_96_tiprack_300ul: Labware,
    opentrons_96_tiprack_300ul_def: LabwareDefinition2,
) -> None:
    tiprack = opentrons_96_tiprack_300ul
    well_list = tiprack.wells()

    next_one = tiprack.next_tip()
    assert next_one == well_list[0]
    next_five = tiprack.next_tip(5)
    assert next_five == well_list[0]
    next_eight = tiprack.next_tip(8)
    assert next_eight == well_list[0]
    next_nine = tiprack.next_tip(9)
    assert next_nine is None

    # A1 tip only has been used
    tiprack.use_tips(well_list[0])

    next_one = tiprack.next_tip()
    assert next_one == well_list[1]
    next_five = tiprack.next_tip(5)
    assert next_five == well_list[1]
    next_eight = tiprack.next_tip(8)
    assert next_eight == well_list[8]

    # 2nd column has also been used
    tiprack.use_tips(well_list[8], num_channels=8)

    next_one = tiprack.next_tip()
    assert next_one == well_list[1]
    next_five = tiprack.next_tip(5)
    assert next_five == well_list[1]
    next_eight = tiprack.next_tip(8)
    assert next_eight == well_list[16]

    # Bottom 4 tips of 1rd column are also used
    tiprack.use_tips(well_list[4], num_channels=4)

    next_one = tiprack.next_tip()
    assert next_one == well_list[1]
    next_three = tiprack.next_tip(3)
    assert next_three == well_list[1]
    next_five = tiprack.next_tip(5)
    assert next_five == well_list[16]
    next_eight = tiprack.next_tip(8)
    assert next_eight == well_list[16]

    # you can reuse tips infinitely on api level 2.2
    tiprack.use_tips(well_list[0])
    tiprack.use_tips(well_list[0])


def test_previous_tip(opentrons_96_tiprack_300ul: Labware) -> None:
    tiprack = opentrons_96_tiprack_300ul
    # If all wells are used, we can't get a previous tip
    assert tiprack.previous_tip() is None
    # If one well is empty, wherever it is, we can get a slot
    tiprack.wells()[5].has_tip = False
    assert tiprack.previous_tip() == tiprack.wells()[5]
    # But not if we ask for more slots than are available
    assert tiprack.previous_tip(2) is None
    tiprack.wells()[7].has_tip = False
    # And those available wells have to be contiguous
    assert tiprack.previous_tip(2) is None
    # But if they are, we're good
    tiprack.wells()[6].has_tip = False
    assert tiprack.previous_tip(3) == tiprack.wells()[5]


def test_return_tips(opentrons_96_tiprack_300ul: Labware) -> None:
    tiprack = opentrons_96_tiprack_300ul

    # If all wells are used, we get an error if we try to return
    with pytest.raises(AssertionError):
        tiprack.return_tips(tiprack.wells()[0])
    # If we have space where we specify, everything is OK
    tiprack.wells()[0].has_tip = False
    tiprack.return_tips(tiprack.wells()[0])
    assert tiprack.wells()[0].has_tip
    # We have to have enough space
    tiprack.wells()[0].has_tip = False
    with pytest.raises(AssertionError):
        tiprack.return_tips(tiprack.wells()[0], 2)
    # But we can drop stuff off the end of a column
    tiprack.wells()[7].has_tip = False
    tiprack.wells()[8].has_tip = False
    tiprack.return_tips(tiprack.wells()[7], 2)
    assert tiprack.wells()[7].has_tip
    # But we won't wrap around
    assert not tiprack.wells()[8].has_tip


@pytest.mark.parametrize(
    "module_model",
    (
        list(MagneticModuleModel)
        + list(TemperatureModuleModel)
        + list(ThermocyclerModuleModel)
        + list(HeaterShakerModuleModel)
    ),
)
def test_module_geometry_load(module_model: ModuleModel) -> None:
    definition = module_geometry.load_definition(module_model)
    geometry = module_geometry.create_geometry(
        definition=definition,
        parent=Location(Point(0, 0, 0), "3"),
        configuration=None,
    )
    high_z = definition["dimensions"]["bareOverallHeight"]

    assert geometry.highest_z == high_z


@pytest.mark.parametrize(
    "module_name",
    [
        "tempdeck",
        "magdeck",
        "temperature module",
        "temperature module gen2",
        "thermocycler",
        "thermocycler module",
        "magnetic module",
        "magnetic module gen2",
        "magneticModuleV1",
        "magneticModuleV2",
        "temperatureModuleV1",
        "temperatureModuleV2",
        "thermocyclerModuleV1",
        "thermocyclerModuleV2",
    ],
)
def test_module_load_labware(module_name: str) -> None:
    labware_name = "corning_96_wellplate_360ul_flat"
    labware_def = labware.get_labware_definition(labware_name)
    mod_model = validation.ensure_module_model(module_name)
    mod_definition = module_geometry.load_definition(mod_model)
    mod = module_geometry.create_geometry(
        mod_definition,
        Location(Point(0, 0, 0), "test"),
        None,
    )
    old_z = mod.highest_z
    assert labware_def["schemaVersion"] == 2  # load_from_definition() expects this.
    lw = labware.load_from_definition(labware_def, mod.location)
    mod.add_labware(lw)
    assert mod.labware == lw
    assert mod.highest_z == (
        mod.location.point.z
        + labware_def["dimensions"]["zDimension"]
        + mod._over_labware
    )
    with pytest.raises(RuntimeError):
        mod.add_labware(lw)
    mod.reset_labware()
    assert mod.labware is None
    assert mod.highest_z == old_z


def test_tiprack_list() -> None:
    labware_name = "opentrons_96_tiprack_300ul"
    labware_def = labware.get_labware_definition(labware_name)
    assert labware_def["schemaVersion"] == 2  # LegacyLabwareCore expects this.
    tiprack = labware.Labware(
        core=LegacyLabwareCore(labware_def, Location(Point(0, 0, 0), "Test Slot")),
        api_version=APIVersion(2, 13),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )
    tiprack_2 = labware.Labware(
        core=LegacyLabwareCore(labware_def, Location(Point(0, 0, 0), "Test Slot")),
        api_version=APIVersion(2, 13),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )

    assert labware.select_tiprack_from_list([tiprack], 1) == (
        tiprack,
        tiprack["A1"],
    )

    assert labware.select_tiprack_from_list([tiprack], 1, tiprack.wells()[1]) == (
        tiprack,
        tiprack["B1"],
    )

    tiprack["C1"].has_tip = False
    assert labware.select_tiprack_from_list([tiprack], 1, tiprack.wells()[2]) == (
        tiprack,
        tiprack["D1"],
    )

    tiprack["H12"].has_tip = False
    tiprack_2["A1"].has_tip = False
    assert labware.select_tiprack_from_list(
        [tiprack, tiprack_2], 1, tiprack.wells()[95]
    ) == (tiprack_2, tiprack_2["B1"])

    with pytest.raises(labware.OutOfTipsError):
        labware.select_tiprack_from_list([tiprack], 1, tiprack.wells()[95])


def test_uris() -> None:
    details = ("opentrons", "opentrons_96_tiprack_300ul", "1")
    uri = "opentrons/opentrons_96_tiprack_300ul/1"
    assert helpers.uri_from_details(*details) == uri
    defn = labware.get_labware_definition(
        details[1], details[0], details[2]  # type: ignore[arg-type]
    )
    assert defn["schemaVersion"] == 2  # LegacyLabwareCore expects this.
    assert helpers.uri_from_definition(defn) == uri
    lw = labware.Labware(
        core=LegacyLabwareCore(defn, Location(Point(0, 0, 0), "Test Slot")),
        api_version=APIVersion(2, 13),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )
    assert lw.uri == uri


def test_labware_hash_func_same_implementation(
    minimal_labware_def: LabwareDefinition2,
) -> None:
    """Test that multiple Labware objects with same implementation and version
    have the same __hash__"""
    impl = LegacyLabwareCore(minimal_labware_def, Location(Point(0, 0, 0), "Test Slot"))
    s = set(
        labware.Labware(
            core=impl,
            api_version=APIVersion(2, 3),
            protocol_core=None,  # type: ignore[arg-type]
            core_map=None,  # type: ignore[arg-type]
        )
        for i in range(10)
    )
    assert len(s) == 1


def test_labware_hash_func_same_implementation_different_version(
    minimal_labware_def: LabwareDefinition2,
) -> None:
    """Test that multiple Labware objects with same implementation yet
    different version have different __hash__"""
    impl = LegacyLabwareCore(minimal_labware_def, Location(Point(0, 0, 0), "Test Slot"))

    l1 = labware.Labware(
        core=impl,
        api_version=APIVersion(2, 13),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )
    l2 = labware.Labware(
        core=impl,
        api_version=APIVersion(2, 14),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )

    assert len({l1, l2}) == 2


def test_labware_hash_func_diff_implementation_same_version(
    minimal_labware_def: LabwareDefinition2,
) -> None:
    """Test that multiple Labware objects with different implementation yet
    sane version have different __hash__"""
    impl1 = LegacyLabwareCore(
        minimal_labware_def, Location(Point(0, 0, 0), "Test Slot")
    )
    impl2 = LegacyLabwareCore(
        minimal_labware_def, Location(Point(0, 0, 0), "Test Slot2")
    )

    l1 = labware.Labware(
        core=impl1,
        api_version=APIVersion(2, 3),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )
    l2 = labware.Labware(
        core=impl2,
        api_version=APIVersion(2, 3),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )

    assert len({l1, l2}) == 2


def test_set_offset(decoy: Decoy) -> None:
    """It should set the labware's offset using the implementation."""
    labware_impl: AbstractLabware[AbstractWellCore] = decoy.mock(cls=AbstractLabware)
    decoy.when(labware_impl.get_well_columns()).then_return([])
    subject = labware.Labware(
        core=labware_impl,
        api_version=APIVersion(2, 12),
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )

    subject.set_offset(x=1.1, y=2.2, z=3.3)
    decoy.verify(labware_impl.set_calibration(Point(1.1, 2.2, 3.3)))
