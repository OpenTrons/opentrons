"""Tests for the ProtocolReader interface."""
from __future__ import annotations

import pytest
import io
from dataclasses import dataclass
from decoy import Decoy, matchers
from pathlib import Path
from typing import IO, Optional

from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.models import LabwareDefinition

from opentrons.protocol_reader import (
    ProtocolReader,
    ProtocolSource,
    ProtocolSourceFile,
    ProtocolFileRole,
    PythonProtocolConfig,
    ProtocolFilesInvalidError,
)

from opentrons.protocol_reader.input_file import AbstractInputFile
from opentrons.protocol_reader.file_reader_writer import (
    FileReaderWriter,
    FileReadError,
    BufferedFile,
)
from opentrons.protocol_reader.role_analyzer import (
    RoleAnalyzer,
    RoleAnalysis,
    RoleAnalysisError,
)
from opentrons.protocol_reader.basic_info_extractor import (
    BasicInfoExtractor,
    FileInfo,
    PythonProtocolFileInfo,
    LabwareDefinitionFileInfo,
)
from opentrons.protocol_reader.file_format_validator import FileFormatValidator


@dataclass(frozen=True)
class InputFile(AbstractInputFile):
    """Concrete input file data model."""

    filename: str
    file: IO[bytes]

    @classmethod
    def make(cls, filename: str, contents: bytes) -> InputFile:
        return cls(filename=filename, file=io.BytesIO(contents))


@pytest.fixture
def file_reader_writer(decoy: Decoy) -> FileReaderWriter:
    """Get a mocked out FileReaderWriter."""
    return decoy.mock(cls=FileReaderWriter)


@pytest.fixture
def basic_info_extractor(decoy: Decoy) -> BasicInfoExtractor:
    """Get a mocked out BasicInfoExtractor."""
    return decoy.mock(cls=BasicInfoExtractor)


@pytest.fixture
def role_analyzer(decoy: Decoy) -> RoleAnalyzer:
    """Get a mocked out RoleAnalyzer."""
    return decoy.mock(cls=RoleAnalyzer)


@pytest.fixture
def file_format_validator(decoy: Decoy) -> FileFormatValidator:
    """Get a mocked out FileFormatValidator."""
    return decoy.mock(cls=FileFormatValidator)


@pytest.fixture
def subject(
    file_reader_writer: FileReaderWriter,
    role_analyzer: RoleAnalyzer,
    basic_info_extractor: BasicInfoExtractor,
    file_format_validator: FileFormatValidator,
) -> ProtocolReader:
    """Create a ProtocolReader test subject."""
    return ProtocolReader(
        file_reader_writer=file_reader_writer,
        role_analyzer=role_analyzer,
        basic_info_extractor=basic_info_extractor,
        file_format_validator=file_format_validator,
    )


async def test_read_and_save(
    decoy: Decoy,
    tmp_path: Path,
    file_reader_writer: FileReaderWriter,
    basic_info_extractor: BasicInfoExtractor,
    role_analyzer: RoleAnalyzer,
    file_format_validator: FileFormatValidator,
    subject: ProtocolReader,
) -> None:
    """It should read a single file protocol source."""
    input_main_file = InputFile.make(
        filename="protocol.py",
        contents=b"# hello world",
    )
    input_labware_file = InputFile.make(
        filename="labware.json",
        contents=b"wow",
    )

    buffered_main_file = BufferedFile(
        name="protocol.py",
        contents=b"# hello world",
        path=None,
    )
    buffered_labware_file = BufferedFile(
        name="labware.json",
        contents=b"wow",
        path=None,
    )

    main_file = PythonProtocolFileInfo(
        original_file=buffered_main_file,
        api_level=APIVersion(123, 456),
        metadata={"hey": "there"},
    )
    labware_file = LabwareDefinitionFileInfo(
        original_file=buffered_labware_file,
        unvalidated_json={},
    )

    role_analysis = RoleAnalysis(
        main_file=main_file,
        labware_files=[labware_file],
    )

    decoy.when(
        await file_reader_writer.read([input_main_file, input_labware_file])
    ).then_return([buffered_main_file, buffered_labware_file])
    decoy.when(
        await basic_info_extractor.extract([buffered_main_file, buffered_labware_file])
    ).then_return([main_file, labware_file])
    decoy.when(role_analyzer.analyze([main_file, labware_file])).then_return(
        role_analysis
    )

    result = await subject.read_and_save(
        files=[input_main_file, input_labware_file], directory=tmp_path
    )

    assert result == ProtocolSource(
        directory=tmp_path,
        main_file=tmp_path / "protocol.py",
        files=[
            ProtocolSourceFile(
                path=tmp_path / "protocol.py",
                role=ProtocolFileRole.MAIN,
            ),
            ProtocolSourceFile(
                path=tmp_path / "labware.json",
                role=ProtocolFileRole.LABWARE,
            ),
        ],
        metadata={"hey": "there"},
        config=PythonProtocolConfig(api_version=APIVersion(123, 456)),
    )

    decoy.verify(
        await file_format_validator.validate([main_file, labware_file]),
        await file_reader_writer.write(
            directory=tmp_path,
            files=[buffered_main_file, buffered_labware_file],
        ),
    )


# async def test_read_error(
#     decoy: Decoy,
#     tmp_path: Path,
#     file_reader_writer: FileReaderWriter,
#     subject: ProtocolReader,
# ) -> None:
#     """It should catch read/parse errors."""
#     input_file = InputFile.make(
#         filename="protocol.py",
#         contents=b"# hello world",
#     )

