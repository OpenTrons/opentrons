import inspect
import itertools
import logging
import traceback
import sys
from typing import Any, Callable, Dict, Optional

from .contexts import ProtocolContext, InstrumentContext
from .back_compat import BCLabware
from . import labware
from opentrons.types import Point, Location
from opentrons import config

MODULE_LOG = logging.getLogger(__name__)

PROTOCOL_MALFORMED = """

A Python protocol for the OT2 must define a function called 'run' that takes a
single argument: the protocol context to call functions on. For instance, a run
function might look like this:

def run(ctx):
    ctx.comment('hello, world')

This function is called by the robot when the robot executes the protol.
This function is not present in the current protocol and must be added.
"""


class ExceptionInProtocolError(Exception):
    """ This exception wraps an exception that was raised from a protocol
    for proper error message formatting by the rpc, since it's only here that
    we can properly figure out formatting
    """
    def __init__(self, original_exc, original_tb, message, line):
        self.original_exc = original_exc
        self.original_tb = original_tb
        self.message = message
        self.line = line
        super().__init__(original_exc, original_tb, message, line)

    def __str__(self):
        return '{}{}: {}'.format(
            self.original_exc.__class__.__name__,
            ' [line {}]'.format(self.line) if self.line else '',
            self.message)


class MalformedProtocolError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(message)

    def __str__(self):
        return self._msg + PROTOCOL_MALFORMED

    def __repr__(self):
        return '<{}: {}>'.format(self.__class__.__name__, self.message)


def _runfunc_ok(run_func: Any) -> Callable[[ProtocolContext], None]:
    if not callable(run_func):
        raise SyntaxError("No function 'run(ctx)' defined")
    sig = inspect.Signature.from_callable(run_func)
    if not sig.parameters:
        raise SyntaxError("Function 'run()' does not take any parameters")
    if len(sig.parameters) > 1:
        for name, param in list(sig.parameters.items())[1:]:
            if param.default == inspect.Parameter.empty:
                raise SyntaxError(
                    "Function 'run{}' must be called with more than one "
                    "argument but would be called as 'run(ctx)'"
                    .format(str(sig)))
    return run_func  # type: ignore


def _find_protocol_error(tb, proto_name):
    """Return the FrameInfo for the lowest frame in the traceback from the
    protocol.
    """
    tb_info = traceback.extract_tb(tb)
    for frame in reversed(tb_info):
        if frame.filename == proto_name:
            return frame
    else:
        raise KeyError


def _run_python(proto: Any, context: ProtocolContext):
    new_locs = locals()
    new_globs = globals()
    name = getattr(proto, 'co_filename', '<protocol>')
    exec(proto, new_globs, new_locs)
    # If the protocol is written correctly, it will have defined a function
    # like run(context: ProtocolContext). If so, that function is now in the
    # current scope.
    try:
        _runfunc_ok(new_locs.get('run'))
    except SyntaxError as se:
        raise MalformedProtocolError(str(se))
    new_globs.update(new_locs)
    try:
        exec('run(context)', new_globs, new_locs)
    except Exception as e:
        exc_type, exc_value, tb = sys.exc_info()
        try:
            frame = _find_protocol_error(tb, name)
        except KeyError:
            # No pretty names, just raise it
            raise e
        raise ExceptionInProtocolError(e, tb, str(e), frame.lineno)


def load_pipettes_from_json(
        ctx: ProtocolContext,
        protocol: Dict[Any, Any]) -> Dict[str, InstrumentContext]:
    pipette_data = protocol.get('pipettes', {})
    pipettes_by_id = {}
    for pipette_id, props in pipette_data.items():
        model = props.get('model')
        mount = props.get('mount')

        # NOTE: 'name' is only used by v1 and v2 JSON protocols
        name = props.get('name')
        if not name:
            name = model.split('_v')[0]

        instr = ctx.load_instrument(name, mount)

        pipettes_by_id[pipette_id] = instr

    return pipettes_by_id


def load_labware_from_json_defs(
        ctx: ProtocolContext,
        protocol: Dict[Any, Any]) -> Dict[str, labware.Labware]:
    protocol_labware = protocol.get('labware', {})
    definitions = protocol.get('labwareDefinitions', {})
    loaded_labware = {}

    for labware_id, props in protocol_labware.items():
        slot = props.get('slot')
        definition = definitions.get(props.get('definitionId'))
        loaded_labware[labware_id] = ctx.load_labware(
            labware.Labware(
                definition,
                ctx.deck.position_for(slot),
                props.get('displayName')
            ),
            slot)

    return loaded_labware


