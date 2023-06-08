"""The router for the /subsystems endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, status, Depends, Response, Request
from typing_extensions import Literal

from opentrons.protocol_engine.errors import HardwareNotSupportedError
from opentrons.protocol_engine.resources.ot3_validation import ensure_ot3_hardware
from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.ot3api import OT3API

from robot_server.hardware import get_hardware
from robot_server.service.json_api import (
    SimpleMultiBody,
    PydanticResponse,
    MultiBodyMeta,
    SimpleBody,
)
from server_utils.fastapi_utils.app_state import (
    AppState,
    AppStateAccessor,
    get_app_state,
)

from .firmware_update_manager import (
    FirmwareUpdateManager,
    UpdateIdNotFound as _UpdateIdNotFound,
    UpdateIdExists as _UpdateIdExists,
    UpdateInProgress as _UpdateInProgress,
    NoOngoingUpdate as _NoOngoingUpdate,
    SubsystemNotFound as _SubsystemNotFound,
)

from robot_server.errors import ErrorDetails, ErrorBody
from robot_server.errors.robot_errors import NotSupportedOnOT2
from robot_server.errors.global_errors import IDNotFound

from robot_server.service.dependencies import get_unique_id, get_current_time
from robot_server.service.task_runner import TaskRunner, get_task_runner


from .models import (
    UpdateProgressData,
    UpdateProgressSummary,
    SubSystem,
    PresentSubsystem,
)

subsystems_router = APIRouter()

_firmware_update_manager_accessor = AppStateAccessor[FirmwareUpdateManager](
    "firmware_update_manager"
)


def _error_str(maybe_err: Optional[Exception]) -> Optional[str]:
    if maybe_err:
        return str(maybe_err)
    return None


async def get_ot3_hardware(
    hardware_api: HardwareControlAPI = Depends(get_hardware),
) -> OT3API:
    """Get a flex hardware controller."""
    try:
        return ensure_ot3_hardware(hardware_api=hardware_api)
    except HardwareNotSupportedError as e:
        raise NotSupportedOnOT2(detail=str(e)).as_error(
            status.HTTP_403_FORBIDDEN
        ) from e


async def get_firmware_update_manager(
    app_state: AppState = Depends(get_app_state),
    hardware_api: OT3API = Depends(get_ot3_hardware),
    task_runner: TaskRunner = Depends(get_task_runner),
) -> FirmwareUpdateManager:
    """Get an update manager to track firmware update statuses."""
    update_manager = _firmware_update_manager_accessor.get_from(app_state)

    if update_manager is None:
        update_manager = FirmwareUpdateManager(
            task_runner=task_runner, hw_handle=hardware_api
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


class FirmwareUpdateFailed(ErrorDetails):
    """An error if a firmware update failed for some reason."""

    id: Literal["FirmwareUpdateFailed"] = "FirmwareUpdateFailed"
    title: str = "Firmware Update Failed"


class SubsystemNotPresent(ErrorDetails):
    """An error if a subsystem that is not present is requested."""

    id: Literal["SubsystemNotPresent"] = "SubsystemNotPresent"
    title: str = "Subsystem Not Present"


class InvalidSubsystem(ErrorDetails):
    """An error if a subsystem name is invalid."""

    id: Literal["InvalidSubsystem"] = "InvalidSubsystem"
    title: str = "Invalid Subsystem"


class NoOngoingUpdate(ErrorDetails):
    """An error if there is no ongoing update for a subsystem."""

    id: Literal["NoOngoingUpdate"] = "NoOngoingUpdate"
    title: str = "No Ongoing Update"


@subsystems_router.get(
    "/subsystems/status",
    summary="Get attached subsystems.",
    description="Get a list of subsystems currently attached to the robot.",
    responses={
        status.HTTP_200_OK: {"model": SimpleMultiBody[PresentSubsystem]},
        status.HTTP_403_FORBIDDEN: {"model": ErrorBody[NotSupportedOnOT2]},
    },
)
async def get_attached_subsystems(
    hardware: OT3API = Depends(get_ot3_hardware),
) -> PydanticResponse[SimpleMultiBody[PresentSubsystem]]:
    """Return all subsystems currently present on the machine."""
    data = [
        PresentSubsystem.construct(
            name=SubSystem.from_hw(subsystem_id),
            ok=subsystem_details.ok,
            current_fw_version=str(subsystem_details.current_fw_version),
            next_fw_version=str(subsystem_details.next_fw_version),
            fw_update_needed=subsystem_details.fw_update_needed,
            revision=str(subsystem_details.pcba_revision),
        )
        for subsystem_id, subsystem_details in hardware.attached_subsystems.items()
    ]
    meta = MultiBodyMeta(cursor=0, totalLength=len(data))
    return await PydanticResponse.create(
        content=SimpleMultiBody.construct(data=data, meta=meta)
    )


@subsystems_router.get(
    "/subsystems/status/{subsystem}",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[PresentSubsystem]},
        status.HTTP_403_FORBIDDEN: {"model": ErrorBody[NotSupportedOnOT2]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[SubsystemNotPresent]},
    },
)
async def get_attached_subsystem(
    subsystem: SubSystem, hardware: OT3API = Depends(get_ot3_hardware)
) -> PydanticResponse[SimpleBody[PresentSubsystem]]:
    """Return the status of a single attached subsystem.

    Response: A subsystem status, if the subsystem is present. Otherwise, an appropriate error.
    """
    subsystem_status = hardware.attached_subsystems.get(subsystem.to_hw(), None)
    if not subsystem_status:
        raise SubsystemNotPresent(detail=subsystem.value).as_error(
            status.HTTP_404_NOT_FOUND
        )
    return await PydanticResponse.create(
        content=SimpleBody.construct(
            data=PresentSubsystem.construct(
                name=subsystem,
                ok=subsystem_status.ok,
                current_fw_version=str(subsystem_status.current_fw_version),
                next_fw_version=str(subsystem_status.next_fw_version),
                fw_update_needed=subsystem_status.fw_update_needed,
                revision=str(subsystem_status.pcba_revision),
            )
        )
    )


@subsystems_router.get(
    "/subsystems/updates/current",
    summary="Get a list of currently-ongoing subsystem updates.",
    description="Get a list of currently-running subsystem firmware updates. This is a good snapshot of what, if anything, is currently being updated and may block other robot work. To guarantee data about an update you were previously interested in, get its id using /subsystems/updates/all.",
    responses={status.HTTP_200_OK: {"model": SimpleMultiBody[UpdateProgressSummary]}},
)
async def get_subsystem_updates(
    update_manager: FirmwareUpdateManager = Depends(get_firmware_update_manager),
) -> PydanticResponse[SimpleMultiBody[UpdateProgressSummary]]:
    """Return all currently-running firmware update process summaries."""
    handles = await update_manager.all_ongoing_processes()
    data = [
        UpdateProgressSummary.construct(
            id=handle.process_details.update_id,
            subsystem=handle.process_details.subsystem,
            updateStatus=handle.cached_state,
            createdAt=handle.process_details.created_at,
        )
        for handle in handles
    ]
    meta = MultiBodyMeta(cursor=0, totalLength=len(data))
    return await PydanticResponse.create(
        content=SimpleMultiBody.construct(data=data, meta=meta)
    )


@subsystems_router.get(
    "/subsystems/updates/current/{subsystem}",
    summary="Get any currently-ongoing update for a specific subsystem.",
    description="As /subsystems/updates/current but filtered by the route parameter.",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[UpdateProgressData]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[NoOngoingUpdate]},
    },
)
async def get_subsystem_update(
    subsystem: SubSystem,
    update_manager: FirmwareUpdateManager = Depends(get_firmware_update_manager),
) -> PydanticResponse[SimpleBody[UpdateProgressData]]:
    """Return full data about a specific currently-running update process."""
    try:
        handle = await update_manager.get_ongoing_update_process_handle_by_subsystem(
            subsystem
        )
    except _NoOngoingUpdate as e:
        raise NoOngoingUpdate(detail=subsystem.value).as_error(
            status.HTTP_404_NOT_FOUND
        ) from e
    progress = await handle.get_progress()
    return await PydanticResponse.create(
        content=SimpleBody.construct(
            data=UpdateProgressData.construct(
                id=handle.process_details.update_id,
                createdAt=handle.process_details.created_at,
                subsystem=handle.process_details.subsystem,
                updateStatus=progress.state,
                updateProgress=progress.progress,
                updateError=_error_str(progress.error),
            )
        )
    )


@subsystems_router.get(
    "/subsystems/updates/all",
    summary="Get a list of all updates by id.",
    description="Get a list of all updates, including both current and concluded ones, by their update id. This is a list of all previous updates since the machine booted, including their final status and whether they succeeded or failed. While an update might complete while you're not polling and therefore disappear from /subsystems/updates/running, you can always pull a previous update by id from here.",
    responses={status.HTTP_200_OK: {"model": SimpleMultiBody[UpdateProgressData]}},
)
async def get_update_processes(
    update_manager: FirmwareUpdateManager = Depends(get_firmware_update_manager),
) -> PydanticResponse[SimpleMultiBody[UpdateProgressSummary]]:
    """Return summaries of all past (since robot boot) or present update processes."""
    data = [
        UpdateProgressSummary(
            id=update.process_details.update_id,
            subsystem=update.process_details.subsystem,
            updateStatus=update.cached_state,
            createdAt=update.process_details.created_at,
        )
        for update in update_manager.all_update_processes()
    ]
    meta = MultiBodyMeta(cursor=0, totalLength=len(data))
    return await PydanticResponse.create(
        content=SimpleMultiBody.construct(data=data, meta=meta)
    )


@subsystems_router.get(
    "/subsystems/updates/all/{id}",
    summary="Get the details of a specific update id.",
    description="As /subsystems/updates/all but filtered by the route parameter.",
    responses={status.HTTP_200_OK: {"model": SimpleBody[UpdateProgressData]}},
)
async def get_update_process(
    id: str,
    update_manager: FirmwareUpdateManager = Depends(get_firmware_update_manager),
) -> PydanticResponse[SimpleBody[UpdateProgressData]]:
    """Return the progress of a specific past or present update process."""
    try:
        handle = update_manager.get_update_process_handle_by_id(id)
    except _UpdateIdNotFound as e:
        raise IDNotFound(detail=id).as_error(status.HTTP_404_NOT_FOUND) from e
    progress = await handle.get_progress()
    return await PydanticResponse.create(
        content=SimpleBody.construct(
            data=UpdateProgressData.construct(
                id=handle.process_details.update_id,
                subsystem=handle.process_details.subsystem,
                createdAt=handle.process_details.created_at,
                updateStatus=progress.state,
                updateProgress=progress.progress,
                updateError=_error_str(progress.error),
            )
        )
    )


@subsystems_router.post(
    "/subsystems/updates/{subsystem}",
    summary="Start an update for a subsystem.",
    description="Begin a firmware update for a given subsystem.",
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[UpdateProgressData]},
        status.HTTP_303_SEE_OTHER: {"model": SimpleBody[UpdateProgressData]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[SubsystemNotPresent]},
        status.HTTP_412_PRECONDITION_FAILED: {"model": ErrorBody[NoUpdateAvailable]},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorBody[FirmwareUpdateFailed]
        },
    },
)
async def begin_subsystem_update(
    subsystem: SubSystem,
    response: Response,
    request: Request,
    update_manager: FirmwareUpdateManager = Depends(get_firmware_update_manager),
    update_process_id: str = Depends(get_unique_id),
    created_at: datetime = Depends(get_current_time),
) -> PydanticResponse[SimpleBody[UpdateProgressData]]:
    """Update the firmware of the OT3 instrument on the specified mount."""
    try:
        summary = await update_manager.start_update_process(
            update_process_id,
            subsystem,
            created_at,
        )
    except _SubsystemNotFound as e:
        raise SubsystemNotPresent(
            detail=str(e),
        ).as_error(status.HTTP_404_NOT_FOUND) from e
    except _UpdateInProgress as e:
        response.headers["Location"] = str(
            request.url.replace(
                path=f"/subsystems/updates/current/{subsystem.value}",
            )
        )
        raise UpdateInProgress(
            detail=f"{subsystem.value} is already either queued for update"
            f" or is currently updating"
        ).as_error(status.HTTP_303_SEE_OTHER) from e
    except _UpdateIdExists:
        raise UpdateInProgress(
            detail="An update is already ongoing with this ID."
        ).as_error(status.HTTP_500_INTERNAL_SERVER_ERROR)

    response.headers["Location"] = str(
        request.url.replace(path=f"/subsystems/updates/current/{subsystem.value}")
    )
    progress = await summary.get_progress()
    return await PydanticResponse.create(
        content=SimpleBody.construct(
            data=UpdateProgressData.construct(
                id=summary.process_details.update_id,
                createdAt=summary.process_details.created_at,
                subsystem=subsystem,
                updateStatus=progress.state,
                updateProgress=progress.progress,
                updateError=_error_str(progress.error),
            )
        ),
        status_code=status.HTTP_201_CREATED,
    )
