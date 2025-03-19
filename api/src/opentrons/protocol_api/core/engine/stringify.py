from opentrons.protocol_engine.clients.sync_client import SyncClient
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    LabwareLocation,
    ModuleLocation,
    OnLabwareLocation,
    AddressableAreaLocation,
    InStackerHopperLocation,
)


def well(engine_client: SyncClient, well_name: str, labware_id: str) -> str:
    """Return a human-readable string representing a well and its location.

    For example: "A1 of My Cool Labware on C2".
    """
    labware_location = OnLabwareLocation(labwareId=labware_id)
    return f"{well_name} of {_labware_location_string(engine_client, labware_location)}"


def _module_in_location_string(module_id: str, engine_client: SyncClient) -> str:
    module_name = engine_client.state.modules.get_definition(
        module_id=module_id
    ).displayName
    module_on = engine_client.state.modules.get_location(module_id=module_id)
    module_on_string = _labware_location_string(engine_client, module_on)
    return f"{module_name} on {module_on_string}"


def _labware_location_string(
    engine_client: SyncClient, location: LabwareLocation
) -> str:
    if isinstance(location, DeckSlotLocation):
        # TODO(mm, 2023-10-11):
        # Ideally, we might want to use the display name specified by the deck definition?
        return f"slot {location.slotName.id}"

    elif isinstance(location, ModuleLocation):
        return _module_in_location_string(location.moduleId, engine_client)

    elif isinstance(location, OnLabwareLocation):
        labware_name = _labware_name(engine_client, location.labwareId)
        labware_on = engine_client.state.labware.get_location(
            labware_id=location.labwareId
        )
        labware_on_string = _labware_location_string(engine_client, labware_on)
        return f"{labware_name} on {labware_on_string}"

    elif isinstance(location, AddressableAreaLocation):
        # In practice this will always be a deck slot or staging slot
        return f"slot {location.addressableAreaName}"

    elif location == "offDeck":
        return "[off-deck]"

    elif location == "systemLocation":
        return "[systemLocation]"

    elif isinstance(location, InStackerHopperLocation):
        return (
            f"stored in {_module_in_location_string(location.moduleId, engine_client)}"
        )


def _labware_name(engine_client: SyncClient, labware_id: str) -> str:
    """Return the user-specified labware label, or fall back to the display name from the def."""
    user_name = engine_client.state.labware.get_user_specified_display_name(
        labware_id=labware_id
    )
    definition_name = engine_client.state.labware.get_definition(
        labware_id=labware_id
    ).metadata.displayName

    return user_name if user_name is not None else definition_name
