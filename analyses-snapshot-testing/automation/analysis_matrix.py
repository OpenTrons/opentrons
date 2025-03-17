import ast
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from citools.generate_analyses import TargetProtocol, generate_analyses_from_test
from packaging import version
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table

from automation.data.protocol import Protocol
from automation.data.protocol_registry import ProtocolRegistry

console = Console()

mapping = {
    "2.22": "8.3.0",
    "2.21": "8.2.0",
    "2.20": "8.0.0",
    "2.19": "7.3.1",
    "2.18": "7.3.0",
    "2.17": "7.2.0",
}

tags = [
    "v8.3.0",
    "v8.2.0",
    "v8.0.0",
    "v7.3.1",
    "v7.3.0",
    "v7.2.0",
]


def is_version_compatible(min_version: str, version_under_test: str) -> bool:
    """
    Check if the minimum version is less than or equal to the version under test.

    Args:
        min_version: The minimum version required.
        version_under_test: The version to be tested.

    Returns:
        True if min_version <= version_under_test, else False.
    """
    console.print(f"Checking if {min_version} >= {version_under_test}")
    console.print(f"Parsed versions: {version.parse(min_version)} >= {version.parse(version_under_test)}")
    return version.parse(min_version) >= version.parse(version_under_test)


@dataclass
class ProtocolInfo:
    """
    Dataclass representing a protocol file's analysis info.

    Attributes:
        filepath: Path to the protocol file.
        filename: Name of the file.
        expect_no_errors: True if the filename starts with 'Flex_S', 'OT2_S', or 'pl_'.
        api_level: The API level extracted either from requirements or metadata.
        pd_version: The designer application version from a JSON file (if applicable).
        robot: The robot type extracted either from the file's requirements, metadata, or JSON.
    """

    filepath: Path
    filename: str
    expect_no_errors: bool
    key: Optional[str] = None
    api_level: Optional[Any] = None
    pd_version: Optional[str] = None
    robot: Optional[str] = None
    min_robot_stack_version: Optional[str] = None


@dataclass
class ProtocolPaths:
    analyzable_protocols: List[Path]
    non_override_protocol_paths: List[Path]
    override_protocol_paths: List[Path]


def protocols_under_test(protocol_names: List[str]) -> List[Protocol]:
    names = ",".join(protocol_names)
    console.print(Panel(f"Protocols under test: {names}", title="Protocols Under Test", subtitle="Analysis Matrix"))
    time.sleep(5)
    protocol_registry: ProtocolRegistry = ProtocolRegistry(protocol_names=names, override_protocol_names="none")
    if not protocol_registry.protocols_to_test:
        exit("No protocols were resolved from the protocol names provided. Exiting.")
    return protocol_registry.protocols_to_test


def determine_expect_no_errors(filename: str) -> bool:
    """
    Determine if no errors are expected based on the filename.

    Args:
        filename: The name of the file.

    Returns:
        True if filename starts with 'Flex_S', 'OT2_S', or 'pl_', else False.
    """
    return filename.startswith("Flex_S") or filename.startswith("OT2_S") or filename.startswith("pl_")


def extract_py_fields(filepath: Path) -> Tuple[Optional[Any], Optional[str]]:  # noqa: C901
    """
    Extract api_level and robot from a Python file.

    Logic:
      - If a 'requirements' variable is present, extract:
          api_level = requirements["apiLevel"]
          robot = requirements["robotType"]
      - Otherwise, if a 'metadata' variable is found, extract:
          api_level = metadata["apiLevel"]
          robot is set to "OT-2"

    Args:
        filepath: Path to the .py file.

    Returns:
        A tuple (api_level, robot) if found, otherwise (None, None).
    """
    try:
        with filepath.open("r", encoding="utf-8") as f:
            file_content = f.read()
        tree = ast.parse(file_content, filename=str(filepath))
    except Exception as e:
        console.print(f"[red]Error parsing {filepath}: {e}[/red]")
        return None, None

    # First, search for 'requirements'
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "requirements":
                    if isinstance(node.value, ast.Dict):
                        try:
                            req_dict: Dict[Any, Any] = ast.literal_eval(node.value)
                            api_level = req_dict.get("apiLevel")
                            robot = req_dict.get("robotType")
                            return api_level, robot
                        except Exception as e:
                            console.print(f"[red]Error evaluating requirements in {filepath}: {e}[/red]")
                            return None, None

    # If no requirements, look for 'metadata'
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "metadata":
                    if isinstance(node.value, ast.Dict):
                        try:
                            meta_dict: Dict[Any, Any] = ast.literal_eval(node.value)
                            api_level = meta_dict.get("apiLevel")
                            # When requirements are missing, default robot to "OT-2"
                            return api_level, "OT-2"
                        except Exception as e:
                            console.print(f"[red]Error evaluating metadata in {filepath}: {e}[/red]")
                            return None, "OT-2"
    return None, None


