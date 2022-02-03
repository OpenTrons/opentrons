"""Customize the ProtocolEngine to monitor and control legacy (APIv2) protocols."""
from __future__ import annotations

from asyncio import create_task, Task
from contextlib import ExitStack
from typing import Optional

from opentrons.commands.types import CommandMessage as LegacyCommand
from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import (
    DoorStateNotification,
    PauseType as HardwarePauseType,
)

from opentrons.protocol_engine import AbstractPlugin, actions as pe_actions

from .legacy_wrappers import (
    LegacyInstrumentLoadInfo,
    LegacyLabwareLoadInfo,
    LegacyProtocolContext,
    LegacyModuleLoadInfo,
)
from .legacy_command_mapper import LegacyCommandMapper
from .thread_async_queue import ThreadAsyncQueue


class LegacyContextPlugin(AbstractPlugin):
    """A ProtocolEngine plugin to monitor and control an APIv2 protocol.

    In the legacy ProtocolContext, protocol execution is accomplished
    by direct communication with the HardwareControlAPI, as opposed to an
    intermediate layer like the ProtocolEngine. This plugin wraps up
    and hides this behavior, so the ProtocolEngine can monitor and control
    the run of a legacy protocol without affecting the execution of
    the protocol commands themselves.

    This plugin allows a ProtocolEngine to:

    1. Play/pause the protocol run using the HardwareControlAPI, as was done before
       the ProtocolEngine existed.
    2. Subscribe to what is being done with the legacy ProtocolContext,
       and insert matching commands into ProtocolEngine state for
       purely progress-tracking purposes.
    """

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        protocol_context: LegacyProtocolContext,
        legacy_command_mapper: Optional[LegacyCommandMapper] = None,
    ) -> None:
        """Initialize the plugin with its dependencies."""
        self._hardware_api = hardware_api
        self._protocol_context = protocol_context
        self._legacy_command_mapper = legacy_command_mapper or LegacyCommandMapper()

        # We use a non-blocking queue to communicate activity
        # from the APIv2 protocol, which is running in its own thread,
        # to the ProtocolEngine, which is running in the main thread's async event loop.
        #
        # The queue being non-blocking lets the protocol communicate its activity
        # instantly *even if the event loop is currently occupied by something else.*
        # Various things can accidentally occupy the event loop for too long.
        # So if the protocol had to wait for the event loop to be free
        # every time it reported some activity,
        # it could visibly stall for a moment, making its motion jittery.
        self._actions_to_dispatch = ThreadAsyncQueue[pe_actions.Action]()
        self._action_dispatching_task: Optional[Task[None]] = None

        self._subscription_exit_stack: Optional[ExitStack] = None

    def setup(self) -> None:
        """Set up the plugin.

        * Subscribe to the APIv2 context's message brokers to be informed
          of the APIv2 protocol's activity.
        * Kick off a background task to inform Protocol Engine of that activity.
        """
        context = self._protocol_context

        # Subscribe to activity on the APIv2 context,
        # and arrange to unsubscribe when this plugin is torn down.
        # Use an exit stack so if any part of this setup fails,
        # we clean up the parts that succeeded in reverse order.
        with ExitStack() as exit_stack:
            command_unsubscribe = context.broker.subscribe(
                topic="command",
                handler=self._handle_legacy_command,
            )
            exit_stack.callback(command_unsubscribe)

            labware_unsubscribe = context.labware_load_broker.subscribe(
                callback=self._handle_labware_loaded
            )
            exit_stack.callback(labware_unsubscribe)

            pipette_unsubscribe = context.instrument_load_broker.subscribe(
                callback=self._handle_instrument_loaded
            )
            exit_stack.callback(pipette_unsubscribe)

            module_unsubscribe = context.module_load_broker.subscribe(
                callback=self._handle_module_loaded
            )
            exit_stack.callback(module_unsubscribe)

            # All subscriptions succeeded.
            # Save the exit stack so our teardown method can use it later
            # to clean up these subscriptions.
            self._subscription_exit_stack = exit_stack.pop_all()

        # Kick off a background task to report activity to the ProtocolEngine.
        self._action_dispatching_task = create_task(self._dispatch_all_actions())

    async def teardown(self) -> None:
        """Tear down the plugin, undoing the work done in `setup()`.

        Called by Protocol Engine.
        At this point, the APIv2 protocol script must have exited.
        """
        self._actions_to_dispatch.done_putting()
        try:
            if self._action_dispatching_task is not None:
                await self._action_dispatching_task
                self._action_dispatching_task = None
        finally:
            if self._subscription_exit_stack is not None:
                self._subscription_exit_stack.close()
                self._subscription_exit_stack = None

    def handle_action(self, action: pe_actions.Action) -> None:
        """React to a ProtocolEngine action."""
        if isinstance(action, pe_actions.PlayAction):
            if self.state.commands.get_is_door_blocking():
                # This should happen only on first PlayAction of the protocol run
                self._hardware_api.pause(HardwarePauseType.PAUSE)
            else:
                self._hardware_api.resume(HardwarePauseType.PAUSE)
        elif (
            isinstance(action, pe_actions.PauseAction)
            and action.source == pe_actions.PauseSource.CLIENT
        ):
            self._hardware_api.pause(HardwarePauseType.PAUSE)
        elif (
            isinstance(action, pe_actions.HardwareEventAction)
            and not self.state.commands.get_is_implicitly_active()
            and isinstance(action.event, DoorStateNotification)
            and action.event.blocking
        ):
            self._hardware_api.pause(HardwarePauseType.PAUSE)

    def _handle_legacy_command(self, command: LegacyCommand) -> None:
        """Handle a command reported by the APIv2 protocol.

        Used as a broker callback, so this will run in the APIv2 protocol's thread.
        """
        pe_actions = self._legacy_command_mapper.map_command(command=command)
        for pe_action in pe_actions:
            self._actions_to_dispatch.put(pe_action)

    def _handle_labware_loaded(self, labware_load_info: LegacyLabwareLoadInfo) -> None:
        """Handle a labware load reported by the APIv2 protocol.

        Used as a broker callback, so this will run in the APIv2 protocol's thread.
        """
        pe_command = self._legacy_command_mapper.map_labware_load(
            labware_load_info=labware_load_info
        )
        pe_action = pe_actions.UpdateCommandAction(command=pe_command)
        self._actions_to_dispatch.put(pe_action)

    def _handle_instrument_loaded(
        self, instrument_load_info: LegacyInstrumentLoadInfo
    ) -> None:
        """Handle an instrument (pipette) load reported by the APIv2 protocol.

        Used as a broker callback, so this will run in the APIv2 protocol's thread.
        """
        pe_command = self._legacy_command_mapper.map_instrument_load(
            instrument_load_info=instrument_load_info
        )
        pe_action = pe_actions.UpdateCommandAction(command=pe_command)
        self._actions_to_dispatch.put(pe_action)

    def _handle_module_loaded(self, module_load_info: LegacyModuleLoadInfo) -> None:
        """Handle a module load reported by the APIv2 protocol.

        Used as a broker callback, so this will run in the APIv2 protocol's thread.
        """
        pe_command = self._legacy_command_mapper.map_module_load(
            module_load_info=module_load_info
        )
        pe_action = pe_actions.UpdateCommandAction(command=pe_command)
        self._actions_to_dispatch.put(pe_action)

    async def _dispatch_all_actions(self) -> None:
        """Dispatch all actions to the `ProtocolEngine`.

        Exits only when `self._actions_to_dispatch` is closed
        (or an unexpected exception is raised).
        """
        async for action in self._actions_to_dispatch.get_async_until_closed():
            self.dispatch(action)
