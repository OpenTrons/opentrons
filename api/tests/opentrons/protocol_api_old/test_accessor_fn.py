from opentrons.types import Point
from opentrons.protocol_api import Labware
from opentrons.protocol_api.core.legacy.legacy_labware_core import LegacyLabwareCore
from opentrons_shared_data.labware.types import LabwareDefinition2


def test_wells_accessor(
    min_lw: Labware,
    min_lw_impl: LegacyLabwareCore,
    minimal_labware_def: LabwareDefinition2,
) -> None:
    depth1 = minimal_labware_def["wells"]["A1"]["depth"]
    depth2 = minimal_labware_def["wells"]["A2"]["depth"]
    x = minimal_labware_def["wells"]["A2"]["x"]
    y = minimal_labware_def["wells"]["A2"]["y"]
    offset = min_lw_impl.get_geometry()._offset
    a1 = Point(x=offset[0], y=offset[1], z=offset[2] + depth1)
    a2 = Point(x=offset[0] + x, y=offset[1] + y, z=offset[2] + depth2)
    assert min_lw.wells()[0].geometry._position == a1
    assert min_lw.wells()[1].geometry._position == a2


def test_wells_name_accessor(
    min_lw: Labware,
    min_lw_impl: LegacyLabwareCore,
    minimal_labware_def: LabwareDefinition2,
) -> None:
    depth1 = minimal_labware_def["wells"]["A1"]["depth"]
    depth2 = minimal_labware_def["wells"]["A2"]["depth"]
    x = minimal_labware_def["wells"]["A2"]["x"]
    y = minimal_labware_def["wells"]["A2"]["y"]
    offset = min_lw_impl.get_geometry().offset
    a1 = Point(x=offset[0], y=offset[1], z=offset[2] + depth1)
    a2 = Point(x=offset[0] + x, y=offset[1] + y, z=offset[2] + depth2)
    assert min_lw.wells_by_name()["A1"].geometry._position == a1
    assert min_lw.wells_by_name()["A2"].geometry._position == a2


def test_deprecated_index_accessors(min_lw: Labware) -> None:
    assert min_lw.wells_by_name() == min_lw.wells_by_index()
    assert min_lw.rows_by_name() == min_lw.rows_by_index()
    assert min_lw.columns_by_name() == min_lw.columns_by_index()


def test_dict_accessor(
    min_lw: Labware,
    min_lw_impl: LegacyLabwareCore,
    minimal_labware_def: LabwareDefinition2,
) -> None:
    depth1 = minimal_labware_def["wells"]["A1"]["depth"]
    depth2 = minimal_labware_def["wells"]["A2"]["depth"]
    x = minimal_labware_def["wells"]["A2"]["x"]
    y = minimal_labware_def["wells"]["A2"]["y"]
    offset = min_lw_impl.get_geometry().offset
    a1 = Point(x=offset[0], y=offset[1], z=offset[2] + depth1)
    a2 = Point(x=offset[0] + x, y=offset[1] + y, z=offset[2] + depth2)
    assert min_lw["A1"].geometry._position == a1
    assert min_lw["A2"].geometry._position == a2


def test_rows_accessor(
    min_lw2_impl: LegacyLabwareCore,
    min_lw2: Labware,
    minimal_labware_def2: LabwareDefinition2,
) -> None:
    depth1 = minimal_labware_def2["wells"]["A1"]["depth"]
    x1 = minimal_labware_def2["wells"]["A1"]["x"]
    y1 = minimal_labware_def2["wells"]["A1"]["y"]
    depth2 = minimal_labware_def2["wells"]["B2"]["depth"]
    x2 = minimal_labware_def2["wells"]["B2"]["x"]
    y2 = minimal_labware_def2["wells"]["B2"]["y"]
    offset = min_lw2_impl.get_geometry().offset
    a1 = Point(x=offset[0] + x1, y=offset[1] + y1, z=offset[2] + depth1)
    b2 = Point(x=offset[0] + x2, y=offset[1] + y2, z=offset[2] + depth2)
    assert min_lw2.rows()[0][0].geometry._position == a1
    assert min_lw2.rows()[1][1].geometry._position == b2


def test_row_name_accessor(
    min_lw2_impl: LegacyLabwareCore,
    min_lw2: Labware,
    minimal_labware_def2: LabwareDefinition2,
) -> None:
    depth1 = minimal_labware_def2["wells"]["A1"]["depth"]
    x1 = minimal_labware_def2["wells"]["A1"]["x"]
    y1 = minimal_labware_def2["wells"]["A1"]["y"]
    depth2 = minimal_labware_def2["wells"]["B2"]["depth"]
    x2 = minimal_labware_def2["wells"]["B2"]["x"]
    y2 = minimal_labware_def2["wells"]["B2"]["y"]
    offset = min_lw2_impl.get_geometry().offset
    a1 = Point(x=offset[0] + x1, y=offset[1] + y1, z=offset[2] + depth1)
    b2 = Point(x=offset[0] + x2, y=offset[1] + y2, z=offset[2] + depth2)
    assert min_lw2.rows_by_name()["A"][0].geometry._position == a1
    assert min_lw2.rows_by_name()["B"][1].geometry._position == b2


def test_cols_accessor(
    min_lw_impl: LegacyLabwareCore,
    min_lw: Labware,
    minimal_labware_def: LabwareDefinition2,
) -> None:
    depth1 = minimal_labware_def["wells"]["A1"]["depth"]
    depth2 = minimal_labware_def["wells"]["A2"]["depth"]
    x = minimal_labware_def["wells"]["A2"]["x"]
    y = minimal_labware_def["wells"]["A2"]["y"]
    offset = min_lw_impl.get_geometry().offset
    a1 = Point(x=offset[0], y=offset[1], z=offset[2] + depth1)
    a2 = Point(x=offset[0] + x, y=offset[1] + y, z=offset[2] + depth2)
    assert min_lw.columns()[0][0].geometry._position == a1
    assert min_lw.columns()[1][0].geometry._position == a2


def test_col_name_accessor(
    min_lw: Labware,
    min_lw_impl: LegacyLabwareCore,
    minimal_labware_def: LabwareDefinition2,
) -> None:
    depth1 = minimal_labware_def["wells"]["A1"]["depth"]
    depth2 = minimal_labware_def["wells"]["A2"]["depth"]
    x = minimal_labware_def["wells"]["A2"]["x"]
    y = minimal_labware_def["wells"]["A2"]["y"]
    offset = min_lw_impl.get_geometry().offset
    a1 = Point(x=offset[0], y=offset[1], z=offset[2] + depth1)
    a2 = Point(x=offset[0] + x, y=offset[1] + y, z=offset[2] + depth2)
    assert min_lw.columns_by_name()["1"][0].geometry._position == a1
    assert min_lw.columns_by_name()["2"][0].geometry._position == a2
