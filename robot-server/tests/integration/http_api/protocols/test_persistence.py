import asyncio
from pathlib import Path
import secrets
from typing import Callable, Dict, IO, List

import anyio
import pytest

from robot_server.persistence.file_and_directory_names import LATEST_VERSION_DIRECTORY

from tests.integration.dev_server import DevServer
from tests.integration.robot_client import RobotClient, poll_until_all_analyses_complete
from tests.integration.protocol_files import get_py_protocol, get_json_protocol


pytestmark = pytest.mark.slow


@pytest.mark.parametrize("protocol", [(get_py_protocol), (get_json_protocol)])
async def test_protocols_and_analyses_persist(
    protocol: Callable[[str], IO[bytes]]
) -> None:
    """Test protocol and analysis persistence.

    Uploaded protocols and their completed analyses should remain constant across
    server restarts.
    """
    port = "15555"
    async with RobotClient.make(
        base_url=f"http://localhost:{port}", version="*"
    ) as robot_client:
        assert await robot_client.dead(), "Dev Robot is running and must not be."
        with DevServer(port=port) as server:
            server.start()
            await robot_client.wait_until_ready()

            # Must not be so high that the server runs out of room and starts
            # auto-deleting old protocols.
            protocols_to_create = 5

            for _ in range(protocols_to_create):
                with protocol(secrets.token_urlsafe(16)) as file:
                    await robot_client.post_protocol([Path(file.name)])

            await asyncio.wait_for(
                poll_until_all_analyses_complete(robot_client), timeout=30
            )

            # The protocols response will include analysis statuses. Fetch it
            # *after* all analyses complete to make sure it's deterministic.
            protocols_before_restart = (await robot_client.get_protocols()).json()[
                "data"
            ]
            analyses_before_restart = await _get_all_analyses(robot_client)

            server.stop()
            assert await robot_client.dead(), "Dev Robot did not stop."

            server.start()
            await robot_client.wait_until_ready()

            protocols_after_restart = (await robot_client.get_protocols()).json()[
                "data"
            ]
            analyses_after_restart = await _get_all_analyses(robot_client)

            # The number of uploaded protocols prior to restart equals the number
            # of protocols in the get protocols response after restart.
            assert len(protocols_after_restart) == protocols_to_create

            # The protocols after restart are the same as prior to restart,
            # except we don't care about order.
            protocols_before_restart.sort(key=lambda p: p["id"])
            protocols_after_restart.sort(key=lambda p: p["id"])
            assert protocols_after_restart == protocols_before_restart

            # Each protocol's analysis is the same as prior to restart.
            assert analyses_after_restart == analyses_before_restart

            server.stop()


async def test_protocol_labware_files_persist() -> None:
    """Upload a python protocol and 2 custom labware files.

    Test that labware files are persisted on server restart.
    """
    port = "15556"
    async with RobotClient.make(
        base_url=f"http://localhost:{port}", version="*"
    ) as robot_client:
        assert await robot_client.dead(), "Dev Robot is running and must not be."
        with DevServer(port=port) as server:
            server.start()
            await robot_client.wait_until_ready()

            protocol = await robot_client.post_protocol(
                [
                    Path("./tests/integration/protocols/cpx_4_6_tuberack_100ul.py"),
                    Path("./tests/integration/protocols/cpx_4_tuberack_100ul.json"),
                    Path("./tests/integration/protocols/cpx_6_tuberack_100ul.json"),
                ]
            )
            protocol_upload_json = protocol.json()
            protocol_id = protocol_upload_json["data"]["id"]

            result = await robot_client.get_protocol(protocol_id)
            protocol_detail = result.json()["data"]
            # The analysisSummaries field is nondeterministic because the observed
            # analysis statuses depend on request timing.
            # Since we already cover analysis persistence elsewhere in this file,
            # we can ignore the whole field in this test to avoid the nondeterminism.
            del protocol_detail["analysisSummaries"]

            with anyio.fail_after(30):
                # todo(mm, 2024-09-20): This works around a bug where robot-server
                # shutdown will hang if there is an ongoing analysis. This slows down
                # this test and should be removed when that bug is fixed.
                # https://opentrons.atlassian.net/browse/EXEC-716
                await poll_until_all_analyses_complete(robot_client)

            server.stop()
            assert await robot_client.dead(), "Dev Robot did not stop."
            server.start()
            await robot_client.wait_until_ready()

            result = await robot_client.get_protocol(protocol_id)
            restarted_protocol_detail = result.json()["data"]
            del restarted_protocol_detail["analysisSummaries"]

            protocol_detail["files"].sort(key=lambda n: n["name"])
            restarted_protocol_detail["files"].sort(key=lambda n: n["name"])
            assert restarted_protocol_detail == protocol_detail

            four_tuberack = Path(
                f"{server.persistence_directory}/{LATEST_VERSION_DIRECTORY}/protocols/{protocol_id}/cpx_4_tuberack_100ul.json"
            )
            six_tuberack = Path(
                f"{server.persistence_directory}/{LATEST_VERSION_DIRECTORY}/protocols/{protocol_id}/cpx_6_tuberack_100ul.json"
            )
            assert four_tuberack.is_file()
            assert six_tuberack.is_file()
            server.stop()


async def _get_all_analyses(robot_client: RobotClient) -> Dict[str, List[object]]:
    """Fetch a complete list of full analyses for every protocol.

    The HTTP API offers no single endpoint that does this, so this synthesizes
    responses from multiple endpoints.

    Returns:
        A mapping from protocol ID to a list of that protocol's full analyses.
    """
    analyses_by_protocol_id: Dict[str, List[object]] = {}

    protocols_response = await robot_client.get_protocols()
    protocols = protocols_response.json()["data"]

    for protocol in protocols:
        analyses_on_this_protocol: List[object] = []

        protocol_id = protocol["id"]
        analysis_ids = [a["id"] for a in protocol["analysisSummaries"]]

        for analysis_id in analysis_ids:
            analysis_response = await robot_client.get_analysis(
                protocol_id=protocol_id,
                analysis_id=analysis_id,
            )
            analysis_as_document_response = await robot_client.get_analysis_as_document(
                protocol_id=protocol_id,
                analysis_id=analysis_id,
            )
            analyses_on_this_protocol.append(
                (analysis_response.json()["data"], analysis_as_document_response.json())
            )

        analyses_by_protocol_id[protocol_id] = analyses_on_this_protocol

    return analyses_by_protocol_id