def load_labware_from_json_loadnames(
        ctx: ProtocolContext,
        protocol: Dict[Any, Any]) -> Dict[str, labware.Labware]:
    # NOTE: this is only used by v1 and v2 JSON protocols
    data = protocol.get('labware', {})
    loaded_labware = {}
    bc = BCLabware(ctx)
    for labware_id, props in data.items():
        slot = props.get('slot')
        model = props.get('model')
        if slot == '12':
            if model == 'fixed-trash':
                # pass in the pre-existing fixed-trash
                loaded_labware[labware_id] = ctx.fixed_trash
            else:
                raise RuntimeError(
                    "Nothing but the fixed trash may be loaded in slot 12; "
                    "this protocol attempts to load a {} there."
                    .format(model))
        else:
            loaded_labware[labware_id] = bc.load(
                model, slot, label=props.get('display-name'))

    return loaded_labware


def _get_well(loaded_labware: Dict[str, labware.Labware],
              params: Dict[str, Any]):
    labwareId = params['labware']
    well = params['well']
    plate = loaded_labware.get(labwareId)
    if not plate:
        raise ValueError(
            'Command tried to use labware "{}", but that ID does not exist '
            'in protocol\'s "labware" section'.format(labwareId))
    return plate.wells_by_index()[well]


def _get_bottom_offset_v1(command_type: str,
                          params: Dict[str, Any],
                          default_values: Dict[str, float]) -> Optional[float]:
    # default offset from bottom for aspirate/dispense commands
    offset_default = default_values.get(
        '{}-mm-from-bottom'.format(command_type))

    # optional command-specific value, fallback to default
    offset_from_bottom = params.get(
        'offsetFromBottomMm', offset_default)

    return offset_from_bottom


def _get_location_with_offset_v1(loaded_labware: Dict[str, labware.Labware],
                                 command_type: str,
                                 params: Dict[str, Any],
                                 default_values: Dict[str, float]) -> Location:
    well = _get_well(loaded_labware, params)

    # Never move to the bottom of the fixed trash
    if 'fixedTrash' in labware.quirks_from_any_parent(well):
        return well.top()

    offset_from_bottom = _get_bottom_offset_v1(
        command_type, params, default_values)

    bot = well.bottom()
    if offset_from_bottom:
        with_offs = bot.move(Point(z=offset_from_bottom))
    else:
        with_offs = bot
    MODULE_LOG.debug("offset from bottom for {}: {}->{}"
                     .format(command_type, bot, with_offs))
    return with_offs


def _get_location_with_offset_v3(loaded_labware: Dict[str, labware.Labware],
                                 command_type: str,
                                 params: Dict[str, Any]) -> Location:
    well = _get_well(loaded_labware, params)

    # Never move to the bottom of the fixed trash
    if 'fixedTrash' in labware.quirks_from_any_parent(well):
        return well.top()

    offset_from_bottom = params.get('offsetFromBottomMm')
    if None is offset_from_bottom:
        raise RuntimeError('"offsetFromBottomMm" is required for {}'
                           .format(command_type))

    bottom = well.bottom()
    return bottom.move(Point(z=offset_from_bottom))


# TODO (Ian 2018-08-22) once Pipette has more sensible way of managing
# flow rate value (eg as an argument in aspirate/dispense fns), remove this
def _set_flow_rate_v1(
        pipette_name, pipette, command_type, params, default_values):
    """
    Set flow rate in uL/mm, to value obtained from command's params,
    or if unspecified in command params, then from protocol's "default-values".
    """
    default_aspirate = default_values.get(
        'aspirate-flow-rate', {}).get(pipette_name)

    default_dispense = default_values.get(
        'dispense-flow-rate', {}).get(pipette_name)

    flow_rate_param = params.get('flow-rate')

    if flow_rate_param is not None:
        if command_type == 'aspirate':
            pipette.flow_rate = {
                'aspirate': flow_rate_param,
                'dispense': default_dispense
            }
            return
        if command_type == 'dispense':
            pipette.flow_rate = {
                'aspirate': default_aspirate,
                'dispense': flow_rate_param
            }
            return

    pipette.flow_rate = {
        'aspirate': default_aspirate,
        'dispense': default_dispense
    }


# TODO (Ian 2019-04-05) once Pipette commands allow flow rate as an
# absolute value (not % value) as an argument in
# aspirate/dispense/blowout/air_gap fns, remove this
def _set_flow_rate_v3(
        pipette_name, pipette, command_type, params):
    """
    Set flow rate in uL/mm, to value obtained from command's params.
    """
    flow_rate_param = params.get('flowRate')

    pipette.flow_rate = {
        'aspirate': flow_rate_param,
        'dispense': flow_rate_param
    }


