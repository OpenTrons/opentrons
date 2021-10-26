"""Base router for /sessions endpoints.

Contains routes dealing primarily with `Session` models.
"""
from fastapi import APIRouter, Depends, status
from datetime import datetime
from typing import Optional
from typing_extensions import Literal

from robot_server.errors import ErrorDetails, ErrorResponse
from robot_server.service.dependencies import get_current_time, get_unique_id
from robot_server.service.task_runner import TaskRunner
from robot_server.service.json_api import (
    ResponseModel,
    EmptyResponseModel,
    MultiResponseModel,
)

from robot_server.protocols import (
    ProtocolStore,
    ProtocolNotFound,
    ProtocolNotFoundError,
    get_protocol_store,
)

from ..run_store import RunStore, RunNotFoundError
from ..run_view import RunView
from ..run_models import Run, ProtocolRunCreateData
from ..schema_models import CreateRunRequest, RunResponse
from ..engine_store import EngineStore, EngineConflictError, EngineMissingError
from ..dependencies import get_run_store, get_engine_store

base_router = APIRouter()


class RunNotFound(ErrorDetails):
    """An error if a given session is not found."""

    id: Literal["RunNotFound"] = "RunNotFound"
    title: str = "Session Not Found"


# TODO(mc, 2021-05-28): evaluate multi-session logic
class RunAlreadyActive(ErrorDetails):
    """An error if one tries to create a new session while one is already active."""

    id: Literal["RunAlreadyActive"] = "RunAlreadyActive"
    title: str = "Session Already Active"


class RunNotIdle(ErrorDetails):
    """An error if one tries to delete a session that is running."""

    id: Literal["RunNotIdle"] = "RunNotIdle"
    title: str = "Run is not idle."
    detail: str = (
        "Run is currently active. Allow the run to finish or"
        " stop it with a `stop` action before attempting to delete it."
    )


@base_router.post(
    path="/runs",
    summary="Create a run",
    description="Create a new run to track robot interaction.",
    status_code=status.HTTP_201_CREATED,
    # TODO(mc, 2021-06-23): mypy >= 0.780 broke Unions as `response_model`
    # see https://github.com/tiangolo/fastapi/issues/2279
    response_model=RunResponse,  # type: ignore[arg-type]
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse[ProtocolNotFound]},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse[RunAlreadyActive]},
    },
)
async def create_run(
    request_body: Optional[CreateRunRequest] = None,
    session_view: RunView = Depends(RunView),
    session_store: RunStore = Depends(get_run_store),
    engine_store: EngineStore = Depends(get_engine_store),
    protocol_store: ProtocolStore = Depends(get_protocol_store),
    session_id: str = Depends(get_unique_id),
    created_at: datetime = Depends(get_current_time),
    task_runner: TaskRunner = Depends(TaskRunner),
) -> ResponseModel[Run]:
    """Create a new session.

    Arguments:
        request_body: Optional request body with session creation data.
        session_view: Session model construction interface.
        session_store: Session storage interface.
        engine_store: ProtocolEngine storage and control.
        protocol_store: Protocol resource storage.
        session_id: Generated ID to assign to the session.
        created_at: Timestamp to attach to created session.
        task_runner: Background task runner.
    """
    create_data = request_body.data if request_body is not None else None
    session = session_view.as_resource(
        session_id=session_id,
        created_at=created_at,
        create_data=create_data,
    )
    protocol_id = None

    if isinstance(create_data, ProtocolRunCreateData):
        protocol_id = create_data.createParams.protocolId

    try:
        await engine_store.create()

        if protocol_id is not None:
            protocol_resource = protocol_store.get(protocol_id=protocol_id)
            engine_store.runner.load(protocol_resource)

        # TODO(mc, 2021-08-05): capture errors from `runner.join` and place
        # them in the session resource
        task_runner.run(engine_store.runner.join)

    except ProtocolNotFoundError as e:
        raise ProtocolNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    except EngineConflictError as e:
        raise RunAlreadyActive(detail=str(e)).as_error(status.HTTP_409_CONFLICT)

    session_store.upsert(session=session)

    data = session_view.as_response(
        session=session,
        commands=engine_store.engine.state_view.commands.get_all(),
        pipettes=engine_store.engine.state_view.pipettes.get_all(),
        labware=engine_store.engine.state_view.labware.get_all(),
        engine_status=engine_store.engine.state_view.commands.get_status(),
    )

    return ResponseModel(data=data)


