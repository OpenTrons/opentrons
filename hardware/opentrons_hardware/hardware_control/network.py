"""Utilities for managing the CANbus network on the OT3."""

import asyncio
from dataclasses import dataclass
from itertools import chain
import logging
from typing import Any, Dict, Set, Optional, Union, cast, Iterable, Tuple, List
from .types import PCBARevision
from opentrons_hardware.firmware_bindings import ArbitrationId
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    FirmwareTarget,
    USBTarget,
    MessageId,
    MotorUsageValueType,
)
from opentrons_hardware.drivers.can_bus.can_messenger import (
    CanMessenger,
)
from opentrons_hardware.drivers.binary_usb import BinaryMessenger
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    DeviceInfoRequest as CanDeviceInfoRequest,
    GetMotorUsageResponse,
    GetMotorUsageRequest,
)
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    DeviceInfoResponse as CanDeviceInfoResponse,
)
from opentrons_hardware.firmware_bindings.messages.binary_message_definitions import (
    DeviceInfoRequest as USBDeviceInfoRequest,
)
from opentrons_hardware.firmware_bindings.messages.binary_message_definitions import (
    DeviceInfoResponse as USBDeviceInfoResponse,
)
from opentrons_hardware.firmware_bindings.messages.binary_message_definitions import (
    BinaryMessageDefinition,
)
from opentrons_hardware.firmware_bindings.messages.messages import MessageDefinition

log = logging.getLogger(__name__)


@dataclass
class DeviceInfoCache:
    """Holds version information for a device on the network."""

    target: FirmwareTarget
    version: int
    shortsha: str
    flags: Any
    revision: PCBARevision
    subidentifier: int
    ok: bool

    def __repr__(self) -> str:
        """Readable representation of the device info."""
        return f"<{self.__class__.__name__}: node={self.target}, version={self.version}, sha={self.shortsha}, ok={self.ok}>"


class NetworkInfo:
    """This class is responsible for keeping track of all devices."""

    def __init__(
        self,
        can_messenger: CanMessenger,
        usb_messenger: Optional[BinaryMessenger] = None,
    ) -> None:
        """Construct.

        Args:
            can_messenger: The Can messenger
            usb_messenger: The usb messenger
        """
        self._can_network_info = CanNetworkInfo(can_messenger)
        self._usb_network_info = UsbNetworkInfo(usb_messenger)

    @property
    def device_info(self) -> Dict[FirmwareTarget, DeviceInfoCache]:
        """Dictionary containing known devices and their device info."""
        return {
            k: v
            for k, v in cast(  # necessary because chain erases key types
                Iterable[
                    Union[
                        Tuple[NodeId, DeviceInfoCache],
                        Tuple[USBTarget, DeviceInfoCache],
                    ]
                ],
                chain(
                    self._can_network_info.device_info.items(),
                    self._usb_network_info.device_info.items(),
                ),
            )
        }

    @property
    def targets(self) -> Set[FirmwareTarget]:
        """Set of usb devices on the network."""
        return cast(Set[FirmwareTarget], self._can_network_info.nodes).union(
            self._usb_network_info.targets
        )

    async def probe(
        self, expected: Optional[Set[FirmwareTarget]] = None, timeout: float = 1.0
    ) -> Dict[FirmwareTarget, DeviceInfoCache]:
        """Probe for all connected devices.

        calls probe with both CanNetworkInfo and USBNetworkInfo and collects all devices

        The ideal call pattern is to build an expectation for targets and use this to verify that
        assumption

        Args:
            expected: Set of FirmwareTargets to expect
            timeout: time in seconds to wait for responses
        """
        expected_can: Optional[Set[NodeId]] = None
        expected_usb: Optional[Set[USBTarget]] = None
        if expected is not None:
            expected_can, expected_usb = self._split_devices(expected)

        can_device_info, usb_device_info = await asyncio.gather(
            self._can_network_info.probe(expected_can, timeout),
            self._usb_network_info.probe(expected_usb, timeout),
        )
        return self._fuse_info(can_device_info, usb_device_info)

    async def probe_specific(
        self, devices: Set[FirmwareTarget], timeout: float = 1.0
    ) -> Dict[FirmwareTarget, DeviceInfoCache]:
        """Probe for specific connected devices determined by the arguments.

        This method checks for the presence of specific devices on the network, as opposed to
        getting a general assessment of what's present. It will also update the internal cache
        of device state for what it finds, but only for the devices in the argument.
        """
        can_devs, usb_devs = self._split_devices(devices)
        can_device_info, usb_device_info = await asyncio.gather(
            self._can_network_info.probe_specific(can_devs, timeout),
            self._usb_network_info.probe_specific(usb_devs, timeout),
        )
        return self._fuse_info(can_device_info, usb_device_info)

    def mark_absent(
        self, devices: Set[FirmwareTarget]
    ) -> Dict[FirmwareTarget, DeviceInfoCache]:
        """Mark the specified devices as absent. Best used in combination with probe_specific."""
        can_devices, usb_devices = self._split_devices(devices)
        can_info = self._can_network_info.mark_absent(can_devices)
        usb_info = self._usb_network_info.mark_absent(usb_devices)
        return self._fuse_info(can_info, usb_info)

    @staticmethod
    def _fuse_info(
        can_info: Dict[NodeId, DeviceInfoCache],
        usb_info: Dict[USBTarget, DeviceInfoCache],
    ) -> Dict[FirmwareTarget, DeviceInfoCache]:
        device_info: Dict[FirmwareTarget, DeviceInfoCache] = {
            node: cache for (node, cache) in can_info.items()
        }
        device_info.update({target: cache for (target, cache) in usb_info.items()})
        return device_info

    @staticmethod
    def _split_devices(
        devices: Set[FirmwareTarget],
    ) -> Tuple[Set[NodeId], Set[USBTarget]]:
        return {NodeId(target) for target in devices if target in NodeId}, {
            USBTarget(target) for target in devices if target in USBTarget
        }


