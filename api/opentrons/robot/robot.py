import os
from functools import lru_cache

import opentrons.util.calibration_functions as calib
from numpy import add, subtract
from opentrons import commands, containers, drivers, helpers
from opentrons.broker import subscribe
from opentrons.containers import Container
from opentrons.data_storage import database
from opentrons.drivers.smoothie_drivers import driver_3_0
from opentrons.robot.mover import Mover
from opentrons.robot.robot_configs import load
from opentrons.trackers import pose_tracker
from opentrons.util.log import get_logger

log = get_logger(__name__)

# TODO (andy) this is the height the tip will travel above the deck's tallest
# container. This should not be a single value, but should be optimized given
# the movements context (ie sterility vs speed). This is being set to 20mm
# to allow containers >150mm to be usable on the deck for the tiem being.
TIP_CLEARANCE = 20


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


def _setup_container(container_name):
    container = database.load_container(container_name)
    container.properties['type'] = container_name

    container_x, container_y, container_z = container._coordinates

    # infer z from height
    if container_z == 0 and 'height' in container[0].properties:
        container_z = container[0].properties['height']

    from opentrons.util.vector import Vector
    container._coordinates = Vector(
        container_x,
        container_y,
        container_z)

    return container


# NOTE: modules are stored in the Containers db table
def _setup_module(module):
    x, y, z = database.load_module(module.name)
    from opentrons.util.vector import Vector
    module._coordinates = Vector(x, y, z)
    return module


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
    >>> p200 = instruments.Pipette(axis='b')
    >>> p200.aspirate(200, plate[0]) # doctest: +ELLIPSIS
    <opentrons.instruments.pipette.Pipette object at ...>
    >>> robot.commands()
    ['Aspirating 200 uL from <Well A1> at 1.0 speed']
    """

    def __init__(self, config=None):
        """
        Initializes a robot instance.

        Notes
        -----
        This class is a singleton. That means every time you call
        :func:`__init__` the same instance will be returned. There's
        only once instance of a robot.
        """
        self.config = config or load()
        self._driver = driver_3_0.SmoothieDriver_3_0_0(config=self.config)
        self.modules = []
        self.fw_version = self._driver.get_fw_version()

        # TODO (andy) should come from a config file
        # TODO (andy) height 200 is arbitrary, should calc per pipette/tip?
        self.dimensions = (393, 357.5, 200)

        self.INSTRUMENT_DRIVERS_CACHE = {}

        self.arc_height = TIP_CLEARANCE

        # TODO (artyom, 09182017): once protocol development experience
        # in the light of Session concept is fully fleshed out, we need
        # to properly communicate deprecation of commands. For now we'll
        # leave it as is for compatibility with documentation.
        self._commands = []
        self._unsubscribe_commands = None
        self.reset()

    def _get_placement_location(self, placement):
        location = None
        # If `placement` is a string, assume it is a slot
        if isinstance(placement, str):
            location = self._deck[placement]
        elif getattr(placement, 'stackable', False):
            location = placement
        return location

    def _is_available_slot(self, location, share, slot, container_name):
        if pose_tracker.has_children(self.poses, location) and not share:
            raise RuntimeWarning(
                'Slot {0} has child. Use "containers.load(\'{1}\', \'{2}\', share=True)"'.format(  # NOQA
                    slot, container_name, slot))
        else:
            return True

    def reset(self):
        """
        Resets the state of the robot and clears:
            * Deck
            * Instruments
            * Command queue
            * Runtime warnings

        """

        self._actuators = {
            'left': {
                'carriage': Mover(
                    driver=self._driver,
                    src=pose_tracker.ROOT,
                    dst=id(self.config.gantry_calibration),
                    axis_mapping={'z': 'Z'}),
                'plunger': Mover(
                    driver=self._driver,
                    src=pose_tracker.ROOT,
                    dst='volume-calibration-left',
                    axis_mapping={'x': 'B'})
            },
            'right': {
                'carriage': Mover(
                    driver=self._driver,
                    src=pose_tracker.ROOT,
                    dst=id(self.config.gantry_calibration),
                    axis_mapping={'z': 'A'}),
                'plunger': Mover(
                    driver=self._driver,
                    src=pose_tracker.ROOT,
                    dst='volume-calibration-right',
                    axis_mapping={'x': 'C'})
            }
        }

        self.poses = pose_tracker.init()

        self._runtime_warnings = []
        self._previous_container = None

        self._deck = containers.Deck()
        self._fixed_trash = None
        self.setup_deck()
        self.setup_gantry()
        self._instruments = {}

        # TODO: Move homing info to driver
        self.axis_homed = {
            'x': False, 'y': False, 'z': False, 'a': False, 'b': False}

        self.clear_commands()

        return self

    def turn_on_button_light(self):
        self._driver.turn_on_button_light()

    def turn_off_button_light(self):
        self._driver.turn_off_button_light()

    def turn_on_rail_lights(self):
        self._driver.turn_on_rail_lights()

    def turn_off_rail_lights(self):
        self._driver.turn_off_rail_lights()

    def identify(self, seconds):
        """
        Identify a robot by flashing the light around the frame button for 10s
        """
        from time import sleep
        for i in range(seconds):
            self.turn_off_button_light()
            sleep(0.25)
            self.turn_on_button_light()
            sleep(0.25)

    def setup_gantry(self):
        driver = self._driver

        left_carriage = self._actuators['left']['carriage']
        right_carriage = self._actuators['right']['carriage']

        left_plunger = self._actuators['left']['plunger']
        right_plunger = self._actuators['right']['plunger']

        self.gantry = Mover(
            driver=driver,
            axis_mapping={'x': 'X', 'y': 'Y'},
            src=pose_tracker.ROOT,
            dst=id(self.config.gantry_calibration)
        )

        # Extract only transformation component
        inverse_transform = pose_tracker.inverse(
            pose_tracker.extract_transform(self.config.gantry_calibration))

        self.poses = pose_tracker.bind(self.poses) \
            .add(
                obj=id(self.config.gantry_calibration),
                transform=self.config.gantry_calibration) \
            .add(obj=self.gantry, parent=id(self.config.gantry_calibration)) \
            .add(obj=left_carriage, parent=self.gantry) \
            .add(obj=right_carriage, parent=self.gantry) \
            .add(
                obj='left',
                parent=left_carriage,
                transform=inverse_transform) \
            .add(
                obj='right',
                parent=right_carriage,
                transform=inverse_transform) \
            .add(obj='volume-calibration-left') \
            .add(obj='volume-calibration-right') \
            .add(obj=left_plunger, parent='volume-calibration-left') \
            .add(obj=right_plunger, parent='volume-calibration-right')

    def add_instrument(self, mount, instrument):
        """
        Adds instrument to a robot.

        Parameters
        ----------
        mount : str
            Specifies which axis the instruments is attached to.
            Valid options are "left" or "right".
        instrument : Instrument
            An instance of a :class:`Pipette` to attached to the axis.

        Notes
        -----
        A canonical way to add to add a Pipette to a robot is:

        ::

            from opentrons.instruments.pipette import Pipette
            p200 = Pipette(mount='left')

        This will create a pipette and call :func:`add_instrument`
        to attach the instrument.
        """
        if mount in self._instruments:
            prev_instr = self._instruments[mount]
            raise RuntimeError('Instrument {0} already on {1} mount'.format(
                prev_instr.name, mount))
        self._instruments[mount] = instrument
        instrument.instrument_actuator = self._actuators[mount]['plunger']
        instrument.instrument_mover = self._actuators[mount]['carriage']
        # We are creating two pose_tracker entries for instrument
        # one id(instrument) to store it's offset vector and another
        # with zero offset, which can be increased/decreased by
        # tip length for pickup and drop tip
        self.poses = pose_tracker.add(
            self.poses,
            instrument,
            parent=mount,
            point=self.config.instrument_offset[mount][instrument.type]
        )

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
        for module in self.modules:
            module.connect()
        self.fw_version = self._driver.get_fw_version()

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

        # Home pipettes first to avoid colliding with labware
        # and to make sure tips are not in the liquid while
        # homing plungers
        self.poses = self._actuators['left']['carriage'].home(self.poses)
        self.poses = self._actuators['right']['carriage'].home(self.poses)
        # Then plungers
        self.poses = self._actuators['left']['plunger'].home(self.poses)
        self.poses = self._actuators['right']['plunger'].home(self.poses)
        # Gantry goes last to avoid any further movement while
        # close to XY switches so we are don't accidentally hit them
        self.poses = self.gantry.home(self.poses)

    def move_head(self, *args, **kwargs):
        self.poses = self.gantry.move(self.poses, **kwargs)

    # DEPRECATED
    def move_plunger(self, *args, **kwargs):
        self._driver.move_plunger(*args, **kwargs)

    def head_speed(
            self, default_speed=None,
            x=None, y=None, z=None, a=None, b=None, c=None):
        """
        Set the speeds (mm/sec) of the robot

        Parameters
        ----------
        speed : number setting the current combined-axes speed
        default_speed : number specifying a default combined-axes speed
        <axis> : key/value pair, specifying the maximum speed of that axis

        Examples
        ---------
        >>> from opentrons import robot
        >>> robot.head_speed(300)  # default axes speed is 300 mm/sec
        >>> robot.head_speed(default_speed=400) # default speed is 400 mm/sec
        >>> robot.head_speed(x=400, y=200) # sets max speeds of X and Y
        """
        user_set_speeds = {'x': x, 'y': y, 'z': z, 'a': a, 'b': b, 'c': c}
        axis_max_speeds = {
            axis: value
            for axis, value in user_set_speeds.items()
            if value
        }
        if axis_max_speeds:
            self._driver.set_axis_max_speed(axis_max_speeds)
        if default_speed:
            self._driver.default_speed(new_default=default_speed)

    def move_to(
            self,
            location,
            instrument,
            strategy='arc',
            low_current_z=False,
            **kwargs):
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

        low_current_z : bool
            Setting this to True will cause the instrument to move at a low
            current setting for vertical motions, primarily to prevent damage
            to the pipette in case of collision during calibration.

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
        offset = subtract(coordinates, placeable.top()[1])
        if isinstance(placeable, containers.WellSeries):
            placeable = placeable[0]

        target = add(
            pose_tracker.absolute(
                self.poses,
                placeable
            ),
            offset.coordinates
        )
        other_instrument = {instrument} ^ set(self._instruments.values())
        if other_instrument:
            other = other_instrument.pop()
            _, _, z = pose_tracker.absolute(self.poses, other)
            safe_height = self.max_deck_height() + TIP_CLEARANCE
            if z < safe_height:
                self.poses = other._move(self.poses, z=safe_height)

        if strategy == 'arc':
            arc_coords = self._create_arc(target, placeable)
            for coord in arc_coords:
                self.poses = instrument._move(
                    self.poses,
                    low_current_z=low_current_z,
                    **coord)

        elif strategy == 'direct':
            position = {'x': target[0], 'y': target[1], 'z': target[2]}
            self.poses = instrument._move(
                self.poses,
                low_current_z=low_current_z,
                **position)
        else:
            raise RuntimeError(
                'Unknown move strategy: {}'.format(strategy))

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

        travel_height = self.max_deck_height() + self.arc_height

        _, _, robot_max_z = self.dimensions  # TODO: Check what this does
        arc_top = min(travel_height, robot_max_z)
        arrival_z = min(destination[2], robot_max_z)

        self._previous_container = this_container

        strategy = [
            {'z': arc_top},
            {'x': destination[0], 'y': destination[1]},
            {'z': arrival_z}
        ]

        return strategy

    def disconnect(self):
        """
        Disconnects from the robot.
        """
        if self._driver:
            self._driver.disconnect()

        for module in self.modules:
            module.disconnect()

        self.axis_homed = {
            'x': False, 'y': False, 'z': False, 'a': False, 'b': False}

    def get_deck_slot_types(self):
        return 'slots'

    def get_slot_offsets(self):
        """
        col_offset
        - from bottom left corner of 1 to bottom corner of 2

        row_offset
        - from bottom left corner of 1 to bottom corner of 4

        TODO: figure out actual X and Y offsets (from origin)
        """
        SLOT_OFFSETS = {
            'slots': {
                'col_offset': 132.50,
                'row_offset': 90.5
            }
        }
        slot_settings = SLOT_OFFSETS.get(self.get_deck_slot_types())
        row_offset = slot_settings.get('row_offset')
        col_offset = slot_settings.get('col_offset')
        return (row_offset, col_offset)

    def get_max_robot_rows(self):
        # TODO: dynamically figure out robot rows
        return 4

    def get_max_robot_cols(self):
        # TODO: dynamically figure out robot cols
        return 3

    def add_slots_to_deck(self):
        row_offset, col_offset = self.get_slot_offsets()
        row_count = self.get_max_robot_rows()
        col_count = self.get_max_robot_cols()

        for row_index in range(row_count):
            for col_index in range(col_count):
                properties = {
                    'width': col_offset,
                    'length': row_offset,
                    'height': 0
                }
                slot = containers.Slot(properties=properties)
                slot_coordinates = (
                    (col_offset * col_index),
                    (row_offset * row_index),
                    0
                )
                slot_index = col_index + (row_index * col_count)
                slot_name = str(slot_index + 1)
                self._deck.add(slot, slot_name, slot_coordinates)

    def setup_deck(self):
        self.add_slots_to_deck()

        # Setup Deck as root object for pose tracker
        self.poses = pose_tracker.add(
            self.poses,
            self._deck
        )

        for slot in self._deck:
            self.poses = pose_tracker.add(
                self.poses,
                slot,
                self._deck,
                pose_tracker.Point(*slot._coordinates)
            )

        # @TODO (Laura & Andy) Slot and type of trash
        # needs to be pulled from config file
        # Add fixed trash to the initial deck
        self._fixed_trash = self.add_container('fixed-trash', '12')

    @property
    def deck(self):
        return self._deck

    @property
    def fixed_trash(self):
        return self._fixed_trash

    def get_instruments_by_name(self, name):
        res = []
        for k, v in self.get_instruments():
            if v.name == name:
                res.append((k, v))

        return res

    def get_instruments(self, name=None):
        """
        :returns: sorted list of (mount, instrument)
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

    def add_container(self, name, slot, label=None, share=False):
        container = _setup_container(name)
        location = self._get_placement_location(slot)
        if self._is_available_slot(location, share, slot, name):
            location.add(container, label or name)
        self.add_container_to_pose_tracker(location, container)
        return container

    def add_module(self, module, slot, label=None):
        module = _setup_module(module)
        location = self._get_placement_location(slot)
        location.add(module, label or module.__class__.__name__)
        self.modules.append(module)
        self.poses = pose_tracker.add(
            self.poses,
            module,
            location,
            pose_tracker.Point(*module._coordinates))

    def add_container_to_pose_tracker(self, location, container: Container):
        """
        Add container and child wells to pose tracker. Sets container.parent
        (slot) as pose tracker parent
        """
        self.poses = pose_tracker.add(
            self.poses,
            container,
            container.parent,
            pose_tracker.Point(*container._coordinates))

        for well in container:
            # TODO JG 10/6/17: Stop tracking wells inconsistently
            center_x, center_y, _ = well.top()[1]
            offset_x, offset_y, offset_z = well._coordinates
            self.poses = pose_tracker.add(
                self.poses,
                well,
                container,
                pose_tracker.Point(
                    center_x + offset_x,
                    center_y + offset_y,
                    offset_z
                )
            )

    @commands.publish.both(command=commands.pause)
    def pause(self):
        """
        Pauses execution of the protocol. Use :meth:`resume` to resume
        """
        self._driver.pause()

    def stop(self):
        """
        Stops execution of the protocol. (alias for `halt`)
        """
        self.halt()

    @commands.publish.both(command=commands.resume)
    def resume(self):
        """
        Resume execution of the protocol after :meth:`pause`
        """
        self._driver.resume()

    def halt(self):
        """
        Stops execution of both the protocol and the Smoothie board immediately
        """
        self._driver.kill()
        self.reset()
        self.home()

    def get_serial_ports_list(self):
        ports = []
        # TODO: Store these settings in config
        if os.environ.get('ENABLE_VIRTUAL_SMOOTHIE', '').lower() == 'true':
            ports = [drivers.VIRTUAL_SMOOTHIE_PORT]
        ports.extend(drivers.get_serial_ports_list())
        return ports

    # TODO (ben 2017/11/13): rip out or implement these three methods
    def is_connected(self):
        if not self._driver:
            return False
        return self._driver.is_connected()

    def is_simulating(self):
        if not self._driver:
            return False
        return self._driver.simulating

    def get_connected_port(self):
        return self._driver.get_connected_port()

    # TODO(artyom 20171030): discuss diagnostics and smoothie reporting
    # def versions(self):
    #     # TODO: Store these versions in config
    #     return {
    #         'firmware': {
    #             'version': self._driver.get_firmware_version(),
    #             'compatible': compatible['firmware']
    #         },
    #         'config': {
    #             'version': self._driver.get_config_version(),
    #             'compatible': compatible['config']
    #         },
    #         'ot_version': {
    #             'version': self._driver.get_ot_version(),
    #             'compatible': compatible['ot_version']
    #         }
    #     }

    # def diagnostics(self):
    #     """
    #     Access diagnostics information for the robot.

    #     Returns
    #     -------
    #     Dictionary with the following keys:
    #         * ``axis_homed`` — axis that are currently in home position.
    #         * ``switches`` — end stop switches currently hit.
    #         * ``steps_per_mm`` — steps per millimeter calibration
    #         values for ``x`` and ``y`` axis.
    #     """
    #     # TODO: Store these versions in config
    #     return {
    #         'axis_homed': self.axis_homed,
    #         'switches': self._driver.switch_state(),
    #         'steps_per_mm': {
    #             'x': self._driver.get_steps_per_mm('x'),
    #             'y': self._driver.get_steps_per_mm('y')
    #         }
    #     }

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

        # Get the relative position of well with respect to instrument
        delta = pose_tracker.change_base(
            self.poses,
            src=instrument,
            dst=well
        )

        self.poses = calib.calibrate_container_with_delta(
            self.poses,
            container,
            *delta, save
        )

    @lru_cache()
    def max_deck_height(self):
        return pose_tracker.max_z(self.poses, self._deck)

    def max_placeable_height_on_deck(self, placeable):
        """
        :param placeable:
        :return: Calibrated height of container in mm from
        deck as the reference point
        """
        offset = placeable.top()[1]
        placeable_coordinate = add(
            pose_tracker.absolute(
                self.poses,
                placeable
            ),
            offset.coordinates
        )
        placeable_tallest_point = pose_tracker.max_z(self.poses, placeable)
        return placeable_coordinate[2] + placeable_tallest_point
