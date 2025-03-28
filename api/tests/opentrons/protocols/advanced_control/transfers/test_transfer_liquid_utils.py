"""Tests for transfer_liquid_utils."""
import pytest
from logging import Logger
from decoy import Decoy
from typing import ContextManager, Any
from contextlib import nullcontext as does_not_raise


from opentrons.hardware_control.nozzle_manager import NozzleMap
from opentrons.protocol_engine.types.liquid_level_detection import (
    LiquidTrackingType,
    SimulatedProbeResult,
)
from opentrons.types import Location, Point
from opentrons.protocol_api.core.engine import WellCore
from opentrons.protocol_api.labware import Well, Labware
from opentrons.protocols.advanced_control.transfers.transfer_liquid_utils import (
    raise_if_location_inside_liquid,
    LocationCheckDescriptors,
    group_wells_for_multi_channel_transfer,
)

from opentrons_shared_data.pipette.pipette_definition import ValidNozzleMaps

from tests.opentrons.protocol_engine.pipette_fixtures import (
    NINETY_SIX_ROWS,
    NINETY_SIX_COLS,
    NINETY_SIX_MAP,
    EIGHT_CHANNEL_ROWS,
    EIGHT_CHANNEL_COLS,
    EIGHT_CHANNEL_MAP,
)
from .labware_well_fixtures import WELLS_BY_COLUMN_96, WELLS_BY_COLUMN_384

_96_FULL_MAP = NozzleMap.build(
    physical_nozzles=NINETY_SIX_MAP,
    physical_rows=NINETY_SIX_ROWS,
    physical_columns=NINETY_SIX_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="H12",
    valid_nozzle_maps=ValidNozzleMaps(
        maps={
            "Full": sum(
                [
                    NINETY_SIX_ROWS["A"],
                    NINETY_SIX_ROWS["B"],
                    NINETY_SIX_ROWS["C"],
                    NINETY_SIX_ROWS["D"],
                    NINETY_SIX_ROWS["E"],
                    NINETY_SIX_ROWS["F"],
                    NINETY_SIX_ROWS["G"],
                    NINETY_SIX_ROWS["H"],
                ],
                [],
            )
        }
    ),
)

_96_COL1_MAP = NozzleMap.build(
    physical_nozzles=NINETY_SIX_MAP,
    physical_rows=NINETY_SIX_ROWS,
    physical_columns=NINETY_SIX_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="H1",
    valid_nozzle_maps=ValidNozzleMaps(maps={"Column1": NINETY_SIX_COLS["1"]}),
)

_96_COL12_MAP = NozzleMap.build(
    physical_nozzles=NINETY_SIX_MAP,
    physical_rows=NINETY_SIX_ROWS,
    physical_columns=NINETY_SIX_COLS,
    starting_nozzle="A12",
    back_left_nozzle="A12",
    front_right_nozzle="H12",
    valid_nozzle_maps=ValidNozzleMaps(maps={"Column12": NINETY_SIX_COLS["12"]}),
)

_96_ROW_A_MAP = NozzleMap.build(
    physical_nozzles=NINETY_SIX_MAP,
    physical_rows=NINETY_SIX_ROWS,
    physical_columns=NINETY_SIX_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="A12",
    valid_nozzle_maps=ValidNozzleMaps(maps={"RowA": NINETY_SIX_ROWS["A"]}),
)

_96_ROW_H_MAP = NozzleMap.build(
    physical_nozzles=NINETY_SIX_MAP,
    physical_rows=NINETY_SIX_ROWS,
    physical_columns=NINETY_SIX_COLS,
    starting_nozzle="H1",
    back_left_nozzle="H1",
    front_right_nozzle="H12",
    valid_nozzle_maps=ValidNozzleMaps(maps={"RowH": NINETY_SIX_ROWS["H"]}),
)

_8_FULL_MAP = NozzleMap.build(
    physical_nozzles=EIGHT_CHANNEL_MAP,
    physical_rows=EIGHT_CHANNEL_ROWS,
    physical_columns=EIGHT_CHANNEL_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="H1",
    valid_nozzle_maps=ValidNozzleMaps(maps={"Full": EIGHT_CHANNEL_COLS["1"]}),
)


