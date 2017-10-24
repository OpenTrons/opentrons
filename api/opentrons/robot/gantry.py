from opentrons.trackers.pose_tracker import PoseTracker
from opentrons.util import pose_functions as pose_funcs
from opentrons.trackers.move_msgs import new_pos_msg
from opentrons.broker import publish, topics
from opentrons import robot
from numpy import array, dot, isclose, insert
from numpy.linalg import inv


RIGHT_MOUNT_OFFSET = {'x':0, 'y':0, 'z':0.0}

LEFT_MOUNT_OFFSET = {'x':-37.351, 'y':30.5024, 'z':7.0}


LEFT_INSTRUMENT_ACTUATOR = 'b'
RIGHT_INSTRUMENT_ACTUATOR = 'c'

LEFT_Z_AXIS = 'z'
RIGHT_Z_AXIS = 'a'

Z_OFFSET = 45

# World -> Smoothie
# use cli/main.py to perform factory calibration
XY = \
    array([[  2.00633580e+00,   1.16263441e-02,  -4.51928609e+02],
           [ -3.34703575e-03,   1.95997984e+00,  -3.65876516e+02],
           [ -4.83204440e-19,   1.73472348e-18,   1.00000000e+00]])

# Add column and row to make it a 3D transform
T = insert(
        insert(XY, 2, [0, 0, 0], axis=1),
        2,
        [0, 0, 1, Z_OFFSET],
        axis=0)

# Right Pipette -> Left Pipette (in World)
DELTA = \
    array([
        [1, 0, 0, 37.20],
        [0, 1, 0, -30.69],
        [0, 0, 1, 1.13],
        [0, 0, 0, 1]
    ])


def translate(x, y, z, mount_axis, operator=lambda a: a):
    v = array([x, y, z, 1])
    transform = T
    if mount_axis == 'z':
        transform = dot(transform, DELTA)

    x, y, z, _ = dot(operator(transform), v)

    return {'x': x, 'y': y, mount_axis: z}


def resolve_all_coordinates(tracked_object, pose_tracker, x=None, y=None, z=None):
    '''
    Deals with situations where you want x, y, z but are not passed values for all three.
    To deal with this, it assumes the other coordinates are equal to their current values and
    returns full XYZ coords
    '''
    current_pose = pose_tracker[tracked_object]
    if x is None: x = current_pose.x
    if y is None: y = current_pose.y
    if z is None: z = current_pose.z

    print("---[resolve_all_coordinates] result: {}".format((x,y,z)))
    return {'x':x, 'y':y, 'z':z}


def _coords_for_axes(driver, axes):
    return {
        axis: value
        for axis, value
        in driver.position.items()
        if axis in axes
    }


class InstrumentActuator(object):
    """
    Provides access to Robot's head motor.
    """
    def __init__(self, driver, axis, instrument):
        self.axis = axis
        self.driver = driver
        self.instrument = instrument

    def move(self, value):
        ''' Move motor '''
        self.driver.move(**{self.axis:value})

    def home(self):
        ''' Home plunger motor '''
        self.driver.home(self.axis)

    #TODO: Should instruments be able to delay overall system operation?
    def delay(self, seconds):
        self.driver.delay(seconds)

    #FIXME: Should instruments be able to set speed for overall system motion?
    def set_speed(self, rate):
        ''' Set combined motion speed '''
        self.driver.set_speed(rate)


class InstrumentMover(object):
    """
    Dispatches instrument movement calls to the appropriate movers
    """
    def __init__(self, gantry, mount, instrument):
        self.gantry = gantry
        self.mount = mount
        self.instrument = instrument

    def move(self, x=None, y=None, z=None, z_offset=0):
        ''' Move motor
        - Resolve the full x,y,z goal position for the instrument

        - Determine the target gantry position given the instrument offset for the gantry in x, y (since the gantry
        can only move in x,y)
        - Move the gantry to the target x,y

        - Determine the target mount position given the instrument offset for the gantry in z (since the mount
        can only move in z)
        - Move the mount to the target z
        '''
        mount_axis = self.mount.mount_axis
        driver = self.mount.driver
        position = self.mount.driver.position

        # current smoothie -> world
        current_world = translate(
            x=position['x'],
            y=position['y'],
            z=position[mount_axis],
            mount_axis=self.mount.mount_axis,
            operator=inv)

        print('[MOVE] current WORLD: ', current_world)

        # world -> smoothie
        target = translate(
            x=x if x is not None else current_world['x'],
            y=y if y is not None else current_world['y'],
            z=z + z_offset if z is not None else current_world[mount_axis],
            mount_axis=self.mount.mount_axis)

        print('[MOVE] position: ', position)
        print('[MOVE] target SMOOTHIE: ', target)

        axis_to_move = [
            axis
            for axis, value
            in {'x': x, 'y': y, self.mount.mount_axis: z}.items()
            if value is not None
        ]

        target = {
            axis: value for axis, value
            in target.items()
            if axis in axis_to_move
        }

        print('[MOVE] actual move: ', target)

        driver.move(**{
            axis: value for axis, value in target.items()
            if axis in 'xy'})
        driver.move(**{
            axis: value for axis, value in target.items()
            if axis == self.mount.mount_axis})

    def probe(self, axis_to_probe, probing_movement):
        if axis_to_probe is 'z':
            axis_to_probe = self.mount.mount_axis
        return self.gantry.probe_axis(axis_to_probe, probing_movement)

    def home(self):
        self.mount.home()


