import asyncio
from typing import AsyncIterator, Union, Type, TypeVar, Optional
from pathlib import Path
from unittest import mock

from packaging.version import Version
import pytest

from opentrons.hardware_control import ExecutionManager
from opentrons.hardware_control.modules import ModuleAtPort
from opentrons.hardware_control.modules.flex_stacker import FlexStacker
from opentrons.hardware_control.modules.types import (
    BundledFirmware,
    ModuleModel,
    MagneticModuleModel,
    TemperatureModuleModel,
    HeaterShakerModuleModel,
    ThermocyclerModuleModel,
    AbsorbanceReaderModel,
    FlexStackerModuleModel,
    ModuleType,
)
from opentrons.hardware_control.modules import (
    TempDeck,
    MagDeck,
    Thermocycler,
    HeaterShaker,
    AbsorbanceReader,
    AbstractModule,
    SimulatingModule,
    build as build_module,
)
from opentrons.hardware_control.modules.mod_abc import parse_fw_version
from opentrons.drivers.rpi_drivers.types import USBPort


async def test_get_modules_simulating() -> None:
    import opentrons.hardware_control as hardware_control

    mods = {
        "tempdeck": [
            SimulatingModule(serial_number="111", model="temperatureModuleV1")
        ],
        "magdeck": [SimulatingModule(serial_number="222", model="magneticModuleV2")],
        "thermocycler": [
            SimulatingModule(serial_number="333", model="thermocyclerModuleV1")
        ],
        "heatershaker": [
            SimulatingModule(serial_number="444", model="heaterShakerModuleV1")
        ],
        "absorbancereader": [
            SimulatingModule(serial_number="555", model="absorbanceReaderV1")
        ],
        "flexstacker": [
            SimulatingModule(serial_number="656", model="flexStackerModuleV1")
        ],
    }
    api = await hardware_control.API.build_hardware_simulator(attached_modules=mods)
    await asyncio.sleep(0.05)
    from_api = api.attached_modules
    assert sorted([mod.name() for mod in from_api]) == sorted(mods)
    for m in api.attached_modules:
        await m.cleanup()


async def test_module_caching() -> None:
    import opentrons.hardware_control as hardware_control

    mod_names = {
        "tempdeck": [SimulatingModule(serial_number="111", model="temperatureModuleV1")]
    }
    api = await hardware_control.API.build_hardware_simulator(
        attached_modules=mod_names
    )
    await asyncio.sleep(0.05)

    # Check that we can add and remove modules and the caching keeps up
    found_mods = api.attached_modules
    assert found_mods[0].name() == "tempdeck"
    await api._backend.module_controls.register_modules(
        new_mods_at_ports=[
            ModuleAtPort(port="/dev/ot_module_sim_magdeck1", name="magdeck")
        ]
    )
    with_magdeck = api.attached_modules.copy()
    assert len(with_magdeck) == 2
    assert with_magdeck[0] is found_mods[0]
    await api._backend.module_controls.register_modules(
        removed_mods_at_ports=[
            ModuleAtPort(port="/dev/ot_module_sim_tempdeck111", name="tempdeck")
        ]
    )
    only_magdeck = api.attached_modules.copy()

    assert only_magdeck[0] is with_magdeck[1]

    # Check that two modules of the same kind on different ports are
    # distinct
    await api._backend.module_controls.register_modules(
        new_mods_at_ports=[
            ModuleAtPort(port="/dev/ot_module_sim_magdeck2", name="magdeck")
        ]
    )
    two_magdecks = api.attached_modules
    assert len(two_magdecks) == 2
    assert two_magdecks[0] is with_magdeck[1]
    assert two_magdecks[1] is not two_magdecks[0]


