"""Test absorbance reader initilize command."""
import math
from typing import Dict, List, Optional
import pytest
from decoy import Decoy

from opentrons.drivers.types import ABSMeasurementMode, ABSMeasurementConfig
from opentrons.hardware_control.modules import AbsorbanceReader
from opentrons.protocol_engine.errors import (
    CannotPerformModuleAction,
    StorageLimitReachedError,
)

from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.resources import FileProvider
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.modules import ModuleView
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    AbsorbanceReaderSubState,
    AbsorbanceReaderId,
)
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.absorbance_reader import (
    ReadAbsorbanceResult,
    ReadAbsorbanceParams,
)
from opentrons.protocol_engine.commands.absorbance_reader.read import (
    ReadAbsorbanceImpl,
)


def _get_absorbance_map(data: Optional[List[float]] = None) -> Dict[str, float]:
    raw_values = (data or [0] * 96).copy()
    raw_values.reverse()
    well_map: Dict[str, float] = {}
    for i, value in enumerate(raw_values):
        row = chr(ord("A") + i // 12)  # Convert index to row (A-H)
        col = (i % 12) + 1  # Convert index to column (1-12)
        well_key = f"{row}{col}"
        # Truncate the value to the third decimal place
        well_map[well_key] = math.floor(value * 1000) / 1000
    return well_map


async def test_absorbance_reader_implementation(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
) -> None:
    """It should validate, find hardware module if not virtualized, and disengage."""
    subject = ReadAbsorbanceImpl(
        state_view=state_view, equipment=equipment, file_provider=file_provider
    )

    params = ReadAbsorbanceParams(
        moduleId="unverified-module-id",
    )

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)
    verified_module_id = AbsorbanceReaderId("module-id")
    asbsorbance_result = {1: {"A1": 1.2}}

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )

    decoy.when(await absorbance_module_hw.start_measure()).then_return([[1.2, 1.3]])
    decoy.when(absorbance_module_hw._measurement_config).then_return(
        ABSMeasurementConfig(
            measure_mode=ABSMeasurementMode.SINGLE,
            sample_wavelengths=[1, 2],
            reference_wavelength=None,
        )
    )
    decoy.when(
        state_view.modules.convert_absorbance_reader_data_points([1.2, 1.3])
    ).then_return({"A1": 1.2})

    result = await subject.execute(params=params)

    assert result == SuccessData(
        public=ReadAbsorbanceResult(
            data=asbsorbance_result,
            fileIds=[],
        ),
        state_update=update_types.StateUpdate(
            files_added=update_types.FilesAddedUpdate(file_ids=[]),
            absorbance_reader_state_update=update_types.AbsorbanceReaderStateUpdate(
                module_id="module-id",
                absorbance_reader_data=update_types.AbsorbanceReaderDataUpdate(
                    read_result=asbsorbance_result
                ),
            ),
        ),
    )


async def test_convert_absorbance_reader_data_points() -> None:
    """It should validate and convert the absorbance reader values."""
    # Test valid values
    raw_data = (
        [0.04877041280269623, 0.046341221779584885]
        + [0.43] * 92  # fill rest of the values with 0.43
        + [0.03789025545120239, 2.8744750022888184]
    )
    expected = _get_absorbance_map(raw_data)
    converted = ModuleView.convert_absorbance_reader_data_points(raw_data)
    assert len(converted) == 96
    assert converted == expected
    assert converted["A1"] == 2.874
    assert converted["A2"] == 0.037
    assert converted["E1"] == 0.43
    assert converted["H12"] == 0.048  # the data is flipped, so arr[0] == H12

    # Test near-zero values in scientic notation
    raw_data = (
        [0.24877041280269623, -9.5000e-9]
        + [0.11] * 92  # fill rest of the values with 0.11
        + [1.3489025545120239, 8.2987e-9]
    )
    expected = _get_absorbance_map(raw_data)
    converted = ModuleView.convert_absorbance_reader_data_points(raw_data)
    assert len(converted) == 96
    assert converted == expected
    assert converted["A1"] == 0.0
    assert converted["A2"] == 1.348
    assert converted["E1"] == 0.11
    assert converted["H11"] == -0.001
    assert converted["H12"] == 0.248  # the data is flipped, so arr[0] == H12

    # Test invalid data len 1
    with pytest.raises(ValueError):
        ModuleView.convert_absorbance_reader_data_points([0])

    # Test invalid data len 107
    with pytest.raises(ValueError):
        ModuleView.convert_absorbance_reader_data_points([1] * 107)


async def test_read_raises_cannot_preform_action(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
) -> None:
    """It should raise CannotPerformModuleAction when not configured/lid is not on."""
    subject = ReadAbsorbanceImpl(
        state_view=state_view, equipment=equipment, file_provider=file_provider
    )

    params = ReadAbsorbanceParams(
        moduleId="unverified-module-id",
    )

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)

    verified_module_id = AbsorbanceReaderId("module-id")

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )

    decoy.when(mabsorbance_module_substate.configured).then_return(False)

    with pytest.raises(CannotPerformModuleAction):
        await subject.execute(params=params)

    decoy.when(mabsorbance_module_substate.configured).then_return(True)

    decoy.when(mabsorbance_module_substate.is_lid_on).then_return(False)

    with pytest.raises(CannotPerformModuleAction):
        await subject.execute(params=params)


async def test_read_raises_storage_limit(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
) -> None:
    """It should raise StorageLimitReachedError when not configured/lid is not on."""
    subject = ReadAbsorbanceImpl(
        state_view=state_view, equipment=equipment, file_provider=file_provider
    )

    params = ReadAbsorbanceParams(moduleId="unverified-module-id", fileName="test")

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)

    verified_module_id = AbsorbanceReaderId("module-id")

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )
    decoy.when(await absorbance_module_hw.start_measure()).then_return([[1.2, 1.3]])

    decoy.when(absorbance_module_hw._measurement_config).then_return(
        ABSMeasurementConfig(
            measure_mode=ABSMeasurementMode.SINGLE,
            sample_wavelengths=[1, 2],
            reference_wavelength=None,
        )
    )
    decoy.when(mabsorbance_module_substate.configured_wavelengths).then_return(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    )

    decoy.when(state_view.files.get_filecount()).then_return(390)
    with pytest.raises(StorageLimitReachedError):
        await subject.execute(params=params)
