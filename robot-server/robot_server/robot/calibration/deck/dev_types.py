from typing import Dict, Union, List
from typing_extensions import TypedDict, Literal
from opentrons.types import Point

from .constants import DeckCalibrationState

SavedPoints = TypedDict(
    'SavedPoints',
    {
        '1BLC': List[float],
        '3BRC': List[float],
        '7TLC': List[float],
    },
    total=False
    )

ExpectedPoints = TypedDict(
    'ExpectedPoints',
    {
        '1BLC': Point,
        '3BRC': Point,
        '7TLC': Point,
    })

StatePointMap = Dict[
    DeckCalibrationState, Union[Literal['1BLC', '3BRC', '7TLC']]]
