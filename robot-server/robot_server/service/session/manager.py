import logging
from typing import Optional, Tuple, Dict, Type

from opentrons.hardware_control import HardwareControlAPI, ThreadedAsyncLock

from robot_server.service.errors import RobotServerError, CommonErrorDef
from robot_server.service.session.errors import (
    SessionCreationException,
    SessionException,
)
from robot_server.service.session.session_types.base_session import BaseSession
from robot_server.service.session.configuration import SessionConfiguration
from robot_server.service.session.models.session import SessionType
from robot_server.service.session.models.common import IdentifierType
from robot_server.service.session.session_types import (
    CheckSession,
    SessionMetaData,
    TipLengthCalibration,
    DeckCalibrationSession,
    PipetteOffsetCalibrationSession,
)

log = logging.getLogger(__name__)

SessionTypeToClass: Dict[SessionType, Type[BaseSession]] = {
    SessionType.calibration_check: CheckSession,
    SessionType.tip_length_calibration: TipLengthCalibration,
    SessionType.deck_calibration: DeckCalibrationSession,
    SessionType.pipette_offset_calibration: PipetteOffsetCalibrationSession,
}


class SessionManager:
    """Manager of session instances"""

    def __init__(
        self,
        hardware: HardwareControlAPI,
        motion_lock: ThreadedAsyncLock,
    ) -> None:
        """
        Construct the session manager

        :param hardware: ThreadManagedHardware to interact with hardware
        """
        self._sessions: Dict[IdentifierType, BaseSession] = {}
        self._active = ActiveSessionId()
        # Create object supplied to all sessions
        self._session_common = SessionConfiguration(
            hardware=hardware,
            is_active=self.is_active,
            motion_lock=motion_lock,
        )

    async def add(
        self,
        session_type: SessionType,
        session_meta_data: SessionMetaData,
    ) -> BaseSession:
        """Add a new session."""
        session = await self._create_session(session_meta_data, session_type)
        if session.meta.identifier in self._sessions:
            raise RobotServerError(
                definition=CommonErrorDef.RESOURCE_ALREADY_EXISTS,
                resource="session",
                id=session.meta.identifier,
            )
        self._sessions[session.meta.identifier] = session
        self._active.active_id = session.meta.identifier
        log.debug(f"Added new session: {session}")
        return session

    async def remove(self, identifier: IdentifierType) -> Optional[BaseSession]:
        """Remove a session"""
        session = self.deactivate(identifier)
        if session:
            del self._sessions[session.meta.identifier]
            await session.clean_up()
            log.info(f"Removed session: {session}")
        return session

    async def remove_all(self) -> None:
        """Remove all sessions"""
        # a copy must be made because self._session is altered during
        # iteration
        keys = list(self._sessions.keys())
        for session in keys:
            try:
                await self.remove(session)
            except SessionException:
                log.exception(f"Failed to remove '{session}'")

    def get_by_id(self, identifier: IdentifierType) -> Optional[BaseSession]:
        """Get a session by identifier"""
        return self._sessions.get(identifier, None)

    def get(
        self,
        session_type: Optional[SessionType] = None,
    ) -> Tuple[BaseSession, ...]:
        """
        Get all the sessions with optional filter

        :param session_type: Optional session type filter
        """
        return tuple(
            session
            for session in self._sessions.values()
            if not session_type or session.session_type == session_type
        )

    def get_active(self) -> Optional[BaseSession]:
        """Get the active session"""
        return (
            self.get_by_id(self._active.active_id) if self._active.active_id else None
        )

    def is_active(self, identifier: IdentifierType) -> bool:
        """Check if session identifier is active"""
        return identifier == self._active.active_id

    def activate(self, identifier: IdentifierType) -> Optional[BaseSession]:
        """Activate a session"""
        session = self.get_by_id(identifier)
        if session:
            self._active.active_id = identifier
        return session

    def deactivate(self, identifier: IdentifierType) -> Optional[BaseSession]:
        """Deactivate a session"""
        if identifier == self._active.active_id:
            self._active.active_id = None
        return self.get_by_id(identifier)

    async def _create_session(
        self,
        session_meta_data: SessionMetaData,
        session_type: SessionType,
    ) -> BaseSession:
        """Create a new session."""
        cls = SessionTypeToClass.get(session_type)
        if not cls:
            raise SessionCreationException("Session type is not supported")
        session = await cls.create(
            configuration=self._session_common, instance_meta=session_meta_data
        )
        return session


class ActiveSessionId:
    def __init__(self) -> None:
        self._active_id: Optional[IdentifierType] = None

    @property
    def active_id(self) -> Optional[IdentifierType]:
        return self._active_id

    @active_id.setter
    def active_id(self, val: Optional[IdentifierType]) -> None:
        self._active_id = val
