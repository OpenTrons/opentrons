# Uncomment to enable logging during tests
# import logging
# from logging.config import dictConfig

import asyncio
import contextlib
import os
import pathlib
import re
import shutil
import tempfile
from collections import namedtuple
from functools import partial
from uuid import uuid4 as uuid

import pytest
import opentrons
from opentrons.api import models
from opentrons.data_storage import database
from opentrons.server import rpc
from opentrons import config, types
from opentrons.server import init
from opentrons.deck_calibration import endpoints
from opentrons import hardware_control as hc
from opentrons.protocol_api import ProtocolContext
from opentrons.types import Mount


Session = namedtuple(
    'Session',
    ['server', 'socket', 'token', 'call'])

Protocol = namedtuple(
    'Protocol',
    ['text', 'filename'])

# Note: When dummy_db or robot fixtures are used, this db is copied into a
# a temp testing_db that is deleted in between tests to allow for db mutation
MAIN_TESTER_DB = str(os.path.join(
    os.path.dirname(
        globals()["__file__"]), 'testing_database.db')
)


def state(topic, state):
    def _match(item):
        return \
            item['topic'] == topic and \
            item['payload'].state == state

    return _match


def log_by_axis(log, axis):
    from functools import reduce

    def reducer(e1, e2):
        return {
            axis: e1[axis] + [round(e2[axis])]
            for axis in axis
        }

    return reduce(reducer, log, {axis: [] for axis in axis})


def print_db_path(db):
    cursor = database.db_conn.cursor()
    cursor.execute("PRAGMA database_list")
    db_info = cursor.fetchone()
    print("Database: ", db_info[2])


@pytest.fixture
def config_tempdir(tmpdir):
    os.environ['OT_API_CONFIG_DIR'] = str(tmpdir)
    config.reload()
    database.change_database(config.CONFIG['labware_database_file'])
    yield tmpdir


@pytest.fixture(autouse=True)
def clear_feature_flags(config_tempdir):
    ff_file = config.CONFIG['feature_flags_file']
    if os.path.exists(ff_file):
        os.remove(ff_file)
    yield
    if os.path.exists(ff_file):
        os.remove(ff_file)


@pytest.fixture
def wifi_keys_tempdir(config_tempdir):
    old_wifi_keys = config.CONFIG['wifi_keys_dir']
    with tempfile.TemporaryDirectory() as td:
        config.CONFIG['wifi_keys_dir'] = pathlib.Path(td)
        yield td
        config.CONFIG['wifi_keys_dir'] = old_wifi_keys


# Builds a temp db to allow mutations during testing
@pytest.fixture(autouse=True)
def dummy_db(config_tempdir, tmpdir):
    temp_db_path = str(tmpdir.mkdir('testing').join("database.db"))
    shutil.copy2(MAIN_TESTER_DB, temp_db_path)
    database.change_database(temp_db_path)
    yield None
    database.change_database(MAIN_TESTER_DB)
    os.remove(temp_db_path)


# -------feature flag fixtures-------------
@pytest.fixture
def calibrate_bottom_flag():
    config.advanced_settings.set_adv_setting('calibrateToBottom', True)
    yield
    config.advanced_settings.set_adv_setting('calibrateToBottom', False)


@pytest.fixture
def short_trash_flag():
    config.advanced_settings.set_adv_setting('shortFixedTrash', True)
    yield
    config.advanced_settings.set_adv_setting('shortFixedTrash', False)


@pytest.fixture
def old_aspiration(monkeypatch):
    config.advanced_settings.set_adv_setting('useOldAspirationFunctions', True)
    yield
    config.advanced_settings.set_adv_setting(
        'useOldAspirationFunctions', False)

# -----end feature flag fixtures-----------


@contextlib.contextmanager
def using_api2(loop):
    oldenv = os.environ.get('OT_API_FF_useProtocolApi2')
    os.environ['OT_API_FF_useProtocolApi2'] = '1'
    opentrons.reset_globals(version=2, loop=loop)
    try:
        yield opentrons.hardware
    finally:
        try:
            loop.run_until_complete(opentrons.hardware.reset())
        except RuntimeError:
            loop.create_task(opentrons.hardware.reset())
        if None is oldenv:
            os.environ.pop('OT_API_FF_useProtocolApi2')
        else:
            os.environ['OT_API_FF_useProtocolApi2'] = oldenv
        opentrons.reset_globals(loop=loop)


@pytest.fixture
def ensure_api2(request, loop):
    with using_api2(loop):
        yield


