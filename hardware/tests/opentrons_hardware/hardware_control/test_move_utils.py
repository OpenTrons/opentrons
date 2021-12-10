"""Tests for move util functions."""
import pytest

from opentrons_hardware.hardware_control.motion_planning.move_utils import (
    get_unit_vector,
    find_initial_speed,
    find_final_speed,
    targets_to_moves,
    create_dummy_move,
)
from opentrons_hardware.hardware_control.motion_planning.types import *


CONSTRAINTS: SystemConstraints = {
    Axis.X: AxisConstraints(
        max_acceleration=10,
        max_speed_discont=15,
        max_direction_change_speed_discont=500,
    ),
    Axis.Y: AxisConstraints(
        max_acceleration=10,
        max_speed_discont=15,
        max_direction_change_speed_discont=500,
    ),
    Axis.Z: AxisConstraints(
        max_acceleration=100,
        max_speed_discont=100,
        max_direction_change_speed_discont=500,
    ),
    Axis.A: AxisConstraints(
        max_acceleration=100,
        max_speed_discont=100,
        max_direction_change_speed_discont=500,
    ),
}


SIMPLE_FORWARD_MOVE = Move(
    unit_vector=Coordinates(1, 0, 0, 0),
    distance=1,
    max_speed=1,
    blocks=(
        Block(distance=10, initial_speed=1, acceleration=0),
        Block(distance=10, initial_speed=1, acceleration=0),
        Block(distance=10, initial_speed=1, acceleration=0),
    ),
)

SIMPLE_BACKWARD_MOVE = Move(
    unit_vector=Coordinates(-1, 0, 0, 0),
    distance=1,
    max_speed=1,
    blocks=(
        Block(distance=10, initial_speed=1, acceleration=0),
        Block(distance=10, initial_speed=1, acceleration=0),
        Block(distance=10, initial_speed=1, acceleration=0),
    ),
)


def test_convert_targets_to_moves() -> None:
    targets = [
        MoveTarget(Coordinates(10, 0, 0, 0), 1),
        MoveTarget(Coordinates(10, 20, 0, 0), 2),
        MoveTarget(Coordinates(10, 20, 151, 0), 3),
        MoveTarget(Coordinates(10, 20, 151, 1255), 4),
    ]

    expected = [
        Move(
            unit_vector=Coordinates(1.0, 0.0, 0.0, 0.0),
            distance=10.0,
            max_speed=1,
            blocks=(
                Block(distance=0, initial_speed=1, acceleration=0),
                Block(distance=0, initial_speed=1, acceleration=0),
                Block(distance=0, initial_speed=1, acceleration=0),
            ),
        ),
        Move(
            unit_vector=Coordinates(0.0, 1.0, 0.0, 0.0),
            distance=20.0,
            max_speed=2,
            blocks=(
                Block(distance=0, initial_speed=2, acceleration=0),
                Block(distance=0, initial_speed=2, acceleration=0),
                Block(distance=0, initial_speed=2, acceleration=0),
            ),
        ),
        Move(
            unit_vector=Coordinates(0.0, 0.0, 1.0, 0.0),
            distance=151.0,
            max_speed=3,
            blocks=(
                Block(distance=0, initial_speed=3, acceleration=0),
                Block(distance=0, initial_speed=3, acceleration=0),
                Block(distance=0, initial_speed=3, acceleration=0),
            ),
        ),
        Move(
            unit_vector=Coordinates(0.0, 0.0, 0.0, 1.0),
            distance=1255.0,
            max_speed=4,
            blocks=(
                Block(distance=0, initial_speed=4, acceleration=0),
                Block(distance=0, initial_speed=4, acceleration=0),
                Block(distance=0, initial_speed=4, acceleration=0),
            ),
        ),
    ]

    assert list(targets_to_moves(Coordinates(0, 0, 0, 0), targets)) == expected


@pytest.mark.parametrize(
    argnames=["origin", "unit_vector", "max_speed", "expected"],
    argvalues=[
        ## previous move is not moving, use the smaller value of move max speed and axis max speed discont
        [None, [1, 0, 0, 0], 5, 5],
        [None, [1, 0, 0, 0], 200, CONSTRAINTS[Axis.X].max_speed_discont],
        ## previous move is moving in same direction as current move, use the smaller value of move max speed and axis max speed discont
        [SIMPLE_FORWARD_MOVE, [1, 0, 0, 0], 5, 5],
        [SIMPLE_FORWARD_MOVE, [1, 0, 0, 0], 200, CONSTRAINTS[Axis.X].max_speed_discont],
        ## previous move is moving in opposite direction, use the smaller value of move max speed and axis max dir change speed discont
        [
            SIMPLE_FORWARD_MOVE,
            [-1, 0, 0, 0],
            600,
            CONSTRAINTS[Axis.X].max_direction_change_speed_discont,
        ],
        [SIMPLE_BACKWARD_MOVE, [1, 0, 0, 0], 455, 455],
    ],
)
def test_initial_speed(
    origin: Move, unit_vector: Coordinates, max_speed: float, expected: float
) -> None:
    move = Move(
        unit_vector=Coordinates(*unit_vector),
        distance=100,
        max_speed=max_speed,
        blocks=(
            Block(distance=0, initial_speed=0, acceleration=0),
            Block(distance=0, initial_speed=0, acceleration=0),
            Block(distance=0, initial_speed=0, acceleration=0),
        ),
    )
    assert find_initial_speed(CONSTRAINTS, move, origin) == expected


@pytest.mark.parametrize(
    argnames=["next_move", "unit_vector", "max_speed", "expected"],
    argvalues=[
        ## next move is not moving, use the smaller value of move max speed and axis max speed discont
        [None, [1, 0, 0, 0], 5, 5],
        [None, [1, 0, 0, 0], 200, CONSTRAINTS[Axis.X].max_speed_discont],
        ## next move is moving in same direction as current move, use the smaller value of move max speed and axis max speed discont
        [SIMPLE_FORWARD_MOVE, [1, 0, 0, 0], 5, 5],
        [SIMPLE_FORWARD_MOVE, [1, 0, 0, 0], 200, CONSTRAINTS[Axis.X].max_speed_discont],
        ## next move is moving in opposite direction, use the smaller value of move max speed and axis max dir change speed discont
        [
            SIMPLE_FORWARD_MOVE,
            [-1, 0, 0, 0],
            600,
            CONSTRAINTS[Axis.X].max_direction_change_speed_discont,
        ],
        [SIMPLE_BACKWARD_MOVE, [1, 0, 0, 0], 455, 455],
    ],
)
def test_final_speed(
    next_move: Move, unit_vector: Coordinates, max_speed: float, expected: float
) -> None:
    move = Move(
        unit_vector=Coordinates(*unit_vector),
        distance=100,
        max_speed=max_speed,
        blocks=(
            Block(distance=0, initial_speed=0, acceleration=0),
            Block(distance=0, initial_speed=0, acceleration=0),
            Block(distance=0, initial_speed=0, acceleration=0),
        ),
    )
    assert find_final_speed(CONSTRAINTS, move, next_move) == expected
