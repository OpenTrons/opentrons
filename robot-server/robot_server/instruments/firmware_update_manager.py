"""Class to monitor firmware update status."""
import asyncio
from datetime import datetime
from typing import Dict, Union, Tuple, TYPE_CHECKING, Iterable, Iterator, Optional, Any
from typing_extensions import Literal

from asyncio import Lock, Condition
from dataclasses import dataclass
from enum import Enum, auto

from opentrons.hardware_control.types import (
    UpdateState,
    subsystem_to_mount,
    OT3SubSystem,
    OT3Mount,
)
from opentrons.protocol_engine.errors import HardwareNotSupportedError
from opentrons.protocol_engine.resources import ensure_ot3_hardware
from robot_server.instruments.instrument_models import (
    MountType,
    UpdateProgressData,
    MountTypesStr,
)
from robot_server.service.task_runner import TaskRunner

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API


class UpdateIdNotFound(KeyError):
    """Specified update ID not present."""


class InstrumentNotFound(ValueError):
    """Specified instrument not present."""


class UpdateIdExists(ValueError):
    """An update was specified with the same ID as a running one."""


class UpdateFailed(RuntimeError):
    """Error raised when the information from hardware controller points to a failed update."""


class UpdateInProgress(RuntimeError):
    """Error raised when an update is already ongoing on the same device."""


@dataclass
class ProcessDetails:
    created_at: datetime
    mount: OT3Mount
    update_id: str


@dataclass
class UpdateProgress:
    state: UpdateState
    progress: int


@dataclass
class UpdateProcessSummary:
    details: ProcessDetails
    progress: UpdateProgress


class UpdateProcessHandle:
    """The external interface to get status notifications from the update process."""

    _update_proc: _UpdateProcess
    _proc_details: ProcessDetails

    def __init__(self, update_proc: _UpdateProcess) -> None:
        self._update_proc = update_proc
        self._proc_details = ProcessDetails(
            update_proc.created_at, update_proc.mount, update_proc.update_id
        )

    async def get_progress(self) -> UpdateProgress:
        status = await self._update_proc.provide_latest_progress()
        if status.packet_type is _UpdatePacketType.error:
            raise UpdateFailed() from status.exc
        elif status.packet_type is _UpdatePacketType.complete:
            return UpdateProgress(UpdateState.done, 100)
        else:
            return UpdateProgress(status.status, status.progress)

    @property
    def process_details(self) -> ProcessDetails:
        return self._proc_details

    async def get_process_summary(self) -> UpdateProcessSummary:
        return UpdateProcessSummary(self.process_details, await self.get_progress())

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, UpdateProcessHandle):
            return self._update_proc is other._update_proc
        return NotImplemented


class FirmwareUpdateManager:
    """State storage and progress monitoring for instrument firmware updates."""

    _running_updates: Dict[str, _UpdateProcess]
    #: A store for any updates that are currently running
    _management_lock: asyncio.Lock
    #: A lock for accessing the store, mostly to avoid spurious toctou problems with it

    _task_runner: TaskRunner
    _hardware_handle: "OT3API"

    def __init__(self, task_runner: TaskRunner, hw_handle: "OT3API") -> None:
        self._running_updates = {}
        self._task_runner = task_runner
        self._management_lock = asyncio.Lock()
        self._hardware_handle = hw_handle

    async def _get(self, update_id: str) -> _UpdateProcess:
        async with self._management_lock:
            try:
                return self._running_updates[update_id]
            except KeyError as e:
                raise UpdateIdNotFound() from e

    async def _emplace(
        self, update_id: str, mount: OT3Mount, creation_time: datetime
    ) -> _UpdateProcess:
        if update_id in self._running_updates:
            raise UpdateIdExists()
        self._running_updates[update_id] = _UpdateProcess(
            self._hardware_handle, mount, creation_time, update_id
        )
        self._task_runner.run(self._running_updates[update_id]._update_task)
        return self._running_updates[update_id]

    def get_update_process_handle(self, update_id: str) -> UpdateProcessHandle:
        try:
            return self._running_updates[update_id].get_handle()
        except KeyError as ke:
            raise UpdateIdNotFound() from ke

    async def start_update_process(
        self,
        update_id: str,
        mount: OT3Mount,
        created_at: datetime,
        start_timeout_s: float,
    ) -> UpdateProcessHandle:
        return await asyncio.wait_for(
            self._start_and_get_process(update_id, mount, created_at),
            start_timeout_s,
        )

    async def _start_and_get_process(
        self, update_id: str, mount: OT3Mount, creation_time: datetime
    ) -> UpdateProcessHandle:
        async with self._management_lock:
            process = await self._emplace(update_id, mount, creation_time)
            await process.provide_latest_progress()
        return process.get_handle()

    async def complete_update_process(self, update_id: str) -> None:
        try:
            self._running_updates.pop(update_id)
        except KeyError as ke:
            raise UpdateIdNotFound() from ke


