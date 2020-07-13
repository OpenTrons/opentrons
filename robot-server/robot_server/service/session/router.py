import logging
import typing

from starlette import status as http_status_codes
from fastapi import APIRouter, Query, Depends

from robot_server.service.dependencies import get_session_manager
from robot_server.service.errors import RobotServerError
from robot_server.service.json_api import Error, ResourceLink,\
    ResponseDataModel
from robot_server.service.session.command_execution import create_command
from robot_server.service.session.errors import SessionCreationException, \
    SessionCommandException, SessionException
from robot_server.service.session.manager import SessionManager, BaseSession
from robot_server.service.session import models as route_models

router = APIRouter()


log = logging.getLogger(__name__)


def get_session(manager: SessionManager,
                session_id: route_models.IdentifierType,
                api_router: APIRouter) -> BaseSession:
    """Get the session or raise a RobotServerError"""
    found_session = manager.get_by_id(session_id)
    if not found_session:
        # There is no session raise error
        raise RobotServerError(
            status_code=http_status_codes.HTTP_404_NOT_FOUND,
            error=Error(
                title="No session",
                detail=f"Cannot find session with id '{session_id}'.",
                links={
                    "POST": api_router.url_path_for(
                        create_session_handler.__name__)
                }
            )
        )
    return found_session


@router.post("/sessions",
             description="Create a session",
             response_model_exclude_unset=True,
             response_model=route_models.SessionResponse,
             status_code=http_status_codes.HTTP_201_CREATED,
             )
async def create_session_handler(
        create_request: route_models.SessionCreateRequest,
        session_manager: SessionManager = Depends(get_session_manager)) \
        -> route_models.SessionResponse:
    """Create a session"""
    session_type = create_request.data.attributes.sessionType
    try:
        new_session = await session_manager.add(session_type=session_type)
    except SessionCreationException as e:
        log.exception("Failed to create session")
        raise RobotServerError(
            status_code=http_status_codes.HTTP_400_BAD_REQUEST,
            error=Error(
                title="Creation Failed",
                detail=f"Failed to create session of type "
                       f"'{session_type}': {str(e)}.",
            )
        )
    return route_models.SessionResponse(
        data=ResponseDataModel.create(
            attributes=new_session.get_response_model(),
            resource_id=new_session.meta.identifier),
        links=get_valid_session_links(new_session.meta.identifier, router)
    )


@router.delete("/sessions/{session_id}",
               description="Delete a session",
               response_model_exclude_unset=True,
               response_model=route_models.SessionResponse)
async def delete_session_handler(
        session_id: route_models.IdentifierType,
        session_manager: SessionManager = Depends(get_session_manager)) \
        -> route_models.SessionResponse:
    """Delete a session"""
    session_obj = get_session(manager=session_manager,
                              session_id=session_id,
                              api_router=router)

    try:
        await session_manager.remove(session_obj.meta.identifier)
    except SessionException as e:
        log.exception("Failed to remove a session session")
        raise RobotServerError(
            status_code=http_status_codes.HTTP_400_BAD_REQUEST,
            error=Error(
                title="Removal Failed",
                detail=f"Failed to remove session "
                       f"'{session_id}': {str(e)}.",
            )
        )

    return route_models.SessionResponse(
        data=ResponseDataModel.create(
            attributes=session_obj.get_response_model(),
            resource_id=session_id),
        links={
            "POST": ResourceLink(href=router.url_path_for(
                create_session_handler.__name__)),
        }
    )


@router.get("/sessions/{session_id}",
            description="Get session",
            response_model_exclude_unset=True,
            response_model=route_models.SessionResponse)
async def get_session_handler(
        session_id: route_models.IdentifierType,
        session_manager: SessionManager = Depends(get_session_manager))\
        -> route_models.SessionResponse:
    session_obj = get_session(manager=session_manager,
                              session_id=session_id,
                              api_router=router)

    return route_models.SessionResponse(
        data=ResponseDataModel.create(
            attributes=session_obj.get_response_model(),
            resource_id=session_id),
        links=get_valid_session_links(session_id, router)
    )


@router.get("/sessions",
            description="Get all the sessions",
            response_model_exclude_unset=True,
            response_model=route_models.MultiSessionResponse)
async def get_sessions_handler(
        session_type: route_models.SessionType = Query(
            None,
            description="Will limit the results to only this session type"),
        session_manager: SessionManager = Depends(get_session_manager)) \
        -> route_models.MultiSessionResponse:
    """Get multiple sessions"""
    sessions = session_manager.get(session_type=session_type)
    return route_models.MultiSessionResponse(
        data=[ResponseDataModel.create(
            attributes=session.get_response_model(),
            resource_id=session.meta.identifier) for session in sessions
        ]
    )


@router.post("/sessions/{session_id}/commands/execute",
             description="Create and execute a command immediately",
             response_model_exclude_unset=True,
             response_model=route_models.CommandResponse)
async def session_command_execute_handler(
        session_id: route_models.IdentifierType,
        command_request: route_models.CommandRequest,
        session_manager: SessionManager = Depends(get_session_manager),
) -> route_models.CommandResponse:
    """
    Execute a session command
    """
    session_obj = get_session(manager=session_manager,
                              session_id=session_id,
                              api_router=router)
    if not session_manager.is_active(session_obj.meta.identifier):
        raise RobotServerError(
            status_code=http_status_codes.HTTP_403_FORBIDDEN,
            error=Error(
                title=f"Session '{session_id}' is not active",
                detail="Only the active session can execute commands",
            )
        )

    try:
        command = create_command(command_request.data.attributes.command,
                                 command_request.data.attributes.data)
        command_result = await session_obj.command_executor.execute(command)
        log.debug(f"Command completed {command}")
    except SessionCommandException as e:
        log.exception("Failed to execute command")
        raise RobotServerError(
            status_code=http_status_codes.HTTP_400_BAD_REQUEST,
            error=Error(
                title="Command execution error",
                detail=str(e),
            )
        )

    return route_models.CommandResponse(
        data=ResponseDataModel.create(
            attributes=route_models.SessionCommand(
                data=command_result.content.data,
                command=command_result.content.name,
                status=command_result.result.status,
                created_at=command_result.meta.created_at,
                started_at=command_result.result.started_at,
                completed_at=command_result.result.completed_at
            ),
            resource_id=command_result.meta.identifier
        ),
        links=get_valid_session_links(session_id, router)
    )


def get_valid_session_links(session_id: route_models.IdentifierType,
                            api_router: APIRouter) \
        -> typing.Dict[str, ResourceLink]:
    """Get the valid links for a session"""
    return {
        "GET": ResourceLink(href=api_router.url_path_for(
            get_session_handler.__name__,
            session_id=session_id)),
        "POST": ResourceLink(href=api_router.url_path_for(
            session_command_execute_handler.__name__,
            session_id=session_id)),
        "DELETE": ResourceLink(href=api_router.url_path_for(
            delete_session_handler.__name__,
            session_id=session_id)),
    }
