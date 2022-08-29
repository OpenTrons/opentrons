"""Command factories to use in tests as data fixtures."""
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, cast

from opentrons.types import MountType
from opentrons.protocols.models import LabwareDefinition
from opentrons.protocol_engine import ErrorOccurrence, commands as cmd
from opentrons.protocol_engine.types import (
    PipetteName,
    WellLocation,
    LabwareLocation,
)


def create_queued_command(
    command_id: str = "command-id",
    command_key: str = "command-key",
    command_type: str = "command-type",
    params: Optional[BaseModel] = None,
) -> cmd.Command:
    """Given command data, build a pending command model."""
    return cast(
        cmd.Command,
        cmd.BaseCommand(
            id=command_id,
            key=command_key,
            commandType=command_type,
            createdAt=datetime(year=2021, month=1, day=1),
            status=cmd.CommandStatus.QUEUED,
            params=params or BaseModel(),
        ),
    )


def create_running_command(
    command_id: str = "command-id",
    command_key: str = "command-key",
    command_type: str = "command-type",
    created_at: datetime = datetime(year=2021, month=1, day=1),
    params: Optional[BaseModel] = None,
) -> cmd.Command:
    """Given command data, build a running command model."""
    return cast(
        cmd.Command,
        cmd.BaseCommand(
            id=command_id,
            key=command_key,
            createdAt=created_at,
            commandType=command_type,
            status=cmd.CommandStatus.RUNNING,
            params=params or BaseModel(),
        ),
    )


def create_failed_command(
    command_id: str = "command-id",
    command_key: str = "command-key",
    command_type: str = "command-type",
    created_at: datetime = datetime(year=2021, month=1, day=1),
    completed_at: datetime = datetime(year=2022, month=2, day=2),
    params: Optional[BaseModel] = None,
    error: Optional[ErrorOccurrence] = None,
    intent: Optional[cmd.CommandIntent] = None,
) -> cmd.Command:
    """Given command data, build a failed command model."""
    return cast(
        cmd.Command,
        cmd.BaseCommand(
            id=command_id,
            key=command_key,
            createdAt=created_at,
            completedAt=completed_at,
            commandType=command_type,
            status=cmd.CommandStatus.FAILED,
            params=params or BaseModel(),
            error=error,
            intent=intent,
        ),
    )


def create_succeeded_command(
    command_id: str = "command-id",
    command_key: str = "command-key",
    command_type: str = "command-type",
    created_at: datetime = datetime(year=2021, month=1, day=1),
    params: Optional[BaseModel] = None,
    result: Optional[BaseModel] = None,
) -> cmd.Command:
    """Given command data and result, build a completed command model."""
    return cast(
        cmd.Command,
        cmd.BaseCommand(
            id=command_id,
            key=command_key,
            createdAt=created_at,
            commandType=command_type,
            status=cmd.CommandStatus.SUCCEEDED,
            params=params or BaseModel(),
            result=result or BaseModel(),
        ),
    )


def create_load_labware_command(
    labware_id: str,
    location: LabwareLocation,
    definition: LabwareDefinition,
    offset_id: Optional[str],
) -> cmd.LoadLabware:
    """Create a completed LoadLabware command."""
    params = cmd.LoadLabwareParams(
        loadName=definition.parameters.loadName,
        namespace=definition.namespace,
        version=definition.version,
        location=location,
        labwareId=None,
    )

    result = cmd.LoadLabwareResult(
        labwareId=labware_id, definition=definition, offsetId=offset_id
    )

    return cmd.LoadLabware(
        id="command-id",
        key="command-key",
        status=cmd.CommandStatus.SUCCEEDED,
        createdAt=datetime.now(),
        params=params,
        result=result,
    )


def create_load_pipette_command(
    pipette_id: str,
    pipette_name: PipetteName,
    mount: MountType,
) -> cmd.LoadPipette:
    """Get a completed LoadPipette command."""
    params = cmd.LoadPipetteParams(pipetteName=pipette_name, mount=mount)
    result = cmd.LoadPipetteResult(pipetteId=pipette_id)

    return cmd.LoadPipette(
        id="command-id",
        key="command-key",
        status=cmd.CommandStatus.SUCCEEDED,
        createdAt=datetime.now(),
        params=params,
        result=result,
    )


