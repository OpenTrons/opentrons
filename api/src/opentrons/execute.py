""" opentrons.execute: functions and entrypoint for running protocols

This module has functions that can be imported to provide protocol
contexts for running protocols during interactive sessions like Jupyter or just
regular python shells. It also provides a console entrypoint for running a
protocol from the command line.
"""
import asyncio
import atexit
import argparse
import contextlib
import logging
import os
from pathlib import Path
import sys
import tempfile
from typing import (
    TYPE_CHECKING,
    BinaryIO,
    Callable,
    Dict,
    Generator,
    List,
    Optional,
    TextIO,
    Union,
)

from opentrons_shared_data.robot.dev_types import RobotType

from opentrons import protocol_api, __version__, should_use_ot3

from opentrons.commands import types as command_types

from opentrons.config import IS_ROBOT, JUPYTER_NOTEBOOK_LABWARE_DIR

from opentrons.hardware_control import (
    API as OT2API,
    HardwareControlAPI,
    ThreadManagedHardware,
    ThreadManager,
)

from opentrons.protocols import parse
from opentrons.protocols.api_support.deck_type import (
    guess_from_global_config as guess_deck_type_from_global_config,
)
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.execution import execute as execute_apiv2
from opentrons.protocols.types import (
    ApiDeprecationError,
    Protocol,
    PythonProtocol,
)

from opentrons.protocol_api.core.engine import ENGINE_CORE_API_VERSION
from opentrons.protocol_api.protocol_context import ProtocolContext

from opentrons.protocol_engine import (
    Config,
    DeckType,
    create_protocol_engine,
    create_protocol_engine_in_thread,
)

from opentrons.protocol_reader import ProtocolReader, ProtocolSource

from opentrons.protocol_runner import create_protocol_runner

from .util.entrypoint_util import (
    FoundLabware,
    labware_from_paths,
    datafiles_from_paths,
    copy_file_like,
)

if TYPE_CHECKING:
    from opentrons_shared_data.labware.dev_types import LabwareDefinition


_THREAD_MANAGED_HW: Optional[ThreadManagedHardware] = None
#: The background global cache that all protocol contexts created by
#: :py:meth:`get_protocol_api` will share


# When a ProtocolContext is using a ProtocolEngine to control the robot, it requires some
# additional long-lived resources besides _THREAD_MANAGED_HARDWARE. There's a background thread,
# an asyncio event loop in that thread, and some ProtocolEngine-controlled background tasks in that
# event loop.
#
# When we're executing a protocol file beginning-to-end, we can clean up those resources after it
# completes. However, when someone gets a live ProtocolContext through get_protocol_api(), we have
# no way of knowing when they're done with it. So, as a hack, we keep these resources open
# indefinitely, letting them leak.
#
# We keep this at module scope so that the contained context managers aren't garbage-collected.
# If they're garbage collected, they can close their resources prematurely.
# https://stackoverflow.com/a/69155026/497934
_LIVE_PROTOCOL_ENGINE_CONTEXTS = contextlib.ExitStack()


# See Jira RCORE-535.
_JSON_TOO_NEW_MESSAGE = (
    "Protocols created by recent versions of Protocol Designer"
    " cannot currently be executed with"
    " the opentrons_execute command-line tool"
    " or the opentrons.execute.execute() function."
    " Use the Opentrons App instead."
)


_EmitRunlogCallable = Callable[[command_types.CommandMessage], None]


