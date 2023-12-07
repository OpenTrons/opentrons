"""Class that executes moves on the CAN bus."""
import asyncio
from collections import defaultdict
import logging
from typing import List, Set, Tuple, Iterator, Union, Optional
import numpy as np
import time

from opentrons_shared_data.errors.exceptions import (
    GeneralError,
    MoveConditionNotMetError,
    EnumeratedError,
    EStopActivatedError,
    MotionFailedError,
    PythonException,
)

from opentrons_hardware.firmware_bindings import ArbitrationId
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    ErrorCode,
    ErrorSeverity,
    GearMotorId,
    MoveAckId,
)
from opentrons_hardware.drivers.can_bus.can_messenger import CanMessenger
from opentrons_hardware.firmware_bindings.messages import MessageDefinition
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    ClearAllMoveGroupsRequest,
    AddLinearMoveRequest,
    MoveCompleted,
    ExecuteMoveGroupRequest,
    HomeRequest,
    GripperGripRequest,
    GripperHomeRequest,
    AddBrushedLinearMoveRequest,
    TipActionRequest,
    TipActionResponse,
    ErrorMessage,
    StopRequest,
)
from opentrons_hardware.firmware_bindings.messages.payloads import (
    AddLinearMoveRequestPayload,
    ExecuteMoveGroupRequestPayload,
    HomeRequestPayload,
    GripperMoveRequestPayload,
    TipActionRequestPayload,
    EmptyPayload,
)
from opentrons_hardware.hardware_control.constants import (
    interrupts_per_sec,
    tip_interrupts_per_sec,
    brushed_motor_interrupts_per_sec,
)
from opentrons_hardware.errors import raise_from_error_message
from opentrons_hardware.hardware_control.motion import (
    MoveGroups,
    MoveGroupSingleAxisStep,
    MoveGroupSingleGripperStep,
    MoveGroupTipActionStep,
    MoveType,
    SingleMoveStep,
)
from opentrons_hardware.firmware_bindings.utils import (
    UInt8Field,
    UInt32Field,
    Int32Field,
)
from opentrons_hardware.firmware_bindings.messages.fields import (
    PipetteTipActionTypeField,
    MoveStopConditionField,
)
from opentrons_hardware.hardware_control.motion import MoveStopCondition
from opentrons_hardware.hardware_control.motor_position_status import (
    extract_motor_status_info,
)

from ..types import NodeDict, MotorPositionStatus
from .dispatcher import MoveDispatcher

log = logging.getLogger(__name__)

_AcceptableMoves = Union[MoveCompleted, TipActionResponse]
CompletionPacket = Tuple[ArbitrationId, _AcceptableMoves]
Completions = List[CompletionPacket]


log = logging.getLogger(__name__)


