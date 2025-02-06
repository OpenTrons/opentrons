"""FastAPI endpoint functions for the `/labwareOffsets` endpoints."""

from datetime import datetime
import textwrap
from typing import Annotated, Literal

import fastapi
from pydantic import Json
from pydantic.json_schema import SkipJsonSchema
from server_utils.fastapi_utils.light_router import LightRouter

from opentrons.protocol_engine import ModuleModel

from robot_server.labware_offsets.models import LabwareOffsetNotFound
from robot_server.service.dependencies import get_current_time, get_unique_id
from robot_server.service.json_api.request import RequestModel
from robot_server.service.json_api.response import (
    MultiBodyMeta,
    PydanticResponse,
    SimpleBody,
    SimpleEmptyBody,
    SimpleMultiBody,
)

from .store import (
    LabwareOffsetNotFoundError,
    LabwareOffsetStore,
    IncomingStoredLabwareOffset,
)
from .fastapi_dependencies import get_labware_offset_store
from .models import (
    StoredLabwareOffset,
    StoredLabwareOffsetCreate,
    DO_NOT_FILTER,
    DoNotFilterType,
)


router = LightRouter()


@PydanticResponse.wrap_route(
    router.post,
    path="/labwareOffsets",
    summary="Store a labware offset",
    description=textwrap.dedent(
        """\
        Store a labware offset for later retrieval through `GET /labwareOffsets`.

        On its own, this does not affect robot motion.
        To do that, you must add the offset to a run, through the `/runs` endpoints.
        """
    ),
    status_code=201,
    include_in_schema=False,  # todo(mm, 2025-01-08): Include for v8.4.0.
)
async def post_labware_offset(  # noqa: D103
    store: Annotated[LabwareOffsetStore, fastapi.Depends(get_labware_offset_store)],
    new_offset_id: Annotated[str, fastapi.Depends(get_unique_id)],
    new_offset_created_at: Annotated[datetime, fastapi.Depends(get_current_time)],
    request_body: Annotated[RequestModel[StoredLabwareOffsetCreate], fastapi.Body()],
) -> PydanticResponse[SimpleBody[StoredLabwareOffset]]:
    new_offset = IncomingStoredLabwareOffset(
        id=new_offset_id,
        createdAt=new_offset_created_at,
        definitionUri=request_body.data.definitionUri,
        locationSequence=request_body.data.locationSequence,
        vector=request_body.data.vector,
    )
    store.add(new_offset)
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(
            data=StoredLabwareOffset(
                id=new_offset_id,
                createdAt=new_offset_created_at,
                definitionUri=request_body.data.definitionUri,
                locationSequence=request_body.data.locationSequence,
                vector=request_body.data.vector,
            )
        ),
        status_code=201,
    )


@PydanticResponse.wrap_route(
    router.get,
    path="/labwareOffsets",
    summary="Search for labware offsets",
    description=(
        "Get a filtered list of all the labware offsets currently stored on the robot."
        " Filters are ANDed together."
        " Results are returned in order from oldest to newest."
    ),
    include_in_schema=False,  # todo(mm, 2025-01-08): Include for v8.4.0.
)
async def get_labware_offsets(  # noqa: D103
    store: Annotated[LabwareOffsetStore, fastapi.Depends(get_labware_offset_store)],
    id: Annotated[
        Json[str] | SkipJsonSchema[DoNotFilterType],
        fastapi.Query(description="Filter for exact matches on the `id` field."),
    ] = DO_NOT_FILTER,
    definition_uri: Annotated[
        Json[str] | SkipJsonSchema[DoNotFilterType],
        fastapi.Query(
            alias="definitionUri",
            description=(
                "Filter for exact matches on the `definitionUri` field."
                " (Not to be confused with `location.definitionUri`.)"
            ),
        ),
    ] = DO_NOT_FILTER,
    location_addressable_area_name: Annotated[
        Json[str] | SkipJsonSchema[DoNotFilterType],
        fastapi.Query(
            alias="locationSlotName",
            description="Filter for exact matches on the `location.slotName` field.",
        ),
    ] = DO_NOT_FILTER,
    location_module_model: Annotated[
        Json[ModuleModel | None] | SkipJsonSchema[DoNotFilterType],
        fastapi.Query(
            alias="locationModuleModel",
            description="Filter for exact matches on the `location.moduleModel` field.",
        ),
    ] = DO_NOT_FILTER,
    location_definition_uri: Annotated[
        Json[str | None] | SkipJsonSchema[DoNotFilterType],
        fastapi.Query(
            alias="locationDefinitionUri",
            description=(
                "Filter for exact matches on the `location.definitionUri` field."
                " (Not to be confused with just `definitionUri`.)"
            ),
        ),
    ] = DO_NOT_FILTER,
    cursor: Annotated[
        int | SkipJsonSchema[None],
        fastapi.Query(
            description=(
                "The first index to return out of the overall filtered result list."
                " If unspecified, defaults to returning `pageLength` elements from"
                " the end of the list."
            )
        ),
    ] = None,
    page_length: Annotated[
        int | Literal["unlimited"],
        fastapi.Query(
            alias="pageLength", description="The maximum number of entries to return."
        ),
    ] = "unlimited",
) -> PydanticResponse[SimpleMultiBody[StoredLabwareOffset]]:
    if cursor not in (0, None) or page_length != "unlimited":
        # todo(mm, 2024-12-06): Support this when LabwareOffsetStore supports it.
        raise NotImplementedError(
            "Pagination not currently supported on this endpoint."
        )

    result_data = store.search(
        id_filter=id,
        definition_uri_filter=definition_uri,
        location_addressable_area_filter=location_addressable_area_name,
        location_definition_uri_filter=location_definition_uri,
        location_module_model_filter=location_module_model,
    )

    meta = MultiBodyMeta.model_construct(
        # todo(mm, 2024-12-06): Update this when pagination is supported.
        cursor=0,
        totalLength=len(result_data),
    )

    return await PydanticResponse.create(
        SimpleMultiBody[StoredLabwareOffset].model_construct(
            data=result_data,
            meta=meta,
        )
    )


@PydanticResponse.wrap_route(
    router.delete,
    path="/labwareOffsets/{id}",
    summary="Delete a single labware offset",
    description="Delete a single labware offset. The deleted offset is returned.",
    include_in_schema=False,  # todo(mm, 2025-01-08): Include for v8.4.0.
)
async def delete_labware_offset(  # noqa: D103
    store: Annotated[LabwareOffsetStore, fastapi.Depends(get_labware_offset_store)],
    id: Annotated[
        str,
        fastapi.Path(description="The `id` field of the offset to delete."),
    ],
) -> PydanticResponse[SimpleBody[StoredLabwareOffset]]:
    try:
        deleted_offset = store.delete(offset_id=id)
    except LabwareOffsetNotFoundError as e:
        raise LabwareOffsetNotFound.build(bad_offset_id=e.bad_offset_id).as_error(404)
    else:
        return await PydanticResponse.create(
            SimpleBody.model_construct(data=deleted_offset)
        )


@PydanticResponse.wrap_route(
    router.delete,
    path="/labwareOffsets",
    summary="Delete all labware offsets",
    include_in_schema=False,  # todo(mm, 2025-01-08): Include for v8.4.0.
)
async def delete_all_labware_offsets(  # noqa: D103
    store: Annotated[LabwareOffsetStore, fastapi.Depends(get_labware_offset_store)],
) -> PydanticResponse[SimpleEmptyBody]:
    store.delete_all()
    return await PydanticResponse.create(SimpleEmptyBody.model_construct())
