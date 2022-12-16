"""Input file role analysis."""
from dataclasses import dataclass
from typing import List, Optional, Sequence, Union
from typing_extensions import Literal

from opentrons_shared_data.protocol.models import ProtocolSchemaV6
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons.protocols.models import JsonProtocol as LegacyProtocolSchema
from .protocol_source import ProtocolFileRole
from .file_reader_writer import BufferedFile


@dataclass(frozen=True)
class RoleAnalysisFile(BufferedFile):
    """A buffered file with its role analyzed."""

    role: ProtocolFileRole


@dataclass(frozen=True)
class MainFile(RoleAnalysisFile):
    """A protocol's main file, either Python or JSON."""

    data: Optional[Union[LegacyProtocolSchema, ProtocolSchemaV6]] = None
    role: Literal[ProtocolFileRole.MAIN] = ProtocolFileRole.MAIN


@dataclass(frozen=True)
class LabwareFile(RoleAnalysisFile):
    """A custom labware file."""

    data: LabwareDefinition
    role: Literal[ProtocolFileRole.LABWARE] = ProtocolFileRole.LABWARE


@dataclass(frozen=True)
class DataFile(RoleAnalysisFile):
    """An arbitrary data file."""

    role: Literal[ProtocolFileRole.DATA] = ProtocolFileRole.DATA


# TODO(mc, 2021-12-07): add support for python support files and data files
@dataclass(frozen=True)
class RoleAnalysis:
    """Role analysis results."""

    main_file: MainFile
    labware_files: List[LabwareFile]
    labware_definitions: List[LabwareDefinition]
    data_files: List[DataFile]


class RoleAnalysisError(ValueError):
    """Error raised if the input file list is invalid."""


class RoleAnalyzer:
    """Input file role analysis interface."""

    @staticmethod  # noqa: C901
    def analyze(files: Sequence[BufferedFile]) -> RoleAnalysis:
        """Analyze a set of input files to determine each of their roles."""
        if len(files) == 0:
            raise RoleAnalysisError("No files were provided.")

        main_file_candidates = []
        labware_files = []
        bundled_data_files = []

        for f in files:
            filename = f.name.lower()
            if filename.endswith(".py") or isinstance(
                f.data, (LegacyProtocolSchema, ProtocolSchemaV6)
            ):
                data = (
                    f.data
                    if isinstance(f.data, (LegacyProtocolSchema, ProtocolSchemaV6))
                    else None
                )
                main_file_candidates.append(
                    MainFile(name=f.name, contents=f.contents, data=data, path=f.path)
                )

            elif isinstance(f.data, LabwareDefinition):
                labware_files.append(
                    LabwareFile(
                        name=f.name, contents=f.contents, data=f.data, path=f.path
                    )
                )
            elif filename.endswith(".txt") or filename.endswith(".csv"):
                bundled_data_files.append(
                    DataFile(name=f.name, contents=f.contents, data=f.data, path=f.path)
                )

        if len(main_file_candidates) == 0:
            if len(files) == 1:
                raise RoleAnalysisError(
                    f'"{files[0].name}" is not a valid protocol file.'
                )
            else:
                file_list = ", ".join(f'"{f.name}"' for f in files)
                raise RoleAnalysisError(f"No valid protocol file found in {file_list}.")

        elif len(main_file_candidates) > 1:
            file_list = ", ".join(f'"{f.name}"' for f in main_file_candidates)
            raise RoleAnalysisError(
                f"Could not pick single main file from {file_list}."
            )
        else:
            main_file = main_file_candidates[0]

        # ignore extra custom labware files for JSON protocols, while
        # maintaining a reference to the protocol's labware
        if isinstance(main_file.data, (LegacyProtocolSchema, ProtocolSchemaV6)):
            labware_files = []
            labware_definitions = list(main_file.data.labwareDefinitions.values())
        else:
            labware_definitions = [f.data for f in labware_files]

        return RoleAnalysis(
            main_file=main_file,
            labware_files=labware_files,
            labware_definitions=labware_definitions,
            data_files=bundled_data_files,
        )
