"""ProtocolContext factory."""

import asyncio
from typing import Any, Dict, Optional, Union, cast

from opentrons_shared_data.labware.types import LabwareDefinition

from opentrons.hardware_control import (
    HardwareControlAPI,
    ThreadManager,
    SynchronousAdapter,
)
from opentrons.legacy_broker import LegacyBroker
from opentrons.util.broker import Broker
from opentrons.protocol_engine import ProtocolEngine
from opentrons.protocol_engine.clients import SyncClient, ChildThreadTransport
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.deck_type import (
    should_load_fixed_trash_area_for_python_protocol,
)
from opentrons.protocols.api_support.definitions import MAX_SUPPORTED_VERSION

from .protocol_context import ProtocolContext
from .deck import Deck
from .disposal_locations import TrashBin

from .core.common import ProtocolCore as AbstractProtocolCore
from .core.legacy.deck import Deck as LegacyDeck
from .core.legacy.legacy_protocol_core import LegacyProtocolCore
from .core.legacy.labware_offset_provider import (
    AbstractLabwareOffsetProvider,
    LabwareOffsetProvider,
    NullLabwareOffsetProvider,
)
from .core.legacy_simulator.legacy_protocol_core import LegacyProtocolCoreSimulator
from .core.engine import ENGINE_CORE_API_VERSION, ProtocolCore


class ProtocolEngineCoreRequiredError(Exception):
    """Raised when a Protocol Engine core was required, but not provided.

    This can happen when creating a ProtocolContext with a high api_version.
    """


def create_protocol_context(
    api_version: APIVersion,
    *,
    hardware_api: Union[HardwareControlAPI, ThreadManager[HardwareControlAPI]],
    deck_type: str,
    protocol_engine: Optional[ProtocolEngine] = None,
    protocol_engine_loop: Optional[asyncio.AbstractEventLoop] = None,
    broker: Optional[LegacyBroker] = None,
    equipment_broker: Optional[Broker[Any]] = None,
    use_simulating_core: bool = False,
    extra_labware: Optional[Dict[str, LabwareDefinition]] = None,
    bundled_labware: Optional[Dict[str, LabwareDefinition]] = None,
    bundled_data: Optional[Dict[str, bytes]] = None,
) -> ProtocolContext:
    """Create a ProtocolContext for use in a Python protocol.

    Args:
        api_version: The API version to target.
        hardware_api: Control interface to the device's hardware.
        deck_type: What kind of deck the device has.
            This must match the deck type in `protocol_engine`'s config, if there is one.
        protocol_engine: A ProtocolEngine to use for labware offsets
            and core protocol logic. If omitted, labware offsets will
            all be (0, 0, 0) and ProtocolEngine-based core will not work.
        protocol_engine_loop: An event loop running in the thread where
            ProtocolEngine mutations must occur.
        broker: A message broker for protocol command event publishing.
        equipment_broker: A message broker for equipment load event publishing.
        use_simulating_core: For pre-ProtocolEngine API versions,
            use a simulating protocol core that will skip _most_ calls
            to the `hardware_api`.
        extra_labware: Extra labware definitions to include in
            labware definition lookup paths.
        bundled_labware: Do not use in new code. Leftover from
            experimental ZIP protocol bundles.
        bundled_data: Do not use in new code. Leftover from
            experimental ZIP protocol bundles.

    Returns:
        A ready-to-use ProtocolContext.
    """
    if api_version > MAX_SUPPORTED_VERSION and not api_version.experimental:
        raise ValueError(
            f"API version {api_version} is not supported by this robot software."
            f" Please reduce your API version to {MAX_SUPPORTED_VERSION} or below"
            f" or update your robot."
        )

    sync_hardware: SynchronousAdapter[HardwareControlAPI]
    labware_offset_provider: AbstractLabwareOffsetProvider
    core: Union[ProtocolCore, LegacyProtocolCoreSimulator, LegacyProtocolCore]

    if isinstance(hardware_api, ThreadManager):
        sync_hardware = hardware_api.sync
    else:
        sync_hardware = SynchronousAdapter(hardware_api)

    if protocol_engine is not None:
        assert deck_type == protocol_engine.state_view.config.deck_type.value
        labware_offset_provider = LabwareOffsetProvider(engine=protocol_engine)
    else:
        labware_offset_provider = NullLabwareOffsetProvider()

    if api_version >= ENGINE_CORE_API_VERSION:
        # TODO(mc, 2022-8-22): replace raise with strict typing
        if protocol_engine is None or protocol_engine_loop is None:
            raise ProtocolEngineCoreRequiredError(
                "ProtocolEngine PAPI core is enabled, but no ProtocolEngine given."
            )

        engine_client_transport = ChildThreadTransport(
            engine=protocol_engine, loop=protocol_engine_loop
        )
        engine_client = SyncClient(transport=engine_client_transport)
        core = ProtocolCore(
            engine_client=engine_client,
            api_version=api_version,
            sync_hardware=sync_hardware,
        )

    elif use_simulating_core:
        legacy_deck = LegacyDeck(deck_type=deck_type)
        core = LegacyProtocolCoreSimulator(
            sync_hardware=sync_hardware,
            labware_offset_provider=labware_offset_provider,
            deck_layout=legacy_deck,
            equipment_broker=equipment_broker,
            api_version=api_version,
            bundled_labware=bundled_labware,
            extra_labware=extra_labware,
        )

    else:
        legacy_deck = LegacyDeck(deck_type=deck_type)
        core = LegacyProtocolCore(
            sync_hardware=sync_hardware,
            labware_offset_provider=labware_offset_provider,
            deck_layout=legacy_deck,
            equipment_broker=equipment_broker,
            api_version=api_version,
            bundled_labware=bundled_labware,
            extra_labware=extra_labware,
        )

    # TODO(mc, 2022-12-06): add API version guard in addition to instance check
    # this swap may happen once `ctx.move_labware` off-deck is implemented
    deck = None if isinstance(core, ProtocolCore) else cast(Deck, core.get_deck())

    context = ProtocolContext(
        api_version=api_version,
        # TODO(mm, 2023-05-11): This cast shouldn't be necessary.
        # Fix this by making the appropriate TypeVars covariant?
        # https://peps.python.org/pep-0484/#covariance-and-contravariance
        core=cast(AbstractProtocolCore, core),
        broker=broker,
        deck=deck,
        bundled_data=bundled_data,
    )
    # If we're loading an engine based core into the context, and we're on api level 2.16 or above, on an OT-2 we need
    # to insert a fixed trash addressable area into the protocol engine, for correctness in anything that relies on
    # knowing what addressable areas have been loaded (and any checks involving trash geometry). Because the method
    # that uses this in the core relies on the sync client and this code will run in the main thread (which if called
    # will cause a deadlock), we're directly calling the protocol engine method here where we have access to it.
    if (
        protocol_engine is not None
        and should_load_fixed_trash_area_for_python_protocol(
            api_version=api_version,
            robot_type=protocol_engine.state_view.config.robot_type,
        )
    ):
        assert isinstance(context.fixed_trash, TrashBin)
        protocol_engine.add_addressable_area(context.fixed_trash.area_name)
    return context
