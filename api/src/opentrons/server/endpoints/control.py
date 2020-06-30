import functools
import json
import logging
from typing import Optional
from aiohttp import web

try:
    from opentrons import instruments
except ImportError:
    pass
from opentrons.config import pipette_config
from opentrons.trackers import pose_tracker
from opentrons.config import feature_flags as ff
from opentrons.types import Mount, Point
from opentrons.hardware_control.types import Axis, CriticalPoint


log = logging.getLogger(__name__)


def _motion_lock(func):
    @functools.wraps(func)
    async def decorated(request):
        async with request.app['com.opentrons.motion_lock'].forbid():
            return await func(request)
    return decorated


def hw_from_req(req):
    """ Utility function to get the hardware resource from requests """
    return req.app['com.opentrons.hardware']


async def get_attached_pipettes(request):
    """
    Query robot for model strings on 'left' and 'right' mounts, and return a
    dict with the results keyed by mount. By default, this endpoint provides
    cached values, which will not interrupt a running session. WARNING: if the
    caller supplies the "refresh=true" query parameter, this method will
    interrupt a sequence of Smoothie operations that are in progress, such as a
    protocol run.

    Example:

    ```
    {
      'left': {
        'model': 'p300_single_v1',
        'name': 'p300_single',
        'tip_length': 51.7,
        'mount_axis': 'z',
        'plunger_axis': 'b',
        'id': '<pipette id string>'
      },
      'right': {
        'model': 'p10_multi_v1',
        'name': 'p10_multi',
        'tip_length': 40,
        'mount_axis': 'a',
        'plunger_axis': 'c',
        'id': '<pipette id string>'
      }
    }
    ```

    If a pipette is "uncommissioned" (e.g.: does not have a model string
    written to on-board memory), or if no pipette is present, the corresponding
    mount will report `'model': null`
    """
    hw = hw_from_req(request)
    if request.url.query.get('refresh') == 'true':
        await hw.cache_instruments()
    response = {}

    attached = hw.attached_instruments
    for mount, data in attached.items():
        response[mount.name.lower()] = {
            'model': data.get('model', None),
            'name': data.get('name', None),
            'id': data.get('pipette_id', None),
            'mount_axis': str(Axis.by_mount(mount)).lower(),
            'plunger_axis': str(Axis.of_plunger(mount)).lower()
        }
        if data.get('model'):
            response[mount.name.lower()]['tip_length'] \
                = data.get('tip_length', 0)

    return web.json_response(response, status=200)


async def position_info(request):
    """
    Positions determined experimentally by issuing move commands. Change
    pipette position offsets the mount to the left or right such that a user
    can easily access the pipette mount screws with a screwdriver. Attach tip
    position places either pipette roughly in the front-center of the deck area
    """
    return web.json_response({
        'positions': {
            'change_pipette': {
                'target': 'mount',
                'left': (300, 40, 30),
                'right': (95, 40, 30)
            },
            'attach_tip': {
                'target': 'pipette',
                'point': (200, 90, 150)
            }
        }
    })


def _validate_move_data(data):
    error = False
    message = ''
    target = data.get('target')
    if target not in ['mount', 'pipette']:
        message = "Invalid target key: '{}' (target must be one of " \
                  "'mount' or 'pipette'".format(target)
        error = True
    point = data.get('point')
    if type(point) == list:
        point = tuple(point)
    if type(point) is not tuple:
        message = "Point must be an ordered iterable. Got: {}".format(
            type(point))
        error = True
    if point is not None and len(point) != 3:
        message = "Point must have 3 values--got {}".format(point)
        error = True
    if target == 'mount' and float(point[2]) < 30:
        message = "Sending a mount to a z position lower than 30 can cause " \
                  "a collision with the deck or reach the end of the Z axis " \
                  "movement screw. Z values for mount movement must be >= 30"
        error = True
    mount = data.get('mount')
    if mount not in ['left', 'right']:
        message = "Mount '{}' not supported, must be 'left' or " \
                  "'right'".format(mount)
        error = True
    if target == 'pipette':
        model = data.get('model')
        if model not in pipette_config.config_models:
            message = "Model '{}' not recognized, must be one " \
                      "of {}".format(model, pipette_config.config_models)
            error = True
    else:
        model = None
    return target, point, mount, model, message, error


