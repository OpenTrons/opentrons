"""Tests for delay properties in the Opentrons protocol API."""

from pydantic import ValidationError
import pytest
from typing import Any, Union
from hypothesis import given, strategies as st, settings

from opentrons.protocol_api._liquid_properties import _build_touch_tip_properties
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    TouchTipProperties,
    LiquidClassTouchTipParams,
)

from . import (
    boolean_looking_values,
    invalid_values,
    positive_non_zero_floats_and_ints,
    reasonable_numbers,
    negative_or_zero_floats_and_ints,
)


def test_touch_tip_properties_enable_and_disable() -> None:
    """Test enabling and disabling TouchTipProperties."""
    tp = _build_touch_tip_properties(
        TouchTipProperties(
            enable=False,
            params=LiquidClassTouchTipParams(zOffset=1, mmToEdge=1, speed=100),
        )
    )
    tp.enabled = True
    assert tp.enabled is True
    tp.enabled = False
    assert tp.enabled is False


def test_touch_tip_properties_none_instantiation_combos() -> None:
    """Test handling of None combinations in TouchTipProperties instantiation."""
    with pytest.raises(ValidationError):
        _build_touch_tip_properties(
            TouchTipProperties(enable=True, params=LiquidClassTouchTipParams(zOffset=None, mmToEdge=None, speed=None))  # type: ignore
        )
    with pytest.raises(ValidationError):
        _build_touch_tip_properties(
            TouchTipProperties(enable=None, params=LiquidClassTouchTipParams(zOffset=None, mmToEdge=1, speed=1))  # type: ignore
        )
    with pytest.raises(ValidationError):
        _build_touch_tip_properties(
            TouchTipProperties(enable=True, params=LiquidClassTouchTipParams(zOffset=1, mmToEdge=None, speed=1))  # type: ignore
        )
    with pytest.raises(ValidationError):
        _build_touch_tip_properties(
            TouchTipProperties(enable=True, params=LiquidClassTouchTipParams(zOffset=1, mmToEdge=1, speed=None))  # type: ignore
        )


@given(bad_value=st.one_of(invalid_values, boolean_looking_values))
@settings(deadline=None, max_examples=50)
def test_touch_tip_properties_enabled_bad_values(bad_value: Any) -> None:
    """Test bad values for TouchTipProperties.enabled."""
    with pytest.raises(ValidationError):
        _build_touch_tip_properties(
            TouchTipProperties(
                enable=bad_value,
                params=LiquidClassTouchTipParams(zOffset=1, mmToEdge=1, speed=1),
            )
        )
    tp = _build_touch_tip_properties(
        TouchTipProperties(
            enable=False,
            params=LiquidClassTouchTipParams(zOffset=1, mmToEdge=1, speed=1),
        )
    )
    with pytest.raises(ValueError):
        tp.enabled = bad_value


@given(good_value=reasonable_numbers)
@settings(deadline=None, max_examples=50)
def test_touch_tip_properties_z_offset(good_value: Union[int, float]) -> None:
    """Test valid z_offset."""
    _build_touch_tip_properties(
        TouchTipProperties(
            enable=True,
            params=LiquidClassTouchTipParams(zOffset=good_value, mmToEdge=1, speed=10),
        )
    )
    tp = _build_touch_tip_properties(
        TouchTipProperties(
            enable=False,
            params=LiquidClassTouchTipParams(zOffset=0, mmToEdge=1, speed=10),
        )
    )
    tp.z_offset = good_value
    assert tp.z_offset == float(good_value)


@given(bad_value=invalid_values)
@settings(deadline=None, max_examples=50)
def test_touch_tip_properties_z_offset_bad_values(bad_value: Any) -> None:
    """Test invalid z_offset values."""
    with pytest.raises(ValidationError):
        _build_touch_tip_properties(
            TouchTipProperties(
                enable=True,
                params=LiquidClassTouchTipParams(
                    zOffset=bad_value, mmToEdge=1, speed=10
                ),
            )
        )
    tp = _build_touch_tip_properties(
        TouchTipProperties(
            enable=False,
            params=LiquidClassTouchTipParams(zOffset=0, mmToEdge=1, speed=10),
        )
    )
    with pytest.raises(ValueError):
        tp.z_offset = bad_value


@given(good_value=reasonable_numbers)
@settings(deadline=None, max_examples=50)
def test_touch_tip_properties_mm_to_edge(good_value: Union[int, float]) -> None:
    """Test valid mm_to_edge."""
    _build_touch_tip_properties(
        TouchTipProperties(
            enable=True,
            params=LiquidClassTouchTipParams(zOffset=0, mmToEdge=good_value, speed=10),
        )
    )
    tp = _build_touch_tip_properties(
        TouchTipProperties(
            enable=False,
            params=LiquidClassTouchTipParams(zOffset=0, mmToEdge=1, speed=10),
        )
    )
    tp.mm_to_edge = good_value
    assert tp.mm_to_edge == float(good_value)


@given(bad_value=invalid_values)
@settings(deadline=None, max_examples=50)
def test_touch_tip_properties_mm_to_edge_bad_values(bad_value: Any) -> None:
    """Test invalid mm_to_edge values."""
    with pytest.raises(ValidationError):
        _build_touch_tip_properties(
            TouchTipProperties(
                enable=True,
                params=LiquidClassTouchTipParams(
                    zOffset=bad_value, mmToEdge=1, speed=10
                ),
            )
        )
    tp = _build_touch_tip_properties(
        TouchTipProperties(
            enable=True,
            params=LiquidClassTouchTipParams(zOffset=0, mmToEdge=1, speed=10),
        )
    )
    with pytest.raises(ValueError):
        tp.mm_to_edge = bad_value


@given(good_value=positive_non_zero_floats_and_ints)
@settings(deadline=None, max_examples=50)
def test_touch_tip_properties_speed(good_value: Union[int, float]) -> None:
    """Test valid speed."""
    _build_touch_tip_properties(
        TouchTipProperties(
            enable=True,
            params=LiquidClassTouchTipParams(zOffset=0, mmToEdge=1, speed=good_value),
        )
    )
    tp = _build_touch_tip_properties(
        TouchTipProperties(
            enable=False,
            params=LiquidClassTouchTipParams(zOffset=0, mmToEdge=1, speed=10),
        )
    )
    tp.speed = good_value
    assert tp.speed == float(good_value)


@given(bad_value=st.one_of(invalid_values, negative_or_zero_floats_and_ints))
@settings(deadline=None, max_examples=50)
def test_touch_tip_properties_speed_bad_values(bad_value: Any) -> None:
    """Test invalid speed values."""
    with pytest.raises(ValidationError):
        _build_touch_tip_properties(
            TouchTipProperties(
                enable=True,
                params=LiquidClassTouchTipParams(
                    zOffset=0, mmToEdge=1, speed=bad_value
                ),
            )
        )
    tp = _build_touch_tip_properties(
        TouchTipProperties(
            enable=False,
            params=LiquidClassTouchTipParams(zOffset=0, mmToEdge=1, speed=10),
        )
    )
    with pytest.raises(ValueError):
        tp.speed = bad_value
