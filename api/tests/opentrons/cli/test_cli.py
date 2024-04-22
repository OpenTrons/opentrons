"""Test cli execution."""


import json
import tempfile
import textwrap

from dataclasses import dataclass, replace
from typing import Any, Dict, Iterator, List, Optional
from pathlib import Path

import pytest
from click.testing import CliRunner
from opentrons_shared_data.performance.dev_types import (
    RobotContextState,
)
from opentrons.util.performance_helpers import _get_robot_context_tracker


# Enable tracking for the RobotContextTracker
# This must come before the import of the analyze CLI
context_tracker = _get_robot_context_tracker()

# Ignore the type error for the next line, as we're setting a private attribute for testing purposes
context_tracker._should_track = True  # type: ignore[attr-defined]

from opentrons.cli.analyze import analyze  # noqa: E402


@pytest.fixture
def override_data_store(tmp_path: Path) -> Iterator[None]:
    """Override the data store metadata for the RobotContextTracker."""
    old_store = context_tracker._store  # type: ignore[attr-defined]
    old_metadata = old_store.metadata
    new_metadata = replace(old_metadata, storage_dir=tmp_path)
    context_tracker._store = old_store.__class__(metadata=new_metadata)  # type: ignore[attr-defined]
    context_tracker._store.setup()  # type: ignore[attr-defined]
    yield
    context_tracker._store = old_store  # type: ignore[attr-defined]


def _list_fixtures(version: int) -> Iterator[Path]:
    return Path(__file__).parent.glob(
        f"../../../../shared-data/protocol/fixtures/{version}/*.json"
    )


@dataclass
class _AnalysisCLIResult:
    exit_code: int
    json_output: Optional[Dict[str, Any]]
    stdout_stderr: str


