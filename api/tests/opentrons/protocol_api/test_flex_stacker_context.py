"""Tests for Protocol API Flex Stacker contexts."""

import pytest
from decoy import Decoy

from opentrons.legacy_broker import LegacyBroker
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_api import FlexStackerContext
from opentrons.protocol_api.core.common import (
    ProtocolCore,
    LabwareCore,
    FlexStackerCore,
)
from opentrons.protocol_api.core.core_map import LoadedCoreMap


@pytest.fixture
def mock_core(decoy: Decoy) -> FlexStackerCore:
    """Get a mock module implementation core."""
    return decoy.mock(cls=FlexStackerCore)


@pytest.fixture
def mock_protocol_core(decoy: Decoy) -> ProtocolCore:
    """Get a mock protocol implementation core."""
    return decoy.mock(cls=ProtocolCore)


@pytest.fixture
def mock_labware_core(decoy: Decoy) -> LabwareCore:
    """Get a mock labware implementation core."""
    mock_core = decoy.mock(cls=LabwareCore)
    decoy.when(mock_core.get_well_columns()).then_return([])
    return mock_core


@pytest.fixture
def mock_core_map(decoy: Decoy) -> LoadedCoreMap:
    """Get a mock LoadedCoreMap."""
    return decoy.mock(cls=LoadedCoreMap)


@pytest.fixture
def mock_broker(decoy: Decoy) -> LegacyBroker:
    """Get a mock command message broker."""
    return decoy.mock(cls=LegacyBroker)


@pytest.fixture
def api_version() -> APIVersion:
    """Get an API version to apply to the interface."""
    return APIVersion(2, 23)


@pytest.fixture
def subject(
    api_version: APIVersion,
    mock_core: FlexStackerCore,
    mock_protocol_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    mock_broker: LegacyBroker,
) -> FlexStackerContext:
    """Get an absorbance reader context with its dependencies mocked out."""
    return FlexStackerContext(
        core=mock_core,
        protocol_core=mock_protocol_core,
        core_map=mock_core_map,
        broker=mock_broker,
        api_version=api_version,
    )


def test_get_serial_number(
    decoy: Decoy, mock_core: FlexStackerCore, subject: FlexStackerContext
) -> None:
    """It should get the serial number from the core."""
    decoy.when(mock_core.get_serial_number()).then_return("12345")
    result = subject.serial_number
    assert result == "12345"


def test_fill(
    decoy: Decoy, mock_core: FlexStackerCore, subject: FlexStackerContext
) -> None:
    """It should pass args to the core."""
    subject.fill("hello", 2)
    decoy.verify(mock_core.fill("hello", 2))


def test_empty(
    decoy: Decoy, mock_core: FlexStackerCore, subject: FlexStackerContext
) -> None:
    """It should pass args to the core."""
    subject.empty("goodbye")
    decoy.verify(mock_core.empty("goodbye"))


def test_set_stored_labware(
    decoy: Decoy, mock_core: FlexStackerCore, subject: FlexStackerContext
) -> None:
    """It should route arguments appropriately."""
    subject.set_stored_labware("load_name", "namespace", 1, "adapter", "lid", 2)
    decoy.verify(
        mock_core.set_stored_labware(
            main_load_name="load_name",
            main_namespace="namespace",
            main_version=1,
            lid_load_name="lid",
            lid_namespace="namespace",
            lid_version=1,
            adapter_load_name="adapter",
            adapter_namespace="namespace",
            adapter_version=1,
            count=2,
        )
    )
