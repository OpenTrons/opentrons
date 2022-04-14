"""Tests for robot_server.runs.run_store."""
import pytest
from datetime import datetime
from typing import Generator

from sqlalchemy.engine import Engine as SQLEngine
from pathlib import Path

from robot_server.runs.run_store import RunStore, RunResource, RunNotFoundError
from robot_server.runs.action_models import RunAction, RunActionType
from robot_server.persistence import open_db_no_cleanup, add_tables_to_db


@pytest.fixture
def sql_engine(tmp_path: Path) -> Generator[SQLEngine, None, None]:
    """Return a set-up database to back the store."""
    db_file_path = tmp_path / "test.db"
    sql_engine = open_db_no_cleanup(db_file_path=db_file_path)
    try:
        add_tables_to_db(sql_engine)
        yield sql_engine
    finally:
        sql_engine.dispose()


@pytest.fixture
def subject(sql_engine: SQLEngine) -> RunStore:
    """Get a ProtocolStore test subject."""
    return RunStore(sql_engine=sql_engine)


def test_add_run(subject: RunStore) -> None:
    """It should be able to add a new run to the store."""
    run = RunResource(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime.now(),
        actions=[],
        is_current=True,
    )
    result = subject.insert(run)

    assert result == run


def test_insert_actions_missing_run_id(subject: RunStore) -> None:
    """Should not be able to insert an action with a run id that does not exist."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )

    with pytest.raises(RunNotFoundError, match="missing-run-id"):
        subject.insert_action(run_id="missing-run-id", action=action)


def test_update_active_run(subject: RunStore) -> None:
    """It should be able to update a run in the store."""
    run = RunResource(
        run_id="identical-run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, hour=1, minute=1, second=1),
        actions=[],
        is_current=False,
    )
    updated_run = RunResource(
        run_id="identical-run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, hour=1, minute=1, second=1),
        actions=[],
        is_current=True,
    )

    subject.insert(run)

    result = subject.update_active_run(
        run_id=run.run_id, is_current=updated_run.is_current
    )
    assert result.is_current == updated_run.is_current


def test_update_active_run_run_not_found(subject: RunStore) -> None:
    """It should raise RunNotFound error."""
    with pytest.raises(RunNotFoundError, match="run-id"):
        subject.update_active_run(run_id="run-id", is_current=True)


def test_get_run_no_actions(subject: RunStore) -> None:
    """It can get a previously stored run entry."""
    run = RunResource(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime.now(),
        actions=[],
        is_current=False,
    )
    subject.insert(run)
    result = subject.get(run_id="run-id")

    assert result == run


def test_get_run(subject: RunStore) -> None:
    """It can get a previously stored run entry."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )
    run = RunResource(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, hour=1, minute=1, second=1),
        actions=[],
        is_current=False,
    )
    update_run = RunResource(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, hour=1, minute=1, second=1),
        actions=[action],
        is_current=False,
    )

    subject.insert(run)
    subject.insert_action(run.run_id, action)
    result = subject.get(run_id="run-id")

    assert result == update_run


def test_get_run_missing(subject: RunStore) -> None:
    """It raises if the run does not exist."""
    with pytest.raises(RunNotFoundError, match="run-id"):
        subject.get(run_id="run-id")


def test_get_all_runs(subject: RunStore) -> None:
    """It can get all created runs."""
    run_1 = RunResource(
        run_id="run-id-1",
        protocol_id=None,
        created_at=datetime.now(),
        actions=[],
        is_current=False,
    )
    run_2 = RunResource(
        run_id="run-id-2",
        protocol_id=None,
        created_at=datetime.now(),
        actions=[],
        is_current=True,
    )

    subject.insert(run_1)
    subject.insert(run_2)

    result = subject.get_all()

    assert result == [run_1, run_2]


def test_remove_run(subject: RunStore) -> None:
    """It can remove and return a previously stored run entry."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )
    run = RunResource(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime.now(),
        actions=[action],
        is_current=True,
    )

    subject.insert(run)
    subject.insert_action(run_id="run-id", action=action)
    result = subject.remove(run_id="run-id")

    assert result == run
    assert subject.get_all() == []


def test_remove_run_missing_id(subject: RunStore) -> None:
    """It raises if the run does not exist."""
    with pytest.raises(RunNotFoundError, match="run-id"):
        subject.remove(run_id="run-id")


def test_add_run_current_run_deactivates(subject: RunStore) -> None:
    """Adding a current run should mark all others as not current."""
    actions = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )
    run_1 = RunResource(
        run_id="run-id-1",
        protocol_id=None,
        created_at=datetime.now(),
        actions=[actions],
        is_current=True,
    )

    run_2 = RunResource(
        run_id="run-id-2",
        protocol_id=None,
        created_at=datetime.now(),
        actions=[],
        is_current=True,
    )

    subject.insert(run_1)
    subject.insert(run_2)

    assert subject.get("run-id-1").is_current is False
    assert subject.get("run-id-2").is_current is True


def test_update_active_run_deactivates(subject: RunStore) -> None:
    """Updating active run should deactivate other runs."""
    actions = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id",
    )
    run_1 = RunResource(
        run_id="run-id-1",
        protocol_id=None,
        created_at=datetime.now(),
        actions=[actions],
        is_current=True,
    )
    run_2 = RunResource(
        run_id="run-id-2",
        protocol_id=None,
        created_at=datetime.now(),
        actions=[],
        is_current=True,
    )

    subject.insert(run_1)
    subject.insert(run_2)
    subject.update_active_run(run_1.run_id, True)

    assert subject.get("run-id-1").is_current is True
    assert subject.get("run-id-2").is_current is False


def test_insert_actions_no_run(subject: RunStore) -> None:
    """Insert actions with a run that dosent exist should raise an exception."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2),
        id="action-id-1",
    )

    with pytest.raises(Exception):
        subject.insert_action(run_id="run-id-996", action=action)
