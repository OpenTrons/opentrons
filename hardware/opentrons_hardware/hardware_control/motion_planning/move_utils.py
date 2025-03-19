"""Utils for motion planning."""
import numpy as np
import logging
from typing import Iterator, List, Tuple, Set, TYPE_CHECKING, cast

from opentrons_hardware.hardware_control.motion_planning.types import (
    Block,
    Coordinates,
    Move,
    MoveTarget,
    AxisConstraints,
    CoordinateValue,
    AxisKey,
    SystemConstraints,
    ZeroLengthMoveError,
    vectorize,
)

if TYPE_CHECKING:
    from numpy.typing import NDArray

log = logging.getLogger(__name__)


FLOAT_THRESHOLD = 0.001  # TODO: re-evaluate this value based on system limitations

MINIMUM_DISPLACEMENT = 0.05

# Minimum vector component of 0.1%
MINIMUM_VECTOR_COMPONENT = np.float64(0.001)


def apply_constraint(constraint: np.float64, input: np.float64) -> np.float64:
    """Keep the sign of the input but cap the numeric value at the constraint value."""
    return cast(np.float64, np.copysign(np.minimum(abs(constraint), abs(input)), input))


def check_less_or_close(constraint: np.float64, input: np.float64) -> bool:
    """Evaluate whether the input value equals to or less than the constraint."""
    return bool(abs(input) <= constraint or bool(np.isclose(input, constraint)))


def get_unit_vector(
    initial: Coordinates[AxisKey, CoordinateValue],
    target: Coordinates[AxisKey, CoordinateValue],
) -> Tuple[Coordinates[AxisKey, np.float64], np.float64]:
    """Get the unit vector and the distance the two coordinates."""
    initial_vectorized = vectorize({k: np.float64(v) for k, v in initial.items()})
    target_vectorized = vectorize({k: np.float64(v) for k, v in target.items()})
    displacement: "NDArray[np.float64]" = target_vectorized - initial_vectorized
    # minimum distance of 0.05mm
    for i in range(len(displacement)):
        if abs(displacement[i]) < MINIMUM_DISPLACEMENT:
            displacement[i] = 0
    distance = np.linalg.norm(displacement)
    if not distance or np.array_equal(initial_vectorized, target_vectorized):
        raise ZeroLengthMoveError(initial, target)
    unit_vector_ndarray = displacement / distance
    unit_vector = {k: v for k, v in zip(initial.keys(), unit_vector_ndarray)}
    return unit_vector, distance


def split_unit_vector(
    initial_vector: Coordinates[AxisKey, np.float64],
    initial_distance: np.float64,
    to_remove: AxisKey,
) -> Tuple[
    Tuple[Coordinates[AxisKey, np.float64], np.float64],
    Tuple[Coordinates[AxisKey, np.float64], np.float64],
]:
    """Split a unit vector into two sequential vectors.

    Exactly one axis should be specified to be removed. This function will return a tuple
    of two vectors: the first will only contain the axis requested for removal, and the
    second will contain the rest of the movement.
    """
    origin = {ax: np.float64(0) for ax in initial_vector.keys()}

    displacement_first = origin.copy()

    displacement_second = {
        ax: val * initial_distance for ax, val in initial_vector.items()
    }
    displacement_first[to_remove] = displacement_second[to_remove]
    displacement_second[to_remove] = np.float64(0)

    return (
        get_unit_vector(origin, displacement_first),
        get_unit_vector(origin, displacement_second),
    )


