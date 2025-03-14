"""
This module handles configuration management. It keeps track of where the
configuration data is found in the robot, and is able to search for data to
construct an index if an existing index is not found. All other modules that
use persistent configuration data should use this module to read and write it.

The settings file defined here is opentrons.json. This file should be located

- On the robot, in /data
- Not on the robot, either in
  - the directory from which the python importing this module was launched
  - ~/.opentrons for the current user (where it will be written if nothing is
    found)

The keys in opentrons.json are defined by the CONFIG_ELEMENTS tuple below.
The keys in the file are the name elements of the CONFIG_ELEMENTS. They can
also be specified via environment variables, the names of which are
OT_API_${UPPERCASED_NAME_ELEMENT}. For instance, to override the
robot_settings_file option from an environment variable, you would set the
OT_API_ROBOT_CONFIG_FILE variable.

This module's interface to the rest of the system are the IS_* attributes and
the CONFIG attribute.
"""
import enum
import os
import json
import logging
from pathlib import Path
import re
import shutil
import subprocess
import sys
from enum import Enum, auto
from typing import Dict, NamedTuple, Optional, cast

_CONFIG_FILENAME = "config.json"
_LEGACY_INDICES = (
    Path("/mnt") / "usbdrive" / "config" / "index.json",
    Path("/data") / "index.json",
)

log = logging.getLogger(__file__)

IS_WIN = sys.platform.startswith("win")
IS_OSX = sys.platform == "darwin"
IS_LINUX = sys.platform.startswith("linux")
IS_ROBOT = bool(
    IS_LINUX
    and (os.environ.get("RUNNING_ON_PI") or os.environ.get("RUNNING_ON_VERDIN"))
)
#: This is the correct thing to check to see if we’re running on a robot
IS_VIRTUAL = bool(os.environ.get("ENABLE_VIRTUAL_SMOOTHIE"))


class SystemArchitecture(Enum):
    HOST = auto()
    BUILDROOT = auto()
    YOCTO = auto()


ROBOT_FIRMWARE_DIR: Optional[Path] = None
#: The path to firmware files for modules

ARCHITECTURE: SystemArchitecture = SystemArchitecture.HOST
#: The system architecture running

JUPYTER_NOTEBOOK_ROOT_DIR: Optional[Path] = None
#: The path to the root dir for Jupyter

JUPYTER_NOTEBOOK_LABWARE_DIR: Optional[Path] = None
#: The path to labware installs for jupyter

OT_SYSTEM_VERSION = "0.0.0"
#: The semver string of the system


if IS_ROBOT:
    if "OT_SYSTEM_VERSION" in os.environ:
        OT_SYSTEM_VERSION = os.environ["OT_SYSTEM_VERSION"]
        ARCHITECTURE = SystemArchitecture.YOCTO
    else:
        try:
            with open("/etc/VERSION.json") as vj:
                contents = json.load(vj)
            OT_SYSTEM_VERSION = contents["buildroot_version"]
            ARCHITECTURE = SystemArchitecture.BUILDROOT
        except Exception:
            log.exception("Could not find version file in /etc/VERSION.json")
    ROBOT_FIRMWARE_DIR = Path("/usr/lib/firmware/")
    JUPYTER_NOTEBOOK_ROOT_DIR = Path("/var/lib/jupyter/notebooks/")
    JUPYTER_NOTEBOOK_LABWARE_DIR = JUPYTER_NOTEBOOK_ROOT_DIR / "labware"


def name() -> str:
    if IS_ROBOT and ARCHITECTURE in (
        SystemArchitecture.BUILDROOT,
        SystemArchitecture.YOCTO,
    ):
        # Read the name from the machine's pretty hostname, which is maintained
        # by update-server. This retrieval logic needs to be kept in sync with
        # update-server.

        # NOTE: This call to hostnamectl can fail momentarily if it runs
        # at the same time as a systemd-hostnamed restart.
        # update-server triggers such restarts regularly, any time the name changes.
        #
        # We let the exception propagate so the caller (probably an HTTP client
        # polling /health) can retry later.
        result = subprocess.check_output(["hostnamectl", "--pretty", "status"]).decode(
            "utf-8"
        )

        # Strip the trailing newline, since it's not part of the actual name value.
        # TODO(mm, 2022-07-18): When we upgrade to systemd 249, use
        # `hostnamectl --json` for CLI output that we can parse more robustly.
        assert len(result) >= 1 and result[-1] == "\n"
        return result[:-1]

    else:
        robot_name = "opentrons-dev"
        if "DEV_ROBOT_NAME" in os.environ.keys():
            robot_name = os.environ["DEV_ROBOT_NAME"]
        return robot_name


