import typing
from datetime import datetime
from enum import Enum

from opentrons.calibration_storage.types import SourceType
from opentrons.hardware_control.util import DeckTransformState
from pydantic import BaseModel, Field
from robot_server.service.shared_models import calibration as cal_model


# NOTE: this would be more accurately typed as
# a typing.Tuple[float, float, float], but tuple is
# not able to be expressed in OpenAPI Spec
Offset = typing.Sequence[float]

# NOTE: this would be more accurately typed as
# a 4x4 matrix using typing.Tuple, but Tuple is
# not able to be expressed in OpenAPI Spec
AffineMatrix = typing.Sequence[
    typing.Sequence[float],
]

# NOTE: this would be more accurately typed as
# a 3x3 matrix using typing.Tuple, but Tuple is
# not able to be expressed in OpenAPI Spec
AttitudeMatrix = typing.Sequence[
    typing.Sequence[float],
]


class InstrumentOffset(BaseModel):
    single: Offset
    multi: Offset


class InstrumentCalibrationStatus(BaseModel):
    right: InstrumentOffset
    left: InstrumentOffset


class MatrixType(str, Enum):
    """The deck calibration matrix type"""

    affine = "affine"
    attitude = "attitude"


class DeckCalibrationData(BaseModel):
    type: MatrixType = Field(
        ..., description="The type of deck calibration matrix: affine or attitude"
    )
    matrix: typing.Union[AffineMatrix, AttitudeMatrix] = Field(
        ..., description="The deck calibration transform matrix"
    )
    lastModified: typing.Optional[datetime] = Field(
        None, description="When this calibration was last modified"
    )
    pipetteCalibratedWith: typing.Optional[str] = Field(
        None, description="The ID of the pipette used in this calibration"
    )
    tiprack: typing.Optional[str] = Field(
        None, description="The sha256 hash of the tiprack used in this calibration"
    )
    source: SourceType = Field(None, description="The calibration source")
    status: cal_model.CalibrationStatus = Field(
        None,
        description="The status of this calibration as determined"
        "by a user performing calibration check.",
    )


class DeckCalibrationStatus(BaseModel):
    status: DeckTransformState = Field(
        ...,
        description="An enum stating whether a user has a valid robot"
        "deck calibration. See DeckTransformState"
        "class for more information.",
    )
    data: DeckCalibrationData = Field(..., description="Deck calibration data")


class CalibrationStatus(BaseModel):
    """The calibration status"""

    deckCalibration: DeckCalibrationStatus
    instrumentCalibration: InstrumentCalibrationStatus
