import os
from threading import Event


from opentrons.drivers.smoothie_drivers.v3_0_0 import driver_3_0
from . import gantry

import opentrons.util.calibration_functions as calib
import opentrons.util.pose_functions as pos_funcs


from opentrons import containers, drivers
from opentrons.containers import Container
from opentrons.util.log import get_logger
from opentrons.trackers import pose_tracker
from opentrons.data_storage import database
from opentrons import helpers
from opentrons import commands
from opentrons.broker import subscribe

log = get_logger(__name__)


# FIXME: (Jared 9/18/17)
# This should be a head object - but using a string now to avoid scope creep


class InstrumentMosfet(object):
    """
    Provides access to MagBead's MOSFET.
    """

    def __init__(self, this_robot, mosfet_index):
        self.robot = this_robot
        self.mosfet_index = mosfet_index

    def engage(self):
        """
        Engages the MOSFET.
        """
        self.robot._driver.set_mosfet(self.mosfet_index, True)

    def disengage(self):
        """
        Disengages the MOSFET.
        """
        self.robot._driver.set_mosfet(self.mosfet_index, False)

    def wait(self, seconds):
        """
        Pauses protocol execution.

        Parameters
        ----------
        seconds : int
            Number of seconds to pause for.
        """
        self.robot._driver.wait(seconds)


class InstrumentMotor(object):
    """
    Provides access to Robot's head motor.
    """
    def __init__(self, this_robot, axis):
        self.robot = this_robot
        self.axis = axis

    def move(self, value, mode='absolute'):
        """
        Move plunger motor.

        Parameters
        ----------
        value : int
            A one-dimensional coordinate to move to.
        mode : {'absolute', 'relative'}
        """
        kwargs = {self.axis: value}
        self.robot._driver.move_plunger(
            mode=mode, **kwargs
        )

    def home(self):
        """
        Home plunger motor.
        """
        self.robot._driver.home(self.axis)

    def wait(self, seconds):
        """
        Wait.

        Parameters
        ----------
        seconds : int
            Number of seconds to pause for.
        """
        self.robot._driver.wait(seconds)

    def speed(self, rate):
        """
        Set motor speed.

        Parameters
        ----------
        rate : int
        """
        self.robot._driver.set_plunger_speed(rate, self.axis)
        return self