def de_diagonalize_unit_vector(
    initial_vector: Coordinates[AxisKey, np.float64],
    initial_distance: np.float64,
    min_unit_vector: np.float64,
) -> List[Tuple[Coordinates[AxisKey, np.float64], np.float64]]:
    """Split a unit vector into consecutive movements if any component is too small.

    If the component of the unit vector for certain movement axis is extremely
    small, the resulting speed for that axis may be low enough to cause erroneous
    stepping behavior on that motor. To deal with this, we "de-diagonalize" those
    movements by splitting the very small part of the movement into its own
    dedicated movement.

    For example, if a movement goes 100mm in X but 0.1mm in Y, we split it into
    two separate movements that will run in sequence.

    Returns a list of resultant unit vectors once the original vector was (maybe) split.
    """
    vectors: List[Tuple[Coordinates[AxisKey, np.float64], np.float64]] = [
        (initial_vector, initial_distance)
    ]
    while True:
        vector, distance = vectors[-1]
        # Check for any component under the min
        to_split = [
            ax
            for ax in vector.keys()
            if vector[ax] != np.float64(0) and abs(vector[ax]) < min_unit_vector
        ]
        if len(to_split) == 0:
            # Everything is good and we can return the list as-is.
            return vectors
        # We need to split this vector into multiple sequential vectors
        vectors.pop()
        for ax in to_split:
            first, second = split_unit_vector(vector, distance, ax)
            vectors.append(first)
            vector, distance = second
        # Always put the larger vector in LAST so, when we re-check, we are looking
        # at the movement that may have more than one axis.
        vectors.append((vector, distance))


def limit_max_speed(
    unit_vector: Coordinates[AxisKey, np.float64],
    max_linear_speed: np.float64,
    constraints: SystemConstraints[AxisKey],
) -> np.float64:
    """Limit a linear speed to fall inside the max speed of any component.

    The most-limiting max speed is a combination of the smallest-value max
    speed for an axis and the value of that axis' unit vector component.
    """
    requested_axis_speeds = unit_vector_multiplication(unit_vector, max_linear_speed)
    scale = np.float64(1)
    for axis, speed in requested_axis_speeds.items():
        if speed == 0.0:
            continue
        abs_speed = np.abs(speed)
        axis_speed = constraints[axis].max_speed
        axis_ratio = axis_speed / abs_speed
        if axis_ratio < scale:
            log.info(
                f"speed {max_linear_speed} decreased by {axis_ratio} because {axis} speed limit is {axis_speed}"
            )
            scale = axis_ratio
    return max_linear_speed * scale


def _unit_vector_to_move(
    unit_vector: Coordinates[AxisKey, np.float64],
    distance: np.float64,
    max_speed: np.float64,
    constraints: SystemConstraints[AxisKey],
) -> Move[AxisKey]:
    speed = limit_max_speed(unit_vector, max_speed, constraints)
    third_distance = np.float64(distance / 3)
    return Move(
        unit_vector=unit_vector,
        distance=distance,
        max_speed=speed,
        blocks=(
            Block(
                distance=third_distance,
                initial_speed=speed,
                acceleration=np.float64(0),
            ),
            Block(
                distance=third_distance,
                initial_speed=speed,
                acceleration=np.float64(0),
            ),
            Block(
                distance=third_distance,
                initial_speed=speed,
                acceleration=np.float64(0),
            ),
        ),
    )


def targets_to_moves(
    initial: Coordinates[AxisKey, CoordinateValue],
    targets: List[MoveTarget[AxisKey]],
    constraints: SystemConstraints[AxisKey],
) -> Iterator[Move[AxisKey]]:
    """Transform a list of MoveTargets into a list of Moves."""
    all_axes: Set[AxisKey] = set()
    for target in targets:
        all_axes.update(set(target.position.keys()))

    initial_checked = {k: np.float64(initial.get(k, 0)) for k in all_axes}
    for target in targets:
        position = {k: np.float64(target.position.get(k, 0)) for k in all_axes}
        initial_unit_vector, initial_distance = get_unit_vector(
            initial_checked, position
        )
        de_diagonalized_vectors = de_diagonalize_unit_vector(
            initial_unit_vector, initial_distance, MINIMUM_VECTOR_COMPONENT
        )
        for unit_vector, distance in de_diagonalized_vectors:
            m = _unit_vector_to_move(
                unit_vector, distance, target.max_speed, constraints
            )
            log.debug(f"Built move from {initial} to {target} as {m}")
            yield m
        initial_checked = position


