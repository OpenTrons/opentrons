from typing import Optional, List, Tuple
from typing_extensions import Literal
from functools import partial
from pydantic import BaseModel, Field

from ..helper_classes import RequiredLabware, AttachedPipette

OffsetVector = Tuple[float, float, float]

OffsetVectorField = partial(
    Field, ..., description="An offset vector in deck " "coordinates (x, y, z)"
)


class ComparisonStatus(BaseModel):
    """
    A model describing the comparison of a checked point to calibrated value
    """

    differenceVector: OffsetVector = OffsetVectorField()
    thresholdVector: OffsetVector = OffsetVectorField()
    exceedsThreshold: bool


class DeckComparisonMap(BaseModel):
    status: Literal["IN_THRESHOLD", "OUTSIDE_THRESHOLD"] = Field(
        ...,
        description="The status of this calibration type,"
        "dependent on the calibration being"
        "inside or outside of the threshold",
    )
    comparingPointOne: Optional[ComparisonStatus] = Field(
        None, description="point 1 validation step"
    )
    comparingPointTwo: Optional[ComparisonStatus] = Field(
        None, description="point 2 validation step"
    )
    comparingPointThree: Optional[ComparisonStatus] = Field(
        None, description="point 3 validation step"
    )


class PipetteOffsetComparisonMap(BaseModel):
    status: Literal["IN_THRESHOLD", "OUTSIDE_THRESHOLD"] = Field(
        ...,
        description="The status of this calibration type,"
        "dependent on the calibration being"
        "inside or outside of the threshold",
    )
    comparingHeight: Optional[ComparisonStatus] = Field(
        None, description="height validation step"
    )
    comparingPointOne: Optional[ComparisonStatus] = Field(
        None, description="point 1 validation step"
    )


class TipComparisonMap(BaseModel):
    status: Literal["IN_THRESHOLD", "OUTSIDE_THRESHOLD"] = Field(
        ...,
        description="The status of this calibration type,"
        "dependent on the calibration being"
        "inside or outside of the threshold",
    )
    comparingTip: Optional[ComparisonStatus] = Field(
        None, description="tip validation step"
    )


class ComparisonStatePerCalibration(BaseModel):
    tipLength: Optional[TipComparisonMap]
    pipetteOffset: Optional[PipetteOffsetComparisonMap]
    deck: Optional[DeckComparisonMap]


class ComparisonStatePerPipette(BaseModel):
    first: ComparisonStatePerCalibration
    second: ComparisonStatePerCalibration


class CheckAttachedPipette(AttachedPipette):
    rank: Literal["first", "second"] = Field(
        ..., description="The order of a given pipette"
    )
    tipRackLoadName: str = Field(..., description="The load name of the tiprack")
    tipRackDisplay: str = Field(..., description="The display name of the tiprack")
    tipRackUri: str = Field(..., description="The uri of the tiprack")


class SessionCreateParams(BaseModel):
    """
    Calibration Health Check create params
    """

    hasCalibrationBlock: bool = Field(
        False,
        description="Whether to use a calibration block in the"
        "calibration health check flow.",
    )
    tipRacks: List[dict] = Field(
        [],
        description="A list of labware definitions to use in"
        "calibration health check",
    )


class CalibrationCheckSessionStatus(BaseModel):
    """The current status of a given session."""

    instruments: List[CheckAttachedPipette]
    activePipette: CheckAttachedPipette
    currentStep: str = Field(..., description="Current step of session")
    comparisonsByPipette: ComparisonStatePerPipette
    labware: List[RequiredLabware]
    activeTipRack: RequiredLabware
    supportedCommands: List[Optional[str]] = Field(
        ..., description="A list of supported commands for this user flow"
    )

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
                            "id": "P3HS12123041",
                        },
                        {
                            "model": None,
                            "name": None,
                            "tip_length": None,
                            "mount": "right",
                            "id": None,
                        },
                    ],
                    "currentStep": "sessionStarted",
                    "comparisonsByPipette": {
                        "comparingFirstPipetteHeight": {
                            "differenceVector": [1, 0, 0],
                            "exceedsThreshold": False,
                        }
                    },
                }
            ]
        }
