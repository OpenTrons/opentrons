from threading import Thread

from tests.opentrons.conftest import fuzzy_assert


def position(x, y, z, a, b, c):
    return {axis: value for axis, value in zip('XYZABC', [x, y, z, a, b, c])}


def test_plunger_commands(smoothie, monkeypatch):
    from opentrons.drivers.smoothie_drivers import serial_communication
    from opentrons.drivers.smoothie_drivers import driver_3_0
    command_log = []
    smoothie.simulating = False

    def write_with_log(command, connection, timeout):
        command_log.append(command)
        return serial_communication.DRIVER_ACK.decode()

    def _parse_axis_values(arg):
        return smoothie.position

    monkeypatch.setattr(serial_communication, 'write_and_return',
                        write_with_log)
    monkeypatch.setattr(driver_3_0, '_parse_axis_values', _parse_axis_values)

    smoothie.home()
    smoothie.move({'X': 0, 'Y': 1.123456, 'Z': 2, 'A': 3})
    smoothie.move({
        'X': 10.987654321,
        'Y': 1.12345678,
        'Z': 2,
        'A': 3,
        'B': 4,
        'C': 5})
    expected = [
        ['M907 B0.5 C0.5 M400'],              # Set plunger current high
        ['G4P0.05 M400'],                      # Dwell
        ['G28.2[ABCZ]+ G28.2X G28.2Y M400'],  # Home
        ['M907 B0.1 C0.1 M400'],              # Set plunger current low
        ['G4P0.05 M400'],                      # Dwell
        ['M114.2 M400'],                      # Get position
        ['G0.+ M400'],                        # Move (non-plunger)
        ['M907 B0.5 C0.5 M400'],              # Set plunger current high
        ['G4P0.05 M400'],                      # Dwell
        ['G0.+[BC].+ M400'],                  # Move (including BC)
        ['M907 B0.1 C0.1 M400'],              # Set plunger current low
        ['G4P0.05 M400']                       # Dwell
    ]
    # from pprint import pprint
    # pprint(command_log)
    fuzzy_assert(result=command_log, expected=expected)


def test_functional(smoothie):
    from opentrons.drivers.smoothie_drivers.driver_3_0 import HOMED_POSITION

    assert smoothie.position == position(0, 0, 0, 0, 0, 0)

    smoothie.move({'X': 0, 'Y': 1, 'Z': 2, 'A': 3, 'B': 4, 'C': 5})
    assert smoothie.position == position(0, 1, 2, 3, 4, 5)

    smoothie.move({'X': 1, 'Z': 3, 'C': 6})
    assert smoothie.position == position(1, 1, 3, 3, 4, 6)

    smoothie.home(axis='abc', disabled='')
    assert smoothie.position == position(
        1, 1, 3,
        HOMED_POSITION['A'],
        HOMED_POSITION['B'],
        HOMED_POSITION['C'])

    smoothie.home(disabled='')
    assert smoothie.position == HOMED_POSITION


current = []


def test_low_current_z(model):
    from opentrons.robot.robot_configs import DEFAULT_CURRENT
    import types
    driver = model.robot._driver

    set_current = driver.set_current

    def set_current_mock(self, target):
        global current
        current.append(target)

        set_current(target)

    driver.set_current = types.MethodType(set_current_mock, driver)

    driver.move({'A': 100}, low_current_z=False)
    # Instrument in `model` is configured to right mount, which is the A axis
    # on the Smoothie (see `Robot._actuators`)
    assert current == []

    driver.move({'A': 10}, low_current_z=True)
    assert current == [{'A': 0.1}, DEFAULT_CURRENT]


def test_fast_home(model):
    from opentrons.drivers.smoothie_drivers.driver_3_0 import HOMED_POSITION
    import types
    driver = model.robot._driver

    move = driver.move
    coords = []

    def move_mock(self, target):
        nonlocal coords
        coords.append(target)
        move(target)

    driver.move = types.MethodType(move_mock, driver)

    assert coords == []
    driver.fast_home(axis='X', safety_margin=12)
    assert coords == [{'X': HOMED_POSITION['X'] - 12}]
    assert driver.position['X'] == HOMED_POSITION['X']


def test_pause_resume(model):
    """
    This test has to use an ugly work-around with the `simulating` member of
    the driver. When issuing movement commands in test, `simulating` should be
    True, but when testing whether `pause` actually pauses and `resume`
    resumes, `simulating` must be False.
    """
    from numpy import isclose
    from opentrons.trackers import pose_tracker
    from time import sleep

    pipette = model.instrument._instrument
    robot = model.robot

    robot.home()
    homed_coords = pose_tracker.absolute(robot.poses, pipette)

    robot._driver.simulating = False
    robot.pause()
    robot._driver.simulating = True

    def _move_head():
        robot.poses = pipette._move(robot.poses, x=100, y=0, z=0)

    thread = Thread(target=_move_head)
    thread.start()
    sleep(0.5)

    # Check against home coordinates before calling resume to ensure that robot
    # doesn't move while paused
    coords = pose_tracker.absolute(robot.poses, pipette)
    assert isclose(coords, homed_coords).all()

    robot._driver.simulating = False
    robot.resume()
    robot._driver.simulating = True
    thread.join()

    coords = pose_tracker.absolute(robot.poses, pipette)
    expected_coords = (100, 0, 0)
    assert isclose(coords, expected_coords).all()


def test_speed_change(model, monkeypatch):

    pipette = model.instrument._instrument
    robot = model.robot
    robot._driver.simulating = False

    from opentrons.drivers.smoothie_drivers import serial_communication
    command_log = []

    def write_with_log(command, connection, timeout):
        if 'G0F' in command:
            command_log.append(command)
        return serial_communication.DRIVER_ACK.decode()

    monkeypatch.setattr(serial_communication, 'write_and_return',
                        write_with_log)

    pipette.tip_attached = True
    pipette.aspirate().dispense()
    expected = [
        ['G0F1200 M400'],  # pipette's default aspirate speed in mm/min
        ['G0F9000 M400'],
        ['G0F2400 M400'],  # pipette's default dispense speed in mm/min
        ['G0F9000 M400']
    ]
    fuzzy_assert(result=command_log, expected=expected)


def test_max_speed_change(model, monkeypatch):

    robot = model.robot
    robot._driver.simulating = False

    from opentrons.drivers.smoothie_drivers import serial_communication
    command_log = []

    def write_with_log(command, connection, timeout):
        if 'M203.1' in command or 'G0F' in command:
            command_log.append(command)
        return serial_communication.DRIVER_ACK.decode()

    monkeypatch.setattr(serial_communication, 'write_and_return',
                        write_with_log)

    robot.head_speed(555)
    robot.head_speed(x=1, y=2, z=3, a=4, b=5, c=6)
    robot.head_speed(123, x=7)
    robot._driver.set_speed(321)
    robot._driver.default_speed()
    expected = [
        ['G0F{} M400'.format(555 * 60)],
        ['M203.1 A4 B5 C6 X1 Y2 Z3 M400'],
        ['M203.1 X7 M400'],
        ['G0F{} M400'.format(123 * 60)],
        ['G0F{} M400'.format(321 * 60)],
        ['G0F{} M400'.format(123 * 60)]
    ]
    from pprint import pprint
    pprint(command_log)
    fuzzy_assert(result=command_log, expected=expected)


def test_pause_in_protocol(model):
    model.robot._driver.simulating = True

    model.robot.pause()

    assert model.robot._driver.run_flag.is_set()
