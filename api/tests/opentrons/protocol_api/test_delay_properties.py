"""Tests for delay properties in the Opentrons protocol API."""

from pydantic import ValidationError
import pytest
from typing import Any, Union
from hypothesis import given, strategies as st, settings

from opentrons.protocol_api._liquid_properties import _build_delay_properties
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    DelayProperties,
    DelayParams,
)

# --------------------------------------------------------------------------------------
# Strategies
# --------------------------------------------------------------------------------------

invalid_values = st.one_of(
    st.text(min_size=0, max_size=5),
    st.dictionaries(keys=st.text(), values=st.integers()),
    st.lists(st.integers(min_value=-100, max_value=100), min_size=1, max_size=5),
    st.tuples(st.booleans()),
    st.binary(min_size=1, max_size=5),
)

boolean_looking_values = st.one_of(
    st.just("True"),
    st.just("1"),
    st.just(1),
    st.just("False"),
    st.just("0"),
    st.just(0),
)

reasonable_floats = st.floats(
    min_value=-1000, max_value=1000, allow_infinity=False, allow_nan=False
)
reasonable_ints = st.integers(min_value=-1000, max_value=1000)

negative_or_zero_floats = st.floats(
    min_value=-1000, max_value=0, allow_infinity=False, allow_nan=False
)
negative_or_zero_ints = st.integers(min_value=-1000, max_value=0)
negative_or_zero_floats_and_ints = st.one_of(
    negative_or_zero_floats, negative_or_zero_ints
)
positive_or_zero_ints = st.integers(min_value=0, max_value=1000)
positive_or_zero_floats = st.floats(
    min_value=0, max_value=1000, allow_infinity=False, allow_nan=False
)
positive_or_zero_floats_or_ints = st.one_of(
    positive_or_zero_floats, positive_or_zero_ints
)

negative_non_zero_floats = st.floats(
    min_value=-1000, max_value=-0.0001, allow_infinity=False, allow_nan=False
)
negative_non_zero_ints = st.integers(min_value=-1000, max_value=-1)
negative_non_zero_floats_and_ints = st.one_of(
    negative_non_zero_floats, negative_non_zero_ints
)

positive_non_zero_floats = st.floats(
    min_value=0.0001, max_value=1000, allow_infinity=False, allow_nan=False
)
positive_non_zero_ints = st.integers(min_value=1, max_value=1000)
positive_non_zero_floats_and_ints = st.one_of(
    positive_non_zero_floats, positive_non_zero_ints
)


def test_delay_properties_enable_and_disable() -> None:
    """Test enabling and disabling for boolean-only delay properties."""
    dp = _build_delay_properties(
        DelayProperties(enable=False, params=DelayParams(duration=1))
    )
    dp.enabled = True
    assert dp.enabled is True
    dp.enabled = False
    assert dp.enabled is False


def test_delay_properties_none_instantiation_combos() -> None:
    """Test handling of None combinations in delay properties instantiation."""
    with pytest.raises(ValidationError):
        _build_delay_properties(
            DelayProperties(enable=None, params=DelayParams(duration=None))  # type: ignore
        )
    with pytest.raises(ValidationError):
        _build_delay_properties(
            DelayProperties(enable=False, params=DelayParams(duration=None))  # type: ignore
        )
    with pytest.raises(ValidationError):
        _build_delay_properties(
            DelayProperties(enable=None, params=DelayParams(duration=1))  # type: ignore
        )
    with pytest.raises(ValidationError):
        _build_delay_properties(
            DelayProperties(enable=True, params=DelayParams(duration=None))  # type: ignore
        )


@given(bad_value=st.one_of(invalid_values, boolean_looking_values))
@settings(deadline=None, max_examples=50)
def test_delay_properties_enabled_bad_values(bad_value: Any) -> None:
    """Test bad values for DelayProperties.enabled."""
    with pytest.raises(ValueError):
        _build_delay_properties(
            DelayProperties(enable=bad_value, params=DelayParams(duration=1))
        )
    dp = _build_delay_properties(
        DelayProperties(enable=True, params=DelayParams(duration=1))
    )
    with pytest.raises(ValueError):
        dp.enabled = bad_value


@given(good_duration=positive_or_zero_floats_or_ints)
@settings(deadline=None, max_examples=50)
def test_delay_properties_duration(good_duration: Union[int, float]) -> None:
    """Test valid float/int >= 0 for DelayProperties."""
    dp = _build_delay_properties(
        DelayProperties(enable=None, params=DelayParams(duration=good_duration))  # type: ignore
    )
    assert dp.duration == float(good_duration)
    _build_delay_properties(
        DelayProperties(enable=False, params=DelayParams(duration=good_duration))
    )
    dp = _build_delay_properties(
        DelayProperties(enable=True, params=DelayParams(duration=1))
    )
    dp.duration = good_duration
    assert dp.duration == float(good_duration)


@given(bad_duration=st.one_of(negative_non_zero_floats_and_ints, invalid_values))
@settings(deadline=None, max_examples=50)
def test_delay_properties_duration_bad_values(bad_duration: Any) -> None:
    """Test invalid float/int for DelayProperties (must be >= 0)."""
    with pytest.raises(ValueError):
        _build_delay_properties(
            DelayProperties(enable=True, params=DelayParams(duration=bad_duration))
        )
    with pytest.raises(ValueError):
        _build_delay_properties(
            DelayProperties(enable=False, params=DelayParams(duration=bad_duration))
        )
    dp = _build_delay_properties(
        DelayProperties(enable=True, params=DelayParams(duration=1))
    )
    with pytest.raises(ValueError):
        dp.duration = bad_duration
    dp = _build_delay_properties(
        DelayProperties(enable=False, params=DelayParams(duration=1))
    )
    with pytest.raises(ValueError):
        dp.duration = bad_duration