class ConfigElementType(enum.Enum):
    FILE = enum.auto()
    DIR = enum.auto()


class ConfigElement(NamedTuple):
    name: str
    display_name: str
    default: Path
    kind: ConfigElementType
    help: str


CONFIG_ELEMENTS = (
    ConfigElement(
        "labware_database_file",
        "API V1 Labware Database",
        Path("opentrons.db"),
        ConfigElementType.FILE,
        (
            "A SQLite database where labware definitions and offsets were stored."
            " No longer used as of v4."
        ),
    ),
    ConfigElement(
        "labware_calibration_offsets_dir_v2",
        "API V2 Calibration Offsets Directory",
        Path("labware") / "v2" / "offsets",
        ConfigElementType.DIR,
        "A location where labware offsets were stored. No longer used as of v5.",
    ),
    ConfigElement(
        "labware_user_definitions_dir_v2",
        "API V2 Custom Labware Directory",
        Path("labware") / "v2" / "custom_definitions",
        ConfigElementType.DIR,
        (
            "A location where custom labware definitions may be stored."
            " Usage not recommended."
        ),
    ),
    ConfigElement(
        "feature_flags_file",
        "Feature Flags",
        Path("feature_flags.json"),
        ConfigElementType.FILE,
        "The file storing the advanced feature flags.",
    ),
    ConfigElement(
        "robot_settings_file",
        "Robot Settings",
        Path("robot_settings.json"),
        ConfigElementType.FILE,
        "The file storing settings relevant to motion",
    ),
    ConfigElement(
        "deck_calibration_file",
        "Deck Calibration",
        Path("deck_calibration.json"),
        ConfigElementType.FILE,
        "The file storing the deck calibration. Superseded in v4 by robot_calibration_dir.",
    ),
    ConfigElement(
        "log_dir",
        "Log Directory",
        Path("logs"),
        ConfigElementType.FILE,
        "The location for saving log files",
    ),
    ConfigElement(
        "api_log_file",
        "API Log File",
        Path("logs") / "api.log",
        ConfigElementType.FILE,
        "The location of the file to save API logs to. If this is an"
        " absolute path, it will be used directly. If it is a "
        "relative path it will be relative to log_dir",
    ),
    ConfigElement(
        "sensor_log_file",
        "Sensor Log File",
        Path("logs") / "sensor.log",
        ConfigElementType.FILE,
        "The location of the file to save sensor logs to. If this is an"
        " absolute path, it will be used directly. If it is a "
        "relative path it will be relative to log_dir",
    ),
    ConfigElement(
        "move_profile_log_file",
        "Move Profile File",
        Path("logs") / "profile.log",
        ConfigElementType.FILE,
        "The location of the file to save move profile logs to. If this is an"
        " absolute path, it will be used directly. If it is a "
        "relative path it will be relative to log_dir",
    ),
    ConfigElement(
        "serial_log_file",
        "Serial Log File",
        Path("logs") / "serial.log",
        ConfigElementType.FILE,
        "The location of the file to save serial logs to. If this is"
        " an absolute path, it will be used directly. If it is a "
        "relative path it will be relative to log_dir"
        "The location of the file to save serial logs to",
    ),
    # Unlike other config elements, the wifi keys dir is still in
    # /data/user_storage/opentrons_data because these paths are fed directly to
    # NetworkManager and stored in connections files there. To change this
    # directory, we would have to modify those connections files, presumably on
    # boot, which is a level of complexity that makes it worth having an
    # annoying path.
    ConfigElement(
        "wifi_keys_dir",
        "Wifi Keys Dir",
        Path("user_storage/opentrons_data/network_keys"),
        ConfigElementType.DIR,
        "The directory in which to save any key material for wifi"
        " auth. Not relevant outside of a robot.",
    ),
    ConfigElement(
        "hardware_controller_lockfile",
        "Hardware Controller Lockfile",
        Path("hardware.lock"),
        ConfigElementType.FILE,
        "The file to use for a hardware controller lockfile.",
    ),
    ConfigElement(
        "pipette_config_overrides_dir",
        "Pipette Config User Overrides",
        Path("pipettes"),
        ConfigElementType.DIR,
        "The dir where settings overrides for pipettes are stored",
    ),
    ConfigElement(
        "tip_length_calibration_dir",
        "Tip Length Calibration Directory",
        Path("tip_lengths"),
        ConfigElementType.DIR,
        "The dir where tip length calibration of each tiprack for "
        "each unique pipette is stored",
    ),
    ConfigElement(
        "robot_calibration_dir",
        "Robot Calibration Directory",
        Path("robot"),
        ConfigElementType.DIR,
        "The dir where robot calibration is stored",
    ),
    ConfigElement(
        "pipette_calibration_dir",
        "Pipette Calibration Directory",
        Path("robot") / "pipettes",
        ConfigElementType.DIR,
        "The dir where pipette calibration is stored",
    ),
    ConfigElement(
        "custom_tiprack_dir",
        "Custom Tiprack Directory",
        Path("tip_lengths") / "custom_tiprack_definitions",
        ConfigElementType.DIR,
        "The dir where custom tiprack definitions for tip length "
        "calibration are stored",
    ),
    ConfigElement(
        "gripper_calibration_dir",
        "Gripper Calibration Directory",
        Path("robot") / "gripper",
        ConfigElementType.DIR,
        "The dir where gripper calibration is stored",
    ),
    ConfigElement(
        "module_calibration_dir",
        "Module Calibration Directory",
        Path("robot") / "modules",
        ConfigElementType.DIR,
        "The dir where module calibration is stored",
    ),
    ConfigElement(
        "performance_metrics_dir",
        "Performance Metrics Directory",
        Path("performance_metrics_data"),
        ConfigElementType.DIR,
        "The dir where performance metrics are stored",
    ),
)
#: The available configuration file elements to modify. All of these can be
#: changed by editing opentrons.json, where the keys are the name elements,
#: or by specifying as environment variables, where the keys are uppercase
#: versions of the name elements.
#: In addition to these flags, the OT_API_CONFIG_DIR env var (if present)
#: will change where the API looks for these settings by prepending it to the
#: normal search path.


