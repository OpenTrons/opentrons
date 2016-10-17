from opentrons_sdk import containers
from opentrons_sdk.robot.command import Command
from opentrons_sdk.robot.robot import Robot
from opentrons_sdk.containers.calibrator import Calibrator
from opentrons_sdk.containers.placeable import Placeable
from opentrons_sdk.util.vector import Vector


class Pipette(object):

    def __init__(
            self,
            axis,
            name=None,
            channels=1,
            min_volume=0,
            trash_container=None,
            tip_racks=None,
            aspirate_speed=300,
            dispense_speed=500):

        self.positions = {
            'top': None,
            'bottom': None,
            'blow_out': None,
            'drop_tip': None
        }

        self.speeds = {
            'aspirate': aspirate_speed,
            'dispense': dispense_speed
        }

        self.axis = axis
        self.channels = channels

        if not name:
            name = axis
        self.name = name

        self.min_volume = min_volume
        self.max_volume = min_volume + 1
        self.current_volume = 0

        self.trash_container = trash_container
        self.tip_racks = tip_racks

        self.robot = Robot.get_instance()
        self.robot.add_instrument(self.axis, self)
        self.plunger = self.robot.get_motor(self.axis)

        self.calibration_data = {}
        self.placeables = []

        self.calibrator = Calibrator(self.robot._deck, self.calibration_data)

    def associate_placeable(self, location):
        placeable, _ = containers.unpack_location(location)
        if not self.placeables or (placeable != self.placeables[-1]):
            self.placeables.append(placeable)

    def move_to(self, location, create_path=True):
        if location:
            self.associate_placeable(location)
            self.robot.move_to(
                location,
                instrument=self,
                create_path=create_path)

        return self

    def move_to_top(self, location, create_path=True):
        placeable, _ = containers.unpack_location(location)
        top_location = (placeable, placeable.from_center(x=0, y=0, z=1))
        return self.move_to(top_location, create_path)

    def move_to_bottom(self, location, create_path=True):
        placeable, _ = containers.unpack_location(location)
        bottom_location = (placeable, placeable.from_center(x=0, y=0, z=-1))
        return self.move_to(bottom_location, create_path)

    def go_to(self, location):
        return self.move_to(location, create_path=False)

    def go_to_top(self, location):
        return self.move_to_top(location, create_path=False)

    def go_to_bottom(self, location):
        return self.move_to_bottom(location, create_path=False)

    def aspirate(self, volume=None, location=None, rate=1.0):

        if not isinstance(volume, (int, float, complex)):
            if volume and not location:
                location = volume
            volume = self.max_volume - self.current_volume

        if self.current_volume + volume > self.max_volume:
            raise RuntimeWarning(
                'Pipette cannot hold volume {}'
                .format(self.current_volume + volume)
            )

        self.position_for_aspirate(location)

        self.current_volume += volume
        distance = self.plunge_distance(self.current_volume)
        destination = self.positions['bottom'] - distance

        speed = self.speeds['aspirate'] * rate

        def _do_aspirate():
            self.plunger.speed(speed)
            self.plunger.move(destination)

        description = "Aspirating {0}uL at {1}".format(volume, str(location))
        self.robot.add_command(
            Command(do=_do_aspirate, description=description))

        return self

    def dispense(self, volume=None, location=None, rate=1.0):

        if not isinstance(volume, (int, float, complex)):
            if volume and not location:
                location = volume
            volume = self.current_volume

        if self.current_volume - volume < 0:
            # TODO: this should alert a Warning here, but not stop execution
            volume = self.current_volume

        if location:
            self.move_to(location)

        if volume:
            self.current_volume -= volume
            distance = self.plunge_distance(self.current_volume)
            destination = self.positions['bottom'] - distance

            speed = self.speeds['dispense'] * rate

            def _do():
                self.plunger.speed(speed)
                self.plunger.move(destination)

            description = "Dispensing {0}uL at {1}".format(
                volume, str(location))
            self.robot.add_command(Command(do=_do, description=description))

        return self

    def position_for_aspirate(self, location=None):
        if location:
            self.move_to_top(location)

        if self.current_volume == 0:
            def _prep_plunger():
                self.plunger.move(self.positions['bottom'])

            description = "Resetting plunger to bottom"
            self.robot.add_command(
                Command(do=_prep_plunger, description=description))

        if location:
            if isinstance(location, Placeable):
                # go all the way to the bottom
                bottom = location.from_center(x=0, y=0, z=-1)
                # go up 1mm to give space to aspirate
                bottom += Vector(0, 0, 1)
                location = (location, bottom)
            self.go_to(location)

    def transfer(self, source, destination, volume=None):
        volume = volume or self.max_volume
        self.aspirate(volume, source)
        self.dispense(volume, destination)
        return self

    def distribute(self, source, destinations, volume=None, extra_pull=0):
        volume = volume or self.max_volume
        fractional_volume = volume / len(destinations)

        self.aspirate(volume + extra_pull, source)
        for well in destinations:
            self.dispense(fractional_volume, well)

        return self

    def consolidate(self, destination, sources, volume=None):
        volume = volume or self.max_volume
        fractional_volume = (volume) / len(sources)

        for well in sources:
            self.aspirate(fractional_volume, well)

        self.dispense(volume, destination)
        return self

    def mix(self, repetitions=3, volume=None):
        volume = volume or self.current_volume

        def _do():
            # plunger movements are handled w/ aspirate/dispense
            # using Command for printing description
            pass

        description = "Mixing {0} times with a volume of {1}ul".format(
            repetitions, str(self.current_volume)
        )
        self.robot.add_command(Command(do=_do, description=description))

        for i in range(repetitions):
            self.dispense(volume)
            self.aspirate(volume)

        self.dispense(volume)

        return self

    def blow_out(self, location=None):
        if location:
            self.move_to(location)

        def _do():
            self.plunger.move(self.positions['blow_out'])

        description = "Blow_out at {}".format(str(location))
        self.robot.add_command(Command(do=_do, description=description))
        self.current_volume = 0

        return self

    def touch_tip(self, location=None):
        if location:
            self.move_to(location)
        elif self.placeables:
            location = self.placeables[-1]
        else:
            raise IndexError("Pipette does not know where it is")

        self.go_to((location, location.from_center(x=1, y=0, z=1)))
        self.go_to((location, location.from_center(x=-1, y=0, z=1)))
        self.go_to((location, location.from_center(x=0, y=1, z=1)))
        self.go_to((location, location.from_center(x=0, y=-1, z=1)))

        return self

    def pick_up_tip(self, location):

        def _do():
            # Dip into tip and pull it up
            pass

        description = "Picking up tip from {0}".format(str(location))
        self.robot.add_command(Command(do=_do, description=description))

        # TODO: actual plunge depth for picking up a tip
        # varies based on the tip
        # right now it's accounted for via plunge depth
        # TODO: Need to talk about containers z positioning

        tip_plunge = 6

        placeable, coordinates = containers.unpack_location(location)
        if isinstance(location, Placeable):
            coordinates = placeable.from_center(x=0, y=0, z=-1)
        pressed_into_tip = coordinates + (0, 0, -tip_plunge)

        self.move_to((placeable, coordinates))
        for _ in range(3):
            self.go_to((placeable, pressed_into_tip))
            self.go_to((placeable, coordinates))

        return self

    def drop_tip(self, location=None):
        if location:
            self.move_to_bottom(location)

        def _do():
            self.plunger.move(self.positions['drop_tip'])
            self.plunger.home()

        description = "Drop_tip at {}".format(str(location))
        self.robot.add_command(Command(do=_do, description=description))
        self.current_volume = 0
        return self

    def calibrate(self, position):
        current_position = self.robot._driver.get_plunger_position()
        current_position = current_position['current'][self.axis]
        kwargs = {}
        kwargs[position] = current_position
        self.calibrate_plunger(**kwargs)

    def calibrate_plunger(
            self,
            top=None,
            bottom=None,
            blow_out=None,
            drop_tip=None):
        """Set calibration values for the pipette plunger.

        This can be called multiple times as the user sets each value,
        or you can set them all at once.

        Parameters
        ----------

        top : int
           Touching but not engaging the plunger.

        bottom: int
            Must be above the pipette's physical hard-stop, while still
            leaving enough room for 'blow_out'

        blow_out : int
            Plunger has been pushed down enough to expell all liquids.

        drop_tip : int
            This position that causes the tip to be released from the
            pipette.

        """
        if top is not None:
            self.positions['top'] = top
        if bottom is not None:
            self.positions['bottom'] = bottom
        if blow_out is not None:
            self.positions['blow_out'] = blow_out
        if drop_tip is not None:
            self.positions['drop_tip'] = drop_tip

        return self

    def calibrate_position(self, location, current=None):
        if not current:
            current = self.robot._driver.get_head_position()['current']

        self.calibration_data = self.calibrator.calibrate(
            self.calibration_data,
            location,
            current)
        return self

    def set_max_volume(self, max_volume):
        self.max_volume = max_volume
        return self

    def plunge_distance(self, volume):
        """Calculate axis position for a given liquid volume.

        Translates the passed liquid volume to absolute coordinates
        on the axis associated with this pipette.

        Calibration of the top and bottom positions are necessary for
        these calculations to work.
        """
        if self.positions['bottom'] is None or self.positions['top'] is None:
            raise ValueError(
                "Pipette {} not calibrated.".format(self.axis)
            )
        percent = self._volume_percentage(volume)
        travel = self.positions['bottom'] - self.positions['top']
        return travel * percent

    def _volume_percentage(self, volume):
        """Returns the plunger percentage for a given volume.

        We use this to calculate what actual position the plunger axis
        needs to be at in order to achieve the correct volume of liquid.
        """
        if volume < 0:
            raise IndexError("Volume must be a positive number.")
        if volume > self.max_volume:
            raise IndexError("{}µl exceeds maximum volume.".format(volume))
        if volume < self.min_volume:
            # TODO: down raise exception, but notify user with a warning
            pass

        return volume / self.max_volume

    def delay(self, seconds):
        def _do():
            self.plunger.wait(seconds)

        description = "Delaying {} seconds".format(seconds)
        self.robot.add_command(Command(do=_do, description=description))
        return self

    def set_speed(self, **kwargs):
        keys = {'head', 'aspirate', 'dispense'} & kwargs.keys()
        for key in keys:
            self.speeds[key] = kwargs.get(key)

        return self