def initial_speed_limit_from_axis(
    axis_constraints: AxisConstraints,
    axis_component: np.float64,
    prev_component: np.float64,
    prev_final_speed: np.float64,
) -> np.float64:
    """Compute the initial move speed limit for an axis."""
    log = logging.getLogger("initial_speed_limit_from_axis")
    if not prev_component or prev_final_speed == 0:
        # If we're previously stopped, we can use maximum speed
        # discontinuity to start
        log.debug("started from 0, using max speed dc")
        return abs(axis_constraints.max_speed_discont / axis_component)

    if prev_component * axis_component > 0:
        # If we're moving the same direction as the previous move we have a
        # chance to remain going nice and fast. We should try and start at
        # its final speed, or - if its final speed is under the discontinuity speed
        prev_axis_final_speed = abs(prev_final_speed * prev_component)
        prev_axis_constrained_speed = np.maximum(
            prev_axis_final_speed, axis_constraints.max_speed_discont
        )
        log.debug(
            f"starting from same-dir, using {prev_axis_constrained_speed} "
            f"from prev final {prev_axis_final_speed} and dc "
            f"{axis_constraints.max_speed_discont}"
        )
        return abs(prev_axis_constrained_speed / axis_component)

    if prev_component * axis_component < 0:
        # If we are changing directions, we should start at our direction-change
        # discontinuity speed
        log.debug("changed direction, using change discont")
        return abs(axis_constraints.max_direction_change_speed_discont / axis_component)
    else:
        assert False, "planning initial speed failed"


def find_initial_speed(
    constraints: SystemConstraints[AxisKey],
    move: Move[AxisKey],
    prev_move: Move[AxisKey],
) -> np.float64:
    """Get a move's initial speed."""
    log = logging.getLogger("find_initial_speed")
    # Figure out how fast we can be going when we start
    initial_speed = move.initial_speed
    for axis in move.unit_vector.keys():
        axis_component = move.unit_vector[axis]

        if abs(axis_component * initial_speed) < FLOAT_THRESHOLD:
            log.debug(f"Skip {axis} because it is not moving")
            continue
        else:
            axis_constraints = constraints[axis]
            prev_component = (
                prev_move.unit_vector[axis]
                if prev_move.distance > FLOAT_THRESHOLD
                else np.float64(0)
            )
            prev_final_speed = prev_move.final_speed
            log.debug(f"Find initial speed for {axis}")
            # find speed limit per axis
            axis_constrained_speed = initial_speed_limit_from_axis(
                axis_constraints, axis_component, prev_component, prev_final_speed
            )

        log.debug(
            f"Axis_constrained_speed for {axis} is {axis_constrained_speed} compared "
            f"to initial speed: {initial_speed}"
        )
        initial_speed = np.minimum(axis_constrained_speed, initial_speed)

    log.info(f"Initial speed: {initial_speed}")
    return initial_speed


def final_speed_limit_from_axis(
    axis_constraints: AxisConstraints,
    axis_component: np.float64,
    next_component: np.float64,
    next_initial_speed: np.float64,
) -> np.float64:
    """Compute the final speed limit for an axis."""
    log = logging.getLogger("final_speed_limit_from_axis")
    if not next_component or next_initial_speed == 0:
        # if we're stopping, we can stop from our speed discontinuity
        log.debug("stopping, using max speed dc")
        return abs(axis_constraints.max_speed_discont / axis_component)

    elif next_component * axis_component > 0:
        # If we're continuing in the same direction, then we should try to go as
        # fast as we can. The subsequent move is going to try to make its initial
        # speed match ours if possible, so we should use the larger of its initial
        # speed or the discontinuity
        next_axis_initial_speed = abs(next_initial_speed * next_component)
        next_axis_constrained_speed = np.maximum(
            axis_constraints.max_speed_discont, next_axis_initial_speed
        )
        log.debug(
            f"same dir, using {next_axis_constrained_speed} "
            f"from next initial {next_axis_initial_speed} and dc "
            f"{axis_constraints.max_speed_discont}"
        )
        return abs(next_axis_constrained_speed / axis_component)

    elif next_component * axis_component < 0:
        # if we're changing direction, then we should prepare ourselves
        log.debug("changed direction")
        return abs(axis_constraints.max_direction_change_speed_discont / axis_component)
    else:
        assert False, "planning final speed failed"


