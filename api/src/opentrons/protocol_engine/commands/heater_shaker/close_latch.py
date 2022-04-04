"""Command models to close the Heater-Shaker Module's latch."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate

if TYPE_CHECKING:
    from opentrons.protocol_engine.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


CloseLatchCommandType = Literal["heaterShakerModule/closeLatch"]


class CloseLatchParams(BaseModel):
    """Input parameters to close a Heater-Shaker Module's latch."""

    moduleId: str = Field(..., description="Unique ID of the Heater-Shaker Module.")


class CloseLatchResult(BaseModel):
    """Result data from closing a Heater-Shaker's latch."""


class CloseLatchImpl(AbstractCommandImpl[CloseLatchParams, CloseLatchResult]):
    """Execution implementation of a Heater-Shaker's close latch command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: CloseLatchParams) -> CloseLatchResult:
        """Close a Heater-Shaker's latch."""
        # Allow propagation of ModuleNotLoadedError and WrongModuleTypeError.
        hs_module_substate = self._state_view.modules.get_heater_shaker_module_substate(
            module_id=params.moduleId
        )

        # Allow propagation of ModuleNotAttachedError.
        hs_hardware_module = self._equipment.get_module_hardware_api(
            hs_module_substate.module_id
        )

        if hs_hardware_module is not None:
            await hs_hardware_module.close_labware_latch()

        return CloseLatchResult()


class CloseLatch(BaseCommand[CloseLatchParams, CloseLatchResult]):
    """A command to close a Heater-Shaker's latch."""

    commandType: CloseLatchCommandType = "heaterShakerModule/closeLatch"
    params: CloseLatchParams
    result: Optional[CloseLatchResult]

    _ImplementationCls: Type[CloseLatchImpl] = CloseLatchImpl


class CloseLatchCreate(BaseCommandCreate[CloseLatchParams]):
    """A request to create a Heater-Shaker's close latch command."""

    commandType: CloseLatchCommandType
    params: CloseLatchParams

    _CommandCls: Type[CloseLatch] = CloseLatch
