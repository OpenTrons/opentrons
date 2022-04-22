"""Tests for the ProtocolStore interface."""
import pytest
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_reader import (
    ProtocolSource,
    ProtocolSourceFile,
    ProtocolFileRole,
    JsonProtocolConfig,
    PythonProtocolConfig,
)

from robot_server.protocols.protocol_store import (
    ProtocolStore,
    ProtocolResource,
    ProtocolNotFoundError,
)
from robot_server.persistence import open_db_no_cleanup, add_tables_to_db

from sqlalchemy.engine import Engine as SQLEngine


@pytest.fixture
def sql_engine(tmp_path: Path) -> Generator[SQLEngine, None, None]:
    """Return a set-up database to back the store."""
    db_file_path = tmp_path / "test.db"
    sql_engine = open_db_no_cleanup(db_file_path=db_file_path)
    add_tables_to_db(sql_engine)
    try:
        yield sql_engine
    finally:
        sql_engine.dispose()


@pytest.fixture
def protocol_file_directory(tmp_path: Path) -> Path:
    """Return a directory for protocol files to be placed in."""
    subdirectory = tmp_path / "protocol_files"
    subdirectory.mkdir()
    return subdirectory


@pytest.fixture
def subject(sql_engine: SQLEngine) -> ProtocolStore:
    """Get a ProtocolStore test subject."""
    return ProtocolStore.create_empty(sql_engine=sql_engine)


async def test_insert_and_get_protocol(
    protocol_file_directory: Path, subject: ProtocolStore
) -> None:
    """It should store a single protocol."""
    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "abc.json"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            labware_definitions=[],
        ),
        protocol_key="dummy-data-111",
    )

    subject.insert(protocol_resource)
    result = subject.get("protocol-id")

    assert result == protocol_resource


async def test_insert_with_duplicate_key_raises(
    protocol_file_directory: Path, subject: ProtocolStore
) -> None:
    """It should raise an error when the given protocol ID is not unique."""
    protocol_resource_1 = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "abc.json"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            labware_definitions=[],
        ),
        protocol_key="dummy-data-111",
    )
    protocol_resource_2 = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "def.json"),
            config=JsonProtocolConfig(schema_version=456),
            files=[],
            metadata={},
            labware_definitions=[],
        ),
        protocol_key="dummy-data-222",
    )
    subject.insert(protocol_resource_1)

    # Don't care what it raises. Exception type is not part of the public interface.
    # We just care that it doesn't corrupt the database.
    with pytest.raises(Exception):
        subject.insert(protocol_resource_2)

    assert subject.get_all() == [protocol_resource_1]  # No traces of the failed insert.


async def test_get_missing_protocol_raises(subject: ProtocolStore) -> None:
    """It should raise an error when protocol not found."""
    with pytest.raises(ProtocolNotFoundError, match="protocol-id"):
        subject.get("protocol-id")


async def test_get_all_protocols(
    protocol_file_directory: Path, subject: ProtocolStore
) -> None:
    """It should get all protocols existing in the store."""
    created_at_1 = datetime(year=2021, month=1, day=1, tzinfo=timezone.utc)
    created_at_2 = datetime(year=2022, month=2, day=2, tzinfo=timezone.utc)

    resource_1 = ProtocolResource(
        protocol_id="abc",
        created_at=created_at_1,
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "abc.py"),
            config=PythonProtocolConfig(api_version=APIVersion(1234, 5678)),
            files=[],
            metadata={},
            labware_definitions=[],
        ),
        protocol_key="dummy-data-111",
    )
    resource_2 = ProtocolResource(
        protocol_id="123",
        created_at=created_at_2,
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "abc.json"),
            config=JsonProtocolConfig(schema_version=1234),
            files=[],
            metadata={},
            labware_definitions=[],
        ),
        protocol_key="dummy-data-222",
    )

    subject.insert(resource_1)
    subject.insert(resource_2)
    result = subject.get_all()

    assert result == [resource_1, resource_2]


async def test_remove_protocol(
    protocol_file_directory: Path, subject: ProtocolStore
) -> None:
    """It should remove specified protocol's files from store."""
    directory = protocol_file_directory
    main_file = protocol_file_directory / "protocol.json"
    other_file = protocol_file_directory / "labware.json"

    main_file.touch()
    other_file.touch()

    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=directory,
            main_file=main_file,
            config=JsonProtocolConfig(schema_version=123),
            files=[
                ProtocolSourceFile(path=main_file, role=ProtocolFileRole.MAIN),
                ProtocolSourceFile(path=other_file, role=ProtocolFileRole.LABWARE),
            ],
            metadata={},
            labware_definitions=[],
        ),
        protocol_key="dummy-data-111",
    )

    subject.insert(protocol_resource)
    subject.remove("protocol-id")

    assert directory.exists() is False
    assert main_file.exists() is False
    assert other_file.exists() is False

    with pytest.raises(ProtocolNotFoundError, match="protocol-id"):
        subject.get("protocol-id")


async def test_remove_missing_protocol_raises(
    subject: ProtocolStore,
) -> None:
    """It should raise an error when trying to remove missing protocol."""
    with pytest.raises(ProtocolNotFoundError, match="protocol-id"):
        subject.remove("protocol-id")