@pytest.fixture
def mock_96_well_labware(decoy: Decoy) -> Labware:
    """Get a mock 96 well labware."""
    mock_96_well_labware = decoy.mock(cls=Labware)
    decoy.when(mock_96_well_labware.parameters).then_return({"format": "96Standard"})  # type: ignore[typeddict-item]
    labware_wells_by_column = []
    for column in WELLS_BY_COLUMN_96:
        wells_by_column = []
        for well_name in column:
            mock_well = decoy.mock(cls=Well)
            decoy.when(mock_well.well_name).then_return(well_name)
            wells_by_column.append(mock_well)
        labware_wells_by_column.append(wells_by_column)
    decoy.when(mock_96_well_labware.columns()).then_return(labware_wells_by_column)
    return mock_96_well_labware


@pytest.fixture
def mock_384_well_labware(decoy: Decoy) -> Labware:
    """Get a mock 96 well labware."""
    mock_384_well_labware = decoy.mock(cls=Labware)
    decoy.when(mock_384_well_labware.parameters).then_return({"format": "384Standard"})  # type: ignore[typeddict-item]
    labware_wells_by_column = []
    for column in WELLS_BY_COLUMN_384:
        wells_by_column = []
        for well_name in column:
            mock_well = decoy.mock(cls=Well)
            decoy.when(mock_well.well_name).then_return(well_name)
            wells_by_column.append(mock_well)
        labware_wells_by_column.append(wells_by_column)
    decoy.when(mock_384_well_labware.columns()).then_return(labware_wells_by_column)
    return mock_384_well_labware


@pytest.mark.parametrize(
    argnames=[
        "pip_location",
        "well_location",
        "location_descriptors",
        "expected_raise",
    ],
    argvalues=[
        (
            Location(point=Point(4, 5, 6), labware=None),
            Location(point=Point(1, 1, 1), labware=None),
            LocationCheckDescriptors(
                location_type="submerge start",
                pipetting_action="aspirate",
            ),
            does_not_raise(),
        ),
        (
            Location(point=Point(4, 5, 6), labware=None),
            Location(point=Point(5, 6, 7), labware=None),
            LocationCheckDescriptors(
                location_type="submerge start",
                pipetting_action="aspirate",
            ),
            pytest.raises(
                RuntimeError,
                match="Received submerge start location of Location\\(point=Point\\(x=4, y=5, z=6\\), labware=, meniscus_tracking=None\\)"
                " and aspirate location of Location\\(point=Point\\(x=5, y=6, z=7\\), labware=, meniscus_tracking=None\\)."
                " Submerge start location z should not be lower than the aspirate location z.",
            ),
        ),
        (
            Location(point=Point(4, 5, 6), labware=None),
            Location(point=Point(5, 6, 7), labware=None),
            LocationCheckDescriptors(
                location_type="retract end",
                pipetting_action="dispense",
            ),
            pytest.raises(
                RuntimeError,
                match="Received retract end location of Location\\(point=Point\\(x=4, y=5, z=6\\), labware=, meniscus_tracking=None\\)"
                " and dispense location of Location\\(point=Point\\(x=5, y=6, z=7\\), labware=, meniscus_tracking=None\\)."
                " Retract end location z should not be lower than the dispense location z.",
            ),
        ),
    ],
)
def test_raise_only_if_pip_location_below_target(
    decoy: Decoy,
    pip_location: Location,
    well_location: Location,
    location_descriptors: LocationCheckDescriptors,
    expected_raise: ContextManager[Any],
) -> None:
    """It should raise appropriately based on heights of given location and target location."""
    well_core = decoy.mock(cls=WellCore)
    logger = decoy.mock(cls=Logger)
    decoy.when(well_core.current_liquid_height()).then_return(0)
    decoy.when(well_core.get_bottom(0)).then_return(Point(0, 0, 0))
    with expected_raise:
        raise_if_location_inside_liquid(
            location=pip_location,
            well_location=well_location,
            well_core=well_core,
            location_check_descriptors=location_descriptors,
            logger=logger,
        )


