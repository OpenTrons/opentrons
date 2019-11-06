import json
from opentrons import __version__, protocol_api
from opentrons.config import feature_flags as ff


async def test_health(virtual_smoothie_env, loop, async_client):

    expected = json.dumps({
        'name': 'opentrons-dev',
        'api_version': __version__,
        'fw_version': 'Virtual Smoothie',
        'logs': ['/logs/serial.log', '/logs/api.log'],
        'system_version': '0.0.0',
        'protocol_api_version':
        list(protocol_api.MAX_SUPPORTED_VERSION)
        if ff.use_protocol_api_v2() else
        [1, 0]
    })
    resp = await async_client.get('/health')
    text = await resp.text()
    assert resp.status == 200
    assert text == expected
