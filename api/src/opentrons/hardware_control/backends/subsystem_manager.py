"""
Coordinate subsystem detection and updates.
"""

import asyncio
from contextlib import contextmanager, ExitStack
from dataclasses import dataclass
import logging
from typing import (
    Optional,
    Set,
    Dict,
    Iterator,
    Callable,
    AsyncIterator,
    Union,
    List,
)

from opentrons_hardware.hardware_control import network, tools
from opentrons_hardware.drivers import can_bus, binary_usb
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    USBTarget,
    FirmwareTarget,
    ToolType,
)
from opentrons_hardware.firmware_update import FirmwareUpdate

from ..types import SubSystem, SubSystemState, UpdateStatus, UpdateState
from .ot3utils import subsystem_to_target, target_to_subsystem
from .errors import SubsystemUpdating


log = logging.getLogger(__name__)


@dataclass
class FirmwareUpdateRequirements:
    target_version: int
    filepath: str


class SubsystemManager:
    """Control tracking and updating attached subsystems to the machine.

    Call start() before trying to run the system (or build with build()).

    This object has an always-up-to-date cache of attached subsystems driven by
    asynchronous notifications from hardware and explicitly updatable with refresh().
    """

    _can_messenger: can_bus.CanMessenger
    _usb_messenger: Optional[binary_usb.BinaryMessenger]
    _tool_detector: tools.detector.ToolDetector
    _network_info: network.NetworkInfo
    _tool_detection_task: "Optional[asyncio.Task[None]]"
    _expected_core_targets: Set[FirmwareTarget]
    _present_tools: tools.types.ToolSummary
    _tool_task_condition: asyncio.Condition
    _tool_task_state: Union[bool, Exception]
    _updates_required: Dict[FirmwareTarget, FirmwareUpdateRequirements]
    _updates_ongoing: Dict[SubSystem, UpdateStatus]
    _update_bag: FirmwareUpdate

    def __init__(
        self,
        can_messenger: can_bus.CanMessenger,
        usb_messenger: Optional[binary_usb.BinaryMessenger],
        tool_detector: tools.detector.ToolDetector,
        network_info: network.NetworkInfo,
        update_bag: FirmwareUpdate,
    ) -> None:
        self._can_messenger = can_messenger
        self._usb_messenger = usb_messenger
        self._tool_detector = tool_detector
        self._network_info = network_info
        self._tool_detection_task = None
        self._expected_core_targets: Set[FirmwareTarget] = {
            NodeId.gantry_x,
            NodeId.gantry_y,
            NodeId.head,
        }
        self._tool_task_condition = asyncio.Condition()
        self._tool_task_state = False
        self._updates_required = {}
        self._updates_ongoing = {}
        self._update_bag = update_bag
        if self._usb_messenger:
            self._expected_core_targets.add(USBTarget.rear_panel)
        self._present_tools = tools.types.ToolSummary(
            left=None, right=None, gripper=None
        )

    @property
    def ok(self) -> bool:
        """True if required subsystems are present and all present subsystems are ok."""
        if not self._expected_core_targets.issubset(self.targets):
            return False
        return all(state.ok for state in self.subsystems.values())

    @property
    def device_info(self) -> Dict[SubSystem, network.DeviceInfoCache]:
        return {
            target_to_subsystem(target): info
            for target, info in self._network_info.device_info.items()
        }

    @property
    def targets(self) -> Set[FirmwareTarget]:
        return self._network_info.targets

    @property
    def tools(self) -> tools.types.ToolSummary:
        return self._present_tools

    @property
    def subsystems(self) -> Dict[SubSystem, SubSystemState]:
        def _state_or(maybe_status: Optional[UpdateStatus]) -> Optional[UpdateState]:
            if maybe_status is not None:
                return maybe_status.state
            return None

        def _next_version(target: FirmwareTarget, current: int) -> int:
            try:
                return self._updates_required[target].target_version
            except KeyError:
                return current

        return {
            target_to_subsystem(target): SubSystemState(
                ok=info.ok,
                current_fw_version=info.version,
                next_fw_version=_next_version(target, info.version),
                fw_update_needed=target in self._updates_required,
                current_fw_sha=info.shortsha,
                pcba_revision=str(info.revision),
                update_state=_state_or(
                    self._updates_ongoing.get(target_to_subsystem(target))
                ),
            )
            for target, info in self._network_info.device_info.items()
        }

    @property
    def update_required(self) -> bool:
        return bool(self._updates_required)

    @property
    def subsystems_to_update(self) -> List[SubSystem]:
        return [target_to_subsystem(t) for t in self._updates_required.keys()]

    async def start(self) -> None:
        await self._probe_network_and_cache_fw_updates(
            self._expected_core_targets, True
        )
        self._tool_detection_task = asyncio.create_task(
            self._tool_detection_task_main()
        )
        await self.refresh()
        log.info(f"Subsystem manager started with devices {self.device_info}")

    async def refresh(self) -> None:
        """Explicitly refresh the state of the system.

        This will not return until the information is up to date.
        """
        async with self._tool_task_condition:
            if isinstance(self._tool_task_state, Exception):
                raise self._tool_task_state
            await self._tool_detector.check_once()
            await self._tool_task_condition.wait()
            if isinstance(self._tool_task_state, Exception):
                raise self._tool_task_state
            self._tool_task_state = False

    async def is_new(self) -> bool:
        """Returns True if there is data unread since the last call to is_new."""
        async with self._tool_task_condition:
            state = self._tool_task_state
            if isinstance(state, Exception):
                raise state
            return self._tool_task_state is True

    async def _check_devices_after_update(
        self, devices: Set[SubSystem], timeout_sec: float = 10.0
    ) -> None:
        try:
            await asyncio.wait_for(
                self._do_check_devices_after_update(devices), timeout=timeout_sec
            )
        except asyncio.TimeoutError:
            raise RuntimeError("Device failed to come back after firmware update")

    async def _do_check_devices_after_update(self, devices: Set[SubSystem]) -> None:
        # refresh the device_info cache and reset internal states
        log.info(f"Checking {devices} after update")
        attempts = 1
        while True:
            await self._probe_network_and_cache_fw_updates(
                {subsystem_to_target(subsystem) for subsystem in devices},
                False,
            )
            await asyncio.sleep(0.1)
            # make sure the update actually succeeded
            device_info = self.device_info
            if devices.issubset(device_info.keys()) and all(
                info.ok for subsys, info in device_info.items() if subsys in devices
            ):
                log.info(f"Found all devices after {attempts} tries")
                return
            log.info(f"Failed to find all of {devices}: found {device_info}")
            attempts += 1

    def get_update_progress(self) -> Dict[SubSystem, UpdateStatus]:
        """Returns a set of UpdateStatus of the updates."""
        return {k: v for k, v in self._updates_ongoing.items()}

    async def update_firmware(
        self,
        subsystems: Optional[Set[SubSystem]] = None,
        force: bool = False,
    ) -> AsyncIterator[UpdateStatus]:
        """Updates the firmware on the OT3."""
        # Check that there arent updates already running for given nodes
        current_subsystems = self.subsystems

        subsystems_to_check = subsystems or set(current_subsystems)
        subsystems_updating = set(self._updates_ongoing)
        subsystems_to_update = subsystems_to_check - subsystems_updating
        if not subsystems_to_update:
            if subsystems:
                raise SubsystemUpdating(f"Ongoing update for {subsystems}")
            else:
                log.info("No viable subsystem to update.")
                return

        # Check if devices need an update, only checks nodes if given
        firmware_updates = self._get_required_fw_updates(
            {subsystem_to_target(subsystem) for subsystem in subsystems_to_update},
            force=force,
        )

        subsystems_updatable = set(
            target_to_subsystem(target) for target in firmware_updates.keys()
        )
        updating_subsystems = subsystems_to_update.intersection(subsystems_updatable)

        if not updating_subsystems:
            log.info("No firmware updates required for specified subsystems.")
            return

        log.info(f"Updating firmware on {updating_subsystems}")

        update_details = {
            target: firmware_updates[target].filepath
            for target in (
                subsystem_to_target(subsystem) for subsystem in updating_subsystems
            )
        }

        with ExitStack() as update_tracker_stack:
            status_callbacks: Dict[SubSystem, Callable[[UpdateStatus], None]] = {
                subsystem: update_tracker_stack.enter_context(
                    self._update_ongoing_for(subsystem)
                )
                for subsystem in updating_subsystems
            }

            updater = self._update_bag.update_runner(
                can_messenger=self._can_messenger,
                usb_messenger=self._usb_messenger,
                update_details=update_details,
                retry_count=3,
                timeout_seconds=5,
                erase=True,
            )

            # start the updates and yield progress to caller
            async for target, status_element in updater.run_updates():
                subsystem = target_to_subsystem(target)
                upstream_status = UpdateStatus(
                    subsystem=subsystem,
                    state=UpdateState[status_element[0].name],
                    progress=int(status_element[1] * 100),
                )
                status_callbacks[subsystem](upstream_status)
                yield upstream_status

        await self._check_devices_after_update(updating_subsystems)

    def _get_required_fw_updates(
        self, targets: Set[FirmwareTarget], force: bool
    ) -> Dict[FirmwareTarget, FirmwareUpdateRequirements]:
        to_check = (targets or self.targets).intersection(self.targets)
        updates_required: Dict[FirmwareTarget, FirmwareUpdateRequirements] = {}
        bad_targets = {
            target
            for target in to_check
            if not self.device_info[target_to_subsystem(target)].ok
        }
        good_targets = to_check - bad_targets
        device_info_by_target = {
            subsystem_to_target(subsystem): info
            for subsystem, info in self.device_info.items()
        }
        good_updates = self._update_bag.update_checker(
            device_info_by_target, good_targets, force
        )
        bad_updates = self._update_bag.update_checker(
            device_info_by_target, bad_targets, True
        )

        for target, (next_version, filepath) in good_updates.items():
            updates_required[target] = FirmwareUpdateRequirements(
                target_version=next_version,
                filepath=filepath,
            )

        for target, (next_version, filepath) in bad_updates.items():
            updates_required[target] = FirmwareUpdateRequirements(
                target_version=next_version,
                filepath=filepath,
            )

        return updates_required

    def _update_fw_update_requirements(self) -> None:
        """Update the local cache of extra information required for subsystem state."""
        # this runs in a separate task from where it will be queried, so we'll build a replacement
        # for the _updates_required dict locally and then swap it over async-atomically

        self._updates_required = self._get_required_fw_updates(set(), False)

    async def _probe_network_and_cache_fw_updates(
        self, targets: Set[FirmwareTarget], broadcast: bool = True
    ) -> None:
        checked_targets = {
            target
            for target in targets
            if target_to_subsystem(target) not in self._updates_ongoing
        }
        if broadcast:
            await self._network_info.probe(checked_targets)
        else:
            await self._network_info.probe_specific(checked_targets)
        self._update_fw_update_requirements()

    @contextmanager
    def _update_ongoing_for(
        self, subsystem: SubSystem
    ) -> Iterator[Callable[[UpdateStatus], None]]:
        if subsystem in self._updates_ongoing:
            raise RuntimeError(f"Update already ongoing for {subsystem}")

        def update_state(status: UpdateStatus) -> None:
            self._updates_ongoing[subsystem] = status

        self._updates_ongoing[subsystem] = UpdateStatus(
            subsystem=subsystem, state=UpdateState.queued, progress=0
        )
        try:
            yield update_state
        except Exception:
            log.exception(f"Update failed for subsystem {subsystem}")
            raise
        finally:
            self._updates_ongoing.pop(subsystem)

    async def _tool_detection_task_main(self) -> None:
        try:
            await self._tool_detection_task_protected()
        except Exception as e:
            async with self._tool_task_condition:
                self._tool_task_state = e
                self._tool_task_condition.notify_all()
            raise

    async def _tool_detection_task_protected(self) -> None:
        """Main function of an asyncio task that responds to async notifications that tool states have changed."""
        async with self._tool_task_condition:
            self._tool_task_state = True
            self._tool_task_condition.notify_all()
        async for update in self._tool_detector.detect():
            # We got a notification from the head that something changed. Let's check whether the currently
            # attached tools are okay by getting their device info
            tool_nodes: Set[NodeId] = set()
            if update.left != ToolType.nothing_attached:
                tool_nodes.add(NodeId.pipette_left)
            if update.right != ToolType.nothing_attached:
                tool_nodes.add(NodeId.pipette_right)
            if update.gripper != ToolType.nothing_attached:
                tool_nodes.add(NodeId.gripper)
            base_can_nodes: List[NodeId] = [
                NodeId.pipette_left,
                NodeId.pipette_right,
                NodeId.gripper,
            ]
            base_nodes: Set[FirmwareTarget] = {n for n in base_can_nodes}
            try:
                self._network_info.mark_absent(base_nodes - tool_nodes)
                await self._probe_network_and_cache_fw_updates(
                    self._expected_core_targets.union(tool_nodes), False
                )
            except TimeoutError:
                log.exception("Problem in internal network probe")
                continue

            # Once we know which are okay, we can ask only those for their subsystems
            to_resolve = tools.types.ToolDetectionResult(
                left=self._tool_if_ok(update.left, NodeId.pipette_left),
                right=self._tool_if_ok(update.right, NodeId.pipette_right),
                gripper=self._tool_if_ok(update.gripper, NodeId.gripper),
            )
            self._present_tools = await self._tool_detector.resolve(to_resolve, 10.0)
            log.info(f"Present tools are now {self._present_tools}")
            await network.log_motor_usage_data(
                self._can_messenger, list(set(base_can_nodes + [t for t in tool_nodes]))
            )
            async with self._tool_task_condition:
                self._tool_task_state = True
                self._tool_task_condition.notify_all()

    def _tool_if_ok(self, tool: ToolType, node: NodeId) -> ToolType:
        if tool is ToolType.nothing_attached:
            return tool
        device_info = self._network_info.device_info
        if node not in device_info:
            return ToolType.nothing_attached
        if not device_info[node].ok:
            return ToolType.nothing_attached
        return tool
