"""Router for /protocols endpoints."""
import logging
import textwrap
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile, status, Form
from typing import List, Optional
from typing_extensions import Literal

from opentrons.protocol_reader import ProtocolReader, ProtocolFilesInvalidError

from robot_server.errors import ErrorDetails, ErrorBody
from robot_server.service.task_runner import TaskRunner
from robot_server.service.dependencies import get_unique_id, get_current_time
from robot_server.service.json_api import (
    SimpleBody,
    SimpleMultiBody,
    SimpleEmptyBody,
    MultiBodyMeta,
    PydanticResponse,
)

from .protocol_models import Protocol, ProtocolFile, Metadata
from .protocol_analyzer import ProtocolAnalyzer
from .analysis_store import AnalysisStore
from .analysis_models import ProtocolAnalysis
from .protocol_store import ProtocolStore, ProtocolResource, ProtocolNotFoundError
from .dependencies import (
    get_protocol_reader,
    get_protocol_store,
    get_analysis_store,
    get_protocol_analyzer,
    get_protocol_directory,
)


log = logging.getLogger(__name__)


class ProtocolNotFound(ErrorDetails):
    """An error returned when a given protocol cannot be found."""

    id: Literal["ProtocolNotFound"] = "ProtocolNotFound"
    title: str = "Protocol Not Found"


class ProtocolFilesInvalid(ErrorDetails):
    """An error returned when an uploaded protocol files are invalid."""

    id: Literal["ProtocolFilesInvalid"] = "ProtocolFilesInvalid"
    title: str = "Protocol File(s) Invalid"


protocols_router = APIRouter()


@protocols_router.post(
    path="/protocols",
    summary="Upload a protocol",
    description=textwrap.dedent(
        """
        Upload a protocol to your device. You may include the following files:

        - A single Python protocol file and 0 or more custom labware JSON files
        - A single JSON protocol file (any additional labware files will be ignored)
        """
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[Protocol]},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "model": ErrorBody[ProtocolFilesInvalid]
        },
    },
)
async def create_protocol(
    files: List[UploadFile] = File(...),
    # use Form because request is multipart/form-data
    # https://fastapi.tiangolo.com/tutorial/request-forms-and-files/
    key: Optional[str] = Form(None),
    protocol_directory: Path = Depends(get_protocol_directory),
    protocol_store: ProtocolStore = Depends(get_protocol_store),
    analysis_store: AnalysisStore = Depends(get_analysis_store),
    protocol_reader: ProtocolReader = Depends(get_protocol_reader),
    protocol_analyzer: ProtocolAnalyzer = Depends(get_protocol_analyzer),
    task_runner: TaskRunner = Depends(TaskRunner),
    protocol_id: str = Depends(get_unique_id, use_cache=False),
    analysis_id: str = Depends(get_unique_id, use_cache=False),
    created_at: datetime = Depends(get_current_time),
) -> PydanticResponse[SimpleBody[Protocol]]:
    """Create a new protocol by uploading its files.

    Arguments:
        files: List of uploaded files, from form-data.
        key: Optional key for client-side tracking
        protocol_directory: Location to store uploaded files.
        protocol_store: In-memory database of protocol resources.
        analysis_store: In-memory database of protocol analyses.
        protocol_reader: Protocol file reading interface.
        protocol_analyzer: Protocol analysis interface.
        task_runner: Background task runner.
        protocol_id: Unique identifier to attach to the protocol resource.
        analysis_id: Unique identifier to attach to the analysis resource.
        created_at: Timestamp to attach to the new resource.
    """
    try:
        source = await protocol_reader.read_and_save(
            files=files,
            directory=protocol_directory / protocol_id,
        )
    except ProtocolFilesInvalidError as e:
        raise ProtocolFilesInvalid(detail=str(e)).as_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY
        )

    protocol_resource = ProtocolResource(
        protocol_id=protocol_id,
        created_at=created_at,
        source=source,
        protocol_key=key,
    )

    protocol_store.insert(protocol_resource)

    task_runner.run(
        protocol_analyzer.analyze,
        protocol_resource=protocol_resource,
        analysis_id=analysis_id,
    )
    pending_analysis = analysis_store.add_pending(
        protocol_id=protocol_id,
        analysis_id=analysis_id,
    )

    data = Protocol(
        id=protocol_id,
        createdAt=created_at,
        protocolType=source.config.protocol_type,
        metadata=Metadata.parse_obj(source.metadata),
        analysisSummaries=[pending_analysis],
        key=key,
        files=[ProtocolFile(name=f.path.name, role=f.role) for f in source.files],
    )

    log.info(f'Created protocol "{protocol_id}" and started analysis "{analysis_id}".')

    return await PydanticResponse.create(
        content=SimpleBody.construct(data=data),
        status_code=status.HTTP_201_CREATED,
    )