class MoveGroupRunner:
    """A Move command runner."""
    def __init__(
        self,
        move_groups: MoveGroups,
        start_index: int = 0,
        ignore_stalls: bool = False,
    ) -> None:
        self._scheduler = MoveDispatcher(move_groups, start_index, ignore_stalls)
        self._is_prepped: bool = False

    @staticmethod
    def _has_moves(move_groups: MoveGroups) -> bool:
        for move_group in move_groups:
            for move in move_group:
                for node, step in move.items():
                    return True
        return False

    async def prep(self, can_messenger: CanMessenger) -> None:
        """Prepare the move group. The first thing that happens during run().

        prep() and execute() can be used to replace a single call to run() to
        ensure tighter timing, if you want something else to start as soon as
        possible to the actual execution of the move.
        """
        if not self._scheduler.has_moves():
            log.debug("No moves. Nothing to do.")
            return
        await self._clear_groups(can_messenger)
        await self._send_groups(can_messenger)
        self._is_prepped = True

    async def execute(
        self, can_messenger: CanMessenger
    ) -> NodeDict[MotorPositionStatus]:
        """Execute a pre-prepared move group. The second thing that run() does.

        prep() and execute() can be used to replace a single call to run() to
        ensure tighter timing, if you want something else to start as soon as
        possible to the actual execution of the move.
        """
        if not self._scheduler.has_moves():
            log.debug("No moves. Nothing to do.")
            return {}
        if not self._is_prepped:
            raise GeneralError(
                message="A move group must be prepped before it can be executed."
            )
        move_completion_data = await self._move(can_messenger, self._start_at_index)
        return self._accumulate_move_completions(move_completion_data)

    async def run(self, can_messenger: CanMessenger) -> NodeDict[MotorPositionStatus]:
        """Run the move group.

        Args:
            can_messenger: a can messenger

        Returns:
            The current position after the move for all the axes that
            acknowledged completing moves.

        This function first prepares all connected devices to move (by sending
        all the data for the moves over) and then executes the move with a
        single call.

        prep() and execute() can be used to replace a single call to run() to
        ensure tighter timing, if you want something else to start as soon as
        possible to the actual execution of the move.
        """
        await self.prep(can_messenger)
        return await self.execute(can_messenger)

    @staticmethod
    def _accumulate_move_completions(
        completions: Completions,
    ) -> NodeDict[MotorPositionStatus]:
        position: NodeDict[
            List[Tuple[Tuple[int, int], MotorPositionStatus]]
        ] = defaultdict(list)
        gear_motor_position: NodeDict[
            List[Tuple[Tuple[int, int], MotorPositionStatus]]
        ] = defaultdict(list)
        for arbid, completion in completions:
            move_info = (
                (
                    completion.payload.group_id.value,
                    completion.payload.seq_id.value,
                ),
                extract_motor_status_info(completion),
            )
            if isinstance(completion, TipActionResponse):
                # if any completions are TipActionResponses, separate them from the 'positions'
                # dict so the left pipette's position doesn't get overwritten
                gear_motor_position[NodeId(arbid.parts.originating_node_id)].append(
                    move_info
                )
            else:
                position[NodeId(arbid.parts.originating_node_id)].append(move_info)
        # for each node, pull the position from the completion with the largest
        # combination of group id and sequence id
        if any(gear_motor_position):
            return {
                node: next(
                    reversed(
                        sorted(
                            poslist, key=lambda position_element: position_element[0]
                        )
                    )
                )[1]
                for node, poslist in gear_motor_position.items()
            }
        return {
            node: next(
                reversed(
                    sorted(poslist, key=lambda position_element: position_element[0])
                )
            )[1]
            for node, poslist in position.items()
        }

    async def _clear_groups(self, can_messenger: CanMessenger) -> None:
        """Send commands to clear the message groups.

        Args:
            can_messenger: a can messenger
        """
        error = await can_messenger.ensure_send(
            node_id=NodeId.broadcast,
            message=ClearAllMoveGroupsRequest(payload=EmptyPayload()),
            expected_nodes=list(self.all_nodes()),
        )
        if error != ErrorCode.ok:
            log.warning("Clear move group failed")

    def all_nodes(self) -> Set[NodeId]:
        """Get all of the nodes in the move group runner's move gruops."""
        node_set: Set[NodeId] = set()
        for group in self._move_groups:
            for sequence in group:
                for node in sequence.keys():
                    node_set.add(node)
        return node_set

    async def _send_groups(self, can_messenger: CanMessenger) -> None:
        """Send commands to set up the message groups."""
        for group_i, group in enumerate(self._move_groups):
            for seq_i, sequence in enumerate(group):
                for node, step in sequence.items():
                    await can_messenger.send(
                        node_id=node,
                        message=self._get_message_type(
                            step, group_i + self._start_at_index, seq_i
                        ),
                    )

    async def _move(
        self, can_messenger: CanMessenger, start_at_index: int
    ) -> Completions:
        """Run all the move groups."""
        scheduler = MoveDispatcher(self._move_groups, start_at_index)
        try:
            can_messenger.add_listener(scheduler)
            completions = await scheduler.run(can_messenger)
        finally:
            can_messenger.remove_listener(scheduler)
        return completions
