"""Protocol engine state management."""
from __future__ import annotations
from typing import List

from opentrons_shared_data.deck.dev_types import DeckDefinitionV2

from .. import command_models as cmd
from .substore import CommandReactive
from .commands import CommandStore, CommandState
from .labware import LabwareStore, LabwareState
from .pipettes import PipetteStore, PipetteState
from .geometry import GeometryStore, GeometryState


class StateView():
    def __init__(
        self,
        command_store: CommandStore,
        labware_store: LabwareStore,
        pipette_store: PipetteStore,
        geometry_store: GeometryStore,
    ) -> None:
        """A StateView class provides a read-only interface to a StateStore."""
        self._command_store = command_store
        self._labware_store = labware_store
        self._pipette_store = pipette_store
        self._geometry_store = geometry_store

    @classmethod
    def create_view(cls, target: StateStore) -> StateView:
        """Create a read-only view of a target StateStore."""
        return cls(
            command_store=target._command_store,
            labware_store=target._labware_store,
            pipette_store=target._pipette_store,
            geometry_store=target._geometry_store,
        )

    @property
    def commands(self) -> CommandState:
        """Get commands sub-state."""
        return self._command_store.state

    @property
    def labware(self) -> LabwareState:
        """Get labware sub-state."""
        return self._labware_store.state

    @property
    def pipettes(self) -> PipetteState:
        """Get pipettes sub-state."""
        return self._pipette_store.state

    @property
    def geometry(self) -> GeometryState:
        """Get geometry sub-state."""
        return self._geometry_store.state


class StateStore(StateView):
    """
    ProtocolEngine state store.

    A StateStore manages several substores, which will modify themselves in
    reaction to commands and other protocol events. Only Store classes should
    be allowed to modify State classes.
    """

    def __init__(self, deck_definition: DeckDefinitionV2):
        """Initialize a StateStore."""
        command_store = CommandStore()
        labware_store = LabwareStore()
        pipette_store = PipetteStore()
        geometry_store = GeometryStore(deck_definition=deck_definition)

        # attach stores to self via StateView constructor
        super().__init__(
            command_store=command_store,
            labware_store=labware_store,
            pipette_store=pipette_store,
            geometry_store=geometry_store,
        )

        self._lifecycle_substores: List[CommandReactive] = [
            self._labware_store,
            self._pipette_store,
            self._geometry_store,
        ]

    def handle_command(
        self,
        command: cmd.CommandType,
        command_id: str
    ) -> None:
        """Modify State in reaction to a Command."""
        self._command_store.handle_command(command, command_id)

        if isinstance(command, cmd.CompletedCommand):
            for substore in self._lifecycle_substores:
                substore.handle_completed_command(command)
