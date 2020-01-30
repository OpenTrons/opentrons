from opentrons import __version__
from fastapi import FastAPI
from .routers import health, networking


app = FastAPI(
    title="Opentrons OT-2 HTTP API Spec",
    description="This OpenAPI spec describes the HTTP API of the Opentrons OT-2. It may be retrieved from a robot on "
                "port 31950 at /openapi. Some schemas used in requests and responses use the `x-patternProperties` "
                "key to mean the JSON Schema `patternProperties` behavior.",
    version=__version__
)


app.include_router(router=health.router,
                   tags=["health"])
app.include_router(router=networking.router,
                   tags=["networking"])