@protocols_router.get(
    path="/protocols",
    summary="Get uploaded protocols",
    responses={status.HTTP_200_OK: {"model": SimpleMultiBody[Protocol]}},
)
async def get_protocols(
    protocol_store: ProtocolStore = Depends(get_protocol_store),
    analysis_store: AnalysisStore = Depends(get_analysis_store),
) -> PydanticResponse[SimpleMultiBody[Protocol]]:
    """Get a list of all currently uploaded protocols.

    Args:
        protocol_store: In-memory database of protocol resources.
        analysis_store: In-memory database of protocol analyses.
    """
    protocol_resources = protocol_store.get_all()
    data = [
        Protocol(
            id=r.protocol_id,
            createdAt=r.created_at,
            protocolType=r.source.config.protocol_type,
            metadata=Metadata.parse_obj(r.source.metadata),
            analysisSummaries=analysis_store.get_summaries_by_protocol(r.protocol_id),
            key=r.protocol_key,
            files=[ProtocolFile(name=f.path.name, role=f.role) for f in r.source.files],
        )
        for r in protocol_resources
    ]
    meta = MultiBodyMeta(cursor=0, totalLength=len(data))

    return await PydanticResponse.create(
        content=SimpleMultiBody.construct(data=data, meta=meta),
        status_code=status.HTTP_200_OK,
    )


@protocols_router.get(
    path="/protocols/{protocolId}",
    summary="Get an uploaded protocol",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[Protocol]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[ProtocolNotFound]},
    },
)
async def get_protocol_by_id(
    protocolId: str,
    protocol_store: ProtocolStore = Depends(get_protocol_store),
    analysis_store: AnalysisStore = Depends(get_analysis_store),
) -> PydanticResponse[SimpleBody[Protocol]]:
    """Get an uploaded protocol by ID.

    Args:
        protocolId: Protocol identifier to fetch, pulled from URL.
        protocol_store: In-memory database of protocol resources.
        analysis_store: In-memory database of protocol analyses.
    """
    try:
        resource = protocol_store.get(protocol_id=protocolId)
    except ProtocolNotFoundError as e:
        raise ProtocolNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    analyses = analysis_store.get_summaries_by_protocol(protocol_id=protocolId)

    data = Protocol.construct(
        id=protocolId,
        createdAt=resource.created_at,
        protocolType=resource.source.config.protocol_type,
        metadata=Metadata.parse_obj(resource.source.metadata),
        analysisSummaries=analyses,
        key=resource.protocol_key,
        files=[
            ProtocolFile(name=f.path.name, role=f.role) for f in resource.source.files
        ],
    )

    return await PydanticResponse.create(
        content=SimpleBody.construct(data=data),
        status_code=status.HTTP_200_OK,
    )


@protocols_router.delete(
    path="/protocols/{protocolId}",
    summary="Delete an uploaded protocol",
    responses={
        status.HTTP_200_OK: {"model": SimpleEmptyBody},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[ProtocolNotFound]},
    },
)
async def delete_protocol_by_id(
    protocolId: str,
    protocol_store: ProtocolStore = Depends(get_protocol_store),
) -> PydanticResponse[SimpleEmptyBody]:
    """Delete an uploaded protocol by ID.

    Arguments:
        protocolId: Protocol identifier to delete, pulled from URL.
        protocol_store: In-memory database of protocol resources.
    """
    try:
        protocol_store.remove(protocol_id=protocolId)

    except ProtocolNotFoundError as e:
        raise ProtocolNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    return await PydanticResponse.create(
        content=SimpleEmptyBody.construct(),
        status_code=status.HTTP_200_OK,
    )


@protocols_router.get(
    path="/protocols/{protocolId}/analyses",
    summary="Get a protocol's analyses",
    responses={
        status.HTTP_200_OK: {"model": SimpleMultiBody[ProtocolAnalysis]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[ProtocolNotFound]},
    },
)
async def get_protocol_analyses(
    protocolId: str,
    protocol_store: ProtocolStore = Depends(get_protocol_store),
    analysis_store: AnalysisStore = Depends(get_analysis_store),
) -> PydanticResponse[SimpleMultiBody[ProtocolAnalysis]]:
    """Get a protocol's full analyses list.

    Arguments:
        protocolId: Protocol identifier to delete, pulled from URL.
        protocol_store: Database of protocol resources.
        analysis_store: Database of analysis resources.
    """
    if not protocol_store.has(protocolId):
        raise ProtocolNotFound(detail=f"Protocol {protocolId} not found").as_error(
            status.HTTP_404_NOT_FOUND
        )

    analyses = analysis_store.get_by_protocol(protocolId)

    return await PydanticResponse.create(
        content=SimpleMultiBody.construct(
            data=analyses,
            meta=MultiBodyMeta(cursor=0, totalLength=len(analyses)),
        )
    )
