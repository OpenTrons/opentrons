from starlette import status
from fastapi import APIRouter, Depends
from typing import Annotated, Optional

from opentrons import types as ot_types
from opentrons.calibration_storage.ot2 import pipette_offset, models

from robot_server.hardware import get_ot2_hardware
from robot_server.errors.error_responses import ErrorBody
from robot_server.service.pipette_offset import models as pip_models
from robot_server.service.errors import RobotServerError, CommonErrorDef
from robot_server.service.shared_models import calibration as cal_model

from opentrons.hardware_control import API

router = APIRouter()


def _format_calibration(
    calibration: models.v1.PipetteOffsetCalibration,
) -> pip_models.PipetteOffsetCalibration:
    # TODO (lc 09-20-2022) We should use the calibration
    # status model in calibration storage.
    status = cal_model.CalibrationStatus(
        markedBad=calibration.status.markedBad,
        source=calibration.status.source,
        markedAt=calibration.status.markedAt,
    )
    formatted_cal = pip_models.PipetteOffsetCalibration(
        id=f"{calibration.pipette}&{calibration.mount}",
        pipette=calibration.pipette,
        mount=calibration.mount,
        offset=list(calibration.offset),
        tiprack=calibration.tiprack,
        tiprackUri=calibration.uri,
        lastModified=calibration.last_modified,
        source=calibration.source,
        status=status,
    )

    return formatted_cal


@router.get(
    "/calibration/pipette_offset",
    summary="Get all pipette offset calibrations",
    description="Fetch all saved pipette offset calibrations from the robot",
    response_model=pip_models.MultipleCalibrationsResponse,
)
async def get_all_pipette_offset_calibrations(
    _: Annotated[API, Depends(get_ot2_hardware)],
    pipette_id: Optional[str] = None,
    mount: Optional[pip_models.MountType] = None,
) -> pip_models.MultipleCalibrationsResponse:
    all_calibrations = pipette_offset.get_all_pipette_offset_calibrations()
    if not all_calibrations:
        return pip_models.MultipleCalibrationsResponse(
            data=[_format_calibration(cal) for cal in all_calibrations],
            links=None,
        )

    if pipette_id:
        all_calibrations = list(
            filter(lambda cal: cal.pipette == pipette_id, all_calibrations)
        )
    if mount:
        all_calibrations = list(
            filter(lambda cal: cal.mount == mount, all_calibrations)
        )

    calibrations = [_format_calibration(cal) for cal in all_calibrations]
    return pip_models.MultipleCalibrationsResponse(data=calibrations, links=None)


@router.delete(
    "/calibration/pipette_offset",
    summary="Delete a pipette offset calibration",
    description="Delete one specific pipette calibration by pipette serial and mount.",
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorBody}},
)
async def delete_specific_pipette_offset_calibration(
    pipette_id: str,
    mount: pip_models.MountType,
    _: Annotated[API, Depends(get_ot2_hardware)],
) -> None:
    try:
        pipette_offset.delete_pipette_offset_file(
            pipette_id, ot_types.Mount[mount.upper()]
        )
    except FileNotFoundError:
        raise RobotServerError(
            definition=CommonErrorDef.RESOURCE_NOT_FOUND,
            resource="PipetteOffsetCalibration",
            id=f"{pipette_id}&{mount}",
        )
