"""Tests for Protocol API engine parameter validation."""

import pytest
from typing import List, Optional

from opentrons.protocol_api.core.engine import load_labware_params as subject
from opentrons.protocol_engine.state.labware import LabwareLoadParams
from opentrons.protocols.api_support.constants import OPENTRONS_NAMESPACE
from opentrons.protocols.api_support.types import APIVersion


@pytest.mark.parametrize(
    argnames=[
        "load_name",
        "namespace",
        "version",
        "custom_labware_params",
        "expected_namespace",
        "expected_version",
        "current_api_version",
    ],
    argvalues=[
        ("hello", "world", 123, [], "world", 123, APIVersion(2, 15)),
        ("hello", "world", None, [], "world", 1, APIVersion(2, 22)),
        ("hello", None, 123, [], OPENTRONS_NAMESPACE, 123, APIVersion(2, 14)),
        ("hello", None, None, [], OPENTRONS_NAMESPACE, 1, APIVersion(2, 16)),
        (
            "hello",
            "world",
            None,
            [
                LabwareLoadParams("hello", "world", 123),
                LabwareLoadParams("hello", "foo", 123),
            ],
            "world",
            123,
            APIVersion(2, 17),
        ),
        (
            "hello",
            None,
            123,
            [
                LabwareLoadParams("hello", "world", 123),
                LabwareLoadParams("hello", "world", 456),
            ],
            "world",
            123,
            APIVersion(2, 19),
        ),
        (
            "hello",
            None,
            None,
            [
                LabwareLoadParams("hello", "world", 123),
                LabwareLoadParams("goodbye", "world", 123),
            ],
            "world",
            123,
            APIVersion(2, 21),
        ),
    ],
)
def test_resolve_load_labware_params(
    load_name: str,
    namespace: Optional[str],
    version: Optional[int],
    custom_labware_params: List[LabwareLoadParams],
    expected_namespace: str,
    expected_version: int,
    current_api_version: APIVersion,
) -> None:
    """It should get a namespace and version based on custom labware available or defaults."""
    result = subject.resolve(
        load_name, namespace, version, custom_labware_params, current_api_version
    )

    assert result == (expected_namespace, expected_version)


@pytest.mark.parametrize(
    "load_name",
    [
        "opentrons_24_aluminumblock_generic_2ml_screwcap",
        "opentrons_96_aluminumblock_generic_pcr_strip_200ul",
        "armadillo_96_wellplate_200ul_pcr_full_skirt",
        "corning_384_wellplate_112ul_flat",
        "nest_96_wellplate_100ul_pcr_full_skirt",
        "nest_96_wellplate_200ul_flat",
        "nest_96_wellplate_2ml_deep",
        "opentrons_96_wellplate_200ul_pcr_full_skirt",
        "biorad_96_wellplate_200ul_pcr",
        "evotips_opentrons_96_labware",
        "evotips_flex_96_tiprack_adapter",
    ],
)
@pytest.mark.parametrize("namespace", [OPENTRONS_NAMESPACE, None])
@pytest.mark.parametrize(
    ("version", "expected_version"),
    [
        (None, 2),
        (0, 0),
        (1, 1),
        (2, 2),
        (123456, 123456),
    ],
)
def test_version_two_and_above_default_versioning(
    load_name: str,
    namespace: Optional[str],
    version: Optional[int],
    expected_version: int,
) -> None:
    """It should default to version 2 for these labware."""
    result = subject.resolve(
        load_name=load_name,
        namespace=namespace,
        version=version,
        custom_load_labware_params=[],
        api_version=APIVersion(2, 23),
    )
    assert result == (OPENTRONS_NAMESPACE, expected_version)


def test_resolve_load_labware_params_raises() -> None:
    """It should raise if multiple custom labware params are provided."""
    with pytest.raises(subject.AmbiguousLoadLabwareParamsError):
        subject.resolve(
            load_name="hello",
            namespace="world",
            version=None,
            custom_load_labware_params=[
                LabwareLoadParams("hello", "world", 123),
                LabwareLoadParams("hello", "world", 456),
            ],
            api_version=APIVersion(2, 23),
        )
