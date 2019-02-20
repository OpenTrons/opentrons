import copy
import logging
import json
import re
from collections import namedtuple
from typing import Any, Dict, List, Union, Tuple, Sequence
import pkgutil

from opentrons.config import feature_flags as ff, CONFIG


log = logging.getLogger(__name__)

pipette_config = namedtuple(
    'pipette_config',
    [
        'top',
        'bottom',
        'blow_out',
        'drop_tip',
        'pick_up_current',
        'pick_up_distance',
        'aspirate_flow_rate',
        'dispense_flow_rate',
        'channels',
        'model_offset',
        'plunger_current',
        'drop_tip_current',
        'drop_tip_speed',
        'min_volume',
        'max_volume',
        'ul_per_mm',
        'quirks',
        'tip_length',  # TODO (andy): remove from pipette, move to tip-rack
        'display_name'
    ]
)

# Notes:
# - multi-channel pipettes share the same dimensional offsets
# - single-channel pipettes have different lengths
# - Default number of seconds to aspirate/dispense a pipette's full volume,
#     and these times were chosen to mimic normal human-pipetting motions.
#     However, accurate speeds are dependent on environment (ex: liquid
#     viscosity), therefore a pipette's flow-rates (ul/sec) should be set by
#     protocol writer

# Multi-channel y offset caluclations:
DISTANCE_BETWEEN_NOZZLES = 9
NUM_MULTI_CHANNEL_NOZZLES = 8
MULTI_LENGTH = (NUM_MULTI_CHANNEL_NOZZLES - 1) * DISTANCE_BETWEEN_NOZZLES
Y_OFFSET_MULTI = MULTI_LENGTH / 2
Z_OFFSET_MULTI = -25.8

Z_OFFSET_P10 = -13  # longest single-channel pipette
Z_OFFSET_P50 = 0
Z_OFFSET_P300 = 0
Z_OFFSET_P1000 = 20  # shortest single-channel pipette

HAS_MODEL_RE = re.compile('^p.+_v.+$')
#: If a prospective model string matches this, it has a full model number


def model_config() -> Dict[str, Any]:
    """ Load the per-pipette-model config file from within the wheel """
    return json.loads(
        pkgutil.get_data(
            'opentrons', 'shared_data/robot-data/pipetteModelSpecs.json')
        or '{}')


def name_config() -> Dict[str, Any]:
    """ Load the per-pipette-name config file from within the wheel """
    return json.loads(
        pkgutil.get_data(
            'opentrons', 'shared_data/robot-data/pipetteNameSpecs.json')
        or '{}')


config_models = list(model_config()['config'].keys())
configs = model_config()['config']
#: A list of pipette model names for which we have config entries
mutable_configs = model_config()['mutableConfigs']
#: A list of mutable configs for pipettes


def load(pipette_model: str, pipette_id: str = None) -> pipette_config:
    """
    Load pipette config data


    This function loads from a combination of

    - the pipetteModelSpecs.json file in the wheel (should never be edited)
    - the pipetteNameSpecs.json file in the wheel(should never be edited)
    - any config overrides found in
      ``opentrons.config.CONFIG['pipette_config_overrides_dir']``

    This function reads from disk each time, so changes to the overrides
    will be picked up in subsequent calls.

    :param str pipette_model: The pipette model name (i.e. "p10_single_v1.3")
                              for which to load configuration
    :param pipette_id: An (optional) unique ID for the pipette to locate
                       config overrides. If the ID is not specified, the system
                       assumes this is a simulated pipette and does not
                       save settings. If the ID is specified but no overrides
                       corresponding to the ID are found, the system creates a
                       new overrides file for it.
    :type pipette_id: str or None
    :raises KeyError: if ``pipette_model`` is not in the top-level keys of
                      pipetteModeLSpecs.json (and therefore not in
                      :py:attr:`configs`)

    :returns pipette_config: The configuration, loaded and checked
    """

    # Load the model config and update with the name config
    cfg = copy.deepcopy(configs[pipette_model])
    cfg.update(copy.deepcopy(name_config()[cfg['name']]))
    # import pdb; pdb.set_trace()
    # Load overrides if we have a pipette id
    if pipette_id:
        try:
            override = load_overrides(pipette_id)
        except FileNotFoundError:
            save_overrides(pipette_id, {}, pipette_model)
            log.info(
                "Save defaults for pipette model {} and id {}".format(
                    pipette_model, pipette_id))
        else:
            cfg.update(override)

    # the ulPerMm functions are structured in pipetteModelSpecs.json as
    # a list sorted from oldest to newest. That means the latest functions
    # are always the last element and, as of right now, the older ones are
    # the first element (for models that only have one function, the first
    # and last elements are the same, which is fine). If we add more in the
    # future, we’ll have to change this code to select items more
    # intelligently
    if ff.use_old_aspiration_functions():
        log.info("Using old aspiration functions")
        ul_per_mm = cfg['ulPerMm'][0]
    else:
        log.info("Using new aspiration functions")
        ul_per_mm = cfg['ulPerMm'][-1]

    res = pipette_config(
        top=ensure_value(
            cfg, 'top', mutable_configs),
        bottom=ensure_value(
            cfg, 'bottom', mutable_configs),
        blow_out=ensure_value(
            cfg, 'blowout', mutable_configs),
        drop_tip=ensure_value(
            cfg, 'dropTip', mutable_configs),
        pick_up_current=ensure_value(cfg, 'pickUpCurrent', mutable_configs),
        pick_up_distance=ensure_value(cfg, 'pickUpDistance', mutable_configs),
        aspirate_flow_rate=ensure_value(
            cfg, 'defaultAspirateFlowRate', mutable_configs),
        dispense_flow_rate=ensure_value(
            cfg, 'defaultDispenseFlowRate', mutable_configs),
        channels=ensure_value(cfg, 'channels', mutable_configs),
        model_offset=ensure_value(cfg, 'modelOffset', mutable_configs),
        plunger_current=ensure_value(cfg, 'plungerCurrent', mutable_configs),
        drop_tip_current=ensure_value(cfg, 'dropTipCurrent', mutable_configs),
        drop_tip_speed=ensure_value(cfg, 'dropTipSpeed', mutable_configs),
        min_volume=ensure_value(cfg, 'minVolume', mutable_configs),
        max_volume=ensure_value(cfg, 'maxVolume', mutable_configs),
        ul_per_mm=ul_per_mm,
        quirks=ensure_value(cfg, 'quirks', mutable_configs),
        tip_length=ensure_value(cfg, 'tipLength', mutable_configs),
        display_name=ensure_value(cfg, 'displayName', mutable_configs)
    )

    return res


