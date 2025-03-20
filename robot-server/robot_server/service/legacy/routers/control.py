from typing import Annotated

import asyncio

from fastapi import APIRouter, Query, Depends
from starlette import status

from opentrons_shared_data.errors import ErrorCodes
from opentrons.hardware_control import (
    ThreadedAsyncLock,
    ThreadedAsyncForbidden,
)
from opentrons.hardware_control.types import Axis, CriticalPoint
from opentrons.hardware_control import HardwareControlAPI

from opentrons.types import Mount, Point

from robot_server.errors.error_responses import LegacyErrorResponse
from robot_server.service.dependencies import get_motion_lock
from robot_server.hardware import get_hardware
from robot_server.service.legacy.models import V1BasicResponse
from robot_server.service.legacy.models import control

router = APIRouter()


@router.post(
    "/identify",
    summary="Blink the lights",
    description="Blink the gantry lights so you can pick it out of a crowd",
)
async def post_identify(
    seconds: Annotated[int, Query(..., description="Time to blink the lights for")],
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
) -> V1BasicResponse:
    identify = hardware.identify
    asyncio.ensure_future(identify(seconds))
    return V1BasicResponse(message="identifying")


@router.get(
    "/robot/positions",
    summary="Get robot positions",
    description=(
        "Get a list of useful positions."
        "\n\n"
        "**Deprecated:** This data only makes sense for OT-2 robots, not Flex robots."
        " There is currently no public way to get these positions for Flex robots."
    ),
    response_model=control.RobotPositionsResponse,
    deprecated=True,
)
async def get_robot_positions() -> control.RobotPositionsResponse:
    """
    Positions determined experimentally by issuing move commands. Change
    pipette position offsets the mount to the left or right such that a user
    can easily access the pipette mount screws with a screwdriver. Attach tip
    position places either pipette roughly in the front-center of the deck area
    """
    robot_positions = control.RobotPositions(
        change_pipette=control.ChangePipette(
            target=control.MotionTarget.mount, left=[300, 40, 30], right=[95, 40, 30]
        ),
        attach_tip=control.AttachTip(
            target=control.MotionTarget.pipette, point=[200, 90, 150]
        ),
    )
    return control.RobotPositionsResponse(positions=robot_positions)


@router.post(
    path="/robot/move",
    summary="Move the robot",
    description=(
        "Move the robot's gantry to a position (usually to a "
        "position retrieved from `GET /robot/positions`)."
        "\n\n"
        "**Deprecated:**"
        " Run a `moveToCoordinates` command in a maintenance run instead."
        " See the `/maintenance_runs` endpoints."
    ),
    response_model=V1BasicResponse,
    responses={
        status.HTTP_403_FORBIDDEN: {"model": LegacyErrorResponse},
    },
    deprecated=True,
)
async def post_move_robot(
    robot_move_target: control.RobotMoveTarget,
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
    motion_lock: Annotated[ThreadedAsyncLock, Depends(get_motion_lock)],
) -> V1BasicResponse:
    """Move the robot"""
    try:
        async with motion_lock.forbid():
            pos = await _do_move(hardware=hardware, robot_move_target=robot_move_target)
            return V1BasicResponse(message=f"Move complete. New position: {pos}")
    except ThreadedAsyncForbidden as e:
        raise LegacyErrorResponse.from_exc(e).as_error(status.HTTP_403_FORBIDDEN)


@router.post(
    path="/robot/home",
    summary="Home the robot",
    description="Home the robot.",
    response_model=V1BasicResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": LegacyErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": LegacyErrorResponse},
    },
)
async def post_home_robot(
    robot_home_target: control.RobotHomeTarget,
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
    motion_lock: Annotated[ThreadedAsyncLock, Depends(get_motion_lock)],
) -> V1BasicResponse:
    """Home the robot or one of the pipettes"""
    try:
        async with motion_lock.forbid():
            mount = robot_home_target.mount
            target = robot_home_target.target

            home = hardware.home
            home_plunger = hardware.home_plunger

            if target == control.HomeTarget.pipette and mount:
                await home([Axis.by_mount(Mount[mount.upper()])])
                await home_plunger(Mount[mount.upper()])
                message = f"Pipette on {mount} homed successfully"
            elif target == control.HomeTarget.robot:
                await home()
                message = "Homing robot."
            else:
                raise LegacyErrorResponse(
                    message=f"{target} is invalid",
                    errorCode=ErrorCodes.INVALID_ACTUATOR.value.code,
                ).as_error(status.HTTP_400_BAD_REQUEST)

            return V1BasicResponse(message=message)
    except ThreadedAsyncForbidden as e:
        raise LegacyErrorResponse.from_exc(e).as_error(status.HTTP_403_FORBIDDEN)


@router.get(
    "/robot/lights",
    summary="Get whether the lights are on",
    description="Get the current status of the robot's rail lights",
    response_model=control.RobotLightState,
)
async def get_robot_light_state(
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
) -> control.RobotLightState:
    light_state = await hardware.get_lights()
    return control.RobotLightState(on=light_state.get("rails", False))


@router.post(
    "/robot/lights",
    summary="Turn the lights on or off",
    description="Turn the rail lights on or off",
    response_model=control.RobotLightState,
)
async def post_robot_light_state(
    robot_light_state: control.RobotLightState,
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
) -> control.RobotLightState:
    await hardware.set_lights(rails=robot_light_state.on)
    return robot_light_state


async def _do_move(
    hardware: HardwareControlAPI, robot_move_target: control.RobotMoveTarget
) -> Point:
    """Perform the move"""

    await hardware.cache_instruments()

    critical_point = None
    if robot_move_target.target == control.MotionTarget.mount:
        critical_point = CriticalPoint.MOUNT

    mount = Mount[robot_move_target.mount.upper()]
    target_pos = Point(*robot_move_target.point)

    # Reset z position
    await hardware.home_z()

    pos = await hardware.gantry_position(mount, critical_point=critical_point)
    # Move to requested x, y and current z position
    await hardware.move_to(
        mount,
        Point(x=target_pos.x, y=target_pos.y, z=pos.z),
        critical_point=critical_point,
    )
    # Move to requested z position
    await hardware.move_to(mount, target_pos, critical_point=critical_point)
    return await hardware.gantry_position(mount)
