"""Base router for /runs endpoints.

Contains routes dealing primarily with `Run` models.
"""
import logging
from datetime import datetime
from textwrap import dedent
from typing import Optional
from typing_extensions import Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from robot_server.errors import ErrorDetails, ErrorBody
from robot_server.service.dependencies import get_current_time, get_unique_id

from robot_server.service.json_api import (
    RequestModel,
    SimpleBody,
    SimpleEmptyBody,
    ResourceLink,
    PydanticResponse,
    Body,
)

from ...runs.run_models import RunNotFoundError
from ..maintenance_run_models import (
    MaintenanceRun,
    MaintenanceRunCreate,
)
from ..maintenance_engine_store import EngineConflictError
from ..maintenance_run_data_manager import MaintenanceRunDataManager, RunNotCurrentError
from ..dependencies import get_maintenance_run_data_manager


log = logging.getLogger(__name__)
base_router = APIRouter()


class RunNotFound(ErrorDetails):
    """An error if a given run is not found."""

    id: Literal["RunNotFound"] = "RunNotFound"
    title: str = "Run Not Found"


class NoCurrentRunFound(ErrorDetails):
    """An error if there is no current run to fetch."""

    id: Literal["NoCurrentRunFound"] = "NoCurrentRunFound"
    title: str = "No current run found"


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
        " stop it with a `stop` action before attempting to modify it."
    )


class RunStopped(ErrorDetails):
    """An error if one tries to modify a stopped run."""

    id: Literal["RunStopped"] = "RunStopped"
    title: str = "Run Stopped"


class AllRunsLinks(BaseModel):
    """Links returned along with a collection of runs."""

    current: Optional[ResourceLink] = Field(
        None,
        description="Path to the currently active run, if a run is active.",
    )


async def get_run_data_from_url(
    runId: str,
    run_data_manager: MaintenanceRunDataManager = Depends(
        get_maintenance_run_data_manager
    ),
) -> MaintenanceRun:
    """Get the data of a run.

    Args:
        runId: Run ID pulled from URL.
        run_data_manager: Current and historical run data management.
    """
    try:
        run_data = run_data_manager.get(runId)
    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)
    except RunNotCurrentError as e:
        raise RunStopped(detail=str(e)).as_error(status.HTTP_409_CONFLICT) from e

    return run_data


@base_router.post(
    path="/maintenance_runs",
    summary="Create a maintenance run",
    description=dedent(
        """
        Create a new maintenance run to track robot interaction.

        When too many runs already exist, old ones will be automatically deleted
        to make room for the new one.
        """
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[MaintenanceRun]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunAlreadyActive]},
    },
)
async def create_run(
    request_body: Optional[RequestModel[MaintenanceRunCreate]] = None,
    run_data_manager: MaintenanceRunDataManager = Depends(
        get_maintenance_run_data_manager
    ),
    run_id: str = Depends(get_unique_id),
    created_at: datetime = Depends(get_current_time),
) -> PydanticResponse[SimpleBody[MaintenanceRun]]:
    """Create a new run.

    Arguments:
        request_body: Optional request body with run creation data.
        run_data_manager: Current and historical run data management.
        run_id: Generated ID to assign to the run.
        created_at: Timestamp to attach to created run.
        run_auto_deleter: An interface to delete old resources to make room for
            the new run.
    """
    offsets = request_body.data.labwareOffsets if request_body is not None else []

    try:
        run_data = await run_data_manager.create(
            run_id=run_id,
            created_at=created_at,
            labware_offsets=offsets,
        )
    except EngineConflictError as e:
        raise RunAlreadyActive(detail=str(e)).as_error(status.HTTP_409_CONFLICT) from e

    log.info(f'Created an empty run "{run_id}"".')

    return await PydanticResponse.create(
        content=SimpleBody.construct(data=run_data),
        status_code=status.HTTP_201_CREATED,
    )


@base_router.get(
    path="/maintenance_runs/{runId}",
    summary="Get a maintenance run",
    description="Get a specific run by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[MaintenanceRun]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunStopped]},
    },
)
async def get_run(
    run_data: MaintenanceRun = Depends(get_run_data_from_url),
) -> PydanticResponse[SimpleBody[MaintenanceRun]]:
    """Get a run by its ID.

    Args:
        run_data: Data of the run specified in the runId url parameter.
    """
    return await PydanticResponse.create(
        content=SimpleBody.construct(data=run_data),
        status_code=status.HTTP_200_OK,
    )


@base_router.get(
    path="/maintenance_runs/current_run",
    summary="Get the current maintenance run",
    description="Get the currently active maintenance run, if any",
    responses={
        status.HTTP_200_OK: {"model": Body[MaintenanceRun, AllRunsLinks]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[NoCurrentRunFound]},
    },
)
async def get_current_run(
    run_data_manager: MaintenanceRunDataManager = Depends(
        get_maintenance_run_data_manager
    ),
) -> PydanticResponse[Body[MaintenanceRun, AllRunsLinks]]:
    """Get the current maintenance run.

    Args:
        run_data_manager: Current run data management.
    """
    current_run_id = run_data_manager.current_run_id
    if current_run_id is None:
        raise NoCurrentRunFound(
            detail="No maintenance run currently running."
        ).as_error(status.HTTP_404_NOT_FOUND)

    data = run_data_manager.get(current_run_id)
    links = AllRunsLinks(
        current=ResourceLink.construct(href=f"/maintenance_runs/{current_run_id}")
    )

    return await PydanticResponse.create(
        content=Body.construct(data=data, links=links),
        status_code=status.HTTP_200_OK,
    )


@base_router.delete(
    path="/maintenance_runs/{runId}",
    summary="Delete a run",
    description="Delete a specific run by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"model": SimpleEmptyBody},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def remove_run(
    runId: str,
    run_data_manager: MaintenanceRunDataManager = Depends(
        get_maintenance_run_data_manager
    ),
) -> PydanticResponse[SimpleEmptyBody]:
    """Delete a run by its ID.

    Arguments:
        runId: Run ID pulled from URL.
        run_data_manager: Current and historical run data management.
    """
    try:
        await run_data_manager.delete(runId)

    except EngineConflictError as e:
        raise RunNotIdle().as_error(status.HTTP_409_CONFLICT) from e

    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e

    return await PydanticResponse.create(
        content=SimpleEmptyBody.construct(),
        status_code=status.HTTP_200_OK,
    )
