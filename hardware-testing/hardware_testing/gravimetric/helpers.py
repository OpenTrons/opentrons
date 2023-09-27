"""Opentrons helper methods."""
import asyncio
from types import MethodType
from typing import Any, List, Dict, Optional, Tuple
from statistics import stdev
from . import config
from .liquid_class.defaults import get_liquid_class
from .increments import get_volume_increments
from inspect import getsource

from hardware_testing.data import ui
from opentrons import protocol_api
from opentrons.protocols.api_support.deck_type import (
    guess_from_global_config as guess_deck_type_from_global_config,
)
from opentrons.protocol_api.labware import Well, Labware
from opentrons.protocols.types import APIVersion
from opentrons.hardware_control.thread_manager import ThreadManager
from opentrons.hardware_control.types import OT3Mount, Axis
from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.instruments.ot3.pipette import Pipette

from opentrons.types import Point, Location

from opentrons_shared_data.labware.dev_types import LabwareDefinition

from hardware_testing.opentrons_api import helpers_ot3
from opentrons.protocol_api import ProtocolContext, InstrumentContext
from .workarounds import get_sync_hw_api, get_latest_offset_for_labware
from hardware_testing.opentrons_api.helpers_ot3 import clear_pipette_ul_per_mm


def _add_fake_simulate(
    ctx: protocol_api.ProtocolContext, is_simulating: bool
) -> protocol_api.ProtocolContext:
    def _is_simulating(_: protocol_api.ProtocolContext) -> bool:
        return is_simulating

    setattr(ctx, "is_simulating", MethodType(_is_simulating, ctx))
    return ctx


def _add_fake_comment_pause(
    ctx: protocol_api.ProtocolContext,
) -> protocol_api.ProtocolContext:
    def _comment(_: protocol_api.ProtocolContext, a: Any) -> None:
        ui.print_info(a)

    def _pause(_: protocol_api.ProtocolContext, a: Any) -> None:
        ui.get_user_ready(a)

    setattr(ctx, "comment", MethodType(_comment, ctx))
    setattr(ctx, "pause", MethodType(_pause, ctx))
    return ctx


def get_api_context(
    api_level: str,
    is_simulating: bool = False,
    pipette_left: Optional[str] = None,
    pipette_right: Optional[str] = None,
    gripper: Optional[str] = None,
    extra_labware: Optional[Dict[str, LabwareDefinition]] = None,
    deck_version: str = guess_deck_type_from_global_config(),
    stall_detection_enable: Optional[bool] = None,
) -> protocol_api.ProtocolContext:
    """Get api context."""

    async def _thread_manager_build_hw_api(
        *args: Any, loop: asyncio.AbstractEventLoop, **kwargs: Any
    ) -> OT3API:
        return await helpers_ot3.build_async_ot3_hardware_api(
            is_simulating=is_simulating,
            pipette_left=pipette_left,
            pipette_right=pipette_right,
            gripper=gripper,
            loop=loop,
            stall_detection_enable=stall_detection_enable,
        )

    return protocol_api.create_protocol_context(
        api_version=APIVersion.from_string(api_level),
        hardware_api=ThreadManager(_thread_manager_build_hw_api),  # type: ignore[arg-type]
        deck_type="ot3_standard",
        extra_labware=extra_labware,
        deck_version=2,
    )


def well_is_reservoir(well: protocol_api.labware.Well) -> bool:
    """Well is reservoir."""
    return "reservoir" in well.parent.load_name


def get_list_of_wells_affected(
    well: Well,
    channels: int,
) -> List[Well]:
    """Get list of wells affected."""
    if channels > 1 and not well_is_reservoir(well):
        well_col = well.well_name[1:]  # the "1" in "A1"
        wells_list = [w for w in well.parent.columns_by_name()[well_col]]
        assert well in wells_list, "Well is not inside column"
    else:
        wells_list = [well]
    return wells_list


def get_pipette_unique_name(pipette: protocol_api.InstrumentContext) -> str:
    """Get a pipette's unique name."""
    return str(pipette.hw_pipette["pipette_id"])