class UsbNetworkInfo:
    """This class is responsible for keeping track of usb devices."""

    def __init__(self, usb_messenger: Optional[BinaryMessenger]) -> None:
        """Construct.

        Args:
            usb_messenger: The usb messenger
        """
        self._usb_messenger = usb_messenger
        self._device_info_cache: Dict[USBTarget, DeviceInfoCache] = dict()

    @property
    def device_info(self) -> Dict[USBTarget, DeviceInfoCache]:
        """Dictionary containing known usb devices and their device info."""
        return self._device_info_cache

    @property
    def targets(self) -> Set[USBTarget]:
        """Set of usb devices on the network."""
        return set(self._device_info_cache)

    @staticmethod
    def _log_failure(expected: Set[USBTarget], found: Set[USBTarget], msg: str) -> None:
        if expected:
            log.warning(f"{msg} found {found} of {expected}")
        else:
            log.debug(f"{msg} found {found} with nothing expected")

    def _update_only(
        self, only_devices: Set[USBTarget], found: Dict[USBTarget, DeviceInfoCache]
    ) -> None:
        for device in only_devices:
            if device not in found:
                self._device_info_cache.pop(device, None)
            else:
                self._device_info_cache[device] = found[device]

    async def probe_specific(  # noqa: C901
        self, devices: Set[USBTarget], timeout: float = 1.0
    ) -> Dict[USBTarget, DeviceInfoCache]:
        """Probe for a specific set of usb connected devices.

        Sends a status requets to the usb messenger and waits for responses, ending when all devices
        response or when a timeout occurs. Will cache the results but only for the targets passed as argument.
        """
        event = asyncio.Event()
        targets: Dict[USBTarget, DeviceInfoCache] = dict()
        if self._usb_messenger is None:
            self._device_info_cache = {}
            return targets

        if not devices:
            return targets

        def listener(message: BinaryMessageDefinition) -> None:
            if isinstance(message, USBDeviceInfoResponse):
                device_info_cache = _parse_usb_device_info_response(message)
                if device_info_cache:
                    targets[USBTarget(device_info_cache.target)] = device_info_cache
            if devices.issubset(targets):
                event.set()

        try:
            self._usb_messenger.add_listener(listener)
            await self._usb_messenger.send(
                message=USBDeviceInfoRequest(),
            )
            await asyncio.wait_for(event.wait(), timeout)
        except asyncio.TimeoutError:
            self._log_failure(
                devices, set(iter(targets.keys())), "Timeout during probe_specific"
            )
        except BaseException:
            self._log_failure(
                devices,
                set(iter(targets.keys())),
                "USB communications error during probe_specific",
            )
        finally:
            self._usb_messenger.remove_listener(listener)
            self._update_only(devices, targets)
        return targets

    async def probe(
        self, expected: Optional[Set[USBTarget]] = None, timeout: float = 1.0
    ) -> Dict[USBTarget, DeviceInfoCache]:
        """Probe for usb connected devices.

        Sends a status request to the usb messenger and waits for responses. Ends either
        when all devices in expected respond or when a timeout happens, whichever is first. A
        None timeout is infinite and is not recommended, but could be useful if this is
        wrapped in a task and cancelled externally.

        The ideal call pattern is to build an expectation for targets on the bus (i.e., fixed
        targets such as the rear panel) and use this method to verify the assumption.

        Args:
            expected: Set of USBTargets to expect
            timeout: time in seconds to wait for usb message responses
        """
        expected_targets = expected or set()
        event = asyncio.Event()
        targets: Dict[USBTarget, DeviceInfoCache] = dict()

        if self._usb_messenger is None:
            self._device_info_cache = {}
            return targets

        def listener(message: BinaryMessageDefinition) -> None:
            if isinstance(message, USBDeviceInfoResponse):
                device_info_cache = _parse_usb_device_info_response(message)
                if device_info_cache:
                    targets[USBTarget(device_info_cache.target)] = device_info_cache
            if expected_targets and expected_targets.issubset(targets):
                event.set()

        try:
            self._usb_messenger.add_listener(listener)
            await self._usb_messenger.send(
                message=USBDeviceInfoRequest(),
            )
            await asyncio.wait_for(event.wait(), timeout)
        except asyncio.TimeoutError:
            self._log_failure(
                expected_targets, set(iter(targets.keys())), "Timeout during probe"
            )
        except BaseException:
            self._log_failure(
                expected_targets,
                set(iter(targets.keys())),
                "USB communications error during probe",
            )
        finally:
            self._usb_messenger.remove_listener(listener)
            self._device_info_cache = targets
        return targets

    def mark_absent(self, devices: Set[USBTarget]) -> Dict[USBTarget, DeviceInfoCache]:
        """Mark the specified devices as absent. Best used in combination with probe_specific."""
        for device in devices:
            self._device_info_cache.pop(device, None)
        return self._device_info_cache


