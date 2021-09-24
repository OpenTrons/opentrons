"""Customize the ProtocolEngine to control and track state of legacy protocols."""
from __future__ import annotations
from typing import Callable, Optional

from opentrons.commands.types import CommandMessage as LegacyCommand
from opentrons.hardware_control import API as HardwareAPI
from opentrons.hardware_control.types import PauseType as HardwarePauseType
from opentrons.protocol_engine import AbstractPlugin, actions as pe_actions

from .legacy_wrappers import LegacyProtocolContext
from .legacy_command_mapper import LegacyCommandMapper


class LegacyContextPlugin(AbstractPlugin):
    """A ProtocolEngine plugin wrapping a legacy ProtocolContext.

    In the legacy ProtocolContext, protocol execution is accomplished
    by direct communication with the HardwareAPI, as opposed to an
    intermediate layer like the ProtocolEngine. This plugin wraps up
    and hides this behavior, so the ProtocolEngine can monitor and control
    the run of a legacy protocol without affecting the execution of
    the protocol commands themselves.

    This plugin allows a ProtocolEngine to:

    1. Play/pause the protocol run using the HardwareAPI, as was done before
       the ProtocolEngine existed.
    2. Subscribe to the message broker commands and insert them into
       ProtocolEngine state for purely progress tracking purposes.
    """

    def __init__(
        self,
        hardware_api: HardwareAPI,
        protocol_context: LegacyProtocolContext,
        legacy_command_mapper: Optional[LegacyCommandMapper] = None,
    ) -> None:
        """Initialize the plugin with its dependencies."""
        self._hardware_api = hardware_api
        self._protocol_context = protocol_context
        self._legacy_command_mapper = legacy_command_mapper or LegacyCommandMapper()
        self._unsubscribe_broker: Optional[Callable[[], None]] = None

    def handle_action(self, action: pe_actions.Action) -> None:
        """React to a ProtocolEngine action."""
        if isinstance(action, pe_actions.PlayAction):
            if self._unsubscribe_broker is None:
                self._unsubscribe_broker = self._protocol_context.broker.subscribe(
                    topic="command",
                    handler=self._dispatch_legacy_command,
                )

            self._hardware_api.resume(HardwarePauseType.PAUSE)

        elif isinstance(action, pe_actions.PauseAction):
            self._hardware_api.pause(HardwarePauseType.PAUSE)

        elif isinstance(action, pe_actions.StopAction) and self._unsubscribe_broker:
            self._unsubscribe_broker()

    def _dispatch_legacy_command(self, command: LegacyCommand) -> None:
        pe_commands = self._legacy_command_mapper.map(
            command=command,
            loaded_pipettes=self._protocol_context.loaded_instruments,
            loaded_modules=self._protocol_context.loaded_modules,
            loaded_labware=self._protocol_context.loaded_labwares,
        )

        for c in pe_commands:
            self.dispatch(pe_actions.UpdateCommandAction(command=c))
