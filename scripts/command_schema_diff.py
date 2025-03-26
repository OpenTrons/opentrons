# /// script
# requires-python = "==3.10.*"
# dependencies = [
#     "rich",
#     "requests",
# ]
# ///

import requests
import sys
import json
import difflib
from rich.prompt import IntPrompt, Prompt
from rich.console import Console
from rich.progress import Progress
from rich.syntax import Syntax
from rich.panel import Panel

console = Console()

BASE_URL_TEMPLATE = "https://raw.githubusercontent.com/Opentrons/opentrons/{branch}/shared-data/command/schemas/{schema}.json"


def fetch_schema(branch, schema_number):
    """Fetches the schema file from GitHub for a given branch and schema number."""
    url = BASE_URL_TEMPLATE.format(branch=branch, schema=schema_number)
    console.print(f"[bold blue]Fetching schema from:[/bold blue] {url}")

    try:
        with Progress() as progress:
            task = progress.add_task("[green]Downloading...", total=100)
            response = requests.get(url, timeout=10)
            progress.update(task, advance=100)

        if response.status_code == 200:
            console.print(
                f"[bold green]Download successful from {branch}![/bold green]"
            )
            return response.json()
        else:
            console.print(
                f"[bold red]Failed to retrieve schema from {branch}: {response.status_code}[/bold red]"
            )
            return None
    except requests.RequestException as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        return None


def compare_schemas(schema1, schema2):
    """Compares two JSON schemas and prints the differences."""
    schema1_str = json.dumps(schema1, indent=2, sort_keys=True)
    schema2_str = json.dumps(schema2, indent=2, sort_keys=True)

    if schema1_str == schema2_str:
        console.print("[bold green]No differences found! ✅[/bold green]")
        return

    console.print("[bold yellow]Differences found:[/bold yellow] ❗")
    diff = difflib.unified_diff(
        schema1_str.splitlines(),
        schema2_str.splitlines(),
        fromfile="edge.json",
        tofile="branch.json",
        lineterm="",
    )

    diff_output = "\n".join(diff)
    console.print(
        Panel(Syntax(diff_output, "diff", theme="monokai", line_numbers=True))
    )


def main():
    """Main function to handle interactive and non-interactive modes."""
    if len(sys.argv) > 2:
        try:
            schema_number = int(sys.argv[1])
            branch = sys.argv[2]
        except ValueError:
            console.print(
                "[bold red]Invalid input. Schema number must be an integer.[/bold red]"
            )
            sys.exit(1)
    else:
        schema_number = IntPrompt.ask(
            "[bold yellow]Enter the schema number[/bold yellow]"
        )
        branch = Prompt.ask(
            "[bold yellow]Enter the branch to compare against edge[/bold yellow]"
        )

    schema_edge = fetch_schema("edge", schema_number)
    schema_branch = fetch_schema(branch, schema_number)

    if schema_edge and schema_branch:
        compare_schemas(schema_edge, schema_branch)


if __name__ == "__main__":
    main()
