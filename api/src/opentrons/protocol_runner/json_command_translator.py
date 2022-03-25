"""Translation of JSON protocol commands into ProtocolEngine commands."""
from typing import cast, List
from pydantic import parse_obj_as
from opentrons_shared_data.protocol.models import ProtocolSchemaV6, Command
from opentrons.protocol_engine import commands as pe_commands, LabwareLocation, ModuleModel, DeckSlotLocation, PipetteName
from opentrons.types import MountType


class CommandTranslatorError(Exception):
    """An error raised to indicate an internal programmer error."""

    pass


def _get_labware_command(
        protocol: ProtocolSchemaV6, command: Command
) -> pe_commands.LoadLabwareCreate:
    labware_id = command.params.labwareId
    assert labware_id is not None
    definition_id = protocol.labware[labware_id].definitionId
    assert definition_id is not None
    labware_command = pe_commands.LoadLabwareCreate(
        params=pe_commands.LoadLabwareParams(
            labwareId=command.params.labwareId,
            displayName=protocol.labware[labware_id].displayName,
            version=protocol.labwareDefinitions[definition_id].version,
            namespace=protocol.labwareDefinitions[definition_id].namespace,
            loadName=protocol.labwareDefinitions[definition_id].parameters.loadName,
            location=parse_obj_as(
                LabwareLocation, command.params.location
            ),
        )
    )
    return labware_command


def _get_command(command: Command) -> pe_commands.CommandCreate:
    dict_command = command.dict(exclude_none=True)
    translated_obj = cast(
        pe_commands.CommandCreate,
        parse_obj_as(
            # https://github.com/samuelcolvin/pydantic/issues/1847
            pe_commands.CommandCreate,  # type: ignore[arg-type]
            dict_command,
        ),
    )
    return translated_obj


def _get_module_command(protocol: ProtocolSchemaV6, command: Command) -> pe_commands.CommandCreate:
    module_id = command.params.moduleId
    modules = protocol.modules
    assert module_id is not None
    assert modules is not None
    translated_obj = pe_commands.LoadModuleCreate(params=pe_commands.LoadModuleParams(
        model=ModuleModel(modules[module_id].model),
        location=DeckSlotLocation.parse_obj(command.params.location),
        moduleId=command.params.moduleId
    ))
    return translated_obj


def _get_pipette_command(protocol: ProtocolSchemaV6, command: Command) -> pe_commands.CommandCreate:
    pipette_id = command.params.pipetteId
    assert pipette_id is not None
    translated_obj = pe_commands.LoadPipetteCreate(params=pe_commands.LoadPipetteParams(
        pipetteName=PipetteName(protocol.pipettes[pipette_id].name),
        mount=MountType(command.params.mount),
        pipetteId=command.params.pipetteId
    ))
    return translated_obj


class JsonCommandTranslator:
    """Class that translates commands from PD/JSON to ProtocolEngine."""

    def translate(
            self,
            protocol: ProtocolSchemaV6,
    ) -> List[pe_commands.CommandCreate]:
        """Takes json protocol v6 and translates commands->protocol engine commands."""
        commands_list: List[pe_commands.CommandCreate] = []
        exclude_commands = [
            "loadLiquid",
            "delay",
            "touchTip",
            "blowout",
            "moveToSlot",
            "moveToCoordinates",
        ]
        commands_to_parse = [command for command in protocol.commands if command.commandType not in exclude_commands]
        for command in commands_to_parse:
            if command.commandType == "loadPipette":
                translated_obj = _get_pipette_command(protocol, command)
            elif command.commandType == "loadModule":
                translated_obj = _get_module_command(protocol, command)
            elif command.commandType == "loadLabware":
                translated_obj = _get_labware_command(protocol, command)
            else:
                translated_obj = _get_command(command)
            commands_list.append(translated_obj)
        return commands_list
