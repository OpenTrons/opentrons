"""Tests for opentrons.protocol_reader.role_analyzer.RoleAnalyzer."""
import pytest
from typing import List, NamedTuple

from opentrons.protocols.models import JsonProtocol
from opentrons.protocol_reader import ProtocolFileRole
from opentrons.protocol_reader.input_file import BufferedFile

from opentrons.protocol_reader.role_analyzer import (
    RoleAnalyzer,
    RoleAnalysis,
    RoleAnalyzedFile,
    RoleAnalysisError,
)


class RoleAnalyzerSpec(NamedTuple):
    """Spec data for a RoleAnalyzer test."""

    files: List[BufferedFile]
    expected: RoleAnalysis


class RoleAnalyzerErrorSpec(NamedTuple):
    """Spec data for a RoleAnalyzer test."""

    files: List[BufferedFile]
    expected_message: str


ROLE_ANALYZER_SPECS: List[RoleAnalyzerSpec] = [
    RoleAnalyzerSpec(
        files=[
            BufferedFile(name="protocol.py", contents=b"", data=None),
        ],
        expected=RoleAnalysis(
            main_file=RoleAnalyzedFile(
                name="protocol.py",
                contents=b"",
                data=None,
                role=ProtocolFileRole.MAIN,
            ),
        ),
    ),
    RoleAnalyzerSpec(
        files=[
            BufferedFile(
                name="protocol.json",
                contents=b"",
                data=JsonProtocol.construct(),  # type: ignore[call-arg]
            ),
        ],
        expected=RoleAnalysis(
            main_file=RoleAnalyzedFile(
                name="protocol.json",
                contents=b"",
                data=JsonProtocol.construct(),  # type: ignore[call-arg]
                role=ProtocolFileRole.MAIN,
            ),
        ),
    ),
]


ROLE_ANALYZER_ERROR_SPECS: List[RoleAnalyzerErrorSpec] = [
    RoleAnalyzerErrorSpec(
        files=[],
        expected_message="No files were provided.",
    ),
    RoleAnalyzerErrorSpec(
        files=[BufferedFile(name="foo.txt", contents=b"", data=None)],
        expected_message='"foo.txt" is not a valid protocol file.',
    ),
]


@pytest.mark.parametrize(RoleAnalyzerSpec._fields, ROLE_ANALYZER_SPECS)
def test_role_analyzer(files: List[BufferedFile], expected: RoleAnalysis) -> None:
    """It should analyze a file list properly."""
    subject = RoleAnalyzer()
    result = subject.analyze(files)

    assert result == expected


@pytest.mark.parametrize(RoleAnalyzerErrorSpec._fields, ROLE_ANALYZER_ERROR_SPECS)
def test_role_analyzer_error(files: List[BufferedFile], expected_message: str) -> None:
    """It should raise errors on invalid input lists."""
    subject = RoleAnalyzer()

    with pytest.raises(RoleAnalysisError, match=expected_message):
        subject.analyze(files)