@contextlib.contextmanager
def using_api1(loop):
    oldenv = os.environ.get('OT_API_FF_useProtocolApi2')
    if oldenv:
        os.environ.pop('OT_API_FF_useProtocolApi2')
    opentrons.reset_globals(version=1, loop=loop)
    try:
        yield opentrons.hardware
    finally:
        opentrons.hardware.reset()
        if None is not oldenv:
            os.environ['OT_API_FF_useProtocolApi2'] = oldenv
        opentrons.reset_globals(loop=loop)


@pytest.fixture(params=[using_api1, using_api2])
async def async_server(request, virtual_smoothie_env, loop):
    if request.node.get_marker('api1_only') and request.param != using_api1:
        pytest.skip('requires api1 only')
    elif request.node.get_marker('api2_only') and request.param != using_api2:
        pytest.skip('requires api2 only')
    with request.param(loop):
        app = init(loop)
        app['api_version'] = 1 if request.param == using_api1 else 2
        yield app
        await app.shutdown()


@pytest.fixture
async def async_client(async_server, loop, test_client):
    cli = await loop.create_task(test_client(async_server))
    endpoints.session = None
    yield cli


@pytest.fixture
async def dc_session(request, async_server, monkeypatch, loop):
    """
    Mock session manager for deck calibation
    """
    hw = async_server['com.opentrons.hardware']
    if async_server['api_version'] == 2:
        await hw.cache_instruments({
            types.Mount.LEFT: None,
            types.Mount.RIGHT: 'p300_multi_v1'})

    ses = endpoints.SessionManager(hw)
    endpoints.session = ses
    monkeypatch.setattr(endpoints, 'session', ses)
    yield ses


@pytest.fixture
def robot(dummy_db):
    from opentrons.legacy_api.robot import Robot
    return Robot()


@pytest.fixture(params=["dinosaur.py"])
def protocol(request):
    try:
        root = request.getfixturevalue('protocol_file')
    except Exception:
        root = request.param

    filename = os.path.join(os.path.dirname(__file__), 'data', root)

    with open(filename) as file:
        text = ''.join(list(file))
        return Protocol(text=text, filename=filename)


@pytest.fixture(params=["no_clear_tips.py"])
def tip_clear_protocol(request):
    try:
        root = request.getfixturevalue('protocol_file')
    except Exception:
        root = request.param

    filename = os.path.join(os.path.dirname(__file__), 'data', root)

    with open(filename) as file:
        text = ''.join(list(file))
        return Protocol(text=text, filename=filename)


@pytest.fixture
def session_manager(main_router):
    return main_router.session_manager


@pytest.fixture
def session(loop, test_client, request, main_router):
    """
    Create testing session. Tests using this fixture are expected
    to have @pytest.mark.parametrize('root', [value]) decorator set.
    If not set root will be defaulted to None
    """
    from aiohttp import web
    from opentrons.server import error_middleware
    root = None
    try:
        root = request.getfixturevalue('root')
        if not root:
            root = main_router
        # Assume test fixture has init to attach test loop
        root.init(loop)
    except Exception:
        pass

    app = web.Application(loop=loop, middlewares=[error_middleware])
    server = rpc.RPCServer(app, root)
    client = loop.run_until_complete(test_client(server.app))
    socket = loop.run_until_complete(client.ws_connect('/'))
    token = str(uuid())

    async def call(**kwargs):
        request = {
            '$': {
                'token': token
            },
        }
        request.update(kwargs)
        return await socket.send_json(request)

    def finalizer():
        server.shutdown()
    request.addfinalizer(finalizer)
    return Session(server, socket, token, call)


def fuzzy_assert(result, expected):
    expected_re = ['.*'.join(['^'] + item + ['$']) for item in expected]

    assert len(result) == len(expected_re), \
        'result and expected have different length'

    for res, exp in zip(result, expected_re):
        assert re.compile(
            exp.lower()).match(res.lower()), "{} didn't match {}" \
            .format(res, exp)


@pytest.fixture
def connect(session, test_client):
    async def _connect():
        client = await test_client(session.server.app)
        return await client.ws_connect('/')
    return _connect


@pytest.fixture
def virtual_smoothie_env(monkeypatch):
    # TODO (ben 20180426): move this to the .env file
    monkeypatch.setenv('ENABLE_VIRTUAL_SMOOTHIE', 'true')
    yield
    monkeypatch.setenv('ENABLE_VIRTUAL_SMOOTHIE', 'false')