@pytest.mark.parametrize(
    argnames=["liquid_height", "pip_location", "well_bottom", "expected_raise"],
    argvalues=[
        (
            1.0,
            Location(point=Point(4, 5, 6), labware=None),
            Point(0, 0, 0),
            does_not_raise(),
        ),
        (
            100.0,
            Location(point=Point(4, 5, 6), labware=None),
            Point(0, 0, 0),
            pytest.raises(
                RuntimeError,
                match="Retract end location Location\\(point=Point\\(x=4, y=5, z=6\\), labware=,"
                " meniscus_tracking=None\\) is inside the liquid in well Well A1 of"
                " test_labware when it should be outside\\(above\\) the liquid.",
            ),
        ),
        (
            1,
            Location(point=Point(5, 6, 7), labware=None),
            Point(10, 11, 12),
            pytest.raises(
                RuntimeError,
                match="Retract end location Location\\(point=Point\\(x=5, y=6, z=7\\), labware=,"
                " meniscus_tracking=None\\) is inside the liquid in well Well A1 of"
                " test_labware when it should be outside\\(above\\) the liquid.",
            ),
        ),
        (
            SimulatedProbeResult(),
            Location(point=Point(5, 6, 7), labware=None),
            Point(10, 11, 12),
            does_not_raise(),
        ),
    ],
)
def test_raise_only_if_pip_location_inside_liquid(
    decoy: Decoy,
    liquid_height: LiquidTrackingType,
    pip_location: Location,
    well_bottom: Point,
    expected_raise: ContextManager[Any],
) -> None:
    """It should raise an error if we have access to liquid height and pipette is in liquid."""
    well_location = Location(point=Point(1, 1, 1), labware=None)
    well_core = decoy.mock(cls=WellCore)
    location_descriptors = LocationCheckDescriptors(
        location_type="retract end",
        pipetting_action="aspirate",
    )
    logger = decoy.mock(cls=Logger)

    decoy.when(well_core.current_liquid_height()).then_return(liquid_height)
    decoy.when(well_core.get_bottom(0)).then_return(well_bottom)
    decoy.when(well_core.get_display_name()).then_return("Well A1 of test_labware")
    with expected_raise:
        raise_if_location_inside_liquid(
            location=pip_location,
            well_location=well_location,
            well_core=well_core,
            location_check_descriptors=location_descriptors,
            logger=logger,
        )


def test_log_warning_if_pip_location_cannot_be_validated(
    decoy: Decoy,
) -> None:
    """It should log a warning if we don't have access to liquid height."""
    pip_location = Location(point=Point(1, 2, 3), labware=None)
    well_location = Location(point=Point(1, 1, 1), labware=None)
    well_core = decoy.mock(cls=WellCore)
    location_descriptors = LocationCheckDescriptors(
        location_type="retract end",
        pipetting_action="aspirate",
    )
    logger = decoy.mock(cls=Logger)

    decoy.when(well_core.current_liquid_height()).then_return(SimulatedProbeResult())
    decoy.when(well_core.get_bottom(0)).then_return(Point(0, 0, 0))
    decoy.when(well_core.get_display_name()).then_return("Well A1 of test_labware")
    raise_if_location_inside_liquid(
        location=pip_location,
        well_location=well_location,
        well_core=well_core,
        location_check_descriptors=location_descriptors,
        logger=logger,
    )
    decoy.verify(
        logger.warning(
            "Could not verify height of liquid in well Well A1 of test_labware, either"
            " because the liquid in this well has not been probed or because"
            " liquid was not loaded in this well using `load_liquid`."
            " Proceeding without verifying if retract end location is outside the liquid."
        )
    )


