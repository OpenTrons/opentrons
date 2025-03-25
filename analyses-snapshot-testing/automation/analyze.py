# /// script
# requires-python = "==3.10.*"
# dependencies = [
#     "opentrons @ /root/github/opentrons2/api",
#     "opentrons-shared-data @ /root/github/opentrons2/shared-data/python",
#     "rich",
# ]
# ///


import asyncio
import io
import json
import random
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import dataclass
from pathlib import Path
from typing import Any, List

import anyio

# Import the internal async analysis function and the _Output class.
from opentrons.cli.analyze import _analyze, _Output  # type: ignore[import-not-found]

# Imports for pretty printing with Rich.
from rich import print as rprint
from rich.panel import Panel
from rich.progress import Progress

# Constants
CUSTOM_LABWARE_DIR = Path(__file__).parent.parent / "labware"
ANALYSIS_TIMEOUT = 60  # Timeout per protocol in seconds

custom_labware_files = list(CUSTOM_LABWARE_DIR.glob("*.json"))


@dataclass
class AnalysisResult:
    """Dataclass to hold the analysis result."""

    protocol_file: Path
    result: dict[str, Any] | str
    logs: str = ""


def run_analyze_in_thread(files: List[Path], rtp_values: str, rtp_files: str, check: bool) -> tuple[int, dict[str, Any], str]:
    """
    Run _analyze in its own event loop in this thread.
    This helper creates its own BytesIO stream for JSON output, traps any print output,
    runs _analyze, then reads and returns the exit code, JSON result, and captured logs.
    """
    # Capture prints that _analyze might do.
    captured_output = io.StringIO()
    json_output_stream = io.BytesIO()
    outputs = [_Output(to_file=json_output_stream, kind="json")]

    with redirect_stdout(captured_output), redirect_stderr(captured_output):
        exit_code = asyncio.run(_analyze(files, rtp_values, rtp_files, outputs, check))

    # Get the JSON output.
    json_output_stream.seek(0)
    json_bytes = json_output_stream.read()
    try:
        json_str = json_bytes.decode("utf-8")
        result_json = json.loads(json_str)
    except Exception:
        result_json = {"error": "Failed to decode JSON output"}
    # Get the captured print output.
    log_output = captured_output.getvalue()
    return exit_code, result_json, log_output


async def run_analysis(
    file: Path,
    rtp_values: str = "{}",
    rtp_files: str = "{}",
    check: bool = False,
) -> AnalysisResult:
    """
    Run protocol analysis programmatically and return the analysis results as in-memory JSON.

    This function analyzes a given protocol file in conjunction with custom labware files.
    It traps printed output from _analyze and returns that as well.

    Args:
        file: The protocol file to analyze.
        rtp_values: JSON string mapping runtime parameter variable names to values.
        rtp_files: JSON string mapping runtime parameter variable names to file paths.
        check: If True, returns a non-zero exit code if the analysis encountered errors.

    Returns:
        An AnalysisResult containing the protocol file, a dictionary with the analysis result,
        and any captured log output.
    """
    protocol_file = file
    files = custom_labware_files + [protocol_file]

    try:
        # Run the analysis in a separate thread and enforce a timeout.
        async with anyio.fail_after(ANALYSIS_TIMEOUT):  # type: ignore
            exit_code, result_json, log_output = await anyio.to_thread.run_sync(run_analyze_in_thread, files, rtp_values, rtp_files, check)
    except TimeoutError:
        result_json = {"error": f"Analysis timed out after {ANALYSIS_TIMEOUT} seconds"}
        return AnalysisResult(protocol_file=protocol_file, result=result_json, logs="")
    except Exception as e:
        result_json = {"error": f"Analysis failed with error: {str(e)}"}
        return AnalysisResult(protocol_file=protocol_file, result=result_json, logs="")

    return AnalysisResult(protocol_file=protocol_file, result=result_json, logs=log_output)


async def main() -> None:  # noqa: C901
    current_dir = Path(__file__).parent
    protocol_files = [
        file
        for file in (list(current_dir.glob("*.py")) + list(current_dir.glob("*.json")))
        if "Overrides" not in file.name and "_X_" not in file.name
    ]
    ignored_files = [
        "Flex_S_v2_15_P1000_96_GRIP_HS_MB_TC_TM_IDTXgen96Part1to3.py",
        "Flex_S_v2_15_P1000_96_GRIP_HS_MB_TC_TM_IlluminaDNAPrep96PART3.py",
        "pl_sample_dilution_with_96_channel_pipette.py",
        "pl_langone_ribo_pt1_ramp.py",
    ]
    protocol_files = [file for file in protocol_files if file.name not in ignored_files]

    # Select 10 random protocol files.
    protocol_files = random.sample(protocol_files, 10)
    results: List[AnalysisResult] = []

    # Create a Rich progress bar.
    with Progress() as progress:
        task_id = progress.add_task("[cyan]Processing protocols...", total=len(protocol_files))

        async def run_and_collect(file: Path) -> None:
            try:
                result = await run_analysis(file)
            except Exception as e:
                result = AnalysisResult(protocol_file=file, result={"error": str(e)}, logs="")
            results.append(result)
            progress.advance(task_id)

        async with anyio.create_task_group() as tg:
            for file in protocol_files:
                tg.start_soon(run_and_collect, file)

    rprint(Panel("[bold cyan]All Protocol Analyses Completed[/bold cyan]"))
    for result in results:
        rprint(f"\n[bold blue]Protocol: {result.protocol_file.name}[/bold blue]")
        if isinstance(result.result, str):
            rprint(Panel(f"[bold red]Error: {result.result}[/bold red]"))
        elif isinstance(result.result, dict):
            status = result.result.get("result", "Unknown status")
            color = "green" if status == "ok" else "red"
            rprint(Panel(f"[bold {color}]Status: {status}[/bold {color}]"))

            # Look for errors or warnings in the result
            if "errors" in result.result and result.result["errors"]:
                rprint("[bold red]Errors:[/bold red]")
                for error in result.result["errors"]:
                    rprint(f"  - {error}")
            if "warnings" in result.result and result.result["warnings"]:
                rprint("[bold yellow]Warnings:[/bold yellow]")
                for warning in result.result["warnings"]:
                    rprint(f"  - {warning}")

        # Optionally, also print the captured log output
        # if result.logs:
        #     rprint(Panel(f"[dim]{result.logs}[/dim]", title="Captured Logs"))


if __name__ == "__main__":
    anyio.run(main)
