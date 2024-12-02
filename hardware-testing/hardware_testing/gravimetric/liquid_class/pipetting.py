"""Pipette motions."""
from dataclasses import dataclass
from typing import Optional, Callable, Tuple

from opentrons.protocol_api import InstrumentContext, ProtocolContext
from opentrons.protocol_api.labware import Well

from hardware_testing.gravimetric import config
from hardware_testing.gravimetric.workarounds import get_sync_hw_api
from hardware_testing.gravimetric.liquid_height.height import LiquidTracker
from hardware_testing.opentrons_api.types import OT3Mount, Point
from hardware_testing.opentrons_api.helpers_ot3 import clear_pipette_ul_per_mm

from .definition import LiquidClassSettings


@dataclass
class LiquidSurfaceHeights:
    """Liquid Surface Heights."""

    above: float
    below: float


@dataclass
class PipettingHeights:
    """Pipetting heights."""

    start: LiquidSurfaceHeights
    end: LiquidSurfaceHeights


@dataclass
class PipettingCallbacks:
    """Pipetting callbacks."""

    on_submerging: Callable
    on_mixing: Callable
    on_aspirating: Callable
    on_dispensing: Callable
    on_retracting: Callable
    on_blowing_out: Callable
    on_exiting: Callable


def _check_aspirate_dispense_args(
    mix: Optional[float], aspirate: Optional[float], dispense: Optional[float]
) -> None:
    if mix is None and aspirate is None and dispense is None:
        raise ValueError("either mix, aspirate or dispense volume must be set")
    if aspirate and dispense or mix and aspirate or mix and dispense:
        raise ValueError("only a mix, aspirate or dispense volumes can be set")


def _get_approach_submerge_retract_heights(
    well: Well,
    liquid_tracker: LiquidTracker,
    liquid_class: LiquidClassSettings,
    mix: Optional[float],
    aspirate: Optional[float],
    dispense: Optional[float],
    blank: bool,
    channel_count: int,
) -> Tuple[float, float, float]:
    if aspirate:
        liq_submerge = liquid_class.aspirate.submerge_mm
        liq_retract = liquid_class.aspirate.retract_mm
    else:
        liq_submerge = liquid_class.dispense.submerge_mm
        liq_retract = liquid_class.dispense.retract_mm

    liquid_before, liquid_after = liquid_tracker.get_before_and_after_heights(
        well,
        aspirate=aspirate if aspirate else 0,
        dispense=dispense,
        channels=channel_count,
    )
    if blank:
        # force the pipette to move above the well
        liquid_before = well.depth + (well.depth - liquid_before)
        liquid_after = well.depth + (well.depth - liquid_after)

    if dispense and liq_submerge > 0:
        # guarantee NON-contact dispensing does not touch liquid
        submerge = liquid_after + liq_submerge
    else:
        # guarantee CONTACT dispensing and aspirates stay submerged
        submerge = min(liquid_before, liquid_after) + liq_submerge
    # also make sure it doesn't hit the well's bottom
    submerge = max(submerge, config.LABWARE_BOTTOM_CLEARANCE)
    approach = max(liquid_before + liq_retract, submerge)
    retract = max(liquid_after + liq_retract, submerge)
    return approach, submerge, retract


def _submerge(
    pipette: InstrumentContext,
    well: Well,
    height: float,
    channel_offset: Point,
    speed: float,
) -> None:
    pipette.move_to(
        well.bottom(height).move(channel_offset),
        speed=speed,
    )


def _retract(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    well: Well,
    channel_offset: Point,
    mm_above_well_bottom: float,
    speed: float,
) -> None:
    # retract out of the liquid (not out of the well)
    pipette.move_to(well.bottom(mm_above_well_bottom).move(channel_offset), speed=speed)


