"""FastAPI dependencies for the `/labwareOffsets` endpoints."""


from typing import Annotated

from fastapi import Depends

from server_utils.fastapi_utils.app_state import (
    AppState,
    AppStateAccessor,
    get_app_state,
)
import sqlalchemy

from robot_server.persistence.fastapi_dependencies import get_sql_engine
from robot_server.service.notifications.publishers.labware_offsets_publisher import (
    LabwareOffsetsPublisher,
    get_labware_offsets_publisher,
)
from .store import LabwareOffsetStore


_labware_offset_store_accessor = AppStateAccessor[LabwareOffsetStore](
    "labware_offset_store"
)


async def get_labware_offset_store(
    app_state: Annotated[AppState, Depends(get_app_state)],
    sql_engine: Annotated[sqlalchemy.engine.Engine, Depends(get_sql_engine)],
    labware_offsets_publisher: Annotated[
        LabwareOffsetsPublisher, Depends(get_labware_offsets_publisher)
    ],
) -> LabwareOffsetStore:
    """Get the server's singleton LabwareOffsetStore."""
    labware_offset_store = _labware_offset_store_accessor.get_from(app_state)
    if labware_offset_store is None:
        labware_offset_store = LabwareOffsetStore(sql_engine, labware_offsets_publisher)
        _labware_offset_store_accessor.set_on(app_state, labware_offset_store)
    return labware_offset_store
