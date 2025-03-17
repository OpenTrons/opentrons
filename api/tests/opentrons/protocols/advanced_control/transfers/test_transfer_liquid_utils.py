"""Tests for transfer_liquid_utils."""
import pytest
from logging import Logger
from decoy import Decoy
from typing import ContextManager, Any
from contextlib import nullcontext as does_not_raise

from opentrons.protocol_engine.types.liquid_level_detection import (
    LiquidTrackingType,
    SimulatedProbeResult,
)
from opentrons.types import Location, Point
from opentrons.protocol_api.core.engine import WellCore
from opentrons.protocols.advanced_control.transfers.transfer_liquid_utils import (
    raise_if_location_inside_liquid,
    _LocationCheckDescriptors,
)


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
            _LocationCheckDescriptors(
                location_type="submerge start",
                pipetting_action="aspirate",
            ),
            does_not_raise(),
        ),
        (
            Location(point=Point(4, 5, 6), labware=None),
            Location(point=Point(5, 6, 7), labware=None),
            _LocationCheckDescriptors(
                location_type="submerge start",
                pipetting_action="aspirate",
            ),
            pytest.raises(
                RuntimeError,
                match="Received submerge start location of Location\\(point=Point\\(x=4, y=5, z=6\\), labware=, is_meniscus=False\\)"
                " and aspirate location of Location\\(point=Point\\(x=5, y=6, z=7\\), labware=, is_meniscus=False\\)."
                " Submerge start location z should not be lower than the aspirate location z.",
            ),
        ),
        (
            Location(point=Point(4, 5, 6), labware=None),
            Location(point=Point(5, 6, 7), labware=None),
            _LocationCheckDescriptors(
                location_type="retract end",
                pipetting_action="dispense",
            ),
            pytest.raises(
                RuntimeError,
                match="Received retract end location of Location\\(point=Point\\(x=4, y=5, z=6\\), labware=, is_meniscus=False\\)"
                " and dispense location of Location\\(point=Point\\(x=5, y=6, z=7\\), labware=, is_meniscus=False\\)."
                " Retract end location z should not be lower than the dispense location z.",
            ),
        ),
    ],
)
def test_raise_only_if_pip_location_below_target(
    decoy: Decoy,
    pip_location: Location,
    well_location: Location,
    location_descriptors: _LocationCheckDescriptors,
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
                " is_meniscus=False\\) is inside the liquid in well Well A1 of"
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
                " is_meniscus=False\\) is inside the liquid in well Well A1 of"
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
    location_descriptors = _LocationCheckDescriptors(
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
    location_descriptors = _LocationCheckDescriptors(
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