#     decoy.when(await file_reader_writer.read([input_file])).then_raise(
#         FileReadError("oh no")
#     )

#     with pytest.raises(ProtocolFilesInvalidError, match="oh no"):
#         await subject.read_and_save(directory=tmp_path, files=[input_file])


# async def test_role_error(
#     decoy: Decoy,
#     tmp_path: Path,
#     file_reader_writer: FileReaderWriter,
#     role_analyzer: RoleAnalyzer,
#     subject: ProtocolReader,
# ) -> None:
#     """It should catch role analysis errors."""
#     input_file = InputFile.make(
#         filename="protocol.py",
#         contents=b"# hello world",
#     )
#     buffered_file = BufferedFile(
#         name="protocol.py",
#         contents=b"# hello world",
#         data=None,
#         path=None,
#     )

#     decoy.when(await file_reader_writer.read([input_file])).then_return([buffered_file])
#     decoy.when(role_analyzer.analyze([buffered_file])).then_raise(
#         RoleAnalysisError("oh no")
#     )

#     with pytest.raises(ProtocolFilesInvalidError, match="oh no"):
#         await subject.read_and_save(directory=tmp_path, files=[input_file])


# async def test_config_error(
#     decoy: Decoy,
#     tmp_path: Path,
#     file_reader_writer: FileReaderWriter,
#     role_analyzer: RoleAnalyzer,
#     basic_info_extractor: BasicInfoExtractor,
#     subject: ProtocolReader,
# ) -> None:
#     """It should catch config analysis errors."""
#     input_file = InputFile.make(
#         filename="protocol.py",
#         contents=b"# hello world",
#     )
#     buffered_file = BufferedFile(
#         name="protocol.py",
#         contents=b"# hello world",
#         data=None,
#         path=None,
#     )
#     main_file = MainFile(
#         name="protocol.py",
#         contents=b"# hello world",
#         path=None,
#     )
#     analyzed_roles = RoleAnalysis(
#         main_file=main_file,
#         labware_files=[],
#     )

#     decoy.when(await file_reader_writer.read([input_file])).then_return([buffered_file])
#     decoy.when(role_analyzer.analyze([buffered_file])).then_return(analyzed_roles)
#     decoy.when(basic_info_extractor.analyze(main_file)).then_raise(
#         ConfigAnalysisError("oh no")
#     )

#     with pytest.raises(ProtocolFilesInvalidError, match="oh no"):
#         await subject.read_and_save(directory=tmp_path, files=[input_file])


@pytest.mark.parametrize("directory", [None, Path("/some/dir")])
@pytest.mark.parametrize(
    "files_are_prevalidated, validator_expected_times_called", [(True, 0), (False, 1)]
)
async def test_read_saved(
    decoy: Decoy,
    directory: Optional[Path],
    files_are_prevalidated: bool,
    validator_expected_times_called: int,
    file_reader_writer: FileReaderWriter,
    basic_info_extractor: BasicInfoExtractor,
    role_analyzer: RoleAnalyzer,
    file_format_validator: FileFormatValidator,
    subject: ProtocolReader,
) -> None:
    """It should read a single file protocol source without copying elsewhere."""
    input_main_file = InputFile.make(
        filename="protocol.py",
        contents=b"# hello world",
    )
    input_labware_file = InputFile.make(
        filename="labware.json",
        contents=b"wow",
    )

    buffered_main_file = BufferedFile(
        name="protocol.py",
        contents=b"# hello world",
        path=Path("/path/to/protocol.py"),
    )
    buffered_labware_file = BufferedFile(
        name="labware.json",
        contents=b"wow",
        path=Path("/path/to/labware.json"),
    )

    main_file = PythonProtocolFileInfo(
        original_file=buffered_main_file,
        api_level=APIVersion(123, 456),
        metadata={"hey": "there"},
    )
    labware_file = LabwareDefinitionFileInfo(
        original_file=buffered_labware_file,
        unvalidated_json={},
    )

    role_analysis = RoleAnalysis(
        main_file=main_file,
        labware_files=[labware_file],
    )

    decoy.when(
        await file_reader_writer.read([input_main_file, input_labware_file])
    ).then_return([buffered_main_file, buffered_labware_file])
    decoy.when(
        await basic_info_extractor.extract([buffered_main_file, buffered_labware_file])
    ).then_return([main_file, labware_file])
    decoy.when(role_analyzer.analyze([main_file, labware_file])).then_return(
        role_analysis
    )

    result = await subject.read_saved(
        files=[input_main_file, input_labware_file], directory=directory, files_are_prevalidated=files_are_prevalidated
    )

    assert result == ProtocolSource(
        directory=directory,
        main_file=Path("/path/to/protocol.py"),
        files=[
            ProtocolSourceFile(
                path=Path("/path/to/protocol.py"),
                role=ProtocolFileRole.MAIN,
            ),
            ProtocolSourceFile(
                path=Path("/path/to/labware.json"),
                role=ProtocolFileRole.LABWARE,
            ),
        ],
        metadata={"hey": "there"},
        config=PythonProtocolConfig(api_version=APIVersion(123, 456)),
    )

    decoy.verify(
        await file_reader_writer.write(
            directory=matchers.Anything(),
            files=matchers.Anything(),
        ),
        times=0,
    )

    decoy.verify(
        await file_format_validator.validate([main_file, labware_file]), times=validator_expected_times_called
    )
