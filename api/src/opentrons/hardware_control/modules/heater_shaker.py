from __future__ import annotations

import asyncio
import logging
from typing import Optional, Mapping
from typing_extensions import Final

from opentrons.drivers.rpi_drivers.types import USBPort
from opentrons.drivers.heater_shaker.driver import HeaterShakerDriver
from opentrons.drivers.heater_shaker.abstract import AbstractHeaterShakerDriver
from opentrons.drivers.heater_shaker.simulator import SimulatingDriver
from opentrons.drivers.types import Temperature, RPM, HeaterShakerLabwareLatchStatus
from opentrons.hardware_control.execution_manager import ExecutionManager
from opentrons.hardware_control.poller import Reader, Poller
from opentrons.hardware_control.modules import mod_abc, update
from opentrons.hardware_control.modules.types import (
    ModuleDisconnectedCallback,
    ModuleType,
    TemperatureStatus,
    SpeedStatus,
    HeaterShakerStatus,
    UploadFunction,
    LiveData,
    HeaterShakerData,
)

log = logging.getLogger(__name__)

POLL_PERIOD = 1.0

# TODO(mc, 2022-06-14): this techinque copied from temperature module
# to speed up simulation of heater-shaker protocols, but it's pretty silly
# module simulation in PAPIv2 needs to be seriously rethought
SIMULATING_POLL_PERIOD = POLL_PERIOD / 20.0

DFU_PID = "df11"


