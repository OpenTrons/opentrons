"""Router for /runs/{runId}/errorRecoveryPolicy endpoints."""


from textwrap import dedent
from typing import Annotated

from fastapi import status, APIRouter, Depends

from robot_server.errors.error_responses import ErrorBody
from robot_server.service.json_api.request import RequestModel
from robot_server.service.json_api.response import PydanticResponse, SimpleEmptyBody

from .base_router import RunStopped
from ..dependencies import get_run_data_manager
from ..run_data_manager import RunDataManager, RunNotCurrentError
from ..error_recovery_models import ErrorRecoveryPolicy


error_recovery_policy_router = APIRouter()


@PydanticResponse.wrap_route(
    error_recovery_policy_router.put,
    path="/runs/{runId}/errorRecoveryPolicy",
    summary="Set a run's error recovery policy",
    description=dedent(
        """
        Update how to handle different kinds of command failures.

        For this to have any effect, error recovery must also be enabled globally.
        See `PATCH /errorRecovery/settings`.
        """
    ),
    responses={
        status.HTTP_200_OK: {"model": SimpleEmptyBody},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunStopped]},
    },
)
async def put_error_recovery_policy(
    runId: str,
    request_body: RequestModel[ErrorRecoveryPolicy],
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
) -> PydanticResponse[SimpleEmptyBody]:
    """Create run polices.

    Arguments:
        runId: Run ID pulled from URL.
        request_body:  Request body with run policies data.
        run_data_manager: Current and historical run data management.
    """
    rules = request_body.data.policyRules
    try:
        run_data_manager.set_error_recovery_rules(run_id=runId, rules=rules)
    except RunNotCurrentError as e:
        raise RunStopped(detail=str(e)).as_error(status.HTTP_409_CONFLICT) from e

    return await PydanticResponse.create(
        content=SimpleEmptyBody.construct(),
        status_code=status.HTTP_200_OK,
    )
