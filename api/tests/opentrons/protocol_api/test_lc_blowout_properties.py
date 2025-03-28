"""Tests for liquid class blowout properties in the Opentrons protocol API."""

from pydantic import ValidationError
import pytest
from typing import Any
from hypothesis import given, strategies as st, settings

from opentrons.protocol_api._liquid_properties import (
    _build_blowout_properties,
)
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    BlowoutProperties,
    BlowoutParams,
    BlowoutLocation,
)

from . import (
    boolean_looking_values,
    invalid_values,
    negative_or_zero_floats_and_ints,
    positive_non_zero_floats_and_ints,
)


def test_blowout_properties_enable_and_disable() -> None:
    """Test that enable and disable work as expected."""
    bp = _build_blowout_properties(
        BlowoutProperties(
            enable=False,
            params=BlowoutParams(location=BlowoutLocation.DESTINATION, flowRate=100),
        )
    )
    bp.enabled = True
    assert bp.enabled is True
    bp.enabled = False
    assert bp.enabled is False


def test_blowout_properties_none_instantiation_combos() -> None:
    """Test that none values raise."""
    with pytest.raises(ValidationError):
        _build_blowout_properties(
            BlowoutProperties(enable=None, params=BlowoutParams(location=None, flowRate=None))  # type: ignore
        )
    with pytest.raises(ValidationError):
        _build_blowout_properties(
            BlowoutProperties(enable=True, params=BlowoutParams(location=None, flowRate=100))  # type: ignore
        )


@given(bad_enable=boolean_looking_values)
@settings(deadline=None, max_examples=50)
def test_blowout_properties_enabled_bad_values(bad_enable: Any) -> None:
    """Test that invalid enable values raise."""
    with pytest.raises(ValidationError):
        _build_blowout_properties(
            BlowoutProperties(
                enable=bad_enable,
                params=BlowoutParams(location=BlowoutLocation.TRASH, flowRate=50),
            )
        )
    bp = _build_blowout_properties(
        BlowoutProperties(
            enable=False,
            params=BlowoutParams(location=BlowoutLocation.TRASH, flowRate=50),
        )
    )
    with pytest.raises(ValueError):
        bp.enabled = bad_enable


@given(good_flow_rate=positive_non_zero_floats_and_ints)
@settings(deadline=None, max_examples=50)
def test_blowout_properties_flow_rate(good_flow_rate: Any) -> None:
    """Test that valid flow rate values are accepted."""
    _build_blowout_properties(
        BlowoutProperties(
            enable=True,
            params=BlowoutParams(
                location=BlowoutLocation.DESTINATION, flowRate=good_flow_rate
            ),
        )
    )
    bp = _build_blowout_properties(
        BlowoutProperties(
            enable=True,
            params=BlowoutParams(location=BlowoutLocation.TRASH, flowRate=1),
        )
    )
    bp.flow_rate = good_flow_rate
    assert bp.flow_rate == float(good_flow_rate)


@given(bad_flow_rate=st.one_of(invalid_values, negative_or_zero_floats_and_ints))
@settings(deadline=None, max_examples=50)
def test_blowout_properties_flow_rate_bad_values(bad_flow_rate: Any) -> None:
    """Test that invalid flow rate values raise."""
    with pytest.raises(ValidationError):
        _build_blowout_properties(
            BlowoutProperties(
                enable=True,
                params=BlowoutParams(
                    location=BlowoutLocation.TRASH, flowRate=bad_flow_rate
                ),
            )
        )
    bp = _build_blowout_properties(
        BlowoutProperties(
            enable=True,
            params=BlowoutParams(location=BlowoutLocation.TRASH, flowRate=50),
        )
    )
    with pytest.raises(ValueError):
        bp.flow_rate = bad_flow_rate


@given(
    good_location=st.one_of(
        st.just(BlowoutLocation.DESTINATION),
        st.just(BlowoutLocation.TRASH),
        st.just(BlowoutLocation.SOURCE),
    )
)
@settings(deadline=None, max_examples=50)
def test_blowout_properties_location_enum(good_location: Any) -> None:
    """Test that valid location values are accepted."""
    bp = _build_blowout_properties(
        BlowoutProperties(
            enable=True, params=BlowoutParams(location=good_location, flowRate=50)
        )
    )
    assert bp.location == good_location
    bp = _build_blowout_properties(
        BlowoutProperties(
            enable=True,
            params=BlowoutParams(location=BlowoutLocation.TRASH, flowRate=50),
        )
    )

    bp.location = good_location
    assert bp.location == good_location


@given(
    good_location=st.one_of(
        st.just("destination"),
        st.just("trash"),
        st.just("source"),
    )
)
@settings(deadline=None, max_examples=50)
def test_blowout_properties_location_str(good_location: Any) -> None:
    """Test that valid location values are accepted."""
    bp = _build_blowout_properties(
        BlowoutProperties(
            enable=True, params=BlowoutParams(location=good_location, flowRate=50)
        )
    )
    assert bp.location is not None and bp.location.value == good_location
    bp = _build_blowout_properties(
        BlowoutProperties(
            enable=True,
            params=BlowoutParams(location=BlowoutLocation.TRASH, flowRate=50),
        )
    )
    bp.location = good_location
    assert bp.location is not None and bp.location.value == good_location


@given(bad_location=st.one_of(invalid_values, st.just("chute")))
@settings(deadline=None, max_examples=50)
def test_blowout_properties_location_bad(bad_location: Any) -> None:
    """Test that invalid location values raise."""
    with pytest.raises(ValidationError):
        bp = _build_blowout_properties(
            BlowoutProperties(
                enable=True, params=BlowoutParams(location=bad_location, flowRate=50)
            )
        )

    bp = _build_blowout_properties(
        BlowoutProperties(
            enable=True,
            params=BlowoutParams(location=BlowoutLocation.TRASH, flowRate=50),
        )
    )
    with pytest.raises(ValueError):
        bp.location = bad_location