def _pipette_with_liquid_settings(  # noqa: C901
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    liquid_class: LiquidClassSettings,
    well: Well,
    channel_offset: Point,
    channel_count: int,
    liquid_tracker: LiquidTracker,
    callbacks: PipettingCallbacks,
    mix: Optional[float] = None,
    aspirate: Optional[float] = None,
    dispense: Optional[float] = None,
    blank: bool = True,
    touch_tip: bool = False,
    mode: str = "",
    clear_accuracy_function: bool = False,
    pose_for_camera: bool = False,
) -> None:
    """Run a pipette given some Pipetting Liquid Settings."""
    # FIXME: stop using hwapi, and get those functions into core software
    hw_api = get_sync_hw_api(ctx)
    hw_mount = OT3Mount.LEFT if pipette.mount == "left" else OT3Mount.RIGHT
    hw_pipette = hw_api.hardware_pipettes[hw_mount.to_mount()]

    def _get_max_blow_out_ul() -> float:
        # NOTE: calculated using blow-out distance (mm) and the nominal ul-per-mm
        blow_out_ul_per_mm = hw_pipette.config.shaft_ul_per_mm
        bottom = hw_pipette.plunger_positions.bottom
        blow_out = hw_pipette.plunger_positions.blow_out
        return (blow_out - bottom) * blow_out_ul_per_mm

    # ASPIRATE/DISPENSE SEQUENCE HAS THREE PHASES:
    #  1. APPROACH
    #  2. SUBMERGE
    #  3. RETRACT

    # CALCULATE TIP HEIGHTS FOR EACH PHASE
    approach_mm, submerge_mm, retract_mm = _get_approach_submerge_retract_heights(
        well,
        liquid_tracker,
        liquid_class,
        mix,
        aspirate,
        dispense,
        blank,
        channel_count,
    )
    if pose_for_camera:
        retract_mm = well.depth
        approach_mm = max(approach_mm, retract_mm)
        if dispense and liquid_class.dispense.submerge_mm > 2:
            submerge_mm = well.depth

    # SET Z SPEEDS DURING SUBMERGE/RETRACT
    if aspirate or mix:
        submerge_speed = liquid_class.aspirate.z_speed
        retract_speed = liquid_class.aspirate.z_speed
    else:
        submerge_speed = liquid_class.dispense.z_speed
        retract_speed = liquid_class.dispense.z_speed

    # CREATE CALLBACKS FOR EACH PHASE
    def _aspirate_on_approach() -> None:
        if hw_pipette.current_volume > 0:
            print(
                "WARNING: removing trailing air-gap from pipette, "
                "this should only happen during blank trials"
            )
            pipette.dispense(volume=pipette.current_volume)
        if mode:
            # NOTE: increment test requires the plunger's "bottom" position
            #       does not change during the entire test run
            hw_api.set_liquid_class(hw_mount, mode)
        else:
            cfg_volume: float = aspirate if aspirate else dispense  # type: ignore[assignment]
            pipette.configure_for_volume(cfg_volume)
        if clear_accuracy_function:
            clear_pipette_ul_per_mm(hw_api, hw_mount)  # type: ignore[arg-type]
        pipette.prepare_to_aspirate()

    def _aspirate_on_mix() -> None:
        callbacks.on_mixing()
        _submerge(pipette, well, submerge_mm, channel_offset, submerge_speed)
        _num_mixes = 5
        push_out = min(liquid_class.dispense.push_out, _get_max_blow_out_ul())
        for i in range(_num_mixes):
            pipette.aspirate(mix)
            ctx.delay(liquid_class.aspirate.delay)
            if i < _num_mixes - 1:
                pipette.dispense(mix)
            else:
                pipette.dispense(dispense, push_out=push_out)
            ctx.delay(liquid_class.dispense.delay)
        # don't go all the way up to retract position, but instead just above liquid
        _retract(ctx, pipette, well, channel_offset, approach_mm, retract_speed)
        pipette.blow_out()
        pipette.prepare_to_aspirate()
        assert pipette.current_volume == 0

    def _aspirate_on_submerge() -> None:
        # aspirate specified volume
        callbacks.on_aspirating()
        pipette.aspirate(aspirate)
        # delay
        ctx.delay(liquid_class.aspirate.delay)
        # update liquid-height tracker
        liquid_tracker.update_affected_wells(
            well, aspirate=aspirate, channels=channel_count
        )

    def _aspirate_on_retract() -> None:
        if liquid_class.aspirate.retract_delay and liquid_class.aspirate.submerge_mm < 0:
            # NOTE: residual liquid on outside of tip will drop down to bottom of tip
            #       after retracting from liquid. If we air-gap too soon before
            #       said liquid slides down to bottom of tip, the air-gap we create
            #       will be encased by liquid at the bottom after the residual liquid
            #       does eventually slide down. So instead, wait for it to slide down,
            #       then air-gap, thus pulling it also up into the pipette. To reduce
            #       the residual volume, the aspirate submerge depth is reduced.
            ctx.delay(seconds=liquid_class.aspirate.retract_delay)
        # add trailing-air-gap
        air_gap = liquid_class.aspirate.air_gap
        if not blank and air_gap > 0:
            pipette.flow_rate.aspirate = max(air_gap, 1)  # 1 second (minimum)
            pipette.aspirate(liquid_class.aspirate.air_gap)
            pipette.flow_rate.aspirate = liquid_class.aspirate.flow_rate

    def _dispense_on_approach() -> None:
        # remove trailing-air-gap if:
        #  1) not a "blank" trial
        #  2) currently holds an air-gap
        #  3) contact dispensing (below meniscus)
        has_air_gap = liquid_class.aspirate.air_gap > 0
        # NOTE: it is preferable to INCLUDE the air-gap with the actual dispense
        #       during a NON-CONTACT dispense, b/c the liquid will first exit
        #       the tip at a faster speed, reducing the chance of the liquid
        #       adhering to outside of tip.
        likely_a_contact_dispense = liquid_class.dispense.submerge_mm <= 1
        if not blank and has_air_gap and likely_a_contact_dispense:
            pipette.flow_rate.dispense = max(liquid_class.aspirate.air_gap, 1)  # 1 second (minimum)
            pipette.dispense(liquid_class.aspirate.air_gap)
            pipette.flow_rate.dispense = liquid_class.dispense.flow_rate

    def _dispense_on_submerge() -> None:
        callbacks.on_dispensing()
        # FIXME: hack to enable "break-off" deceleration during dispense
        #        ideally this would only decelerate, while acceleration
        #        would remain at the higher default "flow-acceleration"
        #        from shared-data
        default_flow_accel = float(hw_pipette.flow_acceleration)
        try:
            push_out: Optional[float] = liquid_class.dispense.push_out
            break_off: Optional[float] = liquid_class.dispense.break_off_ul
            assert (
                push_out is None or push_out <= _get_max_blow_out_ul()
            ), f"push-out ({push_out}) cannot exceed {_get_max_blow_out_ul()}"
            if not break_off:
                if liquid_class.dispense.break_off_flow_acceleration:
                    hw_pipette.flow_acceleration = liquid_class.dispense.break_off_flow_acceleration
                pipette.dispense(push_out=push_out)
            else:
                assert push_out is not None, \
                    "push-out must be specified when setting a break-off volume"
                if break_off == push_out:
                    break_off = push_out + 0.1

                def _break_off_cfg() -> None:
                    pipette.flow_rate.dispense = liquid_class.dispense.break_off_flow_rate
                    pipette.flow_rate.blow_out = liquid_class.dispense.break_off_flow_rate
                    hw_api.set_flow_rate(hw_mount, blow_out=liquid_class.dispense.break_off_flow_rate)
                    if liquid_class.dispense.break_off_flow_acceleration:
                        hw_pipette.flow_acceleration = liquid_class.dispense.break_off_flow_acceleration

                if break_off < push_out:
                    # 1) dispense w/ push-out (minus break-out ul)
                    _reduced_push_out_ul = push_out - break_off
                    pipette.dispense(push_out=_reduced_push_out_ul)
                    # 2) blow-out using break-off ul and speed
                    _break_off_cfg()
                    hw_api.blow_out(OT3Mount.LEFT, push_out)  # NOTE: volume is absolute below "bottom"
                elif break_off > push_out:
                    # 1) dispense a reduced amount
                    _remaining_ul = break_off - push_out
                    pipette.dispense(pipette.current_volume - _remaining_ul)
                    # 1) dispense remaininng liquid plus push-out
                    _break_off_cfg()
                    pipette.dispense(_remaining_ul, push_out=push_out)
        finally:
            hw_pipette.flow_acceleration = default_flow_accel
            pipette.flow_rate.dispense = liquid_class.dispense.flow_rate
            hw_api.set_flow_rate(hw_mount, blow_out=liquid_class.dispense.flow_rate)  # FIXME: is this correct?
        # delay
        _delay_seconds = liquid_class.dispense.delay
        if liquid_class.dispense.submerge_mm >= 0:
            # NOTE: include retract delay if dispense is non-contact
            _delay_seconds = max(_delay_seconds, liquid_class.dispense.retract_delay)
        ctx.delay(_delay_seconds)
        # update liquid-height tracker
        liquid_tracker.update_affected_wells(
            well, dispense=dispense, channels=channel_count
        )

    def _dispense_on_retract() -> None:
        if liquid_class.dispense.retract_delay and liquid_class.dispense.submerge_mm < 0:
            # NOTE: if non-contact dispense, the "retract" delay should have already happened
            ctx.delay(seconds=liquid_class.dispense.retract_delay)
        # NOTE: both the plunger reset or tje trailing-air-gap
        #       pull remaining droplets inside the tip upwards
        if pipette.current_volume <= 0:
            # NOTE: yes, liquid would get pulled up
            if liquid_class.dispense.blow_out:
                callbacks.on_blowing_out()
                pipette.blow_out()
            pipette.flow_rate.aspirate = min(liquid_class.dispense.push_out, 1)
            pipette.prepare_to_aspirate()
            pipette.flow_rate.aspirate = liquid_class.aspirate.flow_rate
        else:
            pipette.air_gap(liquid_class.aspirate.air_gap, height=0)
        if touch_tip:
            pipette.touch_tip(speed=config.TOUCH_TIP_SPEED)

    # PHASE 1: APPROACH
    pipette.flow_rate.aspirate = liquid_class.aspirate.flow_rate
    pipette.flow_rate.dispense = liquid_class.dispense.flow_rate
    pipette.flow_rate.blow_out = liquid_class.dispense.flow_rate  # FIXME: is this correct?

    pipette.move_to(well.bottom(approach_mm).move(channel_offset))
    _aspirate_on_approach() if aspirate or mix else _dispense_on_approach()

    if mix:
        # PHASE 2A: MIXING
        _aspirate_on_mix()
    else:
        # PHASE 2B: ASPIRATE or DISPENSE
        callbacks.on_submerging()
        _submerge(pipette, well, submerge_mm, channel_offset, submerge_speed)
        _aspirate_on_submerge() if aspirate else _dispense_on_submerge()

        # PHASE 3: RETRACT
        callbacks.on_retracting()
        _retract(ctx, pipette, well, channel_offset, retract_mm, retract_speed)
        _aspirate_on_retract() if aspirate else _dispense_on_retract()

    # EXIT
    callbacks.on_exiting()