@pytest.mark.parametrize(
    argnames=["module_model", "expected_sim_type"],
    argvalues=[
        (MagneticModuleModel.MAGNETIC_V1, MagDeck),
        (TemperatureModuleModel.TEMPERATURE_V1, TempDeck),
        (ThermocyclerModuleModel.THERMOCYCLER_V1, Thermocycler),
        (HeaterShakerModuleModel.HEATER_SHAKER_V1, HeaterShaker),
        (AbsorbanceReaderModel.ABSORBANCE_READER_V1, AbsorbanceReader),
        (FlexStackerModuleModel.FLEX_STACKER_V1, FlexStacker),
    ],
)
async def test_create_simulating_module(
    module_model: ModuleModel,
    expected_sim_type: Union[
        Type[MagDeck], Type[TempDeck], Type[Thermocycler], Type[HeaterShaker]
    ],
) -> None:
    """It should create simulating module instance for specified module."""
    import opentrons.hardware_control as hardware_control

    api = await hardware_control.API.build_hardware_simulator(attached_modules={})
    await asyncio.sleep(0.05)

    simulating_module = await api.create_simulating_module(module_model)
    assert isinstance(simulating_module, expected_sim_type)

    await simulating_module.cleanup()


@pytest.fixture
async def mod_tempdeck() -> AsyncIterator[AbstractModule]:

    usb_port = USBPort(
        name="",
        hub=False,
        port_number=0,
        device_path="/dev/ot_module_sim_tempdeck0",
    )

    tempdeck = await build_module(
        port="/dev/ot_module_sim_tempdeck0",
        usb_port=usb_port,
        type=ModuleType.TEMPERATURE,
        simulating=True,
        hw_control_loop=asyncio.get_running_loop(),
        execution_manager=ExecutionManager(),
        sim_model="temperatureModuleV2",
    )
    yield tempdeck
    await tempdeck.cleanup()


@pytest.fixture
async def mod_magdeck() -> AsyncIterator[AbstractModule]:
    usb_port = USBPort(
        name="",
        hub=False,
        port_number=0,
        device_path="/dev/ot_module_sim_magdeck0",
    )

    magdeck = await build_module(
        port="/dev/ot_module_sim_magdeck0",
        usb_port=usb_port,
        type=ModuleType.MAGNETIC,
        simulating=True,
        hw_control_loop=asyncio.get_running_loop(),
        execution_manager=ExecutionManager(),
    )
    yield magdeck
    await magdeck.cleanup()


@pytest.fixture
async def mod_thermocycler() -> AsyncIterator[AbstractModule]:
    usb_port = USBPort(
        name="",
        hub=False,
        port_number=0,
        device_path="/dev/ot_module_sim_thermocycler0",
    )

    thermocycler = await build_module(
        port="/dev/ot_module_sim_thermocycler0",
        usb_port=usb_port,
        type=ModuleType.THERMOCYCLER,
        simulating=True,
        hw_control_loop=asyncio.get_running_loop(),
        execution_manager=ExecutionManager(),
    )
    yield thermocycler
    await thermocycler.cleanup()


@pytest.fixture
async def mod_thermocycler_gen2() -> AsyncIterator[AbstractModule]:
    usb_port = USBPort(
        name="",
        hub=False,
        port_number=0,
        device_path="/dev/ot_module_sim_thermocycler0",
    )

    thermocycler = await build_module(
        port="/dev/ot_module_sim_thermocycler0",
        usb_port=usb_port,
        type=ModuleType.THERMOCYCLER,
        simulating=True,
        hw_control_loop=asyncio.get_running_loop(),
        execution_manager=ExecutionManager(),
        sim_model="thermocyclerModuleV2",
    )
    yield thermocycler
    await thermocycler.cleanup()


@pytest.fixture
async def mod_heatershaker() -> AsyncIterator[AbstractModule]:
    usb_port = USBPort(
        name="",
        hub=False,
        port_number=0,
        device_path="/dev/ot_module_sim_heatershaker0",
    )

    heatershaker = await build_module(
        port="/dev/ot_module_sim_heatershaker0",
        usb_port=usb_port,
        type=ModuleType.HEATER_SHAKER,
        simulating=True,
        hw_control_loop=asyncio.get_running_loop(),
        execution_manager=ExecutionManager(),
    )
    yield heatershaker
    await heatershaker.cleanup()


