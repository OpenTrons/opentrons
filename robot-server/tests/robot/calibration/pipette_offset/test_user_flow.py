import datetime

import pytest
from unittest.mock import MagicMock, call, patch
from typing import List, Tuple, Dict, Any
from opentrons.calibration_storage import helpers, types as CSTypes
from opentrons.types import Mount, Point
from opentrons.hardware_control import pipette
from opentrons.config.pipette_config import load

from opentrons_shared_data.labware import load_definition

from robot_server.service.errors import RobotServerError
from robot_server.service.session.models.command import CalibrationCommand
from robot_server.robot.calibration.pipette_offset.user_flow import \
    PipetteOffsetCalibrationUserFlow
from robot_server.robot.calibration.pipette_offset.constants import\
    PipetteOffsetCalibrationState as POCState


stub_jog_data = {'vector': Point(1, 1, 1)}

pipette_map = {
    "p10_single_v1.5": "opentrons_96_tiprack_10ul",
    "p50_single_v1.5": "opentrons_96_tiprack_300ul",
    "p300_single_v1.5": "opentrons_96_tiprack_300ul",
    "p1000_single_v1.5": "opentrons_96_tiprack_1000ul",
    "p10_multi_v1.5": "opentrons_96_tiprack_10ul",
    "p50_multi_v1.5": "opentrons_96_tiprack_300ul",
    "p300_multi_v1.5": "opentrons_96_tiprack_300ul",
    "p20_single_v2.1": "opentrons_96_tiprack_20ul",
    "p300_single_v2.1": "opentrons_96_tiprack_300ul",
    "p1000_single_v2.1": "opentrons_96_tiprack_1000ul",
    "p20_multi_v2.1": "opentrons_96_tiprack_20ul",
    "p300_multi_v2.1": "opentrons_96_tiprack_300ul",
}


def build_mock_stored_pipette_offset(kind='normal'):
    if kind == 'normal':
        return MagicMock(
            return_value=CSTypes.PipetteOffsetByPipetteMount(
                offset=[0, 1, 2],
                tiprack='tiprack-id',
                uri='opentrons/opentrons_96_filtertiprack_200ul/1',
                last_modified=datetime.datetime.now(),
                source=CSTypes.SourceType.user,
                status=CSTypes.CalibrationStatus(markedBad=False)))
    elif kind == 'empty':
        return MagicMock(return_value=None)
    else:
        assert False,\
            'specify normal or empty to build_mock_stored_pipette_offset'


def build_mock_stored_tip_length(kind='normal'):
    if kind == 'normal':
        return MagicMock(return_value=30)
    elif kind == 'empty':
        return MagicMock(return_value=None)
    else:
        assert False,\
            'specify normal or empty to build_mock_stored_tip_length'


LW_DEFINITION = load_definition('opentrons_96_filtertiprack_200ul', 1)
LW_DEFINITION['version'] = 2


@pytest.fixture(params=pipette_map.keys())
def mock_hw_pipette_all_combos(request):
    model = request.param
    return pipette.Pipette(load(model, 'testId'),
                           {
                               'single': [0, 0, 0],
                               'multi': [0, 0, 0]
                           },
                           'testId')


@pytest.fixture(params=[Mount.RIGHT, Mount.LEFT])
def mock_hw_all_combos(hardware, mock_hw_pipette_all_combos, request):
    mount = request.param
    hardware._attached_instruments = {mount: mock_hw_pipette_all_combos}
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

    hardware.move_rel = MagicMock(side_effect=async_mock)
    hardware.pick_up_tip = MagicMock(side_effect=async_mock)
    hardware.drop_tip = MagicMock(side_effect=async_mock)
    hardware.gantry_position = MagicMock(side_effect=gantry_pos_mock)
    hardware.move_to = MagicMock(side_effect=async_mock_move_to)
    hardware.get_instrument_max_height.return_value = 180
    return hardware


