import contextlib
import json
import os
import shutil
import tempfile

import pytest

from opentrons.server import init
from opentrons.data_storage import database as db
from opentrons.config import pipette_config
from opentrons import config, types


def validate_response_body(body):
    settings_list = body.get('settings')
    assert type(settings_list) == list
    for obj in settings_list:
        assert 'id' in obj, '"id" field not found in settings object'
        assert 'title' in obj, '"title" not found for {}'.format(obj['id'])
        assert 'description' in obj, '"description" not found for {}'.format(
            obj['id'])
        assert 'value' in obj, '"value" not found for {}'.format(obj['id'])


async def test_get(virtual_smoothie_env, loop, test_client):
    app = init(loop)
    cli = await loop.create_task(test_client(app))

    resp = await cli.get('/settings')
    body = await resp.json()
    assert resp.status == 200
    validate_response_body(body)


async def test_set(virtual_smoothie_env, loop, test_client):
    app = init(loop)
    cli = await loop.create_task(test_client(app))
    test_id = 'disableHomeOnBoot'

    resp = await cli.post('/settings', json={"id": test_id, "value": True})
    body = await resp.json()
    assert resp.status == 200
    validate_response_body(body)
    test_setting = list(
        filter(lambda x: x.get('id') == test_id, body.get('settings')))[0]
    assert test_setting.get('value')


async def test_available_resets(virtual_smoothie_env, loop, test_client):
    app = init(loop)
    cli = await loop.create_task(test_client(app))

    resp = await cli.get('/settings/reset/options')
    body = await resp.json()
    options_list = body.get('options')
    assert resp.status == 200
    for key in ['tipProbe', 'labwareCalibration', 'bootScripts']:
        for opt in options_list:
            if opt['id'] == key:
                assert 'name' in opt
                assert 'description' in opt
                break
        else:
            raise KeyError(key)


async def execute_reset_tests_v1(cli):
    # Make sure we actually delete the database
    resp = await cli.post('/settings/reset', json={'labwareCalibration': True})
    body = await resp.json()
    assert not os.path.exists(db.database_path)
    assert resp.status == 200
    assert body == {}

    # Make sure this one is idempotent
    resp = await cli.post('/settings/reset', json={'labwareCalibration': True})
    body = await resp.json()
    assert resp.status == 200
    assert body == {}

    # Check that we properly delete only the tip length key
    resp = await cli.post('/settings/reset', json={'tipProbe': True})
    body = await resp.json()
    assert resp.status == 200
    assert body == {}

    robot_settings = config.CONFIG['robot_settings_file']
    with open(robot_settings, 'r') as f:
        data = json.load(f)
    assert data['tip_length'] == {}

    # Check the inpost validation
    resp = await cli.post('/settings/reset', json={'aksgjajhadjasl': False})
    body = await resp.json()
    assert resp.status // 100 == 4
    assert 'message' in body
    assert 'aksgjajhadjasl' in body['message']


async def execute_reset_tests_v2(cli):
    # Make sure we actually delete the database
    resp = await cli.post('/settings/reset', json={'labwareCalibration': True})
    body = await resp.json()
    assert not os.listdir(config.CONFIG['labware_calibration_offsets_dir_v4'])
    assert resp.status == 200
    assert body == {}

    # Make sure this one is idempotent
    resp = await cli.post('/settings/reset', json={'labwareCalibration': True})
    body = await resp.json()
    assert resp.status == 200
    assert body == {}

    # Check that we properly delete only the tip length key
    resp = await cli.post('/settings/reset', json={'tipProbe': True})
    body = await resp.json()
    assert resp.status == 200
    assert body == {}

    robot_settings = config.CONFIG['robot_settings_file']
    with open(robot_settings, 'r') as f:
        data = json.load(f)
    assert data['instrument_offset']\
        == config.robot_configs.build_fallback_instrument_offset({})

    # Check the inpost validation
    resp = await cli.post('/settings/reset', json={'aksgjajhadjasl': False})
    body = await resp.json()
    assert resp.status // 100 == 4
    assert 'message' in body
    assert 'aksgjajhadjasl' in body['message']


@contextlib.contextmanager
def restore_db(db_path):
    db_name = os.path.basename(db_path)
    with tempfile.TemporaryDirectory() as tempdir:
        shutil.copy(db_path,
                    os.path.join(tempdir, db_name))
        try:
            yield
        finally:
            shutil.copy(os.path.join(tempdir, db_name),
                        db_path)


@pytest.mark.api1_only
async def test_reset_v1(virtual_smoothie_env, loop, async_client):
    # This test runs each reset individually (except /data/boot.d which won’t
    # work locally) and checks the error handling

    # precondition
    assert os.path.exists(db.database_path)
    with restore_db(db.database_path):
        await execute_reset_tests_v1(async_client)


@pytest.mark.api2_only
async def test_reset_v2(virtual_smoothie_env, loop, async_client):

    # This test runs each reset individually (except /data/boot.d which won’t
    # work locally) and checks the error handling

    # precondition
    await execute_reset_tests_v2(async_client)


async def test_receive_pipette_settings(
        async_server, loop, async_client):

    test_model = 'p300_multi_v1'
    test_id = 'abc123'
    test_id2 = 'abcd123'
    hw = async_server['com.opentrons.hardware']

    if async_server['api_version'] == 1:
        hw.model_by_mount = {'left': {'model': test_model, 'id': test_id},
                             'right': {'model': test_model, 'id': test_id2}}
        hw.get_attached_pipettes()
    else:
        hw._backend._attached_instruments = {
            types.Mount.RIGHT: {'model': test_model, 'id': test_id},
            types.Mount.LEFT: {'model': test_model, 'id': test_id2}
        }

        await hw.cache_instruments()

    resp = await async_client.get('/settings/pipettes')
    body = await resp.json()
    assert test_id in body
    assert body[test_id]['fields'] == pipette_config.list_mutable_configs(
        pipette_id=test_id)


