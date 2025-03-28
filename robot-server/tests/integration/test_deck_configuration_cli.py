"""Integration tests for `robot_server.deck_configuration.cli`."""

import asyncio
import copy
import pathlib
import sys

import pytest

from .dev_server import DevServer
from .robot_client import RobotClient

from opentrons.calibration_storage import deserialize_deck_configuration
from opentrons.calibration_storage.types import CutoutFixturePlacement


# Our Tavern tests have servers that stay up for the duration of the test session.
# We need to pick a different port for our servers to avoid colliding with those.
# Beware that if there is a collision, these tests' manual DevServer() constructions will currently
# *not* raise an error--the tests will try to use the preexisting session-scoped servers. :(
_PORT = "15555"


async def run_cli(persistence_directory: pathlib.Path) -> bytes:
    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "robot_server.deck_configuration.cli",
        "--persistence-directory",
        str(persistence_directory),
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    assert (
        proc.returncode == 0
    ), f"Subprocess exited with failure.\nstdout:\n{stdout!r}\nstderr:\n{stderr.decode()}"
    return stdout


@pytest.mark.slow
async def test_deck_configuration_cli(tmp_path: pathlib.Path) -> None:
    """Test that the deck config CLI's output reflects changes made over HTTP."""
    persistence_directory = tmp_path / "persistence_directory"

    async with RobotClient.make(
        base_url=f"http://localhost:{_PORT}", version="*"
    ) as robot_client:
        with DevServer(
            is_ot3=True, persistence_directory=persistence_directory, port=_PORT
        ) as server:
            # The CLI should return some default deck configuration even when the
            # persistence directory is empty.
            initial_cli_output = await run_cli(persistence_directory)
            assert deserialize_deck_configuration(initial_cli_output) is not None

            server.start()
            await robot_client.wait_until_ready()

            # Use the HTTP API to make a single modification to the deck config.
            initial_http_deck_config = (
                await robot_client.get_deck_configuration()
            ).json()["data"]
            modified_http_deck_config = copy.deepcopy(initial_http_deck_config)
            for cutout_fixture in modified_http_deck_config["cutoutFixtures"]:
                if cutout_fixture["cutoutId"] == "cutoutD3":
                    cutout_fixture["cutoutFixtureId"] = "stagingAreaRightSlot"
            assert modified_http_deck_config != initial_http_deck_config
            await robot_client.put_deck_configuration(
                {"data": modified_http_deck_config}
            )

            server.stop()

            # The CLI should see the modification that we made over HTTP.
            new_cli_output = await run_cli(persistence_directory)
            deserialized_new_cli_output = deserialize_deck_configuration(new_cli_output)
            assert deserialized_new_cli_output is not None
            assert (
                CutoutFixturePlacement(
                    cutout_id="cutoutD3",
                    cutout_fixture_id="stagingAreaRightSlot",
                    opentrons_module_serial_number=None,
                )
                in deserialized_new_cli_output[0]
            )
