""" A backwards-compatibility shim for the new protocol API.

This should not be imported directly; it is used to provide backwards
compatible singletons in opentrons/__init__.py.
"""
import os
import shutil
import logging
import importlib.util
from typing import List, TYPE_CHECKING, Optional

from opentrons.config import pipette_config, CONFIG
from opentrons.types import Mount

from .containers_wrapper import Containers, perform_migration, LegacyLabware
from .robot_wrapper import Robot
from .instrument_wrapper import Pipette
from . import modules_wrapper

if TYPE_CHECKING:
    from ..contexts import ProtocolContext

log = logging.getLogger(__name__)


def run(protocol_bytes: bytes, context: 'ProtocolContext'):
    source = importlib.util.decode_source(protocol_bytes)
    exec(source)


class AddInstrumentCtors(type):

    @staticmethod
    def _build_initializer(model, proper_name):
        """ Build an initializer function for a given pipette.

        This is a separate function so that the `proper_name` is correctly
        caught in the closure that it returns.
        """

        def initializer(
                self,
                mount: str,
                trash_container: LegacyLabware = None,
                tip_racks: List[LegacyLabware] = None,
                aspirate_flow_rate: float = None,
                dispense_flow_rate: float = None,
                min_volume: float = None,
                max_volume: float = None) -> Pipette:
            return self._load_instr(model,
                                    mount,
                                    tip_racks)

        initializer.__name__ = proper_name
        initializer.__qualname__ = '.'.join([AddInstrumentCtors.__qualname__,
                                             proper_name])
        initializer.__doc__ = \
            """Build a {} in a backwards-compatible way.

            :param mount: The mount to load the instrument. One of
                          `'left'` or `'right'`.
            :param trash_container: If specified, a :py:class:`.Labware` to
                                    use for trash.
            :param tip_racks: If specified, a list of :py:class:`.Labware`
                              containing tips.
            :param aspirate_flow_rate: If specified, a flow rate (in uL/s)
                                       to use when aspirating. By default,
                                       the value from the pipette's
                                       configuration.
            :param dispense_flow_rate: If specified, a flow rate (in uL/s)
                                       to use when dispensing. By default,
                                       the value from the pipette's
                                       configuration.
            :param min_volume: The minimum volume that can be aspirated at
                               once. By default, the pipette's minimum
                               volume.
            :param max_volume: The maximum volume that can be aspirated at
                               once. By default, the pipette's maximum
                               volume.

            :returns: An :py:class:`.InstrumentContext`, which represents
                      the newly-loaded pipette.
            """.format(' '.join(proper_name.split('_')))
        return initializer

    def __new__(cls, name, bases, namespace, **kwds):
        """ Add the pipette initializer functions to the class. """
        res = type.__new__(cls, name, bases, namespace)
        for name in pipette_config.config_names:
            split = name.split('_')
            number = split[0].upper()
            ptype_0 = split[1][0].upper()
            # And a nicely formatted version to name the function
            ptype = ptype_0 + split[1][1:]
            proper_name = number + '_' + ptype
            # if this is a GEN2, it will have another element in the split.
            # this one needs to be all uppercase
            if len(split) > 2:
                proper_name += '_' + split[2].upper()
            if hasattr(res, proper_name):
                # Only build one initializer function for each versionless
                # model (i.e. don’t make a P10_Single for both p10_single_v1
                # and p10_single_v1.3)
                continue

            initializer = cls._build_initializer(name, proper_name)
            setattr(res, proper_name, initializer)

        return res


class BCInstruments(metaclass=AddInstrumentCtors):
    """ A backwards-compatibility shim for the `New Protocol API`_.

    This class is provides a replacement for the `opentrons.instrument`
    global instance. Like that global instance, it shims object creation
    functions for ease of use. It should not be instantiated by user code, and
    use of its methods should be replaced with use of the corresponding methods
    of :py:class:`.ProtocolContext`. For information on how to replace calls to
    methods of this class, see the method documentation.
    """

    def __init__(
            self,
            robot: Robot,
            containers: Containers) -> None:
        self._robot_wrapper = robot
        self._containers = containers

    def _load_instr(self,
                    name: str,
                    mount: str,
                    tipracks: Optional[List[LegacyLabware]]) -> Pipette:
        """ Build an instrument in a backwards-compatible way.
        """
        new_tr = tipracks or []
        instr_ctx = self._robot_wrapper._ctx.load_instrument(
            name, Mount[mount.upper()],
            tip_racks=[tr.lw_obj for tr in new_tr])
        instr = Pipette(instr_ctx, self._containers.labware_mappings)
        self._robot_wrapper._add_instrument(mount, instr)
        return instr


class BCModules:
    def __init__(self, ctx: 'ProtocolContext') -> None:
        self._ctx = ctx

    def load(self, name: str, slot: str):
        return modules_wrapper.load(self._ctx, name, slot)


def build_globals(context: 'ProtocolContext'):
    lw = Containers(context)
    mod = BCModules(context)
    rob = Robot(context)
    instr = BCInstruments(rob, lw)
    rob._set_globals(instr, lw, mod)

    return {
        'robot': rob,
        'instruments': instr,
        'labware': lw,
        'containers': lw,
        'modules': mod}


def maybe_migrate_containers():
    result = False
    if os.path.exists(CONFIG['labware_database_file']):
        log.info("Checking for labware to migrate from database")
        try:
            result, validation_failure = perform_migration()
            if validation_failure:
                log.warning(
                    "The following labwares failed labware migration: "
                    f"{validation_failure}")
        except (IndexError, ValueError, KeyError):
            delete_dir = CONFIG['labware_user_definitions_dir_v2']/'legacy_api'
            if os.path.exists(delete_dir):
                shutil.rmtree(delete_dir)
            log.warning('Failed to perform database migration,  '
                        'please try again.')
    return result
