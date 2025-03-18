"""Tests for delay properties in the Opentrons protocol API."""

from pydantic import ValidationError
import pytest
from typing import Any, Union
from hypothesis import given, strategies as st, settings

from opentrons.protocol_api._liquid_properties import _build_mix_properties
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    MixProperties,
    MixParams,
)

from . import (
    boolean_looking_values,
    invalid_values,
    positive_non_zero_floats_and_ints,
    negative_or_zero_floats_and_ints,
)


def test_mix_properties_enable_and_disable() -> None:
    """Test enabling and disabling for boolean-only mix properties."""
    mp = _build_mix_properties(
        MixProperties(enable=False, params=MixParams(repetitions=2, volume=10))
    )
    mp.enabled = True
    assert mp.enabled is True
    mp.enabled = False
    assert mp.enabled is False


def test_mix_properties_none_instantiation_combos() -> None:
    """Test handling of None combos in mix properties instantiation."""
    with pytest.raises(ValidationError):
        _build_mix_properties(MixProperties(enable=True, params=None))
    with pytest.raises(ValidationError):
        _build_mix_properties(MixProperties(enable=None, params=MixParams(repetitions=2, volume=10)))  # type: ignore
    _build_mix_properties(MixProperties(enable=False, params=None))


@given(bad_value=st.one_of(invalid_values, boolean_looking_values))
@settings(deadline=None, max_examples=50)
def test_mix_properties_enabled_bad_values(bad_value: Any) -> None:
    """Test bad values for MixProperties.enabled."""
    with pytest.raises(ValidationError):
        _build_mix_properties(
            MixProperties(enable=bad_value, params=MixParams(repetitions=1, volume=5))
        )
    mp = _build_mix_properties(
        MixProperties(enable=True, params=MixParams(repetitions=2, volume=10))
    )
    with pytest.raises(ValueError):
        mp.enabled = bad_value


@given(good_volume=positive_non_zero_floats_and_ints)
@settings(deadline=None, max_examples=50)
def test_mix_properties_volume_good_values(good_volume: Union[int, float]) -> None:
    """Test valid float/int > 0 for MixProperties volume."""
    mp = _build_mix_properties(
        MixProperties(enable=True, params=MixParams(repetitions=2, volume=5))
    )
    mp.volume = good_volume
    assert mp.volume == float(good_volume)


@given(bad_volume=st.one_of(negative_or_zero_floats_and_ints, invalid_values))
@settings(deadline=None, max_examples=50)
def test_mix_properties_volume_bad_values(bad_volume: Any) -> None:
    """Test invalid float/int <= 0 for MixProperties volume."""
    with pytest.raises(ValidationError):
        _build_mix_properties(
            MixProperties(
                enable=True, params=MixParams(repetitions=2, volume=bad_volume)
            )
        )
    mp = _build_mix_properties(
        MixProperties(enable=True, params=MixParams(repetitions=2, volume=5))
    )
    with pytest.raises(ValueError):
        mp.volume = bad_volume


@given(good_reps=st.integers(min_value=0, max_value=100))
@settings(deadline=None, max_examples=50)
def test_mix_properties_repetitions_good_values(good_reps: int) -> None:
    """Test valid int >= 0 for MixProperties repetitions."""
    _build_mix_properties(
        MixProperties(enable=True, params=MixParams(repetitions=good_reps, volume=5))
    )
    mp = _build_mix_properties(
        MixProperties(enable=True, params=MixParams(repetitions=2, volume=5))
    )
    mp.repetitions = good_reps
    assert mp.repetitions == good_reps


@given(bad_reps=st.one_of(st.integers(max_value=-1), invalid_values))
@settings(deadline=None, max_examples=50)
def test_mix_properties_repetitions_bad_values(bad_reps: Any) -> None:
    """Test invalid repetitions < 1 or non-integer."""
    with pytest.raises(ValidationError):
        _build_mix_properties(
            MixProperties(enable=True, params=MixParams(repetitions=bad_reps, volume=5))
        )
    mp = _build_mix_properties(
        MixProperties(enable=True, params=MixParams(repetitions=3, volume=5))
    )
    with pytest.raises(ValueError):
        mp.repetitions = bad_reps
