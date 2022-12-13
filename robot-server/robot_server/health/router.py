"""HTTP routes and handlers for /health endpoints."""
from fastapi import APIRouter, Depends, status

from opentrons import __version__, config, protocol_api
from opentrons.hardware_control import HardwareControlAPI

from robot_server.hardware import get_hardware
from robot_server.persistence import get_sql_engine
from robot_server.service.legacy.models import V1BasicResponse
from .models import Health, HealthLinks


LOG_PATHS = ["/logs/serial.log", "/logs/api.log", "/logs/server.log"]


health_router = APIRouter()


@health_router.get(
    path="/health",
    summary="Get server health",
    status_code=status.HTTP_200_OK,
    response_model=Health,
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": V1BasicResponse,
            "description": "Robot motor controller is not ready",
        }
    },
)
async def get_health(
    hardware: HardwareControlAPI = Depends(get_hardware),
    # This endpoint doesn't actually need sql_engine. We require it to artificially
    # fail requests until the database has finished initializing. This plays into the
    # Opentrons App's current error handling. With a non-healthy /health, the app will
    # block off most of its robot details UI. This prevents the user from trying things
    # like viewing runs and uploading protocols, which would hit "database not ready"
    # errors that would present in a confusing way.
    sql_engine: object = Depends(get_sql_engine),
) -> Health:
    """Get information about the health of the robot server.

    Use the health endpoint to check that the robot server is running
    and ready to operate. A 200 OK response means the server is running.
    The response includes information about the software and system.
    """
    return Health(
        name=config.name(),
        api_version=__version__,
        fw_version=hardware.fw_version,
        board_revision=hardware.board_revision,
        logs=LOG_PATHS,
        system_version=config.OT_SYSTEM_VERSION,
        maximum_protocol_api_version=list(protocol_api.MAX_SUPPORTED_VERSION),
        minimum_protocol_api_version=list(protocol_api.MIN_SUPPORTED_VERSION),
        robot_model=(
            "OT-3 Standard"
            if config.feature_flags.enable_ot3_hardware_controller()
            else "OT-2 Standard"
        ),
        links=HealthLinks(
            apiLog="/logs/api.log",
            serialLog="/logs/serial.log",
            serverLog="/logs/server.log",
            apiSpec="/openapi.json",
            systemTime="/system/time",
        ),
    )
