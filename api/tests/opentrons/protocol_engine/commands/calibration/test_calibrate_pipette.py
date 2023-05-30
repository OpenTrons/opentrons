"""Test calibrate-pipette command."""
from __future__ import annotations
from typing import TYPE_CHECKING

import inspect
import pytest
from decoy import Decoy

from opentrons.protocol_engine.commands.calibration.calibrate_pipette import (
    CalibratePipetteResult,
    CalibratePipetteImplementation,
    CalibratePipetteParams,
)
from opentrons.protocol_engine.errors.exceptions import HardwareNotSupportedError
from opentrons.protocol_engine.types import InstrumentOffsetVector

from opentrons.hardware_control.api import API
from opentrons.hardware_control.types import OT3Mount
from opentrons.types import MountType, Point

from opentrons.hardware_control import ot3_calibration as calibration

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API


@pytest.mark.ot3_only
@pytest.fixture(autouse=True)
def _mock_ot3_calibration(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    for name, func in inspect.getmembers(calibration, inspect.isfunction):
        monkeypatch.setattr(calibration, name, decoy.mock(func=func))


@pytest.mark.ot3_only
async def test_calibrate_pipette_implementation(
    decoy: Decoy, ot3_hardware_api: OT3API
) -> None:
    """Test Calibration command execution."""
    subject = CalibratePipetteImplementation(hardware_api=ot3_hardware_api)

    params = CalibratePipetteParams(
        mount=MountType.LEFT,
    )

    decoy.when(
        await calibration.calibrate_pipette(
            hcapi=ot3_hardware_api, mount=OT3Mount.LEFT, slot=5
        )
    ).then_return(Point(x=3, y=4, z=6))

    result = await subject.execute(params)

    assert result == CalibratePipetteResult(
        pipetteOffset=InstrumentOffsetVector(x=3, y=4, z=6)
    )


@pytest.mark.ot3_only
async def test_calibrate_pipette_implementation_wrong_hardware(
    decoy: Decoy, ot2_hardware_api: API
) -> None:
    """Should raise an unsupported hardware error."""
    subject = CalibratePipetteImplementation(hardware_api=ot2_hardware_api)

    params = CalibratePipetteParams(
        mount=MountType.LEFT,
    )

    with pytest.raises(HardwareNotSupportedError):
        await subject.execute(params)
