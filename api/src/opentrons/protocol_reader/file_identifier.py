"""File identifier interface."""

import json
from dataclasses import dataclass
from typing import Any, Dict, Sequence, Union, Optional

import anyio

from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.errors.exceptions import EnumeratedError, PythonException

from opentrons.protocols.api_support.definitions import MAX_SUPPORTED_VERSION
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols import parse
from opentrons.protocols.types import MalformedPythonProtocolError, PythonProtocol

from .file_reader_writer import BufferedFile
from .protocol_files_invalid_error import ProtocolFilesInvalidError
from .protocol_source import Metadata


JsonDict = Dict[str, Any]


@dataclass(frozen=True)
class IdentifiedJsonMain:
    """A file identified as a JSON protocol's main .json file."""

    original_file: BufferedFile
    """The original file that this was identified from."""

    unvalidated_json: JsonDict
    """The parsed JSON contents.

    Believed, but not confirmed at this point, to conform to one of our JSON protocol
    schemas.
    """

    schema_version: int
    """The JSON protocol schema that this file is believed to conform to."""

    robot_type: RobotType
    """The type of robot on which this protocol is meant to run."""

    metadata: Metadata
    """The protocol metadata extracted from this file."""


@dataclass(frozen=True)
class IdentifiedPythonMain:
    """A file identified as a Python protocol's main .py file."""

    original_file: BufferedFile
    """The original file that this was identified from."""

    api_level: APIVersion
    """The Python Protocol API apiLevel declared by the Python source."""

    robot_type: RobotType
    """The type of robot on which this protocol is meant to run."""

    metadata: Metadata
    """The protocol metadata extracted from this file."""


@dataclass(frozen=True)
class IdentifiedLabwareDefinition:
    """A file identified as a labware definition."""

    original_file: BufferedFile
    """The original file that this was identified from."""

    unvalidated_json: JsonDict
    """The parsed JSON contents.

    Believed, but not confirmed at this point, to conform to our labware definition
    schema v2.
    """


@dataclass(frozen=True)
class IdentifiedData:
    """A file identified as a user-defined data file."""

    original_file: BufferedFile
    """The original file that this was identified from."""


IdentifiedFile = Union[
    IdentifiedJsonMain,
    IdentifiedPythonMain,
    IdentifiedLabwareDefinition,
    IdentifiedData,
]


class FileIdentificationError(ProtocolFilesInvalidError):
    """Raised when FileIdentifier detects an invalid file."""

    def __init__(
        self,
        message: str,
        detail: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
        only_message: bool = False,
    ) -> None:
        super().__init__(message=message)
        self._only_message = only_message

    def __str__(self) -> str:
        """Special stringifier to conform to expecations about python protocol errors."""
        if self._only_message:
            return self.message
        else:
            return super().__str__()


class FileIdentifier:
    """File identifier interface."""

    @staticmethod
    async def identify(
        files: Sequence[BufferedFile], python_parse_mode: parse.PythonParseMode
    ) -> Sequence[IdentifiedFile]:
        """Identify the type and extract basic information from each file.

        This is intended to take ≲1 second per protocol on an OT-2, so it can extract
        basic information about all stored protocols relatively quickly. Fully parsing
        and validating protocols can take 10-100x longer, so that's left to other units,
        for only when it's really needed.
        """
        return [await _identify(file, python_parse_mode) for file in files]


async def _identify(
    file: BufferedFile, python_parse_mode: parse.PythonParseMode
) -> IdentifiedFile:
    lower_file_name = file.name.lower()
    if lower_file_name.endswith(".json"):
        return await _analyze_json(json_file=file)
    elif lower_file_name.endswith(".py"):
        return _analyze_python_protocol(
            py_file=file, python_parse_mode=python_parse_mode
        )
    elif lower_file_name.endswith(".csv") or lower_file_name.endswith(".txt"):
        return IdentifiedData(original_file=file)
    else:
        raise FileIdentificationError(
            message=f"{file.name} has an unrecognized file extension.",
            detail={"type": "bad-file-extension", "file": file.name},
        )


