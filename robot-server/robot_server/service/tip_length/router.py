from starlette import status
from fastapi import APIRouter, Depends, Query
from typing import Annotated, Optional, cast

from opentrons.calibration_storage import types as cal_types
from opentrons.calibration_storage.ot2 import tip_length, models

from robot_server.hardware import get_ot2_hardware
from robot_server.errors.error_responses import ErrorBody
from robot_server.service.tip_length import models as tl_models
from robot_server.service.errors import RobotServerError, CommonErrorDef
from robot_server.service.shared_models import calibration as cal_model

from opentrons.hardware_control import API
from opentrons_shared_data.pipette.types import LabwareUri


router = APIRouter()


def _format_calibration(
    calibration: models.v1.TipLengthCalibration,
) -> tl_models.TipLengthCalibration:
    # TODO (lc 09-20-2022) We should use the calibration
    # status model in calibration storage.
    status = cal_model.CalibrationStatus(
        markedBad=calibration.status.markedBad,
        source=calibration.status.source,
        markedAt=calibration.status.markedAt,
    )
    formatted_cal = tl_models.TipLengthCalibration(
        id=f"{calibration.tiprack}&{calibration.pipette}",
        tipLength=calibration.tipLength,
        tiprack=calibration.tiprack,
        pipette=calibration.pipette,
        lastModified=calibration.lastModified,
        source=calibration.source,
        status=status,
        uri=calibration.uri,
    )

    return formatted_cal


@router.get(
    "/calibration/tip_length",
    description="Fetch all saved tip length calibrations from the robot",
    summary="Search the robot for any saved tip length calibration",
    response_model=tl_models.MultipleCalibrationsResponse,
)
async def get_all_tip_length_calibrations(
    _: Annotated[API, Depends(get_ot2_hardware)],
    tiprack_hash: Annotated[
        Optional[str],
        Query(
            description=(
                "Filter results by their `tiprack` field."
                " This is deprecated because it was prone to bugs where semantically identical"
                " definitions had different hashes."
                " Use `tiprack_uri` instead."
            ),
            deprecated=True,
        ),
    ] = None,
    pipette_id: Annotated[
        Optional[str],
        Query(description="Filter results by their `pipette` field."),
    ] = None,
    tiprack_uri: Annotated[
        Optional[str],
        Query(
            description="Filter results by their `uri` field.",
        ),
    ] = None,
) -> tl_models.MultipleCalibrationsResponse:
    all_calibrations = tip_length.get_all_tip_length_calibrations()
    if not all_calibrations:
        return tl_models.MultipleCalibrationsResponse(
            data=[_format_calibration(cal) for cal in all_calibrations],
            links=None,
        )

    if tiprack_hash:
        all_calibrations = list(
            filter(lambda cal: cal.tiprack == tiprack_hash, all_calibrations)
        )
    if pipette_id:
        all_calibrations = list(
            filter(lambda cal: cal.pipette == pipette_id, all_calibrations)
        )
    if tiprack_uri:
        all_calibrations = list(
            filter(lambda cal: cal.uri == tiprack_uri, all_calibrations)
        )

    calibrations = [_format_calibration(cal) for cal in all_calibrations]
    return tl_models.MultipleCalibrationsResponse(data=calibrations, links=None)


@router.delete(
    "/calibration/tip_length",
    description="Delete one specific tip length calibration by pipette "
    "serial and tiprack uri",
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorBody}},
)
async def delete_specific_tip_length_calibration(
    _: Annotated[API, Depends(get_ot2_hardware)],
    pipette_id: Annotated[
        str,
        Query(
            ...,
            description=(
                "The `pipette` field value of the calibration you want to delete."
                " (See `GET /calibration/tip_length`.)"
            ),
        ),
    ],
    tiprack_hash: Annotated[
        Optional[str],
        Query(
            description=(
                "The `tiprack` field value of the calibration you want to delete."
                " (See `GET /calibration/tip_length`.)"
                "\n\n"
                " This is deprecated because it was prone to bugs where semantically identical"
                " definitions had different hashes."
                " Use `tiprack_uri` instead."
                "\n\n"
                "You must supply either this or `tiprack_uri`."
            ),
            deprecated=True,
        ),
    ] = None,
    tiprack_uri: Annotated[
        Optional[str],
        Query(
            description=(
                "The `uri` field value of the calibration you want to delete."
                " (See `GET /calibration/tip_length`.)"
                "\n\n"
                " You must supply either this or `tiprack_hash`."
            ),
        ),
    ] = None,
) -> None:
    try:
        tip_length.delete_tip_length_calibration(
            pipette_id,
            # TODO(mm, 2024-03-06): This is a dangerous cast if, for example, the client
            # supplies an invalid URI without slashes, and something internal tries to
            # split it on slashes. We should have a custom Pydantic type so FastAPI can
            # return a 422 error.
            tiprack_uri=cast(LabwareUri, tiprack_uri),
            tiprack_hash=tiprack_hash,
        )
    except cal_types.TipLengthCalNotFound:
        raise RobotServerError(
            definition=CommonErrorDef.RESOURCE_NOT_FOUND,
            resource="TipLengthCalibration",
            id=f"{tiprack_uri}&{pipette_id}",
        )
