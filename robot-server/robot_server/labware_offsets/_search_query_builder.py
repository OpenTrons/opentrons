"""Helper to build a search query."""

from __future__ import annotations
from typing import Sequence

import sqlalchemy
import sqlalchemy.sql.functions

from opentrons.protocol_engine import (
    OnAddressableAreaOffsetLocationSequenceComponent,
    OnLabwareOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
)

from robot_server.persistence.tables import (
    labware_offset_table,
    labware_offset_location_sequence_components_table,
)
from .models import (
    ANY_LOCATION,
    AnyLocation,
    DO_NOT_FILTER,
    StoredLabwareOffsetLocationSequenceComponents,
    SearchFilter,
)


def build_query(filters: Sequence[SearchFilter]) -> sqlalchemy.sql.Selectable:
    """Return a SQL query to select offsets matching the given filters.

    The result set looks something like this:

    ```
    offset-1-id  offset-1-definition-uri  ...  offset-1-location-component-1  -- An offset with 2 location components.
    offset-1-id  offset-1-definition-uri  ...  offset-1-location-component-2
    offset-2-id  offset-2-definition-uri  ...  NULL                           -- An offset with ANY_LOCATION.
    offset-3-id  offset-3-definition-uri  ...  offset-3-location-component-1  -- An offset with 3 location components.
    offset-3-id  offset-3-definition-uri  ...  offset-3-location-component-2
    offset-3-id  offset-3-definition-uri  ...  offset-3-location-component-3
    ...
    ```
    """
    select_matching_offsets: sqlalchemy.sql.Selectable
    if filters:
        # Union the results from all of the filters together.
        #
        # Complication: Each filter's subquery possibly has an ORDER BY and LIMIT clause.
        # SQLite's UNION only supports ORDER BY and LIMIT on the whole union, not on its
        # constituent subqueries (SQLite will throw a syntax error). So we cannot
        # directly use `_build_select_statement_for_single_filter(filter)`.
        # We work around it by adding another layer of subquery (`.subquery().select()`),
        # which would otherwise be a redundant pass-through.
        subqueries_to_union = [
            _build_select_statement_for_single_filter(filter).subquery().select()
            for filter in filters
        ]
        select_matching_offsets = sqlalchemy.union(*subqueries_to_union)
    else:
        # The sqlalchemy.union() above doesn't support an empty list,
        # so if we have no filters, we need to do this to get an empty result set
        # of the same shape that the union would have returned.
        select_matching_offsets = sqlalchemy.select(labware_offset_table).where(False)

    # Turn it into a common table expression so we can use it as one side of a join.
    select_matching_offsets = select_matching_offsets.cte(
        name="matching_offsets"  # An arbitrary dev-readable name for debugging.
    )

    select_matching_offsets_and_their_locations = (
        sqlalchemy.select(
            select_matching_offsets.c.row_id,
            select_matching_offsets.c.offset_id,
            select_matching_offsets.c.definition_uri,
            select_matching_offsets.c.vector_x,
            select_matching_offsets.c.vector_y,
            select_matching_offsets.c.vector_z,
            select_matching_offsets.c.created_at,
            select_matching_offsets.c.active,
            labware_offset_location_sequence_components_table.c.sequence_ordinal,
            labware_offset_location_sequence_components_table.c.component_kind,
            labware_offset_location_sequence_components_table.c.primary_component_value,
        )
        .select_from(
            # This is a LEFT OUTER JOIN to account for offsets that have no entries
            # in labware_offset_location_sequence_components_table. That is how we encode
            # offsets that have locationSequence=ANY_LOCATION.
            sqlalchemy.outerjoin(
                select_matching_offsets,
                labware_offset_location_sequence_components_table,
                select_matching_offsets.c.row_id
                == labware_offset_location_sequence_components_table.c.offset_id,
            )
        )
        .order_by(
            select_matching_offsets.c.row_id,
            labware_offset_location_sequence_components_table.c.sequence_ordinal,
        )
    )

    return select_matching_offsets_and_their_locations


def _build_select_statement_for_single_filter(
    filter: SearchFilter,
) -> sqlalchemy.sql.Select:
    statement = sqlalchemy.select(labware_offset_table)

    statement = statement.where(labware_offset_table.c.active == sqlalchemy.true())

    if filter.id != DO_NOT_FILTER:
        statement = statement.where(labware_offset_table.c.offset_id == filter.id)
    if filter.definitionUri != DO_NOT_FILTER:
        statement = statement.where(
            labware_offset_table.c.definition_uri == filter.definitionUri
        )
    if filter.locationSequence != DO_NOT_FILTER:
        statement = statement.where(
            _build_where_expression_for_location_match(filter.locationSequence)
        )

    if filter.mostRecentOnly:
        statement = statement.order_by(labware_offset_table.c.row_id.desc()).limit(1)

    return statement


def _build_where_expression_for_location_match(
    location: Sequence[StoredLabwareOffsetLocationSequenceComponents] | AnyLocation,
) -> object:
    # Given a location like:
    #
    # [
    #   {"kind": "onModule", "moduleModel": "magneticModuleV1"},
    #   {"kind": "onAddressableArea", "addressableAreaName": "A1""}
    # ]
    #
    # We want to return true if, and only if, in the SQL table:
    #
    # - There is a match to the first component.
    #   - It's foreign-keyed to the labware offset in question.
    #   - It has a sequence ordinal of 0.
    #   - It has kind "onModule".
    #   - It has value "magneticModuleV1".
    # - There is a match to the second component.
    #   - It's foreign-keyed to the labware offset in question.
    #   - It has a sequence ordinal of 1.
    #   - It has kind "onAddressableArea".
    #   - It has value "A1".
    # - There are exactly 2 components foreign-keyed to the labware offset in question
    #   (no extras).

    components_table = labware_offset_location_sequence_components_table

    if location != ANY_LOCATION:
        assert len(location) > 0  # This should be enforced by higher layers.
        component_match_clauses = [
            sqlalchemy.exists()
            .where(
                # Testing equality against `labware_offset_table.c.row_id` here looks confusing
                # (which offset's row ID would it be?), but remember that this is evaluated
                # in the context of some larger overall SELECT statement defined outside this
                # function.
                components_table.c.offset_id
                == labware_offset_table.c.row_id
            )
            .where(components_table.c.sequence_ordinal == index)
            .where(components_table.c.component_kind == component.kind)
            .where(
                components_table.c.primary_component_value
                == _primary_component_value(component)
            )
            for index, component in enumerate(location)
        ]
        num_components_to_expect = len(location)
    else:
        component_match_clauses = []
        num_components_to_expect = 0

    select_num_components = (
        sqlalchemy.select(sqlalchemy.func.count(components_table.c.row_id))
        .where(components_table.c.offset_id == labware_offset_table.c.row_id)
        .scalar_subquery()
    )
    num_components_match_expression = select_num_components == num_components_to_expect

    return sqlalchemy.and_(num_components_match_expression, *component_match_clauses)


def _primary_component_value(
    component: StoredLabwareOffsetLocationSequenceComponents,
) -> str:
    match component:
        case OnLabwareOffsetLocationSequenceComponent(
            labwareUri=value
        ) | OnModuleOffsetLocationSequenceComponent(
            moduleModel=value
        ) | OnAddressableAreaOffsetLocationSequenceComponent(
            addressableAreaName=value
        ):
            return value
