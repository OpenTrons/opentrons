"""Opentrons helper methods."""
import asyncio
from random import random, randint
from types import MethodType
from typing import Any, List, Dict, Optional, Tuple, Union
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
from opentrons.protocol_api._types import OffDeckType
from opentrons.protocol_api._nozzle_layout import NozzleLayout
from opentrons.protocols.types import APIVersion
from opentrons.hardware_control.thread_manager import ThreadManager
from opentrons.hardware_control.types import OT3Mount, Axis, HardwareFeatureFlags
from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.instruments.ot3.pipette import Pipette

from opentrons import execute, simulate
from opentrons.types import Point, Location, Mount
from opentrons.config.types import OT3Config, RobotConfig
from opentrons_shared_data.labware.types import LabwareDefinition

from hardware_testing.opentrons_api import helpers_ot3
from opentrons.protocol_api import ProtocolContext, InstrumentContext
from opentrons.protocol_api.labware import SET_OFFSET_RESTORED_API_VERSION
from .workarounds import (
    get_sync_hw_api,
    get_latest_offset_for_labware,
)
from hardware_testing.opentrons_api.helpers_ot3 import (
    clear_pipette_ul_per_mm,
)
from opentrons.protocol_engine.types import LabwareOffset

import opentrons.protocol_engine.execution.pipetting as PE_pipetting
from opentrons.protocol_engine.notes import CommandNoteAdder

from opentrons.protocol_engine import StateView
from opentrons.protocol_api.core.engine import pipette_movement_conflict


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
        attached_instruments: Optional[
            Dict[Union[Mount, OT3Mount], Dict[str, Optional[str]]]
        ] = None,
        attached_modules: Optional[List[str]] = None,
        config: Union[OT3Config, RobotConfig, None] = None,
        loop: Optional[asyncio.AbstractEventLoop] = None,
        strict_attached_instruments: bool = True,
        use_usb_bus: bool = False,
        update_firmware: bool = True,
        status_bar_enabled: bool = True,
        feature_flags: Optional[HardwareFeatureFlags] = None,
    ) -> OT3API:
        return await helpers_ot3.build_async_ot3_hardware_api(
            is_simulating=is_simulating,
            pipette_left=pipette_left,
            pipette_right=pipette_right,
            gripper=gripper,
            loop=loop,
            stall_detection_enable=stall_detection_enable,
        )

    papi: protocol_api.ProtocolContext
    if is_simulating:
        papi = simulate.get_protocol_api(
            version=APIVersion.from_string(api_level),
            extra_labware=extra_labware,
            hardware_simulator=ThreadManager(_thread_manager_build_hw_api),
            robot_type="Flex",
            # use_virtual_hardware=False makes this simulation work unlike
            # opentrons_simulate, app-side analysis, and server-side analysis.
            # We need to do this because some of our hardware testing scripts still
            # interact directly with the OT3API and there is no way to tell Protocol
            # Engine's hardware virtualization about those updates.
            use_virtual_hardware=False,
        )
    else:
        papi = execute.get_protocol_api(
            version=APIVersion.from_string(api_level), extra_labware=extra_labware
        )

    return papi


def well_is_reservoir(well: protocol_api.labware.Well) -> bool:
    """Well is reservoir."""
    return "reservoir" in well.parent.load_name


def get_list_of_wells_affected(
    well: Well,
    channels: int,
) -> List[Well]:
    """Get list of wells affected."""
    labware = well.parent
    num_rows = len(labware.rows())
    num_cols = len(labware.columns())
    if num_rows == 1 and num_cols == 1:
        return [well]  # aka: 1-well reservoir
    if channels == 1:
        return [well]  # 1ch pipette
    if channels == 8:
        if num_rows == 1:
            return [well]  # aka: 12-well reservoir
        else:
            assert (
                num_rows == 8
            ), f"8ch pipette cannot go to labware with {num_rows} rows"
            well_col = well.well_name[1:]  # the "1" in "A1"
            wells_list = [w for w in well.parent.columns_by_name()[well_col]]
            assert well in wells_list, "Well is not inside column"
            return wells_list
    if channels == 96:
        return labware.wells()
    raise ValueError(
        f"unable to find affected wells for {channels}ch pipette (well={well})"
    )


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
    _liquid_height = _well_depth + 2
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
    hwapi = get_sync_hw_api(ctx)
    pipette.move_to(well.top())
    lps = config._get_liquid_probe_settings(cfg, well)
    # NOTE: very important that probing is done only 1x time,
    #       with a DRY tip, for reliability
    probed_z = hwapi.liquid_probe(OT3Mount.LEFT, well.depth, lps)
    if ctx.is_simulating():
        probed_z = well.top().point.z - 1
    liq_height = probed_z - well.bottom().point.z
    if abs(liq_height - well.depth) < 0.01:
        raise RuntimeError("unable to probe liquid, reach max travel distance")
    return liq_height


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


def _override_set_current_volume(self, new_volume: float) -> None:  # noqa: ANN001
    assert new_volume >= 0
    # assert new_volume <= self.working_volume
    self._current_volume = new_volume


def _override_add_current_volume(self, volume_incr: float) -> None:  # noqa: ANN001
    self._current_volume += volume_incr


def _override_ok_to_add_volume(self, volume_incr: float) -> bool:  # noqa: ANN001
    return True


def _override_validate_asp_vol(
    state_view: StateView,
    pipette_id: str,
    aspirate_volume: float,
    command_note_adder: CommandNoteAdder,
) -> float:
    return aspirate_volume


def _override_check_safe_for_pipette_movement(
    engine_state: StateView,
    pipette_id: str,
    labware_id: str,
    well_name: str,
    well_location: object,
) -> None:
    pass