@pytest.mark.parametrize(
    argnames="nozzle_map", argvalues=[_8_FULL_MAP, _96_COL1_MAP, _96_COL12_MAP]
)
def test_grouping_wells_for_column_96_plate(
    nozzle_map: NozzleMap, mock_96_well_labware: Labware, decoy: Decoy
) -> None:
    """It should group two columns into A1 and A2."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(16)]
    for mock_well, well_name in zip(
        mock_wells, WELLS_BY_COLUMN_96[0] + WELLS_BY_COLUMN_96[1]
    ):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_96_well_labware)

    wells = group_wells_for_multi_channel_transfer(mock_wells, nozzle_map)
    assert len(wells) == 2
    assert wells[0].well_name == "A1"
    assert wells[1].well_name == "A2"


@pytest.mark.parametrize(
    argnames="nozzle_map", argvalues=[_8_FULL_MAP, _96_COL1_MAP, _96_COL12_MAP]
)
def test_grouping_wells_for_column_384_plate(
    nozzle_map: NozzleMap, mock_384_well_labware: Labware, decoy: Decoy
) -> None:
    """It should group two columns into A1, B1, A2 and B2."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(32)]
    for mock_well, well_name in zip(
        mock_wells, WELLS_BY_COLUMN_384[0] + WELLS_BY_COLUMN_384[1]
    ):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_384_well_labware)

    wells = group_wells_for_multi_channel_transfer(mock_wells, nozzle_map)
    assert len(wells) == 4
    assert wells[0].well_name == "A1"
    assert wells[1].well_name == "B1"
    assert wells[2].well_name == "A2"
    assert wells[3].well_name == "B2"


@pytest.mark.parametrize(
    argnames="nozzle_map", argvalues=[_8_FULL_MAP, _96_COL1_MAP, _96_COL12_MAP]
)
def test_grouping_wells_for_column_96_plate_raises(
    nozzle_map: NozzleMap, mock_96_well_labware: Labware, decoy: Decoy
) -> None:
    """It should raise if a valid grouping can't be found for all wells."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(18)]
    for mock_well, well_name in zip(
        mock_wells, WELLS_BY_COLUMN_96[0] + WELLS_BY_COLUMN_96[1] + ["A3", "B3"]
    ):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_96_well_labware)

    # leftover wells
    with pytest.raises(ValueError, match="Could not target all wells"):
        group_wells_for_multi_channel_transfer(mock_wells, nozzle_map)

    # non-contiguous wells from the same labware
    with pytest.raises(ValueError, match="Could not resolve wells"):
        group_wells_for_multi_channel_transfer(
            mock_wells[:7] + [mock_wells[-1], mock_wells[7]], nozzle_map
        )

    other_labware = decoy.mock(cls=Labware)
    decoy.when(other_labware.parameters).then_return({"format": "96Standard"})  # type: ignore[typeddict-item]
    other_well = decoy.mock(cls=Well)
    decoy.when(other_well.well_name).then_return("H1")
    decoy.when(other_well.parent).then_return(other_labware)

    # non-contiguous wells from different labware, well name is correct though
    with pytest.raises(ValueError, match="Could not resolve wells"):
        group_wells_for_multi_channel_transfer(
            mock_wells[:7] + [other_well], nozzle_map
        )


@pytest.mark.parametrize(
    argnames="nozzle_map", argvalues=[_8_FULL_MAP, _96_COL1_MAP, _96_COL12_MAP]
)
def test_grouping_wells_for_column_384_plate_raises(
    nozzle_map: NozzleMap, mock_384_well_labware: Labware, decoy: Decoy
) -> None:
    """It should raise if a valid grouping can't be found for all wells."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(32)]
    for mock_well, well_name in zip(
        mock_wells, WELLS_BY_COLUMN_384[0] + WELLS_BY_COLUMN_384[1]
    ):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_384_well_labware)

    # leftover wells
    with pytest.raises(ValueError, match="Could not target all wells"):
        group_wells_for_multi_channel_transfer(mock_wells[:-1], nozzle_map)

    # non-contiguous or every other wells from the same labware
    with pytest.raises(ValueError, match="Could not resolve wells"):
        group_wells_for_multi_channel_transfer(
            mock_wells[:2] + [mock_wells[-1]], nozzle_map
        )
        group_wells_for_multi_channel_transfer(
            mock_wells[:-1] + [mock_wells[0]], nozzle_map
        )

    other_labware = decoy.mock(cls=Labware)
    decoy.when(other_labware.parameters).then_return({"format": "384Standard"})  # type: ignore[typeddict-item]
    other_well = decoy.mock(cls=Well)
    decoy.when(other_well.well_name).then_return("P1")
    decoy.when(other_well.parent).then_return(other_labware)

    # non-contiguous wells from different labware, well name is correct though
    with pytest.raises(ValueError, match="Could not resolve wells"):
        group_wells_for_multi_channel_transfer(
            mock_wells[:15] + [other_well], nozzle_map
        )


