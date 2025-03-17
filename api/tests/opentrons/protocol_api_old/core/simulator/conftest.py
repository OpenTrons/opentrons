import pytest

from opentrons import types
from opentrons.hardware_control import ThreadManagedHardware
from opentrons.protocol_api import MAX_SUPPORTED_VERSION
from opentrons.protocol_api.core.legacy.deck import Deck
from opentrons.protocol_api.core.legacy.legacy_labware_core import LegacyLabwareCore
from opentrons.protocol_api.core.legacy.legacy_protocol_core import (
    LegacyProtocolCore,
)
from opentrons.protocol_api.core.legacy.labware_offset_provider import (
    NullLabwareOffsetProvider,
)
from opentrons.protocol_api.core.legacy.legacy_instrument_core import (
    LegacyInstrumentCore,
)
from opentrons.protocol_api.core.legacy_simulator.legacy_instrument_core import (
    LegacyInstrumentCoreSimulator,
)
from opentrons.protocol_api.core.legacy_simulator.legacy_protocol_core import (
    LegacyProtocolCoreSimulator,
)

from opentrons_shared_data.labware.types import LabwareDefinition2
from opentrons_shared_data.pipette.types import PipetteNameType


@pytest.fixture
def protocol_context(
    hardware: ThreadManagedHardware, deck_definition_name: str
) -> LegacyProtocolCore:
    """Protocol context implementation fixture."""
    return LegacyProtocolCore(
        sync_hardware=hardware.sync,
        deck_layout=Deck(deck_type=deck_definition_name),
        api_version=MAX_SUPPORTED_VERSION,
        labware_offset_provider=NullLabwareOffsetProvider(),
    )


@pytest.fixture
def simulating_protocol_context(
    hardware: ThreadManagedHardware,
    deck_definition_name: str,
) -> LegacyProtocolCoreSimulator:
    """Protocol context simulation fixture."""
    return LegacyProtocolCoreSimulator(
        sync_hardware=hardware.sync,
        deck_layout=Deck(deck_type=deck_definition_name),
        api_version=MAX_SUPPORTED_VERSION,
        labware_offset_provider=NullLabwareOffsetProvider(),
    )


@pytest.fixture
def instrument_context(
    protocol_context: LegacyProtocolCore,
) -> LegacyInstrumentCore:
    """Instrument context backed by hardware simulator."""
    return protocol_context.load_instrument(
        PipetteNameType.P300_SINGLE_GEN2, types.Mount.RIGHT
    )


@pytest.fixture
def second_instrument_context(
    protocol_context: LegacyProtocolCore,
) -> LegacyInstrumentCore:
    """Instrument context backed by hardware simulator."""
    return protocol_context.load_instrument(
        PipetteNameType.P300_SINGLE_GEN2, types.Mount.LEFT
    )


@pytest.fixture
def simulating_instrument_context(
    simulating_protocol_context: LegacyProtocolCoreSimulator,
    instrument_context: LegacyInstrumentCore,
) -> LegacyInstrumentCoreSimulator:
    """A simulating instrument context."""
    return LegacyInstrumentCoreSimulator(
        protocol_interface=simulating_protocol_context,
        pipette_dict=instrument_context.get_hardware_state(),
        mount=types.Mount.RIGHT,
        instrument_name="p300_single_gen2",
    )


@pytest.fixture
def second_simulating_instrument_context(
    simulating_protocol_context: LegacyProtocolCoreSimulator,
    second_instrument_context: LegacyInstrumentCore,
) -> LegacyInstrumentCoreSimulator:
    """A simulating instrument context."""
    return LegacyInstrumentCoreSimulator(
        protocol_interface=simulating_protocol_context,
        pipette_dict=second_instrument_context.get_hardware_state(),
        mount=types.Mount.LEFT,
        instrument_name="p300_single_gen2",
    )


@pytest.fixture
def labware(minimal_labware_def: LabwareDefinition2) -> LegacyLabwareCore:
    """Labware fixture."""
    return LegacyLabwareCore(
        definition=minimal_labware_def,
        parent=types.Location(types.Point(0, 0, 0), "1"),
    )


@pytest.fixture
def tip_rack(minimal_labware_def: LabwareDefinition2) -> LegacyLabwareCore:
    tip_rack_definition = minimal_labware_def.copy()
    tip_rack_parameters = minimal_labware_def["parameters"].copy()

    tip_rack_parameters["isTiprack"] = True
    tip_rack_parameters["tipLength"] = 123
    tip_rack_definition["parameters"] = tip_rack_parameters
    tip_rack_definition["wells"]["A1"]["totalLiquidVolume"] = 200
    tip_rack_definition["wells"]["A2"]["totalLiquidVolume"] = 200

    """Labware fixture."""
    return LegacyLabwareCore(
        definition=tip_rack_definition,
        parent=types.Location(types.Point(0, 0, 0), "1"),
    )


@pytest.fixture
def second_labware(minimal_labware_def: LabwareDefinition2) -> LegacyLabwareCore:
    """Labware fixture."""
    return LegacyLabwareCore(
        definition=minimal_labware_def,
        parent=types.Location(types.Point(0, 0, 0), "5"),
    )
