import json
from opentrons import __version__
from opentrons.server import init


async def test_health(virtual_smoothie_env, loop, test_client):
    app = init(loop)
    cli = await loop.create_task(test_client(app))

    expected = json.dumps({
        'name': 'opentrons-dev',
        'api_version': __version__,
        'fw_version': 'Virtual Smoothie',
        'logs': ['/logs/serial.log', '/logs/api.log'],
        'system_version': '0.0.0'
    })
    resp = await cli.get('/health')
    text = await resp.text()
    assert resp.status == 200
    assert text == expected