def piecewise_volume_conversion(
        ul: float, sequence: List[List[float]]) -> float:
    """
    Takes a volume in microliters and a sequence representing a piecewise
    function for the slope and y-intercept of a ul/mm function, where each
    sub-list in the sequence contains:

      - the max volume for the piece of the function (minimum implied from the
        max of the previous item or 0
      - the slope of the segment
      - the y-intercept of the segment

    :return: the ul/mm value for the specified volume
    """
    # pick the first item from the seq for which the target is less than
    # the bracketing element
    i = list(filter(lambda x: ul <= x[0], sequence))[0]
    # use that element to calculate the movement distance in mm
    return i[1]*ul + i[2]


def save_overrides(pipette_id: str, overrides: Dict[str, Any], model: str):
    override_dir = CONFIG['pipette_config_overrides_dir']
    try:
        existing = load_overrides(pipette_id)
    except FileNotFoundError:
        existing = {}

    model_configs = configs[model]
    for key, value in overrides.items():
        # If an existing override is saved as null from endpoint, remove from
        # overrides file
        if value is None:
            if existing.get(key):
                del existing[key]
        else:
            model_configs[key]['value'] = value['value']
            add_default(model_configs[key])
            existing[key] = model_configs[key]
    assert model in config_models
    existing['model'] = model
    json.dump(existing, (override_dir/f'{pipette_id}.json').open('w'))


def load_overrides(pipette_id: str) -> Dict[str, Any]:
    overrides = CONFIG['pipette_config_overrides_dir']
    fi = (overrides/f'{pipette_id}.json').open()
    try:
        return json.load(fi)
    except json.JSONDecodeError as e:
        log.warning(f'pipette override for {pipette_id} is corrupt: {e}')
        (overrides/f'{pipette_id}.json').unlink()
        raise FileNotFoundError(str(overrides/f'{pipette_id}.json'))


def ensure_value(
        config: dict,
        name: Union[str, Tuple[str, ...]],
        mutable_config_list: List[str]):
    """
    Pull value of config data from file. Shape can either be a dictionary with
    a value key -- indicating that it can be changed -- or another
    data structure such as an array.
    """
    if not isinstance(name, tuple):
        path: Tuple[str, ...] = (name,)
    else:
        path = name
    for element in path[:-1]:
        config = config[element]

    value = config[path[-1]]
    if path[-1] in mutable_config_list:
        value = value['value']
    return value


def known_pipettes() -> Sequence[str]:
    """ List pipette IDs for which we have known overrides """
    return [fi.stem
            for fi in CONFIG['pipette_config_overrides_dir'].iterdir()
            if fi.is_file() and '.json' in fi.suffixes]


def add_default(cfg):
    if isinstance(cfg, dict):
        if 'value' in cfg.keys():
            cfg['default'] = cfg['value']
        else:
            for top_level_key in cfg.keys():
                add_default(cfg[top_level_key])


def load_config_dict(pipette_id: str) -> Dict:
    """ Give updated config with overrides for a pipette. This will add
    the default value for a mutable config before returning the modified
    config value.
    """
    override = load_overrides(pipette_id)
    model = override['model']
    config = copy.deepcopy(model_config()['config'][model])
    config.update(copy.deepcopy(name_config()[config['name']]))

    for top_level_key in config.keys():
        add_default(config[top_level_key])

    config.update(override)

    return config


def list_mutable_configs(pipette_id: str) -> Dict[str, Any]:
    """
    Returns dict of mutable configs only.
    """
    cfg: Dict[str, Any] = {}

    if pipette_id in known_pipettes():
        config = load_config_dict(pipette_id)
    else:
        log.info('Pipette id {} not found'.format(pipette_id))
        return cfg

    for key in config:
        if key in mutable_configs:
            cfg[key] = config[key]
    return cfg
