"""Command models to start heating a Thermocycler's lid."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate

if TYPE_CHECKING:
    from opentrons.protocol_engine.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


SetTargetLidTemperatureCommandType = Literal["thermocycler/setTargetLidTemperature"]


class SetTargetLidTemperatureParams(BaseModel):
    """Input parameters to set a Thermocycler's target lid temperature."""

    moduleId: str = Field(..., description="Unique ID of the Thermocycler Module.")
    # TODO(mc, 2022-04-25): rename to "celsius"
    temperature: float = Field(..., description="Target temperature in °C.")


class SetTargetLidTemperatureResult(BaseModel):
    """Result data from setting a Thermocycler's target lid temperature."""


class SetTargetLidTemperatureImpl(
    AbstractCommandImpl[SetTargetLidTemperatureParams, SetTargetLidTemperatureResult]
):
    """Execution implementation of a Thermocycler's set lid temperature command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self,
        params: SetTargetLidTemperatureParams,
    ) -> SetTargetLidTemperatureResult:
        """Set a Thermocycler's target lid temperature."""
        raise NotImplementedError()


class SetTargetLidTemperature(
    BaseCommand[SetTargetLidTemperatureParams, SetTargetLidTemperatureResult]
):
    """A command to set a Thermocycler's target lid temperature."""

    commandType: SetTargetLidTemperatureCommandType = (
        "thermocycler/setTargetLidTemperature"
    )
    params: SetTargetLidTemperatureParams
    result: Optional[SetTargetLidTemperatureResult]

    _ImplementationCls: Type[SetTargetLidTemperatureImpl] = SetTargetLidTemperatureImpl


class SetTargetLidTemperatureCreate(BaseCommandCreate[SetTargetLidTemperatureParams]):
    """A request to create a Thermocycler's set lid temperature command."""

    commandType: SetTargetLidTemperatureCommandType
    params: SetTargetLidTemperatureParams

    _CommandCls: Type[SetTargetLidTemperature] = SetTargetLidTemperature
