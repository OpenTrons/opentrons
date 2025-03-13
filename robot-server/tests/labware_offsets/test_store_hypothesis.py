"""Hypothesis tests for LabwareOffsetStore.

This runs a LabwareOffsetStore through random sequences of operations
and makes sure it behaves correctly.
"""

from contextlib import ExitStack
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Sequence

import hypothesis.strategies
import hypothesis.stateful

from opentrons.protocol_engine import (
    LabwareOffsetVector,
    OnLabwareOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
    OnAddressableAreaOffsetLocationSequenceComponent,
)
from opentrons.protocol_engine.types import (
    ModuleModel,
)
from robot_server.labware_offsets.store import (
    LabwareOffsetStore,
    LabwareOffsetNotFoundError,
    IncomingStoredLabwareOffset,
)
from robot_server.labware_offsets.models import (
    ANY_LOCATION,
    AnyLocation,
    SearchFilter,
    StoredLabwareOffset,
    DO_NOT_FILTER,
    StoredLabwareOffsetLocationSequenceComponents,
)
from tests.conftest import make_sql_engine


utc_dt_strat = hypothesis.strategies.datetimes(
    timezones=hypothesis.strategies.just(timezone.utc)
)
"""Generates datetimes with their timezone set to UTC."""


location_component_strat = hypothesis.strategies.one_of(
    hypothesis.strategies.builds(
        OnLabwareOffsetLocationSequenceComponent,
        definitionUri=hypothesis.strategies.text(),
    ),
    hypothesis.strategies.builds(
        OnModuleOffsetLocationSequenceComponent,
        moduleModel=hypothesis.strategies.sampled_from(ModuleModel),
    ),
    hypothesis.strategies.builds(
        OnAddressableAreaOffsetLocationSequenceComponent,
        addressableAreaName=hypothesis.strategies.text(),
    ),
)
"""Generates individual components of a locationSequence list."""


location_sequence_strat = hypothesis.strategies.lists(
    location_component_strat, min_size=1
) | hypothesis.strategies.just(ANY_LOCATION)
"""Generates locationSequence values."""


class SimulatedStore:
    """A trusted model of LabwareOffsetStore's intended behavior.

    Unlike the real thing, this may be inefficient and non-persistent.
    The goal here is to be correct, complete, and simple.

    See LabwareOffsetStore for all method documentation.
    """

    def __init__(self) -> None:
        self._entries: list[StoredLabwareOffset] = []

    def add(self, offset: IncomingStoredLabwareOffset) -> None:  # noqa: D102
        self._entries.append(
            StoredLabwareOffset(
                id=offset.id,
                createdAt=offset.createdAt,
                definitionUri=offset.definitionUri,
                locationSequence=offset.locationSequence,
                vector=offset.vector,
            )
        )

    def get_all(self) -> list[StoredLabwareOffset]:  # noqa: D102
        return self._entries

    def search(  # noqa: D102
        self, filters: Sequence[SearchFilter]
    ) -> list[StoredLabwareOffset]:
        deduplicated_matching_ids = set[str]().union(
            *(self._get_ids_matching_filter(filter) for filter in filters)
        )
        deduplicated_and_ordered_matches = [
            entry for entry in self._entries if entry.id in deduplicated_matching_ids
        ]
        return deduplicated_and_ordered_matches

    def delete(self, offset_id: str) -> StoredLabwareOffset:  # noqa: D102
        matching_indices = [
            index
            for index, element in enumerate(self._entries)
            if element.id == offset_id
        ]
        if len(matching_indices) == 0:
            raise LabwareOffsetNotFoundError(bad_offset_id=offset_id)
        else:
            assert len(matching_indices) == 1  # IDs are assumed to be unique.
            to_delete = self._entries[matching_indices[0]]
            del self._entries[matching_indices[0]]
            return to_delete

    def delete_all(self) -> None:  # noqa: D102
        self._entries.clear()

    def _get_ids_matching_filter(self, filter: SearchFilter) -> list[str]:
        def is_match(offset: StoredLabwareOffset) -> bool:
            return (
                (filter.id == DO_NOT_FILTER or offset.id == filter.id)
                and (
                    filter.definitionUri == DO_NOT_FILTER
                    or offset.definitionUri == filter.definitionUri
                )
                and (
                    filter.locationSequence == DO_NOT_FILTER
                    or offset.locationSequence == filter.locationSequence
                )
            )

        matches = [entry.id for entry in self._entries if is_match(entry)]
        if filter.mostRecentOnly:
            matches = matches[-1:]

        return matches


