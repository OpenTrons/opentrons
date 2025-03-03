from _pytest.fixtures import SubRequest
import pytest
from typing import Any, List, Tuple

from opentrons.types import Location, Point
from opentrons.protocols.api_support.deck_type import (
    SHORT_TRASH_DECK,
    STANDARD_OT2_DECK,
)
from opentrons.protocols.geometry.planning import (
    plan_moves,
    safe_height,
    should_dodge_thermocycler,
)
from opentrons.protocol_api.core.legacy import module_geometry
from opentrons.protocol_api.core.legacy.deck import Deck
from opentrons.protocol_api import labware
from opentrons.hardware_control.types import CriticalPoint
from opentrons.hardware_control.modules.types import (
    ThermocyclerModuleModel,
    TemperatureModuleModel,
    MagneticModuleModel,
)

tall_lw_name = "opentrons_96_tiprack_1000ul"
labware_name = "corning_96_wellplate_360ul_flat"
trough_name = "usascientific_12_reservoir_22ml"
P300M_GEN2_MAX_HEIGHT = 155.75


@pytest.fixture(
    # Limit the tests in this file to just test with OT-2 deck definitions.
    #
    # We need to do this because the tests in this file use the `Deck` class from
    # the older, non-Protocol-Engine versions of the Python Protocol API (apiLevel<=2.13),
    # and those versions do not support OT-3s.
    #
    # TODO(mm, 2023-05-18) We should either:
    #
    # * Decide that the functions tested here are only for PAPIv<=2.13.
    #   Then, we should move them to `opentrons.protocol_api.core.legacy` to indicate that.
    #
    # * Or, decide that the functions tested here are for all versions of PAPI.
    #   Then, we should rewrite these tests to not depend on the OT-2-only `Deck` class.
    params=[STANDARD_OT2_DECK, SHORT_TRASH_DECK]
)
def deck(request: SubRequest) -> Deck:
    return Deck(deck_type=request.param)


def check_arc_basic(
    arc: List[Tuple[Point, Any]], from_loc: Location, to_loc: Location
) -> None:
    """Check the tests that should always be true for different-well moves
    - we should always go only up, then only xy, then only down
    - we should have three moves
    """
    assert len(arc) == 3
    assert arc[0][0]._replace(z=0) == from_loc.point._replace(z=0)
    assert arc[0][0].z == arc[1][0].z
    assert arc[1][0]._replace(z=0) == to_loc.point._replace(z=0)
    assert arc[2][0] == to_loc.point
    assert arc[0][0].z >= from_loc.point.z
    assert arc[1][0].z >= to_loc.point.z


def test_direct_moves(deck: Deck) -> None:
    lw1 = labware.load(labware_name, deck.position_for(1))

    same_place = plan_moves(
        lw1.wells()[0].top(),
        lw1.wells()[0].top(),
        deck,
        instr_max_height=P300M_GEN2_MAX_HEIGHT,
    )
    assert same_place == [(lw1.wells()[0].top().point, None)]

    same_well = plan_moves(
        lw1.wells()[0].top(),
        lw1.wells()[0].bottom(),
        deck,
        instr_max_height=P300M_GEN2_MAX_HEIGHT,
    )
    assert same_well == [(lw1.wells()[0].bottom().point, None)]


def test_basic_arc(deck: Deck) -> None:
    lw1 = labware.load(labware_name, deck.position_for(1))
    lw2 = labware.load(labware_name, deck.position_for(2))
    deck[1] = lw1
    deck[2] = lw2

    # same-labware moves should use the smaller safe z
    same_lw = plan_moves(
        lw1.wells()[0].top(),
        lw1.wells()[8].bottom(),
        deck,
        P300M_GEN2_MAX_HEIGHT,
        5.0,
        10.0,
    )
    check_arc_basic(same_lw, lw1.wells()[0].top(), lw1.wells()[8].bottom())
    assert same_lw[0][0].z == lw1.wells()[0].top().point.z + 5.0

    # different-labware moves, or moves with no labware attached,
    # should use the larger safe z and the global z
    different_lw = plan_moves(
        lw1.wells()[0].top(),
        lw2.wells()[0].bottom(),
        deck,
        P300M_GEN2_MAX_HEIGHT,
        5.0,
        10.0,
    )
    check_arc_basic(different_lw, lw1.wells()[0].top(), lw2.wells()[0].bottom())
    assert different_lw[0][0].z == deck.highest_z + 10.0


