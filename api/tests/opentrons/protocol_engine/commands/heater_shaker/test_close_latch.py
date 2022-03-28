"""Test Heater Shaker close latch command implementation."""
from decoy import Decoy

from opentrons.hardware_control.modules import HeaterShaker

from opentrons.protocol_engine.state import StateView
from opentrons.protocol_engine.state.modules import (
    HeaterShakerModuleView,
    HeaterShakerModuleId,
)
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.commands import heater_shaker
from opentrons.protocol_engine.commands.heater_shaker.close_latch import (
    CloseLatchImpl,
)


async def test_close_latch(
    decoy: Decoy, state_view: StateView, equipment: EquipmentHandler
) -> None:
    """It should be able to close the module's labware latch."""
    subject = CloseLatchImpl(state_view=state_view, equipment=equipment)
    data = heater_shaker.CloseLatchParams(moduleId="input-heater-shaker-id")

    hs_module_view = decoy.mock(cls=HeaterShakerModuleView)
    heater_shaker_hardware = decoy.mock(cls=HeaterShaker)

    decoy.when(
        state_view.modules.get_heater_shaker_module_view(
            module_id="input-heater-shaker-id"
        )
    ).then_return(hs_module_view)

    decoy.when(hs_module_view.module_id).then_return(
        HeaterShakerModuleId("heater-shaker-id")
    )

    decoy.when(
        equipment.get_module_hardware_api(HeaterShakerModuleId("heater-shaker-id"))
    ).then_return(heater_shaker_hardware)

    result = await subject.execute(data)
    decoy.verify(await heater_shaker_hardware.close_labware_latch(), times=1)
    assert result == heater_shaker.CloseLatchResult()


async def test_close_latch_virtual(
    decoy: Decoy, state_view: StateView, equipment: EquipmentHandler
) -> None:
    """It should no-op for virtual modules."""
    subject = CloseLatchImpl(state_view=state_view, equipment=equipment)
    data = heater_shaker.CloseLatchParams(moduleId="input-heater-shaker-id")

    hs_module_view = decoy.mock(cls=HeaterShakerModuleView)

    decoy.when(
        state_view.modules.get_heater_shaker_module_view(
            module_id="input-heater-shaker-id"
        )
    ).then_return(hs_module_view)

    decoy.when(hs_module_view.module_id).then_return(
        HeaterShakerModuleId("heater-shaker-id")
    )

    decoy.when(
        equipment.get_module_hardware_api(HeaterShakerModuleId("heater-shaker-id"))
    ).then_return(None)

    result = await subject.execute(data)

    assert result == heater_shaker.CloseLatchResult()
