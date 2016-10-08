import copy

from opentrons_sdk import containers
from opentrons_sdk.drivers import motor as motor_drivers
from opentrons_sdk.robot.command import Command
from opentrons_sdk.util import log

from opentrons_sdk.helpers import helpers


class Robot(object):
    _commands = None  # []
    _instance = None

    def __init__(self, driver_instance=None):
        self._commands = []
        self._handlers = []

        self._deck = containers.Deck()
        self.setup_deck()

        self._ingredients = {}  # TODO needs to be discusses/researched
        self._instruments = {}

        self._driver = driver_instance or motor_drivers.CNCDriver()

    @classmethod
    def get_instance(cls):
        if not cls._instance or not isinstance(cls._instance, cls):
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset(cls):
        """
        Use this for testing
        :return:
        """
        Robot._instance = None
        return Robot.get_instance()

    def set_driver(self, driver):
        self._driver = driver

    def add_instrument(self, axis, instrument):
        axis = axis.upper()
        self._instruments[axis] = instrument

    def get_motor(self, axis):
        robot_self = self

        class InstrumentMotor():
            def move(self, value, speed=None, mode='absolute'):
                kwargs = {axis: value}
                if speed:
                    self.speed(speed)

                return robot_self._driver.move_plunger(
                    mode=mode, **kwargs
                )

            def home(self):
                return robot_self._driver.home(axis)

            def wait_for_arrival(self):
                return robot_self._driver.wait_for_arrival()

            def wait(self, seconds):
                robot_self._driver.wait(seconds)

            def speed(self, rate):
                robot_self._driver.set_plunger_speed(rate, axis)
                return self

        return InstrumentMotor()

    def flip_coordinates(self, coordinates):
        dimensions = self._driver.get_dimensions()
        return helpers.flip_coordinates(coordinates, dimensions)

    def list_serial_ports(self):
        return self._driver.list_serial_ports()

    def connect(self, port=None):
        """
        Connects the motor to a serial port.

        If a device connection is set, then any dummy or alternate motor
        drivers are replaced with the serial driver.
        """
        return self._driver.connect(device=port)

    def home(self, *args):
        if self._driver.calm_down():
            if args:
                return self._driver.home(*args)
            else:
                self._driver.home('z')
                return self._driver.home('x', 'y', 'b', 'a')
        else:
            return False

    def add_command(self, command):
        print("Enqueing:", command.description)
        log.info("Enqueing:", command.description)
        self._commands.append(command)

    def prepend_command(self, command):
        self._commands = [command] + self._commands

    def register(self, name, callback):
        def commandable():
            self.add_command(Command(do=callback))
        setattr(self, name, commandable)

    def move_head(self, *args, **kwargs):
        self._driver.move_head(*args, **kwargs)
        self._driver.wait_for_arrival()

    def move_to(self, location, instrument=None, create_path=True):
        placeable, coordinates = containers.unpack_location(location)
        calibration_data = {}
        if instrument:
            calibration_data = instrument.calibration_data
            instrument.placeables.append(placeable)

        coordinates = containers.apply_calibration(
            calibration_data,
            placeable,
            coordinates)

        tallest_z = self._deck.max_dimensions(self._deck)[2][1][2]
        tallest_z += 10

        def _do():
            if create_path:
                self._driver.move_head(z=tallest_z)
                self._driver.move_head(x=coordinates[0], y=coordinates[1])
                self._driver.move_head(z=coordinates[2])
            else:
                self._driver.move_head(
                    x=coordinates[0],
                    y=coordinates[1],
                    z=coordinates[2])
            self._driver.wait_for_arrival()

        description = "Moving head to {} {}".format(
            str(placeable),
            coordinates)
        self.add_command(Command(do=_do, description=description))

    def move_to_top(self, location, instrument=None, create_path=True):
        placeable, coordinates = containers.unpack_location(location)
        top_location = (placeable, placeable.from_center(x=0, y=0, z=1))
        self.move_to(top_location, instrument, create_path)

    def move_to_bottom(self, location, instrument=None, create_path=True):
        placeable, coordinates = containers.unpack_location(location)
        bottom_location = (placeable, placeable.from_center(x=0, y=0, z=-1))
        self.move_to(bottom_location, instrument, create_path)

    @property
    def actions(self):
        return copy.deepcopy(self._commands)

    def run(self):
        while self._commands:
            command = self._commands.pop(0)
            if command.description == "Pausing":
                return

            print("Executing:", command.description)
            log.info("Executing:", command.description)
            try:
                command.do()
            except KeyboardInterrupt as e:
                self._driver.halt()
                raise e

    def disconnect(self):
        if self._driver:
            self._driver.disconnect()

    def containers(self):
        return self._deck.containers()

    def get_deck_slot_types(self):
        return 'acrylic_slots'

    def get_slot_offsets(self):
        """
        col_offset
        - from bottom left corner of A to bottom corner of B

        row_offset
        - from bottom left corner of 1 to bottom corner of 2

        TODO: figure out actual X and Y offsets (from origin)
        """
        SLOT_OFFSETS = {
            '3d_printed_slots': {
                'x_offset': 10,
                'y_offset': 10,
                'col_offset': 91,
                'row_offset': 134.5
            },
            'acrylic_slots': {
                'x_offset': 10,
                'y_offset': 10,
                'col_offset': 96.25,
                'row_offset': 133.3
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
                slot = containers.Slot()
                slot_coordinates = (
                    (row_offset * row_index) + x_offset,
                    (col_offset * col_index) + y_offset,
                    0  # TODO: should z always be zero?
                )
                slot_name = "{}{}".format(col, row)
                self._deck.add(slot, slot_name, (slot_coordinates))

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
        container = containers.get_legacy_container(container_name)
        self._deck[slot].add(container, label)
        return container

    def clear(self):
        self._commands = []
        print('Robot ready to enqueue and execute new commands')

    def pause(self):
        # This method is for API use only - in a user protocol,
        # it will jump the queue, which is counterintuitive
        # and not very useful.
        def _do():
            print("Paused")

        description = "Pausing"
        self.prepend_command(Command(do=_do, description=description))

    def resume(self):
        self.run()
