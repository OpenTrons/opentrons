import asyncio
from typing import AsyncGenerator

import anyio
import pytest

from opentrons.drivers.rpi_drivers.types import USBPort
from opentrons.hardware_control import ExecutionManager
from opentrons.hardware_control.emulation.settings import Settings
from opentrons.hardware_control.modules import Thermocycler
from opentrons.hardware_control.modules.types import TemperatureStatus


@pytest.fixture
def execution_manager() -> ExecutionManager:
    """Return the ExecutionManager used by the Thermocycler test subject."""
    return ExecutionManager()


@pytest.fixture
async def thermocycler(
    emulation_app: None,
    emulator_settings: Settings,
    execution_manager: ExecutionManager,
) -> AsyncGenerator[Thermocycler, None]:
    """Return a Thermocycler test subject."""
    module = await Thermocycler.build(
        port=f"socket://127.0.0.1:{emulator_settings.thermocycler_proxy.driver_port}",
        execution_manager=execution_manager,
        usb_port=USBPort(name="", port_number=1, device_path="", hub=1),
        loop=asyncio.get_running_loop(),
        polling_frequency=0.01,
    )
    yield module
    await execution_manager.cancel()
    await module.cleanup()


def test_device_info(thermocycler: Thermocycler) -> None:
    """It should have device info."""
    assert {
        "model": "v02",
        "serial": "thermocycler_emulator",
        "version": "v1.1.0",
    } == thermocycler.device_info


async def test_lid_status(thermocycler: Thermocycler) -> None:
    """It should run open and close lid."""
    await thermocycler.wait_next_poll()
    assert thermocycler.lid_status == "open"

    await thermocycler.close()
    assert thermocycler.lid_status == "closed"

    await thermocycler.open()
    assert thermocycler.lid_status == "open"


async def test_lid_temperature(thermocycler: Thermocycler) -> None:
    """It should change lid temperature."""
    await thermocycler.set_lid_temperature(temperature=50)
    assert thermocycler.lid_target == 50

    await thermocycler.set_lid_temperature(temperature=40)
    assert thermocycler.lid_target == 40

    await thermocycler.deactivate_lid()
    await thermocycler.wait_next_poll()
    assert thermocycler.lid_target is None


async def test_plate_temperature(thermocycler: Thermocycler) -> None:
    """It should change  plate temperature."""
    await thermocycler.set_temperature(temperature=52, hold_time_seconds=10)
    assert thermocycler.temperature == 52

    await thermocycler.set_temperature(temperature=55, hold_time_seconds=None)
    assert thermocycler.temperature == 55

    await thermocycler.set_temperature(temperature=80, hold_time_seconds=1)
    assert thermocycler.temperature == 80

    await thermocycler.deactivate_block()
    await thermocycler.wait_next_poll()
    assert thermocycler.target is None


async def test_cycle_temperatures(thermocycler: Thermocycler) -> None:
    """It should cycle the temperature."""
    assert thermocycler.current_cycle_index is None
    assert thermocycler.current_step_index is None
    assert thermocycler.total_cycle_count is None
    assert thermocycler.total_step_count is None

    steps = [
        {
            "temperature": 70.0,
        },
        {
            "temperature": 60.0,
            "hold_time_minutes": 1.0,
        },
        {
            "temperature": 50.0,
            "hold_time_seconds": 22.0,
        },
    ]
    await thermocycler.cycle_temperatures(steps, repetitions=2)

    # Check that final temperature was reached.
    assert thermocycler.temperature == 50
    # Check that cycle state is correct.
    assert thermocycler.current_cycle_index == 2
    assert thermocycler.current_step_index == 3
    assert thermocycler.total_cycle_count == 2
    assert thermocycler.total_step_count == 3

    # Now deactivate block to check that cycle state is cleared
    await thermocycler.deactivate_block()

    assert thermocycler.current_cycle_index is None
    assert thermocycler.current_step_index is None
    assert thermocycler.total_cycle_count is None
    assert thermocycler.total_step_count is None


