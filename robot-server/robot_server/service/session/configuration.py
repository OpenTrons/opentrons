from typing import Callable

from opentrons.hardware_control import ThreadedAsyncLock, HardwareControlAPI

from robot_server.service.session.models.common import IdentifierType


class SessionConfiguration:
    """Data and utilities common to all session types
    provided by session manager"""

    def __init__(
        self,
        hardware: HardwareControlAPI,
        is_active: Callable[[IdentifierType], bool],
        motion_lock: ThreadedAsyncLock,
    ) -> None:
        self._hardware = hardware
        self._is_active = is_active
        self._motion_lock = motion_lock

    @property
    def hardware(self) -> HardwareControlAPI:
        """Access to robot hardware"""
        return self._hardware

    def is_active(self, identifier: IdentifierType) -> bool:
        """Is session identifier active"""
        return self._is_active(identifier)

    @property
    def motion_lock(self) -> ThreadedAsyncLock:
        return self._motion_lock
