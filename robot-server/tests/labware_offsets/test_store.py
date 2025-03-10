# noqa: D100

from contextlib import ExitStack
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Sequence

import hypothesis.stateful
import hypothesis.strategies
import pytest
import sqlalchemy

from opentrons.protocol_engine import (
    LabwareOffsetVector,
    OnLabwareOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
    OnAddressableAreaOffsetLocationSequenceComponent,
)
from opentrons.protocol_engine.types import (
    ModuleModel,
)
from robot_server.persistence.tables import (
    labware_offset_location_sequence_components_table,
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
    DoNotFilterType,
    DO_NOT_FILTER,
    StoredLabwareOffsetLocationSequenceComponents,
    UnknownLabwareOffsetLocationSequenceComponent,
)
from tests.conftest import make_sql_engine


@pytest.fixture
def subject(sql_engine: sqlalchemy.engine.Engine) -> LabwareOffsetStore:
    """Return a test subject."""
    return LabwareOffsetStore(sql_engine)


def test_empty_search(subject: LabwareOffsetStore) -> None:
    """Searching with no filters should return no results."""
    subject.add(
        IncomingStoredLabwareOffset(
            id="id",
            createdAt=datetime.now(timezone.utc),
            definitionUri="namespace/load_name/1",
            locationSequence="anyLocation",
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
    )
    assert subject.search([]) == []


def test_search_most_recent_only(subject: LabwareOffsetStore) -> None:
    """mostRecentOnly=True should restrict that specific filter to the most recent."""
    uri_1 = "namespace/load_name_1/1"
    uri_2 = "namespace/load_name_2/1"
    ids_and_definition_uris = [
        ("id-1", uri_1),
        ("id-2", uri_1),
        ("id-3", uri_2),
        ("id-4", uri_2),
    ]
    for id, definition_uri in ids_and_definition_uris:
        subject.add(
            IncomingStoredLabwareOffset(
                id=id,
                definitionUri=definition_uri,
                createdAt=datetime.now(timezone.utc),
                locationSequence="anyLocation",
                vector=LabwareOffsetVector(x=1, y=2, z=3),
            )
        )

    results = subject.search([SearchFilter(mostRecentOnly=True)])
    assert [result.id for result in results] == ["id-4"]

    results = subject.search(
        [
            SearchFilter(definitionUri=uri_1, mostRecentOnly=True),
        ]
    )
    assert [result.id for result in results] == ["id-2"]

    results = subject.search(
        [
            SearchFilter(definitionUri=uri_1, mostRecentOnly=True),
            SearchFilter(definitionUri=uri_2, mostRecentOnly=True),
        ]
    )
    assert [result.id for result in results] == ["id-2", "id-4"]

    results = subject.search(
        [
            SearchFilter(definitionUri=uri_1, mostRecentOnly=False),
            SearchFilter(definitionUri=uri_1, mostRecentOnly=True),
        ]
    )
    assert [result.id for result in results] == ["id-1", "id-2"]


@pytest.mark.parametrize(
    argnames=[
        "id_filter",
        "definition_uri_filter",
        "location_sequence_filter",
        "returned_ids",
    ],
    argvalues=[
        pytest.param(
            "a",
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            ["a"],
            id="id-filter-only",
        ),
        pytest.param(
            DO_NOT_FILTER,
            "definitionUri a",
            DO_NOT_FILTER,
            ["a", "c", "d", "e"],
            id="labware-filter-only",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            [
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                )
            ],
            ["c"],
            id="location-filter-only",
        ),
        pytest.param(
            "a",
            "definitionUri a",
            DO_NOT_FILTER,
            ["a"],
            id="labware-and-id-matching",
        ),
        pytest.param(
            "a",
            "definitionUri b",
            DO_NOT_FILTER,
            [],
            id="labware-and-id-conflicting",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            [
                OnAddressableAreaOffsetLocationSequenceComponent(
                    kind="onAddressableArea",
                    addressableAreaName="A1",
                )
            ],
            [
                "c",
            ],
            id="aa-and-not-mod-or-lw",
        ),
    ],
)
def test_filter_fields(
    subject: LabwareOffsetStore,
    id_filter: str | DoNotFilterType,
    definition_uri_filter: str | DoNotFilterType,
    location_sequence_filter: Sequence[StoredLabwareOffsetLocationSequenceComponents]
    | DoNotFilterType,
    returned_ids: list[str],
) -> None:
    """Test each filterable field to make sure it returns only matching entries."""
    offsets = {
        "a": IncomingStoredLabwareOffset(
            id="a",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri a",
            locationSequence=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="location.definitionUri a"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                ),
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        ),
        "b": IncomingStoredLabwareOffset(
            id="b",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri b",
            locationSequence=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="location.definitionUri b"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.MAGNETIC_BLOCK_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="B1"
                ),
            ],
            vector=LabwareOffsetVector(x=2, y=4, z=6),
        ),
        "c": IncomingStoredLabwareOffset(
            id="c",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri a",
            locationSequence=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                )
            ],
            vector=LabwareOffsetVector(x=3, y=6, z=9),
        ),
        "d": IncomingStoredLabwareOffset(
            id="d",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri a",
            locationSequence=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="location.definitionUri a"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                ),
            ],
            vector=LabwareOffsetVector(x=4, y=8, z=12),
        ),
        "e": IncomingStoredLabwareOffset(
            id="e",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri a",
            locationSequence=[
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.MAGNETIC_BLOCK_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                ),
            ],
            vector=LabwareOffsetVector(x=5, y=10, z=15),
        ),
    }
    for offset in offsets.values():
        subject.add(offset)
    results = subject.search(
        [
            SearchFilter(
                id=id_filter,
                definitionUri=definition_uri_filter,
                locationSequence=location_sequence_filter,
            )
        ]
    )
    assert sorted(results, key=lambda o: o.id,) == sorted(
        [
            StoredLabwareOffset(
                id=offsets[id_].id,
                createdAt=offsets[id_].createdAt,
                definitionUri=offsets[id_].definitionUri,
                locationSequence=offsets[id_].locationSequence,
                vector=offsets[id_].vector,
            )
            for id_ in returned_ids
        ],
        key=lambda o: o.id,
    )