@_motion_lock
async def move(request):
    """
    Moves the robot to the specified position as provided by the `control.info`
    endpoint response

    Post body must include the following keys:
    - 'target': either 'mount' or 'pipette'
    - 'point': a tuple of 3 floats for x, y, z
    - 'mount': must be 'left' or 'right'

    If 'target' is 'pipette', body must also contain:
    - 'model': must be a valid pipette model (as defined in `pipette_config`)
    """
    hw = hw_from_req(request)
    req = await request.text()
    data = json.loads(req)

    target, point, mount, model, message, error = _validate_move_data(data)
    if error:
        status = 400
    else:
        status = 200
        if ff.use_protocol_api_v2():
            await hw.cache_instruments()
            if target == 'mount':
                critical_point: Optional[CriticalPoint] = CriticalPoint.MOUNT
            else:
                critical_point = None
            mount = Mount[mount.upper()]
            target = Point(*point)
            await hw.home_z()
            pos = await hw.gantry_position(mount, critical_point)
            await hw.move_to(mount, target._replace(z=pos.z),
                             critical_point=critical_point)
            await hw.move_to(mount, target,
                             critical_point=critical_point)
            pos = await hw.gantry_position(mount)
            message = 'Move complete. New position: {}'.format(pos)
        else:
            if target == 'mount':
                message = _move_mount(hw, mount, point)
            elif target == 'pipette':
                message = _move_pipette(hw, mount, model, point)

    return web.json_response({"message": message}, status=status)


def _move_pipette(robot, mount, model, point):
    pipette, _ = _fetch_or_create_pipette(robot, mount, model)
    pipette.move_to((robot.deck, point), strategy='arc')
    new_position = tuple(
        pose_tracker.absolute(pipette.robot.poses, pipette))
    return "Move complete. New position: {}".format(new_position)


def _fetch_or_create_pipette(robot, mount, model=None):
    existing_pipettes = robot.get_instruments()
    pipette = None
    should_remove = True
    for existing_mount, existing_pipette in existing_pipettes:
        if existing_mount == mount:
            pipette = existing_pipette
            should_remove = False
    if pipette is None:
        if model is None:
            pipette = instruments.Pipette(
                mount=mount, max_volume=1000, ul_per_mm=1000)
        else:
            config = pipette_config.load(model)
            pipette = instruments._create_pipette_from_config(
                config=config,
                mount=mount,
                name=model)
    return pipette, should_remove


def _move_mount(robot, mount, point):
    """
    The carriage moves the mount in the Z axis, and the gantry moves in X and Y

    Mount movements do not have the same protections calculated in to an
    existing `move` command like Pipette does, so the safest thing is to home
    the Z axis, then move in X and Y, then move down to the specified Z height
    """
    carriage = robot._actuators[mount]['carriage']

    # Home both carriages, to prevent collisions and to ensure that the other
    # mount doesn't block the one being moved (mount moves are primarily for
    # changing pipettes, so we don't want the other pipette blocking access)
    robot.poses = carriage.home(robot.poses)
    other_mount = 'left' if mount == 'right' else 'right'
    robot.poses = robot._actuators[other_mount]['carriage'].home(robot.poses)

    robot.gantry.move(
        robot.poses, x=point[0], y=point[1])
    robot.poses = carriage.move(
        robot.poses, z=point[2])

    # These x and y values are hard to interpret because of some internals of
    # pose tracker. It's mostly z that matters for this operation anyway
    x, y, _ = tuple(
        pose_tracker.absolute(
            robot.poses, robot._actuators[mount]['carriage']))
    _, _, z = tuple(
        pose_tracker.absolute(
            robot.poses, robot.gantry))
    new_position = (x, y, z)
    return "Move complete. New position: {}".format(new_position)


@_motion_lock
async def home(request):
    """
    This initializes a call to pipette.home() which, as a side effect will:
        1. Check the pipette is actually connected (will throw an error if you
        try to home a non-connected pipette)
        2. Re-engages the motor
    :param request: Information obtained from a POST request.
        The content type is application/json.
        The correct packet form should be as follows:
        {
        'target': Can be, 'robot' or 'pipette'
        'mount': 'left' or 'right', only used if target is pipette
        }
    :return: A success or non-success message.
    """
    hw = hw_from_req(request)
    req = await request.text()
    data = json.loads(req)
    target = data.get('target')
    if target == 'robot':
        await hw.home()
        status = 200
        message = "Homing robot."
    elif target == 'pipette':
        mount = data.get('mount')
        if mount in ['left', 'right']:
            await hw.home([Axis.by_mount(Mount[mount.upper()])])
            await hw.home_plunger(Mount[mount.upper()])
            status = 200
            message = 'Pipette on {} homed successfuly'.format(mount)
        else:
            status = 400
            message = "Expected 'left' or 'right' as values for mount" \
                      "got {} instead.".format(mount)
    else:
        status = 400
        message = "Expected 'robot' or 'pipette' got {}.".format(target)

    return web.json_response({"message": message}, status=status)