class Robot(object):
    """
    This class is the main interface to the robot.

    Through this class you can can:
        * define your :class:`opentrons.Deck`
        * :meth:`connect` to Opentrons physical robot
        * :meth:`home` axis, move head (:meth:`move_to`)
        * :meth:`pause` and :func:`resume` the protocol run
        * set the :meth:`head_speed` of the robot

    Each Opentrons protocol is a Python script. When evaluated the script
    creates an execution plan which is stored as a list of commands in
    Robot's command queue.

    Here are the typical steps of writing the protocol:
        * Using a Python script and the Opentrons API load your
          containers and define instruments
          (see :class:`~opentrons.instruments.pipette.Pipette`).
        * Call :meth:`reset` to reset the robot's state and clear commands.
        * Write your instructions which will get converted
          into an execution plan.
        * Review the list of commands generated by a protocol
          :meth:`commands`.
        * :meth:`connect` to the robot and call :func:`run` it on a real robot.

    See :class:`Pipette` for the list of supported instructions.

    Examples
    --------
    >>> from opentrons import robot, instruments, containers
    >>> robot.reset() # doctest: +ELLIPSIS
    <opentrons.robot.robot.Robot object at ...>
    >>> plate = containers.load('96-flat', 'A1', 'plate')
    >>> p200 = instruments.Pipette(axis='b', max_volume=200)
    >>> p200.aspirate(200, plate[0]) # doctest: +ELLIPSIS
    <opentrons.instruments.pipette.Pipette object at ...>
    >>> robot.commands()
    ['Aspirating 200 uL from <Well A1> at 1.0 speed']
    """

    def __init__(self):
        """
        Initializes a robot instance.

        Notes
        -----
        This class is a singleton. That means every time you call
        :func:`__init__` the same instance will be returned. There's
        only once instance of a robot.
        """
        self.pose_tracker = pose_tracker.PoseTracker()
        self._driver = driver_3_0.SmoothieDriver_3_0_0()
        self.dimensions = (395, 345, 228)



        self.INSTRUMENT_DRIVERS_CACHE = {}

        self.can_pop_command = Event()
        self.can_pop_command.set()

        self.mode = None
        self.smoothie_drivers = {
            'live': None,
            'simulate': drivers.get_virtual_driver(
                options={'limit_switches': False}
            ),
            'simulate_switches': drivers.get_virtual_driver(
                options={'limit_switches': True}
            )
        }

        null_driver = drivers.get_virtual_driver()

        def _null(*args, **kwargs):
            return

        null_driver.move = _null
        null_driver.home = _null
        self.smoothie_drivers['null'] = null_driver

        # self._driver = drivers.get_virtual_driver()
        # self.disconnect()
        self.arc_height = 5



        # self.set_connection('simulate')

        # TODO (artyom, 09182017): once protocol development experience
        # in the light of Session concept is fully fleshed out, we need
        # to properly communicate deprecation of commands. For now we'll
        # leave it as is for compatibility with documentation.
        self._commands = []
        self._unsubscribe_commands = None
        self.reset()

    def reset(self):
        """
        Resets the state of the robot and clears:
            * Deck
            * Instruments
            * Command queue
            * Runtime warnings

        """
        self._runtime_warnings = []
        self._previous_container = None

        self.pose_tracker.clear_all()
        # 0,0,0, is smoothie pos w.r.t deck

        self._deck = containers.Deck()
        self.setup_deck()
        self.setup_gantry()
        self._instruments = {}

        # TODO: Move homing info to driver
        self.axis_homed = {
            'x': False, 'y': False, 'z': False, 'a': False, 'b': False}

        self.clear_commands()

        return self

    def setup_gantry(self):
        self.gantry = gantry.Gantry(self._driver, self.pose_tracker)
        self.pose_tracker.create_root_object(self.gantry, x=0, y=0, z=0)
        self.gantry._setup_mounts()


    def add_instrument(self, mount, instrument):
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
        self._instruments[mount] = instrument
        self.gantry.mount_instrument(instrument, mount)
        # TODO: Create real pipette offsets

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

    # TODO: remove because Magbead will be controlled by RPI
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
        instr_type = 'mosfet'
        key = (instr_type, mosfet_index)

        motor_obj = self.INSTRUMENT_DRIVERS_CACHE.get(key)
        if not motor_obj:
            motor_obj = InstrumentMosfet(self, mosfet_index)
            self.INSTRUMENT_DRIVERS_CACHE[key] = motor_obj
        return motor_obj

    def get_motor(self, axis):
        """
        Get robot's head motor.

        Parameters
        ----------
        axis : {'a', 'b'}
            Axis name. Please check stickers on robot's gantry for the name.
        """
        instr_type = 'instrument'
        key = (instr_type, axis)

        motor_obj = self.INSTRUMENT_DRIVERS_CACHE.get(key)
        if not motor_obj:
            motor_obj = InstrumentMotor(self, axis)
            self.INSTRUMENT_DRIVERS_CACHE[key] = motor_obj
        return motor_obj

    def flip_coordinates(self, coordinates):
        """
        Flips between Deck and Robot coordinate systems.

        TODO: Add image explaining coordinate systems.
        """
        dimensions = self._driver.get_dimensions()
        return helpers.flip_coordinates(coordinates, dimensions)

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

        self._driver.connect()

        # device = None
        # if not port or port == drivers.VIRTUAL_SMOOTHIE_PORT:
        #     device = drivers.get_virtual_driver(options)
        # else:
        #     device = drivers.get_serial_driver(port)
        #
        # self._driver = device
        # self.smoothie_drivers['live'] = device

        # set virtual smoothie do have same dimensions as real smoothie
        # ot_v = device.ot_version
        # self.smoothie_drivers['simulate'].ot_version = ot_v
        # self.smoothie_drivers['simulate_switches'].ot_version = ot_v
        # self.smoothie_drivers['null'].ot_version = ot_v

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

        Notes
        -----
        Sometimes while executing a long protocol,
        a robot might accumulate precision
        error and it is recommended to home it. In this scenario, add
        ``robot.home('xyzab')`` into your script.

        Examples
        --------
        >>> from opentrons import Robot
        >>> robot.connect('Virtual Smoothie')
        >>> robot.home()
        """

        self.gantry.home()



        # self._driver.calm_down()
        # if args:
        #     self._update_axis_homed(*args)
        #     self._driver.home(*args)
        # else:
        #     self._update_axis_homed('xyzab')
        #     self._driver.home('z')
        #     self._driver.home('x', 'y', 'b', 'a')

    def move_head(self, *args, **kwargs):

        self._driver.move(*args, **kwargs)
        self.gantry._publish_position()

    #DEPRECATED
    def move_plunger(self, *args, **kwargs):
        self._driver.move_plunger(*args, **kwargs)

    def head_speed(self, *args, **kwargs):
        """
        Set the XY axis speeds of the robot, set in millimeters per minute

        Parameters
        ----------
        rate : int
            An integer setting the mm/minute rate of the X and Y axis.
            Speeds too fast (around 6000 and higher) will cause the robot
            to skip step, be careful when using this method

        Examples
        --------
        >>> from opentrons import robot
        >>> robot.connect('Virtual Smoothie')
        >>> robot.home()
        >>> robot.head_speed(4500)
        >>> robot.move_head(x=200, y=200)
        """
        self._driver.set_speed(*args, **kwargs)

    def move_to(self, location, instrument, strategy='arc', **kwargs):
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
        >>> from opentrons import Robot
        >>> robot.reset() # doctest: +ELLIPSIS
        <opentrons.robot.robot.Robot object at ...>
        >>> robot.connect('Virtual Smoothie')
        >>> robot.home()
        >>> plate = robot.add_container('96-flat', 'A1', 'plate')
        >>> robot.move_to(plate[0])
        >>> robot.move_to(plate[0].top())
        """

        placeable, coordinates = containers.unpack_location(location)

        # because the top position is what is tracked,
        # this checks if coordinates doesn't equal top
        offset = coordinates - placeable.top()[1]
        target = self.pose_tracker[placeable].position + offset.coordinates

        coordinates = pos_funcs.target_inst_position(
            self.pose_tracker, self.gantry, instrument, *target)

        if strategy == 'arc':
            arc_coords = self._create_arc(coordinates, instrument, placeable)
            for coord in arc_coords:
                self._driver.move(**coord)
        elif strategy == 'direct':
            position = {'x':coordinates[0], 'y': coordinates[1], instrument.axis: coordinates[2]}

            self._driver.move(**position)
        else:
            raise RuntimeError(
                'Unknown move strategy: {}'.format(strategy))

    def _create_arc(self, destination, instrument, placeable=None):
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

        travel_height = self.max_deck_height() + self.arc_height

        _, _, robot_max_z = self.dimensions #TODO: Check what this does
        arc_top = min(travel_height, robot_max_z)
        arrival_z = min(destination[2], robot_max_z)

        self._previous_container = this_container

        return [
            {'z': arc_top, 'a': arc_top},
            {'x': destination[0], 'y': destination[1]},
            {instrument.axis: arrival_z}
        ]


    # DEPRECATED
    def set_connection(self, mode):
        if mode not in self.smoothie_drivers:
            raise ValueError(
                'mode expected to be "live", "simulate_switches", '
                'or "simulate", {} provided'.format(mode)
            )

        d = self.smoothie_drivers[mode]

        # set VirtualSmoothie's coordinates to be the same as physical robot
        if d and d.is_simulating():
            if self._driver and self._driver.is_connected():
                d.connection.serial_port.set_position_from_arguments({
                    ax.upper(): val
                    for ax, val in self._driver.get_current_position().items()
                })

        self._driver = d
        if self._driver and not self._driver.is_connected():
            self._driver.toggle_port()


    #DEPRECATED
    def disconnect(self):
        """
        Disconnects from the robot.
        """
        if self._driver:
            self._driver.disconnect()

        self.axis_homed = {
            'x': False, 'y': False, 'z': False, 'a': False, 'b': False}




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
                'x_offset': 0,
                'y_offset': 0,
                'col_offset': 132.58,
                'row_offset': 90.5
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
        return 4

    def add_slots_to_deck(self):
        robot_rows = self.get_max_robot_rows()
        row_offset, col_offset, x_offset, y_offset = self.get_slot_offsets()

        for col_index, col in enumerate('ABC'):
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

    def setup_deck(self):
        self.add_slots_to_deck()
        # Setup Deck as root object for pose tracker
        self.pose_tracker.create_root_object(
            self._deck, *self._deck._coordinates
        )

        for slot in self._deck:
            self.pose_tracker.track_object(
                self._deck,
                slot,
                *slot._coordinates
            )

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

        return sorted(
            self._instruments.items(), key=lambda s: s[0].lower())

    def get_containers(self):
        """
        Returns all containers currently on the deck.
        """
        return self._deck.containers()

    def add_container(self, container_name, slot, label=None, share=False):
        if not label:
            label = container_name
        container = database.load_container(container_name)
        container.properties['type'] = container_name
        if self._deck[slot].has_children() and not share:
            raise RuntimeWarning(
                'Slot {0} has child. Use "containers.load(\'{1}\', \'{2}\', share=True)"'.format(  # NOQA
                    slot, container_name, slot))
        else:
            self._deck[slot].add(container, label)
        self.add_container_to_pose_tracker(container)
        return container

    def add_container_to_pose_tracker(self, container: Container):
        """
        Add container and child wells to pose tracker. Sets container.parent
        (slot) as pose tracker parent
        """
        self.pose_tracker.track_object(
            container.parent, container, *container._coordinates
        )
        for well in container:
            self.pose_tracker.track_object(
                container,
                well,
                *(well._coordinates + well.top()[1])
            )

    def pause(self):
        """
        Pauses execution of the protocol. Use :meth:`resume` to resume
        """
        self.can_pop_command.clear()
        self._driver.pause()

    def stop(self):
        """
        Stops execution of the protocol.
        """
        self._driver.stop()
        self.can_pop_command.set()

    def resume(self):
        """
        Resume execution of the protocol after :meth:`pause`
        """
        self.can_pop_command.set()
        self._driver.resume()

    def halt(self):
        """
        Stops execution of both the protocol and the Smoothie board immediately
        """
        self._driver.halt()
        self.can_pop_command.set()

    def get_serial_ports_list(self):
        ports = []
        # TODO: Store these settings in config
        if os.environ.get('ENABLE_VIRTUAL_SMOOTHIE', '').lower() == 'true':
            ports = [drivers.VIRTUAL_SMOOTHIE_PORT]
        ports.extend(drivers.get_serial_ports_list())
        return ports

    def is_connected(self):
        if not self._driver:
            return False
        return self._driver.is_connected()

    def is_simulating(self):
        if not self._driver:
            return False
        return self._driver.is_simulating()

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

    @commands.publish.before(command=commands.comment)
    def comment(self, msg):
        pass

    # TODO (artyom, 09182017): implement proper developer experience in light
    # of Session concept being introduced
    def commands(self):
        return self._commands

    def clear_commands(self):
        self._commands.clear()
        if self._unsubscribe_commands:
            self._unsubscribe_commands()

        def on_command(message):
            payload = message.get('payload')
            text = payload.get('text')
            if text is None:
                return

            if message['$'] == 'before':
                self._commands.append(text.format(**payload))

        self._unsubscribe_commands = subscribe(
            commands.types.COMMAND, on_command)

    def calibrate_container_with_instrument(self,
                                            container: Container,
                                            instrument,
                                            save: bool
                                            ):
        '''Calibrates a container using the bottom of the first well'''
        well = container[0]
        expected_position = self.pose_tracker[well].position

        # calibrate will well bottom, but track top of well
        expected_position[2] -= well.properties['depth']
        true_position = self.pose_tracker[instrument].position
        calib.calibrate_container_with_delta(
            container,
            self.pose_tracker,
            *(true_position - expected_position), save
        )

    def max_deck_height(self):
        return self.pose_tracker.max_z_in_subtree(self._deck)
