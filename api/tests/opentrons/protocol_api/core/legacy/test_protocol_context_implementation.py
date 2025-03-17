"""Tests for the legacy Protocol API core implementation."""
import inspect
from typing import Any, Dict, cast

import pytest
from decoy import Decoy

from opentrons_shared_data.labware.types import LabwareDefinition2 as LabwareDefDict
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.module.types import ModuleDefinitionV3

from opentrons.types import DeckSlotName, StagingSlotName, Location, Mount, Point
from opentrons.util.broker import Broker

from opentrons.hardware_control import SyncHardwareAPI
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.hardware_control.modules import AbstractModule
from opentrons.hardware_control.modules.types import ModuleType, TemperatureModuleModel

from opentrons.protocols import labware as mock_labware
from opentrons.protocols.api_support.util import APIVersionError
from opentrons.protocol_api.core.legacy.module_geometry import ModuleGeometry
from opentrons.protocol_api import MAX_SUPPORTED_VERSION, OFF_DECK
from opentrons.protocol_api.core.labware import LabwareLoadParams

from opentrons.protocol_api.core.legacy.deck import Deck
from opentrons.protocol_api.core.legacy.load_info import (
    LoadInfo,
    LabwareLoadInfo,
    InstrumentLoadInfo,
    ModuleLoadInfo,
)
from opentrons.protocol_api.core.legacy.labware_offset_provider import (
    AbstractLabwareOffsetProvider,
    ProvidedLabwareOffset,
)
from opentrons.protocol_api.core.legacy.legacy_instrument_core import (
    LegacyInstrumentCore,
)
from opentrons.protocol_api.core.legacy.legacy_labware_core import LegacyLabwareCore
from opentrons.protocol_api.core.legacy.legacy_module_core import LegacyModuleCore
from opentrons.protocol_api.core.legacy.legacy_protocol_core import (
    LegacyProtocolCore,
)

from opentrons.protocol_api.core.legacy import (
    legacy_module_core as mock_legacy_module_core,
    module_geometry as mock_module_geometry,
)


