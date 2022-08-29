"""Tests for Protocol API input validation."""
from typing import Union

import pytest

from opentrons.types import Mount
from opentrons.protocol_api import validation as subject


@pytest.mark.parametrize(
    ["input_value", "expected"],
    [
        ("left", Mount.LEFT),
        ("right", Mount.RIGHT),
        ("LeFt", Mount.LEFT),
        (Mount.LEFT, Mount.LEFT),
        (Mount.RIGHT, Mount.RIGHT),
    ],
)
def test_ensure_mount(input_value: Union[str, Mount], expected: Mount) -> None:
    """It should properly map strings and mounts."""
    result = subject.ensure_mount(input_value)
    assert result == expected


def test_ensure_input_invalid() -> None:
    """It should raise if given invalid mount input."""
    with pytest.raises(ValueError, match="must be 'left' or 'right'"):
        subject.ensure_mount("oh no")

    with pytest.raises(TypeError, match="'left', 'right', or an opentrons.types.Mount"):
        subject.ensure_mount(42)  # type: ignore[arg-type]
