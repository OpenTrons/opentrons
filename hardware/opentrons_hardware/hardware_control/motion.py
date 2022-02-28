"""A collection of motions that define a single move."""
from typing import List, Dict, Iterable
from dataclasses import dataclass
import numpy as np  # type: ignore[import]
from logging import getLogger

from opentrons_hardware.firmware_bindings.constants import NodeId

LOG = getLogger(__name__)


NodeIdMotionValues = Dict[NodeId, np.float64]


@dataclass(frozen=True)
class MoveGroupSingleAxisStep:
    """A single move in a move group."""

    distance_mm: float
    velocity_mm_sec: float
    duration_sec: float
    acceleration_mm_sec_sq: float = 0


MoveGroupStep = Dict[
    NodeId,
    MoveGroupSingleAxisStep,
]

MoveGroup = List[MoveGroupStep]

MoveGroups = List[MoveGroup]

MAX_SPEEDS = {
    NodeId.gantry_x: 50,
    NodeId.gantry_y: 50,
    NodeId.head_l: 50,
    NodeId.head_r: 50,
    NodeId.pipette_left: 2,
    NodeId.pipette_right: 2,
}


def create_step(
    distance: Dict[NodeId, np.float64],
    velocity: Dict[NodeId, np.float64],
    acceleration: Dict[NodeId, np.float64],
    duration: np.float64,
    present_nodes: Iterable[NodeId],
) -> MoveGroupStep:
    """Create a move from a block.

    Args:
        origin: Start position.
        target: Target position.
        speed: the speed

    Returns:
        A Move
    """
    ordered_nodes = sorted(present_nodes, key=lambda node: node.value)
    step: MoveGroupStep = {}
    for axis_node in ordered_nodes:
        step[axis_node] = MoveGroupSingleAxisStep(
            distance_mm=distance.get(axis_node, 0),
            acceleration_mm_sec_sq=acceleration.get(axis_node, 0),
            velocity_mm_sec=velocity.get(axis_node, 0),
            duration_sec=duration,
        )
    return step
