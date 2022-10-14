"""Protocol run control and management."""
from typing import List, NamedTuple, Optional

from opentrons.broker import Broker
from opentrons.equipment_broker import EquipmentBroker
from opentrons.config import feature_flags
from opentrons.hardware_control import HardwareControlAPI
from opentrons.protocol_reader import (
    ProtocolSource,
    PythonProtocolConfig,
    JsonProtocolConfig,
)
from opentrons.protocol_engine import ProtocolEngine, StateSummary, Command
from opentrons.protocol_engine.errors.exceptions import CommandDoesNotExistError

from .task_queue import TaskQueue
from .json_file_reader import JsonFileReader
from .json_translator import JsonTranslator
from .python_file_reader import PythonFileReader
from .python_context_creator import PythonContextCreator
from .python_executor import PythonExecutor
from .legacy_context_plugin import LegacyContextPlugin
from .legacy_wrappers import (
    LEGACY_PYTHON_API_VERSION_CUTOFF,
    LEGACY_JSON_SCHEMA_VERSION_CUTOFF,
    LegacyFileReader,
    LegacyContextCreator,
    LegacyExecutor,
    LegacyLoadInfo,
)


class ProtocolRunResult(NamedTuple):
    """Result data from a run, pulled from the ProtocolEngine."""

    commands: List[Command]
    state_summary: StateSummary


# TODO(mc, 2022-01-11): this class has become bloated. Split into an abstract
# interfaces and several concrete implementations per protocol type
class ProtocolRunner:
    """An interface to manage and control a protocol run.

    The ProtocolRunner is primarily responsible for feeding a ProtocolEngine
    with commands and control signals. These commands and signals are
    generated by protocol files, hardware signals, or externally via
    the HTTP robot-server.

    A ProtocolRunner controls a single run. Once the run is finished,
    you will need a new ProtocolRunner to do another run.
    """

    def __init__(
        self,
        protocol_engine: ProtocolEngine,
        hardware_api: HardwareControlAPI,
        task_queue: Optional[TaskQueue] = None,
        json_file_reader: Optional[JsonFileReader] = None,
        json_translator: Optional[JsonTranslator] = None,
        python_file_reader: Optional[PythonFileReader] = None,
        python_context_creator: Optional[PythonContextCreator] = None,
        python_executor: Optional[PythonExecutor] = None,
        legacy_file_reader: Optional[LegacyFileReader] = None,
        legacy_context_creator: Optional[LegacyContextCreator] = None,
        legacy_executor: Optional[LegacyExecutor] = None,
    ) -> None:
        """Initialize the ProtocolRunner with its dependencies."""
        self._protocol_engine = protocol_engine
        self._hardware_api = hardware_api
        self._json_file_reader = json_file_reader or JsonFileReader()
        self._json_translator = json_translator or JsonTranslator()
        self._python_file_reader = python_file_reader or PythonFileReader()
        self._python_context_creator = python_context_creator or PythonContextCreator()
        self._python_executor = python_executor or PythonExecutor()
        self._legacy_file_reader = legacy_file_reader or LegacyFileReader()
        self._legacy_context_creator = legacy_context_creator or LegacyContextCreator(
            hardware_api=hardware_api,
            protocol_engine=protocol_engine,
        )
        self._legacy_executor = legacy_executor or LegacyExecutor()
        # TODO(mc, 2022-01-11): replace task queue with specific implementations
        # of runner interface
        self._task_queue = task_queue or TaskQueue(cleanup_func=protocol_engine.finish)

    def was_started(self) -> bool:
        """Whether the runner has been started.

        This value is latched; once it is True, it will never become False.
        """
        return self._protocol_engine.state_view.commands.has_been_played()

    def load(self, protocol_source: ProtocolSource) -> None:
        """Load a ProtocolSource into managed ProtocolEngine.

        Calling this method is only necessary if the runner will be used
        to control the run of a file-based protocol.
        """
        config = protocol_source.config

        for definition in protocol_source.labware_definitions:
            self._protocol_engine.add_labware_definition(definition)

        if isinstance(config, JsonProtocolConfig):
            schema_version = config.schema_version

            if schema_version >= LEGACY_JSON_SCHEMA_VERSION_CUTOFF:
                self._load_json(protocol_source)
            else:
                self._load_legacy(protocol_source)

        elif isinstance(config, PythonProtocolConfig):
            api_version = config.api_version

            if api_version >= LEGACY_PYTHON_API_VERSION_CUTOFF:
                self._load_python(protocol_source)
            else:
                self._load_legacy(protocol_source)

    def play(self) -> None:
        """Start or resume the run."""
        self._protocol_engine.play()

    def pause(self) -> None:
        """Pause the run."""
        self._protocol_engine.pause()

    async def stop(self) -> None:
        """Stop (cancel) the run."""
        if self.was_started():
            await self._protocol_engine.stop()
        else:
            await self._protocol_engine.finish(
                drop_tips_and_home=False,
                set_run_status=False,
            )

    async def run(
        self,
        protocol_source: Optional[ProtocolSource] = None,
    ) -> ProtocolRunResult:
        """Run a given protocol to completion."""
        # TODO(mc, 2022-01-11): move load to runner creation, remove from `run`
        # currently `protocol_source` arg is only used by tests
        if protocol_source:
            self.load(protocol_source)

        await self._hardware_api.home()
        self.play()
        self._task_queue.start()
        await self._task_queue.join()

        run_data = self._protocol_engine.state_view.get_summary()
        commands = self._protocol_engine.state_view.commands.get_all()
        return ProtocolRunResult(commands=commands, state_summary=run_data)

    def _load_json(self, protocol_source: ProtocolSource) -> None:
        protocol = self._json_file_reader.read(protocol_source)
        commands = self._json_translator.translate_commands(protocol)

        if not feature_flags.enable_load_liquid() and any(
            c.commandType != "loadLiquid" for c in commands
        ):
            raise CommandDoesNotExistError("loadLiquid command is not yet supported.")

        if feature_flags.enable_load_liquid():
            liquids = self._json_translator.translate_liquids(protocol)
            for liquid in liquids:
                self._protocol_engine.add_liquid(liquid=liquid)

        for command in commands:
            self._protocol_engine.add_command(request=command)
        self._task_queue.set_run_func(func=self._protocol_engine.wait_until_complete)

    def _load_python(self, protocol_source: ProtocolSource) -> None:
        protocol = self._python_file_reader.read(protocol_source)
        context = self._python_context_creator.create(self._protocol_engine)
        self._task_queue.set_run_func(
            func=self._python_executor.execute,
            protocol=protocol,
            context=context,
        )

    def _load_legacy(
        self,
        protocol_source: ProtocolSource,
    ) -> None:
        protocol = self._legacy_file_reader.read(protocol_source)
        broker = None
        equipment_broker = None

        if not feature_flags.enable_protocol_engine_papi_core():
            broker = Broker()
            equipment_broker = EquipmentBroker[LegacyLoadInfo]()

            self._protocol_engine.add_plugin(
                LegacyContextPlugin(broker=broker, equipment_broker=equipment_broker)
            )

        context = self._legacy_context_creator.create(
            protocol=protocol,
            broker=broker,
            equipment_broker=equipment_broker,
        )

        self._task_queue.set_run_func(
            func=self._legacy_executor.execute,
            protocol=protocol,
            context=context,
        )