def get_protocol_schema_version(protocol_json: Dict[Any, Any]) -> int:
    # v3 and above uses `schemaVersion: integer`
    version = protocol_json.get('schemaVersion')
    if None is not version:
        return version
    # v1 uses 1.x.x and v2 uses 2.x.x
    legacyKebabVersion = protocol_json.get('protocol-schema')
    # No minor/patch schemas ever were released,
    # do not permit protocols with nonexistent schema versions to load
    if (legacyKebabVersion == '1.0.0'):
        return 1
    if (legacyKebabVersion == '2.0.0'):
        return 2
    if (legacyKebabVersion is not None):
        raise RuntimeError(('No such schema version: "{}". Did you mean ' +
                           '"1.0.0" or "2.0.0"?').format(legacyKebabVersion))
    raise RuntimeError(
        'Could not determine schema version for protcol. ' +
        'Make sure there is a version number under "schemaVersion"')


def dispatch_json_v1(context: ProtocolContext,  # noqa(C901)
                     protocol_data: Dict[Any, Any],
                     instruments: Dict[str, InstrumentContext],
                     loaded_labware: Dict[str, labware.Labware]):
    subprocedures = [
        p.get('subprocedure', [])
        for p in protocol_data.get('procedure', [])]

    default_values = protocol_data.get('default-values', {})
    flat_subs = itertools.chain.from_iterable(subprocedures)

    for command_item in flat_subs:
        command_type = command_item.get('command')
        params = command_item.get('params', {})
        pipette = instruments.get(params.get('pipette'))
        protocol_pipette_data = protocol_data\
            .get('pipettes', {})\
            .get(params.get('pipette'), {})
        pipette_name = protocol_pipette_data.get('name')

        if (not pipette_name):
            # TODO: Ian 2018-11-06 remove this fallback to 'model' when
            # backwards-compatability for JSON protocols with versioned
            # pipettes is dropped (next JSON protocol schema major bump)
            pipette_name = protocol_pipette_data.get('model')

        if command_type == 'delay':
            wait = params.get('wait')
            if wait is None:
                raise ValueError('Delay cannot be null')
            elif wait is True:
                message = params.get('message', 'Pausing until user resumes')
                context.pause(msg=message)
            else:
                context.delay(seconds=wait)

        elif command_type == 'blowout':
            well = _get_well(loaded_labware, params)
            pipette.blow_out(well)  # type: ignore

        elif command_type == 'pick-up-tip':
            well = _get_well(loaded_labware, params)
            pipette.pick_up_tip(well)  # type: ignore

        elif command_type == 'drop-tip':
            well = _get_well(loaded_labware, params)
            pipette.drop_tip(well)  # type: ignore

        elif command_type == 'aspirate':
            location = _get_location_with_offset_v1(
                loaded_labware, 'aspirate', params, default_values)
            volume = params['volume']
            _set_flow_rate_v1(
                pipette_name, pipette, command_type, params, default_values)
            pipette.aspirate(volume, location)  # type: ignore

        elif command_type == 'dispense':
            location = _get_location_with_offset_v1(
                loaded_labware, 'dispense', params, default_values)
            volume = params['volume']
            _set_flow_rate_v1(
                pipette_name, pipette, command_type, params, default_values)
            pipette.dispense(volume, location)  # type: ignore

        elif command_type == 'touch-tip':
            well = _get_well(loaded_labware, params)
            offset = default_values.get('touchTipMmFromTop', -1)
            pipette.touch_tip(well, v_offset=offset)  # type: ignore

        elif command_type == 'move-to-slot':
            slot = params.get('slot')
            if slot not in [str(s+1) for s in range(12)]:
                raise ValueError('Invalid "slot" for "moveToSlot": {}'
                                 .format(slot))
            slot_obj = context.deck.position_for(slot)

            offset = params.get('offset', {})
            offsetPoint = Point(
                offset.get('x', 0),
                offset.get('y', 0),
                offset.get('z', 0))

            pipette.move_to(  # type: ignore
                slot_obj.move(offsetPoint),
                force_direct=params.get('forceDirect'),
                minimum_z_height=params.get('minimumZHeight'))
        else:
            raise RuntimeError(
                "Unsupported command type {}".format(command_type))


