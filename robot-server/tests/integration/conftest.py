import asyncio
import contextlib
import json
import time
from pathlib import Path
from typing import Any, Dict, Generator

import pytest
import requests

from robot_server.versioning import API_VERSION_HEADER, LATEST_API_VERSION_HEADER_VALUE

from .dev_server import DevServer
from .dev_system_server import DevSystemServer
from .robot_client import RobotClient


_SESSION_SERVER_SCHEME = "http://"
_SESSION_SERVER_HOST = "localhost"
_OT2_SESSION_SERVER_PORT = "31950"
_OT3_SESSION_SERVER_PORT = "31960"

_SESSION_SYSTEM_SERVER_PORT = "32950"


def get_auth_token() -> str:
    """Obtains an auth token from the system server on startup."""
    session = requests.Session()
    base_url = (
        f"{_SESSION_SERVER_SCHEME}{_SESSION_SERVER_HOST}:{_SESSION_SYSTEM_SERVER_PORT}"
    )

    registration: str = session.post(
        url=f"{base_url}/system/register",
        params={
            "subject": "ot_integration_tests",
            "agent": "pytest",
            "agentId": "pytest123",
        },
    ).json()["token"]

    token: str = session.post(
        url=f"{base_url}/system/authorize",
        headers={
            "authenticationBearer": registration,
        },
    ).json()["token"]

    return token


def pytest_tavern_beta_before_every_test_run(
    test_dict: Dict[str, Any],
    variables: Any,
) -> None:
    """Add Opentrons-Version header to requests that don't specify it."""
    token = get_auth_token()
    for stage in test_dict["stages"]:
        headers = stage["request"].get("headers", {})
        headers.setdefault("Opentrons-Version", "*")
        headers.setdefault("authenticationBearer", token)
        stage["request"].update({"headers": headers})


def pytest_tavern_beta_after_every_response(
    expected: Any, response: requests.Response
) -> None:
    print(response.url)
    print(json.dumps(response.json(), indent=4))


@pytest.fixture
def ot2_server_set_disable_fast_analysis(
    ot2_server_base_url: str,
) -> Generator[None, None, None]:
    """For integration tests that need to set then clear the
    disableFastProtocolUpload feature flag"""
    url = f"{ot2_server_base_url}/settings"
    data = {"id": "disableFastProtocolUpload", "value": True}
    with _requests_session() as requests_session:
        requests_session.post(url, json=data)
        yield None
        data["value"] = None
        requests.post(url, json=data)


@pytest.fixture
def ot2_server_base_url(
    _ot2_session_server: str, system_server_session_server: str
) -> Generator[str, None, None]:
    """Return the URL for a running dev server.

    Because it can take several seconds to start up and shut down, one server is shared across all
    tests in the test session. This fixture softly "resets" it after each test by deleting all
    runs and protocols, which provides good enough isolation in practice.
    """
    yield _ot2_session_server
    _clean_server_state(_ot2_session_server, system_server_session_server)


@pytest.fixture
def ot3_server_base_url(
    _ot3_session_server: str, system_server_session_server: str
) -> Generator[str, None, None]:
    """Like `ot2_server_base_url()`, but the server is configured as an OT-3 instead of an OT-2."""
    yield _ot3_session_server
    _clean_server_state(_ot3_session_server, system_server_session_server)


@pytest.fixture
def session_system_server_port(system_server_session_server: str) -> str:
    """Return the port of the running session-scoped dev server."""
    return _SESSION_SYSTEM_SERVER_PORT


@pytest.fixture(scope="session")
def system_server_session_server() -> Generator[str, None, None]:
    """Run the system server as a background process and yield the base url."""
    base_url = (
        f"{_SESSION_SERVER_SCHEME}{_SESSION_SERVER_HOST}:{_SESSION_SYSTEM_SERVER_PORT}"
    )
    with DevSystemServer(port=_SESSION_SYSTEM_SERVER_PORT) as dev_server:
        dev_server.start()

        with _requests_session() as requests_session:
            # Wait for a bit to get started by polling for a connection error
            from requests.exceptions import ConnectionError

            while True:
                try:
                    requests_session.get(base_url)
                except ConnectionError:
                    # The server isn't up yet to accept requests. Keep polling.
                    pass
                else:
                    # The server's replied with something other than a busy indicator. Stop polling.
                    break

                time.sleep(0.1)

        yield base_url


@pytest.fixture(scope="session")
def _ot2_session_server(server_temp_directory: str) -> Generator[str, None, None]:
    base_url = (
        f"{_SESSION_SERVER_SCHEME}{_SESSION_SERVER_HOST}:{_OT2_SESSION_SERVER_PORT}"
    )
    with DevServer(
        port=_OT2_SESSION_SERVER_PORT,
        ot_api_config_dir=Path(server_temp_directory),
        system_server_port=_SESSION_SYSTEM_SERVER_PORT,
    ) as dev_server:
        dev_server.start()
        _wait_until_ready(base_url)
        yield base_url


@pytest.fixture(scope="session")
def _ot3_session_server(server_temp_directory: str) -> Generator[str, None, None]:
    base_url = (
        f"{_SESSION_SERVER_SCHEME}{_SESSION_SERVER_HOST}:{_OT3_SESSION_SERVER_PORT}"
    )
    with DevServer(
        port=_OT3_SESSION_SERVER_PORT,
        is_ot3=True,
        ot_api_config_dir=Path(server_temp_directory),
        system_server_port=_SESSION_SYSTEM_SERVER_PORT,
    ) as dev_server:
        dev_server.start()
        _wait_until_ready(base_url)
        yield base_url


@contextlib.contextmanager
def _requests_session() -> Generator[requests.Session, None, None]:
    with requests.Session() as session:
        session.headers.update({API_VERSION_HEADER: LATEST_API_VERSION_HEADER_VALUE})
        yield session


def _wait_until_ready(base_url: str) -> None:
    with _requests_session() as requests_session:
        while True:
            try:
                health_response = requests_session.get(f"{base_url}/health")
            except requests.ConnectionError:
                # The server isn't up yet to accept requests. Keep polling.
                pass
            else:
                if health_response.status_code == 503:
                    # The server is accepting requests but reporting not ready. Keep polling.
                    pass
                else:
                    # The server's replied with something other than a busy indicator. Stop polling.
                    return

            time.sleep(0.1)


def _clean_server_state(base_url: str, system_server_session_server: str) -> None:
    async def _clean_server_state_async() -> None:
        async with RobotClient.make(
            base_url=base_url,
            version="*",
            system_server_base_url=system_server_session_server,
        ) as robot_client:
            # Delete runs first because protocols can't be deleted if a run refers to them.
            await robot_client.get_auth_token()
            await _delete_all_runs(robot_client)
            await _delete_all_protocols(robot_client)

    asyncio.run(_clean_server_state_async())


async def _delete_all_runs(robot_client: RobotClient) -> None:
    """Delete all runs on the robot server."""
    response = await robot_client.get_runs()
    run_ids = [r["id"] for r in response.json()["data"]]
    for run_id in run_ids:
        await robot_client.delete_run(run_id)


async def _delete_all_protocols(robot_client: RobotClient) -> None:
    """Delete all protocols on the robot server"""
    response = await robot_client.get_protocols()
    protocol_ids = [p["id"] for p in response.json()["data"]]
    for protocol_id in protocol_ids:
        await robot_client.delete_protocol(protocol_id)
