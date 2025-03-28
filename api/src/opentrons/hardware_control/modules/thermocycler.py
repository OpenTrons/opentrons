from __future__ import annotations

import asyncio
import logging
from typing import Callable, Optional, List, Dict, Mapping, Union, cast
from opentrons.drivers.rpi_drivers.types import USBPort
from opentrons.drivers.types import ThermocyclerLidStatus, Temperature, PlateTemperature
from opentrons.hardware_control.modules.lid_temp_status import LidTemperatureStatus
from opentrons.hardware_control.modules.plate_temp_status import PlateTemperatureStatus
from opentrons.hardware_control.modules.types import (
    ModuleDisconnectedCallback,
    TemperatureStatus,
)
from opentrons.hardware_control.poller import Reader, Poller

from ..execution_manager import ExecutionManager
from . import types, update, mod_abc
from opentrons.drivers.thermocycler import (
    AbstractThermocyclerDriver,
    SimulatingDriver,
    ThermocyclerDriverV2,
    ThermocyclerDriverFactory,
)


log = logging.getLogger(__name__)

POLLING_FREQUENCY_SEC = 1.0
SIM_POLLING_FREQUENCY_SEC = POLLING_FREQUENCY_SEC / 50.0

V1_MODULE_STRING = "thermocyclerModuleV1"
V2_MODULE_STRING = "thermocyclerModuleV2"

DFU_PID = "df11"

_TC_PLATE_LIFT_OPEN_DEGREES = 20
_TC_PLATE_LIFT_RETURN_DEGREES = 23


class ThermocyclerError(Exception):
    pass


def _temperature_is_holding(status: Optional[TemperatureStatus]) -> bool:
    if status in (TemperatureStatus.HOLDING, TemperatureStatus.IDLE):
        return True

    if status == TemperatureStatus.ERROR:
        raise ThermocyclerError("Error occurred while waiting for temperature")

    return False


