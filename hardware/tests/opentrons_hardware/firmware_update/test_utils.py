"""Test the utils module."""


import json
import os
import secrets
from typing import Any, Dict, Optional
import mock
import pytest
from opentrons_hardware.firmware_bindings.constants import NodeId

from opentrons_hardware.firmware_update.utils import (
    FirmwareUpdateType,
    UpdateInfo,
    load_firmware_manifest,
    check_firmware_updates,
)
from opentrons_hardware.hardware_control.network import DeviceInfoCache


manifest_filename = "opentrons-manifest-test.json"


@pytest.fixture
def mock_manifest() -> Dict[str, Any]:
    """Mock firmware manifest file."""
    return {
        "manifest_version": 1,
        "subsystems": {
            "head": {
                "version": 2,
                "shortsha": "25755efd",
                "files_by_revision": {"rev1": "head-rev1.hex"},
            }
        },
    }


def generate_device_info(
    manifest: Dict[str, Any], random_sha: Optional[bool] = False
) -> Dict[NodeId, DeviceInfoCache]:
    """Helper function to generate device info."""
    device_info_cache: Dict[NodeId, DeviceInfoCache] = {}
    for subsystem, info in manifest["subsystems"].items():
        node_id = NodeId.__members__[subsystem.replace("-", "_")]
        version = info["version"]
        shortsha = secrets.token_hex(4) if random_sha else info["shortsha"]
        device_info_cache.update(
            {node_id: DeviceInfoCache(node_id, version, shortsha, None)}
        )
    return device_info_cache


def generate_update_info(
    manifest: Dict[str, Any], random_sha: Optional[bool] = False
) -> Dict[FirmwareUpdateType, UpdateInfo]:
    """Helper function to generate update info."""
    update_info: Dict[FirmwareUpdateType, UpdateInfo] = {}
    for subsystem, info in manifest["subsystems"].items():
        update_type = FirmwareUpdateType.from_name(subsystem)
        version = info["version"]
        shortsha = secrets.token_hex(4) if random_sha else info["shortsha"]
        files_by_revision = info["files_by_revision"]
        update_info.update(
            {update_type: UpdateInfo(update_type, version, shortsha, files_by_revision)}
        )
    return update_info


def test_load_firmware_manifest_success(mock_manifest: Dict[str, Any]) -> None:
    """Test that we can serialize a manifest file from disk."""
    expected = generate_update_info(mock_manifest)
    # save file
    with open(manifest_filename, "w") as fp:
        json.dump(mock_manifest, fp)

    # test that the file written to disk can be deserialized
    with mock.patch("os.path.exists"):
        updates = load_firmware_manifest(manifest_filename)
        assert updates
        for update_type, update_info in updates.items():
            assert isinstance(update_type, FirmwareUpdateType)
            assert isinstance(update_info, UpdateInfo)
            expected_update_info = expected[update_type]
            assert expected_update_info
            assert expected_update_info.update_type == update_info.update_type
            assert expected_update_info.version == update_info.version
            assert expected_update_info.shortsha == update_info.shortsha
            assert (
                expected_update_info.files_by_revision == update_info.files_by_revision
            )
        os.unlink(manifest_filename)


def test_load_firmware_manifest_file_not_found(mock_manifest: Dict[str, Any]) -> None:
    """Test cases where we cant serialize the manifest file."""
    # return empty if manifest file does not exist
    updates = load_firmware_manifest("unknown-filename.json")
    assert updates == {}


def test_load_firmware_manifest_invalid_json() -> None:
    """Test loading invalid firmware json file."""
    with open(manifest_filename, "w") as fp:
        fp.write("asdasd")
    with mock.patch("os.path.exists"):
        updates = load_firmware_manifest(manifest_filename)
        assert updates == {}
    os.unlink(manifest_filename)


def test_load_firmware_manifest_unknown_update_type(
    mock_manifest: Dict[str, Any]
) -> None:
    """Test unknown update_type."""
    with open(manifest_filename, "w") as fp:
        manifest = mock_manifest.copy()
        manifest["subsystems"].update({"invalid_subsystem": {}})
        json.dump(manifest, fp)
    with mock.patch("os.path.exists"):
        updates = load_firmware_manifest(manifest_filename)
        # only one update is valid 'head', invalid update types are ignored
        assert FirmwareUpdateType.head in updates
        assert len(updates) == 1
        os.unlink(manifest_filename)


