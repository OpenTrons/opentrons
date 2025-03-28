import asyncio
import logging
from typing import Any, Callable, Dict, Optional, Mapping, List, Tuple

from opentrons.drivers.rpi_drivers.types import USBPort
from opentrons.drivers.absorbance_reader import (
    AbstractAbsorbanceReaderDriver,
    AbsorbanceReaderDriver,
    SimulatingDriver,
)
from opentrons.drivers.types import (
    AbsorbanceReaderLidStatus,
    AbsorbanceReaderPlatePresence,
    AbsorbanceReaderDeviceState,
    ABSMeasurementMode,
    ABSMeasurementConfig,
)

from opentrons.hardware_control.execution_manager import ExecutionManager
from opentrons.hardware_control.poller import Poller, Reader
from opentrons.hardware_control.modules import mod_abc
from opentrons.hardware_control.modules.types import (
    ModuleDisconnectedCallback,
    ModuleType,
    AbsorbanceReaderStatus,
    LiveData,
    AbsorbanceReaderData,
    UploadFunction,
)
from opentrons.hardware_control.modules.errors import AbsorbanceReaderDisconnectedError

log = logging.getLogger(__name__)


POLLING_FREQUENCY_SEC = 2.0
SIM_POLLING_FREQUENCY_SEC = POLLING_FREQUENCY_SEC / 50.0


class AbsorbanceReaderReader(Reader):
    """Read data from the Absorbance Reader.

    Args:
        driver: A connected Absorbance Reader driver.
    """

    device_state: AbsorbanceReaderDeviceState
    lid_status: AbsorbanceReaderLidStatus
    plate_presence: AbsorbanceReaderPlatePresence
    supported_wavelengths: List[int]
    error: Optional[str]

    def __init__(self, driver: AbstractAbsorbanceReaderDriver) -> None:
        self.device_state = AbsorbanceReaderDeviceState.UNKNOWN
        self.lid_status = AbsorbanceReaderLidStatus.UNKNOWN
        self.plate_presence = AbsorbanceReaderPlatePresence.UNKNOWN
        self.supported_wavelengths = []
        self.uptime = 0
        self._driver = driver
        self._handle_error: Optional[Callable[[Exception], None]] = None

    async def read(self) -> None:
        await self.get_lid_status()
        await self.get_device_status()
        await self.get_plate_presence()
        if not self.supported_wavelengths:
            await self.get_supported_wavelengths()

    async def get_device_status(self) -> None:
        """Get the Absorbance Reader's current status."""
        self.device_state = await self._driver.get_status()

    async def get_device_uptime(self) -> None:
        """Get the device uptime in seconds."""
        self.uptime = await self._driver.get_uptime()

    async def get_supported_wavelengths(self) -> None:
        """Get the Absorbance Reader's supported wavelengths."""
        self.supported_wavelengths = await self._driver.get_available_wavelengths()

    async def get_lid_status(self) -> None:
        """Get the Absorbance Reader's lid status."""
        self.lid_status = await self._driver.get_lid_status()

    async def get_plate_presence(self) -> None:
        """Get the Absorbance Reader's plate presence."""
        self.plate_presence = await self._driver.get_plate_presence()

    def on_error(self, exception: Exception) -> None:
        if self._handle_error is not None:
            self._handle_error(exception)

    def register_error_handler(self, handle_error: Callable[[Exception], None]) -> None:
        self._handle_error = handle_error