def infer_config_base_dir() -> Path:
    """Return the directory to store data in.

    Defaults are ~/.opentrons if not on a pi; OT_API_CONFIG_DIR is
    respected here.

    When this module is imported, this function is called automatically
    and the result stored in :py:attr:`APP_DATA_DIR`.

    This directory may not exist when the module is imported. Even if it
    does exist, it may not contain data, or may require data to be moved
    to it.

    :return pathlib.Path: The path to the desired root settings dir.
    """
    if "OT_API_CONFIG_DIR" in os.environ:
        return Path(os.environ["OT_API_CONFIG_DIR"])
    elif IS_ROBOT:
        return Path("/data")
    else:
        search = (Path.cwd(), Path.home() / ".opentrons")
        for path in search:
            if (path / _CONFIG_FILENAME).exists():
                return path
        else:
            return search[-1]


def load_and_migrate() -> Dict[str, Path]:
    """Ensure the settings directory tree is properly configured.

    This function does most of its work on the actual robot. It will move
    all settings files from wherever they happen to be to the proper
    place. On non-robots, this mostly just loads. In addition, it writes
    a default config and makes sure all directories required exist (though
    the files in them may not).
    """
    if IS_ROBOT and ARCHITECTURE != SystemArchitecture.YOCTO:
        _migrate_robot()
    base = infer_config_base_dir()
    base.mkdir(parents=True, exist_ok=True)
    index = _load_with_overrides(base)
    return _ensure_paths_and_types(index)