@pytest.fixture
async def mod_absorbancereader() -> AsyncIterator[AbstractModule]:
    usb_port = USBPort(
        name="",
        hub=False,
        port_number=0,
        device_path="/dev/ot_module_sim_absorbancereader0",
    )

    absorbancereader = await build_module(
        port="/dev/ot_module_sim_absorbancereader0",
        usb_port=usb_port,
        type=ModuleType.ABSORBANCE_READER,
        simulating=True,
        hw_control_loop=asyncio.get_running_loop(),
        execution_manager=ExecutionManager(),
    )
    yield absorbancereader
    await absorbancereader.cleanup()


@pytest.fixture
async def mod_flexstacker() -> AsyncIterator[AbstractModule]:
    usb_port = USBPort(
        name="",
        hub=False,
        port_number=0,
        device_path="/dev/ot_module_sim_flexstacker0",
    )

    flexstacker = await build_module(
        port="/dev/ot_module_sim_flexstacker0",
        usb_port=usb_port,
        type=ModuleType.FLEX_STACKER,
        simulating=True,
        hw_control_loop=asyncio.get_running_loop(),
        execution_manager=ExecutionManager(),
    )
    yield flexstacker
    await flexstacker.cleanup()


async def test_module_update_integration(  # noqa: C901
    monkeypatch: pytest.MonkeyPatch,
    mod_tempdeck: AbstractModule,
    mod_magdeck: AbstractModule,
    mod_thermocycler: AbstractModule,
    mod_heatershaker: AbstractModule,
    mod_thermocycler_gen2: AbstractModule,
    mod_absorbancereader: AbstractModule,
    mod_flexstacker: AbstractModule,
) -> None:
    from opentrons.hardware_control import modules

    T = TypeVar("T")

    def async_return(result: T) -> "asyncio.Future[T]":
        f: "asyncio.Future[T]" = asyncio.Future()
        f.set_result(result)
        return f

    bootloader_kwargs = {
        "stdout": asyncio.subprocess.PIPE,
        "stderr": asyncio.subprocess.PIPE,
        "module": mod_tempdeck,
    }

    upload_via_avrdude_mock = mock.Mock(
        return_value=(async_return((True, "avrdude bootloader worked")))
    )
    monkeypatch.setattr(modules.update, "upload_via_avrdude", upload_via_avrdude_mock)

    async def mock_find_avrdude_bootloader_port() -> str:
        return "ot_module_avrdude_bootloader1"

    monkeypatch.setattr(
        modules.update, "find_bootloader_port", mock_find_avrdude_bootloader_port
    )

    # test temperature module update with avrdude bootloader
    bootloader_kwargs["module"] = mod_tempdeck
    await modules.update_firmware(mod_tempdeck, "fake_fw_file_path")
    upload_via_avrdude_mock.assert_called_once_with(
        "ot_module_avrdude_bootloader1", "fake_fw_file_path", bootloader_kwargs
    )
    upload_via_avrdude_mock.reset_mock()

    # test magnetic module update with avrdude bootloader
    bootloader_kwargs["module"] = mod_magdeck
    await modules.update_firmware(mod_magdeck, "fake_fw_file_path")
    upload_via_avrdude_mock.assert_called_once_with(
        "ot_module_avrdude_bootloader1", "fake_fw_file_path", bootloader_kwargs
    )

    # test thermocycler module update with bossa bootloader
    upload_via_bossa_mock = mock.Mock(
        return_value=(async_return((True, "bossa bootloader worked")))
    )
    monkeypatch.setattr(modules.update, "upload_via_bossa", upload_via_bossa_mock)

    async def mock_find_bossa_bootloader_port() -> str:
        return "ot_module_bossa_bootloader1"

    monkeypatch.setattr(
        modules.update, "find_bootloader_port", mock_find_bossa_bootloader_port
    )

    bootloader_kwargs["module"] = mod_thermocycler
    await modules.update_firmware(mod_thermocycler, "fake_fw_file_path")
    upload_via_bossa_mock.assert_called_once_with(
        "ot_module_bossa_bootloader1", "fake_fw_file_path", bootloader_kwargs
    )

    # test heater-shaker module update with dfu bootloader
    upload_via_dfu_mock = mock.Mock(
        return_value=(async_return((True, "dfu bootloader worked")))
    )
    monkeypatch.setattr(modules.update, "upload_via_dfu", upload_via_dfu_mock)

    async def mock_find_dfu_device_hs(pid: str, expected_device_count: int) -> str:
        if expected_device_count == 2:
            return "df11"
        return "none"

    monkeypatch.setattr(modules.update, "find_dfu_device", mock_find_dfu_device_hs)

    bootloader_kwargs["module"] = mod_heatershaker
    await modules.update_firmware(mod_heatershaker, "fake_fw_file_path")
    upload_via_dfu_mock.assert_called_once_with(
        "df11", "fake_fw_file_path", bootloader_kwargs
    )
    upload_via_dfu_mock.reset_mock()

    # test thermocycler-gen2 module update with dfu bootloader
    async def mock_find_dfu_device_tc2(pid: str, expected_device_count: int) -> str:
        if expected_device_count == 3:
            return "df11"
        return "none"

    monkeypatch.setattr(modules.update, "find_dfu_device", mock_find_dfu_device_tc2)

    bootloader_kwargs["module"] = mod_thermocycler_gen2
    await modules.update_firmware(mod_thermocycler_gen2, "fake_fw_file_path")
    upload_via_dfu_mock.assert_called_once_with(
        "df11", "fake_fw_file_path", bootloader_kwargs
    )
    upload_via_dfu_mock.reset_mock()

    # Test absorbancereader update with byonoy library
    bootloader_kwargs["module"] = mod_absorbancereader
    byonoy_update_firmware_mock = mock.Mock(return_value=(async_return((True, ""))))
    mod_absorbancereader._driver.update_firmware = byonoy_update_firmware_mock  # type: ignore

    assert not mod_absorbancereader.updating
    await modules.update_firmware(mod_absorbancereader, "fake_fw_file_path")
    byonoy_update_firmware_mock.assert_called_once_with("fake_fw_file_path")
    assert not mod_absorbancereader.updating

    # test flex stacker update with dfu bootloader
    async def mock_find_dfu_device_fs2(pid: str, expected_device_count: int) -> str:
        if expected_device_count == 3:
            return "df11"
        return "none"

    monkeypatch.setattr(modules.update, "find_dfu_device", mock_find_dfu_device_fs2)

    bootloader_kwargs["module"] = mod_flexstacker
    await modules.update_firmware(mod_flexstacker, "fake_fw_file_path")
    upload_via_dfu_mock.assert_called_once_with(
        "df11", "fake_fw_file_path", bootloader_kwargs
    )