def find_final_speed(
    constraints: SystemConstraints[AxisKey],
    move: Move[AxisKey],
    next_move: Move[AxisKey],
) -> np.float64:
    """Get a move's final speed."""
    log = logging.getLogger("find_final_speed")
    # Figure out how fast we can be going when we stop
    final_speed: np.float64 = move.final_speed

    for axis in move.unit_vector.keys():
        axis_component = move.unit_vector[axis]
        if abs(axis_component * final_speed) < FLOAT_THRESHOLD:
            log.debug(f"Skip {axis} because it is not moving")
            continue
        else:
            log.debug(f"Find final speed for {axis}")
            axis_constraints = constraints[axis]
            next_component = (
                next_move.unit_vector[axis]
                if next_move.distance > FLOAT_THRESHOLD
                else np.float64(0)
            )
            next_initial_speed = next_move.initial_speed
            axis_speed_limit = final_speed_limit_from_axis(
                axis_constraints, axis_component, next_component, next_initial_speed
            )
        log.debug(
            f"Axis constrained speed for {axis} is {axis_speed_limit} compared "
            f"to final speed: {final_speed}"
        )
        final_speed = np.minimum(axis_speed_limit, final_speed)

    log.info(f"Final speed: {final_speed}")
    return final_speed


def achievable_final(
    constraints: SystemConstraints[AxisKey],
    move: Move[AxisKey],
    initial_speed: np.float64,
    final_speed: np.float64,
) -> np.float64:
    """Make sure the calculated final speed is achievable."""
    log = logging.getLogger("achievable_final")
    # Figure out whether this final speed is in fact achievable from the initial speed
    # in the distance allowed
    for axis in move.unit_vector.keys():
        axis_component = move.unit_vector[axis]
        if axis_component:
            axis_max_acc = constraints[axis].max_acceleration
            # using the equation v_f^2  = v_i^2 + 2as
            max_axis_final_velocity_sq = (
                initial_speed * axis_component
            ) ** 2 + 2 * axis_max_acc * move.distance
            # max_axis_final_velocity_sq = 2 * axis_max_acc * move.distance
            max_axis_final_velocity = (
                np.copysign(
                    np.sqrt(max_axis_final_velocity_sq) / axis_component,
                    final_speed - initial_speed,
                )
                + initial_speed
            )
            log.debug(
                f"Max axis final velocity for {axis} is {max_axis_final_velocity}, "
                f"compared to final speed: {final_speed}"
            )
            # take the smaller of the aboslute value
            final_speed = apply_constraint(max_axis_final_velocity, final_speed)

    log.info(f"final: {final_speed}")
    return final_speed


