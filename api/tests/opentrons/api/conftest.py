import asyncio
import pytest
from functools import partial
from opentrons.api import models
from collections import namedtuple


async def wait_until(matcher, notifications, timeout=1, loop=None):
    result = []
    for coro in iter(notifications.__anext__, None):
        done, pending = await asyncio.wait([coro], timeout=timeout)

        if pending:
            raise TimeoutError('While waiting for {0}'.format(matcher))

        result += [done.pop().result()]

        if matcher(result[-1]):
            return result


@pytest.fixture
def model():
    from opentrons import robot, instruments, containers
    from opentrons.robot.robot import Robot

    robot.__dict__ = {**Robot().__dict__}

    pipette = instruments.Pipette(axis='a')
    plate = containers.load('96-flat', 'A1')

    instrument = models.Instrument(pipette)
    container = models.Container(plate)

    return namedtuple('model', 'instrument container')(
            instrument=instrument,
            container=container
        )


@pytest.fixture
def main_router(loop):
    from opentrons.api.routers import MainRouter

    with MainRouter(loop=loop) as router:
        router.wait_until = partial(
            wait_until,
            notifications=router.notifications,
            loop=loop)
        yield router