@pytest.mark.parametrize(
    argnames="nozzle_map", argvalues=[_96_ROW_A_MAP, _96_ROW_H_MAP]
)
def test_grouping_wells_for_row_96_plate(
    nozzle_map: NozzleMap, mock_96_well_labware: Labware, decoy: Decoy
) -> None:
    """It should group two rows into A1 and B1."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(24)]
    first_two_row_well_names = [f"A{i}" for i in range(1, 13)] + [
        f"B{i}" for i in range(1, 13)
    ]
    for mock_well, well_name in zip(mock_wells, first_two_row_well_names):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_96_well_labware)

    wells = group_wells_for_multi_channel_transfer(mock_wells, nozzle_map)
    assert len(wells) == 2
    assert wells[0].well_name == "A1"
    assert wells[1].well_name == "B1"


@pytest.mark.parametrize(
    argnames="nozzle_map", argvalues=[_96_ROW_A_MAP, _96_ROW_H_MAP]
)
def test_grouping_wells_for_row_384_plate(
    nozzle_map: NozzleMap, mock_384_well_labware: Labware, decoy: Decoy
) -> None:
    """It should group two columns into A1, A2, B1, B2."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(48)]
    first_two_row_well_names = [f"A{i}" for i in range(1, 25)] + [
        f"B{i}" for i in range(1, 25)
    ]
    for mock_well, well_name in zip(mock_wells, first_two_row_well_names):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_384_well_labware)

    wells = group_wells_for_multi_channel_transfer(mock_wells, nozzle_map)
    assert len(wells) == 4
    assert wells[0].well_name == "A1"
    assert wells[1].well_name == "A2"
    assert wells[2].well_name == "B1"
    assert wells[3].well_name == "B2"


@pytest.mark.parametrize(
    argnames="nozzle_map", argvalues=[_96_ROW_A_MAP, _96_ROW_H_MAP]
)
def test_grouping_wells_for_row_96_plate_raises(
    nozzle_map: NozzleMap, mock_96_well_labware: Labware, decoy: Decoy
) -> None:
    """It should raise if a valid grouping can't be found for all wells."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(24)]
    first_two_row_well_names = [f"A{i}" for i in range(1, 13)] + [
        f"B{i}" for i in range(1, 13)
    ]
    for mock_well, well_name in zip(mock_wells, first_two_row_well_names):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_96_well_labware)

    # leftover wells
    with pytest.raises(ValueError, match="Could not target all wells"):
        group_wells_for_multi_channel_transfer(mock_wells[:-1], nozzle_map)

    # non-contiguous wells from the same labware
    with pytest.raises(ValueError, match="Could not resolve wells"):
        group_wells_for_multi_channel_transfer(
            mock_wells[:11] + [mock_wells[-1], mock_wells[11]], nozzle_map
        )

    other_labware = decoy.mock(cls=Labware)
    decoy.when(other_labware.parameters).then_return({"format": "96Standard"})  # type: ignore[typeddict-item]
    other_well = decoy.mock(cls=Well)
    decoy.when(other_well.well_name).then_return("A12")
    decoy.when(other_well.parent).then_return(other_labware)

    # non-contiguous wells from different labware, well name is correct though
    with pytest.raises(ValueError, match="Could not resolve wells"):
        group_wells_for_multi_channel_transfer(
            mock_wells[:11] + [other_well], nozzle_map
        )


@pytest.mark.parametrize(
    argnames="nozzle_map", argvalues=[_96_ROW_A_MAP, _96_ROW_H_MAP]
)
def test_grouping_wells_for_row_384_plate_raises(
    nozzle_map: NozzleMap, mock_384_well_labware: Labware, decoy: Decoy
) -> None:
    """It should raise if a valid grouping can't be found for all wells."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(48)]
    first_two_row_well_names = [f"A{i}" for i in range(1, 25)] + [
        f"B{i}" for i in range(1, 25)
    ]
    for mock_well, well_name in zip(mock_wells, first_two_row_well_names):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_384_well_labware)

    # leftover wells
    with pytest.raises(ValueError, match="Could not target all wells"):
        group_wells_for_multi_channel_transfer(mock_wells[:-1], nozzle_map)

    # non-contiguous or every other wells from the same labware
    with pytest.raises(ValueError, match="Could not resolve wells"):
        group_wells_for_multi_channel_transfer(
            mock_wells[:2] + [mock_wells[-1]], nozzle_map
        )
        group_wells_for_multi_channel_transfer(
            mock_wells[:-1] + [mock_wells[0]], nozzle_map
        )

    other_labware = decoy.mock(cls=Labware)
    decoy.when(other_labware.parameters).then_return({"format": "384Standard"})  # type: ignore[typeddict-item]
    other_well = decoy.mock(cls=Well)
    decoy.when(other_well.well_name).then_return("A24")
    decoy.when(other_well.parent).then_return(other_labware)

    # non-contiguous wells from different labware, well name is correct though
    with pytest.raises(ValueError, match="Could not resolve wells"):
        group_wells_for_multi_channel_transfer(
            mock_wells[:23] + [other_well], nozzle_map
        )


