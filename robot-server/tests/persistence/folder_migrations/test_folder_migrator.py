from pathlib import Path
from typing import List, NamedTuple, Set

import pytest
from robot_server.persistence import folder_migrations

from robot_server.persistence.folder_migrations import folder_migrator


# TODO: More exhaustive tests here.

# - Deletes oldest n directories and legacy files (tolerating them not existing)
# - Temp file cleanup
# - Generally does not leave temp files hanging around in root directory


def test_noop_if_no_migrations_supplied(tmp_path: Path) -> None:
    """Migrating should no-op if no migrations are configured."""
    subject = folder_migrator.MigrationOrchestrator(
        root=tmp_path,
        legacy_uncontained_items=[],
        migrations=[],
        temp_file_prefix="tmp",
    )

    (tmp_path / "a").write_text("original a contents")
    (tmp_path / "b_dir").mkdir()
    (tmp_path / "b_dir" / "b").write_text("original b contents")

    subject.migrate_to_latest()

    assert _children(tmp_path) == {"a", "b_dir"}
    assert (tmp_path / "a").read_text() == "original a contents"
    assert (tmp_path / "b_dir" / "b").read_text() == "original b contents"


def test_noop_if_no_migrations_required(tmp_path: Path) -> None:
    """Migrating should no-op if it looks like we're already at the latest version."""

    class OlderMigration(folder_migrator.Migration):
        def migrate(self, source_dir: Path, dest_dir: Path) -> None:
            assert False, "This should never run."

    class NewerMigration(folder_migrator.Migration):
        def migrate(self, source_dir: Path, dest_dir: Path) -> None:
            assert False, "This should never run."

    subject = folder_migrator.MigrationOrchestrator(
        root=tmp_path,
        legacy_uncontained_items=[],
        migrations=[
            OlderMigration(subdirectory="older_dir", debug_name="older"),
            NewerMigration(subdirectory="newer_dir", debug_name="newer"),
        ],
        temp_file_prefix="tmp",
    )

    (tmp_path / "older_dir").mkdir()
    (tmp_path / "older_dir" / "older_file").write_text("original older_file contents")
    (tmp_path / "newer_dir").mkdir()
    (tmp_path / "newer_dir" / "newer_file").write_text("original newer_file contents")

    subject.migrate_to_latest()

    assert _children(tmp_path) == {"older_dir", "newer_dir"}
    assert (
        tmp_path / "older_dir" / "older_file"
    ).read_text() == "original older_file contents"
    assert (
        tmp_path / "newer_dir" / "newer_file"
    ).read_text() == "original newer_file contents"


def test_migration_chain_from_scratch(tmp_path: Path) -> None:
    """It should successfully go through the migration chain starting from scratch."""

    class MigrationA(folder_migrator.Migration):
        def migrate(self, source_dir: Path, dest_dir: Path) -> None:
            assert (source_dir / "legacy_file").exists()
            (dest_dir / "a_file").touch()

    class MigrationB(folder_migrator.Migration):
        def migrate(self, source_dir: Path, dest_dir: Path) -> None:
            assert (source_dir / "a_file").exists()
            (dest_dir / "b_file").touch()

    class MigrationC(folder_migrator.Migration):
        def migrate(self, source_dir: Path, dest_dir: Path) -> None:
            assert (source_dir / "b_file").exists()
            (dest_dir / "c_file").touch()

    subject = folder_migrator.MigrationOrchestrator(
        root=tmp_path,
        legacy_uncontained_items=["legacy_file"],
        migrations=[
            MigrationA("A", "a_dir"),
            MigrationB("B", "b_dir"),
            MigrationC("C", "c_dir"),
        ],
        temp_file_prefix="temp",
    )

    (tmp_path / "legacy_file").touch()

    subject.migrate_to_latest()

    assert {child.name for child in tmp_path.iterdir()} == {"legacy_file", "c_dir"}
    assert (tmp_path / "c_dir" / "c_file").exists()


