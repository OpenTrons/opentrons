"""Main FastAPI application."""
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from opentrons import __version__

from .errors import exception_handlers
from .hardware import initialize_hardware, cleanup_hardware
from .router import router
from .service import initialize_logging
from .settings import get_settings

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
    exception_handlers=exception_handlers,
)

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
    # Load settings and (throw away the result) so that we detect errors early
    # on in startup, instead of the first time someone happens to use a setting.
    get_settings()

    initialize_logging()
    initialize_hardware(app.state)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Handle app shutdown."""
    shutdown_results = await asyncio.gather(
        cleanup_hardware(app.state),
        return_exceptions=True,
    )

    shutdown_errors = [r for r in shutdown_results if isinstance(r, BaseException)]

    for e in shutdown_errors:
        log.warning("Error during shutdown", exc_info=e)