def extract_pd_version_from_json(filepath: Path) -> Optional[str]:
    """
    Extract the pd_version from a JSON file.

    Args:
        filepath: Path to the .json file.

    Returns:
        The value of designerApplication.version if found, otherwise None.
    """
    try:
        with filepath.open("r", encoding="utf-8") as f:
            data = json.load(f)
        designer_app = data.get("designerApplication", {})
        if isinstance(designer_app, dict):
            return designer_app.get("version")
    except Exception as e:
        console.print(f"[red]Error reading {filepath}: {e}[/red]")
    return None


def extract_robot_from_json(filepath: Path) -> Optional[str]:
    """
    Extract the robot model from a JSON file.

    Args:
        filepath: Path to the .json file.

    Returns:
        The value of robot.model if found, otherwise None.
    """
    try:
        with filepath.open("r", encoding="utf-8") as f:
            data = json.load(f)
        robot_info = data.get("robot", {})
        if isinstance(robot_info, dict):
            return robot_info.get("model")
    except Exception as e:
        console.print(f"[red]Error reading robot field from {filepath}: {e}[/red]")
    return None


def map_api_version_to_robot_version(api_version: Optional[Any]) -> Optional[str]:
    """
    Map the API version to the corresponding robot app version.

    The mapping is as follows:
      2.22 -> 8.3.0
      2.21 -> 8.2.0
      2.20 -> 8.0.0
      2.19 -> 7.3.1
      2.18 -> 7.3.0
      2.17 -> 7.2.0

    Args:
        api_version: The API version value.

    Returns:
        The corresponding robot app version as a string, or None if no mapping exists.
    """
    # Create all these images
    # make build-opentrons-analysis ANALYSIS_REF=v8.3.0

    if api_version is None:
        return "7.2.0"
    return mapping.get(str(api_version)) or "7.2.0"


def gather_protocol_files(directory: Path) -> ProtocolPaths:
    """
    Gather all .json and .py files in the specified directory.

    Args:
        directory: The directory to search.

    Returns:
        A list of Path objects for each protocol file found.
    """
    files = list(directory.glob("*.py")) + list(directory.glob("*.json"))
    # remove the base generated protocol files that will not analyze
    override_protocols = [f for f in files if "Overrides" in str(f)]
    files = [f for f in files if "Overrides" not in str(f)]
    generated_protocols_directory = Path(directory, "generated_protocols")
    generated_files = list(generated_protocols_directory.glob("*.py")) + list(generated_protocols_directory.rglob("*.json"))
    files.extend(generated_files)
    return ProtocolPaths(analyzable_protocols=files, override_protocol_paths=override_protocols, non_override_protocol_paths=files)