def gantry_position_as_point(position: Dict[Axis, float]) -> Point:
    """Helper to convert Dict[Axis, float] to a Point()."""
    return Point(x=position[Axis.X], y=position[Axis.Y], z=position[Axis.Z])


def _jog_to_find_liquid_height(
    ctx: ProtocolContext, pipette: InstrumentContext, well: Well
) -> float:
    _well_depth = well.depth
    _liquid_height = _well_depth
    _jog_size = -1.0
    if ctx.is_simulating():
        return _liquid_height - 1
    while True:
        pipette.move_to(well.bottom(_liquid_height))
        inp = input(
            f"height={_liquid_height}: ENTER to jog {_jog_size} mm, "
            f'or enter new jog size, or "yes" to save: '
        )
        if inp:
            if inp[0] == "y":
                break
            try:
                _jog_size = min(max(float(inp), -1.0), 1.0)
            except ValueError:
                continue
        _liquid_height = min(max(_liquid_height + _jog_size, 0), _well_depth)
    return _liquid_height


def _sense_liquid_height(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    well: Well,
    cfg: config.VolumetricConfig,
) -> float:
    if ctx.is_simulating():
        return well.depth - 1
    hwapi = get_sync_hw_api(ctx)
    pipette.move_to(well.top())
    lps = config._get_liquid_probe_settings(cfg, well)
    well_bottom_z = well.bottom().point.z
    # NOTE: very important that probing is done only 1x time,
    #       with a DRY tip, for reliability
    liquid_z = well.top().point.z - hwapi.liquid_probe(OT3Mount.LEFT, lps)
    liquid_depth = liquid_z - well_bottom_z
    return liquid_depth


def _calculate_average(volume_list: List[float]) -> float:
    return sum(volume_list) / len(volume_list)


def _reduce_volumes_to_not_exceed_software_limit(
    test_volumes: List[float],
    pipette_volume: int,
    pipette_channels: int,
    tip_volume: int,
) -> List[float]:
    for i, v in enumerate(test_volumes):
        liq_cls = get_liquid_class(pipette_volume, pipette_channels, tip_volume, int(v))
        max_vol = tip_volume - liq_cls.aspirate.trailing_air_gap
        test_volumes[i] = min(v, max_vol - 0.1)
    return test_volumes


def _check_if_software_supports_high_volumes() -> bool:
    src_a = getsource(Pipette.set_current_volume)
    src_b = getsource(Pipette.ok_to_add_volume)
    modified_a = "# assert new_volume <= self.working_volume" in src_a
    modified_b = "return True" in src_b
    return modified_a and modified_b


def _get_channel_offset(cfg: config.VolumetricConfig, channel: int) -> Point:
    assert (
        channel < cfg.pipette_channels
    ), f"unexpected channel on {cfg.pipette_channels} channel pipette: {channel}"
    if cfg.pipette_channels == 1:
        return Point()
    if cfg.pipette_channels == 8:
        return Point(y=channel * 9.0)
    if cfg.pipette_channels == 96:
        row = channel % 8  # A-H
        col = int(float(channel) / 8.0)  # 1-12
        return Point(x=col * 9.0, y=row * 9.0)
    raise ValueError(f"unexpected number of channels in config: {cfg.pipette_channels}")


def _get_robot_serial(is_simulating: bool) -> str:
    if not is_simulating:
        return input("ROBOT SERIAL NUMBER:").strip()
    else:
        return "simulation-serial-number"


def _get_operator_name(is_simulating: bool) -> str:
    if not is_simulating:
        return input("OPERATOR name:").strip()
    else:
        return "simulation"


def _calculate_stats(
    volume_list: List[float], total_volume: float
) -> Tuple[float, float, float]:
    average = _calculate_average(volume_list)
    if len(volume_list) <= 1:
        ui.print_info("skipping CV, only 1x trial per volume")
        cv = -0.01  # negative number is impossible
    else:
        cv = stdev(volume_list) / average
    d = (average - total_volume) / total_volume
    return average, cv, d


