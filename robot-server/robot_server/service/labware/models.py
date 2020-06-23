import typing
from datetime import datetime

from functools import partial
from pydantic import BaseModel, Field

from robot_server.service.json_api import \
    ResponseDataModel, ResponseModel

OffsetVector = typing.Tuple[float, float, float]

OffsetVectorField = partial(Field, ...,
                            description="A labware offset vector in deck "
                                        "coordinates (x, y, z)")


class OffsetData(BaseModel):
    value: OffsetVector = OffsetVectorField()
    lastModified: datetime


class TipData(BaseModel):
    value: typing.Optional[float]
    lastModified: typing.Optional[datetime]


class CalibrationData(BaseModel):
    offset: OffsetData
    tipLength: TipData


class LabwareCalibration(BaseModel):
    calibrationId: str
    calibrationData: CalibrationData
    loadName: str
    namespace: str
    version: int
    parent: str
    valueType: str


class Calibrations(BaseModel):
    valueType: str
    value: typing.List[typing.Optional[LabwareCalibration]]


MultipleCalibrationsResponse = ResponseModel[
    ResponseDataModel[Calibrations], dict
]
SingleCalibrationResponse = ResponseModel[
    ResponseDataModel[LabwareCalibration], dict
]