def get_protocol_api(
    version: Union[str, APIVersion],
    bundled_labware: Optional[Dict[str, "LabwareDefinition"]] = None,
    bundled_data: Optional[Dict[str, bytes]] = None,
    extra_labware: Optional[Dict[str, "LabwareDefinition"]] = None,
) -> protocol_api.ProtocolContext:
    """
    Build and return a ``protocol_api.ProtocolContext``
    connected to the robot.

    This can be used to run protocols from interactive Python sessions
    such as Jupyter or an interpreter on the command line:

    .. code-block:: python

        >>> from opentrons.execute import get_protocol_api
        >>> protocol = get_protocol_api('2.0')
        >>> instr = protocol.load_instrument('p300_single', 'right')
        >>> instr.home()

    If ``extra_labware`` is not specified, any labware definitions saved in
    the ``labware`` directory of the Jupyter notebook directory will be
    available.

    When this function is called, modules and instruments will be recached.

    :param version: The API version to use. This must be lower than
                    ``opentrons.protocol_api.MAX_SUPPORTED_VERSION``.
                    It may be specified either as a string (``'2.0'``) or
                    as a ``protocols.types.APIVersion``
                    (``APIVersion(2, 0)``).
    :param bundled_labware: If specified, a mapping from labware names to
                            labware definitions for labware to consider in the
                            protocol. Note that if you specify this, _only_
                            labware in this argument will be allowed in the
                            protocol. This is preparation for a beta feature
                            and is best not used.
    :param bundled_data: If specified, a mapping from filenames to contents
                         for data to be available in the protocol from
                         ``protocol_api.ProtocolContext.bundled_data``.
    :param extra_labware: If specified, a mapping from labware names to
                          labware definitions for labware to consider in the
                          protocol in addition to those stored on the robot.
                          If this is an empty dict, and this function is called
                          on a robot, it will look in the 'labware'
                          subdirectory of the Jupyter data directory for
                          custom labware.
    :return: The protocol context.
    """
    if isinstance(version, str):
        checked_version = parse.version_from_string(version)
    elif not isinstance(version, APIVersion):
        raise TypeError("version must be either a string or an APIVersion")
    else:
        checked_version = version

    if extra_labware is None:
        extra_labware = {
            uri: details.definition for uri, details in _get_jupyter_labware().items()
        }

    robot_type = _get_robot_type()
    deck_type = guess_deck_type_from_global_config()

    hardware_controller = _get_global_hardware_controller(robot_type)

    if checked_version < ENGINE_CORE_API_VERSION:
        context = _create_live_context_non_pe(
            api_version=checked_version,
            deck_type=deck_type,
            hardware_api=hardware_controller,
            bundled_labware=bundled_labware,
            bundled_data=bundled_data,
            extra_labware=extra_labware,
        )
    else:
        if bundled_labware is not None:
            raise NotImplementedError(
                f"The bundled_labware argument is not currently supported for Python protocols"
                f" with apiLevel {ENGINE_CORE_API_VERSION} or newer."
            )
        context = _create_live_context_pe(
            api_version=checked_version,
            robot_type=robot_type,
            deck_type=guess_deck_type_from_global_config(),
            hardware_api=_THREAD_MANAGED_HW,  # type: ignore[arg-type]
            bundled_labware=bundled_labware,
            bundled_data=bundled_data,
            extra_labware=extra_labware,
        )

    hardware_controller.sync.cache_instruments()
    return context


