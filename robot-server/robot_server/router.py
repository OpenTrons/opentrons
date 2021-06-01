"""Application routes."""
from fastapi import APIRouter, status

from opentrons.config.feature_flags import enable_protocol_engine

from .constants import V1_TAG
from .errors import LegacyErrorResponse
from .health import health_router
from .sessions import sessions_router
from .system import system_router
from .service.legacy.routers import legacy_routes
from .service.session.router import router as deprecated_session_router
from .service.pipette_offset.router import router as pip_os_router
from .service.labware.router import router as labware_router
from .service.protocol.router import router as protocol_router
from .service.tip_length.router import router as tl_router
from .service.notifications.router import router as notifications_router

router = APIRouter()

# Legacy routes
router.include_router(
    router=legacy_routes,
    tags=[V1_TAG],
    responses={
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "model": LegacyErrorResponse,
        }
    },
)

router.include_router(
    router=health_router,
    tags=["Health", V1_TAG],
    responses={
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "model": LegacyErrorResponse,
        }
    },
)


router.include_router(
    router=sessions_router if enable_protocol_engine() else deprecated_session_router,
    tags=["Session Management"],
)

router.include_router(
    router=labware_router,
    tags=["Labware Calibration Management"],
)

router.include_router(
    router=protocol_router,
    tags=["Protocol Management"],
)

router.include_router(
    router=pip_os_router,
    tags=["Pipette Offset Calibration Management"],
)

router.include_router(
    router=tl_router,
    tags=["Tip Length Calibration Management"],
)

router.include_router(
    router=notifications_router,
    tags=["Notification Server Management"],
)

router.include_router(
    router=system_router,
    tags=["System Control"],
)