def test_migration_chain_from_intermediate(tmp_path: Path) -> None:
    (tmp_path / "legacy_file").touch()
    (tmp_path / "a_dir").mkdir()
    (tmp_path / "a_dir" / "a_file").touch()

    class MigrationA(folder_migrator.Migration):
        def migrate(self, source_dir: Path, dest_dir: Path) -> None:
            assert False, "This should never run."

    class MigrationB(folder_migrator.Migration):
        def migrate(self, source_dir: Path, dest_dir: Path) -> None:
            assert (source_dir / "a_file").exists()
            (dest_dir / "b_file").touch()

    class MigrationC(folder_migrator.Migration):
        def migrate(self, source_dir: Path, dest_dir: Path) -> None:
            assert (source_dir / "b_file").exists()
            (dest_dir / "c_file").touch()

    subject = folder_migrator.MigrationOrchestrator(
        root=tmp_path,
        legacy_uncontained_items=["legacy_file"],
        migrations=[
            MigrationA("A", "a_dir"),
            MigrationB("B", "b_dir"),
            MigrationC("C", "c_dir"),
        ],
        temp_file_prefix="temp",
    )

    subject.migrate_to_latest()

    assert {child.name for child in tmp_path.iterdir()} == {
        "legacy_file",
        "a_dir",
        "c_dir",
    }
    assert (tmp_path / "c_dir" / "c_file").exists()


class DeleteOldestTestCase(NamedTuple):
    fs_has_legacy_file: bool
    fs_num_directories: int
    num_migrations_to_configure: int
    num_old_versions_to_keep: int
    expected_surviving_children: Set[str]


@pytest.mark.parametrize(
    DeleteOldestTestCase._fields,
    [
        DeleteOldestTestCase(
            # Nothing is deleted.
            fs_has_legacy_file=True,
            fs_num_directories=5,
            num_migrations_to_configure=5,
            num_old_versions_to_keep=999999,
            expected_surviving_children={
                "dir_5",
                "dir_4",
                "dir_3",
                "dir_2",
                "dir_1",
                "legacy_file",
            },
        ),
        DeleteOldestTestCase(
            # Everything is deleted except for the very newest (dir5).
            fs_has_legacy_file=True,
            fs_num_directories=5,
            num_migrations_to_configure=5,
            num_old_versions_to_keep=0,
            expected_surviving_children={"dir_5"},
        ),
        DeleteOldestTestCase(
            # The oldest directories are deleted to keep just the newest (dir_5),
            # and the prior num_old_versions_to_keep (dir_4 and dir_3).
            fs_has_legacy_file=False,
            fs_num_directories=5,
            num_migrations_to_configure=5,
            num_old_versions_to_keep=2,
            expected_surviving_children={"dir_5", "dir_4", "dir_3"},
        ),
        DeleteOldestTestCase(
            # Same as above, but with a legacy file. The legacy file gets deleted
            # because it counts as too old.
            fs_has_legacy_file=True,
            fs_num_directories=5,
            num_migrations_to_configure=5,
            num_old_versions_to_keep=2,
            expected_surviving_children={
                "dir_5",
                "dir_4",
                "dir_3",
            },
        ),
        DeleteOldestTestCase(
            # TODO: Consider expected behavior here.
            fs_has_legacy_file=True,
            fs_num_directories=5,
            num_migrations_to_configure=20,
            num_old_versions_to_keep=2,
            expected_surviving_children={"dir_5", "dir_4", "dir_3", "legacy_file"},
        ),
        DeleteOldestTestCase(
            fs_has_legacy_file=True,
            fs_num_directories=5,
            num_migrations_to_configure=20,
            num_old_versions_to_keep=2,
            expected_surviving_children={"dir_5", "dir_4", "dir_3", "legacy_file"},
        ),
    ],
)
def test_delete_oldest(
    fs_has_legacy_file: bool,
    fs_num_directories: int,
    num_migrations_to_configure: int,
    num_old_versions_to_keep: int,
    expected_surviving_children: Set[str],
    tmp_path: Path,
) -> None:
    if fs_has_legacy_file:
        (tmp_path / "legacy_file").touch()

    for i in range(fs_num_directories):
        (tmp_path / f"dir_{i+1}").mkdir()

    class DummyMigration(folder_migrator.Migration):
        def migrate(self, source_dir: Path, dest_dir: Path) -> None:
            assert False  # Should not be called.

    migrations: List[folder_migrator.Migration] = [
        DummyMigration(debug_name=str(i+1), subdirectory=f"dir_{i+1}")
        for i in range(num_migrations_to_configure)
    ]

    subject = folder_migrator.MigrationOrchestrator(
        root=tmp_path,
        legacy_uncontained_items=["legacy_file"],
        migrations=migrations,
        temp_file_prefix="tmp",
    )
    subject.delete_old_versions(num_old_versions_to_keep)

    assert _children(tmp_path) == expected_surviving_children


def _children(directory: Path) -> Set[str]:
    return {child.name for child in directory.iterdir()}