@base_router.get(
    path="/runs",
    summary="Get all runs",
    description="Get a list of all active and inactive runs.",
    status_code=status.HTTP_200_OK,
    response_model=MultiResponseModel[Run],
)
async def get_runs(
    session_view: RunView = Depends(RunView),
    session_store: RunStore = Depends(get_run_store),
    engine_store: EngineStore = Depends(get_engine_store),
) -> MultiResponseModel[Run]:
    """Get all runs.

    Args:
        session_view: Session model construction interface.
        session_store: Session storage interface.
        engine_store: ProtocolEngine storage and control.
    """
    data = []

    for session in session_store.get_all():
        # TODO(mc, 2021-06-23): add multi-engine support
        session_data = session_view.as_response(
            session=session,
            commands=engine_store.engine.state_view.commands.get_all(),
            pipettes=engine_store.engine.state_view.pipettes.get_all(),
            labware=engine_store.engine.state_view.labware.get_all(),
            engine_status=engine_store.engine.state_view.commands.get_status(),
        )

        data.append(session_data)

    return MultiResponseModel(data=data)


@base_router.get(
    path="/runs/{runId}",
    summary="Get a run",
    description="Get a specific run by its unique identifier.",
    status_code=status.HTTP_200_OK,
    # TODO(mc, 2021-06-23): mypy >= 0.780 broke Unions as `response_model`
    # see https://github.com/tiangolo/fastapi/issues/2279
    response_model=RunResponse,  # type: ignore[arg-type]
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse[RunNotFound]}},
)
async def get_run(
    runId: str,
    session_view: RunView = Depends(RunView),
    session_store: RunStore = Depends(get_run_store),
    engine_store: EngineStore = Depends(get_engine_store),
) -> ResponseModel[Run]:
    """Get a run by its ID.

    Args:
        runId: Run ID pulled from URL.
        session_view: Session model construction interface.
        session_store: Session storage interface.
        engine_store: ProtocolEngine storage and control.
    """
    try:
        session = session_store.get(session_id=runId)
    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    data = session_view.as_response(
        session=session,
        commands=engine_store.engine.state_view.commands.get_all(),
        pipettes=engine_store.engine.state_view.pipettes.get_all(),
        labware=engine_store.engine.state_view.labware.get_all(),
        engine_status=engine_store.engine.state_view.commands.get_status(),
    )

    return ResponseModel(data=data)


@base_router.delete(
    path="/runs/{runId}",
    summary="Delete a session",
    description="Delete a specific session by its unique identifier.",
    status_code=status.HTTP_200_OK,
    response_model=EmptyResponseModel,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse[RunNotFound]}},
)
async def remove_session_by_id(
    runId: str,
    session_store: RunStore = Depends(get_run_store),
    engine_store: EngineStore = Depends(get_engine_store),
) -> EmptyResponseModel:
    """Delete a session by its ID.

    Arguments:
        runId: Session ID pulled from URL.
        session_store: Session storage interface.
        engine_store: ProtocolEngine storage and control.
    """
    try:
        if not engine_store.engine.state_view.commands.get_is_stopped():
            raise RunNotIdle().as_error(status.HTTP_409_CONFLICT)
    except EngineMissingError:
        pass

    try:
        engine_store.clear()
        session_store.remove(session_id=runId)
    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    return EmptyResponseModel()
