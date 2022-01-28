"""Router for /runs commands endpoints."""
from fastapi import APIRouter, Depends, status
from typing import Union
from typing_extensions import Literal

from opentrons.protocol_engine import commands as pe_commands, errors as pe_errors

from robot_server.errors import ErrorDetails, ErrorBody
from robot_server.service.json_api import (
    RequestModel,
    SimpleBody,
    SimpleMultiBody,
    PydanticResponse,
)

from ..run_models import Run, RunCommandSummary
from ..engine_store import EngineStore
from ..dependencies import get_engine_store
from .base_router import RunNotFound, RunStopped, get_run_data_from_url

commands_router = APIRouter()


class CommandNotFound(ErrorDetails):
    """An error if a given run command is not found."""

    id: Literal["CommandNotFound"] = "CommandNotFound"
    title: str = "Run Command Not Found"


# todo(mm, 2021-09-23): Should this accept a list of commands, instead of just one?
@commands_router.post(
    path="/runs/{runId}/commands",
    summary="Enqueue a protocol command",
    description=(
        "Add a single protocol command to the run. "
        "The command is placed at the back of the queue."
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[pe_commands.Command]},
        status.HTTP_400_BAD_REQUEST: {"model": ErrorBody[RunStopped]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def create_run_command(
    request_body: RequestModel[pe_commands.CommandCreate],
    engine_store: EngineStore = Depends(get_engine_store),
    run: Run = Depends(get_run_data_from_url),
) -> PydanticResponse[SimpleBody[pe_commands.Command]]:
    """Enqueue a protocol command.

    Arguments:
        request_body: The request containing the command that the client wants
            to enqueue.
        engine_store: Used to retrieve the `ProtocolEngine` on which the new
            command will be enqueued.
        run: Run response model, provided by the route handler for
            `GET /runs/{runId}`. Present to ensure 404 if run
            not found.
    """
    if not run.current:
        raise RunStopped(detail=f"Run {run.id} is not the current run").as_error(
            status.HTTP_400_BAD_REQUEST
        )

    command = engine_store.engine.add_command(request_body.data)

    return await PydanticResponse.create(
        content=SimpleBody.construct(data=command),
        status_code=status.HTTP_201_CREATED,
    )


@commands_router.get(
    path="/runs/{runId}/commands",
    summary="Get a list of all protocol commands in the run",
    description=(
        "Get a list of all commands in the run and their statuses. "
        "This endpoint returns command summaries. Use "
        "`GET /runs/{runId}/commands/{commandId}` to get all "
        "information available for a given command."
    ),
    responses={
        status.HTTP_200_OK: {"model": SimpleMultiBody[RunCommandSummary]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def get_run_commands(
    engine_store: EngineStore = Depends(get_engine_store),
    run: Run = Depends(get_run_data_from_url),
) -> PydanticResponse[SimpleMultiBody[RunCommandSummary]]:
    """Get a summary of all commands in a run.

    Arguments:
        engine_store: Protocol engine and runner storage.
        run: Run response model, provided by the route handler for
            `GET /runs/{runId}`
    """
    data = [
        RunCommandSummary.construct(
            id=c.id,
            key=c.key,
            commandType=c.commandType,
            status=c.status,
            createdAt=c.createdAt,
            startedAt=c.startedAt,
            completedAt=c.completedAt,
            errorId=c.errorId,
        )
        for c in engine_store.get_state(run.id).commands.get_all()
    ]

    return await PydanticResponse.create(
        content=SimpleMultiBody.construct(data=data),
        status_code=status.HTTP_200_OK,
    )


@commands_router.get(
    path="/runs/{runId}/commands/{commandId}",
    summary="Get full details about a specific command in the run",
    description=(
        "Get a command along with any associated payload, result, and "
        "execution information."
    ),
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[pe_commands.Command]},
        status.HTTP_404_NOT_FOUND: {
            "model": Union[ErrorBody[RunNotFound], ErrorBody[CommandNotFound]]
        },
    },
)
async def get_run_command(
    commandId: str,
    engine_store: EngineStore = Depends(get_engine_store),
    run: Run = Depends(get_run_data_from_url),
) -> PydanticResponse[SimpleBody[pe_commands.Command]]:
    """Get a specific command from a run.

    Arguments:
        commandId: Command identifier, pulled from route parameter.
        engine_store: Protocol engine and runner storage.
        run: Run response model, provided by the route handler for
            `GET /run/{runId}`. Present to ensure 404 if run
            not found.
    """
    engine_state = engine_store.get_state(run.id)
    try:
        command = engine_state.commands.get(commandId)
    except pe_errors.CommandDoesNotExistError as e:
        raise CommandNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    return await PydanticResponse.create(
        content=SimpleBody(data=command),
        status_code=status.HTTP_200_OK,
    )
