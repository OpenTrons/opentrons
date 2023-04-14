"""Instruments routes."""
from datetime import datetime
from typing import Optional, List, Dict, Union
from typing_extensions import Final

from fastapi import APIRouter, status, Depends
from typing_extensions import Literal

from opentrons.protocol_engine.errors import HardwareNotSupportedError

from robot_server.hardware import get_hardware
from robot_server.service.json_api import (
    SimpleMultiBody,
    PydanticResponse,
    MultiBodyMeta,
    RequestModel,
    SimpleBody,
)
from server_utils.fastapi_utils.app_state import (
    AppState,
    AppStateAccessor,
    get_app_state,
)

from opentrons.types import Mount
from opentrons.protocol_engine.types import Vec3f
from opentrons.protocol_engine.resources.ot3_validation import ensure_ot3_hardware
from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import UpdateState, OT3Mount
from opentrons.hardware_control.dev_types import PipetteDict, GripperDict
from opentrons_shared_data.gripper.gripper_definition import GripperModelStr

from .instrument_models import (
    MountType,
    PipetteData,
    Pipette,
    GripperData,
    Gripper,
    AttachedInstrument,
    GripperCalibrationData,
    UpdateCreate,
    UpdateProgressData,
)
from .firmware_update_manager import (
    FirmwareUpdateManager,
    UpdateIdNotFound as _UpdateIdNotFound,
    UpdateIdExists as _UpdateIdExists,
    UpdateFailed as _UpdateFailed,
    InstrumentNotFound as _InstrumentNotFound,
    UpdateInProgress as _UpdateInProgress,
    UpdateProcessSummary,
)
from ..errors import ErrorDetails, ErrorBody
from ..errors.global_errors import IDNotFound
from ..errors.robot_errors import InstrumentNotFound, NotSupportedOnOT2
from ..service.dependencies import get_unique_id, get_current_time
from ..service.task_runner import TaskRunner, get_task_runner

instruments_router = APIRouter()

_firmware_update_manager_accessor = AppStateAccessor[FirmwareUpdateManager](
    "firmware_update_manager"
)

UPDATE_CREATE_TIMEOUT_S: Final = 5


async def get_firmware_update_manager(
    app_state: AppState = Depends(get_app_state),
    hardware_api: HardwareControlAPI = Depends(get_hardware),
    task_runner: TaskRunner = Depends(get_task_runner),
) -> FirmwareUpdateManager:
    """Get an update manager to track firmware update statuses."""
    update_manager = _firmware_update_manager_accessor.get_from(app_state)

    if update_manager is None:
        try:
            ot3_hardware = ensure_ot3_hardware(hardware_api=hardware_api)
        except HardwareNotSupportedError as e:
            raise NotSupportedOnOT2(detail=str(e)).as_error(
                status.HTTP_403_FORBIDDEN
            ) from e
        update_manager = FirmwareUpdateManager(
            task_runner=task_runner, hw_handle=ot3_hardware
        )
        _firmware_update_manager_accessor.set_on(app_state, update_manager)
    return update_manager


class NoUpdateAvailable(ErrorDetails):
    """An error if no update is available for the specified mount."""

    id: Literal["NoUpdateAvailable"] = "NoUpdateAvailable"
    title: str = "No Update Available"


class UpdateInProgress(ErrorDetails):
    """An error thrown if there is already an update in progress."""

    id: Literal["UpdateInProgress"] = "UpdateInProgress"
    title: str = "An update is already in progress."


class TimeoutStartingUpdate(ErrorDetails):
    """Error raised when the update took too long to start."""

    id: Literal["TimeoutStartingUpdate"] = "TimeoutStartingUpdate"
    title: str = "Timeout Starting Update"


class FirmwareUpdateFailed(ErrorDetails):
    """An error if a firmware update failed for some reason."""

    id: Literal["FirmwareUpdateFailed"] = "FirmwareUpdateFailed"
    title: str = "Firmware Update Failed"


