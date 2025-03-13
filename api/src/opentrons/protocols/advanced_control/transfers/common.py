"""Common functions between v1 transfer and liquid-class-based transfer."""
import enum
import math
from typing import Iterable, Generator, Tuple, TypeVar, Literal, List


class NoLiquidClassPropertyError(ValueError):
    """An error raised when a liquid class property cannot be found for a pipette/tip combination"""


class TransferTipPolicyV2(enum.Enum):
    ONCE = "once"
    NEVER = "never"
    ALWAYS = "always"
    PER_SOURCE = "per source"


TransferTipPolicyV2Type = Literal["once", "always", "per source", "never"]

Target = TypeVar("Target")


def check_valid_volume_parameters(
    disposal_volume: float, air_gap: float, max_volume: float
) -> None:
    if air_gap >= max_volume:
        raise ValueError(
            "The air gap must be less than the maximum volume of the pipette"
        )
    elif disposal_volume >= max_volume:
        raise ValueError(
            "The disposal volume must be less than the maximum volume of the pipette"
        )
    elif disposal_volume + air_gap >= max_volume:
        raise ValueError(
            "The sum of the air gap and disposal volume must be less than"
            " the maximum volume of the pipette"
        )


def check_valid_liquid_class_volume_parameters(
    aspirate_volume: float, air_gap: float, disposal_volume: float, max_volume: float
) -> None:
    if air_gap + aspirate_volume > max_volume:
        raise ValueError(
            f"Cannot have an air gap of {air_gap} µL for an aspiration of {aspirate_volume} µL"
            f" with a max volume of {max_volume} µL. Please adjust the retract air gap to fit within"
            f" the bounds of the tip."
        )
    elif disposal_volume + aspirate_volume > max_volume:
        raise ValueError(
            f"Cannot have a dispense volume of {disposal_volume} µL for an aspiration of {aspirate_volume} µL"
            f" with a max volume of {max_volume} µL. Please adjust the dispense volume to fit within"
            f" the bounds of the tip."
        )


def expand_for_volume_constraints(
    volumes: Iterable[float],
    targets: Iterable[Target],
    max_volume: float,
) -> Generator[Tuple[float, "Target"], None, None]:
    """Split a sequence of proposed transfers if necessary to keep each
    transfer under the given max volume.
    """
    # A final defense against an infinite loop.
    # Raising a proper exception with a helpful message is left to calling code,
    # because it has more context about what the user is trying to do.
    assert max_volume > 0
    for volume, target in zip(volumes, targets):
        while volume > max_volume * 2:
            yield max_volume, target
            volume -= max_volume

        if volume > max_volume:
            volume /= 2
            yield volume, target
        yield volume, target


def _split_volume_equally(volume: float, max_volume: float) -> List[float]:
    """
    Splits a given volume into a list of volumes that are all less than or equal to max volume.

    If volume provided is more than the max volume, the volumes will be split evenly.
    """
    if volume <= max_volume:
        return [volume]
    else:
        iterations = math.ceil(volume / max_volume)
        return [volume / iterations for _ in range(iterations)]


def expand_for_volume_constraints_for_liquid_classes(
    volumes: Iterable[float],
    targets: Iterable[Target],
    max_volume: float,
) -> Generator[Tuple[float, "Target"], None, None]:
    """Split a sequence of proposed transfers to keep each under the max volume, splitting larger ones equally."""
    assert max_volume > 0
    for volume, target in zip(volumes, targets):
        for split_volume in _split_volume_equally(volume, max_volume):
            yield split_volume, target
