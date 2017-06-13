import unittest
import json
import os

from opentrons.robot import Robot


class UploadTestCase(unittest.TestCase):
    def setUp(self):
        Robot.get_instance().reset_for_tests()
        from main import app
        self.app = app.test_client()

        self.data_path = os.path.join(
            os.path.dirname(__file__) + '/data/'
        )
        self.robot = Robot.get_instance()

    def test_upload_and_run(self):
        response = self.app.post('/upload', data={
            'file': (open(self.data_path + 'protocol.py', 'rb'), 'protocol.py')
        })

        self.robot.connect(None, options={'limit_switches': False})

        status = json.loads(response.data.decode())['status']
        self.assertEqual(status, 'success')

        response = self.app.get('/run')

        response = json.loads(response.data.decode())
        self.assertEqual(response['status'], 'success')

    def test_upload_valid_python(self):
        response = self.app.post('/upload', data={
            'file': (open(self.data_path + 'protocol.py', 'rb'), 'protocol.py')
        })

        status = json.loads(response.data.decode())['status']
        self.assertEqual(status, 'success')

    def test_get_instrument_placeables(self):
        self.robot.connect(None, options={'limit_switches': False})
        response = self.app.post('/upload', data={
            'file': (open(self.data_path + 'protocol.py', 'rb'), 'protocol.py')
        })
        response = json.loads(response.data.decode())
        self.assertEquals(response['status'], 'success')

        robot = Robot.get_instance()

        robot._instruments['A'].positions = {
            'top': 0,
            'bottom': 1,
            'blow_out': 2,
            'drop_tip': None
        }
        robot._instruments['B'].positions = {
            'top': None,
            'bottom': None,
            'blow_out': None,
            'drop_tip': None
        }

        for instrument in robot._instruments.values():
            instrument.calibration_data = {}
            instrument.update_calibrations()

        location = robot._deck['A1'].get_child_by_name(
            'test-tiprack')
        rel_vector = location[0].from_center(
            x=0, y=0, z=-1, reference=location)
        location = (location, rel_vector)

        pipette = robot._instruments['A']
        pipette.calibrate_position(location)

        response = self.app.get('/instruments/placeables')
        response = json.loads(response.data.decode())

        expected_data = {
            'data': {
                'deck': [
                    {
                        'instruments': [
                            {
                                'axis': 'a',
                                'calibrated': True,
                                'label': 'p10'
                            },
                            {
                                'axis': 'b',
                                'calibrated': False,
                                'label': 'p1000'
                            }
                        ],
                        'label': 'test-tiprack',
                        'slot': 'A1',
                        'type': 'tiprack-200ul'
                    },
                    {
                        'instruments': [
                            {
                                'axis': 'a',
                                'calibrated': False,
                                'label': 'p10'
                            },
                            {
                                'axis': 'b',
                                'calibrated': False,
                                'label': 'p1000'
                            }
                        ],
                        'label': 'test-trash',
                        'slot': 'A2',
                        'type': 'point'
                    },
                    {
                        'instruments': [
                            {
                                'axis': 'a',
                                'calibrated': False,
                                'label': 'p10'
                            },
                            {
                                'axis': 'b',
                                'calibrated': False,
                                'label': 'p1000'
                            }
                        ],
                        'label': 'test-trough',
                        'slot': 'B1',
                        'type': 'trough-12row'
                    },
                    {
                        'instruments': [
                            {
                                'axis': 'a',
                                'calibrated': False,
                                'label': 'p10'
                            },
                            {
                                'axis': 'b',
                                'calibrated': False,
                                'label': 'p1000'
                            }
                        ],
                        'label': 'test-plate',
                        'slot': 'B2',
                        'type': '96-flat'
                    }
                ],
                'instruments': [
                    {
                        'axis': 'a',
                        'blow_out': 2,
                        'bottom': 1,
                        'calibrated': False,
                        'channels': 8,
                        'drop_tip': None,
                        'label': 'p10',
                        'max_volume': 10,
                        'top': 0
                    },
                    {
                        'axis': 'b',
                        'blow_out': None,
                        'bottom': None,
                        'calibrated': False,
                        'channels': 1,
                        'drop_tip': None,
                        'label': 'p1000',
                        'max_volume': 10,
                        'top': None
                    }
                ]
            },
            'status': 'success'
        }

        self.assertDictEqual(response, expected_data)

    def test_upload_invalid_python(self):
        pass

    def test_upload_valid_json(self):
        response = self.app.post('/upload', data={
            'file': (
                open(self.data_path + 'good_json_protocol.json', 'rb'),
                'good_json_protocol.json'
            )
        })
        status = json.loads(response.data.decode())['status']
        self.assertEqual(status, 'success')

    def test_upload_invalid_json(self):
        response = self.app.post('/upload', data={
            'file': (
                open(self.data_path + 'invalid_json_protocol.json', 'rb'),
                'good_json_protocol.json'
            )
        })
        status = json.loads(response.data.decode())['status']
        self.assertEqual(status, 'error')
