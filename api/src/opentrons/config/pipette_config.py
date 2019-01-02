import logging
import os
import json
from collections import namedtuple
from typing import List
from opentrons import __file__ as root_file
from opentrons.config import feature_flags as ff


root_dir = os.path.abspath(os.path.dirname(root_file))
config_name_file = os.path.join(
    root_dir, 'shared_data', 'robot-data', 'pipetteNameSpecs.json')
config_model_file = os.path.join(
    root_dir, 'shared_data', 'robot-data', 'pipetteModelSpecs.json')
log = logging.getLogger(__name__)

pipette_config = namedtuple(
    'pipette_config',
    [
        'plunger_positions',
        'pick_up_current',
        'pick_up_distance',
        'aspirate_flow_rate',
        'dispense_flow_rate',
        'channels',
        'model_offset',
        'plunger_current',
        'drop_tip_current',
        'min_volume',
        'max_volume',
        'ul_per_mm',
        'quirks',
        'tip_length',  # TODO (andy): remove from pipette, move to tip-rack
        'display_name',
        'tip_overlap'
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


with open(config_model_file) as cfg_file:
    configs = list(json.load(cfg_file).keys())


def load(pipette_model: str) -> pipette_config:
    """
    Lazily loads pipette config data from disk. This means that changes to the
    configuration data should be picked up on newly instantiated objects
    without requiring a restart. If :param pipette_model is not in the top-
    level keys of the "pipetteModelSpecs.json" file, this function will raise
    a KeyError
    :param pipette_model: a pipette model string corresponding to a top-level
        key in the "pipetteModelSpecs.json" file
    :return: a `pipette_config` instance
    """
    with open(config_model_file) as model_cfg_file:
        cfg = json.load(model_cfg_file)[pipette_model]

    name_key = cfg.get('name')

    # spread name keys into model-specific dict
    with open(config_name_file) as name_cfg_file:
        name_data = json.load(name_cfg_file)[name_key]
        cfg.update(name_data)

    plunger_pos = cfg.get('plungerPositions', {})

    res = pipette_config(
        plunger_positions={
            'top': plunger_pos.get('top'),
            'bottom': plunger_pos.get('bottom'),
            'blow_out': plunger_pos.get('blowOut'),
            'drop_tip': plunger_pos.get('dropTip'),
        },
        pick_up_current=cfg.get('pickUpCurrent'),
        pick_up_distance=cfg.get('pickUpDistance'),
        aspirate_flow_rate=cfg.get('defaultAspirateFlowRate'),
        dispense_flow_rate=cfg.get('defaultDispenseFlowRate'),
        channels=cfg.get('channels'),
        model_offset=cfg.get('modelOffset'),
        plunger_current=cfg.get('plungerCurrent'),
        drop_tip_current=cfg.get('dropTipCurrent'),
        min_volume=cfg.get('minVolume'),
        max_volume=cfg.get('maxVolume'),
        ul_per_mm=cfg.get('ulPerMm'),
        quirks=cfg.get('quirks'),
        tip_length=cfg.get('tipLength'),
        display_name=cfg.get('displayName'),
        tip_overlap=cfg.get('tipOverlap')
    )

    # Verify that stored values agree with calculations
    if 'multi' in pipette_model:
        assert res.model_offset[1] == Y_OFFSET_MULTI
        assert res.model_offset[2] == Z_OFFSET_MULTI
    elif 'p1000' in pipette_model:
        assert res.model_offset[1] == 0.0
        assert res.model_offset[2] == Z_OFFSET_P1000
    elif 'p10' in pipette_model:
        assert res.model_offset[1] == 0.0
        assert res.model_offset[2] == Z_OFFSET_P10
        new_aspirate = ff.use_new_p10_aspiration()
        if 'single' in pipette_model and new_aspirate:
            log.info("Using new P10 single aspiration")
            res.ul_per_mm['aspirate'] = [
                [1.438649211,	0.01931415115,	0.691538317],
                [1.836824579,	0.03868955123,	0.6636639129],
                [2.960052684,	0.00470371018,	0.7260899411],
                [4.487508789,	0.005175245625,	0.7246941713],
                [10.59661421,	0.001470408978,	0.7413196584]]
        elif not new_aspirate:
            log.info("Using old P10 single aspiration")
    elif 'p300' in pipette_model:
        assert res.model_offset[1] == 0.0
        assert res.model_offset[2] == Z_OFFSET_P300
    else:
        assert res.model_offset[1] == 0.0
        assert res.model_offset[2] == Z_OFFSET_P50

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
