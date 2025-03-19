"""Test that the command schema is in sync with its source models."""
from opentrons_shared_data.command import load_schema_string, get_newest_schema_version
from opentrons.protocol_engine.commands import generate_command_schema


SCHEMA_CHANGED_MESSAGE = """\
The Python models for Protocol Engine commands do not match the shared JSON schema.

If this change is accidental, undo the changes to our Python models.

Or, if this change is intentional, update the shared JSON schema by running this from the monorepo root:

    make -C api command-schema
    make format

...and include the updated JSON schema file in your pull request.
"""


def test_command_schema_has_not_changed() -> None:
    """Confirm that the command schema has not changed."""
    newest_version = get_newest_schema_version()
    existing_schema_string = load_schema_string(newest_version)
    generated_schema_string = generate_command_schema(newest_version)

    assert generated_schema_string == existing_schema_string, SCHEMA_CHANGED_MESSAGE
