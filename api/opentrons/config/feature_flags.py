import os
import json
from opentrons.config import get_config_index


def get_feature_flag(name: str) -> bool:
    settings = get_all_feature_flags()
    return bool(settings.get(name))


def get_all_feature_flags() -> dict:
    settings_file = get_config_index().get('featureFlagFile')
    if settings_file and os.path.exists(settings_file):
        with open(settings_file, 'r') as fd:
            settings = json.load(fd)
    else:
        settings = {}
    return settings


def set_feature_flag(name: str, value):
    settings_file = get_config_index().get('featureFlagFile')
    if os.path.exists(settings_file):
        with open(settings_file, 'r') as fd:
            settings = json.load(fd)
        settings[name] = value
    else:
        settings = {name: value}
    with open(settings_file, 'w') as fd:
        json.dump(settings, fd)


# short_fixed_trash
# - True ('55.0'): Old (55mm tall) fixed trash
# - False:         77mm tall fixed trash
# - EOL: when all short fixed trash containers have been replaced
def short_fixed_trash(): return get_feature_flag('short-fixed-trash')


# split_labware_definitions
# - True:  Use new labware definitions (See: labware_definitions.py and
#          serializers.py)
# - False: Use sqlite db
def split_labware_definitions(): return get_feature_flag('split-labware-def')


# calibrate_to_bottom
# - True:  You must calibrate your containers to bottom
# - False: Otherwise the default
# will be that you calibrate to the top
def calibrate_to_bottom(): return get_feature_flag('calibrate-to-bottom')


# dots_deck_type
# - True: The deck layout has etched "dots"
# - False: The deck layout has etched "crosses"
def dots_deck_type(): return get_feature_flag('dots-deck-type')


# disable_home_on_boot
# - True: The robot should not home the carriages on boot
# - False: The robot should home the carriages on boot
def disable_home_on_boot(): return get_feature_flag('disable-home-on-boot')