class AbsorbanceReader(mod_abc.AbstractModule):
    """Hardware control interface for an attached Absorbance Reader module."""

    MODULE_TYPE = ModuleType.ABSORBANCE_READER

    @classmethod
    async def build(
        cls,
        port: str,
        usb_port: USBPort,
        execution_manager: ExecutionManager,
        hw_control_loop: asyncio.AbstractEventLoop,
        poll_interval_seconds: Optional[float] = None,
        simulating: bool = False,
        sim_model: Optional[str] = None,
        sim_serial_number: Optional[str] = None,
        disconnected_callback: ModuleDisconnectedCallback = None,
    ) -> "AbsorbanceReader":
        """
        Build and connect to an AbsorbanceReader

        Args:
            port: The port to connect to
            usb_port: USB Port
            execution_manager: Execution manager.
            hw_control_loop: The event loop running in the hardware control thread.
            poll_interval_seconds: Poll interval override.
            simulating: whether to build a simulating driver
            sim_model: The model name used by simulator
            sim_serial_number: The serial number used by simulator
            disconnected_callback: Callback to inform the module controller that the device was disconnected

        Returns:
            AbsorbanceReader instance.

        """
        driver: AbstractAbsorbanceReaderDriver
        if not simulating:
            driver = await AbsorbanceReaderDriver.create(
                port, usb_port, hw_control_loop
            )
            await driver.connect()
            poll_interval_seconds = poll_interval_seconds or POLLING_FREQUENCY_SEC
        else:
            driver = SimulatingDriver(model=sim_model, serial_number=sim_serial_number)
            poll_interval_seconds = poll_interval_seconds or SIM_POLLING_FREQUENCY_SEC

        reader = AbsorbanceReaderReader(driver=driver)
        poller = Poller(reader=reader, interval=poll_interval_seconds)
        module = cls(
            port=port,
            usb_port=usb_port,
            driver=driver,
            reader=reader,
            poller=poller,
            device_info=await driver.get_device_info(),
            hw_control_loop=hw_control_loop,
            execution_manager=execution_manager,
            disconnected_callback=disconnected_callback,
        )

        try:
            await poller.start()
        except Exception:
            log.exception(f"First read of AbsorbanceReader on port {port} failed")

        return module

    def __init__(
        self,
        port: str,
        usb_port: USBPort,
        driver: AbstractAbsorbanceReaderDriver,
        reader: AbsorbanceReaderReader,
        poller: Poller,
        device_info: Mapping[str, str],
        execution_manager: ExecutionManager,
        hw_control_loop: asyncio.AbstractEventLoop,
        disconnected_callback: ModuleDisconnectedCallback = None,
    ) -> None:
        """
        Constructor

        Args:
            port: The port the absorbance is connected to.
            usb_port: The USB port.
            execution_manager: The hardware execution manager.
            driver: The Absorbance driver.
            reader: An interface to read data from the Absorbance Reader.
            poller: A poll controller for reads.
            device_info: The Absorbance device info.
            hw_control_loop: The event loop running in the hardware control thread.
        """
        self._driver = driver
        super().__init__(
            port=port,
            usb_port=usb_port,
            hw_control_loop=hw_control_loop,
            execution_manager=execution_manager,
            disconnected_callback=disconnected_callback,
        )
        self._device_info = device_info
        self._reader = reader
        self._poller = poller
        self._measurement_config: Optional[ABSMeasurementConfig] = None
        self._device_status = AbsorbanceReaderStatus.IDLE
        self._error: Optional[str] = None
        self._reader.register_error_handler(self._enter_error_state)

    @property
    def status(self) -> AbsorbanceReaderStatus:
        """Return some string describing the device status."""
        state = self._reader.device_state
        if state not in [
            AbsorbanceReaderDeviceState.UNKNOWN,
            AbsorbanceReaderDeviceState.OK,
        ]:
            return AbsorbanceReaderStatus.ERROR
        return self._device_status

    @property
    def lid_status(self) -> AbsorbanceReaderLidStatus:
        return self._reader.lid_status

    @property
    def plate_presence(self) -> AbsorbanceReaderPlatePresence:
        return self._reader.plate_presence

    @property
    def uptime(self) -> int:
        """Time in ms this device has been running for."""
        return self._reader.uptime

    @property
    def supported_wavelengths(self) -> List[int]:
        """The wavelengths in nm this plate reader supports."""
        return self._reader.supported_wavelengths

    @property
    def measurement_config(self) -> Optional[ABSMeasurementConfig]:
        return self._measurement_config

    @property
    def device_info(self) -> Mapping[str, str]:
        """Return a dict of the module's static information (serial, etc)"""
        return self._device_info

    @property
    def live_data(self) -> LiveData:
        """Return a dict of the module's dynamic information"""
        conf = self._measurement_config.data if self._measurement_config else dict()
        data: AbsorbanceReaderData = {
            "uptime": self.uptime,
            "deviceStatus": self.status.value,
            "lidStatus": self.lid_status.value,
            "platePresence": self.plate_presence.value,
            "measureMode": conf.get("measureMode", ""),
            "sampleWavelengths": conf.get("sampleWavelengths", []),
            "referenceWavelength": conf.get("referenceWavelength", 0),
        }
        return {
            "status": self.status.value,
            "data": data,
        }

    @property
    def is_simulated(self) -> bool:
        """True if this is a simulated module."""
        return isinstance(self._driver, SimulatingDriver)

    @property
    def port(self) -> str:
        """The virtual port where the module is connected."""
        return self._port

    @property
    def usb_port(self) -> USBPort:
        """The physical port where the module is connected."""
        return self._usb_port

    async def deactivate(self, must_be_running: bool = True) -> None:
        """Deactivate the module."""
        pass

    async def wait_for_is_running(self) -> None:
        if not self.is_simulated:
            await self._execution_manager.wait_for_is_running()

    async def prep_for_update(self) -> str:
        """Prepare for an update.

        By the time this coroutine completes, the hardware should be ready
        to take an update. This implicitly tears down the module instance;
        it does not need to be either working or recoverable after this
        coroutine completes.

        :returns str: The port we're running on.
        """
        await self._poller.stop()
        return self.port

    @classmethod
    def name(cls) -> str:
        """A shortname used for matching usb ports, among other things"""
        return "absorbancereader"

    def model(self) -> str:
        """A name for this specific module, matching module defs"""
        return "absorbanceReaderV1"

    def firmware_prefix(self) -> str:
        """The prefix used for looking up firmware"""
        return "absorbance-96"

    async def update_device(self, firmware_file_path: str) -> Tuple[bool, str]:
        """Updates the firmware on the device."""
        if self._updating:
            return False, f"Device {self.serial_number} already updating."
        log.debug(f"Updating {self.name}: {self.port} with {firmware_file_path}")
        self._updating = True
        success, res = await self._driver.update_firmware(firmware_file_path)
        # it takes time for the plate reader to re-init after an update.
        await asyncio.sleep(10)
        self._device_info = await self._driver.get_device_info()
        await self._poller.start()
        self._updating = False
        return success, res

    def bootloader(self) -> UploadFunction:
        async def _update_function(
            port: str, firmware_file_path: str, kwargs: Dict[str, Any]
        ) -> Tuple[bool, str]:
            module: AbsorbanceReader = kwargs["module"]
            return await module.update_device(firmware_file_path)

        return _update_function

    async def cleanup(self) -> None:
        """Clean up the module instance.

        Clean up, i.e. stop pollers, disconnect serial, etc in preparation for
        object destruction.
        """
        await self._poller.stop()
        await self._driver.disconnect()

    async def set_sample_wavelength(
        self,
        mode: ABSMeasurementMode,
        wavelengths: List[int],
        reference_wavelength: Optional[int] = None,
    ) -> None:
        """Set the Absorbance Reader's measurement mode and active wavelength."""
        if mode == ABSMeasurementMode.SINGLE:
            assert (
                len(wavelengths) == 1
            ), "Cannot initialize single read mode with more than 1 wavelength."

        await self._driver.initialize_measurement(wavelengths, mode)
        self._measurement_config = ABSMeasurementConfig(
            measure_mode=mode,
            sample_wavelengths=wavelengths,
            reference_wavelength=reference_wavelength,
        )

    async def start_measure(self) -> List[List[float]]:
        """Initiate a measurement depending on the measurement mode."""
        try:
            self._device_status = AbsorbanceReaderStatus.MEASURING
            return await self._driver.get_measurement()
        finally:
            self._device_status = AbsorbanceReaderStatus.IDLE

    async def get_current_lid_status(self) -> AbsorbanceReaderLidStatus:
        """Get the Absorbance Reader's current lid status."""
        await self._reader.get_lid_status()
        return self._reader.lid_status

    def _enter_error_state(self, error: Exception) -> None:
        self._error = str(error)
        if isinstance(error, AbsorbanceReaderDisconnectedError):
            self.disconnected_callback()
