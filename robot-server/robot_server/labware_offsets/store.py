# noqa: D100

from datetime import datetime
from dataclasses import dataclass
from typing import Iterator, Sequence, TypedDict
from typing_extensions import assert_never

from opentrons.protocol_engine.types import (
    LabwareOffsetVector,
    ModuleModel,
    OnAddressableAreaOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
    OnLabwareOffsetLocationSequenceComponent,
)

from robot_server.persistence.tables import (
    labware_offset_table,
    labware_offset_location_sequence_components_table,
)
from .models import (
    ANY_LOCATION,
    AnyLocation,
    ReturnedLabwareOffsetLocationSequenceComponents,
    SearchFilter,
    StoredLabwareOffset,
    StoredLabwareOffsetLocationSequenceComponents,
    UnknownLabwareOffsetLocationSequenceComponent,
)

import sqlalchemy
import sqlalchemy.exc

from ._search_query_builder import build_query


@dataclass
class IncomingStoredLabwareOffset:
    """Internal class for representing valid incoming offsets."""

    id: str
    createdAt: datetime
    definitionUri: str
    locationSequence: Sequence[
        StoredLabwareOffsetLocationSequenceComponents
    ] | AnyLocation
    vector: LabwareOffsetVector


class LabwareOffsetStore:
    """A persistent store for labware offsets, to support the `/labwareOffsets` endpoints."""

    def __init__(self, sql_engine: sqlalchemy.engine.Engine) -> None:
        """Initialize the store.

        Params:
            sql_engine: The SQL database to use as backing storage. Assumed to already
                have all the proper tables set up.
        """
        self._sql_engine = sql_engine

    def add(
        self,
        offset: IncomingStoredLabwareOffset,
    ) -> None:
        """Store a new labware offset."""
        with self._sql_engine.begin() as transaction:
            offset_row_id = transaction.execute(
                sqlalchemy.insert(labware_offset_table).values(
                    _pydantic_to_sql_offset(offset)
                )
            ).inserted_primary_key.row_id
            location_components_to_insert = list(
                _pydantic_to_sql_location_sequence_iterator(offset, offset_row_id)
            )
            if location_components_to_insert:
                transaction.execute(
                    sqlalchemy.insert(
                        labware_offset_location_sequence_components_table
                    ),
                    location_components_to_insert,
                )

    def get_all(self) -> list[StoredLabwareOffset]:
        """Return all offsets from oldest to newest.

        Inactive (deleted) offsets are excluded.
        """
        return_everything_filter = SearchFilter()
        return self.search([return_everything_filter])

    def search(self, filters: Sequence[SearchFilter]) -> list[StoredLabwareOffset]:
        """Return all matching labware offsets in order from oldest-added to newest.

        If the list of filters is empty, no offsets are returned.

        Inactive (deleted) offsets are always excluded.
        """
        sql_query = build_query(filters)

        with self._sql_engine.begin() as transaction:
            result = transaction.execute(sql_query).all()

        if len(result) == 0:
            return []
        return list(_collate_sql_to_pydantic(result))

    def delete(self, offset_id: str) -> StoredLabwareOffset:
        """Delete a labware offset by its ID. Return what was just deleted."""
        select_rows_to_delete = build_query([SearchFilter(id=offset_id)])
        with self._sql_engine.begin() as transaction:
            try:
                offset_rows = transaction.execute(select_rows_to_delete).all()
            except sqlalchemy.exc.NoResultFound:
                raise LabwareOffsetNotFoundError(bad_offset_id=offset_id) from None
            if len(offset_rows) == 0:
                raise LabwareOffsetNotFoundError(bad_offset_id=offset_id)
            if not offset_rows[0].active:
                # Already soft-deleted.
                raise LabwareOffsetNotFoundError(bad_offset_id=offset_id)

            transaction.execute(
                sqlalchemy.update(labware_offset_table)
                .where(labware_offset_table.c.offset_id == offset_id)
                .values(active=False)
            )

        return next(_collate_sql_to_pydantic(offset_rows))

    def delete_all(self) -> None:
        """Delete all labware offsets."""
        with self._sql_engine.begin() as transaction:
            transaction.execute(
                sqlalchemy.update(labware_offset_table).values(active=False)
            )


class LabwareOffsetNotFoundError(KeyError):
    """Raised when trying to access a labware offset that doesn't exist."""

    def __init__(self, bad_offset_id: str) -> None:
        super().__init__(bad_offset_id)
        self.bad_offset_id = bad_offset_id


def _sql_sequence_component_to_pydantic_sequence_component(
    component_row: sqlalchemy.engine.Row,
) -> ReturnedLabwareOffsetLocationSequenceComponents:
    if component_row.component_kind == "onLabware":
        return OnLabwareOffsetLocationSequenceComponent(
            labwareUri=component_row.primary_component_value
        )
    elif component_row.component_kind == "onModule":
        return OnModuleOffsetLocationSequenceComponent(
            moduleModel=ModuleModel(component_row.primary_component_value)
        )
    elif component_row.component_kind == "onAddressableArea":
        return OnAddressableAreaOffsetLocationSequenceComponent(
            addressableAreaName=component_row.primary_component_value
        )
    else:
        return UnknownLabwareOffsetLocationSequenceComponent(
            storedKind=component_row.component_kind,
            primaryValue=component_row.primary_component_value,
        )