def test_filter_field_combinations(subject: LabwareOffsetStore) -> None:
    """Test that multiple fields within a single filter are combined correctly."""
    ids_and_definition_uris = [
        ("id-1", "definition-uri-a"),
        ("id-2", "definition-uri-b"),
        ("id-3", "definition-uri-a"),
        ("id-4", "definition-uri-b"),
        ("id-5", "definition-uri-a"),
        ("id-6", "definition-uri-b"),
    ]
    labware_offsets = [
        IncomingStoredLabwareOffset(
            id=id,
            createdAt=datetime.now(timezone.utc),
            definitionUri=definition_uri,
            locationSequence=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                )
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
        for (id, definition_uri) in ids_and_definition_uris
    ]
    outgoing_offsets = [
        StoredLabwareOffset(
            id=offset.id,
            createdAt=offset.createdAt,
            definitionUri=offset.definitionUri,
            locationSequence=offset.locationSequence,
            vector=offset.vector,
        )
        for offset in labware_offsets
    ]

    for labware_offset in labware_offsets:
        subject.add(labware_offset)

    # Filter accepting any value for each field (i.e. a return-everything filter):
    result = subject.search([SearchFilter()])
    assert result == outgoing_offsets

    # Filter on one field:
    result = subject.search([SearchFilter(definitionUri="definition-uri-b")])
    assert len(result) == 3
    assert result == [
        entry for entry in outgoing_offsets if entry.definitionUri == "definition-uri-b"
    ]

    # Filter on two fields:
    result = subject.search(
        [
            SearchFilter(
                id="id-2",
                definitionUri="definition-uri-b",
            )
        ]
    )
    assert result == [outgoing_offsets[1]]

    # Filter fields should be ANDed, not ORed, together:
    result = subject.search(
        [
            SearchFilter(
                id="id-1",
                definitionUri="definition-uri-b",
            )
        ]
    )
    assert result == []


def test_filter_combinations(subject: LabwareOffsetStore) -> None:
    """Test that multiple filters are combined correctly."""
    ids_and_definition_uris = [
        ("id-1", "definition-uri-a"),
        ("id-2", "definition-uri-b"),
    ]
    for id, definition_uri in ids_and_definition_uris:
        subject.add(
            IncomingStoredLabwareOffset(
                id=id,
                createdAt=datetime.now(timezone.utc),
                definitionUri=definition_uri,
                locationSequence=ANY_LOCATION,
                vector=LabwareOffsetVector(x=1, y=2, z=3),
            )
        )

    # Multiple filters should be OR'd together.
    result = subject.search(
        [
            SearchFilter(definitionUri="definition-uri-a"),
            SearchFilter(definitionUri="definition-uri-b"),
        ]
    )
    assert [e.id for e in result] == ["id-1", "id-2"]

    # It should be a true union, not just a concatenation--
    # there should be no repeated offsets in the results.
    result = subject.search(
        [
            SearchFilter(id="id-1"),
            SearchFilter(definitionUri="definition-uri-a"),
        ]
    )
    assert [e.id for e in result] == ["id-1"]


def test_delete(subject: LabwareOffsetStore) -> None:
    """Test the `delete()` and `delete_all()` methods."""
    incoming_offsets = [
        IncomingStoredLabwareOffset(
            id=id,
            createdAt=datetime.now(timezone.utc),
            definitionUri="",
            locationSequence=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                )
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
        for id in ["id-a", "id-b", "id-c"]
    ]
    outgoing_offsets = [
        StoredLabwareOffset(
            id=offset.id,
            createdAt=offset.createdAt,
            definitionUri=offset.definitionUri,
            locationSequence=offset.locationSequence,
            vector=offset.vector,
        )
        for offset in incoming_offsets
    ]
    a, b, c = incoming_offsets
    out_a, out_b, out_c = outgoing_offsets

    with pytest.raises(LabwareOffsetNotFoundError):
        subject.delete("b")

    subject.add(a)
    subject.add(b)
    subject.add(c)

    assert subject.delete(b.id) == out_b
    assert subject.get_all() == [out_a, out_c]
    assert subject.search([SearchFilter()]) == [
        out_a,
        out_c,
    ]  # A return-everything search filter.
    with pytest.raises(LabwareOffsetNotFoundError):
        subject.delete(out_b.id)

    subject.delete_all()
    assert subject.get_all() == []
    assert subject.search([SearchFilter()]) == []  # A return-everything search filter.