def _load_with_overrides(base: Path) -> Dict[str, str]:
    """Load an config or write its defaults"""
    should_write = False
    overrides = _get_environ_overrides()
    try:
        with (base / _CONFIG_FILENAME).open() as file:
            index = json.load(file)
    except (OSError, json.JSONDecodeError):
        should_write = True
        index = generate_config_index(overrides)

    for key in CONFIG_ELEMENTS:
        if key.name not in index:
            if key.kind in (ConfigElementType.DIR, ConfigElementType.FILE):
                index[key.name] = base / key.default
            else:
                index[key.name] = key.default
            should_write = True

    if should_write:
        try:
            write_config(index, path=base)
        except Exception as e:
            sys.stderr.write(
                "Error writing config to {}: {}\nProceeding memory-only\n".format(
                    str(base), e
                )
            )
    index.update(overrides)
    return cast(Dict[str, str], index)


def _ensure_paths_and_types(index: Dict[str, str]) -> Dict[str, Path]:
    """Take the direct results of loading the config and make sure
    the filesystem reflects them.
    """
    configs_by_name = {ce.name: ce for ce in CONFIG_ELEMENTS}
    correct_types: Dict[str, Path] = {}
    for key, item in index.items():
        if key not in configs_by_name:  # old config, ignore
            continue
        if configs_by_name[key].kind == ConfigElementType.FILE:
            it = Path(item)
            it.parent.mkdir(parents=True, exist_ok=True)
            correct_types[key] = it
        elif configs_by_name[key].kind == ConfigElementType.DIR:
            it = Path(item)
            it.mkdir(parents=True, exist_ok=True)
            correct_types[key] = it
        else:
            raise RuntimeError(
                f"unhandled kind in ConfigElements: {key}: "
                f"{configs_by_name[key].kind}"
            )
    return correct_types


def _get_environ_overrides() -> Dict[str, str]:
    """Pull any overrides for the config elements from the environ and return
    a mapping from the names to the values (as strings). Config elements that
    are not overridden will not be in the mapping.
    """
    return {
        ce.name: os.environ["OT_API_" + ce.name.upper()]
        for ce in CONFIG_ELEMENTS
        if "OT_API_" + ce.name.upper() in os.environ
    }


def _legacy_index() -> Optional[Dict[str, str]]:
    """Try and load an index file from the various places it might exist.

    If the legacy file cannot be found or cannot be parsed, return None.

    This method should only be called on a robot.
    """
    for index in _LEGACY_INDICES:
        if index.exists():
            try:
                with open(index) as file:
                    return cast(Dict[str, str], json.load(file))
            except (OSError, json.JSONDecodeError):
                return None
    return None


def _erase_old_indices() -> None:
    """Remove old index files so they don't pollute future loads.

    This method should only be called on a robot.
    """
    for index in _LEGACY_INDICES:
        if index.exists():
            index.unlink()


def _find_most_recent_backup(normal_path: Optional[str]) -> Optional[str]:
    """Find the most recent old settings to migrate.

    The input is the path to an unqualified settings file - e.g.
    /mnt/usbdrive/config/robotSettings.json

    This will return
    - None if the input is None (to support chaining from dict.get())
    - The input if it exists, or
    - The file named normal_path-TIMESTAMP.json with the highest timestamp
      if one can be found, or
    - None
    """
    if normal_path is None:
        return None

    if os.path.exists(normal_path):
        return normal_path

    dirname, basename = os.path.split(normal_path)
    root, ext = os.path.splitext(basename)
    backups = [
        fi for fi in os.listdir(dirname) if fi.startswith(root) and fi.endswith(ext)
    ]
    ts_re = re.compile(r".*-([0-9]+)" + ext + "$")

    def ts_compare(filename: str) -> int:
        match = ts_re.match(filename)
        if not match:
            return -1
        else:
            return int(match.group(1))

    backups_sorted = sorted(backups, key=ts_compare)
    if not backups_sorted:
        return None
    return os.path.join(dirname, backups_sorted[-1])


