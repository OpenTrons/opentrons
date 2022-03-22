"""Test Heater Shaker start set temperature command implementation."""
from decoy import Decoy

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.modules import AbstractModule, HeaterShaker

from opentrons.protocol_engine.state import StateView
from opentrons.protocol_engine.state.modules import HeaterShakerModuleView
from opentrons.protocol_engine.commands import heater_shaker
from opentrons.protocol_engine.commands.heater_shaker.start_set_target_temperature import (  # noqa: E501
    StartSetTargetTemperatureImpl,
)


async def test_start_set_target_temperature(
    decoy: Decoy,
    state_view: StateView,
    hardware_api: HardwareControlAPI,
) -> None:
    """It should be able to set the specified module's target temperature."""
    subject = StartSetTargetTemperatureImpl(
        state_view=state_view, hardware_api=hardware_api
    )

    data = heater_shaker.StartSetTargetTemperatureParams(
        moduleId="heater-shaker-id",
        temperature=42,
    )

    # Get module view
    hs_module_view = decoy.mock(cls=HeaterShakerModuleView)

    decoy.when(
        state_view.modules.get_heater_shaker_module_view(module_id="heater-shaker-id")
    ).then_return(hs_module_view)

    # Stub temperature validation from hs module view
    decoy.when(hs_module_view.is_target_temperature_valid(celsius=42)).then_return(True)

    # Get attached hardware modules
    attached = [decoy.mock(cls=AbstractModule), decoy.mock(cls=AbstractModule)]
    match = decoy.mock(cls=HeaterShaker)
    decoy.when(hardware_api.attached_modules).then_return(attached)

    # Get stubbed hardware module from hs module view
    decoy.when(
        hs_module_view.find_hardware(attached_modules=attached)
    ).then_return(match)

    result = await subject.execute(data)
    decoy.verify(await match.start_set_temperature(celsius=42), times=1)
    assert result == heater_shaker.StartSetTargetTemperatureResult()