async def test_get_bundled_fw(monkeypatch: pytest.MonkeyPatch, tmpdir: Path) -> None:
    from opentrons.hardware_control import modules

    dummy_td_file = Path(tmpdir) / "temperature-module@v1.2.3.hex"
    dummy_td_file.write_text("hello")

    dummy_md_file = Path(tmpdir) / "magnetic-module@v3.2.1.hex"
    dummy_md_file.write_text("hello")

    dummy_tc_file = Path(tmpdir) / "thermocycler@v0.1.2.bin"
    dummy_tc_file.write_text("hello")

    dummy_hs_file = Path(tmpdir) / "heater-shaker@v2.10.2.bin"
    dummy_hs_file.write_text("hello")

    dummy_abs_file = Path(tmpdir) / "absorbance-96@v1.0.2.byoup"
    dummy_abs_file.write_text("hello")

    dummy_fs_file = Path(tmpdir) / "flex-stacker@v7.0.0.bin"
    dummy_fs_file.write_text("hello")

    dummy_bogus_file = Path(tmpdir) / "thermoshaker@v6.6.6.bin"
    dummy_bogus_file.write_text("hello")

    monkeypatch.setattr(modules.mod_abc, "ROBOT_FIRMWARE_DIR", Path(tmpdir))
    monkeypatch.setattr(modules.mod_abc, "IS_ROBOT", True)

    from opentrons.hardware_control import API

    mods = {
        "tempdeck": [
            SimulatingModule(serial_number="111", model="temperatureModuleV1")
        ],
        "magdeck": [SimulatingModule(serial_number="222", model="magneticModuleV2")],
        "thermocycler": [
            SimulatingModule(serial_number="333", model="thermocyclerModuleV1")
        ],
        "heatershaker": [
            SimulatingModule(serial_number="444", model="heaterShakerModuleV1")
        ],
        "absorbancereader": [
            SimulatingModule(serial_number="555", model="absorbanceReaderV1")
        ],
        "flexstacker": [
            SimulatingModule(serial_number="656", model="flexStackerModuleV1")
        ],
    }

    api = await API.build_hardware_simulator(attached_modules=mods)
    await asyncio.sleep(0.05)

    assert api.attached_modules[0].bundled_fw == BundledFirmware(
        version="1.2.3", path=dummy_td_file
    )
    assert api.attached_modules[1].bundled_fw == BundledFirmware(
        version="3.2.1", path=dummy_md_file
    )
    assert api.attached_modules[2].bundled_fw == BundledFirmware(
        version="0.1.2", path=dummy_tc_file
    )
    assert api.attached_modules[3].bundled_fw == BundledFirmware(
        version="2.10.2", path=dummy_hs_file
    )
    assert api.attached_modules[4].bundled_fw == BundledFirmware(
        version="1.0.2", path=dummy_abs_file
    )
    assert api.attached_modules[5].bundled_fw == BundledFirmware(
        version="7.0.0", path=dummy_fs_file
    )
    for m in api.attached_modules:
        await m.cleanup()


