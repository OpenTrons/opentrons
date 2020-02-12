""" Adapters for the :py:class:`.hardware_control.API` instances.
"""
import asyncio
import copy
import functools
import threading
import logging
from typing import List, Mapping

from . import API, thread_manager
from .types import Axis, HardwareAPILike

MODULE_LOG = logging.getLogger(__name__)


class SynchronousAdapter(HardwareAPILike):
    """ A wrapper to make every call into :py:class:`.hardware_control.API`
    synchronous.

    Example
    -------
    .. code-block::
    >>> import opentrons.hardware_control as hc
    >>> import opentrons.hardware_control.adapters as adapts
    >>> api = hc.API.build_hardware_simulator()
    >>> synch = adapts.SynchronousAdapter(api)
    >>> synch.home()
    """

    @classmethod
    def build(cls, builder, *args, build_loop=None, **kwargs):
        """ Build a hardware control API and initialize the adapter in one call

        :param builder: the builder method to use (e.g.
                        :py:meth:`hardware_control.API.build_hardware_simulator`)
        :param args: Args to forward to the builder method
        :param kwargs: Kwargs to forward to the builder method
        """
        loop = asyncio.new_event_loop()
        kwargs['loop'] = loop
        args = [arg for arg in args
                if not isinstance(arg, asyncio.AbstractEventLoop)]
        if asyncio.iscoroutinefunction(builder):
            checked_loop = build_loop or asyncio.get_event_loop()
            api = checked_loop.run_until_complete(builder(*args, **kwargs))
        else:
            api = builder(*args, **kwargs)
        return cls(api, loop)

    def __init__(self,
                 api: API,
                 loop: asyncio.AbstractEventLoop = None) -> None:
        """ Build the SynchronousAdapter.

        :param api: The API instance to wrap
        :param loop: A specific event loop to use. This is for the use of
                     :py:meth:`build` and should normally not be used; since
                     this loop will be run in a worker thread it should not
                     be run elsewhere. If not specified (which should be the
                     normal use case) the adapter will start a new event loop
                     for the worker thread.
        """
        MODULE_LOG.info(
            f'\nSYNC ADAPTER init loop: {loop} api._loop: {api._loop}\n')
        self._loop = loop or api._loop
        self._api = api

    def __repr__(self):
        return '<SynchronousAdapter>'

    def __del__(self):
        try:
            loop = object.__getattribute__(self, '_loop')
        except AttributeError:
            pass
        else:
            if loop.is_running():
                loop.call_soon_threadsafe(lambda: loop.stop())

    @staticmethod
    def call_coroutine_sync(loop, to_call, *args, **kwargs):
        fut = asyncio.run_coroutine_threadsafe(to_call(*args, **kwargs), loop)
        return fut.result()

    def __getattribute__(self, attr_name):
        """ Retrieve attributes from our API and wrap coroutines """
        # Almost every attribute retrieved from us will be for people actually
        # looking for an attribute of the hardware API, so check there first.
        api = object.__getattribute__(self, '_api')
        try:
            attr = getattr(api, attr_name)
        except AttributeError:
            # Maybe this actually was for us? Let’s find it
            return object.__getattribute__(self, attr_name)

        try:
            check = attr.__wrapped__
        except AttributeError:
            check = attr
        loop = object.__getattribute__(self, '_loop')
        if asyncio.iscoroutinefunction(check):
            # Return a synchronized version of the coroutine
            return functools.partial(self.call_coroutine_sync, loop, attr)
        elif asyncio.iscoroutine(check):
            # Catch awaitable properties and reify the future before returning
            fut = asyncio.run_coroutine_threadsafe(check, loop)
            return fut.result()

        return attr


class SingletonAdapter(HardwareAPILike):
    """ A wrapper to use as a global singleton to control hardware.

    This wrapper adds some useful utility functions to defer initialization
    of true hardware controllers (to cut down on work at module import time)
    and in general ease the transition away from the direct use of the old
    robot singleton.

    When the :py:class:`SingletonAdapter` is initialized, it will make a
    hardware simulator instance. When :py:meth:`connect` is called, this
    simulator will be replaced with a new controller that connects to the
    hardware with the specified arguments.

    Attribute accesses are passed on to the embedded
    :py:class:`.hardware_control.API`.
    """

    @classmethod
    def build_in_managed_thread(cls) -> 'SingletonAdapter':
        return thread_manager.HardwareThreadManager(cls)

    def __init__(self, loop: asyncio.AbstractEventLoop = None) -> None:
        self._api = API.build_hardware_simulator(loop=loop)

    def __getattr__(self, attr_name):
        return getattr(self._api, attr_name)

    async def connect(self, port: str = None):
        """ Connect to hardware.

        :param port: The port to connect to. May be `None`, in which case the
                     hardware will connect to the first serial port it sees
                     with the device name `FT232R`; or port name compatible
                     with `serial.Serial<https://pythonhosted.org/pyserial/pyserial_api.html#serial.Serial.__init__>`_.  # noqa(E501)
        """
        old_api = object.__getattribute__(self, '_api')
        config = await old_api.config
        new_api = await API.build_hardware_controller(
            loop=old_api._loop,
            port=port,
            config=copy.copy(config))
        await new_api.cache_instruments()
        setattr(self, '_api', new_api)

    async def disconnect(self):
        """ Disconnect from connected hardware. """
        old_api = object.__getattribute__(self, '_api')
        config = old_api._loop.run_until_complete(old_api.config)
        new_api = API.build_hardware_simulator(
            loop=old_api._loop,
            config=copy.copy(config))
        setattr(self, '_api', new_api)

    def is_connected(self):
        """ `True` if connected (e.g. has a real controller backing it). """
        api = object.__getattribute__(self, '_api')
        return api.is_simulator_sync

    async def disengage_axes(self, which: List[str]):
        api = object.__getattribute__(self, '_api')
        await api.disengage_axes([Axis[ax.upper()] for ax in which])

    async def get_attached_pipettes(self):
        """ Mimic the behavior of robot.get_attached_pipettes"""
        api = object.__getattribute__(self, '_api')
        instrs = {}
        attached = await api.attached_instruments
        for mount, data in attached.items():
            instrs[mount.name.lower()] = {
                'model': data.get('model', None),
                'name': data.get('name', None),
                'id': data.get('pipette_id', None),
                'mount_axis': Axis.by_mount(mount),
                'plunger_axis': Axis.of_plunger(mount)
            }
            if data.get('model'):
                instrs[mount.name.lower()]['tip_length'] \
                    = data.get('tip_length', None)

        return instrs