async def _analyze_json(
    json_file: BufferedFile,
) -> Union[IdentifiedJsonMain, IdentifiedLabwareDefinition]:
    try:
        json_contents = await anyio.to_thread.run_sync(json.loads, json_file.contents)
    except json.JSONDecodeError as e:
        raise FileIdentificationError(
            message=f"{json_file.name} is not valid JSON. {str(e)}",
            detail={"type": "invalid-json", "file": json_file.name},
            wrapping=[PythonException(e)],
        ) from e

    if _json_seems_like_labware(json_contents):
        return IdentifiedLabwareDefinition(
            original_file=json_file,
            unvalidated_json=json_contents,
        )
    elif _json_seems_like_protocol(json_contents):
        return _analyze_json_protocol(
            original_file=json_file,
            json_contents=json_contents,
        )
    else:
        raise FileIdentificationError(
            message=f"{json_file.name} is not a known Opentrons format.",
            detail={"type": "no-schema-match", "file": json_file.name},
        )


def _json_seems_like_labware(json: JsonDict) -> bool:
    # "ordering" and "wells" are required properties in our labware schema v2.
    return "ordering" in json and "wells" in json


def _json_seems_like_protocol(json: JsonDict) -> bool:
    # "schemaVersion" and "commands" are required properties in all of our JSON
    # protocol schemas since schema v3. (v7 is the latest at the time of writing.)
    #
    # When we stop supporting v3 files, we can look at "$otSharedSchema" instead,
    # which is more precise.
    return "schemaVersion" in json and "commands" in json


def _analyze_json_protocol(
    original_file: BufferedFile, json_contents: JsonDict
) -> IdentifiedJsonMain:
    error_message = f"{original_file.name} is not a valid JSON protocol."

    try:
        metadata = json_contents["metadata"]
        schema_version = json_contents["schemaVersion"]
        robot_type = json_contents["robot"]["model"]
    except KeyError as e:
        raise FileIdentificationError(
            message=error_message,
            detail={"kind": "missing-json-metadata", "missing-key": str(e)},
            wrapping=[PythonException(e)],
        ) from e

    # todo(mm, 2022-12-22): A JSON protocol file's metadata is not quite just an
    # arbitrary dict: its fields are supposed to follow a schema. Should we validate
    # this metadata against that schema instead of doing this simple isinstance() check?
    if not isinstance(metadata, dict):
        raise FileIdentificationError(
            message=error_message, detail={"kind": "json-metadata-not-object"}
        )

    if not isinstance(schema_version, int):
        raise FileIdentificationError(
            message=error_message,
            detail={
                "kind": "json-schema-version-not-int",
                "schema-version": schema_version,
            },
        )

    if robot_type not in ("OT-2 Standard", "OT-3 Standard"):
        raise FileIdentificationError(
            message=error_message,
            detail={"kind": "bad-json-protocol-robot-type", "robot-type": robot_type},
        )

    return IdentifiedJsonMain(
        original_file=original_file,
        unvalidated_json=json_contents,
        schema_version=schema_version,
        robot_type=robot_type,
        metadata=metadata,
    )


def _analyze_python_protocol(
    py_file: BufferedFile,
    python_parse_mode: parse.PythonParseMode,
) -> IdentifiedPythonMain:
    try:
        parsed = parse.parse(
            protocol_file=py_file.contents,
            filename=py_file.name,
            python_parse_mode=python_parse_mode,
        )
    except MalformedPythonProtocolError as e:
        raise FileIdentificationError(
            message=e.short_message,
            detail={"kind": "malformed-python-protocol"},
            wrapping=[PythonException(e)],
            only_message=True,
        ) from e

    # We know this should never be a JsonProtocol. Help out the type-checker.
    assert isinstance(
        parsed, PythonProtocol
    ), "Parsing a Python file returned something other than a Python protocol."

    if parsed.api_level > MAX_SUPPORTED_VERSION and not parsed.api_level.experimental:
        raise FileIdentificationError(
            message=(
                f"API version {parsed.api_level} is not supported by this "
                f"robot software. Please either reduce your requested API "
                f"version or update your robot."
            ),
            detail={"kind": "future-api-version", "api-version": str(parsed.api_level)},
            only_message=True,
        )

    return IdentifiedPythonMain(
        original_file=py_file,
        metadata=parsed.metadata or {},
        robot_type=parsed.robot_type,
        api_level=parsed.api_level,
    )