def _get_tip_batch(is_simulating: bool, tip: int) -> str:
    if not is_simulating:
        return input(f"TIP BATCH for {tip}ul tips:").strip()
    else:
        return "simulation-tip-batch"


def _apply(labware: Labware, cfg: config.VolumetricConfig) -> None:
    o = get_latest_offset_for_labware(cfg.labware_offsets, labware)
    ui.print_info(
        f'Apply labware offset to "{labware.name}" (slot={labware.parent}): '
        f"x={round(o.x, 2)}, y={round(o.y, 2)}, z={round(o.z, 2)}"
    )
    labware.set_calibration(o)


def _apply_labware_offsets(
    cfg: config.VolumetricConfig,
    labwares: List[Labware],
) -> None:
    for lw in labwares:
        _apply(lw, cfg)


def _pick_up_tip(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    cfg: config.VolumetricConfig,
    location: Location,
) -> None:
    ui.print_info(
        f"picking tip {location.labware.as_well().well_name} "
        f"from slot #{location.labware.parent.parent}"
    )
    pipette.pick_up_tip(location)
    # NOTE: the accuracy-adjust function gets set on the Pipette
    #       each time we pick-up a new tip.
    if cfg.increment:
        ui.print_info("clearing pipette ul-per-mm table to be linear")
        clear_pipette_ul_per_mm(
            get_sync_hw_api(ctx)._obj_to_adapt,  # type: ignore[arg-type]
            OT3Mount.LEFT if cfg.pipette_mount == "left" else OT3Mount.RIGHT,
        )

    pipette.home_plunger()


def _drop_tip(
    pipette: InstrumentContext, return_tip: bool, minimum_z_height: int = 0
) -> None:
    if return_tip:
        pipette.return_tip(home_after=False)
    else:
        pipette.drop_tip(home_after=False)
    if minimum_z_height > 0:
        cur_location = pipette._get_last_location_by_api_version()
        if cur_location is not None:
            pipette.move_to(cur_location.move(Point(0, 0, minimum_z_height)))


def _get_volumes(
    ctx: ProtocolContext,
    increment: bool,
    pipette_channels: int,
    pipette_volume: int,
    tip_volume: int,
    user_volumes: bool,
    kind: config.ConfigType,
    extra: bool,
    channels: int,
    mode: str = "",
) -> List[float]:
    if increment:
        test_volumes = get_volume_increments(
            pipette_channels, pipette_volume, tip_volume, mode=mode
        )
    elif user_volumes and not ctx.is_simulating():
        _inp = input(
            f'Enter desired volumes for tip{tip_volume}, comma separated (eg: "10,100,1000") :'
        )
        test_volumes = [
            float(vol_str) for vol_str in _inp.strip().split(",") if vol_str
        ]
    else:
        test_volumes = get_test_volumes(
            kind, channels, pipette_volume, tip_volume, extra
        )
    if not _check_if_software_supports_high_volumes():
        if ctx.is_simulating():
            test_volumes = _reduce_volumes_to_not_exceed_software_limit(
                test_volumes, pipette_volume, channels, tip_volume
            )
        else:
            raise RuntimeError("you are not the correct branch")
    return test_volumes


