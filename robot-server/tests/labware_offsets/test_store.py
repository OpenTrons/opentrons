# noqa: D100

from datetime import datetime, timezone
from typing import Sequence

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
    SearchFilter,
    StoredLabwareOffset,
    DoNotFilterType,
    DO_NOT_FILTER,
    StoredLabwareOffsetLocationSequenceComponents,
    UnknownLabwareOffsetLocationSequenceComponent,
)


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
