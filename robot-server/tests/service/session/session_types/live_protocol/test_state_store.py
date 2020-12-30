import pytest
from unittest.mock import patch

from opentrons import types

from robot_server.service.session.models import command_definitions as cmddef
from robot_server.service.legacy.models.control import Mount
from robot_server.service.session.models import command as models
from robot_server.service.session.command_execution \
    import create_command, CommandResult
from robot_server.service.session.session_types.live_protocol.state_store \
    import StateStore, LabwareEntry, InstrumentEntry


def test_handle_command_request():
    store = StateStore()
    command = create_command(
        request=models.LoadLabwareRequest(
            command=cmddef.EquipmentCommand.load_labware,
            data=models.LoadLabwareRequestData(
                location=1,
                loadName="labware-load-name",
                displayName="labware display name",
                namespace="opentrons test",
                version=1,
            ),
        )
    )
    store.handle_command_request(command)

    assert store.get_commands() == [command]


def test_store_has_handle_command_response_method():
    with patch.object(StateStore, "handle_load_labware"):
        store = StateStore()
        command = create_command(
            request=models.LoadLabwareRequest(
                command=cmddef.EquipmentCommand.load_labware,
                data=models.LoadLabwareRequestData(
                    location=1,
                    loadName="labware-load-name",
                    displayName="labware display name",
                    namespace="opentrons test",
                    version=1,
                ),
            )
        )
        command_result = CommandResult(
            started_at=command.meta.created_at,
            completed_at=command.meta.created_at,
        )

        store.handle_command_result(command, command_result)

        assert store.get_command_result_by_id(
            command.meta.identifier) == command_result


@pytest.mark.parametrize(
    argnames="command_request, handler",
    argvalues=[[
                models.LoadLabwareRequest(
                    command=cmddef.EquipmentCommand.load_labware,
                    data=models.LoadLabwareRequestData(
                        location=1,
                        loadName="a",
                        displayName="a",
                        namespace="a",
                        version=1
                    )
                ),
                "handle_load_labware"],
               [
                models.LoadInstrumentRequest(
                    command=cmddef.EquipmentCommand.load_instrument,
                    data=models.LoadInstrumentRequestData(
                        instrumentName="p50_multi",
                        mount=Mount.left,
                    )
                ),
                "handle_load_instrument"]]
)
def test_command_result_state_handler(command_request, handler):

    with patch.object(StateStore, handler) as handler_mock:
        store = StateStore()
        command = create_command(request=command_request)
        command_result = CommandResult(
            started_at=command.meta.created_at,
            completed_at=command.meta.created_at,
        )
        store.handle_command_result(command, command_result)
        handler_mock.assert_called_once_with(command, command_result)


def test_load_labware_update():
    store = StateStore()
    command = create_command(
        request=models.LoadLabwareRequest(
            command=cmddef.EquipmentCommand.load_labware,
            data=models.LoadLabwareRequestData(
                location=1,
                loadName="labware-load-name",
                displayName="labware display name",
                namespace="opentrons test",
                version=1,
            ))
    )
    command_result = CommandResult(
        started_at=command.meta.created_at,
        completed_at=command.meta.created_at,
        data=models.LoadLabwareResponseData(
            labwareId="1234",
            definition={"myLabware": "definition"},
            calibration=(1, 2, 3)))
    assert store.get_labware_by_id(command_result.data.labwareId) is None
    store.handle_command_result(command, command_result)
    assert store.get_labware_by_id(command_result.data.labwareId) == \
        LabwareEntry(definition={"myLabware": "definition"},
                     calibration=(1, 2, 3),
                     deckLocation=1)


def test_load_instrument_update():
    store = StateStore()
    command = create_command(
        request=models.LoadInstrumentRequest(
            command=cmddef.EquipmentCommand.load_instrument,
            data=models.LoadInstrumentRequestData(
                instrumentName='p10_single',
                mount=Mount.left)
        )
    )
    command_result = CommandResult(
        started_at=command.meta.created_at,
        completed_at=command.meta.created_at,
        data=models.LoadInstrumentResponseData(instrumentId="1234"))

    assert store.get_instrument_by_id(command_result.data.instrumentId) is None
    assert store.get_instrument_by_mount(
        command.request.data.mount.to_hw_mount()
    ) is None
    store.handle_command_result(command, command_result)

    expected_instrument = InstrumentEntry(mount=types.Mount.LEFT,
                                          name='p10_single')

    assert store.get_instrument_by_id(command_result.data.instrumentId) == \
           expected_instrument
    assert store.get_instrument_by_mount(
        command.request.data.mount.to_hw_mount()
    ) == expected_instrument
