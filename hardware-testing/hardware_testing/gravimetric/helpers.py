"""Opentrons helper methods."""
from types import MethodType
from typing import Any, List, Dict, Optional

from opentrons import protocol_api
from opentrons.protocol_api.labware import Well
from opentrons.protocols.types import APIVersion
from opentrons.hardware_control.thread_manager import ThreadManager
from opentrons.hardware_control.types import Axis
from opentrons.hardware_control.ot3api import OT3API

from opentrons.types import Point

from opentrons_shared_data.labware.dev_types import LabwareDefinition

from hardware_testing.opentrons_api import helpers_ot3


def _add_fake_simulate(
    ctx: protocol_api.ProtocolContext, is_simulating: bool
) -> protocol_api.ProtocolContext:
    def _is_simulating(_: protocol_api.ProtocolContext) -> bool:
        return is_simulating

    setattr(ctx, "is_simulating", MethodType(_is_simulating, ctx))
    return ctx


def _add_fake_comment_pause(
    ctx: protocol_api.ProtocolContext,
) -> protocol_api.ProtocolContext:
    def _comment(_: protocol_api.ProtocolContext, a: Any) -> None:
        print(a)

    def _pause(_: protocol_api.ProtocolContext, a: Any) -> None:
        input(a)

    setattr(ctx, "comment", MethodType(_comment, ctx))
    setattr(ctx, "pause", MethodType(_pause, ctx))
    return ctx


def get_api_context(
    api_level: str,
    is_simulating: bool = False,
    pipette_left: Optional[str] = None,
    pipette_right: Optional[str] = None,
    gripper: Optional[str] = None,
    extra_labware: Optional[Dict[str, LabwareDefinition]] = None,
) -> protocol_api.ProtocolContext:

    async def _build_hw_api(*args: Any, **kwargs: Any) -> OT3API:
        return await helpers_ot3.build_async_ot3_hardware_api(
            is_simulating=is_simulating,
            pipette_left=pipette_left,
            pipette_right=pipette_right,
            gripper=gripper
        )

    return protocol_api.create_protocol_context(
        api_version=APIVersion.from_string(api_level),
        hardware_api=ThreadManager(_build_hw_api),  # type: ignore[arg-type]
        extra_labware=extra_labware,
    )


def well_is_reservoir(well: protocol_api.labware.Well) -> bool:
    """Well is reservoir."""
    return "reservoir" in well.parent.load_name


def get_list_of_wells_affected(
    pipette: protocol_api.InstrumentContext, well: Well
) -> List[Well]:
    """Get list of wells affected."""
    if pipette.channels > 1 and not well_is_reservoir(well):
        well_col = well.well_name[1:]  # the "1" in "A1"
        wells_list = [w for w in well.parent.columns_by_name()[well_col]]
        assert well in wells_list, "Well is not inside column"
    else:
        wells_list = [well]
    return wells_list


def get_pipette_unique_name(pipette: protocol_api.InstrumentContext) -> str:
    """Get a pipette's unique name."""
    return str(pipette.hw_pipette["pipette_id"])


def gantry_position_as_point(position: Dict[Axis, float]) -> Point:
    """Helper to convert Dict[Axis, float] to a Point()."""
    return Point(x=position[Axis.X], y=position[Axis.Y], z=position[Axis.Z])