def test_force_direct(deck: Deck) -> None:
    lw1 = labware.load(labware_name, deck.position_for(1))
    lw2 = labware.load(labware_name, deck.position_for(2))
    # same-labware moves should move direct
    same_lw = plan_moves(
        lw1.wells()[0].top(),
        lw1.wells()[8].bottom(),
        deck,
        P300M_GEN2_MAX_HEIGHT,
        5.0,
        10.0,
        force_direct=True,
    )
    assert same_lw == [(lw1.wells()[8].bottom().point, None)]

    # different-labware moves should move direct
    different_lw = plan_moves(
        lw1.wells()[0].top(),
        lw2.wells()[0].bottom(),
        deck,
        P300M_GEN2_MAX_HEIGHT,
        5.0,
        10.0,
        force_direct=True,
    )
    assert different_lw == [(lw2.wells()[0].bottom().point, None)]


def test_no_labware_loc(deck: Deck) -> None:
    labware_def = labware.get_labware_definition(labware_name)

    lw1 = labware.load(labware_name, deck.position_for(1))
    lw2 = labware.load(labware_name, deck.position_for(2))
    deck[1] = lw1
    deck[2] = lw2
    # Various flavors of locations without labware should work
    no_lw = Location(point=lw1.wells()[0].top().point, labware=None)

    no_from = plan_moves(
        no_lw, lw2.wells()[0].bottom(), deck, P300M_GEN2_MAX_HEIGHT, 5.0, 10.0
    )
    check_arc_basic(no_from, no_lw, lw2.wells()[0].bottom())
    assert no_from[0][0].z == deck.highest_z + 10.0

    no_to = plan_moves(
        lw1.wells()[0].bottom(), no_lw, deck, P300M_GEN2_MAX_HEIGHT, 5.0, 10.0
    )
    check_arc_basic(no_to, lw1.wells()[0].bottom(), no_lw)
    assert no_from[0][0].z == deck.highest_z + 10.0

    no_well = Location(point=lw1.wells()[0].top().point, labware=lw1)

    no_from_well = plan_moves(
        no_well, lw1.wells()[1].top(), deck, P300M_GEN2_MAX_HEIGHT, 5.0, 10.0
    )
    check_arc_basic(no_from_well, no_well, lw1.wells()[1].top())

    no_from_well_height = no_from_well[0][0].z
    assert labware_def["schemaVersion"] == 2  # For presence of ["dimensions"].
    lw_height_expected = labware_def["dimensions"]["zDimension"] + 5.0
    assert no_from_well_height == lw_height_expected

    no_to_well = plan_moves(
        lw1.wells()[1].top(), no_well, deck, P300M_GEN2_MAX_HEIGHT, 5.0, 10.0
    )
    check_arc_basic(no_to_well, lw1.wells()[1].top(), no_well)
    no_to_well_height = no_to_well[0][0].z
    assert no_to_well_height == lw_height_expected


def test_arc_tall_point(deck: Deck) -> None:
    lw1 = labware.load(labware_name, deck.position_for(1))
    tall_z = 100
    old_top = lw1.wells()[0].top()
    tall_point = old_top.point._replace(z=tall_z)
    tall_top = Location(point=tall_point, labware=old_top.labware)
    to_tall = plan_moves(lw1.wells()[2].top(), tall_top, deck, 5.0, 10.0)
    check_arc_basic(to_tall, lw1.wells()[2].top(), tall_top)
    assert to_tall[0][0].z == tall_z

    from_tall = plan_moves(tall_top, lw1.wells()[3].top(), deck, 5.0, 10.0)
    check_arc_basic(from_tall, tall_top, lw1.wells()[3].top())
    assert from_tall[0][0].z == tall_z

    no_well = Location(point=tall_top.point, labware=lw1)
    from_tall_lw = plan_moves(no_well, lw1.wells()[4].bottom(), deck, 5.0, 10.0)
    check_arc_basic(from_tall_lw, no_well, lw1.wells()[4].bottom())


def test_arc_lower_minimum_z_height(deck: Deck) -> None:
    lw1 = labware.load(labware_name, deck.position_for(1))
    tall_z = 100
    minimum_z_height = 42
    old_top = lw1.wells()[0].top()
    tall_point = old_top.point._replace(z=tall_z)
    tall_top = Location(point=tall_point, labware=old_top.labware)
    to_tall = plan_moves(
        lw1.wells()[2].top(),
        tall_top,
        deck,
        P300M_GEN2_MAX_HEIGHT,
        5.0,
        10.0,
        False,
        minimum_z_height=minimum_z_height,
    )
    check_arc_basic(to_tall, lw1.wells()[2].top(), tall_top)
    assert to_tall[0][0].z == tall_z

    from_tall = plan_moves(
        tall_top,
        lw1.wells()[3].top(),
        deck,
        P300M_GEN2_MAX_HEIGHT,
        5.0,
        10.0,
        minimum_z_height=minimum_z_height,
    )
    check_arc_basic(from_tall, tall_top, lw1.wells()[3].top())
    assert from_tall[0][0].z == tall_z

    no_well = Location(point=tall_top.point, labware=lw1)
    from_tall_lw = plan_moves(
        no_well, lw1.wells()[4].bottom(), deck, P300M_GEN2_MAX_HEIGHT, 5.0, 10.0
    )
    check_arc_basic(from_tall_lw, no_well, lw1.wells()[4].bottom())