def display_protocols_table(protocols: List[ProtocolInfo]) -> None:
    """
    Display a table of protocol information.

    Args:
        protocols: List of ProtocolInfo objects.
    """

    table = Table(title="Protocols Analysis")
    table.add_column("Key", justify="right", style="cyan", no_wrap=True)
    table.add_column("Filename", style="magenta")
    table.add_column("Expect No Errors", justify="center")
    table.add_column("API Level", style="green")
    table.add_column("PD Version", style="green")
    table.add_column("Robot", style="yellow")
    table.add_column("Min Robot Stack Version", style="blue")

    for protocol in protocols:
        table.add_row(
            protocol.key,
            protocol.filename,
            str(protocol.expect_no_errors),
            str(protocol.api_level) if protocol.api_level is not None else "-",
            protocol.pd_version if protocol.pd_version is not None else "-",
            protocol.robot if protocol.robot is not None else "-",
            protocol.min_robot_stack_version if protocol.min_robot_stack_version is not None else "-",
        )
    console.print(table)


def interactive_protocol_selection(protocols: List[ProtocolInfo]) -> List[ProtocolInfo]:
    """
    Interactively select protocols to analyze if the user chooses 'some'.

    Args:
        protocols: List of all ProtocolInfo objects.

    Returns:
        A list of selected ProtocolInfo objects.
    """
    display_protocols_table(protocols)
    console.print("\nEnter the keys of the protocols you want to analyze, separated by commas (e.g. 1,3,5).")
    selection = Prompt.ask("Your selection (or press Enter to select none)", default="")
    if not selection.strip():
        return []
    try:
        keys = [idx.strip() for idx in selection.split(",") if idx.strip().isdigit()]
    except ValueError:
        console.print("[red]Invalid input. Please enter valid numbers.[/red]")
        return []
    console.print(f"[blue]You selected keys: {keys}[/blue]")
    selected = [p for p in protocols if p.key in keys]
    if not selected:
        console.print("[red]No valid protocols selected.[/red]")
    if len(selected) != len(keys):
        missing_indices = [idx for idx in keys if idx not in [p.key for p in selected]]
        console.print(f"[red]The following indices were not found in the protocols: {missing_indices}[/red]")
    return selected


class AnalysisOutcome:
    NO_ERRORS = "✅"
    ERRORS = "❌"
    NA = "—"

    def __init__(self, value: str):
        self.value = value

    def __str__(self) -> str:
        return self.value

    def __repr__(self) -> str:
        return self.value


@dataclass
class AnalysisMatrix:
    filename: str
    v8_3_0: str = AnalysisOutcome.NA
    v8_2_0: str = AnalysisOutcome.NA
    v8_0_0: str = AnalysisOutcome.NA
    v7_3_1: str = AnalysisOutcome.NA
    v7_3_0: str = AnalysisOutcome.NA
    v7_2_0: str = AnalysisOutcome.NA
    expect_no_errors: bool = False

    def set_result(self, tag: str, protocol: TargetProtocol) -> None:
        if not protocol.analysis:
            console.print(f"[red]No analysis results for {self.filename}[/red]")
            return
        if not protocol.analysis["errors"]:
            console.print(f"[green]No errors for {self.filename}[/green]")
            result = AnalysisOutcome.NO_ERRORS
        else:
            console.print(f"[red]Errors found in {self.filename}[/red]")
            result = AnalysisOutcome.ERRORS

        tag_version = tag.lower()
        if tag_version == "v8.3.0":
            self.v8_3_0 = result
        elif tag_version == "v8.2.0":
            self.v8_2_0 = result
        elif tag_version == "v8.0.0":
            self.v8_0_0 = result
        elif tag_version == "v7.3.1":
            self.v7_3_1 = result
        elif tag_version == "v7.3.0":
            self.v7_3_0 = result
        elif tag_version == "v7.2.0":
            self.v7_2_0 = result


