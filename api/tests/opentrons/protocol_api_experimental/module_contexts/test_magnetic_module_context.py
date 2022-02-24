"""Tests for `magnetic_module_context`."""


from decoy import Decoy
import pytest

from opentrons.protocols.models import LabwareDefinition

from opentrons.protocol_engine import ModuleLocation, commands as pe_commands
from opentrons.protocol_engine.clients import SyncClient

from opentrons.protocol_api_experimental import (
    Labware,
    MagneticModuleContext,
    InvalidMagnetEngageHeightError,
)


@pytest.fixture
def engine_client(decoy: Decoy) -> SyncClient:
    """Return a mock in the shape of a Protocol Engine client."""
    return decoy.mock(cls=SyncClient)


@pytest.fixture
def subject(engine_client: SyncClient) -> MagneticModuleContext:
    """Return a MagneticModuleContext with mocked dependencies."""
    return MagneticModuleContext(
        engine_client=engine_client, module_id="subject-module-id"
    )


@pytest.mark.xfail(strict=True, raises=NotImplementedError)
def test_api_version(subject: MagneticModuleContext) -> None:  # noqa: D103
    _ = subject.api_version


def test_load_labware_default_namespace_and_version(
    decoy: Decoy,
    minimal_labware_def: LabwareDefinition,
    engine_client: SyncClient,
    subject: MagneticModuleContext,
) -> None:
    """It should default namespace to "opentrons" and version to 1."""
    decoy.when(
        engine_client.load_labware(
            location=ModuleLocation(moduleId="subject-module-id"),
            load_name="some_labware",
            namespace="opentrons",
            version=1,
        )
    ).then_return(
        pe_commands.LoadLabwareResult(
            labwareId="abc123",
            definition=minimal_labware_def,
            offsetId=None,
        )
    )

    result = subject.load_labware(name="some_labware")
    assert result == Labware(labware_id="abc123", engine_client=engine_client)


def test_load_labware_explicit_namespace_and_version(
    decoy: Decoy,
    minimal_labware_def: LabwareDefinition,
    engine_client: SyncClient,
    subject: MagneticModuleContext,
) -> None:
    """It should pass along the namespace, version, and load name."""
    decoy.when(
        engine_client.load_labware(
            location=ModuleLocation(moduleId="subject-module-id"),
            load_name="some_labware",
            namespace="some_explicit_namespace",
            version=9001,
        )
    ).then_return(
        pe_commands.LoadLabwareResult(
            labwareId="abc123",
            definition=minimal_labware_def,
            offsetId=None,
        )
    )
    result = subject.load_labware(
        name="some_labware",
        namespace="some_explicit_namespace",
        version=9001,
    )
    assert result == Labware(labware_id="abc123", engine_client=engine_client)


@pytest.mark.xfail(strict=True, raises=NotImplementedError)
def test_load_labware_with_label(  # noqa: D103
    subject: MagneticModuleContext,
) -> None:
    subject.load_labware(name="some_load_name", label="some_label")


@pytest.mark.xfail(strict=True, raises=NotImplementedError)
def test_load_labware_from_definition(  # noqa: D103
    subject: MagneticModuleContext,
) -> None:
    subject.load_labware_from_definition(definition={})  # type: ignore[typeddict-item]


@pytest.mark.xfail(strict=True, raises=NotImplementedError)
def test_labware_property(subject: MagneticModuleContext) -> None:  # noqa: D103
    _ = subject.labware


@pytest.mark.xfail(strict=True, raises=NotImplementedError)
def test_engage(subject: MagneticModuleContext) -> None:  # noqa: D103
    subject.engage(10)
    subject.engage(height=10)
    subject.engage(height_from_base=10)
    subject.engage(offset=10)


def test_engage_only_one_height_allowed(subject: MagneticModuleContext) -> None:
    """It should raise if you provide conflicting height arguments."""
    # The type-checker wants to stop us from miscalling this function, but
    # we need to test that the function protects itself when there is no type-checker.
    with pytest.raises(InvalidMagnetEngageHeightError):
        subject.engage(height=1, height_from_base=2, offset=3)  # type: ignore[call-overload]  # noqa: E501
    with pytest.raises(InvalidMagnetEngageHeightError):
        subject.engage(height=1, height_from_base=2)  # type: ignore[call-overload]
    with pytest.raises(InvalidMagnetEngageHeightError):
        subject.engage(height=1, offset=3)  # type: ignore[call-overload]
    with pytest.raises(InvalidMagnetEngageHeightError):
        subject.engage(height_from_base=2, offset=3)  # type: ignore[call-overload]


@pytest.mark.xfail(strict=True, raises=NotImplementedError)
def test_disengage(subject: MagneticModuleContext) -> None:  # noqa: D103
    subject.disengage()


@pytest.mark.xfail(strict=True, raises=NotImplementedError)
def test_status(subject: MagneticModuleContext) -> None:  # noqa: D103
    _ = subject.status