def test_direct_minimum_z_height(deck: Deck) -> None:
    lw1 = labware.load(labware_name, deck.position_for(1))
    from_loc = lw1.wells()[0].bottom().move(Point(x=-2))
    to_loc = lw1.wells()[0].bottom().move(Point(x=2))
    zmo = 150
    # This would normally be a direct move since it’s inside the same well,
    # but we want to check that we override it into an arc
    moves = plan_moves(
        from_loc, to_loc, deck, P300M_GEN2_MAX_HEIGHT, minimum_z_height=zmo
    )
    assert len(moves) == 3
    assert moves[0][0].z == zmo  # equals zmo b/c 150 is max of all safe z's
    check_arc_basic(moves, from_loc, to_loc)


def test_direct_cp(deck: Deck) -> None:
    trough = labware.load(trough_name, deck.position_for(1))
    lw1 = labware.load(labware_name, deck.position_for(2))
    # when moving from no origin location to a centered labware we should
    # start in default cp
    from_nothing = plan_moves(
        Location(Point(50, 50, 50), None),
        trough.wells()[0].top(),
        deck,
        P300M_GEN2_MAX_HEIGHT,
    )
    check_arc_basic(
        from_nothing, Location(Point(50, 50, 50), None), trough.wells()[0].top()
    )
    assert from_nothing[0][1] is None
    assert from_nothing[1][1] == CriticalPoint.XY_CENTER
    assert from_nothing[2][1] == CriticalPoint.XY_CENTER
    # when moving from an origin with a centered labware to a dest with a
    # centered labware we should stay in centered the entire time, whether
    # arc
    from_centered_arc = plan_moves(
        trough.wells()[0].top(), trough.wells()[1].top(), deck, P300M_GEN2_MAX_HEIGHT
    )
    check_arc_basic(from_centered_arc, trough.wells()[0].top(), trough.wells()[1].top())
    assert from_centered_arc[0][1] == CriticalPoint.XY_CENTER
    assert from_centered_arc[1][1] == CriticalPoint.XY_CENTER
    assert from_centered_arc[2][1] == CriticalPoint.XY_CENTER
    # or direct
    from_centered_direct = plan_moves(
        trough.wells()[0].top(), trough.wells()[1].bottom(), deck, P300M_GEN2_MAX_HEIGHT
    )
    assert from_centered_direct[0][1] == CriticalPoint.XY_CENTER
    # when moving from centered to normal, only the first move should be
    # centered
    to_normal = plan_moves(
        trough.wells()[0].top(), lw1.wells()[0].top(), deck, P300M_GEN2_MAX_HEIGHT
    )
    check_arc_basic(to_normal, trough.wells()[0].top(), lw1.wells()[0].top())
    assert to_normal[0][1] == CriticalPoint.XY_CENTER
    assert to_normal[1][1] is None
    assert to_normal[2][1] is None


@pytest.mark.ot2_only  # Due to usage of create_geometry_for_ot2_deck().
def test_gen2_module_transforms(deck: Deck) -> None:
    tmod = module_geometry.create_geometry(
        definition=module_geometry.load_definition(
            TemperatureModuleModel.TEMPERATURE_V2
        ),
        parent=deck.position_for("1"),
        configuration=None,
    )
    assert tmod.labware_offset == Point(-1.45, -0.15, 80.09)
    tmod2 = module_geometry.create_geometry(
        definition=module_geometry.load_definition(
            TemperatureModuleModel.TEMPERATURE_V2
        ),
        parent=deck.position_for("3"),
        configuration=None,
    )
    assert tmod2.labware_offset == Point(1.15, -0.15, 80.09)

    mmod = module_geometry.create_geometry(
        definition=module_geometry.load_definition(MagneticModuleModel.MAGNETIC_V2),
        parent=deck.position_for("1"),
        configuration=None,
    )
    assert mmod.labware_offset == Point(-1.175, -0.125, 82.25)
    mmod2 = module_geometry.create_geometry(
        definition=module_geometry.load_definition(MagneticModuleModel.MAGNETIC_V2),
        parent=deck.position_for("3"),
        configuration=None,
    )
    assert mmod2.labware_offset == Point(1.425, -0.125, 82.25)


