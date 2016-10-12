from threading import (Thread, Event)
import unittest

from opentrons_sdk.drivers.motor import CNCDriver


class OpenTronsTest(unittest.TestCase):

    def setUp(self):

        # set this to True if testing with a robot connected
        # testing while connected allows the response handlers
        # and serial handshakes to be tested

        self.motor = CNCDriver()

        myport = self.motor.VIRTUAL_SMOOTHIE_PORT
        success = self.motor.connect(myport)
        self.assertTrue(success)

    def tearDown(self):
        self.motor.disconnect()

    def test_pause_resume(self):
        self.motor.home()

        self.motor.resume()

        done = Event()
        done.clear()

        def _move_head():
            self.motor.move_head(x=100)
            done.set()

        thread = Thread(target=_move_head)
        thread.start()

        self.motor.resume()
        done.wait()

    def test_get_position(self):
        self.motor.home()
        self.motor.move_head(x=100)
        coords = self.motor.get_head_position()
        expected_coords = {
            'target': (100, 250, 120),
            'current': (100, 250, 120)
        }
        self.assertDictEqual(coords, expected_coords)

    def test_home(self):
        success = self.motor.home('x', 'y')
        self.assertTrue(success)

        success = self.motor.home('ba')
        self.assertTrue(success)

    def test_limit_hit_exception(self):
        self.motor.home()
        try:
            self.motor.move_head(x=-100)
            self.motor.wait_for_arrival()
        except RuntimeWarning as e:
            self.assertEqual(str(RuntimeWarning('limit switch hit')), str(e))

        self.motor.home()

    def test_move_x(self):
        success = self.motor.move_head(x=100)
        self.assertTrue(success)

    def test_move_y(self):
        success = self.motor.move_head(y=100)
        self.assertTrue(success)

    def test_move_z(self):
        success = self.motor.move_head(z=30)
        self.assertTrue(success)

    def test_send_command(self):
        success = self.motor.send_command('G0 X1 Y1 Z1')
        self.assertTrue(success)

    def test_send_command_with_kwargs(self):
        success = self.motor.send_command('G0', x=1, y=2, z=3)
        self.assertTrue(success)

    def test_wait(self):
        success = self.motor.wait(1.234)
        self.assertTrue(success)

    def test_wait_for_arrival(self):
        self.motor.home()
        self.motor.move_head(x=200, y=200)
        self.motor.move_head(z=30)
        success = self.motor.wait_for_arrival()
        self.assertTrue(success)

    def test_move_relative(self):
        self.motor.home()
        self.motor.move_head(x=100, y=100, z=100)
        self.motor.move_head(x=0, mode='relative')
        self.motor.move_head(x=100, mode='absolute')

    def test_calibrate_steps_per_mm(self):
        self.motor.home()
        self.motor.set_steps_per_mm('x', 80.0)
        self.motor.set_steps_per_mm('y', 80.0)
        self.motor.move_head(x=200, y=200)

        self.motor.calibrate_steps_per_mm('x', 200, 198)
        self.motor.calibrate_steps_per_mm('y', 200, 202)

        new_x_steps = self.motor.get_steps_per_mm('x')
        new_y_steps = self.motor.get_steps_per_mm('y')

        exptected_x = round((200 / 198) * 80.0, 2)
        exptected_y = round((200 / 202) * 80.0, 2)

        self.assertEqual(exptected_x, new_x_steps)
        self.assertEqual(exptected_y, new_y_steps)