class HeaterShaker(mod_abc.AbstractModule):
    """Hardware control interface for an attached Heater-Shaker module."""

    MODULE_TYPE = ModuleType.HEATER_SHAKER

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
    ) -> "HeaterShaker":
        """
        Build a HeaterShaker

        Args:
            port: The port to connect to
            usb_port: USB Port
            execution_manager: Execution manager.
            hw_control_loop: The event loop running in the hardware control thread.
            poll_interval_seconds: Poll interval override.
            simulating: whether to build a simulating driver
            loop: Loop
            sim_model: The model name used by simulator
            disconnected_callback: Callback to inform the module controller that the device was disconnected

        Returns:
            HeaterShaker instance
        """
        driver: AbstractHeaterShakerDriver
        if not simulating:
            driver = await HeaterShakerDriver.create(port=port, loop=hw_control_loop)
            poll_interval_seconds = poll_interval_seconds or POLL_PERIOD
        else:
            driver = SimulatingDriver(serial_number=sim_serial_number)
            poll_interval_seconds = poll_interval_seconds or SIMULATING_POLL_PERIOD

        reader = HeaterShakerReader(driver=driver)
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
            log.exception(f"First read of Heater-Shaker on port {port} failed")

        return module

    def __init__(
        self,
        port: str,
        usb_port: USBPort,
        execution_manager: ExecutionManager,
        driver: AbstractHeaterShakerDriver,
        reader: HeaterShakerReader,
        poller: Poller,
        device_info: Mapping[str, str],
        hw_control_loop: asyncio.AbstractEventLoop,
        disconnected_callback: ModuleDisconnectedCallback = None,
    ):
        super().__init__(
            port=port,
            usb_port=usb_port,
            hw_control_loop=hw_control_loop,
            execution_manager=execution_manager,
            disconnected_callback=disconnected_callback,
        )
        self._device_info = device_info
        self._driver = driver
        self._reader = reader
        self._poller = poller

    async def cleanup(self) -> None:
        """Stop the poller task"""
        await self._poller.stop()
        await self._driver.disconnect()

    @classmethod
    def name(cls) -> str:
        """Used for picking up serial port symlinks"""
        return "heatershaker"

    def firmware_prefix(self) -> str:
        """The prefix used for looking up firmware"""
        return "heater-shaker"

    @staticmethod
    def _model_from_revision(revision: Optional[str]) -> str:
        """Defines the revision -> model mapping"""
        return "heaterShakerModuleV1"

    @staticmethod
    def _get_temperature_status(temperature: Temperature) -> TemperatureStatus:
        """
        Determine the status from the temperature.

        Args:
            temperature: A Temperature instance

        Returns:
            The status
        """
        DELTA: Final = 0.7
        status = TemperatureStatus.IDLE
        if temperature.target is not None:
            diff = temperature.target - temperature.current
            if abs(diff) < DELTA:  # To avoid status fluctuation near target
                status = TemperatureStatus.HOLDING
            elif diff < 0:
                status = TemperatureStatus.COOLING
            else:
                status = TemperatureStatus.HEATING
        return status

    @staticmethod
    def _get_speed_status(speed: RPM) -> SpeedStatus:
        """
        Determine the status from the speed.

        Args:
            speed: An RPM instance

        Returns:
            The status
        """
        DELTA: Final = 40
        status = SpeedStatus.IDLE
        if speed.target is not None:
            diff = speed.target - speed.current
            if abs(diff) < DELTA:  # To avoid status fluctuation near target
                status = SpeedStatus.HOLDING
            elif diff < 0:
                status = SpeedStatus.DECELERATING
            else:
                status = SpeedStatus.ACCELERATING
        return status

    def model(self) -> str:
        return self._model_from_revision(self._device_info.get("model"))

    def bootloader(self) -> UploadFunction:
        return update.upload_via_dfu

    @property
    def device_info(self) -> Mapping[str, str]:
        return self._device_info

    @property
    def live_data(self) -> LiveData:
        data: HeaterShakerData = {
            "temperatureStatus": self.temperature_status,
            "speedStatus": self.speed_status,
            "labwareLatchStatus": self.labware_latch_status,
            "currentTemp": self.temperature,
            "targetTemp": self.target_temperature,
            "currentSpeed": self.speed,
            "targetSpeed": self.target_speed,
            "errorDetails": self._reader.error,
        }
        return {
            "status": self.status.value,
            "data": data,
        }

    @property
    def temperature(self) -> float:
        return self._reader.temperature.current

    @property
    def target_temperature(self) -> Optional[float]:
        return self._reader.temperature.target

    @property
    def speed(self) -> int:
        return self._reader.rpm.current

    @property
    def target_speed(self) -> Optional[int]:
        return self._reader.rpm.target

    @property
    def temperature_status(self) -> TemperatureStatus:
        return self._get_temperature_status(self._reader.temperature)

    @property
    def speed_status(self) -> SpeedStatus:
        return self._get_speed_status(self._reader.rpm)

    @property
    def labware_latch_status(self) -> HeaterShakerLabwareLatchStatus:
        return self._reader.labware_latch

    @property
    def status(self) -> HeaterShakerStatus:
        """Module status or error state details."""
        # TODO (spp, 2022-2-22): Does this make sense as the overarching 'status'?
        #  Or maybe consolidate the above 3 statuses into this one?
        if self._reader.error:
            return HeaterShakerStatus.ERROR
        elif (
            self.temperature_status == TemperatureStatus.IDLE
            and self.speed_status == SpeedStatus.IDLE
        ):
            return HeaterShakerStatus.IDLE
        else:
            return HeaterShakerStatus.RUNNING

    @property
    def is_simulated(self) -> bool:
        return isinstance(self._driver, SimulatingDriver)

    async def start_set_temperature(self, celsius: float) -> None:
        """
        Set temperature in degrees Celsius

        Range: Room temperature to 90 degree Celsius
               Any temperature above the value will be clipped to
               the nearest limit. This is a resistive heater, not
               a Peltier TEC, so a temperature that is too low
               may be unattainable but we do not limit input on the
               low side in case the user has this in a freezer.

        This function will complete as soon as heating begins, and
        will not wait until the temperature is achieved. To then wait
        until heating is complete, use await_temperature. To start
        heating and wait until heating is complete in one call, use
        set_temperature.

        """
        await self.wait_for_is_running()
        await self._driver.set_temperature(celsius)
        await self._reader.read_temperature()

    # TODO(mc, 2022-10-10): remove `awaiting_temperature` argument,
    # and instead, wait until status is holding
    async def await_temperature(self, awaiting_temperature: float) -> None:
        """Await temperature in degrees Celsius.

        Polls the Heater-Shaker's current temperature until
        the specified temperature is reached. If `awaiting_temperature`
        is different than the current target temperature,
        the resulting behavior may be unpredictable.
        """
        if self.is_simulated:
            return

        await self.wait_for_is_running()
        await self._reader.read_temperature()

        async def _await_temperature() -> None:
            if self.temperature_status == TemperatureStatus.HEATING:
                while self.temperature < awaiting_temperature:
                    await self._poller.wait_next_poll()
            elif self.temperature_status == TemperatureStatus.COOLING:
                while self.temperature > awaiting_temperature:
                    await self._poller.wait_next_poll()

        t = self._loop.create_task(_await_temperature())
        self.make_cancellable(t)
        await t

    async def set_speed(self, rpm: int) -> None:
        """
        Set shake speed in RPM

        Range: 0-3000 RPM
               Any speed above or below these values will cause an error.

        This function will not complete until the heater-shaker is at
        the speed or an error occurs. To start spinning but not wait
        until the final speed is reached, see start_set_speed.
        """
        await self.wait_for_is_running()
        await self._driver.set_rpm(rpm)
        await self._reader.read_rpm()

        async def _wait() -> None:
            # Wait until we reach the target speed.
            while self.speed_status != SpeedStatus.HOLDING:
                await self._poller.wait_next_poll()

        task = self._loop.create_task(_wait())
        self.make_cancellable(task)
        await task

    async def _wait_for_labware_latch(
        self, status: HeaterShakerLabwareLatchStatus
    ) -> None:
        """Wait until the hardware reports the labware latch status matches."""
        while self.labware_latch_status != status:
            await self._poller.wait_next_poll()

    async def _wait_for_shake_deactivation(self) -> None:
        """Wait until hardware reports that module has stopped shaking and has homed."""
        while self.speed_status != SpeedStatus.IDLE:
            await self._poller.wait_next_poll()

    async def deactivate(self, must_be_running: bool = True) -> None:
        """Stop heating/cooling; stop shaking and home the plate"""
        await self.deactivate_heater(must_be_running=must_be_running)
        await self.deactivate_shaker(must_be_running=must_be_running)

    async def deactivate_heater(self, must_be_running: bool = True) -> None:
        """Stop heating/cooling"""
        if must_be_running:
            await self.wait_for_is_running()
        await self._driver.deactivate_heater()
        await self._reader.read_temperature()

    async def deactivate_shaker(self, must_be_running: bool = True) -> None:
        """Stop shaking and home the plate"""
        if must_be_running:
            await self.wait_for_is_running()
        await self._driver.home()
        await self._wait_for_shake_deactivation()

    async def open_labware_latch(self) -> None:
        await self.wait_for_is_running()
        await self._driver.open_labware_latch()
        await self._wait_for_labware_latch(HeaterShakerLabwareLatchStatus.IDLE_OPEN)

    async def close_labware_latch(self) -> None:
        await self.wait_for_is_running()
        await self._driver.close_labware_latch()
        await self._wait_for_labware_latch(HeaterShakerLabwareLatchStatus.IDLE_CLOSED)

    async def prep_for_update(self) -> str:
        await self._poller.stop()
        await self._driver.enter_programming_mode()
        dfu_info = await update.find_dfu_device(pid=DFU_PID, expected_device_count=2)
        return dfu_info


class HeaterShakerReader(Reader):
    temperature: Temperature
    rpm: RPM
    labware_latch: HeaterShakerLabwareLatchStatus
    error: Optional[str]

    def __init__(self, driver: AbstractHeaterShakerDriver) -> None:
        self.temperature = Temperature(current=25, target=None)
        self.rpm = RPM(current=0, target=None)
        self.labware_latch = HeaterShakerLabwareLatchStatus.IDLE_UNKNOWN
        self.error: Optional[str] = None
        self._driver = driver

    async def read(self) -> None:
        await self.read_temperature()
        await self.read_rpm()
        await self.read_labware_latch()
        self._set_error(None)

    def on_error(self, exception: Exception) -> None:
        self._set_error(exception)

    async def read_temperature(self) -> None:
        self.temperature = await self._driver.get_temperature()

    async def read_rpm(self) -> None:
        self.rpm = await self._driver.get_rpm()

    async def read_labware_latch(self) -> None:
        self.labware_latch = await self._driver.get_labware_latch_status()

    def _set_error(self, exception: Optional[Exception]) -> None:
        if exception is None:
            self.error = None
        else:
            try:
                self.error = str(exception.args[0])
            except Exception:
                self.error = repr(exception)
