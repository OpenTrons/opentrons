from __future__ import annotations
import re
from typing import NamedTuple, TypedDict
from functools import total_ordering

# match e.g. "2.0" but not "hi", "2", "2.0.1"
_API_VERSION_RE = re.compile(r"^(\d+)\.(\d+)$")


class BadAPIVersionError(Exception):
    def __init__(self, bad_string: str) -> None:
        self.bad_string = bad_string


@total_ordering
class APIVersion(NamedTuple):
    major: int
    minor: int
    experimental: bool = False

    @classmethod
    def from_string(cls, inp: str) -> APIVersion:
        if inp == "experimental":
            return cls.as_experimental()
        elif inp == "1":
            return cls(major=1, minor=0, experimental=False)

        matches = _API_VERSION_RE.match(inp)
        if not matches:
            raise BadAPIVersionError(inp)

        return cls(
            major=int(matches.group(1)), minor=int(matches.group(2)), experimental=False
        )

    @classmethod
    def as_experimental(cls) -> APIVersion:
        return cls(
            major=MAX_SUPPORTED_VERSION.major,
            minor=MAX_SUPPORTED_VERSION.minor,
            experimental=True,
        )

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}" if not self.experimental else "experimental"

    def __le__(self, other: tuple[int, int, bool] | tuple[int, int]) -> bool:  # type: ignore[override]
        # this __le__ supports calling it against a version raw tuple or an API version;
        # the type ignore happens because NamedTuple says its parent is tuple[int...] in this
        # case, not tuple[int, int, bool]
        b_maj = other[0]
        b_min = other[1]
        b_exp = other[2] if len(other) > 2 else False
        # when you do a <= b, interpreter calls a.__le__(b)
        if self.experimental and b_exp:
            # both a and b are experimental: same version
            return True
        elif self.experimental:
            # a is experimental, and b is not: a > b, a !<= b
            return False
        elif b_exp:
            # a is not experimental, and b is: a < b, a <= b
            return True
        # both are not experimental, standard version compare
        return (self.major, self.minor) <= (b_maj, b_min)


class ThermocyclerStepBase(TypedDict):
    """Required elements of a thermocycler step: the temperature."""

    temperature: float


class ThermocyclerStep(ThermocyclerStepBase, total=False):
    """Optional elements of a thermocycler step: the hold time. One of these must be present."""

    hold_time_seconds: float
    hold_time_minutes: float


MAX_SUPPORTED_VERSION = APIVersion(2, 23)
"""The maximum supported protocol API version in this release."""

MIN_SUPPORTED_VERSION = APIVersion(2, 0)
"""The minimum supported protocol API version in this release, across all robot types."""

MIN_SUPPORTED_VERSION_FOR_FLEX = APIVersion(2, 15)
"""The minimum protocol API version supported by the Opentrons Flex.

It's an infrastructural requirement for this to be at least newer than 2.14. Before then,
the protocol API is backed by the legacy non-Protocol-engine backend, which is not prepared to
handle anything but OT-2s.

The additional bump to 2.15 is because that's what we tested on, and because it adds all the
Flex-specific features.
"""
