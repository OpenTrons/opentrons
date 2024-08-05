"""Router for /dataFiles endpoints."""
from datetime import datetime
from pathlib import Path
from textwrap import dedent
from typing import Optional, Literal, Union

from fastapi import APIRouter, UploadFile, File, Form, Depends, Response, status
from opentrons.protocol_reader import FileHasher, FileReaderWriter

from robot_server.service.json_api import (
    SimpleBody,
    SimpleMultiBody,
    PydanticResponse,
    MultiBodyMeta,
)
from robot_server.errors.error_responses import ErrorDetails, ErrorBody
from .dependencies import (
    get_data_files_directory,
    get_data_files_store,
    get_data_file_auto_deleter,
)
from .data_files_store import DataFilesStore, DataFileInfo
from .file_auto_deleter import DataFileAutoDeleter
from .models import DataFile, FileIdNotFoundError
from ..protocols.dependencies import get_file_hasher, get_file_reader_writer
from ..service.dependencies import get_current_time, get_unique_id

datafiles_router = APIRouter()


class MultipleDataFileSources(ErrorDetails):
    """An error returned when multiple data file sources are specified in one request."""

    id: Literal["MultipleDataFileSources"] = "MultipleDataFileSources"
    title: str = "Multiple sources found for data files"


class NoDataFileSourceProvided(ErrorDetails):
    """An error returned when no data file sources are specified in the request."""

    id: Literal["NoDataFileSourceProvided"] = "NoDataFileSourceProvided"
    title: str = "No data file source provided"


class FileNotFound(ErrorDetails):
    """An error returned when specified file path was not found on the robot."""

    id: Literal["FileNotFound"] = "FileNotFound"
    title: str = "Specified file path not found on the robot"


class FileIdNotFound(ErrorDetails):
    """An error returned when specified file id was not found on the robot."""

    id: Literal["FileIdNotFound"] = "FileIdNotFound"
    title: str = "Specified file id not found on the robot"


class UnexpectedFileFormat(ErrorDetails):
    """An error returned when specified file is not in expected format."""

    id: Literal["UnexpectedFileFormat"] = "UnexpectedFileFormat"
    title: str = "Unexpected file format"


@PydanticResponse.wrap_route(
    datafiles_router.post,
    path="/dataFiles",
    summary="Upload a data file",
    description=dedent(
        """
        Upload data file(s) to your device.
        """
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[DataFile]},
        status.HTTP_201_CREATED: {"model": SimpleBody[DataFile]},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "model": ErrorBody[
                Union[
                    MultipleDataFileSources,
                    NoDataFileSourceProvided,
                    UnexpectedFileFormat,
                ]
            ]
        },
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[FileNotFound]},
    },
)
async def upload_data_file(
    file: Optional[UploadFile] = File(default=None, description="Data file to upload"),
    file_path: Optional[str] = Form(
        default=None,
        description="Absolute path to a file on the robot.",
        alias="filePath",
    ),
    data_files_directory: Path = Depends(get_data_files_directory),
    data_files_store: DataFilesStore = Depends(get_data_files_store),
    data_file_auto_deleter: DataFileAutoDeleter = Depends(get_data_file_auto_deleter),
    file_reader_writer: FileReaderWriter = Depends(get_file_reader_writer),
    file_hasher: FileHasher = Depends(get_file_hasher),
    file_id: str = Depends(get_unique_id, use_cache=False),
    created_at: datetime = Depends(get_current_time),
) -> PydanticResponse[SimpleBody[DataFile]]:
    """Save the uploaded data file to persistent storage and update database."""
    if all([file, file_path]):
        raise MultipleDataFileSources(
            detail="Can accept either a file or a file path, not both."
        ).as_error(status.HTTP_422_UNPROCESSABLE_ENTITY)
    if file is None and file_path is None:
        raise NoDataFileSourceProvided(
            detail="You must provide either a file or a file_path in the request."
        ).as_error(status.HTTP_422_UNPROCESSABLE_ENTITY)
    try:
        [buffered_file] = await file_reader_writer.read(files=[file or Path(file_path)])  # type: ignore[arg-type, list-item]
    except FileNotFoundError as e:
        raise FileNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e
    # TODO (spp, 2024-06-18): probably also validate CSV file *contents*
    if not buffered_file.name.endswith(".csv"):
        raise UnexpectedFileFormat(detail="Only CSV file format is accepted.").as_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY
        )
    file_hash = await file_hasher.hash([buffered_file])
    existing_file_info = data_files_store.get_file_info_by_hash(file_hash)
    if existing_file_info:
        return await PydanticResponse.create(
            content=SimpleBody.construct(
                data=DataFile.construct(
                    id=existing_file_info.id,
                    name=existing_file_info.name,
                    createdAt=existing_file_info.created_at,
                )
            ),
            status_code=status.HTTP_200_OK,
        )

    await data_file_auto_deleter.make_room_for_new_file()
    await file_reader_writer.write(
        directory=data_files_directory / file_id, files=[buffered_file]
    )
    file_info = DataFileInfo(
        id=file_id,
        name=buffered_file.name,
        file_hash=file_hash,
        created_at=created_at,
    )
    await data_files_store.insert(file_info)
    return await PydanticResponse.create(
        content=SimpleBody.construct(
            data=DataFile.construct(
                id=file_info.id,
                name=file_info.name,
                createdAt=created_at,
            )
        ),
        status_code=status.HTTP_201_CREATED,
    )