@pytest.fixture
def mock_hw(hardware):
    pip = pipette.Pipette(load("p300_single_v2.1", 'testId'),
                          {
                              'single': [0, 0, 0],
                              'multi': [0, 0, 0]
                          },
                          'testId')
    hardware._attached_instruments = {Mount.RIGHT: pip}
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


@pytest.fixture
def mock_user_flow(mock_hw):
    mount = next(k for k, v in
                 mock_hw._attached_instruments.items() if v)
    with patch.object(
            PipetteOffsetCalibrationUserFlow,
            '_get_stored_tip_length_cal',
            new=build_mock_stored_tip_length()),\
            patch.object(
                PipetteOffsetCalibrationUserFlow,
                '_get_stored_pipette_offset_cal',
                new=build_mock_stored_pipette_offset()):
        m = PipetteOffsetCalibrationUserFlow(hardware=mock_hw, mount=mount)
        yield m


hw_commands: List[Tuple[str, str, Dict[Any, Any], str]] = [
    (CalibrationCommand.jog, POCState.preparingPipette,
     stub_jog_data, 'move_rel'),
    (CalibrationCommand.pick_up_tip, POCState.preparingPipette,
     {}, 'pick_up_tip'),
    (CalibrationCommand.move_to_deck, POCState.inspectingTip,
     {}, 'move_to'),
    (CalibrationCommand.move_to_point_one, POCState.joggingToDeck,
     {}, 'move_to'),
    (CalibrationCommand.move_to_tip_rack, POCState.labwareLoaded,
     {}, 'move_to'),
]


@pytest.mark.parametrize(
    'existing_poc,existing_tlc,recalibrate,trd,whichdef,dotip', [
        # If we otherwise have everything we need, follow the argument
        (build_mock_stored_pipette_offset(),
         build_mock_stored_tip_length(),
         True, None, 'stored', True),
        (build_mock_stored_pipette_offset(),
         build_mock_stored_tip_length(),
         False, None, 'stored', False),
        (build_mock_stored_pipette_offset('empty'),
         build_mock_stored_tip_length(),
         False, LW_DEFINITION, 'specified', False),
        (build_mock_stored_pipette_offset('empty'),
         build_mock_stored_tip_length(),
         True, LW_DEFINITION, 'specified', True),
        (build_mock_stored_pipette_offset('empty'),
         build_mock_stored_tip_length(),
         True, None, 'default', True),
        (build_mock_stored_pipette_offset('empty'),
         build_mock_stored_tip_length(),
         True, None, 'default', True),
        # In all cases where we cannot resolve a TLC for this
        # labware, recalibrate tip length
        (build_mock_stored_pipette_offset('empty'),
         build_mock_stored_tip_length('empty'),
         False, LW_DEFINITION, 'specified', True),
        (build_mock_stored_pipette_offset('empty'),
         build_mock_stored_tip_length('empty'),
         False, None, 'default', True),
    ]
)
def test_recalibrate_options(mock_hw,
                             existing_poc, existing_tlc, recalibrate,
                             trd, whichdef, dotip):
    with patch.object(
            PipetteOffsetCalibrationUserFlow,
            '_get_stored_tip_length_cal',
            new=existing_tlc),\
            patch.object(
                PipetteOffsetCalibrationUserFlow,
                '_get_stored_pipette_offset_cal',
                new=existing_poc):
        m = PipetteOffsetCalibrationUserFlow(
            hardware=mock_hw, mount=Mount.RIGHT,
            recalibrate_tip_length=recalibrate,
            tip_rack_def=trd,
            has_calibration_block=False)
        assert m.should_perform_tip_length == dotip
        if whichdef == 'stored':
            required = m.get_required_labware()[0]
            assert required.loadName == 'opentrons_96_filtertiprack_200ul'
            assert required.version == '1'
        elif whichdef == 'default':
            assert m.get_required_labware()[0].loadName\
                == 'opentrons_96_tiprack_300ul'
        elif whichdef == 'specified':
            required = m.get_required_labware()[0]
            assert required.loadName == 'opentrons_96_filtertiprack_200ul'
            assert required.version == '2'
        else:
            assert False, 'you messed up the param spec'


