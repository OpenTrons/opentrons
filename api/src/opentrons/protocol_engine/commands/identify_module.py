"""Command models to pulse the light on a module for identification."""

from __future__ import annotations

from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence
from ..types import ModuleModel

if TYPE_CHECKING:
    from ..state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler

IdentifyModuleCommandType = Literal["identifyModule"]


class IdentifyModuleParams(BaseModel):
    """The parameters defining the module to be identified."""

    model: ModuleModel = Field(..., description="The model of the module")
    moduleId: str = Field(..., description="Unique ID of the module")


class IdentifyModuleResult(BaseModel):
    """Result data from an IdentifyModule command."""


class IdentifyModuleImpl(
    AbstractCommandImpl[IdentifyModuleParams, SuccessData[IdentifyModuleResult]]
):
    """Implementation of an IdentifyModule command."""

    def __init__(
        self, state_view: StateView, equipment: EquipmentHandler, **kwargs: object
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self, params: IdentifyModuleParams
    ) -> SuccessData[IdentifyModuleResult]:
        """Execute the IdentifyModule command."""
        # ONLY flex stacker has support for identify module command
        if params.model == ModuleModel.FLEX_STACKER_MODULE_V1:
            module_substate = self._state_view.modules.get_flex_stacker_substate(
                module_id=params.moduleId
            )
            module_hw = self._equipment.get_module_hardware_api(
                module_substate.module_id
            )
            if module_hw is not None:
                await module_hw.identify()
        else:
            raise NotImplementedError(
                f"IdentifyModule is not supported for {params.model}"
            )

        return SuccessData(public=IdentifyModuleResult())


class IdentifyModule(
    BaseCommand[IdentifyModuleParams, IdentifyModuleResult, ErrorOccurrence]
):
    """A command to identify a module."""

    commandType: IdentifyModuleCommandType = "identifyModule"
    params: IdentifyModuleParams
    result: Optional[IdentifyModuleResult] = None

    _ImplementationCls: Type[IdentifyModuleImpl] = IdentifyModuleImpl


class IdentifyModuleCreate(BaseCommandCreate[IdentifyModuleParams]):
    """A request to execute an IdentifyModule command."""

    commandType: IdentifyModuleCommandType = "identifyModule"
    params: IdentifyModuleParams

    _CommandCls: Type[IdentifyModule] = IdentifyModule
