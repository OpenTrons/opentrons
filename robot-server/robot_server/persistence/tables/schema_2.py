"""v2 of our SQLite schema.

v0 and v1 are subsets of this, missing certain tables and columns.
See our migration code for details.
"""

import sqlalchemy

from robot_server.persistence import _legacy_pickle
from robot_server.persistence._utc_datetime import UTCDateTime

metadata = sqlalchemy.MetaData()

migration_table = sqlalchemy.Table(
    "migration",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True),
    sqlalchemy.Column("created_at", UTCDateTime, nullable=False),
    sqlalchemy.Column(
        "version",
        sqlalchemy.Integer,
        nullable=False,
    ),
)

protocol_table = sqlalchemy.Table(
    "protocol",
    metadata,
    sqlalchemy.Column(
        "id",
        sqlalchemy.String,
        primary_key=True,
    ),
    sqlalchemy.Column(
        "created_at",
        UTCDateTime,
        nullable=False,
    ),
    sqlalchemy.Column("protocol_key", sqlalchemy.String, nullable=True),
)

analysis_table = sqlalchemy.Table(
    "analysis",
    metadata,
    sqlalchemy.Column(
        "id",
        sqlalchemy.String,
        primary_key=True,
    ),
    sqlalchemy.Column(
        "protocol_id",
        sqlalchemy.String,
        sqlalchemy.ForeignKey("protocol.id"),
        index=True,
        nullable=False,
    ),
    sqlalchemy.Column(
        "analyzer_version",
        sqlalchemy.String,
        nullable=False,
    ),
    sqlalchemy.Column(
        "completed_analysis",
        # Stores a pickled dict. See CompletedAnalysisStore.
        sqlalchemy.LargeBinary,
        nullable=False,
    ),
    sqlalchemy.Column(
        "completed_analysis_as_document",
        # Stores the same data as completed_analysis, but serialized as a JSON string.
        sqlalchemy.String,
        # This column should never be NULL in practice.
        # It needs to be nullable=True because of limitations in SQLite and our migration code.
        nullable=True,
    ),
)

run_table = sqlalchemy.Table(
    "run",
    metadata,
    sqlalchemy.Column(
        "id",
        sqlalchemy.String,
        primary_key=True,
    ),
    sqlalchemy.Column(
        "created_at",
        UTCDateTime,
        nullable=False,
    ),
    sqlalchemy.Column(
        "protocol_id",
        sqlalchemy.String,
        sqlalchemy.ForeignKey("protocol.id"),
        nullable=True,
    ),
    # column added in schema v1
    sqlalchemy.Column(
        "state_summary",
        sqlalchemy.PickleType(pickler=_legacy_pickle),
        nullable=True,
    ),
    # column added in schema v1
    sqlalchemy.Column(
        "commands",
        sqlalchemy.LargeBinary,
        nullable=True,
    ),
    # column added in schema v1
    sqlalchemy.Column("engine_status", sqlalchemy.String, nullable=True),
    # column added in schema v1
    sqlalchemy.Column("_updated_at", UTCDateTime, nullable=True),
)

action_table = sqlalchemy.Table(
    "action",
    metadata,
    sqlalchemy.Column(
        "id",
        sqlalchemy.String,
        primary_key=True,
    ),
    sqlalchemy.Column("created_at", UTCDateTime, nullable=False),
    sqlalchemy.Column("action_type", sqlalchemy.String, nullable=False),
    sqlalchemy.Column(
        "run_id",
        sqlalchemy.String,
        sqlalchemy.ForeignKey("run.id"),
        nullable=False,
    ),
)