def build_blocks(
    unit_vector: Coordinates[AxisKey, np.float64],
    initial_speed: np.float64,
    final_speed: np.float64,
    distance: np.float64,
    max_speed: np.float64,
    constraints: SystemConstraints[AxisKey],
) -> Tuple[Block, Block, Block]:
    """Build blocks for a move.

    Build the blocks of a move that will be the fastest way to execute a move of
    specified displacement if we
    - never exceed our maximum speed
    - have at most one constant acceleration phase from our initial speed
    - have at most one constant deceleration phase to meet our final speed
    - have at most one 0 acceleration coast phase at our max speed
    """
    log = logging.getLogger("build_blocks")
    assert abs(initial_speed) <= abs(max_speed) or np.isclose(
        abs(initial_speed), max_speed
    ), f"initial speed {initial_speed} exceeds max speed {max_speed}"
    assert abs(final_speed) <= abs(max_speed) or np.isclose(
        abs(final_speed), max_speed
    ), f"final speed {final_speed} exceeds max speed {max_speed}"

    max_acc: np.typing.NDArray[np.float64] = np.array(
        [
            constraints[axis].max_acceleration if unit_vector[axis] else 0.0
            for axis in unit_vector.keys()
        ]
    )
    max_acc_magnitude = np.linalg.norm(max_acc)
    acc_v = max_acc_magnitude * vectorize(unit_vector)

    for a_i, max_acc_i in zip(acc_v, max_acc):
        if abs(a_i) > max_acc_i:
            acc_v *= max_acc_i / a_i
    max_acceleration = np.linalg.norm(acc_v)

    initial_speed_sq = initial_speed**2
    final_speed_sq = final_speed**2

    max_achievable_speed = np.sqrt(
        0.5 * (2 * max_acceleration * distance + initial_speed_sq + final_speed_sq)
    )
    max_speed = np.minimum(max_achievable_speed, max_speed)
    max_speed_sq = max_speed**2

    log.debug(
        f"{initial_speed} mm/s to {final_speed} mm/s in {distance} mm "
        f"with {max_acceleration} mm/s2 max a "
        f"gives {max_achievable_speed} mm/s limited to {max_speed} mm/s"
    )

    first = Block(
        initial_speed=initial_speed,
        acceleration=max_acceleration,
        distance=abs(max_speed_sq - initial_speed_sq) / (2 * max_acceleration),
    )

    final = Block(
        initial_speed=first.final_speed,
        acceleration=-max_acceleration,
        distance=abs(max_speed_sq - final_speed_sq) / (2 * max_acceleration),
    )
    # the FLOAT_THRESHOLD here catches a numerical instability case where
    # first.initial_speed and final.final_speed are almost exactly equal,
    # and acceleration is low enough that this is a triangle move. in this
    # case, sometimes numerical instability could cause the inequality
    # to pass, and the code below subtracts the initial and final, and
    # would come up with 0. Adding the threshold fixes the issue.
    if first.distance + final.distance > (distance + FLOAT_THRESHOLD):
        # the math did not quite work out and we need to trim down our top speed.
        # This will be a suboptimal solution almost certainly, but it's better to
        # have a suboptimal solution that doesn't violate constraints than an
        # optimal one that does.
        # This happens when we have a triangle move (so, anticipating no coast phase)
        # where we slightly overaccelerate and end up moving too far, when the
        # ratio between the acceleration and deceleration phases is quite imbalanced.
        # We can always fall back to having our target maximum speed be the larger
        # of the final and initial speeds.
        max_speed_sq = np.maximum(initial_speed_sq, final_speed_sq)
        first.distance = np.abs(max_speed_sq - initial_speed_sq) / (
            2 * max_acceleration
        )
        final.initial_speed = first.final_speed
        final.distance = np.abs(max_speed_sq - final_speed_sq) / (2 * max_acceleration)

    if first.distance + final.distance < (distance - FLOAT_THRESHOLD):
        # we'll have a coast phase!
        coast = Block(
            initial_speed=final.initial_speed,
            acceleration=np.float64(0),
            distance=distance - first.distance - final.distance,
        )
        return first, coast, final
    else:
        # no coast phase for us
        return first, Block(np.float64(0), np.float64(0), np.float64(0)), final


