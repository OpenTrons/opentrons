"""Calibrate-module command for OT3 hardware. request, result, and implementation models."""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal
from pydantic import BaseModel, Field

from opentrons.types import MountType
from opentrons.protocol_engine.resources.ot3_validation import ensure_ot3_hardware
from opentrons.protocol_engine.commands.command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
)

# Work around type-only circular dependencies.
if TYPE_CHECKING:
    from ...state import StateView

from ...types import ModuleOffsetVector

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import OT3Mount
from opentrons.hardware_control import ot3_calibration as calibration


CalibrateModuleCommandType = Literal["calibration/calibrateModule"]


class CalibrateModuleParams(BaseModel):
    """Payload required to calibrate-module."""

    moduleId: str = Field(..., description="The unique id of module to calibrate.")
    labwareId: str = Field(
        ..., description="The unique id of module calibration adapter labware."
    )
    mount: MountType = Field(
        ..., description="The instrument mount used to calibrate the module."
    )


class CalibrateModuleResult(BaseModel):
    """Result data from the execution of a calibrate-module command."""

    moduleOffset: ModuleOffsetVector = Field(
        ..., description="Offset of calibrated module."
    )


class CalibrateModuleImplementation(
    AbstractCommandImpl[CalibrateModuleParams, CalibrateModuleResult]
):
    """CalibrateModule command implementation."""

    def __init__(
        self,
        state_view: StateView,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._hardware_api = hardware_api

    async def execute(self, params: CalibrateModuleParams) -> CalibrateModuleResult:
        """Execute calibrate-module command."""
        ot3_api = ensure_ot3_hardware(
            self._hardware_api,
        )
        ot3_mount = OT3Mount.from_mount(params.mount)
        slot = self._state_view.modules.get_location(params.moduleId).slotName.as_int()
        module_serial = self._state_view.modules.get(params.moduleId).serialNumber
        # TODO (ba, 2023-03-28): Check that the labware is the calibration adapter for the specific module
        nominal_position = self._state_view.geometry.get_well_position(
            labware_id=params.labwareId, well_name="A1"
        )
        # start the calibration
        module_offset = await calibration.calibrate_module(
            ot3_api, ot3_mount, slot, module_serial, nominal_position
        )

        return CalibrateModuleResult(
            moduleOffset=ModuleOffsetVector(
                x=module_offset.x, y=module_offset.y, z=module_offset.z
            )
        )


class CalibrateModule(BaseCommand[CalibrateModuleParams, CalibrateModuleResult]):
    """Calibrate-module command model."""

    commandType: CalibrateModuleCommandType = "calibration/calibrateModule"
    params: CalibrateModuleParams
    result: Optional[CalibrateModuleResult]

    _ImplementationCls: Type[
        CalibrateModuleImplementation
    ] = CalibrateModuleImplementation


class CalibrateModuleCreate(BaseCommandCreate[CalibrateModuleParams]):
    """Create calibrate-module command request model."""

    commandType: CalibrateModuleCommandType = "calibration/calibrateModule"
    params: CalibrateModuleParams

    _CommandCls: Type[CalibrateModule] = CalibrateModule