def get_arguments(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    """Get the argument parser for this module

    Useful if you want to use this module as a component of another CLI program
    and want to add its arguments.

    :param parser: A parser to add arguments to.
    :returns argparse.ArgumentParser: The parser with arguments added.
    """
    parser.add_argument(
        "-l",
        "--log-level",
        choices=["debug", "info", "warning", "error", "none"],
        default="warning",
        help="Specify the level filter for logs to show on the command line. "
        "The logs stored in journald or local log files are unaffected by "
        "this option and should be configured in the config file. If "
        "'none', do not show logs",
    )
    parser.add_argument(
        "-L",
        "--custom-labware-path",
        action="append",
        default=[os.getcwd()],
        help="Specify directories to search for custom labware definitions. "
        "You can specify this argument multiple times. Once you specify "
        "a directory in this way, labware definitions in that directory "
        "will become available in ProtocolContext.load_labware(). "
        "Only directories specified directly by "
        "this argument are searched, not their children. JSON files that "
        "do not define labware will be ignored with a message. "
        "By default, the current directory (the one in which you are "
        "invoking this program) will be searched for labware.",
    )
    parser.add_argument(
        "-D",
        "--custom-data-path",
        action="append",
        nargs="?",
        const=".",
        default=[],
        help="Specify directories to search for custom data files. "
        "You can specify this argument multiple times. Once you specify "
        "a directory in this way, files located in the specified "
        "directory will be available in ProtocolContext.bundled_data. "
        "Note that bundle execution will still only allow data files in "
        "the bundle. If you specify this without a path, it will "
        "add the current path implicitly. If you do not specify this "
        "argument at all, no data files will be added. Any file in the "
        "specified paths will be loaded into memory and included in the "
        "bundle if --bundle is passed, so be careful that any directory "
        "you specify has only the files you want. It is usually a "
        "better idea to use -d so no files are accidentally included. "
        "Also note that data files are made available as their name, not "
        "their full path, so name them uniquely.",
    )
    parser.add_argument(
        "-d",
        "--custom-data-file",
        action="append",
        default=[],
        help="Specify data files to be made available in "
        "ProtocolContext.bundled_data (and possibly bundled if --bundle "
        "is passed). Can be specified multiple times with different "
        "files. It is usually a better idea to use this than -D because "
        "there is less possibility of accidentally including something.",
    )
    parser.add_argument(
        "protocol",
        metavar="PROTOCOL",
        type=argparse.FileType("rb"),
        help="The protocol file to execute. If you pass '-', you can pipe "
        "the protocol via stdin; this could be useful if you want to use this "
        "utility as part of an automated workflow.",
    )
    return parser


def execute(  # noqa: C901
    protocol_file: Union[BinaryIO, TextIO],
    protocol_name: str,
    propagate_logs: bool = False,
    log_level: str = "warning",
    emit_runlog: Optional[_EmitRunlogCallable] = None,
    custom_labware_paths: Optional[List[str]] = None,
    custom_data_paths: Optional[List[str]] = None,
) -> None:
    """
    Run the protocol itself.

    This is a one-stop function to run a protocol, whether python or json,
    no matter the api version, from external (i.e. not bound up in other
    internal server infrastructure) sources.

    To run an opentrons protocol from other places, pass in a file like
    object as protocol_file; this function either returns (if the run has no
    problems) or raises an exception.

    To call from the command line use either the autogenerated entrypoint
    ``opentrons_execute`` or ``python -m opentrons.execute``.

    :param protocol_file: The protocol file to execute
    :param protocol_name: The name of the protocol file. This is required
                          internally, but it may not be a thing we can get
                          from the protocol_file argument.
    :param propagate_logs: Whether this function should allow logs from the
                           Opentrons stack to propagate up to the root handler.
                           This can be useful if you're integrating this
                           function in a larger application, but most logs that
                           occur during protocol simulation are best associated
                           with the actions in the protocol that cause them.
                           Default: ``False``
    :param log_level: The level of logs to emit on the command line:
                      ``"debug"``, ``"info"``, ``"warning"``, or ``"error"``.
                      Defaults to ``"warning"``.
    :param emit_runlog: A callback for printing the runlog. If specified, this
                        will be called whenever a command adds an entry to the
                        runlog, which can be used for display and progress
                        estimation. If specified, the callback should take a
                        single argument (the name doesn't matter) which will
                        be a dictionary (see below). Default: ``None``
    :param custom_labware_paths: A list of directories to search for custom
                                 labware, or None. Ignored if the apiv2 feature
                                 flag is not set. Loads valid labware from
                                 these paths and makes them available to the
                                 protocol context.
    :param custom_data_paths: A list of directories or files to load custom
                              data files from. Ignored if the apiv2 feature
                              flag if not set. Entries may be either files or
                              directories. Specified files and the
                              non-recursive contents of specified directories
                              are presented by the protocol context in
                              ``ProtocolContext.bundled_data``.

    :raises Exception: If the device that you're running this on doesn't match the ``robotType``
        that the protocol declares in its ``requirements`` dict.

    The format of the runlog entries is as follows:

    .. code-block:: python

        {
            'name': command_name,
            'payload': {
                 'text': string_command_text,
                  # The rest of this struct is command-dependent; see
                  # opentrons.commands.commands. Its keys match format
                  # keys in 'text', so that
                  # entry['payload']['text'].format(**entry['payload'])
                  # will produce a string with information filled in
             }
        }
    """
    stack_logger = logging.getLogger("opentrons")
    stack_logger.propagate = propagate_logs
    stack_logger.setLevel(getattr(logging, log_level.upper(), logging.WARNING))

    contents = protocol_file.read()

    if custom_labware_paths:
        extra_labware = labware_from_paths(custom_labware_paths)
    else:
        extra_labware = _get_jupyter_labware()

    if custom_data_paths:
        extra_data = datafiles_from_paths(custom_data_paths)
    else:
        extra_data = {}

    try:
        protocol = parse.parse(
            contents,
            protocol_name,
            extra_labware={
                uri: details.definition for uri, details in extra_labware.items()
            },
            extra_data=extra_data,
        )
    except parse.JSONSchemaVersionTooNewError as e:
        if e.attempted_schema_version == 6:
            # See Jira RCORE-535.
            raise NotImplementedError(_JSON_TOO_NEW_MESSAGE) from e
        else:
            raise

    if protocol.api_level < APIVersion(2, 0):
        raise ApiDeprecationError(version=protocol.api_level)

    # Guard against trying to run protocols for the wrong robot type.
    # This matches what robot-server does.
    if protocol.robot_type != _get_robot_type():
        raise RuntimeError(
            f'This robot is of type "{_get_robot_type()}",'
            f' so it can\'t execute protocols for robot type "{protocol.robot_type}"'
        )

    if protocol.api_level < ENGINE_CORE_API_VERSION:
        _run_file_non_pe(
            protocol=protocol,
            emit_runlog=emit_runlog,
        )
    else:
        # TODO(mm, 2023-07-06): Once these NotImplementedErrors are resolved, consider removing
        # the enclosing if-else block and running everything through _run_file_pe() for simplicity.
        if emit_runlog:
            raise NotImplementedError(
                f"The emit_runlog argument is not currently supported for Python protocols"
                f" with apiLevel {ENGINE_CORE_API_VERSION} or newer."
            )
        if custom_data_paths:
            raise NotImplementedError(
                f"The custom_data_paths argument is not currently supported for Python protocols"
                f" with apiLevel {ENGINE_CORE_API_VERSION} or newer."
            )
        protocol_file.seek(0)
        _run_file_pe(
            protocol_file=protocol_file,
            protocol_name=protocol_name,
            extra_labware=extra_labware,
            hardware_api=_get_global_hardware_controller(_get_robot_type()).wrapped(),
        )


def make_runlog_cb() -> Callable[[command_types.CommandMessage], None]:
    level = 0
    last_dollar = None

    def _print_runlog(command: command_types.CommandMessage) -> None:
        nonlocal level
        nonlocal last_dollar

        if last_dollar == command["$"]:
            if command["$"] == "before":
                level += 1
            else:
                level -= 1
        last_dollar = command["$"]
        if command["$"] == "before":
            print(" ".join(["\t" * level, command["payload"].get("text", "")]))

    return _print_runlog


def main() -> int:
    """Handler for command line invocation to run a protocol.

    :param argv: The arguments the program was invoked with; this is usually
                 :py:obj:`sys.argv` but if you want to override that you can.
    :returns int: A success or failure value suitable for use as a shell
                  return code passed to :py:obj:`sys.exit` (0 means success,
                  anything else is a kind of failure).
    """
    parser = argparse.ArgumentParser(
        prog="opentrons_execute", description="Run an OT-2 protocol"
    )
    parser = get_arguments(parser)
    # don't want to add this in get_arguments because if somebody upstream is
    # using that parser they probably want their own version
    parser.add_argument("-v", "--version", action="version", version=__version__)
    parser.add_argument(
        "-n",
        "--no-print-runlog",
        action="store_true",
        help="Do not print the commands as they are executed",
    )
    args = parser.parse_args()
    printer = None if args.no_print_runlog else make_runlog_cb()
    if args.log_level != "none":
        stack_logger = logging.getLogger("opentrons")
        stack_logger.addHandler(logging.StreamHandler(sys.stdout))
        log_level = args.log_level
    else:
        log_level = "warning"
    # Try to migrate containers from database to v2 format
    execute(
        args.protocol,
        args.protocol.name,
        log_level=log_level,
        emit_runlog=printer,
    )
    return 0


def _create_live_context_non_pe(
    api_version: APIVersion,
    hardware_api: ThreadManagedHardware,
    deck_type: str,
    extra_labware: Optional[Dict[str, "LabwareDefinition"]],
    bundled_labware: Optional[Dict[str, "LabwareDefinition"]],
    bundled_data: Optional[Dict[str, bytes]],
) -> ProtocolContext:
    """Return a live ProtocolContext.

    This controls the robot through the older infrastructure, instead of through Protocol Engine.
    """
    assert api_version < ENGINE_CORE_API_VERSION
    return protocol_api.create_protocol_context(
        api_version=api_version,
        deck_type=deck_type,
        hardware_api=hardware_api,
        bundled_labware=bundled_labware,
        bundled_data=bundled_data,
        extra_labware=extra_labware,
    )


def _create_live_context_pe(
    api_version: APIVersion,
    hardware_api: ThreadManagedHardware,
    robot_type: RobotType,
    deck_type: str,
    extra_labware: Optional[Dict[str, "LabwareDefinition"]],
    bundled_labware: Optional[Dict[str, "LabwareDefinition"]],
    bundled_data: Optional[Dict[str, bytes]],
) -> ProtocolContext:
    """Return a live ProtocolContext that controls the robot through ProtocolEngine."""
    assert api_version >= ENGINE_CORE_API_VERSION

    global _LIVE_PROTOCOL_ENGINE_CONTEXTS
    pe, loop = _LIVE_PROTOCOL_ENGINE_CONTEXTS.enter_context(
        create_protocol_engine_in_thread(
            hardware_api=hardware_api.wrapped(),
            config=_get_protocol_engine_config(),
        )
    )

    return protocol_api.create_protocol_context(
        api_version=api_version,
        hardware_api=hardware_api,
        deck_type=deck_type,
        protocol_engine=pe,
        protocol_engine_loop=loop,
        bundled_data=bundled_data,
    )


def _run_file_non_pe(
    protocol: Protocol,
    emit_runlog: Optional[_EmitRunlogCallable],
) -> None:
    """Run a protocol file without Protocol Engine, with the older infrastructure instead."""
    if isinstance(protocol, PythonProtocol):
        extra_labware = protocol.extra_labware
        bundled_labware = protocol.bundled_labware
        bundled_data = protocol.bundled_data
    else:
        # JSON protocols do have "bundled labware" embedded in them, but those aren't represented in
        # the parsed Protocol object and we don't need to create the ProtocolContext with them.
        # execute_apiv2.run_protocol() will pull them out of the JSON and load them into the
        # ProtocolContext.
        extra_labware = None
        bundled_labware = None
        bundled_data = None

    context = _create_live_context_non_pe(
        api_version=protocol.api_level,
        hardware_api=_get_global_hardware_controller(_get_robot_type()),
        deck_type=guess_deck_type_from_global_config(),
        extra_labware=extra_labware,
        bundled_labware=bundled_labware,
        bundled_data=bundled_data,
    )

    if emit_runlog:
        context.broker.subscribe(command_types.COMMAND, emit_runlog)

    context.home()
    try:
        execute_apiv2.run_protocol(protocol, context)
    finally:
        context.cleanup()


def _run_file_pe(
    protocol_file: Union[BinaryIO, TextIO],
    protocol_name: str,
    extra_labware: Dict[str, FoundLabware],
    hardware_api: HardwareControlAPI,
) -> None:
    """Run a protocol file with Protocol Engine."""

    async def run(protocol_source: ProtocolSource) -> None:
        protocol_engine = await create_protocol_engine(
            hardware_api=hardware_api,
            config=_get_protocol_engine_config(),
        )

        protocol_runner = create_protocol_runner(
            protocol_config=protocol_source.config,
            protocol_engine=protocol_engine,
            hardware_api=hardware_api,
        )

        # TODO(mm, 2023-06-30): This will home and drop tips at the end, which is not how
        # things have historically behaved with PAPIv2.13 and older or JSONv5 and older.
        await protocol_runner.run(protocol_source)

    with _adapt_protocol_source(
        protocol_file=protocol_file,
        protocol_name=protocol_name,
        extra_labware=extra_labware,
    ) as protocol_source:
        asyncio.run(run(protocol_source))


def _get_robot_type() -> RobotType:
    """Return what kind of robot we're currently running on."""
    return "OT-3 Standard" if should_use_ot3() else "OT-2 Standard"


def _get_protocol_engine_config() -> Config:
    """Return a Protocol Engine config to execute protocols on this device."""
    return Config(
        robot_type=_get_robot_type(),
        deck_type=DeckType(guess_deck_type_from_global_config()),
        # We deliberately omit ignore_pause=True because, in the current implementation of
        # opentrons.protocol_api.core.engine, that would incorrectly make
        # ProtocolContext.is_simulating() return True.
    )


def _get_jupyter_labware() -> Dict[str, FoundLabware]:
    """Return labware files in this robot's Jupyter Notebook directory."""
    if IS_ROBOT:
        # JUPYTER_NOTEBOOK_LABWARE_DIR should never be None when IS_ROBOT == True.
        assert JUPYTER_NOTEBOOK_LABWARE_DIR is not None
        if JUPYTER_NOTEBOOK_LABWARE_DIR.is_dir():
            return labware_from_paths([JUPYTER_NOTEBOOK_LABWARE_DIR])

    return {}


@contextlib.contextmanager
def _adapt_protocol_source(
    protocol_file: Union[BinaryIO, TextIO],
    protocol_name: str,
    extra_labware: Dict[str, FoundLabware],
) -> Generator[ProtocolSource, None, None]:
    """Create a `ProtocolSource` representing input protocol files."""
    with tempfile.TemporaryDirectory() as temporary_directory:
        # It's not well-defined in our customer-facing interfaces whether the supplied protocol_name
        # should be just the filename part, or a path with separators. In case it contains stuff
        # like "../", sanitize it to just the filename part so we don't save files somewhere bad.
        safe_protocol_name = Path(protocol_name).name

        temp_protocol_file = Path(temporary_directory) / safe_protocol_name

        # FIXME(mm, 2023-06-26): Copying this file is pure overhead, and it introduces encoding
        # hazards. Remove this when we can parse JSONv6+ and PAPIv2.14+ protocols without going
        # through the filesystem. https://opentrons.atlassian.net/browse/RSS-281
        copy_file_like(source=protocol_file, destination=temp_protocol_file)

        custom_labware_files = [labware.path for labware in extra_labware.values()]

        protocol_source = asyncio.run(
            ProtocolReader().read_saved(
                files=[temp_protocol_file] + custom_labware_files,
                directory=None,
                files_are_prevalidated=False,
            )
        )

        yield protocol_source


def _get_global_hardware_controller(robot_type: RobotType) -> ThreadManagedHardware:
    # Build a hardware controller in a worker thread, which is necessary
    # because ipython runs its notebook in asyncio but the notebook
    # is at script/repl scope not function scope and is synchronous so
    # you can't control the loop from inside. If we update to
    # IPython 7 we can avoid this, but for now we can't
    global _THREAD_MANAGED_HW
    if not _THREAD_MANAGED_HW:
        if robot_type == "OT-3 Standard":
            # Conditional import because this isn't installed on OT-2s.
            from opentrons.hardware_control.ot3api import OT3API

            _THREAD_MANAGED_HW = ThreadManager(OT3API.build_hardware_controller)
        else:
            _THREAD_MANAGED_HW = ThreadManager(OT2API.build_hardware_controller)

    return _THREAD_MANAGED_HW


@atexit.register
def _clear_cached_hardware_controller() -> None:
    global _THREAD_MANAGED_HW
    if _THREAD_MANAGED_HW:
        _THREAD_MANAGED_HW.clean_up()
        _THREAD_MANAGED_HW = None


if __name__ == "__main__":
    sys.exit(main())
