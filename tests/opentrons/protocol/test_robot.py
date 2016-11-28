import threading
import unittest

from opentrons.robot.robot import Robot
from opentrons.containers.placeable import Deck
from opentrons import instruments, containers
from opentrons.util.vector import Vector


class RobotTest(unittest.TestCase):
    def setUp(self):
        Robot.reset_for_tests()
        self.robot = Robot.get_instance()

        self.robot.reset()
        self.robot.connect()
        self.robot.home(enqueue=False)

    def test_add_container(self):
        c1 = self.robot.add_container('96-flat', 'A1')
        res = self.robot.containers()
        expected = {
            '96-flat': c1
        }
        self.assertEquals(res, expected)

        c2 = self.robot.add_container('96-flat', 'A2', 'my-special-plate')
        res = self.robot.containers()
        expected = {
            '96-flat': c1,
            'my-special-plate': c2
        }
        self.assertEquals(res, expected)

    def test_comment(self):
        self.robot.clear_commands()
        self.robot.comment('hello')
        self.assertEquals(len(self.robot.commands()), 1)
        self.assertEquals(self.robot._commands[0].description, 'hello')

    def test_home_after_disconnect(self):
        self.robot.disconnect()
        self.assertRaises(RuntimeError, self.robot.home)

    def test_simulate(self):
        self.robot.disconnect()
        p200 = instruments.Pipette(axis='b', name='my-fancy-pancy-pipette')
        p200.aspirate().dispense()
        self.robot.simulate()
        self.assertEquals(len(self.robot._commands), 2)
        self.assertEquals(self.robot.connections['live'], None)

    def test_stop_run(self):
        p200 = instruments.Pipette(axis='b', name='my-fancy-pancy-pipette')
        p200.calibrate_plunger(top=0, bottom=5, blow_out=6, drop_tip=7)

        for i in range(1000):
            p200.aspirate().dispense()

        res = None

        def _run():
            nonlocal res
            res = self.robot.run()

        thread = threading.Thread(target=_run)
        thread.start()

        self.robot.stop()

        thread.join()

        self.assertEquals(
            res[-1], 'Received a STOP signal and exited from movements')

    def test_calibrated_max_dimension(self):

        expected = self.robot._deck.max_dimensions(self.robot._deck)
        res = self.robot._calibrated_max_dimension()
        self.assertEquals(res, expected)

        p200 = instruments.Pipette(axis='b', name='my-fancy-pancy-pipette')
        plate = containers.load('96-flat', 'A1')
        self.robot.move_head(x=10, y=10, z=10)
        p200.calibrate_position((plate, Vector(0, 0, 0)))

        res = self.robot._calibrated_max_dimension()

        expected = Vector(plate.max_dimensions(plate)) + Vector(10, 10, 10)
        self.assertEquals(res, expected)

    def test_create_arc(self):
        p200 = instruments.Pipette(axis='b', name='my-fancy-pancy-pipette')
        plate = containers.load('96-flat', 'A1')
        plate2 = containers.load('96-flat', 'B1')

        self.robot.move_head(x=10, y=10, z=10)
        p200.calibrate_position((plate, Vector(0, 0, 0)))
        self.robot.move_head(x=10, y=10, z=100)
        p200.calibrate_position((plate2, Vector(0, 0, 0)))

        res = self.robot._create_arc((0, 0, 0), plate[0])
        expected = [
            {'z': 100},
            {'x': 0, 'y': 0},
            {'z': 0}
        ]
        self.assertEquals(res, expected)

        res = self.robot._create_arc((0, 0, 0), plate[0])
        expected = [
            {'z': 20.5 + 5},
            {'x': 0, 'y': 0},
            {'z': 0}
        ]
        self.assertEquals(res, expected)

    def test_disconnect(self):
        self.robot.disconnect()
        res = self.robot.is_connected()
        self.assertEquals(bool(res), False)

    def test_get_connected_port(self):
        res = self.robot.get_connected_port()
        self.assertEquals(res, self.robot.VIRTUAL_SMOOTHIE_PORT)

    def test_robot_move_to(self):
        self.robot.move_to((Deck(), (100, 0, 0)))
        self.robot.run()
        position = self.robot._driver.get_head_position()['current']
        self.assertEqual(position, (100, 0, 0))

    def test_move_head(self):
        self.robot.move_head(x=100, y=0, z=20)
        current = self.robot._driver.get_head_position()['current']
        self.assertEquals(current, (100, 0, 20))

    def test_home(self):

        self.robot.disconnect()
        self.robot.connect()

        self.assertDictEqual(self.robot.axis_homed, {
            'x': False, 'y': False, 'z': False, 'a': False, 'b': False
        })

        self.robot.clear_commands()
        self.robot.home('xa', enqueue=True)
        self.assertDictEqual(self.robot.axis_homed, {
            'x': False, 'y': False, 'z': False, 'a': False, 'b': False
        })
        self.assertEquals(len(self.robot._commands), 1)
        self.robot.run()
        self.assertDictEqual(self.robot.axis_homed, {
            'x': True, 'y': False, 'z': False, 'a': True, 'b': False
        })

        self.robot.clear_commands()
        self.robot.home(enqueue=False)
        self.assertEquals(len(self.robot._commands), 0)

        self.assertDictEqual(self.robot.axis_homed, {
            'x': True, 'y': True, 'z': True, 'a': True, 'b': True
        })

    def test_robot_pause_and_resume(self):
        self.robot.move_to((Deck(), (100, 0, 0)), enqueue=True)
        self.robot.move_to((Deck(), (101, 0, 0)), enqueue=True)
        self.assertEqual(len(self.robot._commands), 2)

        self.robot.pause()

        def _run():
            self.robot.run()

        thread = threading.Thread(target=_run)
        thread.start()
        self.robot.resume()
        thread.join(0.5)

        self.assertEquals(thread.is_alive(), False)
        self.assertEqual(len(self.robot._commands), 2)

        self.robot.clear_commands()
        self.assertEqual(len(self.robot._commands), 0)

        self.robot.move_to((Deck(), (100, 0, 0)), enqueue=True)
        self.robot.move_to((Deck(), (101, 0, 0)), enqueue=True)

        def _run():
            self.robot.run()

        self.robot.pause()

        thread = threading.Thread(target=_run)
        thread.start()
        thread.join(0.01)

        self.assertEquals(thread.is_alive(), True)
        self.assertEqual(len(self.robot._commands) > 0, True)

        self.robot.resume()

        thread.join(1)
        self.assertEqual(len(self.robot._commands), 2)

    def test_versions(self):
        res = self.robot.versions()
        expected = {
            'config': {
                'version': 'v1.2.0',
                'compatible': True
            },
            'firmware': {
                'version': 'v1.0.5',
                'compatible': True
            },
            'ot_version': {
                'version': 'one_pro',
                'compatible': True
            }
        }
        self.assertDictEqual(res, expected)

    def test_diagnostics(self):
        res = self.robot.diagnostics()
        expected = {
            'axis_homed': {
                'x': True, 'y': True, 'z': True, 'a': True, 'b': True
            },
            'switches': {
                'x': False,
                'y': False,
                'z': False,
                'a': False,
                'b': False
            },
            'steps_per_mm': {
                'x': 80.0,
                'y': 80.0
            }
        }
        self.assertDictEqual(res, expected)

        self.robot.disconnect()
        self.robot.connect()
        self.assertRaises(RuntimeWarning, self.robot.move_head, x=-199)
        res = self.robot.diagnostics()
        expected = {
            'axis_homed': {
                'x': False, 'y': False, 'z': False, 'a': False, 'b': False
            },
            'switches': {
                'x': True,
                'y': False,
                'z': False,
                'a': False,
                'b': False
            },
            'steps_per_mm': {
                'x': 80.0,
                'y': 80.0
            }
        }
        self.assertDictEqual(res, expected)

        self.robot.home('x', enqueue=False)
        res = self.robot.diagnostics()
        expected = {
            'axis_homed': {
                'x': True, 'y': False, 'z': False, 'a': False, 'b': False
            },
            'switches': {
                'x': False,
                'y': False,
                'z': False,
                'a': False,
                'b': False
            },
            'steps_per_mm': {
                'x': 80.0,
                'y': 80.0
            }
        }
        self.assertDictEqual(res, expected)
