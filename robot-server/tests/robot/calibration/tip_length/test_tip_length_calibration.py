import pytest
from unittest.mock import MagicMock
from typing import List, Tuple, Dict, Any
from opentrons.types import Mount, Point
from opentrons.hardware_control import pipette

from robot_server.service.session.models import CommonCommand
from robot_server.robot.calibration.tip_length.user_flow import \
    TipCalibrationUserFlow

stub_jog_data = {'vector': Point(1, 1, 1)}

valid_commands: List[Tuple[str, str, Dict[Any, Any]]] = [
  (CommonCommand.move_to_reference_point, 'labwareLoaded', {}),
  (CommonCommand.jog, 'measuringNozzleOffset', stub_jog_data),
  (CommonCommand.pick_up_tip, 'preparingPipette', {}),
  (CommonCommand.invalidate_tip, 'preparingPipette', {}),
  (CommonCommand.save_offset, 'measuringTipOffset', {}),
  (CommonCommand.exit, 'calibrationComplete', {}),
]


@pytest.fixture
def mock_user_flow(hardware):
    mock_hw_pipette = pipette.Pipette(
      model="p300_single_v2.0",
      inst_offset_config={'single': [0, 0, 0], 'multi': [0, 0, 0]},
    )
    hardware.attached_instruments = {
      Mount.RIGHT: mock_hw_pipette
    }

    async def async_mock(*args, **kwargs):
        pass

    hardware.move_rel = MagicMock(side_effect=async_mock)
    hardware.pick_up_tip = MagicMock(side_effect=async_mock)
    hardware.drop_tip = MagicMock(side_effect=async_mock)

    m = TipCalibrationUserFlow(hardware=hardware, mount=Mount.RIGHT)

    yield m


hw_commands: List[Tuple[str, str, Dict[Any, Any], str]] = [
  (CommonCommand.jog, 'measuringNozzleOffset', stub_jog_data, 'move_rel'),
  (CommonCommand.pick_up_tip, 'preparingPipette', {}, 'pick_up_tip'),
  (CommonCommand.invalidate_tip, 'preparingPipette', {}, 'drop_tip'),
]


@pytest.mark.parametrize('command,current_state,data,hw_meth', hw_commands)
async def test_hw_calls(command, current_state, data, hw_meth, mock_user_flow):
    mock_user_flow._current_state = current_state
    await mock_user_flow.handle_command(command, data)

    getattr(mock_user_flow._hardware, hw_meth).assert_called()
