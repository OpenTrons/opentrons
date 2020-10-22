from typing import List, Tuple
from unittest.mock import call, MagicMock

import pytest
from opentrons.hardware_control import pipette
from opentrons.types import Mount, Point
from opentrons.calibration_storage import types as cal_types
from opentrons.config import robot_configs
from opentrons.config.pipette_config import load

from robot_server.robot.calibration.check.user_flow import\
    CheckCalibrationUserFlow
from robot_server.robot.calibration.check.constants import\
    CalibrationCheckState
from robot_server.robot.calibration.check.models import\
    ComparisonStatus
from robot_server.service.errors import RobotServerError
from robot_server.robot.calibration.constants import (
    POINT_ONE_ID, POINT_TWO_ID, POINT_THREE_ID)


PIP_OFFSET = cal_types.PipetteOffsetByPipetteMount(
        offset=robot_configs.DEFAULT_PIPETTE_OFFSET,
        source=cal_types.SourceType.user,
        status=cal_types.CalibrationStatus())


@pytest.fixture
def mock_hw(hardware):
    pip = pipette.Pipette(load("p300_single_v2.1", 'testiId'),
                          {
                              'single': [0, 0, 0],
                              'multi': [0, 0, 0]
                          },
                          PIP_OFFSET,
                          'testId')
    hardware._attached_instruments = {Mount.RIGHT: pip, Mount.LEFT: pip}
    hardware._current_pos = Point(0, 0, 0)

    async def async_mock(*args, **kwargs):
        pass

    async def async_mock_move_rel(*args, **kwargs):
        delta = kwargs.get('delta', Point(0, 0, 0))
        hardware._current_pos += delta

    async def async_mock_move_to(*args, **kwargs):
        to_pt = kwargs.get('abs_position', Point(0, 0, 0))
        hardware._current_pos = to_pt

    async def gantry_pos_mock(*args, **kwargs):
        return hardware._current_pos

    hardware.move_rel = MagicMock(side_effect=async_mock_move_rel)
    hardware.pick_up_tip = MagicMock(side_effect=async_mock)
    hardware.drop_tip = MagicMock(side_effect=async_mock)
    hardware.gantry_position = MagicMock(side_effect=gantry_pos_mock)
    hardware.move_to = MagicMock(side_effect=async_mock_move_to)
    hardware.get_instrument_max_height.return_value = 180
    return hardware


pipette_combos: List[Tuple[List[str], Mount]] = [
    (['p20_multi_v2.1', 'p20_multi_v2.1'], Mount.RIGHT),
    (['p20_single_v2.1', 'p20_multi_v2.1'], Mount.LEFT),
    (['p20_multi_v2.1', 'p300_single_v2.1'], Mount.RIGHT),
    (['p300_multi_v2.1', 'p1000_single_v2.1'], Mount.RIGHT),
    (['p1000_single_v2.1', ''], Mount.LEFT),
    (['', 'p300_multi_v2.1'], Mount.RIGHT)
]


@pytest.mark.parametrize('pipettes,target_mount', pipette_combos)
def test_user_flow_select_pipette(pipettes, target_mount, hardware):
    pip, pip2 = None, None
    if pipettes[0]:
        pip = pipette.Pipette(load(pipettes[0], 'testId'),
                              {'single': [0, 0, 0], 'multi': [0, 0, 0]},
                              PIP_OFFSET,
                              'testId')
    if pipettes[1]:
        pip2 = pipette.Pipette(load(pipettes[1], 'testId'),
                               {'single': [0, 0, 0], 'multi': [0, 0, 0]},
                               PIP_OFFSET,
                               'testId2')
    hardware._attached_instruments = {Mount.LEFT: pip, Mount.RIGHT: pip2}

    uf = CheckCalibrationUserFlow(hardware=hardware)
    assert uf.hw_pipette == \
        hardware._attached_instruments[target_mount]


@pytest.mark.parametrize('pipettes,target_mount', pipette_combos)
async def test_switching_to_second_pipette(pipettes, target_mount, hardware):
    pip, pip2 = None, None
    if pipettes[0]:
        pip = pipette.Pipette(load(pipettes[0], 'testId'),
                              {'single': [0, 0, 0], 'multi': [0, 0, 0]},
                              PIP_OFFSET,
                              'testId')
    if pipettes[1]:
        pip2 = pipette.Pipette(load(pipettes[1], 'testId'),
                               {'single': [0, 0, 0], 'multi': [0, 0, 0]},
                               PIP_OFFSET,
                               'testId2')
    hardware._attached_instruments = {Mount.LEFT: pip, Mount.RIGHT: pip2}
    uf = CheckCalibrationUserFlow(hardware=hardware)
    if pip and pip2:
        assert uf.mount == target_mount
        await uf.change_active_pipette()
        assert uf.mount != target_mount
    else:
        with pytest.raises(RobotServerError):
            await uf.change_active_pipette()


@pytest.fixture
def mock_user_flow(mock_hw):
    m = CheckCalibrationUserFlow(hardware=mock_hw)
    initial_pt = Point(1, 1, 5)
    final_pt = Point(1, 1, 0)
    m._get_reference_points_by_state =\
        MagicMock(return_value=(initial_pt, final_pt))
    yield m