def build_move(
    move: Move[AxisKey],
    prev_move: Move[AxisKey],
    next_move: Move[AxisKey],
    constraints: SystemConstraints[AxisKey],
) -> Move[AxisKey]:
    """Build a move."""
    log = logging.getLogger("build_move")

    # TODO: We need to limit the initial speed and the final speed based on the directions
    # of this and the bounding moves - if the directions are not the same, and I mean exact
    # unit vector equivalence, we need to limit the junction speed to the max speed discontinuity
    # because we can only instantly change speed below that value.
    initial_speed = find_initial_speed(constraints, move, prev_move)
    final_speed = find_final_speed(constraints, move, next_move)
    final_speed = achievable_final(constraints, move, initial_speed, final_speed)

    m = Move(
        unit_vector=move.unit_vector,
        distance=move.distance,
        max_speed=move.max_speed,
        blocks=build_blocks(
            move.unit_vector,
            initial_speed,
            final_speed,
            move.distance,
            move.max_speed,
            constraints,
        ),
    )
    log.debug(f"applied constraints to {move} generating {m}")
    return m


def blended(
    constraints: SystemConstraints[AxisKey], first: Move[AxisKey], second: Move[AxisKey]
) -> bool:
    """Check if the moves are blended."""
    log = logging.getLogger("blended")
    # have these actually had their blocks built?
    first_dist_sum = sum(b.distance for b in first.blocks)
    if (np.abs(first_dist_sum - first.distance) > FLOAT_THRESHOLD) or not np.isclose(
        first_dist_sum, first.distance
    ):
        log.debug(
            f"Sum of distance for first move blocks {first_dist_sum} does not match "
            f"{first.distance}"
        )
        return False
    second_dist_sum = sum(b.distance for b in second.blocks)
    if np.abs(second_dist_sum - second.distance) > FLOAT_THRESHOLD or not np.isclose(
        second_dist_sum, second.distance
    ):
        log.debug(
            f"Sum of distance for second move blocks {second_dist_sum} does not match "
            f"{second.distance}"
        )
        return False

    # do their junction velocities match constraints?
    for axis in first.unit_vector.keys():
        final_speed = first.blocks[-1].final_speed * first.unit_vector[axis]
        log.debug(f"{axis} final_speed: {final_speed}")
        initial_speed = second.blocks[0].initial_speed * second.unit_vector[axis]
        log.debug(f"{axis} initial_speed: {initial_speed}")
        if first.unit_vector[axis] * second.unit_vector[axis] > 0:
            # if they're in the same direction, we can check that either the junction
            # speeds exactly match, or that they're both under the discontinuity limit
            discont_limit = constraints[axis].max_speed_discont
            if not (np.abs(initial_speed - final_speed) < FLOAT_THRESHOLD):
                if not (
                    check_less_or_close(discont_limit, final_speed)
                    or check_less_or_close(discont_limit, initial_speed)
                ):
                    log.debug(
                        f"Final speed: {final_speed}, initial speed: {initial_speed}, "
                        f"discont: {discont_limit}"
                    )
                    return False
        else:
            # if they're in different directions, then the junction has to be at or
            # under the speed change discontinuity
            discont_limit = constraints[axis].max_direction_change_speed_discont
            if not (
                check_less_or_close(discont_limit, final_speed)
                or check_less_or_close(discont_limit, initial_speed)
            ):
                log.debug(
                    f"Final speed: {final_speed}, initial speed: {initial_speed}, "
                    f"discont: {discont_limit}"
                )
                return False
    log.info("Successfully blended.")
    return True


def all_blended(
    constraints: SystemConstraints[AxisKey], moves: List[Move[AxisKey]]
) -> bool:
    """Check if the moves in the list are all blended."""
    moveiter = iter(moves)
    prev = next(moveiter)
    while True:
        try:
            current = next(moveiter)
            if not blended(constraints, prev, current):
                return False
            prev = current
        except StopIteration:
            return True


def unit_vector_multiplication(
    unit_vector: Coordinates[AxisKey, np.float64], value: np.float64
) -> Coordinates[AxisKey, np.float64]:
    """Multiply coordinates type by a float value."""
    targets: "NDArray[np.float64]" = vectorize(unit_vector) * value
    return {k: v for k, v in zip(unit_vector.keys(), targets)}
