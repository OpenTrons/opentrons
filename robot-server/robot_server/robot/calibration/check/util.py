from dataclasses import dataclass
from typing import Optional, Union

from opentrons.types import Point

from .models import TipComparisonMap, PipetteOffsetComparisonMap, DeckComparisonMap

WILDCARD = "*"


@dataclass
class PointTypes:
    initial_point: Point = Point(0, 0, 0)
    final_point: Point = Point(0, 0, 0)


@dataclass
class ReferencePoints:
    tip: PointTypes
    height: PointTypes
    one: PointTypes
    two: PointTypes
    three: PointTypes


@dataclass
class ComparisonStatePerCalibration:
    tipLength: Optional[TipComparisonMap] = None
    pipetteOffset: Optional[PipetteOffsetComparisonMap] = None
    deck: Optional[DeckComparisonMap] = None

    def set_value(
        self,
        name: str,
        value: Union[TipComparisonMap, PipetteOffsetComparisonMap, DeckComparisonMap],
    ) -> None:
        setattr(self, name, value)


@dataclass
class ComparisonStatePerPipette:
    first: ComparisonStatePerCalibration
    second: ComparisonStatePerCalibration

    def set_value(self, name: str, value: ComparisonStatePerCalibration) -> None:
        setattr(self, name, value)


REFERENCE_POINT_MAP = {"1BLC": "one", "3BRC": "two", "7TLC": "three"}