def test_load_firmware_manifest_invalid_update_info(
    mock_manifest: Dict[str, Any]
) -> None:
    """Test invalid update info."""
    with open(manifest_filename, "w") as fp:
        manifest = mock_manifest.copy()
        manifest["subsystems"]["gantry-x"] = {
            "version": None,
            "shortsha": "12345678",
            "files_by_revision": {"rev1": "some/path"},
        }
        manifest["subsystems"]["gantry-y"] = {
            "version": 2,
            "shortsha": "12345678",
            "files_by_revision": {},
        }
        manifest["subsystems"]["gripper"] = {
            "version": 2,
            "shortsha": None,
            "files_by_revision": {"rev1": "some/path"},
        }
        json.dump(manifest, fp)
    with mock.patch("os.path.exists"):
        updates = load_firmware_manifest(manifest_filename)
        # only one update is valid 'head', invalid update types are ignored
        assert FirmwareUpdateType.head in updates
        assert len(updates) == 1
        os.unlink(manifest_filename)


def test_load_firmware_manifest_binary_file_not_found(
    mock_manifest: Dict[str, Any]
) -> None:
    """Test binary update file not found."""
    with open(manifest_filename, "w") as fp:
        manifest = mock_manifest.copy()
        json.dump(manifest, fp)
    updates = load_firmware_manifest(manifest_filename)
    assert updates == {}
    os.unlink(manifest_filename)


def test_check_firmware_updates_available(mock_manifest: Dict[str, Any]) -> None:
    """Test that firmware updates are available when shortshas mismatch."""
    manifest = mock_manifest.copy()
    manifest["subsystems"].update(
        {
            "gantry-x": {
                "version": 2,
                "shortsha": "25755efd",
                "files_by_revision": {"rev1": "gantry-x-rev1.hex"},
            },
            "gantry-y": {
                "version": 2,
                "shortsha": "25755efd",
                "files_by_revision": {"rev1": "gantry-y-rev1.hex"},
            },
            "gripper": {
                "version": 2,
                "shortsha": "25755efd",
                "files_by_revision": {"rev1": "gripper-rev1.hex"},
            },
        }
    )
    known_firmware_updates = generate_update_info(manifest)

    # test devices requiring firmware update when the shortshas dont match
    device_info_cache = generate_device_info(manifest, random_sha=True)
    with mock.patch(
        "opentrons_hardware.firmware_update.utils.load_firmware_manifest",
        mock.Mock(return_value=known_firmware_updates),
    ):
        firmware_updates = check_firmware_updates(
            device_info_cache, attached_pipettes={}
        )
        assert firmware_updates
        assert len(firmware_updates) == len(device_info_cache)
        for node_id in firmware_updates:
            assert node_id in device_info_cache


def test_check_firmware_updates_available_nodes_specified(
    mock_manifest: Dict[str, Any]
) -> None:
    """Test updates when nodes are specified, which updates the device regardless of the shortsha."""
    device_info_cache = generate_device_info(mock_manifest)
    known_firmware_updates = generate_update_info(mock_manifest)
    with mock.patch(
        "opentrons_hardware.firmware_update.utils.load_firmware_manifest",
        mock.Mock(return_value=known_firmware_updates),
    ):
        firmware_updates = check_firmware_updates(
            device_info_cache, attached_pipettes={}, nodes=set(device_info_cache)
        )
        assert firmware_updates
        assert len(firmware_updates) == len(device_info_cache)
        for node_id in firmware_updates:
            assert node_id in device_info_cache


def test_load_firmware_manifest_is_empty(mock_manifest: Dict[str, Any]) -> None:
    """Don't do updates if load_firmware_manifest is empty."""
    device_info_cache = generate_device_info(mock_manifest)
    with mock.patch(
        "opentrons_hardware.firmware_update.utils.load_firmware_manifest",
        mock.Mock(return_value={}),
    ):
        firmware_updates = check_firmware_updates(
            device_info_cache, attached_pipettes={}
        )
        assert firmware_updates == {}


def test_unknown_firmware_update_type(mock_manifest: Dict[str, Any]) -> None:
    """Don't do updates if the FirmwareUpdateType is unknown."""
    device_info = {NodeId.head: DeviceInfoCache(NodeId.head, 2, "12345678", None)}
    known_firmware_updates = generate_update_info(mock_manifest)
    known_firmware_updates.pop(FirmwareUpdateType.head)
    with mock.patch(
        "opentrons_hardware.firmware_update.utils.load_firmware_manifest",
        mock.Mock(return_value={}),
    ):
        firmware_updates = check_firmware_updates(device_info, attached_pipettes={})
        assert firmware_updates == {}
