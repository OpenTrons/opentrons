"""Test absorbance reader initilize command."""
import pytest
from decoy import Decoy

from opentrons.drivers.types import (
    AbsorbanceReaderLidStatus,
)
from opentrons.hardware_control.modules import AbsorbanceReader
from opentrons.protocol_engine import ModuleModel, DeckSlotLocation

from opentrons.protocol_engine.execution import EquipmentHandler, LabwareMovementHandler
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    AbsorbanceReaderSubState,
    AbsorbanceReaderId,
)
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.absorbance_reader import (
    OpenLidResult,
    OpenLidParams,
)
from opentrons.protocol_engine.commands.absorbance_reader.open_lid import (
    OpenLidImpl,
)
from opentrons.protocol_engine.types import (
    LabwareMovementOffsetData,
    LabwareOffsetVector,
)
from opentrons.types import DeckSlotName
from opentrons_shared_data.labware.labware_definition import (
    LabwareDefinition,
    Parameters,
)


@pytest.fixture
def absorbance_def() -> LabwareDefinition:
    """Get a tip rack Pydantic model definition value object."""
    return LabwareDefinition.construct(
        namespace="test",
        version=1,
        parameters=Parameters.construct(  # type: ignore[call-arg]
            loadName="cool-labware",
            tipOverlap=None,  # add a None value to validate serialization to dictionary
        ),
    )


@pytest.mark.parametrize(
    "hardware_lid_status",
    (AbsorbanceReaderLidStatus.ON, AbsorbanceReaderLidStatus.OFF),
)
async def test_absorbance_reader_implementation(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    labware_movement: LabwareMovementHandler,
    hardware_lid_status: AbsorbanceReaderLidStatus,
    absorbance_def: LabwareDefinition,
) -> None:
    """It should validate, find hardware module if not virtualized, and disengage."""
    subject = OpenLidImpl(
        state_view=state_view, equipment=equipment, labware_movement=labware_movement
    )

    params = OpenLidParams(
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

    decoy.when(await absorbance_module_hw.get_current_lid_status()).then_return(
        hardware_lid_status
    )
    decoy.when(state_view.modules.get_requested_model(params.moduleId)).then_return(
        ModuleModel.ABSORBANCE_READER_V1
    )

    decoy.when(state_view.labware.get_absorbance_reader_lid_definition()).then_return()

    decoy.when(state_view.modules.get_location(params.moduleId)).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_D3)
    )
    decoy.when(
        state_view.modules.ensure_and_convert_module_fixture_location(
            DeckSlotName.SLOT_D3, ModuleModel.ABSORBANCE_READER_V1
        )
    ).then_return("absorbanceReaderV1D3")

    decoy.when(state_view.labware.get_absorbance_reader_lid_definition()).then_return(
        absorbance_def
    )
    decoy.when(
        state_view.labware.get_child_gripper_offsets(
            labware_definition=absorbance_def,
            slot_name=None,
        )
    ).then_return(
        LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=0, y=0, z=0),
            dropOffset=LabwareOffsetVector(x=0, y=0, z=0),
        )
    )

    result = await subject.execute(params=params)

    assert result == SuccessData(
        public=OpenLidResult(),
        state_update=update_types.StateUpdate(
            module_state_update=update_types.ModuleStateUpdate(
                module_id="module-id",
                module_type="absorbanceReaderType",
                absorbance_reader_lid=update_types.AbsorbanceReaderLidUpdate(
                    is_lid_on=False
                ),
            ),
        ),
    )