def main() -> None:  # noqa: C901
    """
    Main function to gather protocols and interactively select files for analysis.
    """
    protocols_dir = Path(Path("__file__").parent.parent, "files", "protocols")
    if not protocols_dir.exists() or not protocols_dir.is_dir():
        console.print(f"[red]Directory {protocols_dir} does not exist or is not a directory.[/red]")
        return

    file_paths = gather_protocol_files(protocols_dir)
    if not file_paths.non_override_protocol_paths:
        console.print(f"[red]No protocol files (.py or .json) found in {protocols_dir}.[/red]")
        return

    protocols: List[ProtocolInfo] = []
    for file_path in file_paths.non_override_protocol_paths:
        filename = file_path.name
        expect_no_errors = determine_expect_no_errors(filename)
        api_level: Optional[Any] = None
        pd_version: Optional[str] = None
        robot: Optional[str] = None

        if file_path.suffix == ".py":
            api_level, robot = extract_py_fields(file_path)
        elif file_path.suffix == ".json":
            pd_version = extract_pd_version_from_json(file_path)
            robot = extract_robot_from_json(file_path)

        protocols.append(
            ProtocolInfo(
                filepath=file_path,
                filename=filename,
                expect_no_errors=expect_no_errors,
                api_level=api_level,
                pd_version=pd_version,
                robot=robot,
                min_robot_stack_version=map_api_version_to_robot_version(api_level),
            )
        )

    # Sort protocols
    protocols = sorted(protocols, key=lambda p: (p.expect_no_errors, p.robot or "", p.api_level or "", p.pd_version or ""))

    # Assign keys after sorting
    for i, protocol in enumerate(protocols):
        protocol.key = str(i)

    choice = Prompt.ask(
        "Do you want to analyze all protocols or just some?",
        choices=["all", "some"],
        default="some",
    )
    if choice == "some":
        selected_protocols = interactive_protocol_selection(protocols)
    else:
        selected_protocols = protocols

    if not selected_protocols:
        console.print("[yellow]No protocols selected for analysis.[/yellow]")
        return

    console.print("\n[bold green]Selected Protocols:[/bold green]")
    display_protocols_table(selected_protocols)
    # Further processing can be added here...
    console.print("\n[blue]Proceeding with further analysis...[/blue]")

    # now we are going to generate an analysis for each of the selected protocols
    # and we will do so for each of the robot versions that are supported by the protocol

    result_matrix = [
        AnalysisMatrix(
            filename=p.filename,
            v8_3_0=AnalysisOutcome.NA,
            v8_2_0=AnalysisOutcome.NA,
            v8_0_0=AnalysisOutcome.NA,
            v7_3_1=AnalysisOutcome.NA,
            v7_3_0=AnalysisOutcome.NA,
            v7_2_0=AnalysisOutcome.NA,
            expect_no_errors=p.expect_no_errors,
        )
        for p in selected_protocols
    ]
    for tag in tags:
        compatible_protocols = [
            p
            for p in selected_protocols
            if p.min_robot_stack_version is not None and is_version_compatible(tag[1:], p.min_robot_stack_version)
        ]
        console.print(f"Testing {len(compatible_protocols)} protocols for {tag}")
        if not compatible_protocols:
            console.print(f"[yellow]No protocols compatible with {tag}.[/yellow]")
            continue
        names = [p.filename.rsplit(".", 1)[0] for p in compatible_protocols]
        protocols_to_test = protocols_under_test(names)
        processed_protocols = generate_analyses_from_test(
            tag,
            protocols_to_test,
        )
        for p in processed_protocols:
            for matrix in result_matrix:
                if matrix.filename in str(p.host_protocol_file):
                    matrix.set_result(tag, p)
                    break
    # Display the result_matrix
    table = Table(title="Analysis Matrix Results")
    table.add_column("Filename", style="magenta")
    table.add_column("v8.3.0", justify="center")
    table.add_column("v8.2.0", justify="center")
    table.add_column("v8.0.0", justify="center")
    table.add_column("v7.3.1", justify="center")
    table.add_column("v7.3.0", justify="center")
    table.add_column("v7.2.0", justify="center")
    table.add_column("Expect No Errors", justify="center")
    for matrix in result_matrix:
        table.add_row(
            matrix.filename,
            str(matrix.v8_3_0),
            str(matrix.v8_2_0),
            str(matrix.v8_0_0),
            str(matrix.v7_3_1),
            str(matrix.v7_3_0),
            str(matrix.v7_2_0),
            str(matrix.expect_no_errors),
        )
    console.print(table)


if __name__ == "__main__":
    main()
