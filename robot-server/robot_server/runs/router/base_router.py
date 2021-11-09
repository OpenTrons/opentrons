"""Base router for /runs endpoints.

Contains routes dealing primarily with `Run` models.
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
    """An error if a given run is not found."""

    id: Literal["RunNotFound"] = "RunNotFound"
    title: str = "Run Not Found"


class RunAlreadyActive(ErrorDetails):
    """An error if one tries to create a new run while one is already active."""

    id: Literal["RunAlreadyActive"] = "RunAlreadyActive"
    title: str = "Run Already Active"


class RunNotIdle(ErrorDetails):
    """An error if one tries to delete a run that is not idle."""

    id: Literal["RunNotIdle"] = "RunNotIdle"
    title: str = "Run is not idle."
    detail: str = (
        "Run is currently active. Allow the run to finish or"
        " stop it with a `stop` action before attempting to delete it."
    )


class RunStopped(ErrorDetails):
    """An error if one tries to modify a stopped run."""

    id: Literal["RunStopped"] = "RunStopped"
    title: str = "Run Stopped"


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
    run_view: RunView = Depends(RunView),
    run_store: RunStore = Depends(get_run_store),
    engine_store: EngineStore = Depends(get_engine_store),
    protocol_store: ProtocolStore = Depends(get_protocol_store),
    run_id: str = Depends(get_unique_id),
    created_at: datetime = Depends(get_current_time),
    task_runner: TaskRunner = Depends(TaskRunner),
) -> ResponseModel[Run]:
    """Create a new run.

    Arguments:
        request_body: Optional request body with run creation data.
        run_view: Run model construction interface.
        run_store: Run storage interface.
        engine_store: ProtocolEngine storage and control.
        protocol_store: Protocol resource storage.
        run_id: Generated ID to assign to the run.
        created_at: Timestamp to attach to created run.
        task_runner: Background task runner.
    """
    create_data = request_body.data if request_body is not None else None
    run = run_view.as_resource(
        run_id=run_id,
        created_at=created_at,
        create_data=create_data,
    )
    protocol_id = None

    if isinstance(create_data, ProtocolRunCreateData):
        protocol_id = create_data.createParams.protocolId

    try:
        engine_state = await engine_store.create(run_id=run_id)

        if protocol_id is not None:
            protocol_resource = protocol_store.get(protocol_id=protocol_id)
            engine_store.runner.load(protocol_resource)

        # TODO(mc, 2021-08-05): capture errors from `runner.join` and place
        # them in the run resource
        task_runner.run(engine_store.runner.join)

    except ProtocolNotFoundError as e:
        raise ProtocolNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    except EngineConflictError as e:
        raise RunAlreadyActive(detail=str(e)).as_error(status.HTTP_409_CONFLICT)

    run_store.upsert(run=run)

    data = run_view.as_response(
        run=run,
        commands=engine_state.commands.get_all(),
        pipettes=engine_state.pipettes.get_all(),
        labware=engine_state.labware.get_all(),
        engine_status=engine_state.commands.get_status(),
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
    run_view: RunView = Depends(RunView),
    run_store: RunStore = Depends(get_run_store),
    engine_store: EngineStore = Depends(get_engine_store),
) -> MultiResponseModel[Run]:
    """Get all runs.

    Args:
        run_view: Run model construction interface.
        run_store: Run storage interface.
        engine_store: ProtocolEngine storage and control.
    """
    data = []

    for run in run_store.get_all():
        run_id = run.run_id
        engine_state = engine_store.get_state(run_id)
        run_data = run_view.as_response(
            run=run,
            commands=engine_state.commands.get_all(),
            pipettes=engine_state.pipettes.get_all(),
            labware=engine_state.labware.get_all(),
            engine_status=engine_state.commands.get_status(),
        )

        data.append(run_data)

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
    run_view: RunView = Depends(RunView),
    run_store: RunStore = Depends(get_run_store),
    engine_store: EngineStore = Depends(get_engine_store),
) -> ResponseModel[Run]:
    """Get a run by its ID.

    Args:
        runId: Run ID pulled from URL.
        run_view: Run model construction interface.
        run_store: Run storage interface.
        engine_store: ProtocolEngine storage and control.
    """
    try:
        run = run_store.get(run_id=runId)
    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    engine_state = engine_store.get_state(run.run_id)

    data = run_view.as_response(
        run=run,
        commands=engine_state.commands.get_all(),
        pipettes=engine_state.pipettes.get_all(),
        labware=engine_state.labware.get_all(),
        engine_status=engine_state.commands.get_status(),
    )

    return ResponseModel(data=data)


@base_router.delete(
    path="/runs/{runId}",
    summary="Delete a run",
    description="Delete a specific run by its unique identifier.",
    status_code=status.HTTP_200_OK,
    response_model=EmptyResponseModel,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse[RunNotFound]}},
)
async def remove_run_by_id(
    runId: str,
    run_store: RunStore = Depends(get_run_store),
    engine_store: EngineStore = Depends(get_engine_store),
) -> EmptyResponseModel:
    """Delete a run by its ID.

    Arguments:
        runId: Run ID pulled from URL.
        run_store: Run storage interface.
        engine_store: ProtocolEngine storage and control.
    """
    try:
        engine_state = engine_store.get_state(runId)
    except EngineMissingError:
        pass
    else:
        if not engine_state.commands.get_is_stopped():
            raise RunNotIdle().as_error(status.HTTP_409_CONFLICT)

    try:
        engine_store.clear()
        run_store.remove(run_id=runId)
    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    return EmptyResponseModel()
