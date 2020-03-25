from functools import lru_cache
from opentrons.hardware_control import HardwareAPILike, ThreadedAsyncLock
from . import HARDWARE_APP_KEY


async def get_hardware() -> HardwareAPILike:
    """Hardware dependency"""
    from .main import app
    # todo Amit 2/11/2020. This function should create and return a singleton
    #  hardware interface.
    return app.extra[HARDWARE_APP_KEY]  # type: ignore


@lru_cache(maxsize=1)
def get_motion_lock() -> ThreadedAsyncLock:
    """
    Get the single motion lock.

    :return: a threaded async lock
    """
    return ThreadedAsyncLock()
