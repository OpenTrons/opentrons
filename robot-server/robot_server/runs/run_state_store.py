"""Engine state on-db store."""
import sqlalchemy
from dataclasses import dataclass
from typing import Dict
from pydantic import parse_obj_as

from robot_server.persistence import engine_state_table
from .run_store import RunNotFoundError
from opentrons.protocol_engine import ProtocolRunData


@dataclass(frozen=True)
class RunStateResource:
    """An entry in the run state store, used to construct response models.

    This represents all run engine state derived from ProtocolEngine instance.
    """

    run_id: str
    state: ProtocolRunData
    engine_status: str
    # created_at: datetime


class RunStateStore:
    """Methods for storing and retrieving run resources."""

    def __init__(self, sql_engine: sqlalchemy.engine.Engine) -> None:
        """Initialize a RunStore with sql engine."""
        self._sql_engine = sql_engine

    def insert(self, state: RunStateResource) -> RunStateResource:
        """Insert engine state to db.

        Arguments:
            state: Engine state resource to store.

        Returns:
            The engine state that was added to the store.
        """
        statement = sqlalchemy.insert(engine_state_table).values(
            _convert_state_to_sql_values(state=state)
        )
        with self._sql_engine.begin() as transaction:
            try:
                transaction.execute(statement)
            except sqlalchemy.exc.IntegrityError:
                raise RunNotFoundError(run_id=state.run_id)

        return state

    # TODO (tz): just for testing time parsing
    def insert_state_by_type(
        self, state: RunStateResource, insert_pickle: bool
    ) -> RunStateResource:
        """Insert engine state by type to db.

        Arguments:
        state: Engine state resource to store.

        Returns:
        The engine state that was added to the store.
        """
        if insert_pickle:
            insert_row = {"run_id": state.run_id, "state": state.state.dict()}
        else:
            insert_row = {
                "run_id": state.run_id,
                "state_string": state.state.json(),
            }

        statement = sqlalchemy.insert(engine_state_table).values(insert_row)
        with self._sql_engine.begin() as transaction:
            try:
                transaction.execute(statement, autocommit=False)
            except sqlalchemy.exc.IntegrityError:
                raise RunNotFoundError(run_id=state.run_id)

        return state

    # TODO (tz): just for testing time parsing
    def get_state_by_type(self, run_id: str, return_pickle: bool) -> RunStateResource:
        """Get engine state by type from db.

        Arguments:
            run_id: Run id related to the engine state.
            return_pickle: Parse state as pickle or json.

        Returns:
            The engine state that found in the store.
        """
        statement = sqlalchemy.select(engine_state_table).where(
            engine_state_table.c.run_id == run_id
        )
        with self._sql_engine.begin() as transaction:
            state_row = transaction.execute(statement, autocommit=False).one()
            result = transaction.execute("PRAGMA page_size").all()
            count = transaction.execute("PRAGMA page_count").all()
        if return_pickle:
            state_result = parse_obj_as(ProtocolRunData, state_row.state)
            print("---pickle-db-size---")
            print(f"{result}*{count}")
        else:
            state_result = ProtocolRunData.parse_raw(state_row.state_string)
            print("---str-db-size---")
            print(f"{result}*{count}")

        state_result

        return RunStateResource(
            run_id=run_id, state=state_result, engine_status=state_row.engine_status
        )

    def get(self, run_id: str) -> RunStateResource:
        """Get engine state from db.

        Arguments:
            run_id: Run id related to the engine state.

        Returns:
            The engine state that found in the store.
        """
        statement = sqlalchemy.select(engine_state_table).where(
            engine_state_table.c.run_id == run_id
        )
        with self._sql_engine.begin() as transaction:
            state_row = transaction.execute(statement).one()
        return _convert_sql_row_to_sql_engine_state(state_row)


def _convert_sql_row_to_sql_engine_state(
    sql_row: sqlalchemy.engine.Row,
) -> RunStateResource:

    run_id = sql_row.run_id
    assert isinstance(run_id, str)

    status = sql_row.engine_status
    assert isinstance(status, str)

    state = sql_row.state
    assert isinstance(state, Dict)

    return RunStateResource(
        run_id=run_id, state=parse_obj_as(ProtocolRunData, state), engine_status=status
    )


def _convert_state_to_sql_values(state: RunStateResource) -> Dict[str, object]:
    return {
        "run_id": state.run_id,
        "state": state.state.dict(),
        "engine_status": state.engine_status,
    }