def dispatch_json_v3(context: ProtocolContext,  # noqa(C901)
                     protocol_data: Dict[Any, Any],
                     instruments: Dict[str, InstrumentContext],
                     loaded_labware: Dict[str, labware.Labware]):
    commands = protocol_data.get('commands', [])

    for command_item in commands:
        command_type = command_item.get('command')
        params = command_item.get('params', {})
        pipette = instruments.get(params.get('pipette'))
        protocol_pipette_data = protocol_data\
            .get('pipettes', {})\
            .get(params.get('pipette'), {})
        pipette_name = protocol_pipette_data.get('name')

        if (not pipette_name):
            # TODO: Ian 2018-11-06 remove this fallback to 'model' when
            # backwards-compatability for JSON protocols with versioned
            # pipettes is dropped (next JSON protocol schema major bump)
            pipette_name = protocol_pipette_data.get('model')

        if command_type == 'delay':
            wait = params.get('wait')
            if wait is None:
                raise ValueError('Delay cannot be null')
            elif wait is True:
                message = params.get('message', 'Pausing until user resumes')
                context.pause(msg=message)
            else:
                context.delay(seconds=wait)

        elif command_type == 'blowout':
            well = _get_well(loaded_labware, params)
            _set_flow_rate_v3(
                pipette_name, pipette, command_type, params)
            pipette.blow_out(well)  # type: ignore

        elif command_type == 'pickUpTip':
            well = _get_well(loaded_labware, params)
            pipette.pick_up_tip(well)  # type: ignore

        elif command_type == 'dropTip':
            well = _get_well(loaded_labware, params)
            pipette.drop_tip(well)  # type: ignore

        elif command_type == 'aspirate':
            location = _get_location_with_offset_v3(
                loaded_labware, 'aspirate', params)
            volume = params['volume']
            _set_flow_rate_v3(
                pipette_name, pipette, command_type, params)
            pipette.aspirate(volume, location)  # type: ignore

        elif command_type == 'dispense':
            location = _get_location_with_offset_v3(
                loaded_labware, 'dispense', params)
            volume = params['volume']
            _set_flow_rate_v3(
                pipette_name, pipette, command_type, params)
            pipette.dispense(volume, location)  # type: ignore

        elif command_type == 'touchTip':
            location = _get_location_with_offset_v3(
                loaded_labware, 'dispense', params)
            well = _get_well(loaded_labware, params)
            # convert mmFromBottom to v_offset
            v_offset = location.point.z - well.top().point.z
            pipette.touch_tip(well, v_offset=v_offset)  # type: ignore

        elif command_type == 'moveToSlot':
            slot = params.get('slot')
            if slot not in [str(s+1) for s in range(12)]:
                raise ValueError('Invalid "slot" for "moveToSlot": {}'
                                 .format(slot))
            slot_obj = context.deck.position_for(slot)

            offset = params.get('offset', {})
            offsetPoint = Point(
                offset.get('x', 0),
                offset.get('y', 0),
                offset.get('z', 0))

            pipette.move_to(  # type: ignore
                slot_obj.move(offsetPoint),
                force_direct=params.get('forceDirect'),
                minimum_z_height=params.get('minimumZHeight'))
        else:
            raise RuntimeError(
                "Unsupported command type {}".format(command_type))


def run_protocol(protocol_code: Any = None,
                 protocol_json: Dict[Any, Any] = None,
                 simulate: bool = False,
                 context: ProtocolContext = None):
    """ Create a ProtocolRunner instance from one of a variety of protocol
    sources.

    :param protocol_bytes: If the protocol is a Python protocol, pass the
    file contents here.
    :param protocol_json: If the protocol is a json file, pass the contents
    here.
    :param simulate: True to simulate; False to execute. If this is not an
    OT2, ``simulate`` will be forced ``True``.
    :param context: The context to use. If ``None``, create a new
    ProtocolContext.
    """
    if not config.IS_ROBOT:
        simulate = True # noqa - will be used later
    if None is context and simulate:
        true_context = ProtocolContext()
        true_context.home()
        MODULE_LOG.info("Generating blank protocol context for simulate")
    elif context:
        true_context = context
    else:
        raise RuntimeError(
            'Will not automatically generate hardware controller')
    if None is not protocol_code:
        _run_python(protocol_code, true_context)
    elif None is not protocol_json:
        protocol_version = get_protocol_schema_version(protocol_json)
        if (protocol_version) > 3:
            raise RuntimeError('JSON Protocol version {} is not yet supported \
                in this version of the API'.format(protocol_version))

        ins = load_pipettes_from_json(true_context, protocol_json)

        if (protocol_version >= 3):
            lw = load_labware_from_json_defs(true_context, protocol_json)
            dispatch_json_v3(true_context, protocol_json, ins, lw)
        else:
            lw = load_labware_from_json_loadnames(true_context, protocol_json)
            dispatch_json_v1(true_context, protocol_json, ins, lw)
    else:
        raise RuntimeError("run_protocol must have either code or json")