class _LocationComponentAsSQLRow(TypedDict):
    offset_id: int
    sequence_ordinal: int
    component_kind: str
    primary_component_value: str
    component_value_json: str


def _pydantic_sequence_component_to_sql_sequence_component(
    component: StoredLabwareOffsetLocationSequenceComponents,
    offset_row_id: int,
    sequence_ordinal: int,
) -> _LocationComponentAsSQLRow:
    if isinstance(component, OnLabwareOffsetLocationSequenceComponent):
        return {
            "offset_id": offset_row_id,
            "sequence_ordinal": sequence_ordinal,
            "component_kind": component.kind,
            "primary_component_value": component.labwareUri,
            "component_value_json": component.model_dump_json(),
        }
    elif isinstance(component, OnModuleOffsetLocationSequenceComponent):
        return {
            "offset_id": offset_row_id,
            "sequence_ordinal": sequence_ordinal,
            "component_kind": component.kind,
            "primary_component_value": component.moduleModel.value,
            "component_value_json": component.model_dump_json(),
        }
    elif isinstance(component, OnAddressableAreaOffsetLocationSequenceComponent):
        return {
            "offset_id": offset_row_id,
            "sequence_ordinal": sequence_ordinal,
            "component_kind": component.kind,
            "primary_component_value": component.addressableAreaName,
            "component_value_json": component.model_dump_json(),
        }
    else:
        assert_never(component)


def _collate_sql_locations(
    first_row: sqlalchemy.engine.Row, rest_rows: Iterator[sqlalchemy.engine.Row]
) -> tuple[
    list[ReturnedLabwareOffsetLocationSequenceComponents] | AnyLocation,
    sqlalchemy.engine.Row | None,
]:
    if first_row.component_kind is None:
        # If this is NULL in SQL, it means this offset had no components to its
        # location sequence, which is how we encode ANY_LOCATION.
        return ANY_LOCATION, next(rest_rows, None)

    else:
        offset_id = first_row.offset_id

        location_sequence: list[ReturnedLabwareOffsetLocationSequenceComponents] = [
            _sql_sequence_component_to_pydantic_sequence_component(first_row)
        ]
        while True:
            try:
                row = next(rest_rows)
            except StopIteration:
                return location_sequence, None
            if row.offset_id != offset_id:
                return location_sequence, row
            location_sequence.append(
                _sql_sequence_component_to_pydantic_sequence_component(row)
            )


def _sql_to_pydantic(
    first_row: sqlalchemy.engine.Row, rest_rows: Iterator[sqlalchemy.engine.Row]
) -> tuple[StoredLabwareOffset, sqlalchemy.engine.Row | None]:
    location_sequence, next_row = _collate_sql_locations(first_row, rest_rows)
    return (
        StoredLabwareOffset(
            id=first_row.offset_id,
            createdAt=first_row.created_at,
            definitionUri=first_row.definition_uri,
            locationSequence=location_sequence,
            vector=LabwareOffsetVector(
                x=first_row.vector_x,
                y=first_row.vector_y,
                z=first_row.vector_z,
            ),
        ),
        next_row,
    )


def _collate_sql_to_pydantic(
    query_results: list[sqlalchemy.engine.Row],
) -> Iterator[StoredLabwareOffset]:
    row_iter = iter(query_results)
    row: sqlalchemy.engine.Row | None = next(row_iter)
    while row:
        result, row = _sql_to_pydantic(row, row_iter)
        yield result


def _pydantic_to_sql_offset(
    labware_offset: IncomingStoredLabwareOffset,
) -> dict[str, object]:
    return dict(
        offset_id=labware_offset.id,
        definition_uri=labware_offset.definitionUri,
        vector_x=labware_offset.vector.x,
        vector_y=labware_offset.vector.y,
        vector_z=labware_offset.vector.z,
        created_at=labware_offset.createdAt,
        active=True,
    )


def _pydantic_to_sql_location_sequence_iterator(
    labware_offset: IncomingStoredLabwareOffset, offset_row_id: int
) -> Iterator[_LocationComponentAsSQLRow]:
    """Given a location from HTTP, return the equivalent rows to store in SQL."""
    if labware_offset.locationSequence == ANY_LOCATION:
        # ANY_LOCATION is represented in SQL as the absence of any rows,
        # so return an empty iterator.
        return

    for index, component in enumerate(labware_offset.locationSequence):
        yield _pydantic_sequence_component_to_sql_sequence_component(
            component, offset_row_id=offset_row_id, sequence_ordinal=index
        )
