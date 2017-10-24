from conftest import state, log_by_axis
from unittest import mock
from functools import partial
from opentrons import robot

state = partial(state, 'calibration')

async def test_tip_probe_functional(main_router, model, virtual_smoothie_env):
    robot.connect()
    robot._driver.home('za')
    robot._driver.home('bcx')
    robot._driver.home()
    robot._driver.log.clear()
    main_router.calibration_manager.tip_probe(model.instrument)
    by_axis = log_by_axis(robot._driver.log, 'XYA')
    coords = [
        (x, y, z)
        for x, y, z
        in zip(by_axis['X'], by_axis['Y'], by_axis['A'])
    ]

    print(coords)


async def test_tip_probe(main_router, model):

    with mock.patch(
         'opentrons.util.calibration_functions.probe_instrument') as patch:
        main_router.calibration_manager.tip_probe(model.instrument)
        patch.assert_called_with(
            model.instrument._instrument,
            main_router.calibration_manager._robot)

        await main_router.wait_until(state('probing'))
        await main_router.wait_until(state('ready'))

async def test_move_to_front(main_router, model):
    with mock.patch(
         'opentrons.util.calibration_functions.move_instrument_for_probing_prep') as patch:  # NOQA

        main_router.calibration_manager.move_to_front(model.instrument)
        patch.assert_called_with(
            model.instrument._instrument,
            main_router.calibration_manager._robot)

        await main_router.wait_until(state('moving'))
        await main_router.wait_until(state('ready'))


async def test_move_to(main_router, model):
    with mock.patch.object(model.instrument._instrument, 'move_to') as move_to:
        main_router.calibration_manager.move_to(
            model.instrument,
            model.container)

        move_to.assert_called_with(model.container._container[0])

        await main_router.wait_until(state('moving'))
        await main_router.wait_until(state('ready'))


async def test_jog(main_router, model):
    from opentrons import robot

    with mock.patch('opentrons.util.calibration_functions.jog_instrument') as jog:  # NOQA
        for distance, axis in zip((1, 2, 3), 'xyz'):
            main_router.calibration_manager.jog(
                model.instrument,
                distance,
                axis
            )

        expected = [
            mock.call(
                instrument=model.instrument._instrument,
                distance=distance,
                axis=axis,
                robot=robot)
            for axis, distance in zip('xyz', (1, 2, 3))]

        assert jog.mock_calls == expected

        await main_router.wait_until(state('moving'))
        await main_router.wait_until(state('ready'))


async def test_update_container_offset(main_router, model):
    with mock.patch.object(
            main_router.calibration_manager._robot,
            'calibrate_container_with_instrument') as call:
        main_router.calibration_manager.update_container_offset(
                model.container,
                model.instrument
            )
        call.assert_called_with(
            container=model.container._container,
            instrument=model.instrument._instrument,
            save=True
        )