class CanNetworkInfo:
    """This class is responsible for keeping track of nodes on the can bus."""

    def __init__(self, can_messenger: CanMessenger) -> None:
        """Construct.

        Args:
            can_messenger: The Can messenger
        """
        self._can_messenger = can_messenger
        self._device_info_cache: Dict[NodeId, DeviceInfoCache] = dict()

    @property
    def device_info(self) -> Dict[NodeId, DeviceInfoCache]:
        """Dictionary containing known nodes and their device info."""
        return self._device_info_cache

    @property
    def nodes(self) -> Set[NodeId]:
        """Set of NodeIds on the network."""
        return set(self._device_info_cache)

    async def probe(
        self, expected: Optional[Set[NodeId]] = None, timeout: float = 1.0
    ) -> Dict[NodeId, DeviceInfoCache]:
        """Probe the bus and discover connected devices.

        Sends a status request to the broadcast address and waits for responses. Ends either
        when all nodes in expected respond or when a timeout happens, whichever is first. A
        None timeout is infinite and is not recommended, but could be useful if this is
        wrapped in a task and cancelled externally.

        The ideal call pattern is to build an expectation for nodes on the bus (i.e., fixed
        nodes such as gantry controllers and head plus whatever tools the head indicates
        are attached) and use this method to verify the assumption.

        Args:
            expected: Set of NodeIds to expect
            timeout: time in seconds to wait for can message responses
        """
        expected_nodes = expected or set()
        event = asyncio.Event()
        nodes: Dict[NodeId, DeviceInfoCache] = dict()

        def listener(message: MessageDefinition, arbitration_id: ArbitrationId) -> None:
            if not isinstance(message, CanDeviceInfoResponse):
                return
            device_info_cache = _parse_can_device_info_response(message, arbitration_id)
            if not device_info_cache:
                return
            nodes[NodeId(device_info_cache.target).application_for()] = (
                device_info_cache
            )
            if expected_nodes and expected_nodes.issubset(
                {node.application_for() for node in nodes}
            ):
                event.set()

        self._can_messenger.add_listener(listener)
        await self._can_messenger.send(
            node_id=NodeId.broadcast,
            message=CanDeviceInfoRequest(),
        )
        try:
            await asyncio.wait_for(event.wait(), timeout)
        except asyncio.TimeoutError:
            if expected_nodes:
                log.warning(
                    "probe timed out before expected nodes found, missing "
                    f"{expected_nodes.difference(nodes)}"
                )
            else:
                log.debug("probe terminated (no expected set)")
        finally:
            self._can_messenger.remove_listener(listener)
            self._device_info_cache = nodes
            self._can_messenger.update_known_nodes(self.nodes)
        return nodes

    async def probe_specific(
        self, targets: Set[NodeId], timeout: float = 1.0
    ) -> Dict[NodeId, DeviceInfoCache]:
        """Probe specific devices to see whether they're present on the bus.

        Sends a status request to the broadcast address and waits for responses from only
        the specified devices. Ends either when the given devices respond or when a timeout
        happens, whichever is first.

        This will also update the cached values of present nodes, but unlike probe() does not
        check for or care about any node not given and will not add or remove them from the
        cache.
        """
        event = asyncio.Event()
        nodes: Dict[NodeId, DeviceInfoCache] = dict()
        target_applications = {target.application_for() for target in targets}

        def listener(message: MessageDefinition, arbitration_id: ArbitrationId) -> None:
            if not isinstance(message, CanDeviceInfoResponse):
                return
            device_info_cache = _parse_can_device_info_response(message, arbitration_id)

            if not device_info_cache:
                return

            originating_device = NodeId(device_info_cache.target)
            originating_application = originating_device.application_for()
            if originating_application not in target_applications:
                return
            nodes[originating_application] = device_info_cache
            if target_applications.issubset(nodes):
                event.set()

        self._can_messenger.add_listener(listener)
        await self._can_messenger.send(
            node_id=NodeId.broadcast,
            message=CanDeviceInfoRequest(),
        )
        try:
            await asyncio.wait_for(event.wait(), timeout)
        except asyncio.TimeoutError:
            log.warning(
                "probe timed out before expected nodes found, missing "
                f"{target_applications.difference(nodes)}"
            )
        finally:
            self._can_messenger.remove_listener(listener)
            for target in target_applications:
                if target in nodes:
                    self._device_info_cache[target] = nodes[target]
                else:
                    self._device_info_cache.pop(target, None)
            self._can_messenger.update_known_nodes(self.nodes)
        return nodes

    def mark_absent(self, devices: Set[NodeId]) -> Dict[NodeId, DeviceInfoCache]:
        """Mark the specified devices as absent. Best used in combination with probe_specific."""
        for device in devices:
            self._device_info_cache.pop(device.application_for(), None)
        return self._device_info_cache