class Thermocycler(mod_abc.AbstractModule):
    """Hardware control interface for an attached Thermocycler."""

    MODULE_TYPE = types.ModuleType.THERMOCYCLER

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
    ) -> "Thermocycler":
        """
        Build and connect to a Thermocycler

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
            Thermocycler instance.
        """
        driver: AbstractThermocyclerDriver
        if not simulating:
            driver = await ThermocyclerDriverFactory.create(
                port=port, loop=hw_control_loop
            )
            poll_interval_seconds = poll_interval_seconds or POLLING_FREQUENCY_SEC
        else:
            driver = SimulatingDriver(model=sim_model, serial_number=sim_serial_number)
            poll_interval_seconds = poll_interval_seconds or SIM_POLLING_FREQUENCY_SEC

        reader = ThermocyclerReader(driver=driver)
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
            log.exception(f"First read of Thermocycler on port {port} failed")

        return module

    def __init__(
        self,
        port: str,
        usb_port: USBPort,
        execution_manager: ExecutionManager,
        driver: AbstractThermocyclerDriver,
        reader: ThermocyclerReader,
        poller: Poller,
        device_info: Dict[str, str],
        hw_control_loop: asyncio.AbstractEventLoop,
        disconnected_callback: ModuleDisconnectedCallback = None,
    ) -> None:
        """
        Constructor

        Args:
            port: The port the thermocycler is connected to.
            usb_port: The USB port.
            execution_manager: The hardware execution manager.
            driver: The thermocycler driver.
            reader: An interface to read data from the Thermocycler.
            poller: A poll controller for reads.
            device_info: The thermocycler device info.
            hw_control_loop: The event loop running in the hardware control thread.
            disconnected_callback: Callback to inform the module controller that the device was disconnected
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
        self._total_cycle_count: Optional[int] = None
        self._current_cycle_index: Optional[int] = None
        self._total_step_count: Optional[int] = None
        self._current_step_index: Optional[int] = None
        self._error: Optional[str] = None
        self._reader.register_error_handler(self._enter_error_state)

    async def cleanup(self) -> None:
        """Stop the poller task."""
        await self._poller.stop()
        await self._driver.disconnect()

    @classmethod
    def name(cls) -> str:
        return "thermocycler"

    def firmware_prefix(self) -> str:
        """The prefix used for looking up firmware"""
        if self.model() == V1_MODULE_STRING:
            return "thermocycler"
        else:
            return "thermocycler-gen2"

    def model(self) -> str:
        if isinstance(self._driver, SimulatingDriver):
            return self._driver.model()
        elif isinstance(self._driver, ThermocyclerDriverV2):
            return V2_MODULE_STRING
        else:
            # Real module that is not a V2
            return V1_MODULE_STRING

    def bootloader(self) -> types.UploadFunction:
        if self.model() == V2_MODULE_STRING:
            return update.upload_via_dfu
        else:
            return update.upload_via_bossa

    def _clear_cycle_counters(self) -> None:
        """Clear the cycle counters."""
        self._total_cycle_count = None
        self._current_cycle_index = None
        self._total_step_count = None
        self._current_step_index = None

    async def deactivate_lid(self, must_be_running: bool = True) -> None:
        """Deactivate the lid heating pad"""
        if must_be_running:
            await self.wait_for_is_running()
        await self._driver.deactivate_lid()
        await self._reader.read_lid_temperature()

    async def deactivate_block(self, must_be_running: bool = True) -> None:
        """Deactivate the block peltiers"""
        if must_be_running:
            await self.wait_for_is_running()
        self._clear_cycle_counters()
        await self._driver.deactivate_block()
        await self._reader.read_block_temperature()

    async def deactivate(self, must_be_running: bool = True) -> None:
        """Deactivate the block peltiers and lid heating pad"""
        if must_be_running:
            await self.wait_for_is_running()
        self._clear_cycle_counters()
        await self._driver.deactivate_all()
        await self._reader.read()

    async def open(self) -> str:
        """Open the lid if it is closed"""
        await self.wait_for_is_running()
        await self._driver.open_lid()
        await self._wait_for_lid_status(ThermocyclerLidStatus.OPEN)
        return ThermocyclerLidStatus.OPEN

    async def close(self) -> str:
        """Close the lid if it is open"""
        await self.wait_for_is_running()
        await self._driver.close_lid()
        await self._wait_for_lid_status(ThermocyclerLidStatus.CLOSED)
        return ThermocyclerLidStatus.CLOSED

    async def lift_plate(self) -> str:
        """If the lid is open, lift the plate.

        Note that this should always be preceded by an `open` call. If the
        lid is not open, the Thermocycler will respond with an error message.

        Returns: Thermocycler lid status after running the command.
        """
        await self.wait_for_is_running()
        await self._driver.lift_plate()
        await self._wait_for_lid_status(ThermocyclerLidStatus.OPEN)
        return ThermocyclerLidStatus.OPEN

    async def raise_plate(self) -> None:
        """Move lid an extra bit."""
        if not self.lid_status == ThermocyclerLidStatus.OPEN:
            raise RuntimeError("Lid must be open")
        await self.wait_for_is_running()
        await self._driver.jog_lid(_TC_PLATE_LIFT_OPEN_DEGREES)
        # There is NO WAIT for the updated lid stats, because it will always
        # remain at "open"

    async def return_from_raise_plate(self) -> None:
        """Return lid back to normal open position."""
        await self.wait_for_is_running()
        await self._driver.jog_lid(-_TC_PLATE_LIFT_RETURN_DEGREES)
        await self.open()
        await self._wait_for_lid_status(ThermocyclerLidStatus.OPEN)

    async def set_temperature(
        self,
        temperature: float,
        hold_time_seconds: Optional[float] = None,
        hold_time_minutes: Optional[float] = None,
        ramp_rate: Optional[float] = None,
        volume: Optional[float] = None,
    ) -> None:
        """
        Set the temperature and wait.

        If hold time is set this function will return after
        the hold time expires.

        Otherwise it will return when the target temperature is reached.

        Args:
            temperature: The target temperature.
            hold_time_seconds: Optional number of seconds to wait.
            hold_time_minutes: Optional number of minutes to wait.
            ramp_rate: Optional ramp rate.
            volume: Optional volume.

        Returns: None
        """
        await self.wait_for_is_running()
        await self._set_temperature_no_pause(
            temperature=temperature,
            hold_time_seconds=hold_time_seconds,
            hold_time_minutes=hold_time_minutes,
            ramp_rate=ramp_rate,
            volume=volume,
        )

    async def _set_temperature_no_pause(
        self,
        temperature: float,
        hold_time_seconds: Optional[float],
        hold_time_minutes: Optional[float],
        ramp_rate: Optional[float],
        volume: Optional[float],
    ) -> None:
        seconds = hold_time_seconds if hold_time_seconds is not None else 0
        minutes = hold_time_minutes if hold_time_minutes is not None else 0
        total_seconds = seconds + (minutes * 60)
        hold_time = total_seconds if total_seconds > 0 else 0

        if ramp_rate is not None:
            await self._driver.set_ramp_rate(ramp_rate=ramp_rate)

        await self._driver.set_plate_temperature(
            temp=temperature, hold_time=hold_time, volume=volume
        )

        task = self._loop.create_task(self._wait_for_block_target())
        self.make_cancellable(task)
        await task

    async def wait_for_block_target(self) -> None:
        """
        Wait for thermocycler to reach given temperature.

        Will return when the target temperature is reached.

        Args:
            temperature: The target temperature.

        Returns: None
        """
        await self.wait_for_is_running()
        task = self._loop.create_task(self._wait_for_block_target())
        self.make_cancellable(task)
        await task

    async def cycle_temperatures(
        self,
        steps: List[types.ThermocyclerStep],
        repetitions: int,
        volume: Optional[float] = None,
    ) -> None:
        """
        Begin a set temperature cycle.

        Args:
            steps: The set temperature steps.
            repetitions: Number of repetitions.
            volume: Optional volume.

        Returns: None
        """
        await self.wait_for_is_running()
        self._total_cycle_count = repetitions
        self._total_step_count = len(steps)

        task = self._loop.create_task(self._execute_cycles(steps, repetitions, volume))
        self.make_cancellable(task)
        await task

    async def execute_profile(
        self,
        profile: List[Union[types.ThermocyclerCycle, types.ThermocyclerStep]],
        volume: Optional[float] = None,
    ) -> None:
        """Begin a set temperature profile, with both repeating and non-repeating steps.

        Args:
            profile: The temperature profile to follow.
            volume: Optional volume

        Returns: None
        """
        await self.wait_for_is_running()
        self._total_cycle_count = 0
        self._total_step_count = 0
        self._current_cycle_index = 0
        self._current_step_index = 0
        for step_or_cycle in profile:
            if "steps" in step_or_cycle:
                # basically https://github.com/python/mypy/issues/14766
                this_cycle = cast(types.ThermocyclerCycle, step_or_cycle)
                self._total_cycle_count += this_cycle["repetitions"]
                self._total_step_count += (
                    len(this_cycle["steps"]) * this_cycle["repetitions"]
                )
            else:
                self._total_step_count += 1
                self._total_cycle_count += 1
        task = self._loop.create_task(self._execute_profile(profile, volume))
        self.make_cancellable(task)
        await task

    async def set_lid_temperature(self, temperature: float) -> None:
        """Set the lid temperature in degrees Celsius"""
        await self.wait_for_is_running()
        await self._driver.set_lid_temperature(temp=temperature)

        task = self._loop.create_task(self._wait_for_lid_target())
        self.make_cancellable(task)
        await task

    async def wait_for_lid_target(self) -> None:
        """Set the lid temperature in degrees Celsius"""
        await self.wait_for_is_running()

        task = self._loop.create_task(self._wait_for_lid_target())
        self.make_cancellable(task)
        await task

    # TODO(mc, 2022-04-25): de-duplicate with `set_temperature`
    async def set_target_block_temperature(
        self,
        celsius: float,
        hold_time_seconds: Optional[float] = None,
        volume: Optional[float] = None,
    ) -> None:
        """Set the Thermocycler's target block temperature.

        Does not wait for the target temperature to be reached.

        Args:
            celsius: The target block temperature, in degrees celsius.
        """
        await self.wait_for_is_running()
        await self._driver.set_plate_temperature(
            temp=celsius,
            hold_time=hold_time_seconds,
            volume=volume,
        )
        await self._reader.read_block_temperature()

    # TODO(mc, 2022-04-26): de-duplicate with `set_lid_temperature`
    async def set_target_lid_temperature(self, celsius: float) -> None:
        """Set the Thermocycler's target lid temperature.

        Does not wait for the target temperature to be reached.

        Args:
            celsius: The target lid temperature, in degrees celsius.
        """
        await self.wait_for_is_running()
        await self._driver.set_lid_temperature(temp=celsius)
        await self._reader.read_lid_temperature()

    async def _wait_for_lid_target(self) -> None:
        """
        This method only exits if lid target temperature has been reached.

        Subject to change without a version bump.
        """
        await self._reader.read_lid_temperature()

        while not _temperature_is_holding(self.lid_temp_status):
            await self._poller.wait_next_poll()

    async def _wait_for_block_target(self) -> None:
        """
        This method only exits if set temperature has been reached.

        Subject to change without a version bump.
        """
        await self._reader.read_block_temperature()

        while not _temperature_is_holding(self.status):
            await self._poller.wait_next_poll()

        while self.hold_time is not None and self.hold_time > 0:
            await self._poller.wait_next_poll()

    async def _wait_for_lid_status(self, status: ThermocyclerLidStatus) -> None:
        """Wait for lid status to be status."""
        await self._reader.read_lid_status()

        while self.lid_status != status:
            await self._poller.wait_next_poll()

    @property
    def lid_target(self) -> Optional[float]:
        return self._reader.lid_temperature.target

    @property
    def lid_temp(self) -> float:
        return self._reader.lid_temperature.current

    @property
    def lid_status(self) -> ThermocyclerLidStatus:
        return self._reader.lid_status

    @property
    def lid_temp_status(self) -> TemperatureStatus:
        return self._reader.lid_temperature_status

    # TODO(mc, 2022-10-13): remove
    @property
    def ramp_rate(self) -> Optional[float]:
        """Not supported."""
        return None

    @property
    def hold_time(self) -> Optional[float]:
        return self._reader.block_temperature.hold

    @property
    def temperature(self) -> Optional[float]:
        return self._reader.block_temperature.current

    @property
    def target(self) -> Optional[float]:
        return self._reader.block_temperature.target

    @property
    def status(self) -> TemperatureStatus:
        return (
            self._reader.block_temperature_status
            if self._error is None
            else TemperatureStatus.ERROR
        )

    @property
    def device_info(self) -> Mapping[str, str]:
        return self._device_info

    @property
    def total_cycle_count(self) -> Optional[int]:
        return self._total_cycle_count

    @property
    def current_cycle_index(self) -> Optional[int]:
        return self._current_cycle_index

    @property
    def total_step_count(self) -> Optional[int]:
        return self._total_step_count

    @property
    def current_step_index(self) -> Optional[int]:
        return self._current_step_index

    @property
    def live_data(self) -> types.LiveData:
        data: types.ThermocyclerData = {
            "lid": self.lid_status,
            "lidTarget": self.lid_target,
            "lidTemp": self.lid_temp,
            "lidTempStatus": self.lid_temp_status,
            "currentTemp": self.temperature,
            "targetTemp": self.target,
            "holdTime": self.hold_time,
            "rampRate": self.ramp_rate,
            "currentCycleIndex": self.current_cycle_index,
            "totalCycleCount": self.total_cycle_count,
            "currentStepIndex": self.current_step_index,
            "totalStepCount": self.total_step_count,
        }
        return {
            "status": self.status,
            "data": data,
        }

    @property
    def is_simulated(self) -> bool:
        return isinstance(self._driver, SimulatingDriver)

    async def prep_for_update(self) -> str:
        await self._poller.stop()
        await self._driver.enter_programming_mode()

        if self.model() == V2_MODULE_STRING:
            # TC2 has three unique "devices" over DFU
            new_port = await update.find_dfu_device(
                pid=DFU_PID, expected_device_count=3
            )
        else:
            new_port = await update.find_bootloader_port()

        return new_port or self.port

    async def _execute_cycle_step(
        self, step: types.ThermocyclerStep, volume: Optional[float]
    ) -> None:
        """
        Execute a thermocycler step.

        Args:
            step: The set temperature parameters.
            volume: The volume

        Returns: None
        """
        temperature = step.get("temperature")
        hold_time_minutes = step.get("hold_time_minutes", None)
        hold_time_seconds = step.get("hold_time_seconds", None)
        await self._set_temperature_no_pause(
            temperature=temperature,  # type: ignore
            hold_time_minutes=hold_time_minutes,
            hold_time_seconds=hold_time_seconds,
            ramp_rate=None,
            volume=volume,
        )

    async def _execute_cycles(
        self,
        steps: List[types.ThermocyclerStep],
        repetitions: int,
        volume: Optional[float],
    ) -> None:
        """
        Execute cycles.

        Args:
            steps: The set temperature steps.
            repetitions: The number of repetitions
            volume: The optional volume.

        Returns: None
        """
        for rep in range(repetitions):
            self._current_cycle_index = rep + 1  # science starts at 1
            for step_idx, step in enumerate(steps):
                self._current_step_index = step_idx + 1  # science starts at 1
                await self._execute_cycle_step(step, volume)

    async def _execute_profile(
        self,
        profile: List[Union[types.ThermocyclerCycle, types.ThermocyclerStep]],
        volume: Optional[float],
    ) -> None:
        """
        Execute profiles.

        Profiles command a thermocycler pattern that can contain multiple cycles and out-of-cycle steps.
        """
        self._current_cycle_index = 0
        self._current_step_index = 0
        for step_or_cycle in profile:
            self._current_cycle_index += 1
            if "repetitions" in step_or_cycle:
                # basically https://github.com/python/mypy/issues/14766
                this_cycle = cast(types.ThermocyclerCycle, step_or_cycle)
                for rep in range(this_cycle["repetitions"]):
                    for step in this_cycle["steps"]:
                        self._current_step_index += 1
                        await self._execute_cycle_step(step, volume)
            else:
                await self._execute_cycle_step(step_or_cycle, volume)

    # TODO(mc, 2022-10-13): why does this exist?
    # Do the driver and poller really need to be disconnected?
    # Could we accomplish the same thing by latching the error state
    # and allowing the driver and poller to continue?
    def _enter_error_state(self, error: Exception) -> None:
        """Enter into an error state.

        The Thermocycler will not be accessible in this state.

        Args:
            cause: The cause of the exception.

        Returns:
            None
        """
        self._error = str(error)
        log.error(
            f"Thermocycler has encountered an unrecoverable error: {self._error}. "
            f"Please refer to support article at "
            f"https://support.opentrons.com/en/articles/3469797-thermocycler-module"
            f" for troubleshooting."
        )
        asyncio.run_coroutine_threadsafe(self.cleanup(), self._loop)


class ThermocyclerReader(Reader):
    """Read data from the thermocycler.

    Args:
        driver: A connected Thermocycler driver.
    """

    lid_status: ThermocyclerLidStatus
    lid_temperature: Temperature
    block_temperature: PlateTemperature

    def __init__(
        self,
        driver: AbstractThermocyclerDriver,
    ) -> None:
        self.lid_status = ThermocyclerLidStatus.UNKNOWN
        self.lid_temperature = Temperature(current=25.0, target=None)
        self.block_temperature = PlateTemperature(current=25.0, target=None, hold=None)
        self._lid_temperature_status = LidTemperatureStatus()
        self._block_temperature_status = PlateTemperatureStatus()
        self._driver = driver
        self._handle_error: Optional[Callable[[Exception], None]] = None

    @property
    def block_temperature_status(self) -> TemperatureStatus:
        return self._block_temperature_status.status

    @property
    def lid_temperature_status(self) -> TemperatureStatus:
        return self._lid_temperature_status.status

    def on_error(self, exception: Exception) -> None:
        if self._handle_error is not None:
            self._handle_error(exception)

    def register_error_handler(self, handle_error: Callable[[Exception], None]) -> None:
        self._handle_error = handle_error

    async def read(self) -> None:
        """Poll the thermocycler."""
        await self.read_lid_status()
        await self.read_lid_temperature()
        await self.read_block_temperature()

    async def read_lid_status(self) -> None:
        self.lid_status = await self._driver.get_lid_status()

    async def read_block_temperature(self) -> None:
        self.block_temperature = await self._driver.get_plate_temperature()
        self._block_temperature_status.update(self.block_temperature)

    async def read_lid_temperature(self) -> None:
        self.lid_temperature = await self._driver.get_lid_temperature()
        self._lid_temperature_status.update(self.lid_temperature)
