from __future__ import annotations

import asyncio
import logging
from typing import Dict, Optional

from opentrons.hardware_control.modules.types import (
    ModuleDisconnectedCallback,
    TemperatureStatus,
)
from opentrons.hardware_control.poller import Reader, Poller
from typing_extensions import Final
from opentrons.drivers.types import Temperature
from opentrons.drivers.temp_deck import (
    SimulatingDriver,
    AbstractTempDeckDriver,
    TempDeckDriver,
)
from opentrons.drivers.rpi_drivers.types import USBPort
from opentrons.hardware_control.execution_manager import ExecutionManager
from opentrons.hardware_control.modules import update, mod_abc, types, errors

log = logging.getLogger(__name__)

TEMP_POLL_INTERVAL_SECS = 1.0
SIM_TEMP_POLL_INTERVAL_SECS = TEMP_POLL_INTERVAL_SECS / 20.0


class TempDeck(mod_abc.AbstractModule):
    """Hardware control interface for an attached Temperature Module."""

    MODULE_TYPE = types.ModuleType["TEMPERATURE"]
    FIRST_GEN2_REVISION = 20

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
    ) -> "TempDeck":
        """
        Build a TempDeck

        Args:
            port: The port to connect to
            usb_port: USB Port
            execution_manager: Execution manager.
            hw_control_loop: The event loop running in the hardware control thread.
            poll_interval_seconds: Poll interval override.
            simulating: whether to build a simulating driver
            sim_model: The model name used by simulator
            disconnected_callback: Callback to inform the module controller that the device was disconnected

        Returns:
            Tempdeck instance
        """
        driver: AbstractTempDeckDriver
        if not simulating:
            driver = await TempDeckDriver.create(port=port, loop=hw_control_loop)
            poll_interval_seconds = poll_interval_seconds or TEMP_POLL_INTERVAL_SECS
        else:
            driver = SimulatingDriver(
                sim_model=sim_model, serial_number=sim_serial_number
            )
            poll_interval_seconds = poll_interval_seconds or SIM_TEMP_POLL_INTERVAL_SECS

        reader = TempDeckReader(driver=driver)
        poller = Poller(reader=reader, interval=poll_interval_seconds)
        module = cls(
            port=port,
            usb_port=usb_port,
            execution_manager=execution_manager,
            driver=driver,
            reader=reader,
            poller=poller,
            device_info=await driver.get_device_info(),
            hw_control_loop=hw_control_loop,
            disconnected_callback=disconnected_callback,
        )

        try:
            await poller.start()
        except Exception:
            log.exception(f"First read of Temperature Module on port {port} failed")

        return module

    def __init__(
        self,
        port: str,
        usb_port: USBPort,
        execution_manager: ExecutionManager,
        driver: AbstractTempDeckDriver,
        reader: TempDeckReader,
        poller: Poller,
        device_info: Dict[str, str],
        hw_control_loop: asyncio.AbstractEventLoop,
        disconnected_callback: ModuleDisconnectedCallback = None,
    ) -> None:
        """Constructor"""
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
        """Stop the poller task."""
        await self._poller.stop()
        await self._driver.disconnect()

    @classmethod
    def name(cls) -> str:
        return "tempdeck"

    def firmware_prefix(self) -> str:
        """The prefix used for looking up firmware"""
        return "temperature-module"

    def model(self) -> str:
        return self._model_from_revision(self._device_info.get("model"))

    def bootloader(self) -> types.UploadFunction:
        return update.upload_via_avrdude

    async def start_set_temperature(self, celsius: float) -> None:
        """Set the target temperature in degrees Celsius.

        Range: 4 to 95 degrees Celsius (QA tested).

        The internal temp range is -9 to 99 °C, which is limited by the two-digit
        temperature display. Any input outside of this range will be clipped
        to the nearest limit.
        """
        await self.wait_for_is_running()
        await self._driver.set_temperature(celsius)
        await self._reader.read()

    async def await_temperature(self, awaiting_temperature: Optional[float]) -> None:
        """Await a target temperature in degrees Celsius.

        Polls Temperature Module's temperature until
        the specified temperature is reached.

        Args:
            temperature: The temperature to wait for.
                If `None` (recommended), the module's target will be used.
                Specifying any value other than the current target
                may produce unpredictable behavior.
        """
        if self.is_simulated:
            return

        await self.wait_for_is_running()
        await self._reader.read()

        async def _await_temperature() -> None:
            if awaiting_temperature is None:
                while self.status != TemperatureStatus.HOLDING:
                    await self._poller.wait_next_poll()
            elif self.status == TemperatureStatus.HEATING:
                while self.temperature < awaiting_temperature:
                    await self._poller.wait_next_poll()
            elif self.status == TemperatureStatus.COOLING:
                while self.temperature > awaiting_temperature:
                    await self._poller.wait_next_poll()

        t = self._loop.create_task(_await_temperature())
        self.make_cancellable(t)
        await t

    async def deactivate(self, must_be_running: bool = True) -> None:
        """Stop heating/cooling and turn off the fan"""
        if must_be_running:
            await self.wait_for_is_running()
        await self._driver.deactivate()
        await self._reader.read()

    @property
    def device_info(self) -> Dict[str, str]:
        return self._device_info

    @property
    def live_data(self) -> types.LiveData:
        data: types.TemperatureModuleData = {
            "currentTemp": self.temperature,
            "targetTemp": self.target,
        }
        return {
            "status": self.status,
            "data": data,
        }

    @property
    def temperature(self) -> float:
        return self._reader.temperature.current

    @property
    def target(self) -> Optional[float]:
        return self._reader.temperature.target

    @property
    def status(self) -> TemperatureStatus:
        return self._get_status(self._reader.temperature)

    @property
    def is_simulated(self) -> bool:
        return isinstance(self._driver, SimulatingDriver)

    async def prep_for_update(self) -> str:
        model = self._device_info and self._device_info.get("model")
        if model in ("temp_deck_v1", "temp_deck_v1.1", "temp_deck_v2"):
            raise errors.UpdateError(
                "This Temperature Module can't be updated."
                "Please contact Opentrons Support."
            )
        await self._poller.stop()
        await self._driver.enter_programming_mode()
        new_port = await update.find_bootloader_port()
        return new_port or self.port

    def has_available_update(self) -> bool:
        """Override of abc implementation to suppress update notifications
        for v1, v1.1, and v2 temperature modules which cannot be updated"""
        if not self._device_info:
            model = None
        else:
            model = self._device_info.get("model")
        if model in {"temp_deck_v1", "temp_deck_v1.1", "temp_deck_v2", None}:
            return False
        return super().has_available_update()

    @staticmethod
    def _get_status(temperature: Temperature) -> TemperatureStatus:
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
    def _model_from_revision(revision: Optional[str]) -> str:
        """Defines the revision -> model mapping"""
        if not revision or "v" not in revision:
            log.error(f"bad revision: {revision}")
            return "temperatureModuleV1"
        try:
            revision_num = float(revision.split("v")[-1])
        except (ValueError, TypeError):
            # none or corrupt
            log.exception("no revision")
            return "temperatureModuleV1"

        if revision_num < TempDeck.FIRST_GEN2_REVISION:
            return "temperatureModuleV1"
        else:
            return "temperatureModuleV2"


class TempDeckReader(Reader):
    """Reads data from an attached Temperature Module."""

    temperature: Temperature

    def __init__(self, driver: AbstractTempDeckDriver) -> None:
        self.temperature = Temperature(current=25, target=None)
        self._driver = driver

    async def read(self) -> None:
        """Read the module's current and target temperatures."""
        self.temperature = await self._driver.get_temperature()