async def test_receive_pipette_settings_one_pipette(
        async_server, loop, async_client):
    # This will check that sending a known pipette id works,
    # and sending an unknown one does not
    test_model = 'p300_multi_v1'
    test_id = 'abc123'
    test_id2 = 'abcd123'

    hw = async_server['com.opentrons.hardware']
    if async_server['api_version'] == 1:
        hw.model_by_mount = {'left': {'model': test_model, 'id': test_id},
                             'right': {'model': test_model, 'id': test_id2}}
        hw.get_attached_pipettes()
    else:
        hw._backend._attached_instruments = {
            types.Mount.RIGHT: {'model': test_model, 'id': test_id},
            types.Mount.LEFT: {'model': test_model, 'id': test_id2}}
        await hw.cache_instruments()
    resp = await async_client.get('/settings/pipettes/{}'.format(test_id))
    body = await resp.json()
    assert body['fields'] == pipette_config.list_mutable_configs(
        pipette_id=test_id)

    # Non-existent pipette id and get 404
    resp = await async_client.get(
        '/settings/pipettes/{}'.format('wannabepipette'))
    assert resp.status == 404


async def test_modify_pipette_settings(async_server, loop, async_client):
    # This test will check that setting modified pipette configs
    # works as expected

    test_model = 'p300_multi_v1'
    test_id = 'abc123'
    test_id2 = 'abcd123'

    changes = {
        'fields': {
            'pickUpCurrent': {'value': 1}
        }
    }

    no_changes = {
        'fields': {
            'pickUpCurrent': {'value': 1}
            }
        }

    hw = async_server['com.opentrons.hardware']
    if async_server['api_version'] == 1:
        hw.model_by_mount = {'left': {'model': test_model, 'id': test_id},
                             'right': {'model': test_model, 'id': test_id2}}
        hw.get_attached_pipettes()
    else:
        hw._backend._attached_instruments = {
            types.Mount.RIGHT: {'model': test_model, 'id': test_id},
            types.Mount.LEFT: {'model': test_model, 'id': test_id2}}
        await hw.cache_instruments()

    # Check data has not been changed yet
    resp = await async_client.get('/settings/pipettes/{}'.format(test_id))
    body = await resp.json()
    assert body['fields']['pickUpCurrent'] == \
        pipette_config.list_mutable_configs(
            pipette_id=test_id)['pickUpCurrent']

    # Check that data is changed and matches the changes specified
    resp = await async_client.patch(
        '/settings/pipettes/{}'.format(test_id),
        json=changes)
    patch_body = await resp.json()
    assert resp.status == 200
    check = await async_client.get('/settings/pipettes/{}'.format(test_id))
    body = await check.json()
    print(patch_body)
    assert body['fields'] == patch_body['fields']

    # Check that None reverts a setting to default
    changes2 = {
        'fields': {
            'pickUpCurrent': None
            }
        }
    resp = await async_client.patch(
        '/settings/pipettes/{}'.format(test_id),
        json=changes2)
    assert resp.status == 200
    check = await async_client.get('/settings/pipettes/{}'.format(test_id))
    body = await check.json()
    assert body['fields']['pickUpCurrent']['value'] == \
        pipette_config.list_mutable_configs(
            pipette_id=test_id)['pickUpCurrent']['default']

    # check no fields returns no changes
    resp = await async_client.patch(
        '/settings/pipettes/{}'.format(test_id),
        json=no_changes)
    body = await resp.json()
    assert body['fields'] == pipette_config.list_mutable_configs(test_id)
    assert resp.status == 200


async def test_incorrect_modify_pipette_settings(
        async_server, loop, async_client):

    test_model = 'p300_multi_v1'
    test_id = 'abc123'
    test_id2 = 'abcd123'

    out_of_range = {
            'fields': {
                'pickUpCurrent': {'value': 1000}
                }
            }
    hw = async_server['com.opentrons.hardware']
    if async_server['api_version'] == 1:
        hw.model_by_mount = {'left': {'model': test_model, 'id': test_id},
                             'right': {'model': test_model, 'id': test_id2}}
        hw.get_attached_pipettes()
    else:
        hw._backend._attached_instruments = {
            types.Mount.RIGHT: {'model': test_model, 'id': test_id},
            types.Mount.LEFT: {'model': test_model, 'id': test_id2}}
        await hw.cache_instruments()

    # check over max fails
    resp = await async_client.patch(
        '/settings/pipettes/{}'.format(test_id),
        json=out_of_range)
    assert resp.status == 412


async def test_set_log_level(
        async_server, loop, async_client):
    # Check input sanitization
    resp = await async_client.post('/settings/log_level/local', json={})
    assert resp.status == 400
    body = await resp.json()
    assert 'message' in body
    resp = await async_client.post('/settings/log_level/local',
                                   json={'log_level': 'oafajhshda'})
    assert resp.status == 400
    body = await resp.json()
    assert 'message'in body

    assert async_server['com.opentrons.hardware'].config.log_level != 'ERROR'
    resp = await async_client.post('/settings/log_level/local',
                                   json={'log_level': 'error'})
    assert resp.status == 200
    body = await resp.json()
    assert 'message' in body
    assert async_server['com.opentrons.hardware'].config.log_level == 'ERROR'