def test_handle_unknown(
    subject: LabwareOffsetStore, sql_engine: sqlalchemy.engine.Engine
) -> None:
    """Test returning an unknown offset."""
    original_location = OnAddressableAreaOffsetLocationSequenceComponent(
        addressableAreaName="A1"
    )
    incoming_valid = IncomingStoredLabwareOffset(
        id="id-a",
        createdAt=datetime.now(timezone.utc),
        definitionUri="",
        locationSequence=[original_location],
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    outgoing_offset = StoredLabwareOffset(
        id=incoming_valid.id,
        createdAt=incoming_valid.createdAt,
        definitionUri=incoming_valid.definitionUri,
        locationSequence=[
            original_location,
            UnknownLabwareOffsetLocationSequenceComponent(
                storedKind="asdasdad", primaryValue="ddddddd"
            ),
        ],
        vector=incoming_valid.vector,
    )
    subject.add(incoming_valid)
    with sql_engine.begin() as transaction:
        transaction.execute(
            sqlalchemy.insert(labware_offset_location_sequence_components_table).values(
                row_id=2,
                offset_id=1,
                sequence_ordinal=2,
                component_kind="asdasdad",
                primary_component_value="ddddddd",
                component_value_json='{"asdasda": "dddddd", "kind": "asdasdad"}',
            )
        )
    assert subject.search([SearchFilter(id="id-a")]) == [outgoing_offset]


class SimulatedStore:
    """A model of the subject's intended behavior.

    Unlike the real subject, this may be inefficient and non-persistent.
    The goal here is to be correct and simple.
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


utc_dt_strat = hypothesis.strategies.datetimes(
    timezones=hypothesis.strategies.just(timezone.utc)
)
"""A Hypothesis strategy to generate datetimes with their timezone set to UTC."""


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


location_sequence_strat = hypothesis.strategies.lists(
    location_component_strat, min_size=1
) | hypothesis.strategies.just(ANY_LOCATION)


class LabwareStoreMachine(hypothesis.stateful.RuleBasedStateMachine):
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
        self._model = SimulatedStore()
        self._seen_ids = set[str]()

    def teardown(self) -> None:
        self._exit_stack.close()

    @hypothesis.stateful.rule(target=ids, id=hypothesis.strategies.text())
    def add_id_to_bundle(self, id: str) -> str:
        return id

    @hypothesis.stateful.rule(
        target=definition_uris, definition_uri=hypothesis.strategies.text()
    )
    def add_definition_uri_to_bundle(self, definition_uri: str) -> str:
        return definition_uri

    @hypothesis.stateful.rule(target=locations, location=location_sequence_strat)
    def add_location_to_bundle(
        self, location: StoredLabwareOffsetLocationSequenceComponents | AnyLocation
    ) -> StoredLabwareOffsetLocationSequenceComponents | AnyLocation:
        return location

    @hypothesis.stateful.rule(
        id=ids,
        definition_uri=definition_uris,
        created_at=utc_dt_strat,
        location=location_sequence_strat,
    )
    def add(
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
        self._model.add(to_add)
        self._seen_ids.add(to_add.id)

    @hypothesis.stateful.rule()
    def get_all(self) -> None:
        assert self._subject.get_all() == self._model.get_all()

    @hypothesis.stateful.rule(
        filters=hypothesis.strategies.lists(
            hypothesis.strategies.builds(
                SearchFilter,
                id=(hypothesis.strategies.just(DO_NOT_FILTER) | ids),
                definitionUri=(
                    hypothesis.strategies.just(DO_NOT_FILTER) | definition_uris
                ),
                locationSequence=(
                    hypothesis.strategies.just(DO_NOT_FILTER) | location_sequence_strat
                ),
                mostRecentOnly=hypothesis.strategies.booleans(),
            )
        )
    )
    def search(self, filters: list[SearchFilter]) -> None:
        assert self._subject.search(filters) == self._model.search(filters)

    @hypothesis.stateful.rule(id=ids)
    def delete(self, id: str) -> None:
        not_found_error_sentinel = object()
        try:
            subject_result: object = self._subject.delete(id)
        except LabwareOffsetNotFoundError:
            subject_result = not_found_error_sentinel

        try:
            model_result: object = self._model.delete(id)
        except LabwareOffsetNotFoundError:
            model_result = not_found_error_sentinel

        assert subject_result == model_result

    @hypothesis.stateful.rule()
    def delete_all(self) -> None:
        self._subject.delete_all()
        self._model.delete_all()


TestLabwareStoreMachine = LabwareStoreMachine.TestCase
