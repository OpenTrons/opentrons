"""Test that our bindings can validate and parse our standard labware definitions."""


import pytest
import typeguard
import pydantic

from opentrons_shared_data.labware import load_definition
from opentrons_shared_data.labware.labware_definition import (
    labware_definition_type_adapter as pydantic_labware_definition_type_adapter,
    LabwareDefinition2 as PydanticLabwareDefinition2,
    LabwareDefinition3 as PydanticLabwareDefinition3,
)
from opentrons_shared_data.labware.types import (
    LabwareDefinition as TypedDictLabwareDefinition,
    LabwareDefinition2 as TypedDictLabwareDefinition2,
    LabwareDefinition3 as TypedDictLabwareDefinition3,
)


from . import get_ot_defs


@pytest.mark.parametrize("loadname,version", get_ot_defs(schema=2))
def test_schema_2_types(loadname: str, version: int) -> None:
    """Test parsing and validating into the types that represent schema 2."""
    defdict = load_definition(loadname, version, schema=2)

    typeguard.check_type(defdict, TypedDictLabwareDefinition2)
    PydanticLabwareDefinition2.model_validate(defdict)


@pytest.mark.parametrize("loadname,version", get_ot_defs(schema=3))
def test_schema_3_types(loadname: str, version: int) -> None:
    """Test parsing and validating into the types that represent schema 3."""
    defdict = load_definition(loadname, version, schema=3)

    typeguard.check_type(defdict, TypedDictLabwareDefinition3)
    PydanticLabwareDefinition3.model_validate(defdict)


@pytest.mark.parametrize(
    "loadname,version,schema_version",
    [(loadname, version, 2) for loadname, version in get_ot_defs(schema=2)]
    + [(loadname, version, 3) for loadname, version in get_ot_defs(schema=3)],
)
def test_all_schema_union_types(
    loadname: str, version: int, schema_version: int
) -> None:
    """Test parsing and validating into the types that represent a union of all schemas."""
    defdict = load_definition(
        loadname=loadname,
        version=version,
        schema=schema_version,
    )

    typeguard.check_type(defdict, TypedDictLabwareDefinition)

    pydantic_result = pydantic_labware_definition_type_adapter.validate_python(defdict)
    expected_result_type = (
        PydanticLabwareDefinition2
        if schema_version == 2
        else PydanticLabwareDefinition3
    )
    assert isinstance(pydantic_result, expected_result_type)


def test_loadname_regex_applied() -> None:
    defdict = load_definition(*get_ot_defs(schema=2)[0])
    defdict["parameters"]["loadName"] = "ALSJHDAKJLA"
    with pytest.raises(pydantic.ValidationError):
        PydanticLabwareDefinition2.model_validate(defdict)


def test_namespace_regex_applied() -> None:
    defdict = load_definition(*get_ot_defs(schema=2)[0])
    defdict["namespace"] = "ALSJHDAKJLA"
    with pytest.raises(pydantic.ValidationError):
        PydanticLabwareDefinition2.model_validate(defdict)