def create_aspirate_command(
    pipette_id: str,
    volume: float,
    flow_rate: float,
    labware_id: str = "labware-id",
    well_name: str = "A1",
    well_location: Optional[WellLocation] = None,
) -> cmd.Aspirate:
    """Get a completed Aspirate command."""
    params = cmd.AspirateParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location or WellLocation(),
        volume=volume,
        flowRate=flow_rate,
    )
    result = cmd.AspirateResult(volume=volume)

    return cmd.Aspirate(
        id="command-id",
        key="command-key",
        status=cmd.CommandStatus.SUCCEEDED,
        createdAt=datetime.now(),
        params=params,
        result=result,
    )


def create_dispense_command(
    pipette_id: str,
    volume: float,
    flow_rate: float,
    labware_id: str = "labware-id",
    well_name: str = "A1",
    well_location: Optional[WellLocation] = None,
) -> cmd.Dispense:
    """Get a completed Dispense command."""
    params = cmd.DispenseParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location or WellLocation(),
        volume=volume,
        flowRate=flow_rate,
    )
    result = cmd.DispenseResult(volume=volume)

    return cmd.Dispense(
        id="command-id",
        key="command-key",
        status=cmd.CommandStatus.SUCCEEDED,
        createdAt=datetime.now(),
        params=params,
        result=result,
    )


def create_dispense_in_place_command(
    pipette_id: str,
    volume: float,
    flow_rate: float,
) -> cmd.DispenseInPlace:
    """Get a completed DispenseInPlace command."""
    params = cmd.DispenseInPlaceParams(
        pipetteId=pipette_id,
        volume=volume,
        flowRate=flow_rate,
    )
    result = cmd.DispenseInPlaceResult(volume=volume)

    return cmd.DispenseInPlace(
        id="command-id",
        key="command-key",
        status=cmd.CommandStatus.SUCCEEDED,
        createdAt=datetime.now(),
        params=params,
        result=result,
    )


def create_pick_up_tip_command(
    pipette_id: str,
    labware_id: str = "labware-id",
    well_name: str = "A1",
) -> cmd.PickUpTip:
    """Get a completed PickUpTip command."""
    data = cmd.PickUpTipParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
    )

    result = cmd.PickUpTipResult()

    return cmd.PickUpTip(
        id="command-id",
        key="command-key",
        status=cmd.CommandStatus.SUCCEEDED,
        createdAt=datetime.now(),
        params=data,
        result=result,
    )


def create_drop_tip_command(
    pipette_id: str,
    labware_id: str = "labware-id",
    well_name: str = "A1",
) -> cmd.DropTip:
    """Get a completed DropTip command."""
    params = cmd.DropTipParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
    )

    result = cmd.DropTipResult()

    return cmd.DropTip(
        id="command-id",
        key="command-key",
        status=cmd.CommandStatus.SUCCEEDED,
        createdAt=datetime.now(),
        params=params,
        result=result,
    )


def create_move_to_well_command(
    pipette_id: str,
    labware_id: str = "labware-id",
    well_name: str = "A1",
) -> cmd.MoveToWell:
    """Get a completed MoveToWell command."""
    params = cmd.MoveToWellParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
    )

    result = cmd.MoveToWellResult()

    return cmd.MoveToWell(
        id="command-id",
        key="command-key",
        status=cmd.CommandStatus.SUCCEEDED,
        createdAt=datetime.now(),
        params=params,
        result=result,
    )


def create_blow_out_command(
    pipette_id: str,
    flow_rate: float,
    labware_id: str = "labware-id",
    well_name: str = "A1",
    well_location: Optional[WellLocation] = None,
) -> cmd.BlowOut:
    """Get a completed BlowOut command."""
    params = cmd.BlowOutParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location or WellLocation(),
        flowRate=flow_rate,
    )
    result = cmd.BlowOutResult()

    return cmd.BlowOut(
        id="command-id",
        key="command-key",
        status=cmd.CommandStatus.SUCCEEDED,
        createdAt=datetime(year=2022, month=1, day=1),
        params=params,
        result=result,
    )
