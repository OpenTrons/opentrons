"""Test reset persistence directory option."""
import pytest
from pathlib import Path

from robot_server.persistence import (
    ResetManager,
    _TO_BE_DELETED_ON_REBOOT,
    _reset_persistence_directory,
)


@pytest.fixture
def reset_manager() -> ResetManager:
    """Get a ResetManager test subject."""
    return ResetManager()


async def test_test_reset_db(reset_manager: ResetManager, tmp_path: Path) -> None:
    """Should delete persistance directory if a file makred to delete exists."""
    assert Path(tmp_path, _TO_BE_DELETED_ON_REBOOT).exists() is False

    await reset_manager.mark_directory_reset(tmp_path)

    assert Path(tmp_path, _TO_BE_DELETED_ON_REBOOT).exists() is True


async def test_delete_persistence_directory(
    reset_manager: ResetManager, tmp_path: Path
) -> None:
    """Should make sure directory is empty."""
    await reset_manager.mark_directory_reset(tmp_path)

    result = await _reset_persistence_directory(tmp_path)

    assert result is True

    assert Path(tmp_path).exists() is False


async def test_delete_persistence_directory_not_found(
    reset_manager: ResetManager,
) -> None:
    """Should make sure a directory that is not found is caught in OSError."""
    result = await _reset_persistence_directory(Path("/dir-not-found"))

    assert result is False
