import asyncio
import logging
from typing import Union
from opentrons.drivers.mag_deck import MagDeck as MagDeckDriver
from opentrons.drivers.mag_deck.driver import mag_locks
from ..execution_manager import ExecutionManager
from . import update, mod_abc, types

LABWARE_ENGAGE_HEIGHT = {'biorad-hardshell-96-PCR': 18}    # mm
MAX_ENGAGE_HEIGHT = 45  # mm from home position
OFFSET_TO_LABWARE_BOTTOM = 5

MODULE_LOG = logging.getLogger(__name__)

class MissingDevicePortError(Exception):
    pass


class SimulatingDriver:
    def __init__(self):
        self._port = None
        self._height = 0

    def probe_plate(self):
        pass

    def home(self):
        pass

    def move(self, location):
        self._height = location

    def get_device_info(self):
        return {'serial': 'dummySerialMD',
                'model': 'dummyModelMD',
                'version': 'dummyVersionMD'}

    def connect(self, port):
        pass

    def disconnect(self, port=None):
        pass

    def enter_programming_mode(self):
        pass

    @property
    def plate_height(self):
        return self._height

    @property
    def mag_position(self):
        return self._height

    def is_connected(self):
        return True


class MagDeck(mod_abc.AbstractModule):
    """
    Under development. API subject to change
    """
    @classmethod
    async def build(cls,
                    port: str,
                    execution_manager: ExecutionManager,
                    interrupt_callback: types.InterruptCallback = None,
                    simulating=False,
                    loop: asyncio.AbstractEventLoop = None):
        # MagDeck does not currently use interrupts, so the callback is not
        # passed on
        mod = cls(port=port,
                  simulating=simulating,
                  loop=loop,
                  execution_manager=execution_manager)
        await mod._connect()
        return mod

    @classmethod
    def name(cls) -> str:
        return 'magdeck'

    @classmethod
    def display_name(cls) -> str:
        return 'Magnetic Deck'

    @classmethod
    def bootloader(cls) -> types.UploadFunction:
        return update.upload_via_avrdude

    @staticmethod
    def _build_driver(
            simulating: bool) -> Union['SimulatingDriver', 'MagDeckDriver']:
        if simulating:
            return SimulatingDriver()
        else:
            return MagDeckDriver()

    def __init__(self,
                 port: str,
                 execution_manager: ExecutionManager,
                 simulating: bool,
                 loop: asyncio.AbstractEventLoop = None) -> None:
        super().__init__(port=port,
                         simulating=simulating,
                         loop=loop,
                         execution_manager=execution_manager)
        MODULE_LOG.info(f'MAGDECK CLASS INIT CALLED id: {id(self)}')
        if mag_locks.get(port) and mag_locks[port][2] and mag_locks[port][2].is_running():
            self._driver = mag_locks[port][1]
            MODULE_LOG.info(f'MAGDECK CLASS INIT CALLED found lock : {id(self)} driver: {id(self._driver)}')
        else:
            self._driver = self._build_driver(simulating)  # type: ignore
            MODULE_LOG.info(f'MAGDECK CLASS INIT CALLED found NOOOOO lock : {id(self)} driver: {id(self._driver)}')

    async def calibrate(self):
        """
        Calibration involves probing for top plate to get the plate height
        """
        await self.wait_for_is_running()
        self._driver.probe_plate()
        # return if successful or not?

    async def engage(self, height):
        """
        Move the magnet to a specific height, in mm from home position
        """
        await self.wait_for_is_running()
        if height > MAX_ENGAGE_HEIGHT or height < 0:
            raise ValueError('Invalid engage height. Should be 0 to {}'.format(
                MAX_ENGAGE_HEIGHT))
        self._driver.move(height)

    async def deactivate(self):
        """
        Home the magnet
        """
        await self.wait_for_is_running()
        self._driver.home()
        await self.engage(0.0)

    @property
    def current_height(self):
        return self._driver.mag_position

    @property
    def device_info(self):
        """
        Returns a dict:
            { 'serial': 'abc123', 'model': '8675309', 'version': '9001' }
        """
        return self._device_info

    @property
    def status(self):
        if self.current_height > 0:
            return 'engaged'
        else:
            return 'disengaged'

    @property
    def engaged(self):
        if self.current_height > 0:
            return True
        else:
            return False

    @property
    def live_data(self):
        return {
            'status': self.status,
            'data': {
                'engaged': self.engaged,
                'height': self.current_height
            }
        }

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

    # Internal Methods

    async def _connect(self):
        """
        Connect to the serial port
        """
        if not self._driver.is_connected():
            self._driver.connect(self._port, self._loop)
        self._device_info = self._driver.get_device_info()

    def _disconnect(self):
        """
        Disconnect from the serial port
        """
        if self._driver:
            self._driver.disconnect(port=self._port)

    def __del__(self):
        MODULE_LOG.info(f'MAGDECK CLASS DEL CALLED id: {id(self)}')
        self._disconnect()

    async def prep_for_update(self) -> str:
        self._driver.enter_programming_mode()
        new_port = await update.find_bootloader_port()
        return new_port or self.port
