import json
import os

from typing import Dict, Any, Union
from typing_extensions import Literal
from functools import lru_cache

from .. import load_shared_data, get_shared_data_root

from .pipette_definition import (
    PipetteConfigurations,
    PipetteLiquidPropertiesDefinition,
)
from .model_constants import MOUNT_CONFIG_LOOKUP_TABLE, _MAP_KEY_TO_V2
from .types import (
    PipetteChannelType,
    PipetteModelType,
    PipetteGenerationType,
    PipetteVersionType,
    PipetteModelMajorVersion,
    PipetteModelMinorVersion,
)


LoadedConfiguration = Dict[str, Union[str, Dict[str, Any]]]


def _get_configuration_dictionary(
    config_type: Literal["general", "geometry", "liquid"],
    channels: PipetteChannelType,
    max_volume: PipetteModelType,
    version: PipetteVersionType,
) -> LoadedConfiguration:
    config_path = (
        get_shared_data_root()
        / "pipette"
        / "definitions"
        / "2"
        / config_type
        / channels.name.lower()
        / max_volume.value
        / f"{version.major}_{version.minor}.json"
    )
    return json.loads(load_shared_data(config_path))


@lru_cache(maxsize=None)
def _geometry(
    channels: PipetteChannelType,
    max_volume: PipetteModelType,
    version: PipetteVersionType,
) -> LoadedConfiguration:
    return _get_configuration_dictionary("geometry", channels, max_volume, version)


@lru_cache(maxsize=None)
def _liquid(
    channels: PipetteChannelType,
    max_volume: PipetteModelType,
    version: PipetteVersionType,
) -> LoadedConfiguration:
    return _get_configuration_dictionary("liquid", channels, max_volume, version)


@lru_cache(maxsize=None)
def _physical(
    channels: PipetteChannelType,
    max_volume: PipetteModelType,
    version: PipetteVersionType,
) -> LoadedConfiguration:
    return _get_configuration_dictionary("general", channels, max_volume, version)


@lru_cache(maxsize=None)
def load_serial_lookup_table() -> Dict[str, str]:
    """Load a serial abbreviation lookup table mapped to model name."""
    config_path = get_shared_data_root() / "pipette" / "definitions" / "2" / "liquid"
    _lookup_table = {}
    _channel_shorthand = {
        "eight_channel": "M",
        "single_channel": "S",
        "ninety_six_channel": "H",
    }
    _channel_model_str = {
        "single_channel": "single",
        "ninety_six_channel": "96",
        "eight_channel": "multi",
    }
    _model_shorthand = {"p1000": "p1k", "p300": "p3h"}
    for channel_dir in os.listdir(config_path):
        for model_dir in os.listdir(config_path / channel_dir):
            for version_file in os.listdir(config_path / channel_dir / model_dir):
                version_list = version_file.split(".json")[0].split("_")
                built_model = f"{model_dir}_{_channel_model_str[channel_dir]}_v{version_list[0]}.{version_list[1]}"

                model_shorthand = _model_shorthand.get(model_dir, model_dir)

                if (
                    model_dir == "p300"
                    and int(version_list[0]) == 1
                    and int(version_list[1]) == 0
                ):
                    # Well apparently, we decided to switch the shorthand of the p300 depending
                    # on whether it's a "V1" model or not...so...here is the lovely workaround.
                    model_shorthand = model_dir
                serial_shorthand = f"{model_shorthand.upper()}{_channel_shorthand[channel_dir]}V{version_list[0]}{version_list[1]}"
                _lookup_table[serial_shorthand] = built_model
    return _lookup_table


def load_liquid_model(
    max_volume: PipetteModelType,
    channels: PipetteChannelType,
    version: PipetteVersionType,
) -> PipetteLiquidPropertiesDefinition:
    liquid_dict = _liquid(channels, max_volume, version)
    return PipetteLiquidPropertiesDefinition.parse_obj(liquid_dict)


def _change_to_camel_case(c: str) -> str:
    # Tiny helper function to convert to camelCase.
    config_name = c.split("_")
    if len(config_name) == 1:
        return config_name[0]
    return f"{config_name[0]}" + "".join(s.capitalize() for s in config_name[1::])


def update_pipette_configuration(
    base_configurations: PipetteConfigurations,
    v1_configuration_changes: Dict[str, Any],
) -> PipetteConfigurations:
    """Helper function to update 'V1' format configurations (left over from PipetteDict).

    #TODO (lc 7-14-2023) Remove once the pipette config dict is eliminated.
    Given an input of v1 mutable configs, look up the equivalent keyed
    value of that configuration."""
    quirks_list = []
    dict_of_base_model = base_configurations.dict(by_alias=True)

    for c, v in v1_configuration_changes.items():
        lookup_key = _change_to_camel_case(c)
        if c == "quirks" and isinstance(v, dict):
            quirks_list.extend([b.name for b in v.values() if b.value])
        else:
            try:
                dict_of_base_model[lookup_key] = v
            except KeyError:
                # The name is not the same format as previous so
                # we need to look it up from the V2 key map
                new_names = _MAP_KEY_TO_V2[lookup_key]
                top_name = new_names["top_level_name"]
                nested_name = new_names["nested_name"]
                if c == "tipLength":
                    # This is only a concern for OT-2 configs and I think we can
                    # be less smart about handling multiple tip types by updating
                    # all tips.
                    for k in dict_of_base_model[new_names["top_level_name"]].keys():
                        dict_of_base_model[top_name][k][nested_name] = v
                else:
                    # isinstances are needed for type checking.
                    dict_of_base_model[top_name][nested_name] = v
    dict_of_base_model["quirks"] = list(
        set(dict_of_base_model["quirks"]) - set(quirks_list)
    )

    # re-serialization is not great for this nested enum so we need
    # to perform this workaround.
    dict_of_base_model["supportedTips"] = {
        k.name: v for k, v in dict_of_base_model["supportedTips"].items()
    }
    return PipetteConfigurations.parse_obj(dict_of_base_model)


def load_definition(
    max_volume: PipetteModelType,
    channels: PipetteChannelType,
    version: PipetteVersionType,
) -> PipetteConfigurations:
    if (
        version.major not in PipetteModelMajorVersion
        or version.minor not in PipetteModelMinorVersion
    ):
        raise KeyError("Pipette version not found.")

    geometry_dict = _geometry(channels, max_volume, version)
    physical_dict = _physical(channels, max_volume, version)
    liquid_dict = _liquid(channels, max_volume, version)

    generation = PipetteGenerationType(physical_dict["displayCategory"])
    mount_configs = MOUNT_CONFIG_LOOKUP_TABLE[generation][channels]

    return PipetteConfigurations.parse_obj(
        {
            **geometry_dict,
            **physical_dict,
            **liquid_dict,
            "version": version,
            "mount_configurations": mount_configs,
        }
    )