@pytest.fixture(params=[using_api1, using_api2])
def hardware(request, loop, virtual_smoothie_env):
    if request.node.get_marker('api1_only') and request.param != using_api1:
        pytest.skip('requires api1 only')
    elif request.node.get_marker('api2_only') and request.param != using_api2:
        pytest.skip('requires api2 only')
    with request.param(loop) as hw:
        yield hw


@pytest.fixture
def main_router(loop, virtual_smoothie_env, hardware):
    from opentrons.api.routers import MainRouter
    router = MainRouter(hardware, loop)
    router.wait_until = partial(
        wait_until,
        notifications=router.notifications,
        loop=loop)
    yield router


async def wait_until(matcher, notifications, timeout=1, loop=None):
    result = []
    for coro in iter(notifications.__anext__, None):
        done, pending = await asyncio.wait([coro], timeout=timeout)

        if pending:
            [task.cancel() for task in pending]
            raise TimeoutError('Notifications: {0}'.format(result))

        result += [done.pop().result()]

        if matcher(result[-1]):
            return result


@pytest.fixture
def model(robot, hardware, loop, request):
    # Use with pytest.mark.parametrize(’labware’, [some-labware-name])
    # to have a different labware loaded as .container. If not passed,
    # defaults to the version-appropriate way to do 96 flat
    from opentrons.legacy_api.containers import load
    from opentrons.legacy_api.instruments.pipette import Pipette

    try:
        lw_name = request.getfixturevalue('labware')
    except Exception:
        lw_name = None

    if isinstance(hardware, hc.HardwareAPILike):
        ctx = ProtocolContext(loop=loop, hardware=hardware)
        pip = ctx.load_instrument('p300_single', 'right')
        loop.run_until_complete(hardware.cache_instruments(
            {Mount.RIGHT: 'p300_single'}))
        instrument = models.Instrument(pip, context=ctx)
        plate = ctx.load_labware_by_name(
            lw_name or 'generic_96_wellplate_380_ul', 1)
        rob = hardware
        container = models.Container(plate, context=ctx)
    else:
        print("hardware is {}".format(hardware))
        pipette = Pipette(robot,
                          ul_per_mm=18.5, max_volume=300, mount='right')
        plate = load(robot, lw_name or '96-flat', '1')
        rob = robot
        instrument = models.Instrument(pipette)
        container = models.Container(plate)

    return namedtuple('model', 'robot instrument container')(
            robot=rob,
            instrument=instrument,
            container=container
        )


@pytest.fixture
def model_with_trough(robot):
    from opentrons.legacy_api.containers import load
    from opentrons.legacy_api.instruments.pipette import Pipette

    pipette = Pipette(robot, ul_per_mm=18.5, max_volume=300, mount='right')
    plate = load(robot, 'trough-12row', '1')

    instrument = models.Instrument(pipette)
    container = models.Container(plate)

    return namedtuple('model', 'robot instrument container')(
            robot=robot,
            instrument=instrument,
            container=container
        )


@pytest.fixture
def smoothie(monkeypatch):
    from opentrons.drivers.smoothie_drivers.driver_3_0 import \
         SmoothieDriver_3_0_0 as SmoothieDriver
    from opentrons.config import robot_configs

    monkeypatch.setenv('ENABLE_VIRTUAL_SMOOTHIE', 'true')
    driver = SmoothieDriver(robot_configs.load())
    driver.connect()
    yield driver
    driver.disconnect()
    monkeypatch.setenv('ENABLE_VIRTUAL_SMOOTHIE', 'false')


@pytest.fixture
def hardware_controller_lockfile():
    old_lockfile = config.CONFIG['hardware_controller_lockfile']
    with tempfile.TemporaryDirectory() as td:
        config.CONFIG['hardware_controller_lockfile']\
            = pathlib.Path(td)/'hardware.lock'
        yield td
        config.CONFIG['hardware_controller_lockfile'] = old_lockfile


@pytest.fixture
def running_on_pi():
    oldpi = config.IS_ROBOT
    config.IS_ROBOT = True
    yield
    config.IS_ROBOT = oldpi


@pytest.mark.skipif(not hc.Controller,
                    reason='hardware controller not available '
                           '(probably windows)')
@pytest.fixture
def cntrlr_mock_connect(monkeypatch):
    async def mock_connect(obj, port=None):
        return
    monkeypatch.setattr(hc.Controller, 'connect', mock_connect)


@pytest.fixture
def hardware_api(loop):
    hw_api = hc.API.build_hardware_simulator(loop=loop)
    return hw_api