class Gantry:
    '''
    Responsible for:
        - Gantry, independent of the instruments
        - Providing driver resources to instruments

    Not Response for:
        - Robot state, or any instrument specific actions
    '''
    free_axes = 'xy'

    def __init__(self, driver, pose_tracker):
        self.left_mount = None
        self.driver = driver
        self._pose_tracker = pose_tracker

    def _setup_mounts(self):
        self.left_mount = Mount(self.driver, self, LEFT_Z_AXIS, LEFT_INSTRUMENT_ACTUATOR, LEFT_MOUNT_OFFSET)
        self.right_mount = Mount(self.driver, self, RIGHT_Z_AXIS, RIGHT_INSTRUMENT_ACTUATOR, RIGHT_MOUNT_OFFSET)
        self._pose_tracker.track_object(self, self.left_mount, **LEFT_MOUNT_OFFSET)
        self._pose_tracker.track_object(self, self.right_mount, **RIGHT_MOUNT_OFFSET)

    def _position_from_driver(self):
        return _coords_for_axes(self.driver, self.free_axes)

    def move(self, x=None, y=None):
        ''' Moves the Gantry in the x, y plane '''
        self.driver.move(x=x, y=y)
        self._publish_position()

    def _publish_position(self):
        new_position = resolve_all_coordinates(self, self._pose_tracker, **self._position_from_driver())
        new_position_msg = new_pos_msg(self, **new_position)
        publish(topics.MOVEMENT, new_position_msg)

    def mount_instrument(self, instrument, instrument_mount):
        if instrument_mount is 'left':
            self.left_mount.add_instrument(instrument)
        elif instrument_mount is 'right':
            self.right_mount.add_instrument(instrument)
        else:
            raise RuntimeError('Invalid instrument mount. Valid mounts are "right" and "left"')


    def probe_axis(self, axis, probing_movement):
        return self.driver.probe_axis(axis, probing_movement)


    def home(self):
        self.driver.home()
        self._publish_position()


class Mount:

    def __init__(self, driver, gantry, mount_axis, actuator_axis, offset):
        self.instrument = None
        self.driver = driver
        self.gantry = gantry
        self.mount_axis = mount_axis
        self.actuator_axis = actuator_axis
        self.offset = offset

    def _position_from_driver(self):
        position = _coords_for_axes(self.driver, self.mount_axis)
        return {'z': position[self.mount_axis]}

    def _publish_position(self):
        new_position = resolve_all_coordinates(self, self.gantry._pose_tracker, **self._position_from_driver())
        new_position_msg = new_pos_msg(self, **new_position)
        publish(topics.MOVEMENT, new_position_msg)

    def move(self, z):
        self.driver.move(**{self.mount_axis: z})
        self._publish_position()

    def add_instrument(self, instrument):
        if self.instrument is not None:
            raise RuntimeError("This mount already has an instrument: {}".format(self.instrument))

        self.instrument = instrument
        instrument.instrument_actuator = InstrumentActuator(self.driver, self.actuator_axis, instrument)
        instrument.instrument_mover = InstrumentMover(self.gantry, self, instrument) #WHat is a mover?
        instrument.axis = self.mount_axis
        instrument.mount_obj = self

        self.gantry._pose_tracker.track_object(self, instrument, 0, 0, 0)

    def home(self):
        self.driver.home(self.mount_axis)
        self._publish_position()

# FIXME: The following should eventually live in the robot
#
# def setup_robot(self):
#     self.setup_pose_tracking()
#     self.setup_deck()
#     self.setup_gantry(self._driver)
#     self.setup_frame_base()
#
# def setup_pose_tracking(self):
#     self.pose_tracker = pose_tracker.PoseTracker()
#
# def setup_deck(self):
#     self._deck = containers.Deck()
#     # Setup Deck as root object for pose tracker
#     self.pose_tracker.create_root_object(
#         self._deck, *self._deck._coordinates
#     )
#     self.add_slots_to_deck()
#
#
# def setup_gantry(self):
#     self._gantry = Gantry()
#
# def setup_frame_base(self):
#     self._frame_base = FrameBase()




