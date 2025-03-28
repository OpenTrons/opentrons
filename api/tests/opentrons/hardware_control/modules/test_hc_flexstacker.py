import asyncio
import pytest
import mock
from typing import AsyncGenerator
from opentrons.hardware_control import modules, ExecutionManager
from opentrons.drivers.rpi_drivers.types import USBPort


@pytest.fixture
def usb_port() -> USBPort:
    return USBPort(
        name="",
        port_number=0,
        device_path="/dev/ot_module_sim_flexstacker0",
    )


@pytest.fixture
async def simulating_module(
    usb_port: USBPort,
) -> AsyncGenerator[modules.AbstractModule, None]:
    module = await modules.build(
        port=usb_port.device_path,
        usb_port=usb_port,
        type=modules.ModuleType["FLEX_STACKER"],
        simulating=True,
        hw_control_loop=asyncio.get_running_loop(),
        execution_manager=ExecutionManager(),
    )
    assert isinstance(module, modules.AbstractModule)
    try:
        yield module
    finally:
        await module.cleanup()


@pytest.fixture
async def simulating_module_driver_patched(
    simulating_module: modules.FlexStacker,
) -> AsyncGenerator[modules.AbstractModule, None]:
    driver_mock = mock.MagicMock()
    with mock.patch.object(
        simulating_module, "_driver", driver_mock
    ), mock.patch.object(simulating_module._reader, "_driver", driver_mock):
        yield simulating_module


async def test_sim_state(simulating_module: modules.FlexStacker) -> None:
    status = simulating_module.device_info
    assert status["serial"] == "dummySerialFS"
    assert status["model"] == "a1"
    assert status["version"] == "stacker-fw"