def mix_with_liquid_class(
    ctx: ProtocolContext,
    liquid_class: LiquidClassSettings,
    pipette: InstrumentContext,
    mix_volume: float,
    well: Well,
    channel_offset: Point,
    channel_count: int,
    liquid_tracker: LiquidTracker,
    callbacks: PipettingCallbacks,
    blank: bool = False,
    touch_tip: bool = False,
    mode: str = "",
    clear_accuracy_function: bool = False,
    pose_for_camera: bool = False,
) -> None:
    """Mix with liquid class."""
    _pipette_with_liquid_settings(
        ctx,
        pipette,
        liquid_class,
        well,
        channel_offset,
        channel_count,
        liquid_tracker,
        callbacks,
        mix=mix_volume,
        blank=blank,
        touch_tip=touch_tip,
        mode=mode,
        clear_accuracy_function=clear_accuracy_function,
        pose_for_camera=pose_for_camera,
    )


def aspirate_with_liquid_class(
    ctx: ProtocolContext,
    liquid_class: LiquidClassSettings,
    pipette: InstrumentContext,
    aspirate_volume: float,
    well: Well,
    channel_offset: Point,
    channel_count: int,
    liquid_tracker: LiquidTracker,
    callbacks: PipettingCallbacks,
    blank: bool = False,
    touch_tip: bool = False,
    mode: str = "",
    clear_accuracy_function: bool = False,
    pose_for_camera: bool = False,
) -> None:
    """Aspirate with liquid class."""
    _pipette_with_liquid_settings(
        ctx,
        pipette,
        liquid_class,
        well,
        channel_offset,
        channel_count,
        liquid_tracker,
        callbacks,
        aspirate=aspirate_volume,
        blank=blank,
        touch_tip=touch_tip,
        mode=mode,
        clear_accuracy_function=clear_accuracy_function,
        pose_for_camera=pose_for_camera,
    )


def dispense_with_liquid_class(
    ctx: ProtocolContext,
    liquid_class: LiquidClassSettings,
    pipette: InstrumentContext,
    dispense_volume: float,
    well: Well,
    channel_offset: Point,
    channel_count: int,
    liquid_tracker: LiquidTracker,
    callbacks: PipettingCallbacks,
    blank: bool = False,
    touch_tip: bool = False,
    mode: str = "",
    clear_accuracy_function: bool = False,
    pose_for_camera: bool = False,
) -> None:
    """Dispense with liquid class."""
    _pipette_with_liquid_settings(
        ctx,
        pipette,
        liquid_class,
        well,
        channel_offset,
        channel_count,
        liquid_tracker,
        callbacks,
        dispense=dispense_volume,
        blank=blank,
        touch_tip=touch_tip,
        mode=mode,
        clear_accuracy_function=clear_accuracy_function,
        pose_for_camera=pose_for_camera,
    )