@pytest.fixture(autouse=True)
def _mock_labware_module(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock out opentrons.protocols.labware functions."""
    for name, func in inspect.getmembers(mock_labware, inspect.isfunction):
        monkeypatch.setattr(mock_labware, name, decoy.mock(func=func))


@pytest.fixture(autouse=True)
def _mock_module_geometry_module(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock out opentrons.protocols.geometry.module_geometry functions."""
    for name, func in inspect.getmembers(mock_module_geometry, inspect.isfunction):
        monkeypatch.setattr(mock_module_geometry, name, decoy.mock(func=func))


@pytest.fixture(autouse=True)
def _mock_legacy_module_core_module(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out opentrons.protocol_api.core.legacy.legacy_module_core functions."""
    for name, func in inspect.getmembers(mock_legacy_module_core, inspect.isfunction):
        monkeypatch.setattr(mock_legacy_module_core, name, decoy.mock(func=func))


@pytest.fixture
def mock_sync_hardware_api(decoy: Decoy) -> SyncHardwareAPI:
    """Get a mock hardware API."""
    return decoy.mock(cls=SyncHardwareAPI)


@pytest.fixture
def mock_deck(decoy: Decoy) -> Deck:
    """Get a mock Deck."""

    class _MockDeck(Dict[str, Any]):
        ...

    deck = _MockDeck()
    setattr(deck, "position_for", decoy.mock(name="Deck.position_for"))
    setattr(
        deck, "resolve_module_location", decoy.mock(name="Deck.resolve_module_location")
    )
    deck["12"] = decoy.mock(cls=LegacyLabwareCore)

    return cast(Deck, deck)


@pytest.fixture
def mock_labware_offset_provider(decoy: Decoy) -> AbstractLabwareOffsetProvider:
    """Get a mock offset provider core."""
    return decoy.mock(cls=AbstractLabwareOffsetProvider)


@pytest.fixture
def mock_equipment_broker(decoy: Decoy) -> Broker[LoadInfo]:
    """Get a mock equipment broker."""
    return decoy.mock(cls=Broker)


@pytest.fixture
def subject(
    mock_sync_hardware_api: SyncHardwareAPI,
    mock_labware_offset_provider: AbstractLabwareOffsetProvider,
    mock_equipment_broker: Broker[LoadInfo],
    mock_deck: Deck,
) -> LegacyProtocolCore:
    """Get a legacy protocol implementation core with mocked out dependencies."""
    return LegacyProtocolCore(
        api_version=MAX_SUPPORTED_VERSION,
        sync_hardware=mock_sync_hardware_api,
        labware_offset_provider=mock_labware_offset_provider,
        equipment_broker=mock_equipment_broker,
        deck_layout=mock_deck,
    )


def test_load_instrument(
    decoy: Decoy,
    mock_sync_hardware_api: SyncHardwareAPI,
    mock_equipment_broker: Broker[LoadInfo],
    subject: LegacyProtocolCore,
) -> None:
    """It should load an instrument core."""
    pipette_dict = cast(
        PipetteDict,
        {
            "model": "cool-model",
            "pipette_id": "cool-serial-number",
            "default_aspirate_flow_rates": {"1.1": 22},
            "default_dispense_flow_rates": {"3.3": 44},
            "default_blow_out_flow_rates": {"5.5": 66},
        },
    )

    decoy.when(mock_sync_hardware_api.attached_instruments).then_return({})
    decoy.when(mock_sync_hardware_api.get_attached_instrument(Mount.RIGHT)).then_return(
        pipette_dict
    )

    result = subject.load_instrument(
        instrument_name=PipetteNameType.P300_SINGLE, mount=Mount.RIGHT
    )

    assert isinstance(result, LegacyInstrumentCore)

    decoy.verify(
        mock_sync_hardware_api.cache_instruments({Mount.RIGHT: "p300_single"}),
        mock_equipment_broker.publish(
            InstrumentLoadInfo(
                instrument_load_name="p300_single",
                mount=Mount.RIGHT,
                pipette_dict=pipette_dict,
            )
        ),
    )


def test_load_labware_off_deck_raises(
    subject: LegacyProtocolCore,
) -> None:
    """It should raise an api error."""
    with pytest.raises(APIVersionError):
        subject.load_labware(
            load_name="cool load name",
            location=OFF_DECK,
            label="cool label",
            namespace="cool namespace",
            version=1337,
        )


def test_load_labware_on_staging_slot_raises(
    subject: LegacyProtocolCore,
) -> None:
    """It should raise an api error when loading onto a staging slot."""
    with pytest.raises(APIVersionError):
        subject.load_labware(
            load_name="cool load name",
            location=StagingSlotName.SLOT_B4,
            label="cool label",
            namespace="cool namespace",
            version=1337,
        )


def test_load_labware(
    decoy: Decoy,
    mock_deck: Deck,
    mock_labware_offset_provider: AbstractLabwareOffsetProvider,
    mock_equipment_broker: Broker[LoadInfo],
    subject: LegacyProtocolCore,
) -> None:
    """It should load a labware core."""
    labware_definition_dict = cast(
        LabwareDefDict,
        {
            "schemaVersion": 2,
            "namespace": "super cool namespace",
            "parameters": {"loadName": "super cool load name"},
            "version": 42,
            "wells": {},
            "ordering": [],
            "dimensions": {"xDimension": 0, "yDimension": 0, "zDimension": 0},
            "cornerOffsetFromSlot": {"x": 4, "y": 5, "z": 6},
        },
    )

    decoy.when(
        mock_labware.get_labware_definition(
            load_name="cool load name",
            namespace="cool namespace",
            version=1337,
            bundled_defs=None,
            extra_defs={},
        )
    ).then_return(labware_definition_dict)

    decoy.when(mock_deck.position_for("5")).then_return(
        Location(Point(1, 2, 3), "5"),
    )

    decoy.when(
        mock_labware_offset_provider.find(
            load_params=LabwareLoadParams(
                namespace="super cool namespace",
                load_name="super cool load name",
                version=42,
            ),
            requested_module_model=None,
            deck_slot=DeckSlotName.SLOT_5,
        )
    ).then_return(ProvidedLabwareOffset(delta=Point(7, 8, 9), offset_id="offset-789"))

    result = subject.load_labware(
        load_name="cool load name",
        location=DeckSlotName.SLOT_5,
        label="cool label",
        namespace="cool namespace",
        version=1337,
    )

    assert isinstance(result, LegacyLabwareCore)
    assert mock_deck["5"] is result
    assert result.get_definition() == labware_definition_dict
    assert result.get_user_display_name() == "cool label"
    assert result.get_geometry().parent == Location(Point(1, 2, 3), "5")
    assert result.get_calibrated_offset() == Point(
        x=(1 + 4 + 7),
        y=(2 + 5 + 8),
        z=(3 + 6 + 9),
    )

    decoy.verify(
        mock_equipment_broker.publish(
            LabwareLoadInfo(
                labware_definition=labware_definition_dict,
                labware_namespace="super cool namespace",
                labware_load_name="super cool load name",
                labware_version=42,
                deck_slot=DeckSlotName.SLOT_5,
                on_module=False,
                offset_id="offset-789",
                labware_display_name="cool label",
            )
        ),
        times=1,
    )


def test_load_adapter_raises(
    subject: LegacyProtocolCore,
) -> None:
    """It should raise an API version error when trying to load an adapter."""
    with pytest.raises(APIVersionError):
        subject.load_adapter(
            load_name="cool load name",
            location=DeckSlotName.SLOT_5,
            namespace="cool namespace",
            version=1337,
        )


def test_load_labware_on_module(
    decoy: Decoy,
    mock_labware_offset_provider: AbstractLabwareOffsetProvider,
    mock_equipment_broker: Broker[LoadInfo],
    subject: LegacyProtocolCore,
) -> None:
    """It should load a labware core."""
    mock_module_core = decoy.mock(cls=LegacyModuleCore)

    labware_definition_dict = cast(
        LabwareDefDict,
        {
            "schemaVersion": 2,
            "namespace": "super cool namespace",
            "parameters": {"loadName": "super cool load name"},
            "version": 42,
            "wells": {},
            "ordering": [],
            "dimensions": {"xDimension": 0, "yDimension": 0, "zDimension": 0},
            "cornerOffsetFromSlot": {"x": 4, "y": 5, "z": 6},
        },
    )

    decoy.when(
        mock_labware.get_labware_definition(
            load_name="cool load name",
            namespace="cool namespace",
            version=1337,
            bundled_defs=None,
            extra_defs={},
        )
    ).then_return(labware_definition_dict)

    decoy.when(mock_module_core.get_requested_model()).then_return(
        TemperatureModuleModel.TEMPERATURE_V1
    )
    decoy.when(mock_module_core.get_deck_slot()).then_return(DeckSlotName.SLOT_5)
    decoy.when(mock_module_core.geometry.location).then_return(
        Location(Point(1, 2, 3), mock_module_core.geometry)
    )

    decoy.when(
        mock_labware_offset_provider.find(
            load_params=LabwareLoadParams(
                namespace="super cool namespace",
                load_name="super cool load name",
                version=42,
            ),
            requested_module_model=TemperatureModuleModel.TEMPERATURE_V1,
            deck_slot=DeckSlotName.SLOT_5,
        )
    ).then_return(ProvidedLabwareOffset(delta=Point(7, 8, 9), offset_id="offset-789"))

    result = subject.load_labware(
        load_name="cool load name",
        location=mock_module_core,
        label="cool label",
        namespace="cool namespace",
        version=1337,
    )

    assert isinstance(result, LegacyLabwareCore)
    assert result.get_calibrated_offset() == Point(
        x=(1 + 4 + 7),
        y=(2 + 5 + 8),
        z=(3 + 6 + 9),
    )

    decoy.verify(
        mock_equipment_broker.publish(
            LabwareLoadInfo(
                labware_definition=labware_definition_dict,
                labware_namespace="super cool namespace",
                labware_load_name="super cool load name",
                labware_version=42,
                deck_slot=DeckSlotName.SLOT_5,
                on_module=True,
                offset_id="offset-789",
                labware_display_name="cool label",
            )
        ),
        times=1,
    )


def test_load_labware_on_labware_raises(
    decoy: Decoy, subject: LegacyProtocolCore
) -> None:
    """It should raise an API version error when trying to load a labware onto a labware."""
    with pytest.raises(APIVersionError):
        subject.load_labware(
            load_name="cool load name",
            location=decoy.mock(cls=LegacyLabwareCore),
            label="cool label",
            namespace="cool namespace",
            version=1337,
        )


def test_load_module(
    decoy: Decoy,
    mock_deck: Deck,
    mock_sync_hardware_api: SyncHardwareAPI,
    mock_equipment_broker: Broker[LoadInfo],
    subject: LegacyProtocolCore,
) -> None:
    """It should load a module core.

    Note: this test does not fully test the the loading logic,
    including (but not limited to) module simulation logic.
    Since this code is being replaced and refactoring would be
    prohibitively expensive, this should be good enough
    given existing high-level acceptance tests.
    """
    mock_hw_mod_1 = decoy.mock(cls=AbstractModule)
    mock_hw_mod_2 = decoy.mock(cls=AbstractModule)

    defn_1 = cast(ModuleDefinitionV3, {"model": "model-1"})
    defn_2 = cast(ModuleDefinitionV3, {"model": "model-2"})

    mock_geometry = decoy.mock(cls=ModuleGeometry)
    mock_module_core = decoy.mock(cls=LegacyModuleCore)

    decoy.when(mock_hw_mod_1.model()).then_return("model-1")
    decoy.when(mock_hw_mod_2.model()).then_return("model-2")

    decoy.when(
        mock_deck.resolve_module_location(
            ModuleType.TEMPERATURE, DeckSlotName.SLOT_1.id
        )
    ).then_return(42)

    decoy.when(mock_deck.position_for(42)).then_return(Location(Point(1, 2, 3), None))

    decoy.when(mock_sync_hardware_api.attached_modules).then_return(
        [mock_hw_mod_1, mock_hw_mod_2]
    )

    decoy.when(mock_module_geometry.load_definition("model-1")).then_return(defn_1)
    decoy.when(mock_module_geometry.load_definition("model-2")).then_return(defn_2)

    decoy.when(
        mock_module_geometry.models_compatible(
            TemperatureModuleModel.TEMPERATURE_V1, defn_1
        )
    ).then_return(False)

    decoy.when(
        mock_module_geometry.models_compatible(
            TemperatureModuleModel.TEMPERATURE_V1, defn_2
        )
    ).then_return(True)

    decoy.when(
        mock_module_geometry.create_geometry(
            definition=defn_2,
            parent=Location(Point(1, 2, 3), None),
            configuration=None,
        )
    ).then_return(mock_geometry)

    decoy.when(mock_hw_mod_2.device_info).then_return({"serial": "serial-number"})

    decoy.when(mock_geometry.parent).then_return("1")
    decoy.when(mock_geometry.model).then_return(TemperatureModuleModel.TEMPERATURE_V2)

    decoy.when(
        mock_legacy_module_core.create_module_core(
            module_hardware_api=mock_hw_mod_2,
            requested_model=TemperatureModuleModel.TEMPERATURE_V1,
            geometry=mock_geometry,
            protocol_core=subject,
        )
    ).then_return(mock_module_core)

    decoy.when(mock_module_core.get_model()).then_return(
        TemperatureModuleModel.TEMPERATURE_V2
    )
    decoy.when(mock_module_core.get_serial_number()).then_return("cap'n crunch")
    decoy.when(mock_module_core.get_deck_slot()).then_return(DeckSlotName.SLOT_1)

    result = subject.load_module(
        model=TemperatureModuleModel.TEMPERATURE_V1,
        deck_slot=DeckSlotName.SLOT_1,
        configuration=None,
    )

    assert result is mock_module_core

    decoy.verify(
        mock_equipment_broker.publish(
            ModuleLoadInfo(
                requested_model=TemperatureModuleModel.TEMPERATURE_V1,
                loaded_model=TemperatureModuleModel.TEMPERATURE_V2,
                module_serial="cap'n crunch",
                deck_slot=DeckSlotName.SLOT_1,
                configuration=None,
            )
        ),
        times=1,
    )
