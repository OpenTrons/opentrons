import copy

from opentrons import containers
from opentrons.robot.command import Command

from opentrons.robot.robot import Robot
from opentrons.containers.calibrator import Calibrator
from opentrons.containers.placeable import Placeable, humanize_location
from opentrons.instruments.instrument import Instrument

import itertools


class Pipette(Instrument):

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

        self.axis = axis
        self.channels = channels

        if not name:
            name = self.__class__.__name__
        self.name = name

        self.calibration_data = {}

        self.trash_container = trash_container
        self.tip_racks = tip_racks

        self.reset_tip_tracking()

        self.robot = Robot.get_instance()
        self.robot.add_instrument(self.axis, self)
        self.plunger = self.robot.get_motor(self.axis)

        self.placeables = []
        self.current_volume = 0

        self.speeds = {
            'aspirate': aspirate_speed,
            'dispense': dispense_speed
        }

        self.min_volume = min_volume
        self.max_volume = self.min_volume + 1

        self.positions = {
            'top': None,
            'bottom': None,
            'blow_out': None,
            'drop_tip': None
        }
        self.calibrated_positions = copy.deepcopy(self.positions)

        self.init_calibrations()
        self.load_persisted_data()

        self.calibrator = Calibrator(self.robot._deck, self.calibration_data)

    def reset(self):
        self.placeables = []
        self.current_volume = 0
        self.reset_tip_tracking()

    def set_plunger_defaults(self):
        self.calibrated_positions = copy.deepcopy(self.positions)
        self.positions['top'] = 0
        self.positions['bottom'] = 10
        self.positions['blow_out'] = 12
        self.positions['drop_tip'] = 14

    def restore_plunger_positions(self):
        self.positions = self.calibrated_positions

    def has_tip_rack(self):
        return (self.tip_racks is not None and
                isinstance(self.tip_racks, list) and
                len(self.tip_racks) > 0)

    def reset_tip_tracking(self):
        self.current_tip_home_well = None
        self.tip_rack_iter = iter([])

        if self.has_tip_rack():
            iterables = self.tip_racks

            if self.channels > 1:
                iterables = []
                for rack in self.tip_racks:
                    iterables.append(rack.rows)

            self.tip_rack_iter = itertools.cycle(
                itertools.chain(*iterables)
            )

    def associate_placeable(self, location):
        placeable, _ = containers.unpack_location(location)
        if not self.placeables or (placeable != self.placeables[-1]):
            self.placeables.append(placeable)

    def move_to(self, location, strategy='arc', now=False):
        if location:
            self.associate_placeable(location)
            self.robot.move_to(
                location,
                instrument=self,
                strategy=strategy,
                now=now)

        return self

    def aspirate(self, volume=None, location=None, rate=1.0):
        def _do_aspirate():
            nonlocal volume
            nonlocal location
            if not isinstance(volume, (int, float, complex)):
                if volume and not location:
                    location = volume
                volume = self.max_volume - self.current_volume

            if self.current_volume + volume > self.max_volume:
                print('********', volume, location, self.max_volume)
                raise RuntimeWarning(
                    'Pipette cannot hold volume {}'
                    .format(self.current_volume + volume)
                )

            self.position_for_aspirate(location)

            self.current_volume += volume
            distance = self.plunge_distance(self.current_volume)
            bottom = self.positions['bottom'] or 0
            destination = bottom - distance

            speed = self.speeds['aspirate'] * rate

            self.plunger.speed(speed)
            self.plunger.move(destination)

        description = "Aspirating {0}uL at {1}".format(
            volume,
            (humanize_location(location) if location else '<In Place>')
        )
        self.robot.add_command(
            Command(do=_do_aspirate, description=description))

        return self

    def dispense(self, volume=None, location=None, rate=1.0):
        def _do():
            nonlocal location
            nonlocal volume
            if not isinstance(volume, (int, float, complex)):
                if volume and not location:
                    location = volume
                volume = self.current_volume

            if self.current_volume - volume < 0:
                volume = self.current_volume

            if location:
                self.move_to(location, strategy='arc', now=True)

            if volume:
                self.current_volume -= volume
                distance = self.plunge_distance(self.current_volume)
                bottom = self.positions['bottom'] or 0
                destination = bottom - distance

                speed = self.speeds['dispense'] * rate

                self.plunger.speed(speed)
                self.plunger.move(destination)

        description = "Dispensing {0}uL at {1}".format(
            volume,
            (humanize_location(location) if location else '<In Place>')
        )
        self.robot.add_command(Command(do=_do, description=description))
        return self

    def position_for_aspirate(self, location=None):

        # first go to the destination
        if location:
            placeable, _ = containers.unpack_location(location)
            self.move_to(placeable.top(), strategy='arc', now=True)

        # setup the plunger above the liquid
        if self.current_volume == 0:
            self.plunger.move(self.positions['bottom'] or 0)

        # then go inside the location
        if location:
            if isinstance(location, Placeable):
                location = location.bottom(1)
            self.move_to(location, strategy='direct', now=True)

    def mix(self, volume, repetitions=1, location=None):
        def _do():
            # plunger movements are handled w/ aspirate/dispense
            # using Command for printing description
            pass

        description = "Mixing {0} times with a volume of {1}ul".format(
            repetitions, str(self.current_volume)
        )
        self.robot.add_command(Command(do=_do, description=description))

        self.aspirate(location=location, volume=volume)
        for i in range(repetitions - 1):
            self.dispense(volume)
            self.aspirate(volume)
        self.dispense(volume)

        return self

    def blow_out(self, location=None):
        def _do():
            nonlocal location
            if location:
                self.move_to(location, strategy='arc', now=True)
            self.plunger.move(self.positions['blow_out'])
            self.current_volume = 0
        description = "Blow_out at {}".format(
            humanize_location(location) if location else '<In Place>'
        )
        self.robot.add_command(Command(do=_do, description=description))
        return self

    def touch_tip(self, location=None):
        def _do():
            nonlocal location
            if location:
                self.move_to(location, strategy='arc', now=True)
            else:
                location = self.placeables[-1]

            self.move_to(
                (location, location.from_center(x=1, y=0, z=1)),
                strategy='direct',
                now=True)
            self.move_to(
                (location, location.from_center(x=-1, y=0, z=1)),
                strategy='direct',
                now=True)
            self.move_to(
                (location, location.from_center(x=0, y=1, z=1)),
                strategy='direct',
                now=True)
            self.move_to(
                (location, location.from_center(x=0, y=-1, z=1)),
                strategy='direct',
                now=True)

        description = 'Touching tip'
        self.robot.add_command(Command(do=_do, description=description))

        return self

    def return_tip(self):

        def _do():
            if not self.current_tip_home_well:
                self.robot.add_warning('Pipette has no tip to return')
                return

            self.drop_tip(self.current_tip_home_well, now=True)

        description = "Returning tip"
        self.robot.add_command(Command(do=_do, description=description))
        return self

    def pick_up_tip(self, location=None):
        def _do():
            nonlocal location

            if not location:
                if self.has_tip_rack():
                    # TODO: raise warning/exception if looped back to first tip
                    location = next(self.tip_rack_iter)
                else:
                    self.robot.add_warning(
                        'pick_up_tip called with no reference to a tip')

            if location:
                placeable, _ = containers.unpack_location(location)
                self.move_to(placeable.bottom(), strategy='arc', now=True)

            self.current_tip_home_well = location

            tip_plunge = 10

            for _ in range(3):
                self.robot.move_head(z=tip_plunge, mode='relative')
                self.robot.move_head(z=-tip_plunge, mode='relative')

        description = "Picking up tip from {0}".format(
            (humanize_location(location) if location else '<In Place>')
        )
        self.robot.add_command(Command(do=_do, description=description))
        return self

    def drop_tip(self, location=None, now=False):
        def _do():
            nonlocal location
            if not location and self.trash_container:
                location = self.trash_container

            if location:
                placeable, _ = containers.unpack_location(location)
                self.move_to(placeable.bottom(), strategy='arc', now=True)

            self.plunger.move(self.positions['drop_tip'])
            self.plunger.home()
            self.current_volume = 0

        description = "Drop_tip at {}".format(
            (humanize_location(location) if location else '<In Place>')
        )
        if now:
            _do()
        else:
            self.robot.add_command(Command(do=_do, description=description))
        return self

    def home(self):
        def _do():
            self.plunger.home()
            self.current_volume = 0

        description = "Homing pipette plunger on axis {}".format(self.axis)
        self.robot.add_command(Command(do=_do, description=description))
        return self

    def transfer(self, volume, source, destination=None):
        if not isinstance(volume, (int, float, complex)):
            if volume and not destination:
                destination = source
                source = volume
            volume = None

        self.aspirate(volume, source)
        self.dispense(volume, destination)
        return self

    def distribute(self, volume, source, destinations):
        volume = volume or self.max_volume
        fractional_volume = volume / len(destinations)

        self.aspirate(volume, source)
        for well in destinations:
            self.dispense(fractional_volume, well)

        return self

    def consolidate(self, volume, sources, destination):
        volume = volume or self.max_volume
        fractional_volume = (volume) / len(sources)

        for well in sources:
            self.aspirate(fractional_volume, well)

        self.dispense(volume, destination)
        return self

    def calibrate(self, position):
        current_position = self.robot._driver.get_plunger_positions()
        current_position = current_position['target'][self.axis]
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

        self.update_calibrations()

        return self

    def calibrate_position(self, location, current=None):
        if not current:
            current = self.robot._driver.get_head_position()['current']

        self.calibration_data = self.calibrator.calibrate(
            self.calibration_data,
            location,
            current)

        self.update_calibrations()

        return self

    def set_max_volume(self, max_volume):
        self.max_volume = max_volume

        if self.max_volume <= self.min_volume:
            raise RuntimeError(
                'Pipette max volume is less than '
                'min volume ({0} < {1})'.format(
                    self.max_volume, self.min_volume))

        self.update_calibrations()

        return self

    def plunge_distance(self, volume):
        """Calculate axis position for a given liquid volume.

        Translates the passed liquid volume to absolute coordinates
        on the axis associated with this pipette.

        Calibration of the top and bottom positions are necessary for
        these calculations to work.
        """
        percent = self._volume_percentage(volume)
        top = self.positions['top'] or 0
        bottom = self.positions['bottom'] or 0
        travel = bottom - top
        if travel <= 0:
            self.robot.add_warning('Plunger calibrated incorrectly')
        return travel * percent

    def _volume_percentage(self, volume):
        """Returns the plunger percentage for a given volume.

        We use this to calculate what actual position the plunger axis
        needs to be at in order to achieve the correct volume of liquid.
        """
        if volume < 0:
            raise RuntimeError(
                "Volume must be a positive number, got {}.".format(volume))
            volume = 0
        if volume > self.max_volume:
            raise RuntimeError(
                "{0}µl exceeds pipette's maximum volume ({1}ul).".format(
                    volume, self.max_volume))
        if volume < self.min_volume:
            self.robot.add_warning(
                "{0}µl is less than pipette's min_volume ({1}ul).".format(
                    volume, self.min_volume))

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