class _UpdatePacketType(Enum):
    progress = auto()
    error = auto()
    complete = auto()


@dataclass
class _UpdateProgressPacket:
    progress: int
    status: UpdateState
    packet_type: Literal[_UpdatePacketType.progress] = _UpdatePacketType.progress


@dataclass
class _UpdateErrorPacket:
    exc: Exception
    packet_type: Literal[_UpdatePacketType.error] = _UpdatePacketType.error


@dataclass
class _UpdateCompletePacket:
    packet_type: Literal[_UpdatePacketType.complete] = _UpdatePacketType.complete


_UpdatePacket = Union[_UpdateProgressPacket, _UpdateErrorPacket, _UpdateCompletePacket]


class _UpdateProcess:
    """State storage and routing for a firmware update."""

    _status_queue: "asyncio.Queue[_UpdatePacket]"
    _hw_handle: "OT3API"
    _mount: OT3Mount
    _status_cache: Optional[_UpdatePacket]
    _created_at: datetime
    _update_id: str

    def __init__(
        self, hw_handle: "OT3API", mount: OT3Mount, created_at: datetime, update_id: str
    ) -> None:
        self._status_queue = asyncio.Queue()
        self._hw_handle = hw_handle
        self._mount = mount
        self._status_cache = None
        self._status_cache_lock = asyncio.Lock()
        self._created_at = created_at
        self._update_id = update_id
        in_progress = self._hw_handle.get_firmware_update_progress()

        def _mounts_in_subsystem_list(
            subsystem: Iterable[OT3SubSystem],
        ) -> Iterator[OT3Mount]:
            for subsys in subsystem:
                try:
                    mount = subsystem_to_mount(subsys)
                except KeyError:
                    continue
                else:
                    yield mount

        in_progress_instruments = list(_mounts_in_subsystem_list(in_progress.keys()))
        if in_progress_instruments:
            raise UpdateInProgress()

        if not self._hw_handle.get_all_attached_instr()[self._mount]:
            raise InstrumentNotFound()

    @property
    def status_cache(self) -> _UpdatePacket:
        if not self._status_cache:
            raise RuntimeError(
                "Update process was not started before asking for status"
            )
        return self._status_cache

    @property
    def created_at(self) -> datetime:
        return self._created_at

    @property
    def mount(self) -> OT3Mount:
        return self._mount

    @property
    def update_id(self) -> str:
        return self._update_id

    async def _update_task(self) -> None:
        try:
            async for update in self._hw_handle.update_instrument_firmware(self.mount):
                await self._status_queue.put(
                    _UpdateProgressPacket(update.progress, update.status)
                )
            await self._status_queue.put(_UpdateProgressPacket(100, UpdateState.done))
        except Exception as e:
            await self._status_queue.put(_UpdateErrorPacket(e))

    def get_handle(self) -> UpdateProcessHandle:
        return UpdateProcessHandle(self)

    async def provide_latest_progress(self) -> _UpdatePacket:
        """Updates the status cache with the latest update if there is one."""
        while self.status_cache is None:
            self._status_cache = await self._status_queue.get()
        maybe_latest = self._drain_queue_provide_last()
        if maybe_latest:
            self._status_cache = maybe_latest

        return self.status_cache

    def _drain_queue_provide_last(self) -> Optional[_UpdatePacket]:
        """Drains the status queue to provide the latest update.

        Note that this code does not yield. It should be acceptably fast because get_nowait() is
        designed for this; and the lack of yielding makes this function as a whole atomic in an
        async context. If multiple tasks call this function, the first to do so gets the update and
        the rest get None.
        """
        packet: Optional[_UpdatePacket] = None
        while True:
            try:
                packet = self._status_queue.get_nowait()
            except asyncio.QueueEmpty:
                return packet
