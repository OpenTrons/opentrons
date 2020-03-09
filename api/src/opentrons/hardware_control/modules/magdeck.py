import asyncio
import logging
from typing import Mapping, Optional, Union
from opentrons.drivers.mag_deck import MagDeck as MagDeckDriver
from opentrons.drivers.mag_deck.driver import mag_locks
from ..execution_manager import ExecutionManager
from . import update, mod_abc, types

log = logging.getLogger('__name__')

LABWARE_ENGAGE_HEIGHT = {'biorad-hardshell-96-PCR': 18}    # mm
MAX_ENGAGE_HEIGHT = 45  # mm from home position
OFFSET_TO_LABWARE_BOTTOM = 5

FIRST_GEN2_REVISION = 20


def _model_from_revision(revision: Optional[str]) -> str:
    """ Defines the revision -> model mapping """
    if not revision or 'v' not in revision:
        log.error(f'bad revision: {revision}')
        return 'magneticModuleV1'
    try:
        revision_num = float(revision.split('v')[-1])  # type: ignore
    except (ValueError, TypeError):
        log.exception('bad revision: {revision}')
        return 'magneticModuleV1'
    if revision_num < FIRST_GEN2_REVISION:
        return 'magneticModuleV1'
    else:
        return 'magneticModuleV2'


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

    def move(self, location: float):
        self._height = location

    def get_device_info(self) -> Mapping[str, str]:
        return {'serial': 'dummySerialMD',
                'model': 'dummyModelMD',
                'version': 'dummyVersionMD'}

    def connect(self, port: str):
        pass

    def disconnect(self, port: str = None):
        pass

    def enter_programming_mode(self):
        pass

    @property
    def plate_height(self) -> float:
        return self._height

    @property
    def mag_position(self) -> float:
        return self._height

    def is_connected(self) -> bool:
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

    def model(self) -> str:
        return _model_from_revision(self._device_info.get('model'))

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
        self._device_info: Mapping[str, str] = {}
        if mag_locks.get(port):
            self._driver = mag_locks[port][1]
        else:
            self._driver = self._build_driver(simulating)  # type: ignore

    async def calibrate(self):
        """
        Calibration involves probing for top plate to get the plate height
        """
        await self.wait_for_is_running()
        self._driver.probe_plate()
        # return if successful or not?

    async def engage(self, height: float):
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
    def current_height(self) -> float:
        return self._driver.mag_position

    @property
    def device_info(self) -> Mapping[str, str]:
        """
        Returns a dict:
            { 'serial': 'abc123', 'model': '8675309', 'version': '9001' }
        """
        return self._device_info

    @property
    def status(self) -> str:
        if self.current_height > 0:
            return 'engaged'
        else:
            return 'disengaged'

    @property
    def engaged(self) -> bool:
        if self.current_height > 0:
            return True
        else:
            return False

    @property
    def live_data(self) -> types.LiveData:
        return {
            'status': self.status,
            'data': {
                'engaged': self.engaged,
                'height': self.current_height
            }
        }

    @property
    def port(self) -> str:
        return self._port

    @property
    def is_simulated(self) -> bool:
        return isinstance(self._driver, SimulatingDriver)

    @property
    def interrupt_callback(self) -> types.InterruptCallback:
        return lambda x: None

    @property
    def loop(self) -> asyncio.AbstractEventLoop:
        return self._loop

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    # Internal Methods

    async def _connect(self):
        """
        Connect to the serial port
        """
        if not self._driver.is_connected():
            self._driver.connect(self._port)
        self._device_info = self._driver.get_device_info()

    def _disconnect(self):
        """
        Disconnect from the serial port
        """
        if self._driver:
            self._driver.disconnect(port=self._port)

    def __del__(self):
        self._disconnect()

    async def prep_for_update(self) -> str:
        self._driver.enter_programming_mode()
        new_port = await update.find_bootloader_port()
        return new_port or self.port
