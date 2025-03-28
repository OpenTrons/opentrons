"""Deck data resource provider."""
from dataclasses import dataclass
from typing import List, Optional, cast
from typing_extensions import final

import anyio

from opentrons_shared_data.deck import (
    load as load_deck,
    DEFAULT_DECK_DEFINITION_VERSION,
)
from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons.types import DeckSlotName

from ..types import (
    DeckSlotLocation,
    DeckType,
    LabwareLocation,
    DeckConfigurationType,
)
from .labware_data_provider import LabwareDataProvider


@final
@dataclass(frozen=True)
class DeckFixedLabware:
    """A labware fixture that is always present on a deck."""

    labware_id: str
    location: LabwareLocation
    definition: LabwareDefinition


class DeckDataProvider:
    """Provider class to wrap deck definition and data retrieval."""

    _labware_data: LabwareDataProvider

    def __init__(
        self, deck_type: DeckType, labware_data: Optional[LabwareDataProvider] = None
    ) -> None:
        """Initialize a DeckDataProvider."""
        self._deck_type = deck_type
        self._labware_data = labware_data or LabwareDataProvider()

    async def get_deck_definition(self) -> DeckDefinitionV5:
        """Get a labware definition given the labware's identification."""

        def sync() -> DeckDefinitionV5:
            return load_deck(
                name=self._deck_type.value, version=DEFAULT_DECK_DEFINITION_VERSION
            )

        return await anyio.to_thread.run_sync(sync)

    async def get_deck_fixed_labware(
        self,
        load_fixed_trash: bool,
        deck_definition: DeckDefinitionV5,
        deck_configuration: Optional[DeckConfigurationType] = None,
    ) -> List[DeckFixedLabware]:
        """Get a list of all labware fixtures from a given deck definition."""
        labware: List[DeckFixedLabware] = []

        for fixture in deck_definition["locations"]["legacyFixtures"]:
            labware_id = fixture["id"]
            load_name = cast(Optional[str], fixture.get("labware"))
            slot = cast(Optional[str], fixture.get("slot"))

            if (
                load_fixed_trash
                and load_name is not None
                and slot is not None
                and slot in DeckSlotName._value2member_map_
            ):
                deck_slot_location = DeckSlotLocation(
                    slotName=DeckSlotName.from_primitive(slot)
                )
                definition = await self._labware_data.get_labware_definition(
                    load_name=load_name,
                    namespace="opentrons",
                    version=1,
                )

                labware.append(
                    DeckFixedLabware(
                        labware_id=labware_id,
                        definition=definition,
                        location=deck_slot_location,
                    )
                )

        return labware
