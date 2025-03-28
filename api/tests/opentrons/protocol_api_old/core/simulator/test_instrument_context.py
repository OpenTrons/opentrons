"""Test instrument context simulation."""
from typing import Callable, cast

import pytest
from _pytest.fixtures import SubRequest
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]

from opentrons.protocol_api.core.common import InstrumentCore, LabwareCore
from opentrons.types import Location, Point
from opentrons_shared_data.errors.exceptions import (
    UnexpectedTipRemovalError,
    UnexpectedTipAttachError,
)

# TODO (lc 12-8-2022) Not sure if we plan to keep these tests, but if we do
# we should re-write them to be agnostic to the underlying hardware. Otherwise
# I wouldn't really consider these to be proper unit tests.
pytestmark = pytest.mark.ot2_only


@pytest.fixture(
    params=[
        lazy_fixture("instrument_context"),
        lazy_fixture("simulating_instrument_context"),
    ]
)
def subject(request: SubRequest) -> InstrumentCore:
    return cast(InstrumentCore, request.param)


def test_same_pipette(
    instrument_context: InstrumentCore,
    simulating_instrument_context: InstrumentCore,
) -> None:
    """It should have the same pipette as hardware backed instrument context."""
    assert (
        instrument_context.get_hardware_state()
        == simulating_instrument_context.get_hardware_state()
    )


def test_prepare_to_aspirate_no_tip(subject: InstrumentCore) -> None:
    """It should raise an error if a tip is not attached."""
    with pytest.raises(
        UnexpectedTipRemovalError, match="Cannot perform PREPARE_ASPIRATE"
    ):
        subject.prepare_to_aspirate()


def test_dispense_no_tip(subject: InstrumentCore) -> None:
    """It should raise an error if a tip is not attached."""
    subject.home()
    location = Location(point=Point(1, 2, 3), labware=None)
    with pytest.raises(UnexpectedTipRemovalError, match="Cannot perform DISPENSE"):
        subject.dispense(
            volume=1,
            rate=1,
            flow_rate=1,
            location=location,
            well_core=None,
            in_place=False,
            correction_volume=0,
            push_out=None,
        )


def test_pick_up_tip_no_tip(subject: InstrumentCore, tip_rack: LabwareCore) -> None:
    """It should raise an error if a tip is already attached."""
    tip_core = tip_rack.get_well_core("A1")

    subject.home()
    subject.pick_up_tip(
        location=Location(point=tip_core.get_top(z_offset=0), labware=None),
        well_core=tip_core,
        presses=None,
        increment=None,
        prep_after=False,
    )
    with pytest.raises(UnexpectedTipAttachError):
        subject.pick_up_tip(
            location=Location(point=tip_core.get_top(z_offset=0), labware=None),
            well_core=tip_core,
            presses=None,
            increment=None,
            prep_after=False,
        )


def test_pick_up_tip_prep_after(
    subject: InstrumentCore, labware: LabwareCore, tip_rack: LabwareCore
) -> None:
    """It should not raise an error, regardless of prep_after value."""
    tip_core = tip_rack.get_well_core("A1")

    subject.home()
    subject.pick_up_tip(
        location=Location(point=tip_core.get_top(z_offset=0), labware=None),
        well_core=tip_core,
        presses=None,
        increment=None,
        prep_after=True,
    )
    subject.aspirate(
        location=Location(point=Point(1, 2, 3), labware=None),
        well_core=labware.get_well_core("A1"),
        volume=1,
        rate=1,
        flow_rate=1,
        in_place=False,
        correction_volume=0,
    )
    subject.dispense(
        volume=1,
        rate=1,
        flow_rate=1,
        location=Location(point=Point(2, 2, 3), labware=None),
        well_core=labware.get_well_core("A2"),
        in_place=False,
        correction_volume=0,
        push_out=None,
    )

    subject.drop_tip(location=None, well_core=tip_core, home_after=True)

    # and again, without preparing for aspirate
    subject.pick_up_tip(
        location=Location(point=tip_core.get_top(z_offset=0), labware=None),
        well_core=tip_core,
        presses=None,
        increment=None,
        prep_after=False,
    )
    subject.aspirate(
        location=Location(point=Point(1, 2, 3), labware=None),
        well_core=labware.get_well_core("A1"),
        volume=1,
        rate=1,
        flow_rate=1,
        in_place=False,
        correction_volume=0,
    )
    subject.dispense(
        volume=1,
        rate=1,
        flow_rate=1,
        location=Location(point=Point(2, 2, 3), labware=None),
        well_core=labware.get_well_core("A2"),
        in_place=False,
        correction_volume=0,
        push_out=None,
    )

    subject.drop_tip(location=None, well_core=tip_core, home_after=True)


