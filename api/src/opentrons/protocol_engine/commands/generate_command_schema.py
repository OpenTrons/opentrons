"""Generate a JSON schema against which all create commands statically validate."""

import json
import argparse
import sys
from opentrons.protocol_engine.commands.command_unions import CommandCreateAdapter

from opentrons_shared_data.command import get_newest_schema_version
from opentrons_shared_data.load import get_shared_data_root


def generate_command_schema(version: str) -> str:
    """Generate a JSON Schema that all valid create commands can validate against."""
    schema_as_dict = CommandCreateAdapter.json_schema(mode="validation")
    schema_as_dict["$id"] = f"opentronsCommandSchemaV{version}"
    schema_as_dict["$schema"] = "http://json-schema.org/draft-07/schema#"
    return json.dumps(schema_as_dict, indent=2, sort_keys=True)


def write_command_schema(json_string: str, version: str) -> None:
    """Write a JSON command schema to the shared-data command schema directory."""
    path = get_shared_data_root() / "command" / "schemas" / f"{version}.json"
    with open(path, "w") as schema_file:
        schema_file.write(json_string)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="generate_command_schema",
        description="Generate A JSON-schema of all possible Create-Commands accepted by the current Protocol Engine",
    )
    parser.add_argument(
        "version",
        type=str,
        nargs="?",
        help="The command schema version. This is a single integer (e.g. 7) that will be used to name the generated"
        " schema file. If not included, it will automatically use the latest version in shared-data.",
    )
    parser.add_argument(
        "--overwrite-shared-data",
        action="store_true",
        help="If used, overwrites the specified or automatically chosen command schema version in shared-data."
        " If not included, the generated schema will be printed to stdout.",
    )
    args = parser.parse_args()

    if args.version is None:
        version_string = get_newest_schema_version()
    else:
        version_string = args.version

    command_schema = generate_command_schema(version_string)

    if args.overwrite_shared_data:
        write_command_schema(command_schema, version_string)
    else:
        print(command_schema)

    sys.exit()

__all__ = ["generate_command_schema"]
