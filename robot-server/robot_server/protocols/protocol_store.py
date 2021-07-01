"""Methods for saving and retrieving protocol files."""
from dataclasses import dataclass
from datetime import datetime
from fastapi import UploadFile
from logging import getLogger
from pathlib import Path
from typing import Dict, List, Sequence

from opentrons.file_runner import ProtocolFileType

log = getLogger(__name__)


@dataclass(frozen=True)
class ProtocolResource:
    """An entry in the session store, used to construct response models."""

    protocol_id: str
    protocol_type: ProtocolFileType
    created_at: datetime
    files: List[Path]


class ProtocolNotFoundError(KeyError):
    """Error raised when a protocol ID was not found in the store."""

    def __init__(self, protocol_id: str) -> None:
        """Initialize the error message from the missing ID."""
        super().__init__(f"Protocol {protocol_id} was not found.")


class ProtocolFileInvalidError(ValueError):
    """Error raised when a given source file is invalid.

    May be caused by an empty filename.
    """

    pass


class ProtocolStore:
    """Methods for storing and retrieving protocol files."""

    def __init__(self, directory: Path) -> None:
        """Initialize the ProtocolStore.

        Arguments:
            directory: Directory in which to place created files.
        """
        self._directory = directory
        self._protocols_by_id: Dict[str, ProtocolResource] = {}

    async def create(
        self,
        protocol_id: str,
        created_at: datetime,
        files: Sequence[UploadFile],
    ) -> ProtocolResource:
        """Add a protocol to the store."""
        protocol_dir = self._get_protocol_dir(protocol_id)
        # TODO(mc, 2021-06-02): check for protocol collision
        protocol_dir.mkdir(parents=True)
        saved_files = []

        for index, upload_file in enumerate(files):
            if upload_file.filename == "":
                raise ProtocolFileInvalidError(f"File {index} is missing a filename")

            contents = await upload_file.read()
            file_path = protocol_dir / upload_file.filename

            if isinstance(contents, str):
                file_path.write_text(contents, "utf-8")
            else:
                file_path.write_bytes(contents)

            saved_files.append(file_path)

        entry = ProtocolResource(
            protocol_id=protocol_id,
            protocol_type=self._get_protocol_type(saved_files),
            created_at=created_at,
            files=saved_files,
        )

        self._protocols_by_id[protocol_id] = entry

        return entry

    def get(self, protocol_id: str) -> ProtocolResource:
        """Get a single protocol by ID."""
        try:
            return self._protocols_by_id[protocol_id]
        except KeyError as e:
            raise ProtocolNotFoundError(protocol_id) from e

    def get_all(self) -> List[ProtocolResource]:
        """Get all protocols currently saved in this store."""
        return list(self._protocols_by_id.values())

    def remove(self, protocol_id: str) -> ProtocolResource:
        """Remove a protocol from the store."""
        try:
            entry = self._protocols_by_id.pop(protocol_id)
        except KeyError as e:
            raise ProtocolNotFoundError(protocol_id) from e

        try:
            for file_path in entry.files:
                file_path.unlink()
            self._get_protocol_dir(protocol_id).rmdir()
        except Exception as e:
            log.warning(
                f"Unable to delete all files for protocol {protocol_id}",
                exc_info=e,
            )

        return entry

    def _get_protocol_dir(self, protocol_id: str) -> Path:
        return self._directory / protocol_id

    # TODO(mc, 2021-06-01): add multi-file support and ditch all of this
    # logic in favor of whatever protocol analyzer we come up with
    @staticmethod
    def _get_protocol_type(files: List[Path]) -> ProtocolFileType:
        file_path = files[0]

        if file_path.suffix == ".json":
            return ProtocolFileType.JSON
        elif file_path.suffix == ".py":
            return ProtocolFileType.PYTHON
        else:
            raise NotImplementedError("Protocol type not yet supported")
