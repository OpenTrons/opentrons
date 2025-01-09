"""Runtime Parameters."""
from typing import List

from opentrons.protocol_api import ParameterContext


_slots = ["D1", "D2", "D3", "C1", "C2", "C3", "B1", "B2", "B3", "A1", "A2", "A3"]

_labware = {
    "tiprack": [
        "opentrons_flex_96_tiprack_50ul",
        "opentrons_flex_96_tiprack_200ul",
        "opentrons_flex_96_tiprack_1000ul",
        "opentrons_flex_96_filtertiprack_50ul",
        "opentrons_flex_96_filtertiprack_200ul",
        "opentrons_flex_96_filtertiprack_1000ul",
    ],
    "wellplate": [
        "opentrons_96_wellplate_200ul_pcr_full_skirt",
        "nest_96_wellplate_2ml_deep",
        "nest_96_wellplate_200ul_flat",
        "nest_96_wellplate_100ul_pcr_full_skirt",
        "appliedbiosystemsmicroamp_384_wellplate_40ul",
        "armadillo_96_wellplate_200ul_pcr_full_skirt",
        "biorad_384_wellplate_50ul",
        "biorad_96_wellplate_200ul_pcr",
        "corning_384_wellplate_112ul_flat",
        "corning_96_wellplate_360ul_flat",
        "corning_48_wellplate_1.6ml_flat",
        "corning_24_wellplate_3.4ml_flat",
        "corning_12_wellplate_6.9ml_flat",
        "corning_6_wellplate_16.8ml_flat",
        "thermoscientificnunc_96_wellplate_1300ul",
        "thermoscientificnunc_96_wellplate_2000ul",
        "usascientific_96_wellplate_2.4ml_deep",
    ],
    "reservoir": [
        "nest_12_reservoir_15ml",
        "nest_1_reservoir_195ml",
        "nest_1_reservoir_290ml",
        "agilent_1_reservoir_290ml",
        "axygen_1_reservoir_90ml",
        "usascientific_12_reservoir_22ml",
    ],
    "tuberack": [
        "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical",
        "opentrons_6_tuberack_nest_50ml_conical",
        "opentrons_15_tuberack_nest_15ml_conical",
        "opentrons_24_tuberack_nest_2ml_snapcap",
        "opentrons_24_tuberack_nest_2ml_screwcap",
        "opentrons_24_tuberack_nest_1.5ml_snapcap",
        "opentrons_24_tuberack_nest_1.5ml_screwcap",
        "opentrons_24_tuberack_nest_0.5ml_screwcap",
        "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical",
        "opentrons_6_tuberack_falcon_50ml_conical",
        "opentrons_15_tuberack_falcon_15ml_conical",
        "opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap",
        "opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap",
    ],
}


def _get_tag(n: str) -> str:
    return f"_{n} " if n else ""


def add_parameters_pipette(
    params: ParameterContext,
    label: str,
    default_name: str = "",
    default_mount: str = "",
    exclude_name: bool = False,
    exclude_mount: bool = False,
) -> None:
    if not exclude_name:
        params.add_str(
            variable_name=f"{label}_name",
            display_name=f"{label}_name",
            choices=[
                {"display_name": "P50S", "value": "flex_1channel_50"},
                {"display_name": "P1000S", "value": "flex_1channel_1000"},
                {"display_name": "P50M", "value": "flex_8channel_50"},
                {"display_name": "P1000M", "value": "flex_8channel_1000"},
                {"display_name": "P1000H", "value": "flex_96channel_1000"},
            ],
            default=default_name if default_name else "flex_1channel_50",
        )
    if not exclude_mount:
        params.add_str(
            variable_name=f"{label}_mount",
            display_name=f"{label}_mount",
            choices=[
                {"display_name": "left", "value": "left"},
                {"display_name": "right", "value": "right"},
            ],
            default=default_mount if default_mount else "left",
        )


def add_parameter_slot(
    params: ParameterContext,
    label: str,
    default_slot: str = "",
) -> None:
    if default_slot:
        assert default_slot in _slots
    params.add_str(
        variable_name=label,
        display_name=label,
        choices=[{"display_name": n, "value": n} for n in _slots],
        default=default_slot if default_slot else _slots[0],
    )


def _add_list_of_strings(
    params: ParameterContext, label: str, default: str, str_list: List[str]
) -> None:
    if default:
        assert default in str_list
    params.add_str(
        variable_name=label,
        display_name=label,
        choices=[{"display_name": n[-30:], "value": n} for n in str_list],
        default=default if default else str_list[0],
    )


def _add_labware_by_type(
    params: ParameterContext,
    label: str,
    default_name: str,
    default_slot: str,
    exclude_name: bool,
    exclude_slot: bool,
    labware_type: str,
) -> None:
    if not exclude_name:
        _add_list_of_strings(
            params, f"{label}_name", default_name, str_list=_labware[labware_type]
        )
    if not exclude_slot:
        add_parameter_slot(params, f"{label}_slot", default_slot)


def add_parameters_tiprack(
    params: ParameterContext,
    label: str,
    default_name: str = "",
    default_slot: str = "",
    exclude_name: bool = False,
    exclude_slot: bool = False,
) -> None:
    _add_labware_by_type(
        params,
        label,
        default_name,
        default_slot,
        exclude_name,
        exclude_slot,
        labware_type="tiprack",
    )


def add_parameters_wellplate(
    params: ParameterContext,
    label: str,
    default_name: str = "",
    default_slot: str = "",
    exclude_name: bool = False,
    exclude_slot: bool = False,
) -> None:
    _add_labware_by_type(
        params,
        label,
        default_name,
        default_slot,
        exclude_name,
        exclude_slot,
        labware_type="wellplate",
    )


def add_parameters_tuberack(
    params: ParameterContext,
    label: str,
    default_name: str = "",
    default_slot: str = "",
    exclude_name: bool = False,
    exclude_slot: bool = False,
) -> None:
    _add_labware_by_type(
        params,
        label,
        default_name,
        default_slot,
        exclude_name,
        exclude_slot,
        labware_type="tuberack",
    )


def add_parameters_reservoir(
    params: ParameterContext,
    label: str,
    default_name: str = "",
    default_slot: str = "",
    exclude_name: bool = False,
    exclude_slot: bool = False,
) -> None:
    _add_labware_by_type(
        params,
        label,
        default_name,
        default_slot,
        exclude_name,
        exclude_slot,
        labware_type="reservoir",
    )