def _parse_usb_device_info_response(
    message: BinaryMessageDefinition,
) -> Union[DeviceInfoCache, None]:
    """Parses the DeviceInfoRequest message and returns DeviceInfoCache."""
    if isinstance(message, USBDeviceInfoResponse):
        target = USBTarget.rear_panel
        try:
            return DeviceInfoCache(
                target=target,
                version=int(message.version.value),
                shortsha=message.shortsha.value.decode(),
                flags=message.flags.value,
                revision=PCBARevision(
                    message.revision.revision, message.revision.tertiary
                ),
                subidentifier=message.subidentifier.value,
                ok=True,
            )
        except (ValueError, UnicodeDecodeError) as e:
            log.error(f"Could not parse DeviceInfoResponse {e}")
    return None


def _parse_can_device_info_response(
    message: MessageDefinition, arbitration_id: ArbitrationId
) -> Union[DeviceInfoCache, None]:
    """Parses the DeviceInfoRequest message and returns DeviceInfoCache."""
    if isinstance(message, CanDeviceInfoResponse):
        try:
            node = NodeId(arbitration_id.parts.originating_node_id)
        except ValueError:
            log.error(
                "unknown node id on network: "
                f"0x{arbitration_id.parts.originating_node_id:x}"
            )
            return None
        try:
            return DeviceInfoCache(
                target=node.application_for(),
                version=int(message.payload.version.value),
                shortsha=message.payload.shortsha.value.decode(),
                flags=message.payload.flags.value,
                revision=PCBARevision(
                    message.payload.revision.revision, message.payload.revision.tertiary
                ),
                subidentifier=message.payload.subidentifier.value,
                ok=(not node.is_bootloader()),
            )
        except (ValueError, UnicodeDecodeError) as e:
            log.error(f"Could not parse DeviceInfoResponse {e}")
    return None


async def log_motor_usage_data(
    can_messenger: CanMessenger, nodes: List[NodeId]
) -> None:
    """Broadcasts a message to get motor usage request and waits for a list of expected nodes."""
    event = asyncio.Event()

    def _filter(arb_id: ArbitrationId) -> bool:
        return MessageId(arb_id.parts.message_id) == MessageId.get_motor_usage_response

    def _listener(message: MessageDefinition, arb_id: ArbitrationId) -> None:
        if isinstance(message, GetMotorUsageResponse):
            usage_elements = message.payload.usage_elements
            node = arb_id.parts.originating_node_id
            log.info(f"Usage from {node}: ")
            for m in usage_elements:
                data_name = MotorUsageValueType(m.key).name
                data_value = m.usage_value
                log.info(f"    {data_name}: {data_value}")
            nodes.remove(node)
            print(f"got usage from {node} with {nodes} remaining")
            if len(nodes) == 0:
                event.set()

    can_messenger.add_listener(_listener, _filter)
    await can_messenger.send(node_id=NodeId.broadcast, message=GetMotorUsageRequest())
    try:
        await asyncio.wait_for(event.wait(), 1.0)
    except TimeoutError:
        log.error(f"Receiving usage data failed with {nodes} remaining")
    finally:
        can_messenger.remove_listener(_listener)