async def test_wait_for_temperatures(thermocycler: Thermocycler) -> None:
    """It should wait for temperature and be at holding status"""
    await thermocycler.set_target_block_temperature(40.0)
    await thermocycler.set_target_lid_temperature(50.0)
    await thermocycler.wait_for_block_temperature(temperature=40.0)
    await thermocycler.wait_for_lid_temperature(temperature=50.0)
    assert thermocycler.status == TemperatureStatus.HOLDING
    assert thermocycler.lid_temp_status == TemperatureStatus.HOLDING


async def test_cycle_cannot_be_interrupted_by_pause(
    thermocycler: Thermocycler,
    execution_manager: ExecutionManager,
) -> None:
    """If the execution manager is paused, it should not suspend the current cycle.

    https://github.com/Opentrons/opentrons/issues/5496
    """
    temp_1 = 40.0
    temp_2 = 50.0
    final_temp = 60.0

    # Start at a known temperature.
    await thermocycler.set_temperature(temperature=temp_1)

    # Oscillate between two temperatures for a while
    # and then end on a third temperature.
    steps = [
        *[
            {"temperature": temp_1},
            {"temperature": temp_2},
        ]
        * 10,
        {"temperature": final_temp},
    ]

    cycle_temperatures_task = asyncio.create_task(
        thermocycler.cycle_temperatures(steps=steps, repetitions=1)
    )

    # Sleep until we're somewhere in the middle of the steps, probably mid-ramp.
    # The overall time to complete all steps depends on the temperature change required,
    # the emulator's poll frequency, and the emulator's temperature change per poll.
    # We rely on this sleep time being less than whatever that is.
    await asyncio.sleep(0.1)
    # Make sure we're actually in the middle of the steps.
    assert thermocycler.temperature != final_temp

    # 10 poll/sec
    # 1 deg / poll  (10 deg/sec)
    #
    await execution_manager.pause()

    # All of the steps should complete, despite the pause.
    #
    # If the subject has a bug where the pause actually takes effect,
    # this would stall forever. The anyio.fail_after() turns that into a TimeoutError
    # for nicer reporting.
    with anyio.fail_after(10):
        await cycle_temperatures_task
        assert thermocycler.temperature == final_temp


async def test_cycle_can_be_blocked_by_preexisting_pause(
    thermocycler: Thermocycler,
    execution_manager: ExecutionManager,
) -> None:
    """A pre-existing pause should block a new cycle from starting.

    Not to be confused with a pause that happens in the middle of a cycle.
    """
    temp_1 = 40.0
    temp_2 = 50.0

    await thermocycler.set_temperature(temperature=temp_1)

    await execution_manager.pause()

    with pytest.raises(TimeoutError):
        with anyio.fail_after(1.0):
            # Should block forever, if not for the anyio.fail_after().
            steps = [{"temperature": temp_2}]
            await thermocycler.cycle_temperatures(steps=steps, repetitions=1)

    assert thermocycler.temperature == temp_1


async def test_cycle_can_be_cancelled(
    thermocycler: Thermocycler,
    execution_manager: ExecutionManager,
) -> None:
    """A cycle should be cancellable (even though it isn't pausable)."""
    temp_1 = 40.0
    temp_2 = 50.0
    final_temp = 60.0

    # Start at a known temperature.
    await thermocycler.set_temperature(temperature=temp_1)

    # Oscillate between two temperatures for a while
    # and then end on a third temperature.
    steps = [
        *[
            {"temperature": temp_1},
            {"temperature": temp_2},
        ]
        * 10,
        {"temperature": final_temp},
    ]

    cycle_temperatures_task = asyncio.create_task(
        thermocycler.cycle_temperatures(steps=steps, repetitions=1)
    )

    # Sleep until we're somewhere in the middle of the steps, probably mid-ramp.
    # The overall time to complete all steps depends on the temperature change required,
    # the emulator's poll frequency, and the emulator's temperature change per poll.
    # We rely on this sleep time being less than whatever that is.
    await asyncio.sleep(0.1)
    # Make sure we're actually in the middle of the steps.
    assert thermocycler.temperature != final_temp

    await execution_manager.cancel()

    with pytest.raises(asyncio.CancelledError):
        await cycle_temperatures_task