def _override_software_supports_high_volumes() -> None:
    # yea so ok this is pretty ugly but this is super helpful for us
    # with this we don't need to apply patches, and can run the testing scripts
    # without pushing modified code to the robot

    Pipette.set_current_volume = _override_set_current_volume  # type: ignore[assignment]
    Pipette.ok_to_add_volume = _override_ok_to_add_volume  # type: ignore[assignment]
    Pipette.add_current_volume = _override_add_current_volume  # type: ignore[assignment]
    PE_pipetting._validate_aspirate_volume = _override_validate_asp_vol  # type: ignore[assignment]


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


def _drop_tip(
    pipette: InstrumentContext,
    return_tip: bool,
    minimum_z_height: int = 0,
    offset: Optional[Point] = None,
) -> None:
    if return_tip:
        pipette.return_tip(home_after=False)
    else:
        if offset is not None:
            # we don't actually need the offset, if this is an 8 channel we always center channel
            # a1 over the back of the trash
            trash_well = pipette.trash_container.well(0)  # type: ignore[union-attr]
            trash_container = trash_well.center().move(
                Point(0, trash_well.width / 2, 0)  # type: ignore[union-attr, operator]
            )
            pipette.drop_tip(
                trash_container,
                home_after=False,
            )
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
    elif user_volumes:
        if ctx.is_simulating():
            rand_vols = [round(random() * tip_volume, 1) for _ in range(randint(1, 3))]
            _inp = ",".join([str(r) for r in rand_vols])
        else:
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
        _override_software_supports_high_volumes()
        if not _check_if_software_supports_high_volumes():
            raise RuntimeError("you are not the correct branch")
    return test_volumes


def _load_pipette(
    ctx: ProtocolContext,
    pipette_channels: int,
    pipette_volume: int,
    pipette_mount: str,
    increment: bool,
    photometric: bool,
    gantry_speed: Optional[int] = None,
) -> InstrumentContext:
    pip_name = f"flex_{pipette_channels}channel_{pipette_volume}"
    ui.print_info(f'pipette "{pip_name}" on mount "{pipette_mount}"')

    # if we're doing multiple tests in one run, the pipette may already be loaded
    loaded_pipettes = ctx.loaded_instruments
    if pipette_mount in loaded_pipettes.keys():
        return loaded_pipettes[pipette_mount]

    trash = ctx.load_labware("opentrons_1_trash_3200ml_fixed", "A3")
    pipette = ctx.load_instrument(pip_name, pipette_mount)
    loaded_pipettes = ctx.loaded_instruments
    assert pipette.max_volume == pipette_volume, (
        f"expected {pipette_volume} uL pipette, "
        f"but got a {pipette.max_volume} uL pipette"
    )
    if gantry_speed is not None:
        pipette.default_speed = gantry_speed

    # NOTE: 8ch QC testing means testing 1 channel at a time,
    #       so we need to decrease the pick-up current to work with 1 tip.
    if pipette.channels == 8 and not increment and not photometric:
        pipette._core.configure_nozzle_layout(
            style=NozzleLayout.SINGLE,
            primary_nozzle="A1",
            front_right_nozzle="A1",
            back_left_nozzle="A1",
        )
        # override pipette movement conflict checking 'cause we specially lay out our tipracks
        pipette_movement_conflict.check_safe_for_pipette_movement = (
            _override_check_safe_for_pipette_movement
        )
    pipette.trash_container = trash
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


def _get_offsets_from_ctx(ctx: ProtocolContext) -> List[LabwareOffset]:
    state = ctx._core._engine_client._transport._engine.state_view  # type: ignore[attr-defined]
    ctx_offsets = state._labware_store._state.labware_offsets_by_id
    return [_o for _o in ctx_offsets.values()]


def _load_tipracks(
    ctx: ProtocolContext,
    cfg: config.VolumetricConfig,
    use_adapters: bool = False,
) -> List[Labware]:
    tiprack_load_settings: List[Tuple[int, str]] = [
        (
            slot,
            f"opentrons_flex_96_tiprack_{cfg.tip_volume}ul",
        )
        for slot in cfg.slots_tiprack
    ]
    print(f"LOAD TIPRack{use_adapters}")
    for ls in tiprack_load_settings:
        ui.print_info(f'Loading tiprack "{ls[1]}" in slot #{ls[0]}')

    adapter: Optional[str] = (
        "opentrons_flex_96_tiprack_adapter" if use_adapters else None
    )
    # If running multiple tests in one run, the labware may already be loaded
    loaded_labwares = ctx.loaded_labwares
    print(f"Loaded labwares {loaded_labwares}")
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
                ctx._core.move_labware(
                    loaded_labwares[ls[0]]._core,
                    new_location=OffDeckType.OFF_DECK,
                    use_gripper=False,
                    pause_for_manual_move=False,
                    pick_up_offset=None,
                    drop_offset=None,
                )
    if len(pre_loaded_tips) == len(tiprack_load_settings):
        return pre_loaded_tips

    tipracks: List[Labware] = []
    for ls in tiprack_load_settings:
        if ctx.deck[ls[0]] is not None:
            tipracks.append(
                ctx.deck[ls[0]].load_labware(ls[1])  # type: ignore[union-attr]
            )
        else:
            tipracks.append(ctx.load_labware(ls[1], location=ls[0], adapter=adapter))

    if ctx.api_version >= SET_OFFSET_RESTORED_API_VERSION:
        for tiprack in tipracks:
            offset = get_latest_offset_for_labware(_get_offsets_from_ctx(ctx), tiprack)
            tiprack.set_offset(offset.x, offset.y, offset.z)
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
