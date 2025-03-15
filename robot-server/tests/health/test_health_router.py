"""Tests for the /health router."""

import pytest
from typing import Dict, Iterator
from mock import MagicMock, patch
from starlette.testclient import TestClient

from opentrons.protocol_api import MAX_SUPPORTED_VERSION, MIN_SUPPORTED_VERSION

from robot_server.health.router import ComponentVersions, get_versions, _get_version


def test_get_health(
    api_client: TestClient, hardware: MagicMock, versions: MagicMock
) -> None:
    """Test GET /health."""
    hardware.fw_version = "FW111"
    hardware.board_revision = "BR2.1"
    hardware.get_serial_number.return_value = "mytestserial"
    versions.return_value = ComponentVersions(
        api_version="mytestapiversion", system_version="mytestsystemversion"
    )

    expected = {
        "name": "opentrons-dev",
        "api_version": "mytestapiversion",
        "fw_version": "FW111",
        "board_revision": "BR2.1",
        "logs": [
            "/logs/serial.log",
            "/logs/api.log",
            "/logs/server.log",
            "/logs/update_server.log",
        ],
        "system_version": "mytestsystemversion",
        "minimum_protocol_api_version": list(MIN_SUPPORTED_VERSION[:2]),
        "maximum_protocol_api_version": list(MAX_SUPPORTED_VERSION[:2]),
        "robot_model": "OT-2 Standard",
        "links": {
            "apiLog": "/logs/api.log",
            "serialLog": "/logs/serial.log",
            "serverLog": "/logs/server.log",
            "apiSpec": "/openapi.json",
            "systemTime": "/system/time",
        },
        "robot_serial": "mytestserial",
    }

    resp = api_client.get("/health")
    text = resp.json()

    assert resp.status_code == 200
    assert text == expected


def test_get_health_with_none_version(
    api_client: TestClient, hardware: MagicMock, versions: MagicMock
) -> None:
    """Test GET /health with no serial number."""
    hardware.fw_version = "FW111"
    hardware.board_revision = "BR2.1"
    hardware.get_serial_number.return_value = None
    versions.return_value = ComponentVersions(
        api_version="mytestapiversion", system_version="mytestsystemversion"
    )

    expected = {
        "name": "opentrons-dev",
        "api_version": "mytestapiversion",
        "fw_version": "FW111",
        "board_revision": "BR2.1",
        "logs": [
            "/logs/serial.log",
            "/logs/api.log",
            "/logs/server.log",
            "/logs/update_server.log",
        ],
        "system_version": "mytestsystemversion",
        "minimum_protocol_api_version": list(MIN_SUPPORTED_VERSION[:2]),
        "maximum_protocol_api_version": list(MAX_SUPPORTED_VERSION[:2]),
        "robot_model": "OT-2 Standard",
        "links": {
            "apiLog": "/logs/api.log",
            "serialLog": "/logs/serial.log",
            "serverLog": "/logs/server.log",
            "apiSpec": "/openapi.json",
            "systemTime": "/system/time",
        },
    }

    resp = api_client.get("/health")
    text = resp.json()

    assert resp.status_code == 200
    assert text == expected


@pytest.fixture
def mock_version_file_contents() -> Iterator[MagicMock]:
    """Returns a mock for version file contents."""
    with patch("robot_server.health.router._get_version", spec=_get_version) as p:
        p.return_value = {}
        yield p


@pytest.fixture
def mock_config_version() -> Iterator[MagicMock]:
    """Returns a mock for the config version."""
    with patch("robot_server.health.router._get_config_system_version") as p:
        p.return_value = "mysystemversion"
        yield p


@pytest.fixture
def mock_api_version() -> Iterator[MagicMock]:
    """Returns a mock for the api version."""
    with patch("robot_server.health.router._get_api_version_dunder") as p:
        p.return_value = "myapiversion"
        yield p


@pytest.mark.parametrize(
    "file_contents,config_system_version,api_version,computed_version",
    [
        (
            {},
            "rightsystemversion",
            "rightapiversion",
            ComponentVersions("rightapiversion", "rightsystemversion"),
        ),
        (
            {"opentrons_api_version": "fileapiversion"},
            "rightsystemversion",
            "wrongapiversion",
            ComponentVersions("fileapiversion", "rightsystemversion"),
        ),
        (
            {"buildroot_version": "filesystemversion"},
            "wrongsystemversion",
            "rightapiversion",
            ComponentVersions("rightapiversion", "filesystemversion"),
        ),
        (
            {"openembedded_version": "filesystemversion"},
            "wrongsystemversion",
            "rightapiversion",
            ComponentVersions("rightapiversion", "filesystemversion"),
        ),
        (
            {
                "opentrons_api_version": "fileapiversion",
                "buildroot_version": "filesystemversion",
            },
            "wrongsystemversion",
            "wrongapiversion",
            ComponentVersions("fileapiversion", "filesystemversion"),
        ),
        (
            {
                "opentrons_api_version": "fileapiversion",
                "openembedded_version": "filesystemversion",
            },
            "wrongsystemversion",
            "wrongapiversion",
            ComponentVersions("fileapiversion", "filesystemversion"),
        ),
    ],
)
async def test_version_dependency(
    file_contents: Dict[str, str],
    config_system_version: str,
    api_version: str,
    computed_version: ComponentVersions,
    mock_version_file_contents: MagicMock,
    mock_config_version: MagicMock,
    mock_api_version: MagicMock,
) -> None:
    """Tests whether the version dependency function works."""
    mock_version_file_contents.return_value = file_contents
    mock_config_version.return_value = config_system_version
    mock_api_version.return_value = api_version
    assert (await get_versions()) == computed_version