def _pipette_dict_to_pipette_res(pipette_dict: PipetteDict, mount: Mount) -> Pipette:
    """Convert PipetteDict to Pipette response model."""
    if pipette_dict:
        return Pipette.construct(
            mount=MountType.from_hw_mount(mount).value,
            instrumentName=pipette_dict["name"],
            instrumentModel=pipette_dict["model"],
            serialNumber=pipette_dict["pipette_id"],
            currentFirmwareVersion=pipette_dict.get("fw_current_version"),
            firmwareUpdateRequired=pipette_dict.get("fw_update_required"),
            nextAvailableFirmwareVersion=pipette_dict.get("fw_next_version"),
            data=PipetteData(
                channels=pipette_dict["channels"],
                min_volume=pipette_dict["min_volume"],
                max_volume=pipette_dict["max_volume"],
            ),
        )


def _gripper_dict_to_gripper_res(gripper_dict: GripperDict) -> Gripper:
    """Convert GripperDict to Gripper response model."""
    calibration_data = gripper_dict["calibration_offset"]
    return Gripper.construct(
        mount=MountType.EXTENSION.value,
        instrumentModel=GripperModelStr(str(gripper_dict["model"])),
        serialNumber=gripper_dict["gripper_id"],
        currentFirmwareVersion=gripper_dict["fw_current_version"],
        firmwareUpdateRequired=gripper_dict["fw_update_required"],
        nextAvailableFirmwareVersion=gripper_dict.get("fw_next_version"),
        data=GripperData(
            jawState=gripper_dict["state"].name.lower(),
            calibratedOffset=GripperCalibrationData.construct(
                offset=Vec3f(
                    x=calibration_data.offset.x,
                    y=calibration_data.offset.y,
                    z=calibration_data.offset.z,
                ),
                source=calibration_data.source,
                last_modified=calibration_data.last_modified,
            ),
        ),
    )


@instruments_router.get(
    path="/instruments",
    summary="Get attached instruments.",
    description="Get a list of all instruments (pipettes & gripper) currently attached"
    " to the robot.",
    responses={status.HTTP_200_OK: {"model": SimpleMultiBody[AttachedInstrument]}},
)
async def get_attached_instruments(
    hardware: HardwareControlAPI = Depends(get_hardware),
) -> PydanticResponse[SimpleMultiBody[AttachedInstrument]]:
    """Get a list of all attached instruments."""
    pipettes: Dict[Mount, PipetteDict]
    gripper: Optional[GripperDict] = None

    try:
        # TODO (spp, 2023-01-06): revise according to
        #  https://opentrons.atlassian.net/browse/RET-1295
        ot3_hardware = ensure_ot3_hardware(hardware_api=hardware)
        # OT3
        await hardware.cache_instruments()
        gripper = ot3_hardware.attached_gripper
        pipettes = ot3_hardware.attached_pipettes
    except HardwareNotSupportedError:
        # OT2
        pipettes = hardware.attached_instruments

    response_data: List[AttachedInstrument] = [
        _pipette_dict_to_pipette_res(pipette_dict=pipette_dict, mount=mount)
        for mount, pipette_dict in pipettes.items()
        if pipette_dict
    ]

    if gripper:
        response_data.append(_gripper_dict_to_gripper_res(gripper_dict=gripper))

    return await PydanticResponse.create(
        content=SimpleMultiBody.construct(
            data=response_data,
            meta=MultiBodyMeta(cursor=0, totalLength=len(response_data)),
        ),
        status_code=status.HTTP_200_OK,
    )


async def _create_and_remove_if_error(
    manager: FirmwareUpdateManager,
    update_id: str,
    mount: OT3Mount,
    created_at: datetime,
    timeout: float,
) -> UpdateProcessSummary:
    try:
        handle = await manager.start_update_process(
            update_id,
            mount,
            created_at,
            UPDATE_CREATE_TIMEOUT_S,
        )
        return await handle.get_process_summary()
    except Exception:
        try:
            await manager.complete_update_process(update_id)
        except Exception:
            pass
        raise


