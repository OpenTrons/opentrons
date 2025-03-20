"""Tests for the module state store handling flex stacker state."""

import pytest
from typing import Optional, Dict, Set, cast
from unittest.mock import sentinel

from opentrons_shared_data.labware.labware_definition import (
    LabwareDefinition,
)

from opentrons.protocol_engine.state.modules import ModuleStore, ModuleView
from opentrons.protocol_engine.state.module_substates import (
    FlexStackerSubState,
    FlexStackerId,
)
from opentrons.protocol_engine.state.config import Config

from opentrons.protocol_engine import actions
from opentrons.protocol_engine.types import (
    DeckType,
    ModuleDefinition,
    AddressableArea,
    PotentialCutoutFixture,
    DeckConfigurationType,
)
from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.deck.types import DeckDefinitionV5
import opentrons.protocol_engine.errors as errors
from opentrons.protocol_engine.state.addressable_areas import (
    AddressableAreaView,
    AddressableAreaState,
)


def get_addressable_area_view(
    loaded_addressable_areas_by_name: Optional[Dict[str, AddressableArea]] = None,
    potential_cutout_fixtures_by_cutout_id: Optional[
        Dict[str, Set[PotentialCutoutFixture]]
    ] = None,
    deck_definition: Optional[DeckDefinitionV5] = None,
    deck_configuration: Optional[DeckConfigurationType] = None,
    robot_type: RobotType = "OT-3 Standard",
    use_simulated_deck_config: bool = False,
) -> AddressableAreaView:
    """Get a labware view test subject."""
    state = AddressableAreaState(
        loaded_addressable_areas_by_name=loaded_addressable_areas_by_name or {},
        potential_cutout_fixtures_by_cutout_id=potential_cutout_fixtures_by_cutout_id
        or {},
        deck_definition=deck_definition or cast(DeckDefinitionV5, {"otId": "fake"}),
        deck_configuration=deck_configuration or [],
        robot_definition={
            "displayName": "OT-3",
            "robotType": "OT-3 Standard",
            "models": ["OT-3 Standard"],
            "extents": [477.2, 493.8, 0.0],
            "paddingOffsets": {
                "rear": -177.42,
                "front": 51.8,
                "leftSide": 31.88,
                "rightSide": -80.32,
            },
            "mountOffsets": {
                "left": [-13.5, -60.5, 255.675],
                "right": [40.5, -60.5, 255.675],
                "gripper": [84.55, -12.75, 93.85],
            },
        },
        robot_type=robot_type,
        use_simulated_deck_config=use_simulated_deck_config,
    )

    return AddressableAreaView(state=state)


@pytest.fixture
def ot3_state_config() -> Config:
    """Get a ProtocolEngine state config for the Flex."""
    return Config(
        robot_type="OT-3 Standard",
        deck_type=DeckType.OT3_STANDARD,
    )


@pytest.fixture
def subject(
    ot3_state_config: Config,
) -> ModuleStore:
    """Get a ModuleStore for the flex."""
    return ModuleStore(config=ot3_state_config, deck_fixed_labware=[])


@pytest.fixture
def module_view(subject: ModuleStore) -> ModuleView:
    """Get a ModuleView for the ModuleStore."""
    return ModuleView(state=subject._state)


def test_add_module_action(
    subject: ModuleStore,
    module_view: ModuleView,
    flex_stacker_v1_def: ModuleDefinition,
) -> None:
    """It should create a flex stacker substate."""
    action = actions.AddModuleAction(
        module_id="someModuleId",
        serial_number="someSerialNumber",
        definition=flex_stacker_v1_def,
        module_live_data={"status": "idle", "data": {}},
    )

    with pytest.raises(errors.ModuleNotLoadedError):
        module_view.get_flex_stacker_substate("someModuleId")

    subject.handle_action(action)

    result = module_view.get_flex_stacker_substate("someModuleId")

    assert result == FlexStackerSubState(
        module_id=FlexStackerId("someModuleId"),
        pool_primary_definition=None,
        pool_adapter_definition=None,
        pool_lid_definition=None,
        pool_count=0,
        max_pool_count=0,
    )


@pytest.mark.parametrize(
    argnames=["primary_def", "lid_def", "adapter_def", "result"],
    argvalues=[
        pytest.param(
            sentinel.primary, None, None, [sentinel.primary], id="primary-only"
        ),
        pytest.param(
            sentinel.primary,
            sentinel.lid,
            None,
            [sentinel.lid, sentinel.primary],
            id="primary-and-lid",
        ),
        pytest.param(
            sentinel.primary,
            None,
            sentinel.adapter,
            [sentinel.primary, sentinel.adapter],
            id="primary-and-adapter",
        ),
        pytest.param(
            sentinel.primary,
            sentinel.lid,
            sentinel.adapter,
            [sentinel.lid, sentinel.primary, sentinel.adapter],
            id="primary-and-adapter-and-lid",
        ),
        pytest.param(None, None, None, None, id="none"),
    ],
)
def test_get_labware_definition_list(
    primary_def: LabwareDefinition | None,
    lid_def: LabwareDefinition | None,
    adapter_def: LabwareDefinition | None,
    result: list[LabwareDefinition] | None,
) -> None:
    """It should return definitions in proper order."""
    subject = FlexStackerSubState(
        module_id=FlexStackerId("someModuleId"),
        pool_primary_definition=primary_def,
        pool_adapter_definition=adapter_def,
        pool_lid_definition=lid_def,
        pool_count=0,
        max_pool_count=5,
    )
    assert subject.get_pool_definition_ordered_list() == result