def _get_analysis_result(protocol_files: List[Path]) -> _AnalysisCLIResult:
    """Run `protocol_files` as a single protocol through the analysis CLI.

    Returns:
        A tuple (exit_code, analysis_json_dict_or_none).

        Don't forget to check the status code. Errors from within the analysis CLI will otherwise
        not be propagated!
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        analysis_output_file = Path(temp_dir) / "analysis_output.json"
        runner = CliRunner()
        result = runner.invoke(
            analyze,
            [
                "--json-output",
                str(analysis_output_file),
                *[str(p.resolve()) for p in protocol_files],
            ],
        )
        if analysis_output_file.exists():
            json_output = json.loads(analysis_output_file.read_bytes())
        else:
            json_output = None
        return _AnalysisCLIResult(
            exit_code=result.exit_code,
            json_output=json_output,
            stdout_stderr=result.output,
        )


@pytest.mark.parametrize("fixture_path", _list_fixtures(6))
def test_analyze(
    fixture_path: Path,
) -> None:
    """Should return with no errors and a non-empty output."""
    result = _get_analysis_result([fixture_path])

    assert result.exit_code == 0

    assert result.json_output is not None
    assert "robotType" in result.json_output
    assert "pipettes" in result.json_output
    assert "commands" in result.json_output
    assert "labware" in result.json_output
    assert "liquids" in result.json_output
    assert "modules" in result.json_output


_DECK_DEFINITION_TEST_SLOT = 2
_DECK_DEFINITION_TEST_LABWARE = "agilent_1_reservoir_290ml"
_DECK_DEFINITION_TEST_WELL = "A1"


def _get_deck_definition_test_source(api_level: str, robot_type: str) -> str:
    return textwrap.dedent(
        f"""\
        requirements = {{
            "apiLevel": "{api_level}",
            "robotType": "{robot_type}",
        }}
        def run(protocol):
            labware = protocol.load_labware(
                "{_DECK_DEFINITION_TEST_LABWARE}",
                "{_DECK_DEFINITION_TEST_SLOT}",
            )
            test_point = labware["{_DECK_DEFINITION_TEST_WELL}"].top().point
            protocol.comment(str(test_point))
        """
    )


@pytest.mark.parametrize(
    ("api_level", "robot_type", "expected_point"),
    [
        # These expected_point values were copied from known-good analysis outputs.
        # The exact values don't matter much for this test, since we're not checking positional
        # accuracy here. They just need to be clearly different between the OT-2 and OT-3.
        ("2.13", "OT-2", "(196.38, 42.785, 44.04)"),
        ("2.15", "OT-2", "(196.38, 42.785, 44.04)"),
        pytest.param(
            "2.15",
            "OT-3",
            "(227.88, 42.785, 44.04)",
            marks=pytest.mark.ot3_only,  # Analyzing an OT-3 protocol requires an OT-3 hardware API.
        ),
    ],
)
def test_analysis_deck_definition(
    api_level: str,
    robot_type: str,
    expected_point: str,
    tmp_path: Path,
) -> None:
    """Test that the analysis uses the appropriate deck definition for the protocol's robot type.

    At the time of writing, the only official, public, documented way to observe the deck definition
    that a protocol uses is for the protocol to load a labware and inspect the deck coordinates of
    its wells.
    """
    protocol_source_file = Path(tmp_path) / "protocol.py"
    protocol_source_file.write_text(
        _get_deck_definition_test_source(
            api_level=api_level,
            robot_type=robot_type,
        ),
        encoding="utf-8",
    )

    result = _get_analysis_result([protocol_source_file])

    assert result.exit_code == 0

    assert result.json_output is not None
    [home_command, load_labware_command, comment_command] = result.json_output[
        "commands"
    ]

    # todo(mm, 2023-05-12): When protocols emit true Protocol Engine comment commands instead
    # of legacy commands, "legacyCommandText" should change to "message".
    assert comment_command["params"]["legacyCommandText"] == expected_point


# TODO(mm, 2023-08-12): We can remove this test when we remove special handling for these
# protocols. https://opentrons.atlassian.net/browse/RSS-306
def test_strict_metatada_requirements_validation(tmp_path: Path) -> None:
    """It should apply strict validation to the metadata and requirements dicts.

    It should reject protocols with questionable metadata and requirements dicts,
    even though these protocols may be accepted by other parts of the system.
    https://opentrons.atlassian.net/browse/RSS-306
    """
    protocol_source = textwrap.dedent(
        """
        # apiLevel in both metadata and requirements
        metadata = {"apiLevel": "2.15"}
        requirements = {"apiLevel": "2.15"}

        def run(protocol):
            pass
        """
    )

    protocol_source_file = tmp_path / "protocol.py"
    protocol_source_file.write_text(protocol_source, encoding="utf-8")

    result = _get_analysis_result([protocol_source_file])

    assert result.exit_code != 0

    expected_message = (
        "You may only put apiLevel in the metadata dict or the requirements dict"
    )
    assert expected_message in result.stdout_stderr


@pytest.mark.parametrize(
    ("python_protocol_source", "expected_detail"),
    [
        (
            textwrap.dedent(
                # Raises an exception from outside of Opentrons code,
                # in between two PAPI functions.
                """\
                requirements = {"apiLevel": "2.14"}  # line 1
                                                     # line 2
                def run(protocol):                   # line 3
                    protocol.comment(":^)")          # line 4
                    raise RuntimeError(">:(")        # line 5
                    protocol.comment(":D")           # line 6
                """
            ),
            "RuntimeError [line 5]: >:(",
        ),
        (
            textwrap.dedent(
                # Raises an exception from inside a Protocol Engine command.
                # https://opentrons.atlassian.net/browse/RSS-317
                """\
                requirements = {"apiLevel": "2.14"}      # line 1
                                                         # line 2
                def run(protocol):                       # line 3
                    tip_rack = protocol.load_labware(    # line 4
                        "opentrons_96_tiprack_300ul", 1  # line 5
                    )                                    # line 6
                    pipette = protocol.load_instrument(  # line 7
                        "p300_single", "left"            # line 8
                    )                                    # line 9
                    pipette.pick_up_tip(tip_rack["A1"])  # line 10
                    pipette.pick_up_tip(tip_rack["A2"])  # line 11
                """
            ),
            (
                # TODO(mm, 2023-09-12): This is an overly verbose concatenative Frankenstein
                # message. We should simplify our error propagation to trim out the noise.
                "ProtocolCommandFailedError [line 11]:"
                " Error 4000 GENERAL_ERROR (ProtocolCommandFailedError):"
                " TipAttachedError: Pipette should not have a tip attached, but does."
            ),
        ),
        # TODO: PAPIv<2.15?
    ],
)
def test_python_error_line_numbers(
    tmp_path: Path, python_protocol_source: str, expected_detail: str
) -> None:
    """Test that error messages from Python protocols have line numbers."""
    protocol_source_file = tmp_path / "protocol.py"
    protocol_source_file.write_text(python_protocol_source, encoding="utf-8")

    result = _get_analysis_result([protocol_source_file])

    assert result.exit_code == 0
    assert result.json_output is not None
    [error] = result.json_output["errors"]
    assert error["detail"] == expected_detail


@pytest.mark.usefixtures("override_data_store")
def test_track_analysis(tmp_path: Path) -> None:
    """Test that the RobotContextTracker tracks analysis."""
    protocol_source = textwrap.dedent(
        """
        requirements = {"apiLevel": "2.15"}

        def run(protocol):
            pass
        """
    )
    protocol_source_file = tmp_path / "protocol.py"
    protocol_source_file.write_text(protocol_source, encoding="utf-8")
    store = context_tracker._store  # type: ignore[attr-defined]

    num_storage_entities_before_analysis = len(store.data)

    _get_analysis_result([protocol_source_file])

    assert len(store.data) == num_storage_entities_before_analysis + 1

    with open(store.metadata.data_file_location, "r") as f:
        stored_data = f.readlines()
        assert len(stored_data) == 0

    context_tracker.store()

    with open(store.metadata.data_file_location, "r") as f:
        stored_data = f.readlines()
        assert len(stored_data) == 1
        state_id, start_time, duration = stored_data[0].strip().split(",")
        assert state_id == str(RobotContextState.ANALYZING_PROTOCOL.state_id)
        assert start_time.isdigit()
        assert duration.isdigit()