def _load_pipette(
    ctx: ProtocolContext,
    pipette_channels: int,
    pipette_volume: int,
    pipette_mount: str,
    increment: bool,
    gantry_speed: Optional[int] = None,
) -> InstrumentContext:
    pip_name = f"flex_{pipette_channels}channel_{pipette_volume}"
    ui.print_info(f'pipette "{pip_name}" on mount "{pipette_mount}"')

    # if we're doing multiple tests in one run, the pipette may already be loaded
    loaded_pipettes = ctx.loaded_instruments
    if pipette_mount in loaded_pipettes.keys():
        return loaded_pipettes[pipette_mount]

    pipette = ctx.load_instrument(pip_name, pipette_mount)
    assert pipette.max_volume == pipette_volume, (
        f"expected {pipette_volume} uL pipette, "
        f"but got a {pipette.max_volume} uL pipette"
    )
    if gantry_speed is not None:
        pipette.default_speed = gantry_speed

    # NOTE: 8ch QC testing means testing 1 channel at a time,
    #       so we need to decrease the pick-up current to work with 1 tip.
    if pipette.channels == 8 and not increment:
        hwapi = get_sync_hw_api(ctx)
        mnt = OT3Mount.LEFT if pipette_mount == "left" else OT3Mount.RIGHT
        hwpipette: Pipette = hwapi.hardware_pipettes[mnt.to_mount()]
        hwpipette.pick_up_configurations.current = 0.2
    return pipette


def _get_tag_from_pipette(
    pipette: InstrumentContext, increment: bool, user_volumes: bool
) -> str:
    pipette_tag = get_pipette_unique_name(pipette)
    ui.print_info(f'found pipette "{pipette_tag}"')
    if increment:
        pipette_tag += "-increment"
    elif user_volumes:
        pipette_tag += "-user-volume"
    else:
        pipette_tag += "-qc"
    return pipette_tag


def _load_tipracks(
    ctx: ProtocolContext,
    cfg: config.VolumetricConfig,
    use_adapters: bool = False,
) -> List[Labware]:
    adp_str = "_adp" if use_adapters else ""
    tiprack_load_settings: List[Tuple[int, str]] = [
        (
            slot,
            f"opentrons_flex_96_tiprack_{cfg.tip_volume}ul{adp_str}",
        )
        for slot in cfg.slots_tiprack
    ]
    for ls in tiprack_load_settings:
        ui.print_info(f'Loading tiprack "{ls[1]}" in slot #{ls[0]}')
    if use_adapters:
        tiprack_namespace = "custom_beta"
    else:
        tiprack_namespace = "opentrons"

    # If running multiple tests in one run, the labware may already be loaded
    loaded_labwares = ctx.loaded_labwares
    pre_loaded_tips: List[Labware] = []
    for ls in tiprack_load_settings:
        if ls[0] in loaded_labwares.keys():
            if loaded_labwares[ls[0]].name == ls[1]:
                pre_loaded_tips.append(loaded_labwares[ls[0]])
            else:
                # If something is in the slot that's not what we want, remove it
                # we use this only for the 96 channel
                ui.print_info(
                    f"Removing {loaded_labwares[ls[0]].name} from slot {ls[0]}"
                )
                del ctx._core.get_deck()[ls[0]]  # type: ignore[attr-defined]
    if len(pre_loaded_tips) == len(tiprack_load_settings):
        return pre_loaded_tips

    tipracks = [
        ctx.load_labware(ls[1], location=ls[0], namespace=tiprack_namespace)
        for ls in tiprack_load_settings
    ]
    _apply_labware_offsets(cfg, tipracks)
    return tipracks


def get_test_volumes(
    kind: config.ConfigType, pipette: int, volume: int, tip: int, extra: bool
) -> List[float]:
    """Get test volumes."""
    volumes: List[float] = []
    print(f"Finding volumes for p {pipette} {volume} with tip {tip}, extra: {extra}")
    if kind is config.ConfigType.photometric:
        for t, vls in config.QC_VOLUMES_P[pipette][volume]:
            if t == tip:
                volumes = vls
                break
    else:
        if extra:
            cfg = config.QC_VOLUMES_EXTRA_G
        else:
            cfg = config.QC_VOLUMES_G

        for t, vls in cfg[pipette][volume]:
            print(f"tip {t} volumes {vls}")
            if t == tip:
                volumes = vls
                break
    print(f"final volumes: {volumes}")
    return volumes


def get_default_trials(increment: bool, kind: config.ConfigType, channels: int) -> int:
    """Return the default number of trials for QC tests."""
    if increment:
        return 3
    else:
        return config.QC_DEFAULT_TRIALS[kind][channels]
