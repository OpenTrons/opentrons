import asyncio
import secrets
from pathlib import Path
from shutil import copytree
from tempfile import TemporaryDirectory

import anyio
import httpx
import pytest

from tests.integration.dev_server import DevServer
from tests.integration.robot_client import RobotClient, poll_until_all_analyses_complete
from tests.integration.protocol_files import get_py_protocol, get_json_protocol

from .persistence_snapshots_dir import PERSISTENCE_SNAPSHOTS_DIR


pytestmark = pytest.mark.slow


_CORRUPT_PERSISTENCE_DIR = PERSISTENCE_SNAPSHOTS_DIR / "corrupt"


def _get_corrupt_persistence_dir() -> Path:
    """Get the path to a corrupt persistence directory.

    Each call returns a new copy, so file writes and deletions don't leak across tests.
    """
    temp_dir = Path(TemporaryDirectory().name) / _CORRUPT_PERSISTENCE_DIR.name
    copytree(src=_CORRUPT_PERSISTENCE_DIR, dst=temp_dir)
    return temp_dir


async def _assert_reset_was_successful(
    robot_client: RobotClient, persistence_directory: Path
) -> None:
    # We really want to check that the server's persistence directory has been wiped
    # clean, but testing that directly would rely on internal implementation details
    # of file layout and tend to be brittle.
    # As an approximation, just check that there are no protocols or runs left.
    assert (await robot_client.get_protocols()).json()["data"] == []
    assert (await robot_client.get_runs()).json()["data"] == []


async def _wait_until_initialization_failed(robot_client: RobotClient) -> None:
    """Wait until the server returns an "initialization failed" health status."""
    sleep_sec = 0.1
    while True:
        try:
            response = await robot_client.get_health()
        except httpx.ConnectError:
            # The server hasn't even started responding to requests yet.
            await asyncio.sleep(sleep_sec)
        except httpx.HTTPStatusError as error:
            if error.response.status_code == 500:
                # The server has reached the expected failure.
                return
            elif error.response.status_code == 503:
                # The server is still busy initializing.
                await asyncio.sleep(sleep_sec)
            else:
                # The server has reported some other unexpected status code.
                assert (
                    False
                ), f"Expected server to report failed initialization, but got: {response}"
        else:
            # Server hasn't has unexpectedly reported success.
            assert (
                False
            ), f"Expected server to report failed initialization, but got: {response}"


async def test_upload_protocols_and_reset_persistence_dir() -> None:
    """Test resetting runs history.

    Immediately after resetting runs history, existing resources should remain
    available over HTTP.

    But after restarting the server, those resources should be gone.
    """
    port = "15555"
    async with RobotClient.make(
        base_url=f"http://localhost:{port}", version="*"
    ) as robot_client:
        assert await robot_client.dead(), "Dev Robot is running and must not be."
        with DevServer(port=port) as server:
            server.start()
            await robot_client.wait_until_ready()

            with get_py_protocol(secrets.token_urlsafe(16)) as file:
                await robot_client.post_protocol([Path(file.name)])

            with get_json_protocol(secrets.token_urlsafe(16)) as file:
                await robot_client.post_protocol([Path(file.name)])

            with anyio.fail_after(30):
                # todo(mm, 2024-09-20): This works around a bug where robot-server
                # shutdown will hang if there is an ongoing analysis. This slows down
                # this test and should be removed when that bug is fixed.
                # https://opentrons.atlassian.net/browse/EXEC-716
                await poll_until_all_analyses_complete(robot_client)

            await robot_client.post_setting_reset_options({"runsHistory": True})

            result = await robot_client.get_protocols()

            assert len(result.json()["data"]) == 2

            # Restart to enact the reset.
            server.stop()
            assert await robot_client.dead(), "Dev Robot did not stop."
            server.start()
            await robot_client.wait_until_ready()

            await _assert_reset_was_successful(
                robot_client=robot_client,
                persistence_directory=server.persistence_directory,
            )

            server.stop()


async def test_reset_is_available_even_with_corrupt_persistence_directory() -> None:
    """Test resetting runs history when the persistence directory is corrupted."""
    port = "15555"
    persistence_dir = _get_corrupt_persistence_dir()
    async with RobotClient.make(
        base_url=f"http://localhost:{port}", version="*"
    ) as robot_client:
        assert await robot_client.dead(), "Dev Robot is running and must not be."
        with DevServer(port=port, persistence_directory=persistence_dir) as server:
            server.start()
            await _wait_until_initialization_failed(robot_client)

            await robot_client.post_setting_reset_options({"runsHistory": True})

            # Restart to enact the reset.
            server.stop()
            assert await robot_client.dead(), "Dev Robot did not stop."
            server.start()
            await robot_client.wait_until_ready()

            await _assert_reset_was_successful(
                robot_client=robot_client,
                persistence_directory=server.persistence_directory,
            )

            server.stop()
