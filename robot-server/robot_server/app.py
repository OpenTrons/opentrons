"""Main FastAPI application."""
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response
from starlette.requests import Request
from starlette.middleware.base import RequestResponseEndpoint

from opentrons import __version__

from .router import router
from .errors import exception_handlers
from .hardware import initialize_hardware, cleanup_hardware
from .service import initialize_logging
from .service.dependencies import get_protocol_manager
from .service.legacy.rpc import cleanup_rpc_server
from . import constants

log = logging.getLogger(__name__)


app = FastAPI(
    title="Opentrons OT-2 HTTP API Spec",
    description=(
        "This OpenAPI spec describes the HTTP API of the Opentrons "
        "OT-2. It may be retrieved from a robot on port 31950 at "
        "/openapi. Some schemas used in requests and responses use "
        "the `x-patternProperties` key to mean the JSON Schema "
        "`patternProperties` behavior."
    ),
    version=__version__,
)

# exception handlers
# TODO(mc, 2021-05-10): after upgrade to FastAPI > 0.61.2, we can pass these
# to FastAPI's `exception_handlers` arg instead. Current version has bug, see:
# https://github.com/tiangolo/fastapi/pull/1924
for exc_cls, handler in exception_handlers.items():
    app.add_exception_handler(exc_cls, handler)

# cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=("*"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# main router
app.include_router(router=router)


@app.on_event("startup")
async def on_startup() -> None:
    """Handle app startup."""
    initialize_logging()
    initialize_hardware(app.state)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Handle app shutdown."""
    protocol_manager = await get_protocol_manager()
    protocol_manager.remove_all()

    shutdown_results = await asyncio.gather(
        cleanup_rpc_server(app.state),
        cleanup_hardware(app.state),
        return_exceptions=True,
    )

    shutdown_errors = [r for r in shutdown_results if isinstance(r, BaseException)]

    for e in shutdown_errors:
        log.warning("Error during shutdown", exc_info=e)


@app.middleware("http")
async def api_version_response_header(
    request: Request,
    call_next: RequestResponseEndpoint,
) -> Response:
    """Attach Opentrons-Version headers to responses."""
    # Attach the version the request state. Optional dependency
    #  check_version_header will override this value if check passes.
    request.state.api_version = constants.API_VERSION

    response: Response = await call_next(request)

    # Put the api version in the response header
    response.headers[constants.API_VERSION_HEADER] = str(request.state.api_version)
    response.headers[constants.MIN_API_VERSION_HEADER] = str(constants.MIN_API_VERSION)
    return response
