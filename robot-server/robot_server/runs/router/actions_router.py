"""Router for /runs actions endpoints."""
from fastapi import APIRouter, Depends, status
from datetime import datetime
from typing_extensions import Literal

from robot_server.errors import ErrorDetails, ErrorResponse
from robot_server.service.dependencies import get_current_time, get_unique_id
from robot_server.service.json_api import RequestModel, ResponseModel

from ..run_store import RunStore, RunNotFoundError
from ..run_view import RunView
from ..action_models import RunAction, RunActionType, RunActionCreateData
from ..engine_store import EngineStore, EngineMissingError
from ..dependencies import get_run_store, get_engine_store
from .base_router import RunNotFound

actions_router = APIRouter()


class RunActionNotAllowed(ErrorDetails):
    """An error if one tries to issue an unsupported run action."""

    id: Literal["RunActionNotAllowed"] = "RunActionNotAllowed"
    title: str = "Run Action Not Allowed"


@actions_router.post(
    path="/runs/{runId}/actions",
    summary="Issue a control action to the run",
    description=("Provide an action in order to control execution of the run."),
    status_code=status.HTTP_201_CREATED,
    response_model=ResponseModel[RunAction],
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse[RunActionNotAllowed]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse[RunNotFound]},
    },
)
async def create_run_action(
    runId: str,
    request_body: RequestModel[RunActionCreateData],
    run_view: RunView = Depends(RunView),
    run_store: RunStore = Depends(get_run_store),
    engine_store: EngineStore = Depends(get_engine_store),
    action_id: str = Depends(get_unique_id),
    created_at: datetime = Depends(get_current_time),
) -> ResponseModel[RunAction]:
    """Create a run control action.

    Arguments:
        runId: Run ID pulled from the URL.
        request_body: Input payload from the request body.
        run_view: Resource model builder.
        run_store: Run storage interface.
        engine_store: Protocol engine and runner storage.
        action_id: Generated ID to assign to the control action.
        created_at: Timestamp to attach to the control action.
    """
    try:
        prev_run = run_store.get(run_id=runId)

        action, next_run = run_view.with_action(
            run=prev_run,
            action_id=action_id,
            action_data=request_body.data,
            created_at=created_at,
        )

        # TODO(mc, 2021-07-06): add a dependency to verify that a given
        # action is allowed
        if action.actionType == RunActionType.PLAY:
            engine_store.runner.play()
        elif action.actionType == RunActionType.PAUSE:
            engine_store.runner.pause()
        if action.actionType == RunActionType.STOP:
            await engine_store.runner.stop()

    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)
    except EngineMissingError as e:
        raise RunActionNotAllowed(detail=str(e)).as_error(status.HTTP_400_BAD_REQUEST)

    run_store.upsert(run=next_run)

    return ResponseModel(data=action)