def test_aspirate_too_much(
    subject: InstrumentCore, labware: LabwareCore, tip_rack: LabwareCore
) -> None:
    """It should raise an error if try to aspirate more than possible."""
    subject.home()
    subject.pick_up_tip(
        location=Location(
            point=tip_rack.get_well_core("A1").get_top(z_offset=0), labware=None
        ),
        well_core=tip_rack.get_well_core("A1"),
        presses=None,
        increment=None,
        prep_after=False,
    )
    subject.prepare_to_aspirate()
    with pytest.raises(
        AssertionError, match="Cannot aspirate more than pipette max volume"
    ):
        subject.aspirate(
            location=Location(point=Point(1, 2, 3), labware=None),
            well_core=labware.get_well_core("A1"),
            volume=subject.get_max_volume() + 1,
            rate=1,
            flow_rate=1,
            in_place=False,
            correction_volume=0,
        )


def test_working_volume(subject: InstrumentCore, tip_rack: LabwareCore) -> None:
    """It should have the correct working volume."""
    subject.home()
    assert subject.get_hardware_state()["working_volume"] == 300
    subject.pick_up_tip(
        location=Location(
            point=tip_rack.get_well_core("A1").get_top(z_offset=0), labware=None
        ),
        well_core=tip_rack.get_well_core("A1"),
        presses=None,
        increment=None,
        prep_after=False,
    )
    assert subject.get_hardware_state()["working_volume"] == 200


@pytest.mark.parametrize(
    argnames=["side_effector"],
    argvalues=[
        [lambda i: None],
        [lambda i: i.set_flow_rate(aspirate=212, dispense=44, blow_out=22)],
        [lambda i: i.set_pipette_speed(aspirate=212, dispense=44, blow_out=22)],
    ],
)
def test_pipette_dict(
    side_effector: Callable[[InstrumentCore], None],
    instrument_context: InstrumentCore,
    simulating_instrument_context: InstrumentCore,
) -> None:
    """It should be the same."""
    side_effector(instrument_context)
    side_effector(simulating_instrument_context)
    assert (
        instrument_context.get_hardware_state()
        == simulating_instrument_context.get_hardware_state()
    )


def _aspirate(i: InstrumentCore, labware: LabwareCore) -> None:
    """pipette dict with tip fixture."""
    i.prepare_to_aspirate()
    i.aspirate(
        location=Location(point=Point(1, 2, 3), labware=None),
        well_core=labware.get_well_core("A1"),
        volume=12,
        rate=10,
        flow_rate=10,
        in_place=False,
        correction_volume=0,
    )


def _aspirate_dispense(i: InstrumentCore, labware: LabwareCore) -> None:
    """pipette dict with tip fixture."""
    i.prepare_to_aspirate()
    i.aspirate(
        location=Location(point=Point(1, 2, 3), labware=None),
        well_core=labware.get_well_core("A1"),
        volume=12,
        rate=10,
        flow_rate=10,
        in_place=False,
        correction_volume=0,
    )
    i.dispense(
        volume=2,
        rate=2,
        flow_rate=2,
        location=Location(point=Point(2, 2, 3), labware=None),
        well_core=labware.get_well_core("A2"),
        in_place=False,
        correction_volume=0,
        push_out=None,
    )


def _aspirate_blowout(i: InstrumentCore, labware: LabwareCore) -> None:
    """pipette dict with tip fixture."""
    i.prepare_to_aspirate()
    i.aspirate(
        location=Location(point=Point(1, 2, 3), labware=None),
        well_core=labware.get_well_core("A1"),
        volume=11,
        rate=13,
        flow_rate=13,
        in_place=False,
        correction_volume=0,
    )
    i.blow_out(
        location=Location(point=Point(1, 2, 3), labware=None),
        well_core=labware.get_well_core("A1"),
        in_place=True,
    )


@pytest.mark.parametrize(
    argnames=["side_effector"],
    argvalues=[
        [lambda i, l: None],  # noqa: E741
        [_aspirate],
        [_aspirate_dispense],
        [_aspirate_blowout],
    ],
)
def test_pipette_dict_with_tip(
    side_effector: Callable[[InstrumentCore, LabwareCore], None],
    instrument_context: InstrumentCore,
    simulating_instrument_context: InstrumentCore,
    labware: LabwareCore,
    tip_rack: LabwareCore,
) -> None:
    """It should be the same."""
    tip_core = tip_rack.get_well_core("A1")

    # Home first
    instrument_context.home()
    simulating_instrument_context.home()
    # Pickup tip
    instrument_context.pick_up_tip(
        location=Location(point=tip_core.get_top(z_offset=0), labware=None),
        well_core=tip_core,
        presses=3,
        increment=4,
        prep_after=False,
    )
    simulating_instrument_context.pick_up_tip(
        location=Location(point=tip_core.get_top(z_offset=0), labware=None),
        well_core=tip_core,
        presses=3,
        increment=4,
        prep_after=False,
    )

    side_effector(instrument_context, labware)
    side_effector(simulating_instrument_context, labware)
    assert (
        instrument_context.get_hardware_state()
        == simulating_instrument_context.get_hardware_state()
    )

    # Drop tip and compare again
    instrument_context.drop_tip(location=None, well_core=tip_core, home_after=False)
    simulating_instrument_context.drop_tip(
        location=None, well_core=tip_core, home_after=False
    )

    assert (
        instrument_context.get_hardware_state()
        == simulating_instrument_context.get_hardware_state()
    )
