# In this file we often align code for readability triggering PEP8 warnings
# So...
# pylama:skip=1

from collections import namedtuple
from opentrons.config import get_config_index, merge
from opentrons.config import feature_flags as fflags

import json
import os
import logging

log = logging.getLogger(__name__)


PLUNGER_CURRENT_LOW = 0.1
PLUNGER_CURRENT_HIGH = 0.5

MOUNT_CURRENT_LOW = 0.1
MOUNT_CURRENT_HIGH = 1.0

X_CURRENT_LOW = 0.3
X_CURRENT_HIGH = 1.5

Y_CURRENT_LOW = 0.3
Y_CURRENT_HIGH = 1.75

HIGH_CURRENT = {
    'X': X_CURRENT_HIGH,
    'Y': Y_CURRENT_HIGH,
    'Z': MOUNT_CURRENT_HIGH,
    'A': MOUNT_CURRENT_HIGH,
    'B': PLUNGER_CURRENT_HIGH,
    'C': PLUNGER_CURRENT_HIGH
}

LOW_CURRENT = {
    'X': X_CURRENT_LOW,
    'Y': Y_CURRENT_LOW,
    'Z': MOUNT_CURRENT_LOW,
    'A': MOUNT_CURRENT_LOW,
    'B': PLUNGER_CURRENT_LOW,
    'C': PLUNGER_CURRENT_LOW
}

DEFAULT_CURRENT = {
    'X': HIGH_CURRENT['X'],
    'Y': HIGH_CURRENT['Y'],
    'Z': HIGH_CURRENT['Z'],
    'A': HIGH_CURRENT['A'],
    'B': LOW_CURRENT['B'],
    'C': LOW_CURRENT['C']
}

X_MAX_SPEED = 600
Y_MAX_SPEED = 400
Z_MAX_SPEED = 125
A_MAX_SPEED = 125
B_MAX_SPEED = 50
C_MAX_SPEED = 50

DEFAULT_MAX_SPEEDS = {
    'X': X_MAX_SPEED,
    'Y': Y_MAX_SPEED,
    'Z': Z_MAX_SPEED,
    'A': A_MAX_SPEED,
    'B': B_MAX_SPEED,
    'C': C_MAX_SPEED
}

DEFAULT_CURRENT_STRING = ' '.join(
    ['{}{}'.format(key, value) for key, value in DEFAULT_CURRENT.items()])

DEFAULT_PROBE_HEIGHT = 77.0


robot_config = namedtuple(
    'robot_config',
    [
        'name',
        'version',
        'steps_per_mm',
        'acceleration',
        'gantry_calibration',
        'instrument_offset',
        'probe_center',
        'probe_dimensions',
        'serial_speed',
        'plunger_current_low',
        'plunger_current_high',
        'tip_length',
        'default_current',
        'low_current',
        'high_current',
        'default_max_speed',
        'mount_offset'
    ]
)


def _get_default():
    if fflags.short_fixed_trash():
        probe_height = 55.0
    else:
        probe_height = DEFAULT_PROBE_HEIGHT

    return robot_config(
        name='Ada Lovelace',
        version=1,
        steps_per_mm='M92 X80.00 Y80.00 Z400 A400 B768 C768',
        acceleration='M204 S10000 X3000 Y2000 Z1500 A1500 B2000 C2000',
        probe_center=[293.03, 301.27, probe_height],
        probe_dimensions=[35.0, 40.0, probe_height + 5.0],
        gantry_calibration=[
            [ 1.00, 0.00, 0.00,  0.00],
            [ 0.00, 1.00, 0.00,  0.00],
            [ 0.00, 0.00, 1.00,  0.00],
            [ 0.00, 0.00, 0.00,  1.00]
        ],
        instrument_offset={
            'right': {
                'single': [0.0, 0.0, 0.0],
                'multi': [0.0, 0.0, 0.0]
            },
            'left': {
                'single': [0.0, 0.0, 0.0],
                'multi': [0.0, 0.0, 0.0]
            }
        },
        tip_length={
            'Pipette': 51.7 # TODO (andy): move to tip-rack
        },
        mount_offset=[-34, 0, 0], # distance between the left/right mounts
        serial_speed=115200,
        default_current=DEFAULT_CURRENT,
        low_current=LOW_CURRENT,
        high_current=HIGH_CURRENT,
        default_max_speed=DEFAULT_MAX_SPEEDS,
        plunger_current_low=PLUNGER_CURRENT_LOW,
        plunger_current_high=PLUNGER_CURRENT_HIGH
    )


def load(filename=None):
    filename = filename or get_config_index().get('deckCalibrationFile')
    result = _get_default()
    log.debug("Loading {}".format(filename))
    try:
        with open(filename, 'r') as file:
            local = json.load(file)
            result = robot_config(**merge([result._asdict(), local]))
    except FileNotFoundError:
        log.warning('Config {0} not found. Loading defaults'.format(filename))
    except json.decoder.JSONDecodeError:
        log.warning('Config {0} is corrupt. Loading defaults'.format(filename))

    return result


def save(config, filename=None, tag=None):
    filename = filename or get_config_index().get('deckCalibrationFile')
    if tag:
        root, ext = os.path.splitext(filename)
        filename = "{}-{}{}".format(root, tag, ext)

    return _save_config_json(config._asdict(), filename=filename)


def backup_configuration(config, tag=None):
    import time
    if not tag:
        tag = str(int(time.time() * 1000))
    save(config, tag=tag)


def clear(filename=None):
    filename = filename or get_config_index().get('deckCalibrationFile')
    log.info('Deleting config file: {}'.format(filename))
    if os.path.exists(filename):
        os.remove(filename)


def _save_config_json(config_json, filename=None):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'w') as file:
        json.dump(config_json, file, sort_keys=True, indent=4)
    return config_json
