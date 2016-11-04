import copy
import os
from threading import Event

import serial

from opentrons import containers
from opentrons.drivers import motor as motor_drivers
from opentrons.drivers.virtual_smoothie import VirtualSmoothie
from opentrons.robot.command import Command
from opentrons.util import trace
from opentrons.util.vector import Vector
from opentrons.util.log import get_logger
from opentrons.drivers import virtual_smoothie
from opentrons.helpers import helpers
from opentrons.util.trace import traceable
from opentrons.util.singleton import Singleton


log = get_logger(__name__)


class Robot(object, metaclass=Singleton):
    """
    This class is the main interface to the robot.

    Through this class you can can:
        * define your :class:`opentrons.Deck`
        * :meth:`simulate` the protocol run
        * :meth:`connect` to Opentrons physical robot
        * :meth:`run` the protocol on a robot
        * :meth:`home` axis, move head (:meth:`move_to`)
        * :meth:`pause` and :func:`resume` the protocol run

    Each Opentrons protocol is a Python script. When evaluated the script
    creates an execution plan which is stored as a list of commands in
    Robot's command queue.

    Here are the typical steps of writing the protocol:
        * Using a Python script and the Opentrons API load your
          containers and define instruments
          (see :class:`~opentrons.instruments.pipette.Pipette`).
        * Call :meth:`reset` to reset the robot's state and command queue.
        * Write your instructions which will get converted
          into an execution plan.
        * Review the list of commands in the robot's queue by running
          :meth:`commands`.
        * Call :func:`simulate` to run the protocol it against a virtual robot.
        * :meth:`connect` to the robot and call :func:`run` it on a real robot.

    See :class:`Pipette` for the list of supported instructions.

    Examples
    --------
    >>> from opentrons.robot import Robot
    >>> from opentrons import instruments, containers
    >>> robot = Robot()
    >>> robot.reset() # doctest: +ELLIPSIS
    <opentrons.robot.robot.Robot object at ...>
    >>> plate = containers.load('96-flat', 'A1', 'plate')
    >>> p200 = instruments.Pipette(axis='b')
    >>> p200.set_max_volume(200) # doctest: +ELLIPSIS
    <opentrons.instruments.pipette.Pipette object at ...>
    >>> p200.aspirate(200, plate[0]) # doctest: +ELLIPSIS
    <opentrons.instruments.pipette.Pipette object at ...>
    >>> robot.commands()
    ['Aspirating 200uL at <Deck>/<Slot A1>/<Container plate>/<Well A1>']
    >>> robot.simulate()
    []
    """

    _commands = None  # []
    _instance = None

    VIRTUAL_SMOOTHIE_PORT = 'Virtual Smoothie'

    def __init__(self):
        """
        Initializes a robot instance.

        Notes
        -----
        This class is a singleton. That means every time you call
        :func:`__init__` the same instance will be returned. There's
        only once instance of a robot.
        """
        self.can_pop_command = Event()
        self.stopped_event = Event()

        self.can_pop_command.set()
        self.stopped_event.clear()

        self.axis_homed = {
            'x': False, 'y': False, 'z': False, 'a': False, 'b': False}

        self.connections = {
            'live': None,
            'simulate': self.get_virtual_device(
                options={'limit_switches': False}
            ),
            'simulate_switches': self.get_virtual_device(
                options={'limit_switches': True}
            )
        }

        self._driver = motor_drivers.CNCDriver()
        self.reset()

    @classmethod
    def get_instance(cls):
        """
        Deprecated. Use Robot() instead.

        Returns
        -------
        An instance of a robot.
        """

        # leaving this method for backwards compatibility
        # before Singleton meta-class was introduced
        #
        # TODO: remove method, refactor dependencies
        return Robot()

    @classmethod
    def reset_for_tests(cls):
        """
        Deprecated.
        """
        robot = Robot.get_instance()
        robot.reset()
        return robot

    def reset(self):
        """
        Resets the state of the robot and clears:
            * Deck
            * Instruments
            * Command queue
            * Runtime warnings

        """
        self._commands = []
        self._handlers = []
        self._runtime_warnings = []

        self._previous_container = None

        self._deck = containers.Deck()
        self.setup_deck()

        self._ingredients = {}  # TODO needs to be discusses/researched
        self._instruments = {}

        self.axis_homed = {
            'x': False, 'y': False, 'z': False, 'a': False, 'b': False}

        return self

    def add_instrument(self, axis, instrument):
        """
        Adds instrument to a robot.

        Parameters
        ----------
        axis : str
            Specifies which axis the instruments is attached to.
        instrument : Instrument
            An instance of a :class:`Pipette` to attached to the axis.

        Notes
        -----
        A canonical way to add to add a Pipette to a robot is:

        ::

            from opentrons.instruments.pipette import Pipette
            p200 = Pipette(axis='a')

        This will create a pipette and call :func:`add_instrument`
        to attach the instrument.
        """
        axis = axis.upper()
        self._instruments[axis] = instrument

    def add_warning(self, warning_msg):
        """
        Internal. Add a runtime warning to the queue.
        """
        self._runtime_warnings.append(warning_msg)

    def get_warnings(self):
        """
        Get current runtime warnings.

        Returns
        -------

        Runtime warnings accumulated since the last :func:`run`
        or :func:`simulate`.
        """
        return list(self._runtime_warnings)

    def get_mosfet(self, mosfet_index):
        """
        Get MOSFET for a MagBead (URL).

        Parameters
        ----------
        mosfet_index : int
            Number of a MOSFET on MagBead.

        Returns
        -------
        Instance of :class:`InstrumentMosfet`.
        """
        robot_self = self

        class InstrumentMosfet():
            """
            Provides access to MagBead's MOSFET.
            """

            def __init__(self):
                self.motor_driver = robot_self._driver

            def engage(self):
                """
                Engages the MOSFET.
                """
                self.motor_driver.set_mosfet(mosfet_index, True)

            def disengage(self):
                """
                Disengages the MOSFET.
                """
                self.motor_driver.set_mosfet(mosfet_index, False)

            def wait(self, seconds):
                """
                Pauses protocol execution.

                Parameters
                ----------
                seconds : int
                    Number of seconds to pause for.
                """
                self.motor_driver.wait(seconds)

        return InstrumentMosfet()

    def get_motor(self, axis):
        """
        Get robot's head motor.

        Parameters
        ----------
        axis : {'a', 'b'}
            Axis name. Please check stickers on robot's gantry for the name.
        """
        robot_self = self

        class InstrumentMotor():

            """
            Provides access to Robot's head motor.
            """

            def __init__(self):
                self.motor_driver = robot_self._driver

            def move(self, value, mode='absolute'):
                """
                Move plunger motor.

                Parameters
                ----------
                value : int
                    A one-dimensional coordinate to move to.
                mode : {'absolute', 'relative'}
                """
                kwargs = {axis: value}
                return self.motor_driver.move_plunger(
                    mode=mode, **kwargs
                )

            def home(self):
                """
                Home plunger motor.
                """
                return self.motor_driver.home(axis)

            def wait(self, seconds):
                """
                Wait.

                Parameters
                ----------
                seconds : int
                    Number of seconds to pause for.
                """
                self.motor_driver.wait(seconds)

            def speed(self, rate):
                """
                Set motor speed.

                Parameters
                ----------
                rate : int
                """
                self.motor_driver.set_plunger_speed(rate, axis)
                return self

        return InstrumentMotor()

    def flip_coordinates(self, coordinates):
        """
        Flips between Deck and Robot coordinate systems.

        TODO: Add image explaining coordinate systems.
        """
        dimensions = self._driver.get_dimensions()
        return helpers.flip_coordinates(coordinates, dimensions)

    def get_serial_device(self, port):
        """
        Connect to a serial CNC device.

        Parameters
        ----------
        port : str
            OS-specific port name.

        Returns
        -------
        Serial device instance to be supplied to :func:`connect`
        """
        try:
            device = serial.Serial(
                port=port,
                baudrate=115200,
                timeout=self._driver.serial_timeout
            )
            return device
        except serial.SerialException as e:
            log.debug(
                "Error connecting to {}".format(port))
            log.error(e)

        return None

    def get_virtual_device(self, port=None, options=None):
        """
        Connect to a :class:`VirtualSmoothie` to simulate behavior of
        a Smoothieboard

        Parameters
        ----------
        port : str
            Port name. Could be `None` or anything.
        options : dict
            Options to be passed to :class:`VirtualSmoothie`.

            Default:

            ::

                default_options = {
                    'limit_switches': True,
                    'firmware': 'v1.0.5',
                    'config': {
                        'ot_version': 'one_pro',
                        'version': 'v1.0.3',        # config version
                        'alpha_steps_per_mm': 80.0,
                        'beta_steps_per_mm': 80.0
                    }
                }

        """
        default_options = {
            'limit_switches': True,
            'firmware': 'v1.0.5',
            'config': {
                'ot_version': 'one_pro',
                'version': 'v1.2.0',        # config version
                'alpha_steps_per_mm': 80.0,
                'beta_steps_per_mm': 80.0
            }
        }
        if not options:
            options = {}
        default_options.update(options)
        return VirtualSmoothie(port=port, options=default_options)

    def connect(self, port=None, options=None):
        """
        Connects the robot to a serial port.

        Parameters
        ----------
        port : str
            OS-specific port name or ``'Virtual Smoothie'``
        options : dict
            if :attr:`port` is set to ``'Virtual Smoothie'``, provide
            the list of options to be passed to :func:`get_virtual_device`

        Returns
        -------
        ``True`` for success, ``False`` for failure.
        """
        device = None
        if not port or port == self.VIRTUAL_SMOOTHIE_PORT:
            device = self.get_virtual_device(
                port=self.VIRTUAL_SMOOTHIE_PORT, options=options)
        else:
            device = self.get_serial_device(port)

        res = self._driver.connect(device)

        if res:
            self.connections['live'] = device

        return res

    def _update_axis_homed(self, *args):
        for a in args:
            for letter in a:
                if letter.lower() in self.axis_homed:
                    self.axis_homed[letter.lower()] = True

    def home(self, *args, **kwargs):
        """
        Home robot's head and plunger motors.

        Parameters
        ----------
        *args :
            A string with axes to home. For example ``'xyz'`` or ``'ab'``.

            If no arguments provided home Z-axis then X, Y, B, A

        enqueue : {True, False} Default: ``False``
            If ``True`` put into command queue,
            if ``False`` execute immediately.

        Notes
        -----
        Sometimes while executing a long protocol,
        a robot might accumulate precision
        error and it is recommended to home it. In this scenario, add
        ``robot.home('xyzab', enqueue=True)`` into your script.

        Examples
        --------
        >>> from opentrons.robot import Robot
        >>> robot.connect('Virtual Smoothie')
        True
        >>> robot.home()
        True
        """
        def _do():
            if self._driver.calm_down():
                if args:
                    self._update_axis_homed(*args)
                    return self._driver.home(*args)
                else:
                    self._update_axis_homed('xyzab')
                    self._driver.home('z')
                    return self._driver.home('x', 'y', 'b', 'a')
            else:
                return False

        if kwargs.get('enqueue'):
            description = "Homing Robot"
            self.add_command(Command(do=_do, description=description))
        else:
            log.info('Executing: Home now')
            return _do()

    def add_command(self, command):

        if command.description:
            log.info("Enqueuing: {}".format(command.description))
        if command.setup:
            command.setup()
        self._commands.append(command)

    def register(self, name, callback):
        def commandable():
            self.add_command(Command(do=callback))
        setattr(self, name, commandable)

    def move_head(self, *args, **kwargs):
        self._driver.move_head(*args, **kwargs)

    def head_speed(self, rate):
        self._driver.set_head_speed(rate)

    @traceable('move-to')
    def move_to(self, location, instrument=None, strategy='arc', **kwargs):
        """
        Move an instrument to a coordinate, container or a coordinate within
        a container.

        Parameters
        ----------
        location : one of the following:
            1. :class:`Placeable` (i.e. Container, Deck, Slot, Well) — will
            move to the origin of a container.
            2. :class:`Vector` move to the given coordinate in Deck coordinate
            system.
            3. (:class:`Placeable`, :class:`Vector`) move to a given coordinate
            within object's coordinate system.

        instrument :
            Instrument to move relative to. If ``None``, move relative to the
            center of a gantry.

        strategy : {'arc', 'direct'}
            ``arc`` : move to the point using arc trajectory
            avoiding obstacles.

            ``direct`` : move to the point in a straight line.

        Examples
        --------
        >>> from opentrons.robot import Robot
        >>> robot.reset() # doctest: +ELLIPSIS
        <opentrons.robot.robot.Robot object at ...>
        >>> robot.connect('Virtual Smoothie')
        True
        >>> robot.home()
        True
        >>> plate = robot.add_container('A1', '96-flat', 'plate')
        >>> robot.move_to(plate[0])
        >>> robot.move_to(plate[0].top())
        """

        enqueue = kwargs.get('enqueue', False)
        # Adding this for backwards compatibility with old move_to(now=False)
        # convention.
        if 'now' in kwargs:
            enqueue = not kwargs.get('now')

        placeable, coordinates = containers.unpack_location(location)

        if instrument:
            coordinates = instrument.calibrator.convert(
                placeable,
                coordinates)
        else:
            coordinates += placeable.coordinates(placeable.get_deck())

        def _do():
            if strategy == 'arc':
                arc_coords = self._create_arc(coordinates, placeable)
                for coord in arc_coords:
                    self._driver.move_head(**coord)
            elif strategy == 'direct':
                self._driver.move_head(
                    x=coordinates[0],
                    y=coordinates[1],
                    z=coordinates[2]
                )
            else:
                raise RuntimeError(
                    'Unknown move strategy: {}'.format(strategy))

        if enqueue:
            self.add_command(Command(do=_do))
        else:
            _do()

    def _calibrated_max_dimension(self, container=None):
        """
        Returns a Vector, each axis being the calibrated maximum
        for all instruments
        """
        if not self._instruments or not self.containers():
            if container:
                return container.max_dimensions(self._deck)
            return self._deck.max_dimensions(self._deck)

        def _max_per_instrument(placeable):
            """
            Returns list of Vectors, one for each Instrument's farthest
            calibrated coordinate for the supplied placeable
            """
            return [
                instrument.calibrator.convert(
                    placeable,
                    placeable.max_dimensions(placeable)
                )
                for instrument in self._instruments.values()
            ]

        container_max_coords = []
        if container:
            container_max_coords = _max_per_instrument(container)
        else:
            for c in self.containers().values():
                container_max_coords += _max_per_instrument(c)

        max_coords = [
            max(
                container_max_coords,
                key=lambda coordinates: coordinates[axis]
            )[axis]
            for axis in range(3)
        ]

        return Vector(max_coords)

    def _create_arc(self, destination, placeable=None):
        """
        Returns a list of coordinates to arrive to the destination coordinate
        """
        this_container = None
        if isinstance(placeable, containers.Well):
            this_container = placeable.get_parent()
        elif isinstance(placeable, containers.WellSeries):
            this_container = placeable.get_parent()
        elif isinstance(placeable, containers.Container):
            this_container = placeable

        ref_container = None
        if this_container and (self._previous_container == this_container):
            ref_container = this_container

        _, _, tallest_z = self._calibrated_max_dimension(ref_container)
        _, _, robot_max_z = self._driver.get_dimensions()
        arc_top = min(tallest_z, robot_max_z)

        self._previous_container = this_container

        return [
            {'z': arc_top},
            {'x': destination[0], 'y': destination[1]},
            {'z': destination[2]}
        ]

    @property
    def actions(self):
        """
        Return a copy of a raw list of commands in the Robot's queue.
        """
        return copy.deepcopy(self._commands)

    def prepare_for_run(self):
        """
        Internal. Prepare for a Robot's run.
        """
        if not self._driver.connection:
            raise RuntimeWarning('Please connect to the robot')

        self._runtime_warnings = []

        if not self._instruments:
            self.add_warning('No instruments added to robot')
        if not self._commands:
            self.add_warning('No commands added to robot')

        for instrument in self._instruments.values():
            instrument.reset()

    def run(self, **kwargs):
        """
        Run the command queue on a device provided in :func:`connect`.

        Notes
        -----
        If :func:`connect` was called with ``port='Virtual Smoothie'``
        it will execute similar to :func:`simulate`.

        Examples
        --------
        ..
        >>> from opentrons.robot import Robot
        >>> from opentrons.instruments.pipette import Pipette
        >>> robot.reset() # doctest: +ELLIPSIS
        <opentrons.robot.robot.Robot object at ...>
        >>> robot.connect('Virtual Smoothie')
        True
        >>> robot.home()
        True
        >>> plate = robot.add_container('A1', '96-flat', 'plate')
        >>> p200 = Pipette(axis='a')
        >>> robot.move_to(plate[0])
        >>> robot.move_to(plate[0].top())
        """
        self.prepare_for_run()

        cmd_run_event = {}
        cmd_run_event.update(kwargs)

        mode = 'live'
        if isinstance(
                self._driver.connection, virtual_smoothie.VirtualSmoothie
        ):
            mode = 'simulate'

        cmd_run_event['mode'] = mode
        for i, command in enumerate(self._commands):
            cmd_run_event.update({
                'command_description': command.description,
                'command_index': i
            })
            try:
                self.can_pop_command.wait()
                if self.stopped_event.is_set():
                    self.resume()
                    break
                if command.description:
                    log.info("Executing: {}".format(command.description))
                command()
                # emit command was done...
                cmd_run_event['name'] = 'command-run',
                trace.EventBroker.get_instance().notify(cmd_run_event)
            except Exception as e:
                cmd_run_event['name'] = 'command-failed',
                cmd_run_event['error'] = str(e),
                trace.EventBroker.get_instance().notify(cmd_run_event)
                raise e

        return self._runtime_warnings

    def simulate(self, switches=False):
        """
        Simulate a protocol run on a virtual robot.

        It is recommended to call this method before running the
        protocol on a real robot.

        Parameters
        ----------
        switches : bool
            If ``True`` tells the robot to stop
            execution and throw an error if limit switch was hit.
        """
        if switches:
            self.set_connection('simulate_switches')
        else:
            self.set_connection('simulate')
        for instrument in self._instruments.values():
            instrument.setup_simulate()

        res = self.run()

        self.set_connection('live')

        for instrument in self._instruments.values():
            instrument.teardown_simulate()

        return res

    def set_connection(self, mode):
        if mode in self.connections:
            connection = self.connections[mode]
            if connection:
                self._driver.connection = connection
            else:
                self._driver.disconnect()
        else:
            raise ValueError(
                'mode expected to be "live" or "simulate", '
                '{} provided'.format(mode))

    def disconnect(self):
        """
        Disconnects from the robot.
        """
        if self._driver:
            self._driver.disconnect()

        self.axis_homed = {
            'x': False, 'y': False, 'z': False, 'a': False, 'b': False}

        self.connections['live'] = None

    def containers(self):
        """
        Returns the list of the containers on the deck.
        """
        return self._deck.containers()

    def get_deck_slot_types(self):
        return 'slots'

    def get_slot_offsets(self):
        """
        col_offset
        - from bottom left corner of A to bottom corner of B

        row_offset
        - from bottom left corner of 1 to bottom corner of 2

        TODO: figure out actual X and Y offsets (from origin)
        """
        SLOT_OFFSETS = {
            'slots': {
                'x_offset': 10,
                'y_offset': 10,
                'col_offset': 91,
                'row_offset': 134.5
            }
        }
        slot_settings = SLOT_OFFSETS.get(self.get_deck_slot_types())
        row_offset = slot_settings.get('row_offset')
        col_offset = slot_settings.get('col_offset')
        x_offset = slot_settings.get('x_offset')
        y_offset = slot_settings.get('y_offset')
        return (row_offset, col_offset, x_offset, y_offset)

    def get_max_robot_rows(self):
        # TODO: dynamically figure out robot rows
        return 3

    def setup_deck(self):
        robot_rows = self.get_max_robot_rows()
        row_offset, col_offset, x_offset, y_offset = self.get_slot_offsets()

        for col_index, col in enumerate('ABCDE'):
            for row_index, row in enumerate(range(1, robot_rows + 1)):
                properties = {
                    'width': col_offset,
                    'length': row_offset,
                    'height': 0
                }
                slot = containers.Slot(properties=properties)
                slot_coordinates = (
                    (col_offset * col_index) + x_offset,
                    (row_offset * row_index) + y_offset,
                    0  # TODO: should z always be zero?
                )
                slot_name = "{}{}".format(col, row)
                self._deck.add(slot, slot_name, slot_coordinates)

    @property
    def deck(self):
        return self._deck

    def get_instruments_by_name(self, name):
        res = []
        for k, v in self.get_instruments():
            if v.name == name:
                res.append((k, v))

        return res

    def get_instruments(self, name=None):
        """
        :returns: sorted list of (axis, instrument)
        """
        if name:
            return self.get_instruments_by_name(name)

        return sorted(self._instruments.items())

    def add_container(self, slot, container_name, label):
        container = containers.get_persisted_container(container_name)
        container.properties['type'] = container_name
        self._deck[slot].add(container, label)
        return container

    def clear_commands(self):
        """
        Clear Robot's command queue.
        """
        self._previous_container = None
        self._commands = []

    def pause(self):
        """
        Pauses execution of the protocol. Use :meth:`resume` to resume
        """
        self.can_pop_command.clear()
        self.stopped_event.clear()
        self._driver.pause()

    def stop(self):
        """
        Stops execution of the protocol.
        """
        self.stopped_event.set()
        self.can_pop_command.set()
        self._driver.stop()

    def resume(self):
        """
        Resume execution of the protocol after :meth:`pause`
        """
        self.stopped_event.clear()
        self.can_pop_command.set()
        self._driver.resume()

    def get_serial_ports_list(self):
        ports = []
        # TODO: Store these settings in config
        if os.environ.get('ENABLE_VIRTUAL_SMOOTHIE', '').lower() == 'true':
            ports = [self.VIRTUAL_SMOOTHIE_PORT]
        ports.extend(self._driver.get_serial_ports_list())
        return ports

    def is_connected(self):
        return self._driver.is_connected()

    def get_connected_port(self):
        return self._driver.get_connected_port()

    def versions(self):
        # TODO: Store these versions in config
        compatible = self._driver.versions_compatible()
        return {
            'firmware': {
                'version': self._driver.get_firmware_version(),
                'compatible': compatible['firmware']
            },
            'config': {
                'version': self._driver.get_config_version(),
                'compatible': compatible['config']
            },
            'ot_version': {
                'version': self._driver.get_ot_version(),
                'compatible': compatible['ot_version']
            }
        }

    def diagnostics(self):
        """
        Access diagnostics information for the robot.

        Returns
        -------
        Dictionary with the following keys:
            * ``axis_homed`` — axis that are currently in home position.
            * ``switches`` — end stop switches currently hit.
            * ``steps_per_mm`` — steps per millimeter calibration
            values for ``x`` and ``y`` axis.
        """
        # TODO: Store these versions in config
        return {
            'axis_homed': self.axis_homed,
            'switches': self._driver.get_endstop_switches(),
            'steps_per_mm': {
                'x': self._driver.get_steps_per_mm('x'),
                'y': self._driver.get_steps_per_mm('y')
            }
        }

    def commands(self):
        """
        Access the human-readable list of commands in the robot's queue.

        Returns
        -------
        A list of string values for each command in the queue, for example:

        ``'Aspirating 200uL at <Deck>/<Slot A1>/<Container plate>/<Well A1>'``
        """
        return [c.description for c in self._commands]