@PydanticResponse.wrap_route(
    datafiles_router.get,
    path="/dataFiles/{dataFileId}",
    summary="Get information about an uploaded data file",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[DataFile]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[FileIdNotFound]},
    },
)
async def get_data_file_info_by_id(
    dataFileId: str,
    data_files_store: DataFilesStore = Depends(get_data_files_store),
) -> PydanticResponse[SimpleBody[DataFile]]:
    """Get data file info by ID.

    Args:
        dataFileId: Data file identifier to fetch.
        data_files_store: In-memory database of data file resources.
    """
    try:
        resource = data_files_store.get(dataFileId)
    except FileIdNotFoundError as e:
        raise FileIdNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    return await PydanticResponse.create(
        content=SimpleBody.construct(
            data=DataFile.construct(
                id=resource.id,
                name=resource.name,
                createdAt=resource.created_at,
            )
        ),
        status_code=status.HTTP_200_OK,
    )


@datafiles_router.get(
    path="/dataFiles/{dataFileId}/download",
    summary="Get an uploaded data file",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorBody[Union[FileIdNotFound, FileNotFound]]
        },
    },
)
async def get_data_file(
    dataFileId: str,
    data_files_directory: Path = Depends(get_data_files_directory),
    data_files_store: DataFilesStore = Depends(get_data_files_store),
    file_reader_writer: FileReaderWriter = Depends(get_file_reader_writer),
) -> Response:
    """Get the requested data file by id."""
    try:
        data_file_info = data_files_store.get(dataFileId)
    except FileIdNotFoundError as e:
        raise FileIdNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    try:
        [buffered_file] = await file_reader_writer.read(
            files=[data_files_directory / dataFileId / data_file_info.name]
        )
    except FileNotFoundError as e:
        raise FileNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e

    return Response(
        content=buffered_file.contents.decode("utf-8"),
        media_type="text/plain",
    )


@PydanticResponse.wrap_route(
    datafiles_router.get,
    path="/dataFiles",
    summary="Get a list of all data files stored on the robot server",
    responses={status.HTTP_200_OK: {"model": SimpleMultiBody[str]}},
)
async def get_all_data_files(
    data_files_store: DataFilesStore = Depends(get_data_files_store),
) -> PydanticResponse[SimpleMultiBody[DataFile]]:
    """Get a list of all data files stored on the robot server.

    Args:
        data_files_store: In-memory database of data file resources.
    """
    data_files = data_files_store.sql_get_all_from_engine()

    meta = MultiBodyMeta(cursor=0, totalLength=len(data_files))

    return await PydanticResponse.create(
        content=SimpleMultiBody.construct(
            data=[
                DataFile.construct(
                    id=data_file_info.id,
                    name=data_file_info.name,
                    createdAt=data_file_info.created_at,
                )
                for data_file_info in data_files
            ],
            meta=meta,
        ),
    )
