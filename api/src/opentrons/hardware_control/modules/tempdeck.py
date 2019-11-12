import asyncio
from threading import Thread, Event
from typing import Union
from opentrons.drivers.temp_deck import TempDeck as TempDeckDriver
from . import update, mod_abc

TEMP_POLL_INTERVAL_SECS = 1


class MissingDevicePortError(Exception):
    pass


class SimulatingDriver:
    def __init__(self):
        self._target_temp = 0
        self._active = False
        self._port = None

    async def set_temperature(self, celsius):
        self._target_temp = celsius
        self._active = True

    def legacy_set_temperature(self, celsius):
        self._target_temp = celsius
        self._active = True

    def deactivate(self):
        self._target_temp = 0
        self._active = False

    def update_temperature(self):
        pass

    def connect(self, port):
        self._port = port

    def disconnect(self):
        pass

    def enter_programming_mode(self):
        pass

    @property
    def temperature(self):
        return self._target_temp

    @property
    def target(self):
        return self._target_temp if self._active else None

    @property
    def status(self):
        return 'holding at target' if self._active else 'idle'

    def get_device_info(self):
        return {'serial': 'dummySerialTD',
                'model': 'dummyModelTD',
                'version': 'dummyVersionTD'}


class Poller(Thread):
    def __init__(self, driver):
        self._driver_ref = driver
        self._stop_event = Event()
        super().__init__(target=self._poll_temperature,
                         name='Temperature poller for tempdeck')

    def _poll_temperature(self):
        while not self._stop_event.wait(TEMP_POLL_INTERVAL_SECS):
            self._driver_ref.update_temperature()

    def join(self):
        self._stop_event.set()
        super().join()


class TempDeck(mod_abc.AbstractModule):
    """
    Under development. API subject to change without a version bump
    """
    @classmethod
    async def build(cls,
                    port,
                    interrupt_callback,
                    simulating=False,
                    loop: asyncio.AbstractEventLoop = None):

        """ Build and connect to a TempDeck"""
        # TempDeck does not currently use interrupts, so the callback is not
        # passed on
        mod = cls(port, simulating, loop)
        await mod._connect()
        return mod

    @classmethod
    def name(cls) -> str:
        return 'tempdeck'

    @classmethod
    def display_name(cls) -> str:
        return 'Temperature Deck'

    @classmethod
    def bootloader(cls) -> mod_abc.UploadFunction:
        return update.upload_via_avrdude

    @staticmethod
    def _build_driver(
            simulating: bool) -> Union['SimulatingDriver', 'TempDeckDriver']:
        if simulating:
            return SimulatingDriver()
        else:
            return TempDeckDriver()

    def __init__(self,
                 port,
                 simulating,
                 loop: asyncio.AbstractEventLoop = None) -> None:

        self._driver = self._build_driver(simulating)
        if None is loop:
            self._loop = asyncio.get_event_loop()
        else:
            self._loop = loop

        self._port = port
        self._device_info = None
        self._poller = None

    async def set_temperature(self, celsius):
        """
        Set temperature in degree Celsius
        Range: 4 to 95 degree Celsius (QA tested).
        The internal temp range is -9 to 99 C, which is limited by the 2-digit
        temperature display. Any input outside of this range will be clipped
        to the nearest limit
        """
        return await self._driver.set_temperature(celsius)

    def deactivate(self):
        """ Stop heating/cooling and turn off the fan """
        self._driver.deactivate()

    @property
    def device_info(self):
        return self._device_info

    @property
    def live_data(self):
        return {
            'status': self.status,
            'data': {
                'currentTemp': self.temperature,
                'targetTemp': self.target
            }
        }

    @property
    def temperature(self):
        return self._driver.temperature

    @property
    def target(self):
        return self._driver.target

    @property
    def status(self):
        return self._driver.status

    @property
    def port(self):
        return self._port

    @property
    def is_simulated(self):
        return isinstance(self._driver, SimulatingDriver)

    @property
    def interrupt_callback(self):
        return lambda x: None

    @property
    def loop(self):
        return self._loop

    def set_loop(self, loop):
        self._loop = loop

    async def _connect(self):
        """
        Connect to the 'TempDeck' port
        Planned change- will connect to the correct port in case of multiple
        TempDecks
        """
        if self._poller:
            self._poller.join()
        self._driver.connect(self._port)
        self._device_info = self._driver.get_device_info()
        self._poller = Poller(self._driver)
        self._poller.start()

    def __del__(self):
        if hasattr(self, '_poller') and self._poller:
            self._poller.join()

    async def prep_for_update(self) -> str:
        if self._poller:
            self._poller.join()
        del self._poller
        self._poller = None
        model = self._device_info and self._device_info.get('model')
        new_port = await update.enter_bootloader(self._driver, model)
        return new_port or self.port
