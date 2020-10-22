from typing import Optional, List, Tuple
from functools import partial
from pydantic import BaseModel, Field

from ..helper_classes import RequiredLabware, AttachedPipette

OffsetVector = Tuple[float, float, float]

OffsetVectorField = partial(Field, ...,
                            description="An offset vector in deck "
                                        "coordinates (x, y, z)")


class ComparisonStatus(BaseModel):
    """
    A model describing the comparison of a checked point to calibrated value
    """
    differenceVector: OffsetVector = OffsetVectorField()
    thresholdVector:  OffsetVector = OffsetVectorField()
    exceedsThreshold: bool
    transformType: str


class ComparisonMap(BaseModel):
    comparingHeight: Optional[ComparisonStatus] =\
        Field(None, description="height validation step")
    comparingPointOne: Optional[ComparisonStatus] =\
        Field(None, description="point 1 validation step")
    comparingPointTwo: Optional[ComparisonStatus] =\
        Field(None, description="point 2 validation step")
    comparingPointThree: Optional[ComparisonStatus] =\
        Field(None, description="point 3 validation step")


class ComparisonStatePerPipette(BaseModel):
    first: ComparisonMap
    second: ComparisonMap


class CheckAttachedPipette(AttachedPipette):
    rank: str


class CalibrationCheckSessionStatus(BaseModel):
    """The current status of a given session."""
    instruments: List[CheckAttachedPipette]
    activePipette: CheckAttachedPipette
    currentStep: str = Field(..., description="Current step of session")
    comparisonsByPipette: ComparisonStatePerPipette
    labware: List[RequiredLabware]
    activeTipRack: RequiredLabware

    class Config:
        arbitrary_types_allowed = True
        schema_extra = {
            "examples": [
                {
                    "instruments": [
                        {
                            "model": "p300_single_v1.5",
                            "name": "p300_single",
                            "tip_length": 51.7,
                            "mount": "left",
                            "id": "P3HS12123041"
                        },
                        {
                            "model": None,
                            "name": None,
                            "tip_length": None,
                            "mount": "right",
                            "id": None
                        }
                    ],
                    "currentStep": "sessionStarted",
                    "comparisonsByPipette": {
                        "comparingFirstPipetteHeight": {
                            "differenceVector": [1, 0, 0],
                            "exceedsThreshold": False
                        }
                    }
                }
            ]
        }