async def test_get_thermocycler_bundled_fw(
    mod_thermocycler: AbstractModule,
    mod_thermocycler_gen2: AbstractModule,
    monkeypatch: pytest.MonkeyPatch,
    tmpdir: Path,
) -> None:
    from opentrons.hardware_control import modules

    dummy_tc_file = Path(tmpdir) / "thermocycler@v0.1.2.bin"
    dummy_tc_file.write_text("hello")
    dummy_tc2_file = Path(tmpdir) / "thermocycler-gen2@v1.9.9.bin"
    dummy_tc2_file.write_text("hello")

    monkeypatch.setattr(modules.mod_abc, "ROBOT_FIRMWARE_DIR", Path(tmpdir))
    monkeypatch.setattr(modules.mod_abc, "IS_ROBOT", True)

    assert mod_thermocycler.get_bundled_fw() == BundledFirmware(
        version="0.1.2", path=dummy_tc_file
    )
    assert mod_thermocycler_gen2.get_bundled_fw() == BundledFirmware(
        version="1.9.9", path=dummy_tc2_file
    )


@pytest.mark.parametrize(
    "revision,model",
    [
        ("mag_deck_v1.1", "magneticModuleV1"),
        ("mag_deck_v20", "magneticModuleV2"),
        ("", "magneticModuleV1"),
        ("asdasdadvasdasd", "magneticModuleV1"),
        (None, "magneticModuleV1"),
    ],
)
def test_magnetic_module_revision_parsing(revision: Optional[str], model: str) -> None:
    assert MagDeck._model_from_revision(revision) == model


@pytest.mark.parametrize(
    "revision,model",
    [
        ("temp_deck_v1.1", "temperatureModuleV1"),
        ("temp_deck_v3.0", "temperatureModuleV1"),
        ("temp_deck_v4.0", "temperatureModuleV1"),
        ("temp_deck_v15", "temperatureModuleV1"),
        ("temp_deck_v20", "temperatureModuleV2"),
        ("", "temperatureModuleV1"),
        ("v", "temperatureModuleV1"),
        (None, "temperatureModuleV1"),
    ],
)
def test_temperature_module_revision_parsing(
    revision: Optional[str], model: str
) -> None:
    assert TempDeck._model_from_revision(revision) == model


@pytest.mark.parametrize(
    argnames=["device_version", "expected_result"],
    argvalues=[
        ["v1.0.4", Version("v1.0.4")],
        ["v0.5.6", Version("v0.5.6")],
        ["v1.0.4-dhfs", Version("v0.0.0")],
        ["v3.0.dshjfd", Version("v0.0.0")],
    ],
)
async def test_catch_invalid_fw_version(
    device_version: str,
    expected_result: bool,
) -> None:
    """Assert that invalid firmware versions prompt a valid Version object of v0.0.0."""
    assert parse_fw_version(device_version) == expected_result