async def test_move_to_tip_rack(mock_user_flow):
    uf = mock_user_flow
    await uf.move_to_tip_rack()
    cur_pt = await uf._get_current_point(None)
    assert cur_pt == uf._deck['8'].wells()[0].top().point + Point(0, 0, 10)


async def test_jog(mock_user_flow):
    uf = mock_user_flow
    await uf.jog(vector=(0, 0, 0.1))
    assert await uf._get_current_point(None) == Point(0, 0, 0.1)
    await uf.jog(vector=(1, 0, 0))
    assert await uf._get_current_point(None) == Point(1, 0, 0.1)


async def test_pick_up_tip(mock_user_flow):
    uf = mock_user_flow
    assert uf._tip_origin_pt is None
    await uf.pick_up_tip()
    # check that it saves the tip pick up location locally
    assert uf._tip_origin_pt == Point(0, 0, 0)


async def test_return_tip(mock_user_flow):
    uf = mock_user_flow
    uf._tip_origin_pt = Point(1, 1, 1)
    uf._hw_pipette._has_tip = True
    z_offset = uf._hw_pipette.config.return_tip_height * \
        uf._get_tip_length()
    await uf._return_tip()
    # should move to return tip
    move_calls = [
        call(
            mount=Mount.RIGHT,
            abs_position=Point(1, 1, 1 - z_offset),
            critical_point=uf._get_critical_point_override()
        ),
    ]
    uf._hardware.move_to.assert_has_calls(move_calls)
    uf._hardware.drop_tip.assert_called()


@pytest.mark.parametrize('command,current_state,data,hw_meth', hw_commands)
async def test_hw_calls(command, current_state, data, hw_meth, mock_user_flow):
    mock_user_flow._current_state = current_state
    # z height reference must be present for moving to point one
    if command == CalibrationCommand.move_to_point_one:
        mock_user_flow._z_height_reference = 0.1
    await mock_user_flow.handle_command(command, data)

    getattr(mock_user_flow._hardware, hw_meth).assert_called()


def test_load_trash(mock_user_flow):
    assert mock_user_flow._deck['12'].load_name == \
        'opentrons_1_trash_1100ml_fixed'


@pytest.mark.parametrize(argnames="mount",
                         argvalues=[Mount.RIGHT, Mount.LEFT])
def test_no_pipette(hardware, mount):
    hardware._attached_instruments = {mount: None}
    with pytest.raises(RobotServerError) as error:
        PipetteOffsetCalibrationUserFlow(hardware=hardware,
                                         mount=mount)

    assert error.value.error.detail == f"No pipette present on {mount} mount"


@pytest.fixture
def mock_save_pipette():
    with patch('opentrons.calibration_storage.modify.save_pipette_calibration',
               autospec=True) as mock_save:
        yield mock_save


async def test_save_pipette_calibration(mock_user_flow, mock_save_pipette):
    uf = mock_user_flow

    uf._current_state = 'savingPointOne'
    await uf._hardware.move_to(
            mount=uf._mount,
            abs_position=Point(x=10, y=10, z=40),
            critical_point=uf._get_critical_point_override()
        )

    await uf.save_offset()
    tiprack_hash = helpers.hash_labware_def(
        uf._tip_rack._implementation.get_definition()
    )
    offset = uf._cal_ref_point - Point(x=10, y=10, z=40)
    mock_save_pipette.assert_called_with(
        offset=offset,
        mount=uf._mount,
        pip_id=uf._hw_pipette.pipette_id,
        tiprack_hash=tiprack_hash,
        tiprack_uri=uf._tip_rack.uri
    )
