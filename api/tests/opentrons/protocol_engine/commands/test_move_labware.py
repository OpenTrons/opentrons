"""Test the ``moveLabware`` command."""
import pytest
from decoy import Decoy

from opentrons.types import DeckSlotName
from opentrons.protocol_engine import errors
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    ModuleLocation,
    LoadedLabware,
)
from opentrons.protocol_engine.state import StateView
from opentrons.protocol_engine.commands.move_labware import (
    MoveLabwareParams,
    MoveLabwareResult,
    MoveLabwareImplementation,
)
from opentrons.protocol_engine.execution import (
    EquipmentHandler,
    RunControlHandler,
    LabwareMovementHandler,
)


async def test_manual_move_labware_implementation(
    decoy: Decoy,
    equipment: EquipmentHandler,
    labware_movement: LabwareMovementHandler,
    state_view: StateView,
    run_control: RunControlHandler,
) -> None:
    """It should execute a pause and return the new offset."""
    subject = MoveLabwareImplementation(
        state_view=state_view,
        equipment=equipment,
        labware_movement=labware_movement,
        run_control=run_control,
    )

    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        useGripper=False,
    )

    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            offsetId=None,
        )
    )

    decoy.when(
        equipment.find_applicable_labware_offset_id(
            labware_definition_uri="opentrons-test/load-name/1",
            labware_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        )
    ).then_return("wowzers-a-new-offset-id")

    result = await subject.execute(data)
    decoy.verify(await run_control.wait_for_resume(), times=1)
    assert result == MoveLabwareResult(
        offsetId="wowzers-a-new-offset-id",
    )


async def test_gripper_move_labware_implementation(
    decoy: Decoy,
    equipment: EquipmentHandler,
    labware_movement: LabwareMovementHandler,
    state_view: StateView,
    run_control: RunControlHandler,
) -> None:
    """It should delegate to the equipment handler and return the new offset."""
    subject = MoveLabwareImplementation(
        state_view=state_view,
        equipment=equipment,
        labware_movement=labware_movement,
        run_control=run_control,
    )
    from_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    new_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_5)

    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=new_location,
        useGripper=True,
    )

    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=from_location,
            offsetId=None,
        )
    )

    decoy.when(
        equipment.find_applicable_labware_offset_id(
            labware_definition_uri="opentrons-test/load-name/1",
            labware_location=new_location,
        )
    ).then_return("wowzers-a-new-offset-id")

    validated_from_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_6)
    validated_new_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_7)
    decoy.when(
        labware_movement.ensure_valid_gripper_location(from_location)
    ).then_return(validated_from_location)
    decoy.when(
        labware_movement.ensure_valid_gripper_location(new_location)
    ).then_return(validated_new_location)

    result = await subject.execute(data)
    decoy.verify(
        await labware_movement.move_labware_with_gripper(
            labware_id="my-cool-labware-id",
            current_location=validated_from_location,
            new_location=validated_new_location,
            new_offset_id="wowzers-a-new-offset-id",
        ),
        times=1,
    )
    assert result == MoveLabwareResult(
        offsetId="wowzers-a-new-offset-id",
    )


async def test_move_labware_raises(
    decoy: Decoy,
    equipment: EquipmentHandler,
    labware_movement: LabwareMovementHandler,
    run_control: RunControlHandler,
    state_view: StateView,
) -> None:
    """It should raise an error when specified labware/ module is not found."""
    subject = MoveLabwareImplementation(
        state_view=state_view,
        labware_movement=labware_movement,
        equipment=equipment,
        run_control=run_control,
    )
    move_non_existent_labware_params = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
    )
    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_raise(
        errors.LabwareNotLoadedError("Woops!")
    )

    with pytest.raises(errors.LabwareNotLoadedError):
        await subject.execute(move_non_existent_labware_params)

    move_labware_from_questionable_module_params = MoveLabwareParams(
        labwareId="real-labware-id",
        newLocation=ModuleLocation(moduleId="imaginary-module-id"),
    )
    decoy.when(state_view.labware.get(labware_id="real-labware-id")).then_return(
        LoadedLabware(
            id="real-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=ModuleLocation(moduleId="imaginary-module-id"),
            offsetId=None,
        )
    )
    decoy.when(
        equipment.find_applicable_labware_offset_id(
            labware_definition_uri="opentrons-test/load-name/1",
            labware_location=ModuleLocation(moduleId="imaginary-module-id"),
        )
    ).then_raise(errors.ModuleNotLoadedError("Woops 2.0!"))

    with pytest.raises(errors.ModuleNotLoadedError):
        await subject.execute(move_labware_from_questionable_module_params)
