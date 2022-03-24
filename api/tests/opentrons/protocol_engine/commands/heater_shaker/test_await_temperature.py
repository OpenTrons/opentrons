"""Test Heater Shaker await temperature command implementation."""
import pytest
from decoy import Decoy

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.modules import HeaterShaker, AbstractModule

from opentrons.protocol_engine import errors
from opentrons.protocol_engine.state import StateView
from opentrons.protocol_engine.state.modules import HeaterShakerModuleView
from opentrons.protocol_engine.commands import heater_shaker
from opentrons.protocol_engine.commands.heater_shaker.await_temperature import (
    AwaitTemperatureImpl,
)


async def test_await_temperature(
    decoy: Decoy, state_view: StateView, hardware_api: HardwareControlAPI
) -> None:
    """It should be able to wait for the module's target temperature."""
    subject = AwaitTemperatureImpl(state_view=state_view, hardware_api=hardware_api)

    data = heater_shaker.AwaitTemperatureParams(moduleId="heater-shaker-id")

    # Get module view
    hs_module_view = decoy.mock(cls=HeaterShakerModuleView)

    decoy.when(
        state_view.modules.get_heater_shaker_module_view(module_id="heater-shaker-id")
    ).then_return(hs_module_view)

    decoy.when(
        hs_module_view.parent_module_view.get_plate_target_temperature(
            module_id="heater-shaker-id"
        )
    ).then_return(123.45)

    # Get attached hardware modules
    attached = [decoy.mock(cls=AbstractModule), decoy.mock(cls=AbstractModule)]
    match = decoy.mock(cls=HeaterShaker)
    decoy.when(hardware_api.attached_modules).then_return(attached)

    # Get stubbed hardware module from hs module view
    decoy.when(hs_module_view.find_hardware(attached_modules=attached)).then_return(
        match
    )

    result = await subject.execute(data)
    decoy.verify(await match.await_temperature(awaiting_temperature=123.45), times=1)
    assert result == heater_shaker.AwaitTemperatureResult()


async def test_raises_without_target_temp(
    decoy: Decoy, state_view: StateView, hardware_api: HardwareControlAPI
) -> None:
    """It should raise an error when executing command without a target temperature."""
    subject = AwaitTemperatureImpl(state_view=state_view, hardware_api=hardware_api)
    data = heater_shaker.AwaitTemperatureParams(moduleId="heater-shaker-id")

    # Get module view
    hs_module_view = decoy.mock(cls=HeaterShakerModuleView)
    decoy.when(
        state_view.modules.get_heater_shaker_module_view(module_id="heater-shaker-id")
    ).then_return(hs_module_view)

    with pytest.raises(errors.NoTargetTemperatureSetError):
        await subject.execute(data)
