"""Read relevant protocol information from a set of files."""
from pathlib import Path
from typing import List, Optional, Sequence

from .input_file import AbstractInputFile
from .file_reader_writer import FileReaderWriter, FileReadError
from .role_analyzer import RoleAnalyzer, RoleAnalysisFile, RoleAnalysisError
from .config_analyzer import ConfigAnalyzer, ConfigAnalysisError
from .protocol_source import ProtocolSource, ProtocolSourceFile

from opentrons_shared_data.protocol.models import ProtocolSchemaV6


class ProtocolFilesInvalidError(ValueError):
    """An error raised if the input files cannot be read to a protocol."""


class ProtocolReader:
    """Collaborator to turn a set of files into a protocol object."""

    def __init__(
        self,
        file_reader_writer: Optional[FileReaderWriter] = None,
        role_analyzer: Optional[RoleAnalyzer] = None,
        config_analyzer: Optional[ConfigAnalyzer] = None,
    ) -> None:
        """Initialize the reader with its dependencies.

        Arguments:
            directory: The directory into which files will be copied.
            file_reader_writer: Input file reader/writer. Default impl. used if None.
            role_analyzer: File role analyzer. Default impl. used if None.
            config_analyzer: Protocol config analyzer. Default impl. used if None.
        """
        self._file_reader_writer = file_reader_writer or FileReaderWriter()
        self._role_analyzer = role_analyzer or RoleAnalyzer()
        self._config_analyzer = config_analyzer or ConfigAnalyzer()

    async def read_and_save(
        self, files: Sequence[AbstractInputFile], directory: Path
    ) -> ProtocolSource:
        """Compute a `ProtocolSource` from file-like objects and save them as files.

        Arguments:
            files: List of files-like objects. Do not attempt to reuse any objects
                objects in this list once they've been passed to the ProtocolReader.
            directory: Name of the directory to create and place files in.

        Returns:
            A validated ProtocolSource.

        Raises:
            ProtocolFilesInvalidError: Input file list given to the reader
                could not be validated as a protocol.
        """
        try:
            buffered_files = await self._file_reader_writer.read(files)
            role_analysis = self._role_analyzer.analyze(buffered_files)
            # TODO (tz, 8-30-22): check protocol version against max supported version
            if isinstance(role_analysis.main_file.data, ProtocolSchemaV6):
                self._validate_json_protocol(role_analysis.main_file.data)
            config_analysis = self._config_analyzer.analyze(role_analysis.main_file)
        except (FileReadError, RoleAnalysisError, ConfigAnalysisError) as e:
            raise ProtocolFilesInvalidError(str(e)) from e

        # TODO(mc, 2021-12-07): add support for other files, like arbitrary data files
        all_files: List[RoleAnalysisFile] = [
            role_analysis.main_file,
            *role_analysis.labware_files,
        ]

        await self._file_reader_writer.write(directory=directory, files=all_files)
        main_file = directory / role_analysis.main_file.name
        output_files = [
            ProtocolSourceFile(path=directory / f.name, role=f.role) for f in all_files
        ]

        return ProtocolSource(
            directory=directory,
            main_file=main_file,
            files=output_files,
            config=config_analysis.config,
            metadata=config_analysis.metadata,
            labware_definitions=role_analysis.labware_definitions,
        )

    async def read_saved(
        self,
        files: Sequence[Path],
        directory: Optional[Path],
    ) -> ProtocolSource:
        """Compute a `ProtocolSource` from protocol source files on the filesystem.

        Arguments:
            files: The files comprising the protocol.
            directory: Passed through to `ProtocolSource.directory`. Otherwise unused.

        Returns:
            A validated ProtocolSource.

        Raises:
            ProtocolFilesInvalidError: Input file list given to the reader
                could not be validated as a protocol.
        """
        try:
            buffered_files = await self._file_reader_writer.read(files)
            role_analysis = self._role_analyzer.analyze(buffered_files)
            config_analysis = self._config_analyzer.analyze(role_analysis.main_file)
        except (FileReadError, RoleAnalysisError, ConfigAnalysisError) as e:
            raise ProtocolFilesInvalidError(str(e)) from e

        # TODO(mc, 2021-12-07): add support for other files, like arbitrary data files
        all_files: List[RoleAnalysisFile] = [
            role_analysis.main_file,
            *role_analysis.labware_files,
        ]

        # TODO(mc, 2022-04-01): these asserts are a bit awkward,
        # consider restructuring so they're not needed
        assert isinstance(role_analysis.main_file.path, Path)
        assert all(isinstance(f.path, Path) for f in all_files)

        main_file = role_analysis.main_file.path
        output_files = [
            ProtocolSourceFile(path=f.path, role=f.role)  # type: ignore[arg-type]
            for f in all_files
        ]

        return ProtocolSource(
            directory=directory,
            main_file=main_file,
            files=output_files,
            config=config_analysis.config,
            metadata=config_analysis.metadata,
            labware_definitions=role_analysis.labware_definitions,
        )

    @staticmethod
    def _validate_json_protocol(protocol: ProtocolSchemaV6) -> ProtocolSchemaV6:
        """Validate json v6 protocol mapping constraints."""
        if not list(
            command
            for command in protocol.commands
            if command.params.pipetteId
            and command.params.pipetteId in set(protocol.pipettes.keys())
        ):
            raise ProtocolFilesInvalidError(
                "missing loadPipette id in referencing parent data model."
            )
        elif not list(
            command
            for command in protocol.commands
            if command.params.labwareId
            and command.params.labwareId in set(protocol.labware.keys())
        ):
            raise ProtocolFilesInvalidError(
                "missing loadLabware id in referencing parent data model."
            )
        elif protocol.liquids and not list(
            command
            for command in protocol.commands
            if command.params.liquidId
            and command.params.liquidId in set(protocol.liquids.keys())
        ):
            raise ProtocolFilesInvalidError(
                "missing loadLiquid id in referencing parent data model."
            )
        elif protocol.modules and not list(
            command
            for command in protocol.commands
            if command.params.moduleId
            and command.params.moduleId in set(protocol.modules.keys())
        ):
            raise ProtocolFilesInvalidError(
                "missing loadLiquid id in referencing parent data model."
            )
        return protocol
