import typing
from fastapi import APIRouter, Query, Depends

from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.hardware_control.types import Axis
from opentrons.hardware_control.util import ot2_axis_to_string
from opentrons.hardware_control import HardwareControlAPI
from opentrons.protocol_engine.errors import HardwareNotSupportedError
from opentrons.protocol_engine.resources import ot3_validation
from opentrons.types import Mount

from robot_server.hardware import get_hardware
from robot_server.service.legacy.models import pipettes

router = APIRouter()


@router.get(
    "/pipettes",
    summary="Get the pipettes currently attached",
    description="This endpoint lists properties of the pipettes "
    "currently attached to the robot like name, model, "
    "and mount."
    "\n\n"
    "If you're controlling a Flex, and not an OT-2, you might prefer the"
    " `GET /instruments` endpoint instead.",
    response_model=pipettes.PipettesByMount,
)
async def get_pipettes(
    hardware: typing.Annotated[HardwareControlAPI, Depends(get_hardware)],
    refresh: typing.Annotated[
        typing.Optional[bool],
        Query(
            description="If `false`, query a cached value. If `true`, actively scan for"
            " attached pipettes."
            "\n\n"
            "**Warning:** Actively scanning disables the pipette motors and should only be done"
            " when no protocol is running and you know it won't cause a problem."
            "\n\n"
            "**Warning:** Actively scanning is only valid on OT-2s. On Flex robots, it's"
            " unnecessary, and the behavior is currently undefined.",
        ),
    ] = False,
) -> pipettes.PipettesByMount:
    """
    Query robot for model strings on 'left' and 'right' mounts, and return a
    dict with the results keyed by mount. By default, this endpoint provides
    cached values, which will not interrupt a running session. WARNING: if the
    caller supplies the "refresh=true" query parameter, this method will
    interrupt a sequence of Smoothie operations that are in progress, such as a
    protocol run.

    If a pipette is "uncommissioned" (e.g.: does not have a model string
    written to on-board memory), or if no pipette is present, the corresponding
    mount will report `'model': null`
    """
    if refresh is True:
        await hardware.cache_instruments()

    attached = hardware.attached_instruments

    def make_pipette(
        mount: Mount, pipette_dict: PipetteDict, is_ot2: bool
    ) -> pipettes.AttachedPipette:
        if is_ot2:
            mount_axis = ot2_axis_to_string(Axis.by_mount(mount))
            plunger_axis = ot2_axis_to_string(Axis.of_plunger(mount))
        else:
            mount_axis = Axis.by_mount(mount).name
            plunger_axis = Axis.of_plunger(mount).name
        return pipettes.AttachedPipette(
            model=pipette_dict.get("model"),
            name=pipette_dict.get("name"),
            id=pipette_dict.get("pipette_id"),
            mount_axis=mount_axis.lower(),
            plunger_axis=plunger_axis.lower(),
            tip_length=pipette_dict.get("tip_length", 0)
            if pipette_dict.get("model")
            else None,
        )

    try:
        ot3_validation.ensure_ot3_hardware(hardware)
        is_ot2 = False
    except HardwareNotSupportedError:
        is_ot2 = True
    e = {
        mount.name.lower(): make_pipette(mount=mount, pipette_dict=data, is_ot2=is_ot2)
        for mount, data in attached.items()
    }

    return pipettes.PipettesByMount(**e)