def _do_migrate(index: Dict[str, str]) -> None:
    base = infer_config_base_dir()
    new_index = generate_config_index(_get_environ_overrides(), base)
    moves = (
        (
            "/data/user_storage/opentrons_data/opentrons.db",
            new_index["labware_database_file"],
        ),
        (
            _find_most_recent_backup(index.get("robotSettingsFile")),
            new_index["robot_settings_file"],
        ),
        (index.get("deckCalibrationFile"), new_index["deck_calibration_file"]),
        (index.get("featureFlagFile"), new_index["feature_flags_file"]),
    )
    sys.stdout.write(f"config migration: new base {base}\n")
    for old, new in moves:
        if not old:
            continue
        old_path = Path(old)
        new_path = Path(new)
        if old_path.exists() and not old_path.is_symlink():
            sys.stdout.write(f"config migration: {old}->{new}\n")
            if new_path.is_dir():
                shutil.rmtree(new_path)
            shutil.move(str(old_path), str(new_path))
        else:
            sys.stdout.write(f"config migration: not moving {old}:")
            sys.stdout.write(f" exists={old_path.exists()}")
            sys.stdout.write(f" symlink={old_path.is_symlink()}\n")

    write_config(new_index, base)


def _migrate_robot() -> None:
    old_index = _legacy_index()
    if old_index:
        _do_migrate(old_index)
        _erase_old_indices()


def generate_config_index(
    defaults: Dict[str, str], base_dir: Optional[Path] = None
) -> Dict[str, Path]:
    """
    Determines where existing info can be found in the system, and creates a
    corresponding data dict that can be written to index.json in the
    baseDataDir.

    The information in the files defined by the config index is information
    required by the API itself and nothing else - labware definitions, feature
    flags, robot configurations. It does not include configuration files that
    relate to the rest of the system, such as network description file
    definitions.

    :param defaults: A dict of defaults to write, useful for specifying part
                     (but not all) of the index succinctly. This is used both
                     when loading a configuration file from disk and when
                     generating a new one.
    :param base_dir: If specified, a base path used if this function has to
                     generate defaults. If not specified, falls back to
                     :py:attr:`CONFIG_BASE_DIR`
    :returns: The config object
    """
    base = Path(base_dir) if base_dir else infer_config_base_dir()

    def parse_or_default(ce: ConfigElement, val: Optional[str]) -> Path:
        if not val:
            return base / ce.default
        else:
            return Path(val)

    return {
        ce.name: parse_or_default(ce, defaults.get(ce.name)) for ce in CONFIG_ELEMENTS
    }


def write_config(config_data: Dict[str, Path], path: Optional[Path] = None) -> None:
    """Save the config file.

    :param config_data: The index to save
    :param base_dir: The place to save the file. If ``None``,
                     :py:meth:`infer_config_base_dir()` will be used

    Only keys that are in the config elements will be saved.
    """
    path = Path(path) if path else infer_config_base_dir()
    valid_names = [ce.name for ce in CONFIG_ELEMENTS]
    try:
        os.makedirs(path, exist_ok=True)
        with (path / _CONFIG_FILENAME).open("w") as base_f:
            json.dump(
                {k: str(v) for k, v in config_data.items() if k in valid_names},
                base_f,
                indent=2,
            )
    except OSError as e:
        sys.stderr.write(
            "Config index write to {} failed: {}\n".format(path / _CONFIG_FILENAME, e)
        )


def reload() -> None:
    global CONFIG
    CONFIG.clear()
    CONFIG.update(load_and_migrate())


def get_opentrons_path(path_name: str) -> Path:
    # Helper function to look-up the path
    # to specific configuration files for
    # the Opentrons system
    global CONFIG
    return CONFIG[path_name]


CONFIG = load_and_migrate()
#: The currently loaded config. This should not change for the lifetime
#: of the program. This is a dict much like os.environ() where the keys
#: are config element names


def get_tip_length_cal_path() -> Path:
    return get_opentrons_path("tip_length_calibration_dir")


def get_custom_tiprack_def_path() -> Path:
    return get_opentrons_path("custom_tiprack_dir")


def get_performance_metrics_data_dir() -> Path:
    return get_opentrons_path("performance_metrics_dir")
