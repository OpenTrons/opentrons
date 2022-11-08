from decoy import Decoy
import pytest

from opentrons.hardware_control import ot3_calibration
from opentrons.hardware_control.api import API as OT2API
from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.types import GripperProbe
from opentrons.types import Point

from opentrons.protocol_engine.commands.calibration.calibrate_gripper import (
    CalibrateGripperResult,
    CalibrateGripperImplementation,
    CalibrateGripperParams,
    CalibrateGripperParamsProbe,
)
from opentrons.protocol_engine.errors import HardwareNotSupportedError
from opentrons.protocol_engine.types import Vec3f


@pytest.fixture
def use_mock_hc_calibrate_gripper(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out ot3_calibration.calibrate_gripper() for the duration of the test."""
    mock = decoy.mock(func=ot3_calibration.calibrate_gripper)
    monkeypatch.setattr(ot3_calibration, "calibrate_gripper", mock)


@pytest.mark.parametrize(
    "params_probe, expected_hc_probe",
    [
        (CalibrateGripperParamsProbe.FRONT, GripperProbe.FRONT),
        (CalibrateGripperParamsProbe.REAR, GripperProbe.REAR),
    ],
)
async def test_calibrate_gripper(
    decoy: Decoy,
    ot3_hardware_api: OT3API,
    use_mock_hc_calibrate_gripper: None,
    params_probe: CalibrateGripperParamsProbe,
    expected_hc_probe: GripperProbe,
) -> None:
    subject = CalibrateGripperImplementation(hardware_api=ot3_hardware_api)

    params = CalibrateGripperParams(probe=params_probe)
    decoy.when(
        await ot3_calibration.calibrate_gripper(
            ot3_hardware_api,
            probe=expected_hc_probe,
        )
    ).then_return(Point(1.1, 2.2, 3.3))
    result = await subject.execute(params)
    assert result == CalibrateGripperResult(probeOffset=Vec3f(x=1.1, y=2.2, z=3.3))


async def test_calibrate_gripper_errors_on_ot2(
    decoy: Decoy,
    ot2_hardware_api: OT2API,
) -> None:
    subject = CalibrateGripperImplementation(hardware_api=ot2_hardware_api)

    params = CalibrateGripperParams(probe=CalibrateGripperParamsProbe.REAR)

    with pytest.raises(HardwareNotSupportedError):
        await subject.execute(params)


# TODO: It should raise a descriptive error if OT-3, but no gripper attached
