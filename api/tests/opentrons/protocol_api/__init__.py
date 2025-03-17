"""Tests for opentrons.protocol_api."""
from typing import List, overload, Optional

from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_api import (
    MAX_SUPPORTED_VERSION,
    MIN_SUPPORTED_VERSION,
    MIN_SUPPORTED_VERSION_FOR_FLEX,
)

from hypothesis import strategies as st


def versions_at_or_above(from_version: APIVersion) -> List[APIVersion]:
    """Get a list of versions >= the specified one."""
    return versions_between(
        low_inclusive_bound=from_version, high_inclusive_bound=MAX_SUPPORTED_VERSION
    )


def versions_at_or_below(
    from_version: APIVersion, flex_only: bool = False
) -> List[APIVersion]:
    """Get a list of versions <= the specified one.

    Since there are different minimum supported versions for Flex and OT-2, specify which you care about
    with the second argument.
    """
    if flex_only:
        return versions_between(
            low_inclusive_bound=MIN_SUPPORTED_VERSION_FOR_FLEX,
            high_inclusive_bound=from_version,
        )
    else:
        return versions_between(
            low_inclusive_bound=MIN_SUPPORTED_VERSION, high_inclusive_bound=from_version
        )


def versions_above(from_version: APIVersion) -> List[APIVersion]:
    """Get a list of versions > the specified one."""
    return versions_between(
        low_exclusive_bound=from_version, high_inclusive_bound=MAX_SUPPORTED_VERSION
    )


def versions_below(from_version: APIVersion, flex_only: bool) -> List[APIVersion]:
    """Get a list of versions < the specified one.

    Since there are different minimum supported versions for Flex and OT-2, specify which you care about
    with the second argument.
    """
    if flex_only:
        return versions_between(
            low_inclusive_bound=MIN_SUPPORTED_VERSION_FOR_FLEX,
            high_exclusive_bound=from_version,
        )
    else:
        return versions_between(
            low_inclusive_bound=MIN_SUPPORTED_VERSION, high_exclusive_bound=from_version
        )


@overload
def versions_between(
    *,
    low_inclusive_bound: APIVersion,
    high_inclusive_bound: APIVersion,
) -> List[APIVersion]:
    ...


@overload
def versions_between(
    *, low_inclusive_bound: APIVersion, high_exclusive_bound: APIVersion
) -> List[APIVersion]:
    ...


@overload
def versions_between(
    *,
    high_inclusive_bound: APIVersion,
    low_exclusive_bound: APIVersion,
) -> List[APIVersion]:
    ...


@overload
def versions_between(
    *, low_exclusive_bound: APIVersion, high_exclusive_bound: APIVersion
) -> List[APIVersion]:
    ...


def versions_between(
    low_inclusive_bound: Optional[APIVersion] = None,
    high_inclusive_bound: Optional[APIVersion] = None,
    low_exclusive_bound: Optional[APIVersion] = None,
    high_exclusive_bound: Optional[APIVersion] = None,
) -> List[APIVersion]:
    """Build a list of versions based on exclusive and inclusive constraints."""
    if low_inclusive_bound and high_inclusive_bound:
        assert (
            low_inclusive_bound.major == high_inclusive_bound.major
        ), "You need to change this test when you add a new major version"
        major = low_inclusive_bound.major
        start = low_inclusive_bound.minor
        stop = high_inclusive_bound.minor + 1
    elif low_inclusive_bound and high_exclusive_bound:
        assert (
            low_inclusive_bound.major == high_exclusive_bound.major
        ), "You need to change this test when you add a new major version"
        major = low_inclusive_bound.major
        start = low_inclusive_bound.minor
        stop = high_exclusive_bound.minor
    elif low_exclusive_bound and high_inclusive_bound:
        assert (
            low_exclusive_bound.major == high_inclusive_bound.major
        ), "You need to change this test when you add a new major version"
        major = low_exclusive_bound.major
        start = low_exclusive_bound.minor + 1
        stop = high_inclusive_bound.minor + 1
    elif low_exclusive_bound and high_exclusive_bound:
        assert (
            low_exclusive_bound.major == high_exclusive_bound.major
        ), "You need to change this test when you add a new major version"
        major = low_exclusive_bound.major
        start = low_exclusive_bound.minor + 1
        stop = high_exclusive_bound.minor
    else:
        raise ValueError("You must specify one low bound and one high bound")
    return [APIVersion(major, minor) for minor in range(start, stop)]


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

reasonable_numbers = st.one_of(reasonable_floats, reasonable_ints)

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
