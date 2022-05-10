"""Tests for the /runs router."""
import pytest
from datetime import datetime
from decoy import Decoy, matchers

from opentrons.protocol_engine.types import EngineStatus

from robot_server.errors import ApiError
from robot_server.service.json_api import RequestModel
from robot_server.service.task_runner import TaskRunner
from robot_server.runs.run_store import (
    RunStore,
    RunResource,
)
from robot_server.runs.run_data_manager import RunDataManager

from robot_server.runs.action_models import (
    RunAction,
    RunActionType,
    RunActionCreate,
)
from robot_server.runs.run_models import Run

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
    mock_run_data_manager: RunDataManager,
    prev_run: Run,
    task_runner: TaskRunner,
) -> None:
    """It should handle a play action that start the runner."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )

    # decoy.when(mock_run_data_manager.runner.was_started()).then_return(False)
    decoy.when(mock_run_data_manager.get("run-id")).then_return(prev_run)
    result = await create_run_action(
        runId="run-id",
        request_body=RequestModel(data=RunActionCreate(actionType=RunActionType.PLAY)),
        run_data_manager=mock_run_data_manager,
        action_id="action-id",
        created_at=datetime(year=2022, month=2, day=2),
    )

    assert result.content.data == action
    assert result.status_code == 201

    # run_handler_captor = matchers.Captor()
    #
    # decoy.verify(
    #     task_runner.run(run_handler_captor),
    #     mock_run_data_manager.insert_action(run_id=prev_run.run_id, action=action),
    # )
    #
    # await run_handler_captor.value()
    #
    # decoy.verify(await mock_run_data_manager.runner.run(), times=1)


async def test_create_play_action_to_resume_run(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
    prev_run: RunResource,
) -> None:
    """It should handle a play action that resumes the runner."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )

    # decoy.when(mock_run_data_manager.runner.was_started()).then_return(True)

    result = await create_run_action(
        runId="run-id",
        request_body=RequestModel(data=RunActionCreate(actionType=RunActionType.PLAY)),
        run_data_manager=mock_run_data_manager,
        action_id="action-id",
        created_at=datetime(year=2022, month=2, day=2),
    )

    assert result.content.data == action
    assert result.status_code == 201

    # decoy.verify(
    #     mock_run_data_manager.runner.play(),
    #     mock_run_data_manager.insert_action(run_id=prev_run.run_id, action=action),
    # )


async def test_create_play_action_with_missing_id(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should 404 if the run ID does not exist."""
    with pytest.raises(ApiError) as exc_info:
        await create_run_action(
            runId="run-id",
            request_body=RequestModel(
                data=RunActionCreate(actionType=RunActionType.PLAY)
            ),
            run_data_manager=mock_run_data_manager,
            action_id="action-id",
            created_at=datetime(year=2022, month=2, day=2),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "RunNotFound"


async def test_create_play_action_not_allowed(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
    prev_run: RunResource,
    task_runner: TaskRunner,
) -> None:
    """It should 409 if the runner is not able to handle the action."""
    # decoy.when(mock_run_data_manager.runner.was_started()).then_return(True)
    #
    # decoy.when(mock_run_data_manager.runner.play()).then_raise(
    #     ProtocolEngineStoppedError("oh no")
    # )

    with pytest.raises(ApiError) as exc_info:
        await create_run_action(
            runId="run-id",
            request_body=RequestModel(
                data=RunActionCreate(actionType=RunActionType.PLAY)
            ),
            run_data_manager=mock_run_data_manager,
            action_id="action-id",
            created_at=datetime(year=2022, month=2, day=2),
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunActionNotAllowed"

    # decoy.verify(
    #     mock_run_data_manager.insert_action(
    #         run_id=matchers.Anything(), action=matchers.Anything()
    #     ),
    #     times=0,
    # )


async def test_create_run_action_not_current(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should 409 if the run is not current."""
    prev_run = Run(
        id="run-id",
        protocolId=None,
        createdAt=datetime(year=2021, month=1, day=1),
        actions=[],
        current=False,
        status=EngineStatus.STOPPED,
        errors=[],
        pipettes=[],
        labware=[],
        labwareOffsets=[],
    )

    decoy.when(mock_run_data_manager.get(run_id="run-id")).then_return(prev_run)

    with pytest.raises(ApiError) as exc_info:
        await create_run_action(
            runId="run-id",
            request_body=RequestModel(
                data=RunActionCreate(actionType=RunActionType.PLAY)
            ),
            run_data_manager=mock_run_data_manager,
            action_id="action-id",
            created_at=datetime(year=2022, month=2, day=2),
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunStopped"
    decoy.verify(
        mock_run_data_manager.create_action(
            run_id=matchers.Anything(), run_action=matchers.Anything()
        ),
        times=0,
    )


async def test_create_pause_action(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
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
        run_data_manager=mock_run_data_manager,
        action_id="action-id",
        created_at=datetime(year=2022, month=2, day=2),
    )

    assert result.content.data == action
    assert result.status_code == 201

    # decoy.verify(
    #     mock_engine_store.runner.pause(),
    #     mock_run_store.insert_action(run_id=prev_run.run_id, action=action),
    # )


async def test_create_stop_action(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
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
        run_data_manager=mock_run_data_manager,
        action_id="action-id",
        created_at=datetime(year=2022, month=2, day=2),
    )

    assert result.content.data == action
    assert result.status_code == 201

    # decoy.verify(
    #     task_runner.run(mock_engine_store.runner.stop),
    #     mock_run_store.insert_action(run_id=prev_run.run_id, action=action),
    # )
