"""Test labware validation."""
import pytest

from opentrons_shared_data.labware.labware_definition import (
    LabwareDefinition,
    LabwareDefinition2,
    LabwareRole,
    Vector,
    Parameters2,
)

from opentrons.protocol_engine.resources import labware_validation as subject


@pytest.mark.parametrize(
    ("definition", "expected_result"),
    [
        (
            LabwareDefinition2.model_construct(allowedRoles=[LabwareRole.labware]),  # type: ignore[call-arg]
            True,
        ),
        (
            LabwareDefinition2.model_construct(allowedRoles=[]),  # type: ignore[call-arg]
            True,
        ),
        (
            LabwareDefinition2.model_construct(allowedRoles=[LabwareRole.adapter]),  # type: ignore[call-arg]
            False,
        ),
    ],
)
def test_validate_definition_is_labware(
    definition: LabwareDefinition, expected_result: bool
) -> None:
    """It should validate if definition is defined as a labware."""
    assert subject.validate_definition_is_labware(definition) == expected_result


@pytest.mark.parametrize(
    ("definition", "expected_result"),
    [
        (
            LabwareDefinition2.model_construct(allowedRoles=[LabwareRole.adapter]),  # type: ignore[call-arg]
            True,
        ),
        (
            LabwareDefinition2.model_construct(allowedRoles=[]),  # type: ignore[call-arg]
            False,
        ),
        (
            LabwareDefinition2.model_construct(allowedRoles=[LabwareRole.labware]),  # type: ignore[call-arg]
            False,
        ),
    ],
)
def test_validate_definition_is_adapter(
    definition: LabwareDefinition, expected_result: bool
) -> None:
    """It should validate if definition is defined as an adapter."""
    assert subject.validate_definition_is_adapter(definition) == expected_result


@pytest.mark.parametrize(
    ("definition", "expected_result"),
    [
        (
            LabwareDefinition2.model_construct(  # type: ignore[call-arg]
                stackingOffsetWithLabware={"labware123": Vector(x=4, y=5, z=6)}
            ),
            True,
        ),
        (
            LabwareDefinition2.model_construct(  # type: ignore[call-arg]
                stackingOffsetWithLabware={"labwareXYZ": Vector(x=4, y=5, z=6)}
            ),
            False,
        ),
        (
            LabwareDefinition2.model_construct(stackingOffsetWithLabware={}),  # type: ignore[call-arg]
            False,
        ),
    ],
)
def test_validate_labware_can_be_stacked(
    definition: LabwareDefinition, expected_result: bool
) -> None:
    """It should validate if definition allows it to stack on given labware."""
    assert (
        subject.validate_labware_can_be_stacked(definition, "labware123")
        == expected_result
    )


@pytest.mark.parametrize(
    ("definition", "expected_result"),
    [
        (
            LabwareDefinition2.model_construct(  # type: ignore[call-arg]
                parameters=Parameters2.model_construct(quirks=None)  # type: ignore[call-arg]
            ),
            True,
        ),
        (
            LabwareDefinition2.model_construct(  # type: ignore[call-arg]
                parameters=Parameters2.model_construct(quirks=["foo"])  # type: ignore[call-arg]
            ),
            True,
        ),
        (
            LabwareDefinition2.model_construct(  # type: ignore[call-arg]
                parameters=Parameters2.model_construct(quirks=["gripperIncompatible"])  # type: ignore[call-arg]
            ),
            False,
        ),
    ],
)
def test_validate_gripper_compatible(
    definition: LabwareDefinition, expected_result: bool
) -> None:
    """It should validate if definition is defined as an adapter."""
    assert subject.validate_gripper_compatible(definition) == expected_result