async def test_move_to_tip_rack(mock_user_flow):
    uf = mock_user_flow
    await uf.move_to_tip_rack()
    cur_pt = await uf.get_current_point(None)
    assert cur_pt == uf.active_tiprack.wells()[0].top().point + Point(0, 0, 10)


async def test_pick_up_tip(mock_user_flow):
    uf = mock_user_flow
    assert uf._tip_origin_pt is None
    await uf.move_to_tip_rack()
    cur_pt = await uf.get_current_point(None)
    await uf.jog(vector=(0, 0, 1))
    await uf.pick_up_tip()
    assert uf._tip_origin_pt == cur_pt + Point(0, 0, 1)


async def test_return_tip(mock_user_flow):
    uf = mock_user_flow
    uf._tip_origin_pt = Point(1, 1, 1)
    uf.hw_pipette._has_tip = True
    z_offset = uf.hw_pipette.config.return_tip_height * \
        uf._get_tip_length()
    await uf.return_tip()
    # should move to return tip
    move_calls = [
        call(
            mount=Mount.RIGHT,
            abs_position=Point(1, 1, 1 - z_offset),
            critical_point=uf.critical_point_override
        ),
    ]
    uf._hardware.move_to.assert_has_calls(move_calls)
    uf._hardware.drop_tip.assert_called()


async def test_jog(mock_user_flow):
    uf = mock_user_flow
    await uf.jog(vector=(0, 0, 0.1))
    assert await uf.get_current_point(None) == Point(0, 0, 0.1)
    await uf.jog(vector=(1, 0, 0))
    assert await uf.get_current_point(None) == Point(1, 0, 0.1)


@pytest.mark.parametrize(
    "state,point_id", [
        (CalibrationCheckState.comparingHeight, POINT_ONE_ID),
        (CalibrationCheckState.comparingPointOne, POINT_TWO_ID),
        (CalibrationCheckState.comparingPointTwo, POINT_THREE_ID)])
async def test_get_move_to_cal_point_location(mock_user_flow,
                                              state, point_id):
    uf = mock_user_flow
    uf._z_height_reference = 30

    pt_list = uf._deck.get_calibration_position(point_id).position
    exp = Point(pt_list[0], pt_list[1], 30)

    uf._current_state = state
    assert uf._get_move_to_point_loc_by_state().point == exp


async def test_compare_z_height(mock_user_flow):
    uf = mock_user_flow
    uf._current_state = CalibrationCheckState.comparingHeight
    await uf._hardware.move_to(
            mount=uf._mount,
            abs_position=Point(x=10, y=10, z=10),
            critical_point=uf.hw_pipette.critical_point
        )
    await uf.update_comparison_map()
    # The initial and final mocked points have a 5 mm
    # difference and so it should exceed the threshold
    expected_status = ComparisonStatus(
        differenceVector=(0.0, 0.0, -5.0),
        thresholdVector=(0.0, 0.0, 0.8),
        exceedsThreshold=True,
        transformType='BAD_DECK_TRANSFORM')
    assert uf.comparison_map.first.comparingHeight == expected_status
    assert uf.comparison_map.second.comparingHeight is None


async def test_compare_points(mock_user_flow):
    uf = mock_user_flow
    uf._current_state = CalibrationCheckState.comparingPointOne

    expected_status = ComparisonStatus(
        differenceVector=(0.0, 0.0, -5.0),
        thresholdVector=(1.8, 1.8, 0.0),
        exceedsThreshold=False,
        transformType='UNKNOWN')
    await uf._hardware.move_to(
            mount=uf._mount,
            abs_position=Point(x=10, y=10, z=10),
            critical_point=uf.hw_pipette.critical_point
        )
    await uf.update_comparison_map()

    assert uf.comparison_map.first.comparingPointOne == expected_status
    assert uf.comparison_map.second.comparingPointOne is None

    uf._current_state = CalibrationCheckState.comparingPointTwo
    await uf._hardware.move_to(
            mount=uf._mount,
            abs_position=Point(x=10, y=10, z=10),
            critical_point=uf.hw_pipette.critical_point
        )
    await uf.update_comparison_map()
    assert uf.comparison_map.first.comparingPointTwo == expected_status
    assert uf.comparison_map.second.comparingPointTwo is None

    uf._current_state = CalibrationCheckState.comparingPointThree
    await uf._hardware.move_to(
        mount=uf._mount,
        abs_position=Point(x=10, y=10, z=10),
        critical_point=uf.hw_pipette.critical_point
    )
    await uf.update_comparison_map()

    assert uf.comparison_map.first.comparingPointThree == expected_status
    assert uf.comparison_map.second.comparingPointThree is None

    await uf.change_active_pipette()

    uf._current_state = CalibrationCheckState.comparingPointOne
    await uf._hardware.move_to(
        mount=uf._mount,
        abs_position=Point(x=10, y=10, z=10),
        critical_point=uf.hw_pipette.critical_point
    )
    await uf.update_comparison_map()

    assert uf.comparison_map.first.comparingPointOne == expected_status
    assert uf.comparison_map.second.comparingPointOne == expected_status
