# pylama:ignore=E501
# TODO: Modify all calls to get a Well to use the `wells` method
from numpy import isclose
import pytest

from opentrons import instruments, robot
from opentrons.legacy_api.containers import load as containers_load
from opentrons.config import pipette_config
from opentrons.trackers import pose_tracker


def test_pipette_version_1_0_and_1_3_extended_travel():
    models = [
        'p10_single', 'p10_multi', 'p50_single', 'p50_multi',
        'p300_single', 'p300_multi', 'p1000_single'
    ]

    for m in models:
        robot.reset()
        v1 = m + '_v1'
        v13 = m + '_v1.3'
        left = instruments._create_pipette_from_config(
            config=pipette_config.load(v1),
            mount='left',
            name=v1)
        right = instruments._create_pipette_from_config(
            config=pipette_config.load(v13),
            mount='right',
            name=v13)

        # the difference between v1 and v1.3 is that the plunger's travel
        # distance extended, allowing greater ranges for aspirate/dispense
        # and blow-out. Test that all v1.3 pipette have larger travel thant v1
        left_poses = left.plunger_positions
        left_diff = left_poses['top'] - left_poses['blow_out']
        right_poses = right.plunger_positions
        right_diff = right_poses['top'] - right_poses['blow_out']
        assert right_diff > left_diff


def test_all_pipette_models_can_transfer():
    from opentrons.config import pipette_config

    models = [
        'p10_single', 'p10_multi', 'p50_single', 'p50_multi',
        'p300_single', 'p300_multi', 'p1000_single'
    ]

    for m in models:
        robot.reset()
        v1 = m + '_v1'
        v13 = m + '_v1.3'
        left = instruments._create_pipette_from_config(
            config=pipette_config.load(v1),
            mount='left',
            name=v1)
        right = instruments._create_pipette_from_config(
            config=pipette_config.load(v13),
            mount='right',
            name=v13)

        left.tip_attached = True
        right.tip_attached = True
        left.aspirate().dispense()
        right.aspirate().dispense()


def test_pipette_models_reach_max_volume():

    for model in pipette_config.configs:
        config = pipette_config.load(model)
        robot.reset()
        pipette = instruments._create_pipette_from_config(
            config=config,
            mount='right',
            name=model)

        pipette.tip_attached = True
        pipette.aspirate(pipette.max_volume)
        pos = pose_tracker.absolute(
            robot.poses,
            pipette.instrument_actuator)
        assert pos[0] < pipette.plunger_positions['top']


def test_flow_rate():
    # Test new flow-rate functionality on all pipettes with different max vols
    robot.reset()
    p10 = instruments.P10_Single(mount='right')

    p10.set_flow_rate(aspirate=10)
    ul_per_mm = p10._ul_per_mm(p10.max_volume, 'aspirate')
    expected_mm_per_sec = round(10 / ul_per_mm, 6)
    assert p10.speeds['aspirate'] == expected_mm_per_sec

    p10.set_flow_rate(dispense=20)
    ul_per_mm = p10._ul_per_mm(p10.max_volume, 'dispense')
    expected_mm_per_sec = round(20 / ul_per_mm, 6)
    assert p10.speeds['dispense'] == expected_mm_per_sec

    robot.reset()
    p50 = instruments.P50_Single(mount='right')

    p50.set_flow_rate(aspirate=50)
    ul_per_mm = p50._ul_per_mm(p50.max_volume, 'aspirate')
    expected_mm_per_sec = round(50 / ul_per_mm, 6)
    assert p50.speeds['aspirate'] == expected_mm_per_sec

    p50.set_flow_rate(dispense=60)
    ul_per_mm = p50._ul_per_mm(p50.max_volume, 'dispense')
    expected_mm_per_sec = round(60 / ul_per_mm, 6)
    assert p50.speeds['dispense'] == expected_mm_per_sec

    robot.reset()
    p300 = instruments.P300_Single(mount='right')

    p300.set_flow_rate(aspirate=300)
    ul_per_mm = p300._ul_per_mm(p300.max_volume, 'aspirate')
    expected_mm_per_sec = round(300 / ul_per_mm, 6)
    assert p300.speeds['aspirate'] == expected_mm_per_sec

    p300.set_flow_rate(dispense=310)
    ul_per_mm = p300._ul_per_mm(p300.max_volume, 'dispense')
    expected_mm_per_sec = round(310 / ul_per_mm, 6)
    assert p300.speeds['dispense'] == expected_mm_per_sec

    robot.reset()
    p1000 = instruments.P1000_Single(mount='right')

    p1000.set_flow_rate(aspirate=1000)
    ul_per_mm = p1000._ul_per_mm(p1000.max_volume, 'aspirate')
    expected_mm_per_sec = round(1000 / ul_per_mm, 6)
    assert p1000.speeds['aspirate'] == expected_mm_per_sec

    p1000.set_flow_rate(dispense=1100)
    ul_per_mm = p1000._ul_per_mm(p1000.max_volume, 'dispense')
    expected_mm_per_sec = round(1100 / ul_per_mm, 6)
    assert p1000.speeds['dispense'] == expected_mm_per_sec


def test_pipette_max_deck_height():
    robot.reset()
    tallest_point = robot._driver.homed_position['Z']
    p = instruments.P300_Single(mount='left')
    assert p._max_deck_height() == tallest_point

    # TODO: revise when tip length is on tipracks
    for tip_length in [10, 25, 55, 100]:
        p._add_tip(length=tip_length)
        assert p._max_deck_height() == tallest_point - tip_length
        p._remove_tip(length=tip_length)


