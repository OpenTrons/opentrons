"""Tests for the command lifecycle state."""

from opentrons.protocol_engine.command_models import (
    PendingCommand,
    LoadLabwareRequest,
    LoadLabwareResult
)


def test_state_store_handles_command(store, now, load_labware_request):
    """It should add a command to the store."""
    cmd: PendingCommand[LoadLabwareRequest, LoadLabwareResult] = (
        PendingCommand(created_at=now, request=load_labware_request)
    )

    store.handle_command(cmd, uid="unique-id")

    assert store.state.get_command_by_id("unique-id") == cmd