def test_instr_max_height(deck: Deck) -> None:
    fixed_trash = deck.get_fixed_trash()
    trough = labware.load(trough_name, deck.position_for(1))
    trough2 = labware.load(trough_name, deck.position_for(2))
    deck[1] = trough
    deck[2] = trough2

    # if the highest deck height is between 1 mm and 10 mm below
    # the max instrument achievable height, we use the max instrument
    # height as the safe height
    assert isinstance(fixed_trash, labware.Labware)
    instr_max_height = fixed_trash.wells()[0].top().point.z + 1
    height = safe_height(
        from_loc=trough.wells()[0].top(),
        to_loc=trough2.wells()[0].top(),
        deck=deck,
        instr_max_height=round(instr_max_height, 2),
        well_z_margin=5.0,
        lw_z_margin=10.0,
    )
    assert height == round(instr_max_height, 2)

    # if the highest deck height is > 10 mm below the max instrument
    # height, we use the lw_z_margin instead
    instr_max_height = fixed_trash.wells()[0].top().point.z + 30
    height2 = safe_height(
        from_loc=trough.wells()[0].top(),
        to_loc=trough2.wells()[0].top(),
        deck=deck,
        instr_max_height=round(instr_max_height, 2),
        well_z_margin=5.0,
        lw_z_margin=10.0,
    )
    assert height2 == round(fixed_trash.wells()[0].top().point.z, 2) + 10.0

    # it fails if the highest deck height is less than 1 mm below
    # the max instr achievable height
    instr_max_height = fixed_trash.wells()[0].top().point.z
    with pytest.raises(Exception):
        safe_height(
            from_loc=trough.wells()[0].top(),
            to_loc=trough2.wells()[0].top(),
            deck=deck,
            instr_max_height=round(instr_max_height, 2),
            well_z_margin=5.0,
            lw_z_margin=10.0,
        )


def test_should_dodge(deck: Deck) -> None:
    # with no tc loaded, doesn't matter what the positions are
    assert not should_dodge_thermocycler(
        deck, deck.position_for(4), deck.position_for(9)
    )
    deck[7] = module_geometry.create_geometry(
        definition=module_geometry.load_definition(
            ThermocyclerModuleModel.THERMOCYCLER_V1
        ),
        parent=deck.position_for(7),
        configuration=None,
    )
    # with a tc loaded, some positions should require dodging
    assert should_dodge_thermocycler(deck, deck.position_for(12), deck.position_for(1))
    assert should_dodge_thermocycler(deck, deck.position_for(9), deck.position_for(4))
    # but ones that weren't explicitly marked shouldn't
    assert not should_dodge_thermocycler(
        deck, deck.position_for(1), deck.position_for(2)
    )
    # including a situation where we might have some messed up locations
    # with no parent
    assert not should_dodge_thermocycler(
        deck,
        Location(point=deck.position_for(1).point, labware=None),
        deck.position_for(12),
    )


def test_labware_in_next_slot(deck: Deck) -> None:
    trough = labware.load(trough_name, deck.position_for(4))
    trough2 = labware.load(trough_name, deck.position_for(1))
    trough3 = labware.load(trough_name, deck.position_for(3))
    deck[4] = trough
    deck[1] = trough2
    deck[3] = trough3
    assert deck.right_of("3") is None
    assert deck.left_of("2") is trough2
    assert deck.right_of("2") is trough3

    assert deck.right_of("9") is None


def test_get_non_fixture_slots(deck: Deck) -> None:
    trough = labware.load(trough_name, deck.position_for(4))
    deck[4] = trough

    assert deck.get_non_fixture_slots() == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]


def test_thermocycler_present(deck: Deck) -> None:
    """It should change when thermocycler is added/removed"""
    # Empty deck. No thermocycler
    assert not deck.thermocycler_present

    # Add a thermocycler
    deck[7] = module_geometry.create_geometry(
        definition=module_geometry.load_definition(
            ThermocyclerModuleModel.THERMOCYCLER_V1
        ),
        parent=deck.position_for(7),
        configuration=None,
    )
    assert deck.thermocycler_present

    # Add another labware
    deck[4] = labware.load(trough_name, deck.position_for(4))
    assert deck.thermocycler_present

    # Remove thermocycler
    del deck[7]
    assert not deck.thermocycler_present
