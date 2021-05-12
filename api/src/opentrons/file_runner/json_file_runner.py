"""File runner interfaces for JSON protocols."""
from opentrons.protocol_engine import ProtocolEngine
from opentrons.protocols.models import JsonProtocol
from opentrons.protocols.runner import CommandTranslator

from .abstract_file_runner import AbstractFileRunner
from .command_queue_worker import CommandQueueWorker


class JsonFileRunner(AbstractFileRunner):
    """JSON protocol file runner."""

    def __init__(
            self,
            protocol: JsonProtocol,
            protocol_engine: ProtocolEngine,
            command_translator: CommandTranslator,
            command_queue_worker: CommandQueueWorker) -> None:
        """JSON file runner constructor.

        Args:
            protocol: a JSON protocol
            protocol_engine: instance of the Protocol Engine
            command_translator: the JSON command translator
            command_queue_worker: Command Queue worker
        """
        self._protocol = protocol
        self._protocol_engine = protocol_engine
        self._command_translator = command_translator
        self._command_queue_worker = command_queue_worker

    def load(self) -> None:
        """Translate JSON commands and send them to protocol engine."""
        for json_cmd in self._protocol.commands:
            translated_items = self._command_translator.translate(json_cmd)
            for cmd in translated_items:
                self._protocol_engine.add_command(cmd)

    def play(self) -> None:
        """Start (or un-pause) running the JSON protocol file."""
        self._command_queue_worker.play()

    def pause(self) -> None:
        """Pause the running JSON protocol file's execution."""
        self._command_queue_worker.pause()

    def stop(self) -> None:
        """Cancel the running JSON protocol file."""
        self._command_queue_worker.stop()