def test_retract():
    robot.reset()
    plate = containers_load(robot, '96-flat', '1')
    p300 = instruments.P300_Single(mount='left')
    from opentrons.drivers.smoothie_drivers.driver_3_0 import HOMED_POSITION

    p300.move_to(plate[0].top())

    assert p300.previous_placeable == plate[0]
    current_pos = pose_tracker.absolute(
        robot.poses,
        p300)
    assert current_pos[2] == plate[0].top()[1][2]

    p300.retract()

    assert p300.previous_placeable is None
    current_pos = pose_tracker.absolute(
        robot.poses,
        p300.instrument_mover)
    assert current_pos[2] == HOMED_POSITION['A']


def test_aspirate_move_to(old_aspiration):
    # TODO: it seems like this test is checking that the aspirate point is
    # TODO: *fully* at the bottom of the well, which isn't the expected
    # TODO: behavior of aspirate when a location is not specified. This should
    # TODO: be split into two tests--one for this behavior (specifying a place)
    # TODO: and another one for the default
    robot.reset()
    tip_rack = containers_load(robot, 'tiprack-200ul', '3')
    p300 = instruments.P300_Single(
        mount='left', tip_racks=[tip_rack])
    p300.pick_up_tip()

    x, y, z = (161.0, 116.7, 0.0)
    plate = containers_load(robot, '96-flat', '1')
    well = plate[0]
    pos = well.from_center(x=0, y=0, z=-1, reference=plate)
    location = (plate, pos)

    robot.poses = p300._move(robot.poses, x=x, y=y, z=z)
    robot.calibrate_container_with_instrument(plate, p300, False)

    p300.aspirate(100, location)
    current_pos = pose_tracker.absolute(
        robot.poses,
        p300.instrument_actuator)

    assert (current_pos == (6.889964, 0.0, 0.0)).all()

    current_pos = pose_tracker.absolute(robot.poses, p300)
    assert isclose(current_pos, (161,  116.7,   10.5)).all()


def test_dispense_move_to(old_aspiration):
    # TODO: same as for aspirate
    robot.reset()
    tip_rack = containers_load(robot, 'tiprack-200ul', '3')
    p300 = instruments.P300_Single(
                   mount='left',
                   tip_racks=[tip_rack])

    x, y, z = (161.0, 116.7, 0.0)
    plate = containers_load(robot, '96-flat', '1')
    well = plate[0]
    pos = well.from_center(x=0, y=0, z=-1, reference=plate)
    location = (plate, pos)

    robot.poses = p300._move(robot.poses, x=x, y=y, z=z)
    robot.calibrate_container_with_instrument(plate, p300, False)

    p300.pick_up_tip()
    p300.aspirate(100, location)
    p300.dispense(100, location)
    current_pos = pose_tracker.absolute(
        robot.poses,
        p300.instrument_actuator)
    assert (current_pos == (1.5, 0.0, 0.0)).all()

    current_pos = pose_tracker.absolute(robot.poses, p300)
    assert isclose(current_pos, (161,  116.7,   10.5)).all()


def test_trough_move_to():
    # TODO: new labware system should center multichannel pipettes within wells
    # TODO: (correct single-channel position currently corresponds to back-
    # TODO: most tip of multi-channel), so calculate against that
    robot.reset()
    tip_rack = containers_load(robot, 'tiprack-200ul', '3')
    p300 = instruments.P300_Single(
                   mount='left',
                   tip_racks=[tip_rack])

    trough = containers_load(robot, 'trough-12row', '1')
    p300.pick_up_tip()
    p300.move_to(trough)
    current_pos = pose_tracker.absolute(robot.poses, p300)
    assert isclose(current_pos, (0, 0, 40)).all()


def test_delay_calls(monkeypatch):
    from opentrons import robot
    from opentrons.legacy_api.instruments import pipette
    robot.reset()
    p300 = instruments.P300_Single(mount='right')

    cmd = []

    def mock_pause():
        nonlocal cmd
        cmd.append('pause')

    def mock_resume():
        nonlocal cmd
        cmd.append('resume')

    def mock_sleep(seconds):
        cmd.append("sleep {}".format(seconds))

    def mock_is_simulating():
        return False

    monkeypatch.setattr(robot, 'is_simulating', mock_is_simulating)
    monkeypatch.setattr(robot, 'pause', mock_pause)
    monkeypatch.setattr(robot, 'resume', mock_resume)
    monkeypatch.setattr(pipette, '_sleep', mock_sleep)

    p300.delay(seconds=4, minutes=1)

    assert 'pause' in cmd
    assert 'sleep 64.0' in cmd
    assert 'resume' in cmd


@pytest.mark.xfail
def test_drop_tip_in_trash(virtual_smoothie_env, monkeypatch):
    from opentrons import robot, labware
    from opentrons.legacy_api.instruments.pipette import Pipette
    robot.reset()
    robot.home()
    tiprack = labware.load('tiprack-200ul', '1')
    p300 = instruments.P300_Multi(mount='left', tip_racks=[tiprack])
    p300.pick_up_tip()

    movelog = []
    move_fn = Pipette.move_to

    def log_move(self, location, strategy=None):
        movelog.append(location)
        move_fn(self, location, strategy)

    monkeypatch.setattr(Pipette, "move_to", log_move)

    p300.drop_tip()

    base_obj = movelog[0][0]
    y_offset = movelog[0][1][1]
    assert base_obj == robot.fixed_trash[0]
    assert y_offset == 111.5
