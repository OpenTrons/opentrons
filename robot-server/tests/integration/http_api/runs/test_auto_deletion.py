from typing import List, Optional

import pytest

from tests.integration.dev_server import DevServer
from tests.integration.robot_client import RobotClient


@pytest.mark.slow
@pytest.mark.parametrize(
    ("num_to_configure_as_maximum", "num_to_upload", "num_to_expect"),
    [
        (None, 25, 20),  # Test that the server enforces a limit of 20 by default.
        (3, 6, 3),
    ],
)
async def test_runs_auto_delete(
    num_to_configure_as_maximum: Optional[int],
    num_to_upload: int,
    num_to_expect: int,
) -> None:
    port = "15555"
    async with RobotClient.make(
        base_url=f"http://localhost:{port}", version="*"
    ) as robot_client:
        assert await robot_client.dead(), "Dev Robot is running and must not be."
        with DevServer(port=port, maximum_runs=num_to_configure_as_maximum) as server:
            server.start()
            await robot_client.wait_until_ready()

            created_run_ids = await _create_runs(
                robot_client=robot_client, num_runs=num_to_upload
            )

            fetched_run_ids = await _get_run_ids(robot_client=robot_client)
            # Last n elements of created_run_ids.
            run_ids_to_expect = created_run_ids[-num_to_expect:]
            assert set(fetched_run_ids) == set(run_ids_to_expect)


async def _create_runs(
    robot_client: RobotClient,
    num_runs: int,
) -> List[str]:
    """Upload several runs and return their IDs."""
    created_run_ids: List[str] = []
    for _ in range(num_runs):
        response = await robot_client.post_run(req_body={"data": {}})
        created_run_ids.append(response.json()["data"]["id"])
    return created_run_ids


async def _get_run_ids(robot_client: RobotClient) -> List[str]:
    """Return the IDs of all runs on the server."""
    response = await robot_client.get_runs(length=None)
    return [p["id"] for p in response.json()["data"]]
