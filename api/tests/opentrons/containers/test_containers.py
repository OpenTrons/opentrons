import math
import unittest

from opentrons.legacy_api.containers import (
    load as containers_load,
    list as containers_list,
    load_new_labware as new_load
)
from opentrons.legacy_api.robot import Robot
from opentrons.legacy_api.containers.placeable import (
    Container,
    Well,
    Deck,
    Slot,
    unpack_location)
from tests.opentrons import generate_plate
# TODO: Modify all calls to get a Well to use the `wells` method
# TODO: remove `unpack_location` calls
# TODO: revise `share` logic
# TODO: remove `generate_plate` and use JS generated data
# TODO: Modify calls that expect Deck and Slot to be Placeables


class ContainerTestCase(unittest.TestCase):
    def setUp(self):
        self.robot = Robot()

    def tearDown(self):
        del self.robot

    def test_load_same_slot_force(self):
        container_name = '96-flat'
        slot = '1'
        containers_load(self.robot, container_name, slot)
        # 2018-1-30 Incremented number of containers based on fixed trash
        self.assertEqual(len(self.robot.get_containers()), 2)

        self.assertRaises(
            RuntimeWarning, containers_load,
            self.robot, container_name, slot)
        self.assertRaises(
            RuntimeWarning, containers_load,
            self.robot, container_name, slot, share=True)
        self.assertRaises(
            RuntimeWarning, containers_load,
            self.robot, container_name, slot, 'custom-name')
        self.assertRaises(
            RuntimeWarning, containers_load,
            self.robot, 'trough-12row', slot)
        self.assertRaises(
            RuntimeWarning, containers_load,
            self.robot, 'trough-12row', slot, 'custom-name')

        containers_load(
            self.robot, container_name, slot, 'custom-name', share=True)
        self.assertEqual(len(self.robot.get_containers()), 3)

        containers_load(
            self.robot, 'trough-12row', slot, share=True)
        self.assertEqual(len(self.robot.get_containers()), 4)

    def test_load_legacy_slot_names(self):
        slots_old = [
            'A1', 'B1', 'C1',
            'A2', 'B2', 'C2',
            'A3', 'B3', 'C3',
            'A4', 'B4', 'C4'
        ]
        slots_new = [
            '1', '2', '3',
            '4', '5', '6',
            '7', '8', '9',
            '10', '11', '12'
        ]
        import warnings
        warnings.filterwarnings('ignore')

        # Only check up to the non fixed-trash slots
        def test_slot_name(slot_name, expected_name):
            self.robot.reset()
            p = containers_load(self.robot, '96-flat', slot_name)
            slot_name = p.get_parent().get_name()
            assert slot_name == expected_name

        for i in range(len(slots_old) - 1):
            test_slot_name(slots_new[i], slots_new[i])
            test_slot_name(int(slots_new[i]), slots_new[i])
            test_slot_name(slots_old[i], slots_new[i])

        warnings.filterwarnings('default')

    def test_new_slot_names(self):
        trough = 'usa_scientific_12_trough_22_ml'
        plate = 'generic_96_wellplate_380_ul'
        tuberack = 'opentrons_6_tuberack_falcon_50_ml'

        cont = new_load(trough)
        self.assertTrue(isinstance(cont, Container))
        cont = new_load(plate)
        self.assertTrue(isinstance(cont, Container))
        cont = new_load(tuberack)
        self.assertTrue(isinstance(cont, Container))

    def test_load_new_trough(self):
        trough = 'usa_scientific_12_trough_22_ml'
        cont = new_load(trough)
        self.assertEqual(cont.size(), (0, 0, 0))
        self.assertEqual(
            cont.wells('A1')._coordinates, (13.94 - 4.165, 42.9 + 35.94, 2.29))

    def test_containers_list(self):
        res = containers_list()
        self.assertTrue(len(res))

    def test_bad_unpack_containers(self):
        self.assertRaises(
            ValueError, unpack_location, 1)

    def test_iterate_without_parent(self):
        c = generate_plate(4, 2, (5, 5), (0, 0), 5)
        self.assertRaises(
            Exception, next, c)

    def test_back_container_getitem(self):
        c = generate_plate(4, 2, (5, 5), (0, 0), 5)
        self.assertRaises(TypeError, c.__getitem__, (1, 1))

    def test_iterator(self):
        c = generate_plate(4, 2, (5, 5), (0, 0), 5)
        res = [well.coordinates() for well in c]
        expected = [(0, 0, 0), (5, 0, 0), (0, 5, 0), (5, 5, 0)]

        self.assertListEqual(res, expected)

    def test_next(self):
        c = generate_plate(4, 2, (5, 5), (0, 0), 5)
        well = c['A1']
        expected = c.get_child_by_name('B1')

        self.assertEqual(next(well), expected)

    def test_int_index(self):
        c = generate_plate(4, 2, (5, 5), (0, 0), 5)

        self.assertEqual(c[3], c.get_child_by_name('B2'))
        self.assertEqual(c[1], c.get_child_by_name('B1'))

    def test_named_well(self):
        deck = Deck()
        slot = Slot()
        c = Container()
        deck.add(slot, 'A1', (0, 0, 0))
        red = Well(properties={'radius': 5})
        blue = Well(properties={'radius': 5})
        c.add(red, "Red", (0, 0, 0))
        c.add(blue, "Blue", (10, 0, 0))
        slot.add(c)

        self.assertEqual(deck['A1'][0]['Red'], red)

    def test_generate_plate(self):
        c = generate_plate(
            wells=96,
            cols=8,
            spacing=(10, 15),
            offset=(5, 15),
            radius=5
        )

        self.assertEqual(c['A1'].coordinates(), (5, 15, 0))
        self.assertEqual(c['B2'].coordinates(), (15, 30, 0))

    def test_coordinates(self):
        deck = Deck()
        slot = Slot()
        plate = generate_plate(
            wells=96,
            cols=8,
            spacing=(10, 15),
            offset=(5, 15),
            radius=5
        )
        deck.add(slot, 'B2', (100, 200, 0))
        slot.add(plate)

        self.assertEqual(plate['A1'].coordinates(deck), (105, 215, 0))

    def test_get_name(self):
        deck = Deck()
        slot = Slot()
        c = Container()
        deck.add(slot, 'A1', (0, 0, 0))
        red = Well(properties={'radius': 5})
        blue = Well(properties={'radius': 5})
        c.add(red, "Red", (0, 0, 0))
        c.add(blue, "Blue", (10, 0, 0))
        slot.add(c)

        self.assertEqual(red.get_name(), 'Red')

    def test_well_from_center(self):
        deck = Deck()
        slot = Slot()
        plate = generate_plate(
            wells=4,
            cols=2,
            spacing=(10, 10),
            offset=(0, 0),
            radius=5
        )
        deck.add(slot, 'A1', (0, 0, 0))
        slot.add(plate)

        self.assertEqual(
            plate['B2'].center(),
            (5, 5, 0))
        self.assertEqual(
            plate['B2'].from_center(x=0.0, y=0.0, z=0.0),
            (5, 5, 0))
        self.assertEqual(
            plate['B2'].from_center(r=1.0, theta=math.pi / 2, h=0.0),
            (5.0, 10.0, 0.0))
