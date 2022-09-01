"""Tests for motion planning."""
import numpy as np
from hypothesis import given, assume, strategies as st
from hypothesis.extra import numpy as hynp
from typing import Iterator, List

from opentrons_hardware.hardware_control.motion_planning import move_manager
from opentrons_hardware.hardware_control.motion_planning.types import (
    AxisConstraints,
    Coordinates,
    MoveTarget,
    SystemConstraints,
    vectorize,
)

SIXAXES = ["X", "Y", "Z", "A", "B", "C"]


@st.composite
def generate_axis_constraint(draw: st.DrawFn) -> AxisConstraints:
    """Create axis constraint using Hypothesis."""
    acc = draw(st.integers(min_value=500, max_value=5000))
    speed_dist = draw(st.integers(min_value=10, max_value=50))
    dir_change_dist = draw(st.integers(min_value=5, max_value=10))
    assume(speed_dist > dir_change_dist)
    return AxisConstraints.build(
        max_acceleration=acc,
        max_speed_discont=speed_dist,
        max_direction_change_speed_discont=dir_change_dist,
        max_speed=500,
    )


@st.composite
def generate_coordinates(draw: st.DrawFn) -> Coordinates[str, np.float64]:
    """Create coordinates using Hypothesis."""
    coord = [
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=500)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=490)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=300)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=300)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=300)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=300)),
    ]
    formatted: Iterator[np.float64] = (np.float64(i) for i in coord)
    return dict(zip(SIXAXES, formatted))


@st.composite
def generate_close_coordinates(
    draw: st.DrawFn, prev_coord: Coordinates[str, np.float64]
) -> Coordinates[str, np.float64]:
    """Create coordinates using Hypothesis."""
    diff: List[np.typing.NDArray[np.float64]] = [
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0.1, max_value=1.0)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0.1, max_value=1.0)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0.1, max_value=1.0)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0.1, max_value=1.0)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0.1, max_value=1.0)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0.1, max_value=1.0)),
    ]
    coord: np.typing.NDArray[np.float64] = vectorize(prev_coord) + diff
    return dict(zip(SIXAXES, (np.float64(i) for i in coord)))


def reject_close_coordinates(
    a: Coordinates[str, np.float64], b: Coordinates[str, np.float64]
) -> bool:
    """Reject example if the coordinates are too close.

    Consecutive coordinates must be at least 1mm apart in one of the axes.
    """
    return not np.any(np.isclose(vectorize(b), vectorize(a), atol=1.0))


@st.composite
def generate_target_list(
    draw: st.DrawFn,
    elements: st.SearchStrategy[Coordinates[str, np.float64]] = generate_coordinates(),
) -> List[MoveTarget[str]]:
    """Generate a list of MoveTarget using Hypothesis."""
    target_num = draw(st.integers(min_value=1, max_value=10))
    target_list: List[MoveTarget[str]] = []
    while len(target_list) < target_num:
        position = draw(elements)
        if len(target_list):
            assume(reject_close_coordinates(position, target_list[-1].position))
        target = MoveTarget.build(
            position, np.float64(draw(st.floats(min_value=10, max_value=500)))
        )
        target_list.append(target)
    return target_list


@st.composite
def generate_close_target_list(
    draw: st.DrawFn, origin: Coordinates[str, np.float64]
) -> List[MoveTarget[str]]:
    """Generate a list of MoveTarget using Hypothesis."""
    target_num = draw(st.integers(min_value=1, max_value=10))
    target_list: List[MoveTarget[str]] = []
    prev_coord = origin
    while len(target_list) < target_num:
        position = draw(generate_close_coordinates(prev_coord))
        target = MoveTarget.build(
            position, np.float64(draw(st.floats(min_value=0.1, max_value=10.0)))
        )
        target_list.append(target)
        prev_coord = position
    return target_list


@given(
    x_constraint=generate_axis_constraint(),
    y_constraint=generate_axis_constraint(),
    z_constraint=generate_axis_constraint(),
    a_constraint=generate_axis_constraint(),
    b_constraint=generate_axis_constraint(),
    c_constraint=generate_axis_constraint(),
    origin=generate_coordinates(),
    targets=generate_target_list(),
)
def test_move_plan(
    x_constraint: AxisConstraints,
    y_constraint: AxisConstraints,
    z_constraint: AxisConstraints,
    a_constraint: AxisConstraints,
    b_constraint: AxisConstraints,
    c_constraint: AxisConstraints,
    origin: Coordinates[str, np.float64],
    targets: List[MoveTarget[str]],
) -> None:
    """Test motion plan using Hypothesis."""
    assume(reject_close_coordinates(origin, targets[0].position))
    constraints: SystemConstraints[str] = {
        "X": x_constraint,
        "Y": y_constraint,
        "Z": z_constraint,
        "A": a_constraint,
        "B": b_constraint,
        "C": c_constraint,
    }
    manager = move_manager.MoveManager(constraints=constraints)
    converged, blend_log = manager.plan_motion(
        origin=origin,
        target_list=targets,
        iteration_limit=20,
    )

    assert converged


@given(
    x_constraint=generate_axis_constraint(),
    y_constraint=generate_axis_constraint(),
    z_constraint=generate_axis_constraint(),
    a_constraint=generate_axis_constraint(),
    b_constraint=generate_axis_constraint(),
    c_constraint=generate_axis_constraint(),
    origin=generate_coordinates(),
    data=st.data(),
)
def test_close_move_plan(
    x_constraint: AxisConstraints,
    y_constraint: AxisConstraints,
    z_constraint: AxisConstraints,
    a_constraint: AxisConstraints,
    b_constraint: AxisConstraints,
    c_constraint: AxisConstraints,
    origin: Coordinates[str, np.float64],
    data: st.DataObject,
) -> None:
    """Test motion plan using Hypothesis."""
    targets = data.draw(generate_close_target_list(origin))
    constraints: SystemConstraints[str] = {
        "X": x_constraint,
        "Y": y_constraint,
        "Z": z_constraint,
        "A": a_constraint,
        "B": b_constraint,
        "C": c_constraint,
    }
    manager = move_manager.MoveManager(constraints=constraints)
    converged, blend_log = manager.plan_motion(
        origin=origin,
        target_list=targets,
        iteration_limit=20,
    )

    assert converged
