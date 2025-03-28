"""Migrate the persistence directory from schema 8 to 9.

Summary of changes from schema 8:

- Adds a new `labware_offset` table.
"""

from pathlib import Path

import sqlalchemy

from opentrons.protocol_engine import LabwareOffset, StateSummary

from robot_server.persistence.database import sqlite_rowid, sql_engine_ctx
from robot_server.persistence.file_and_directory_names import DB_FILE
from robot_server.persistence.pydantic import json_to_pydantic
from robot_server.persistence.tables import schema_9

from ._util import copy_contents
from .._folder_migrator import Migration


class Migration8to9(Migration):  # noqa: D101
    def migrate(self, source_dir: Path, dest_dir: Path) -> None:
        """Migrate the persistence directory from schema 8 to 9."""
        copy_contents(source_dir=source_dir, dest_dir=dest_dir)

        with sql_engine_ctx(
            dest_dir / DB_FILE
        ) as engine, engine.begin() as transaction:
            schema_9.labware_offset_table.create(transaction)
            _import_labware_offsets_from_runs(transaction)


def _import_labware_offsets_from_runs(connection: sqlalchemy.engine.Connection) -> None:
    """Seed the new labware_offset table with records scraped from existing runs."""
    raw_state_summaries = (
        connection.execute(
            sqlalchemy.select(schema_9.run_table.c.state_summary).where(
                schema_9.run_table.c.state_summary.is_not(None)
            )
            # Be careful to preserve order.
            # Offsets from newer runs should shadow offsets from older runs.
            .order_by(sqlite_rowid)
        )
        .scalars()
        .all()
    )

    state_summaries = (
        json_to_pydantic(StateSummary, raw_state_summary)
        for raw_state_summary in raw_state_summaries
    )

    for state_summary in state_summaries:
        # Be careful to preserve order.
        # Offsets added later to a run should shadow offsets added earlier to a run.
        for labware_offset in state_summary.labwareOffsets:
            converted = _pydantic_labware_offset_to_sql(labware_offset)
            connection.execute(
                sqlalchemy.insert(schema_9.labware_offset_table).values(converted)
            )


def _pydantic_labware_offset_to_sql(labware_offset: LabwareOffset) -> dict[str, object]:
    return dict(
        offset_id=labware_offset.id,
        definition_uri=labware_offset.definitionUri,
        location_slot_name=labware_offset.location.slotName.value,
        location_module_model=labware_offset.location.moduleModel.value
        if labware_offset.location.moduleModel is not None
        else None,
        location_definition_uri=labware_offset.location.definitionUri,
        vector_x=labware_offset.vector.x,
        vector_y=labware_offset.vector.y,
        vector_z=labware_offset.vector.z,
        created_at=labware_offset.createdAt,
        active=True,
    )