def test_grouping_wells_for_full_96_plate(
    mock_96_well_labware: Labware, decoy: Decoy
) -> None:
    """It should group a whole 96 well plate into A1."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(96)]
    for mock_well, well_name in zip(mock_wells, NINETY_SIX_MAP.keys()):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_96_well_labware)

    wells = group_wells_for_multi_channel_transfer(mock_wells, _96_FULL_MAP)
    assert len(wells) == 1
    assert wells[0].well_name == "A1"


def test_grouping_wells_for_full_384_plate(
    mock_384_well_labware: Labware, decoy: Decoy
) -> None:
    """It should a whole 384 well plate into A1, B1, A2 and B2."""
    mock_wells = [decoy.mock(cls=Well) for _ in range(384)]
    flat_384_well_names = [well for column in WELLS_BY_COLUMN_384 for well in column]
    for mock_well, well_name in zip(mock_wells, flat_384_well_names):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_384_well_labware)

    wells = group_wells_for_multi_channel_transfer(mock_wells, _96_FULL_MAP)
    assert len(wells) == 4
    assert wells[0].well_name == "A1"
    assert wells[1].well_name == "B1"
    assert wells[2].well_name == "A2"
    assert wells[3].well_name == "B2"


def test_grouping_wells_raises_for_unsupported_configuration() -> None:
    """It should raise if the well configuration is not supported."""
    nozzle_map = NozzleMap.build(
        physical_nozzles=EIGHT_CHANNEL_MAP,
        physical_rows=EIGHT_CHANNEL_ROWS,
        physical_columns=EIGHT_CHANNEL_COLS,
        starting_nozzle="A1",
        back_left_nozzle="A1",
        front_right_nozzle="D1",
        valid_nozzle_maps=ValidNozzleMaps(maps={"Half": ["A1", "B1", "C1", "D1"]}),
    )
    with pytest.raises(ValueError, match="Unsupported tip configuration"):
        group_wells_for_multi_channel_transfer([], nozzle_map)


@pytest.mark.parametrize(
    argnames="nozzle_map",
    argvalues=[
        _8_FULL_MAP,
        _96_FULL_MAP,
        _96_COL1_MAP,
        _96_COL12_MAP,
        _96_ROW_A_MAP,
        _96_ROW_H_MAP,
    ],
)
def test_grouping_well_returns_all_wells_for_non_96_or_384_plate(
    nozzle_map: NozzleMap, decoy: Decoy
) -> None:
    """It should return all wells if parent labware is not a 96 or 384 well plate"""
    mock_reservoir = decoy.mock(cls=Labware)
    decoy.when(mock_reservoir.parameters).then_return({"format": "reservoir"})  # type: ignore[typeddict-item]

    mock_wells = [decoy.mock(cls=Well) for _ in range(12)]
    for mock_well, well_name in zip(mock_wells, [f"A{i}" for i in range(1, 13)]):
        decoy.when(mock_well.well_name).then_return(well_name)
        decoy.when(mock_well.parent).then_return(mock_reservoir)

    result = group_wells_for_multi_channel_transfer(mock_wells, nozzle_map)
    assert result == mock_wells
