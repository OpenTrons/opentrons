from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from robot_server.service.session.models.common import IdentifierType, create_identifier
from robot_server.service.session.command_execution import (
    CommandExecutor,
    create_command,
)
from robot_server.service.session.configuration import SessionConfiguration
from robot_server.service.session.models import session as models
from robot_server.service.session.models import command as command_models
from opentrons.util.helpers import utc_now


@dataclass(frozen=True)
class SessionMetaData:
    name: Optional[str] = None
    description: Optional[str] = None
    create_params: Optional[models.SessionCreateParamType] = None
    identifier: IdentifierType = field(default_factory=create_identifier)
    created_at: datetime = field(default_factory=utc_now)


class BaseSession(ABC):
    """Base class of all sessions"""

    def __init__(
        self, configuration: SessionConfiguration, instance_meta: SessionMetaData
    ):
        """
        Constructor

        :param configuration: Data and utilities common to all session types
        :param instance_meta: Session metadata
        """
        self._configuration = configuration
        self._instance_meta = instance_meta

    @classmethod
    async def create(
        cls, configuration: SessionConfiguration, instance_meta: SessionMetaData
    ) -> "BaseSession":
        """
        Create a session object

        :param configuration: Data and utilities common to all session types
        :param instance_meta: Session metadata
        :return: A new session
        :raise SessionCreationException:
        """
        return cls(configuration=configuration, instance_meta=instance_meta)

    @abstractmethod
    def get_response_model(self) -> models.ResponseTypes:
        """Get the response model"""
        ...

    async def clean_up(self):
        """Called before session is deleted"""
        pass

    async def execute_command(
        self, command: command_models.RequestTypes
    ) -> command_models.ResponseTypes:
        """Execute a command."""
        command_obj = create_command(command)
        command_result = await self.command_executor.execute(command_obj)

        return command.make_response(
            identifier=command_obj.meta.identifier,
            status=command_result.result.status,
            created_at=command_obj.meta.created_at,
            started_at=command_result.result.started_at,
            completed_at=command_result.result.completed_at,
            result=command_result.result.data,
        )

    @property
    @abstractmethod
    def command_executor(self) -> CommandExecutor:
        """Accessor for the command executor"""
        pass

    @property
    def meta(self) -> SessionMetaData:
        return self._instance_meta

    @property
    @abstractmethod
    def session_type(self) -> models.SessionType:
        pass

    def __str__(self) -> str:
        return (
            f"Session(" f"session_type={self.session_type}," f"meta={self.meta}," f")"
        )
