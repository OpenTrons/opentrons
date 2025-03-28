"""Tests for Flex Stacker Engine Core."""

import inspect
from unittest.mock import sentinel

import pytest
from decoy import Decoy

from opentrons.hardware_control import SynchronousAdapter
from opentrons.hardware_control.modules import FlexStacker
from opentrons.hardware_control.modules.types import (
    ModuleType,
)
from opentrons.protocol_engine.clients import SyncClient as EngineClient
from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_api.core.engine.module_core import FlexStackerCore
from opentrons.protocol_api.core.engine import load_labware_params
from opentrons.protocol_api import MAX_SUPPORTED_VERSION

SyncFlexStackerHardware = SynchronousAdapter[FlexStacker]


@pytest.fixture
def mock_engine_client(decoy: Decoy) -> EngineClient:
    """Get a mock ProtocolEngine synchronous client."""
    return decoy.mock(cls=EngineClient)


@pytest.fixture
def mock_sync_module_hardware(decoy: Decoy) -> SyncFlexStackerHardware:
    """Get a mock synchronous module hardware."""
    return decoy.mock(name="SyncFlexStackerHardware")  # type: ignore[no-any-return]


@pytest.fixture(autouse=True)
def patch_mock_load_labware_params(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out load_labware_params.py functions."""
    for name, func in inspect.getmembers(load_labware_params, inspect.isfunction):
        monkeypatch.setattr(load_labware_params, name, decoy.mock(func=func))


@pytest.fixture
def subject(
    mock_engine_client: EngineClient,
    mock_sync_module_hardware: SyncFlexStackerHardware,
) -> FlexStackerCore:
    """Get a Flex Stacker Core test subject."""
    return FlexStackerCore(
        module_id="1234",
        engine_client=mock_engine_client,
        api_version=MAX_SUPPORTED_VERSION,
        sync_module_hardware=mock_sync_module_hardware,
    )


def test_create(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_sync_module_hardware: SyncFlexStackerHardware,
) -> None:
    """It should be able to create a Flex Stacker module core."""
    result = FlexStackerCore(
        module_id="1234",
        engine_client=mock_engine_client,
        api_version=MAX_SUPPORTED_VERSION,
        sync_module_hardware=mock_sync_module_hardware,
    )

    assert result.module_id == "1234"
    assert result.MODULE_TYPE == ModuleType.FLEX_STACKER


def test_set_stored_labware_all_elements(
    decoy: Decoy, mock_engine_client: EngineClient, subject: FlexStackerCore
) -> None:
    """It should gather labware into objects appropriately when specifying all of lid, labware, and adapter."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return(sentinel.custom_labware_load_params)
    decoy.when(
        load_labware_params.resolve(
            "main-name",
            "main-namespace",
            1,
            sentinel.custom_labware_load_params,
            MAX_SUPPORTED_VERSION,
        )
    ).then_return(("main-namespace-verified", 10))
    decoy.when(
        load_labware_params.resolve(
            "adapter-name",
            "adapter-namespace",
            2,
            sentinel.custom_labware_load_params,
            MAX_SUPPORTED_VERSION,
        )
    ).then_return(("adapter-namespace-verified", 20))
    decoy.when(
        load_labware_params.resolve(
            "lid-name",
            "lid-namespace",
            3,
            sentinel.custom_labware_load_params,
            MAX_SUPPORTED_VERSION,
        )
    ).then_return(("lid-namespace-verified", 30))

    subject.set_stored_labware(
        main_load_name="main-name",
        main_namespace="main-namespace",
        main_version=1,
        lid_load_name="lid-name",
        lid_namespace="lid-namespace",
        lid_version=3,
        adapter_load_name="adapter-name",
        adapter_namespace="adapter-namespace",
        adapter_version=2,
        count=5,
    )
    decoy.verify(
        mock_engine_client.execute_command(
            cmd.flex_stacker.SetStoredLabwareParams(
                moduleId="1234",
                initialCount=5,
                primaryLabware=cmd.flex_stacker.StackerStoredLabwareDetails(
                    loadName="main-name",
                    namespace="main-namespace-verified",
                    version=10,
                ),
                lidLabware=cmd.flex_stacker.StackerStoredLabwareDetails(
                    loadName="lid-name", namespace="lid-namespace-verified", version=30
                ),
                adapterLabware=cmd.flex_stacker.StackerStoredLabwareDetails(
                    loadName="adapter-name",
                    namespace="adapter-namespace-verified",
                    version=20,
                ),
            )
        )
    )


def test_set_stored_labware_only_checks_load_name_for_lid_and_adapter_valid(
    decoy: Decoy, mock_engine_client: EngineClient, subject: FlexStackerCore
) -> None:
    """It should specify lid and adapter if and only if their load names are specified."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return(sentinel.custom_labware_load_params)
    decoy.when(
        load_labware_params.resolve(
            "main-name",
            "main-namespace",
            1,
            sentinel.custom_labware_load_params,
            MAX_SUPPORTED_VERSION,
        )
    ).then_return(("main-namespace-verified", 10))

    subject.set_stored_labware(
        main_load_name="main-name",
        main_namespace="main-namespace",
        main_version=1,
        lid_load_name=None,
        lid_namespace="lid-namespace",
        lid_version=3,
        adapter_load_name=None,
        adapter_namespace="adapter-namespace",
        adapter_version=2,
        count=5,
    )
    decoy.verify(
        mock_engine_client.execute_command(
            cmd.flex_stacker.SetStoredLabwareParams(
                moduleId="1234",
                initialCount=5,
                primaryLabware=cmd.flex_stacker.StackerStoredLabwareDetails(
                    loadName="main-name",
                    namespace="main-namespace-verified",
                    version=10,
                ),
                lidLabware=None,
                adapterLabware=None,
            )
        )
    )
