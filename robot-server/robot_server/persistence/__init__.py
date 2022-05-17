"""Data access initialization and management."""
import logging
from pathlib import Path
from tempfile import mkdtemp

import sqlalchemy
from anyio import Path as AsyncPath
from fastapi import Depends
from typing_extensions import Final

from robot_server.app_state import AppState, AppStateAccessor, get_app_state
from robot_server.settings import get_settings

from .database import create_sql_engine, sqlite_rowid, ensure_utc_datetime
from .tables import protocol_table, analysis_table, run_table, action_table

_sql_engine_accessor = AppStateAccessor[sqlalchemy.engine.Engine]("sql_engine")
_persistence_directory_accessor = AppStateAccessor[Path]("persistence_directory")
_protocol_directory_accessor = AppStateAccessor[Path]("protocol_directory")

_TEMP_PERSISTENCE_DIR_PREFIX: Final = "opentrons-robot-server-"
_DATABASE_FILE: Final = "robot_server.db"

_log = logging.getLogger(__name__)


async def get_persistence_directory(
    app_state: AppState = Depends(get_app_state),
) -> Path:
    """Return the root persistence directory, creating it if necessary."""
    persistence_dir = _persistence_directory_accessor.get_from(app_state)

    if persistence_dir is None:
        setting = get_settings().persistence_directory

        if setting == "automatically_make_temporary":
            # It's bad for this blocking I/O to be in this async function,
            # but we don't have an async mkdtemp().
            persistence_dir = Path(mkdtemp(prefix=_TEMP_PERSISTENCE_DIR_PREFIX))
            _log.info(
                f"Using auto-created temporary directory {persistence_dir}"
                f" for persistence."
            )
        else:
            persistence_dir = setting
            await AsyncPath(persistence_dir).mkdir(parents=True, exist_ok=True)
            _log.info(f"Using directory {persistence_dir} for persistence.")

        _persistence_directory_accessor.set_on(app_state, persistence_dir)

    return persistence_dir


def get_sql_engine(
    app_state: AppState = Depends(get_app_state),
    persistence_directory: Path = Depends(get_persistence_directory),
) -> sqlalchemy.engine.Engine:
    """Return a singleton SQL engine referring to a ready-to-use database."""
    sql_engine = _sql_engine_accessor.get_from(app_state)

    if sql_engine is None:
        sql_engine = create_sql_engine(persistence_directory / _DATABASE_FILE)
        _sql_engine_accessor.set_on(app_state, sql_engine)

    return sql_engine
    # Rely on connections being cleaned up automatically when the process dies.
    # FastAPI doesn't give us a convenient way to properly tie
    # the lifetime of a dependency to the lifetime of the server app.
    # https://github.com/tiangolo/fastapi/issues/617


__all__ = [
    "get_persistence_directory",
    "get_sql_engine",
    # database tables
    "protocol_table",
    "analysis_table",
    "run_table",
    "action_table",
    # database utilities and helpers
    "sqlite_rowid",
    "ensure_utc_datetime",
]