@instruments_router.post(
    path="/instruments/updates",
    summary="Initiate a firmware update on a specific instrument.",
    description="Update the firmware of the instrument attached to the specified mount"
    " if a firmware update is available for it.",
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[AttachedInstrument]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[InstrumentNotFound]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[UpdateInProgress]},
        status.HTTP_412_PRECONDITION_FAILED: {"model": ErrorBody[NoUpdateAvailable]},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorBody[Union[FirmwareUpdateFailed, UpdateInProgress]]
        },
    },
)
async def update_firmware(
    request_body: RequestModel[UpdateCreate],
    update_process_id: str = Depends(get_unique_id),
    created_at: datetime = Depends(get_current_time),
    hardware: HardwareControlAPI = Depends(get_hardware),
    firmware_update_manager: FirmwareUpdateManager = Depends(
        get_firmware_update_manager
    ),
) -> PydanticResponse[SimpleBody[UpdateProgressData]]:
    """Update the firmware of the OT3 instrument on the specified mount.

    Arguments:
        request_body: Optional request body with instrument to update. If not specified,
                      will start an update of all attached instruments.
        update_process_id: Generated ID to assign to the update resource.
        created_at: Timestamp to attach to created update resource.
        hardware: hardware controller instance.
        firmware_update_manager: Injected manager for firmware updates.
    """
    mount_to_update = request_body.data.mount
    ot3_mount = MountType.to_ot3_mount(mount_to_update)
    await hardware.cache_instruments()

    try:
        summary = await _create_and_remove_if_error(
            firmware_update_manager,
            update_process_id,
            ot3_mount,
            created_at,
            UPDATE_CREATE_TIMEOUT_S,
        )
    except _InstrumentNotFound:
        raise InstrumentNotFound(
            detail=f"No instrument found on {mount_to_update} mount."
        ).as_error(status.HTTP_404_NOT_FOUND)
    except _UpdateInProgress:
        raise UpdateInProgress(
            detail=f"{mount_to_update} is already either queued for update"
            f" or is currently updating"
        ).as_error(status.HTTP_409_CONFLICT)
    except _UpdateFailed as e:
        raise FirmwareUpdateFailed(detail=str(e)).as_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except TimeoutError as e:
        raise TimeoutStartingUpdate(detail=str(e)).as_error(
            status.HTTP_408_REQUEST_TIMEOUT
        )
    except _UpdateIdExists:
        raise UpdateInProgress(
            detail="An update is already ongoing with this ID."
        ).as_error(status.HTTP_500_INTERNAL_SERVER_ERROR)

    return await PydanticResponse.create(
        content=SimpleBody.construct(
            data=UpdateProgressData(
                id=summary.details.update_id,
                createdAt=summary.details.created_at,
                mount=MountType.from_ot3_mount(
                    summary.details.mount
                ).value_as_literal(),
                updateStatus=summary.progress.state,
                updateProgress=summary.progress.progress,
            )
        ),
        status_code=status.HTTP_201_CREATED,
    )


@instruments_router.get(
    path="/instruments/updates/{update_id}",
    summary="Get specified firmware update process' information.",
    description="Get firmware update status & progress of the specified update.",
    responses={
        status.HTTP_200_OK: {"model": SimpleMultiBody[UpdateProgressData]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[IDNotFound]},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorBody[FirmwareUpdateFailed]
        },
    },
)
async def get_firmware_update_status(
    update_id: str,
    firmware_update_manager: FirmwareUpdateManager = Depends(
        get_firmware_update_manager
    ),
) -> PydanticResponse[SimpleBody[UpdateProgressData]]:
    """Get status of instrument firmware update.

    update_id: the ID to get the status of
    firmware_update_manager: The firmware update manage rcontrolling the update processes.
    """
    try:
        handle = firmware_update_manager.get_update_process_handle(update_id)
        summary = await handle.get_process_summary()
    except _UpdateIdNotFound as e:
        raise IDNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)
    except _UpdateFailed as e:
        raise FirmwareUpdateFailed(detail=str(e)).as_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    if summary.progress.state == UpdateState.done:
        try:
            await firmware_update_manager.complete_update_process(update_id)
        except _UpdateIdNotFound:
            # this access could theoretically race, and that's fine if we already got
            # here.
            pass

    return await PydanticResponse.create(
        content=SimpleBody.construct(
            data=UpdateProgressData(
                id=summary.details.update_id,
                createdAt=summary.details.created_at,
                mount=MountType.from_ot3_mount(
                    summary.details.mount
                ).value_as_literal(),
                updateStatus=summary.progress.state,
                updateProgress=summary.progress.progress,
            )
        ),
        status_code=status.HTTP_200_OK,
    )
