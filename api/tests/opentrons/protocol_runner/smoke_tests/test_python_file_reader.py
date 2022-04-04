"""Tests for the Python protocol reading."""
from inspect import Signature, Parameter, signature
from pathlib import Path

from opentrons.protocol_api_experimental import ProtocolContext
from opentrons.protocol_reader import ProtocolReader
from opentrons.protocol_runner.python_file_reader import PythonFileReader


async def test_read_gets_run_method(python_protocol_file: Path) -> None:
    """It should pull the run method out of the Python file."""
    protocol_reader = ProtocolReader()
    protocol_source = await protocol_reader.read([python_protocol_file])

    subject = PythonFileReader()
    result = subject.read(protocol_source)

    assert signature(result.run) == Signature(
        parameters=[
            Parameter(
                name="context",
                kind=Parameter.POSITIONAL_OR_KEYWORD,
                annotation=ProtocolContext,
            )
        ],
        return_annotation=None,
    )
