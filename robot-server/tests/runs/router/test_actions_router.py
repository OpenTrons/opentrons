"""Tests for the /runs router."""
import pytest
from datetime import datetime
from decoy import Decoy, matchers

from opentrons.protocol_engine.errors import ProtocolEngineStoppedError

from robot_server.errors import ApiError
from robot_server.service.json_api import RequestModel
from robot_server.service.task_runner import TaskRunner
from robot_server.runs.engine_store import EngineStore
from robot_server.runs.run_store import (
    RunStore,
    RunNotFoundError,
    RunResource,
)

from robot_server.runs.action_models import (
    RunAction,
    RunActionType,
    RunActionCreate,
)

from robot_server.runs.router.actions_router import create_run_action


@pytest.fixture
def task_runner(decoy: Decoy) -> TaskRunner:
    """Get a mock background TaskRunner."""
    return decoy.mock(cls=TaskRunner)


@pytest.fixture
def prev_run(decoy: Decoy, mock_run_store: RunStore) -> RunResource:
    """Get an existing run resource that's in the store."""
    run = RunResource(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1),
        actions=[],
        is_current=True,
    )

    decoy.when(mock_run_store.get(run_id="run-id")).then_return(run)

    return run


async def test_create_play_action_to_start_run(
    decoy: Decoy,
    mock_run_store: RunStore,
    mock_engine_store: EngineStore,
    prev_run: RunResource,
    task_runner: TaskRunner,
) -> None:
    """It should handle a play action that start the runner."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )

    decoy.when(mock_engine_store.runner.was_started()).then_return(False)

    result = await create_run_action(
        runId="run-id",
        request_body=RequestModel(data=RunActionCreate(actionType=RunActionType.PLAY)),
        run_store=mock_run_store,
        engine_store=mock_engine_store,
        action_id="action-id",
        created_at=datetime(year=2022, month=2, day=2),
        task_runner=task_runner,
    )

    assert result.content.data == action
    assert result.status_code == 201

    decoy.verify(
        task_runner.run(mock_engine_store.runner.run),
        mock_run_store.insert_action(run_id=prev_run.run_id, action=action),
    )


async def test_create_play_action_to_resume_run(
    decoy: Decoy,
    mock_run_store: RunStore,
    mock_engine_store: EngineStore,
    prev_run: RunResource,
) -> None:
    """It should handle a play action that resumes the runner."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )

    decoy.when(mock_engine_store.runner.was_started()).then_return(True)

    result = await create_run_action(
        runId="run-id",
        request_body=RequestModel(data=RunActionCreate(actionType=RunActionType.PLAY)),
        run_store=mock_run_store,
        engine_store=mock_engine_store,
        action_id="action-id",
        created_at=datetime(year=2022, month=2, day=2),
    )

    assert result.content.data == action
    assert result.status_code == 201

    decoy.verify(
        mock_engine_store.runner.play(),
        mock_run_store.insert_action(run_id=prev_run.run_id, action=action),
    )


async def test_create_play_action_with_missing_id(
    decoy: Decoy,
    mock_run_store: RunStore,
) -> None:
    """It should 404 if the run ID does not exist."""
    not_found_error = RunNotFoundError(run_id="run-id")

    decoy.when(mock_run_store.get(run_id="run-id")).then_raise(not_found_error)

    with pytest.raises(ApiError) as exc_info:
        await create_run_action(
            runId="run-id",
            request_body=RequestModel(
                data=RunActionCreate(actionType=RunActionType.PLAY)
            ),
            run_store=mock_run_store,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "RunNotFound"


async def test_create_play_action_not_allowed(
    decoy: Decoy,
    mock_run_store: RunStore,
    mock_engine_store: EngineStore,
    prev_run: RunResource,
    task_runner: TaskRunner,
) -> None:
    """It should 409 if the runner is not able to handle the action."""
    decoy.when(mock_engine_store.runner.was_started()).then_return(True)

    decoy.when(mock_engine_store.runner.play()).then_raise(
        ProtocolEngineStoppedError("oh no")
    )

    with pytest.raises(ApiError) as exc_info:
        await create_run_action(
            runId="run-id",
            request_body=RequestModel(
                data=RunActionCreate(actionType=RunActionType.PLAY)
            ),
            run_store=mock_run_store,
            engine_store=mock_engine_store,
            task_runner=task_runner,
            action_id="action-id",
            created_at=datetime(year=2022, month=2, day=2),
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunActionNotAllowed"

    decoy.verify(
        mock_run_store.insert_action(
            run_id=matchers.Anything(), action=matchers.Anything()
        ),
        times=0,
    )


async def test_create_run_action_not_current(
    decoy: Decoy,
    mock_run_store: RunStore,
    mock_engine_store: EngineStore,
) -> None:
    """It should 409 if the run is not current."""
    prev_run = RunResource(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1),
        actions=[],
        is_current=False,
    )

    decoy.when(mock_run_store.get(run_id="run-id")).then_return(prev_run)

    with pytest.raises(ApiError) as exc_info:
        await create_run_action(
            runId="run-id",
            request_body=RequestModel(
                data=RunActionCreate(actionType=RunActionType.PLAY)
            ),
            run_store=mock_run_store,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunStopped"
    decoy.verify(
        mock_run_store.insert_action(
            run_id=matchers.Anything(), action=matchers.Anything()
        ),
        times=0,
    )


async def test_create_pause_action(
    decoy: Decoy,
    mock_run_store: RunStore,
    mock_engine_store: EngineStore,
    prev_run: RunResource,
) -> None:
    """It should handle a pause action."""
    action = RunAction(
        actionType=RunActionType.PAUSE,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )

    result = await create_run_action(
        runId="run-id",
        request_body=RequestModel(data=RunActionCreate(actionType=RunActionType.PAUSE)),
        run_store=mock_run_store,
        engine_store=mock_engine_store,
        action_id="action-id",
        created_at=datetime(year=2022, month=2, day=2),
    )

    assert result.content.data == action
    assert result.status_code == 201

    decoy.verify(
        mock_engine_store.runner.pause(),
        mock_run_store.insert_action(run_id=prev_run.run_id, action=action),
    )


async def test_create_stop_action(
    decoy: Decoy,
    mock_run_store: RunStore,
    mock_engine_store: EngineStore,
    prev_run: RunResource,
    task_runner: TaskRunner,
) -> None:
    """It should handle a stop action."""
    action = RunAction(
        actionType=RunActionType.STOP,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )

    result = await create_run_action(
        runId="run-id",
        request_body=RequestModel(data=RunActionCreate(actionType=RunActionType.STOP)),
        run_store=mock_run_store,
        engine_store=mock_engine_store,
        task_runner=task_runner,
        action_id="action-id",
        created_at=datetime(year=2022, month=2, day=2),
    )

    assert result.content.data == action
    assert result.status_code == 201

    decoy.verify(
        task_runner.run(mock_engine_store.runner.stop),
        mock_run_store.insert_action(run_id=prev_run.run_id, action=action),
    )