class LabwareStoreMachine(hypothesis.stateful.RuleBasedStateMachine):
    """Calls random LabwareOffsetStore methods with random values.

    Compares results to the simulated model.
    """

    ids = hypothesis.stateful.Bundle("ids")
    definition_uris = hypothesis.stateful.Bundle("definition_uris")
    locations = hypothesis.stateful.Bundle("locations")

    def __init__(self) -> None:
        super().__init__()
        # Ideally, we'd just use the `subject` pytest fixture.
        # hypothesis.stateful apparently doesn't let us do that,
        # so we need to bootstrap the subject and all its dependencies here ourselves. :(
        # https://github.com/HypothesisWorks/hypothesis/issues/1364
        self._exit_stack = ExitStack()
        temp_dir = Path(self._exit_stack.enter_context(TemporaryDirectory()))
        sql_engine = self._exit_stack.enter_context(make_sql_engine(temp_dir))
        self._subject = LabwareOffsetStore(sql_engine)
        self._simulated_model = SimulatedStore()
        self._seen_ids = set[str]()

    def teardown(self) -> None:
        """Run by Hypothesis to clean up after the test."""
        self._exit_stack.close()

    @hypothesis.stateful.rule(target=ids, id=hypothesis.strategies.text())
    def add_id_to_bundle(self, id: str) -> str:  # noqa: D102
        return id

    @hypothesis.stateful.rule(
        target=definition_uris, definition_uri=hypothesis.strategies.text()
    )
    def add_definition_uri_to_bundle(self, definition_uri: str) -> str:  # noqa: D102
        return definition_uri

    @hypothesis.stateful.rule(target=locations, location=location_sequence_strat)
    def add_location_to_bundle(  # noqa: D102
        self, location: StoredLabwareOffsetLocationSequenceComponents | AnyLocation
    ) -> StoredLabwareOffsetLocationSequenceComponents | AnyLocation:
        return location

    @hypothesis.stateful.rule(
        id=ids,
        definition_uri=definition_uris,
        created_at=utc_dt_strat,
        location=locations,
    )
    def add(  # noqa: D102
        self,
        id: str,
        definition_uri: str,
        created_at: datetime,
        location: list[StoredLabwareOffsetLocationSequenceComponents] | AnyLocation,
    ) -> None:
        hypothesis.assume(id not in self._seen_ids)

        to_add = IncomingStoredLabwareOffset(
            id=id,
            createdAt=created_at,
            definitionUri=definition_uri,
            locationSequence=location,
            # todo(mm, 2025-03-10): Draw vectors from Hypothesis.
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
        self._subject.add(to_add)
        self._simulated_model.add(to_add)
        self._seen_ids.add(to_add.id)

    @hypothesis.stateful.rule()
    def get_all(self) -> None:  # noqa: D102
        assert self._subject.get_all() == self._simulated_model.get_all()

    @hypothesis.stateful.rule(
        filters=hypothesis.strategies.lists(
            hypothesis.strategies.builds(
                SearchFilter,
                id=(hypothesis.strategies.just(DO_NOT_FILTER) | ids),
                definitionUri=(
                    hypothesis.strategies.just(DO_NOT_FILTER) | definition_uris
                ),
                locationSequence=(
                    hypothesis.strategies.just(DO_NOT_FILTER) | locations
                ),
                mostRecentOnly=hypothesis.strategies.booleans(),
            )
        )
    )
    def search(self, filters: list[SearchFilter]) -> None:  # noqa: D102
        assert self._subject.search(filters) == self._simulated_model.search(filters)

    @hypothesis.stateful.rule(id=ids)
    def delete(self, id: str) -> None:  # noqa: D102
        not_found_error_sentinel = object()
        try:
            subject_result: object = self._subject.delete(id)
        except LabwareOffsetNotFoundError:
            subject_result = not_found_error_sentinel

        try:
            model_result: object = self._simulated_model.delete(id)
        except LabwareOffsetNotFoundError:
            model_result = not_found_error_sentinel

        assert subject_result == model_result

    @hypothesis.stateful.rule()
    def delete_all(self) -> None:  # noqa: D102
        self._subject.delete_all()
        self._simulated_model.delete_all()


TestLabwareStoreMachine = LabwareStoreMachine.TestCase
