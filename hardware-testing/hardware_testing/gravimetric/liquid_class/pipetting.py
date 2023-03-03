"""Pipette motions."""
from dataclasses import dataclass
from typing import Optional, Callable

from opentrons.protocol_api import InstrumentContext, ProtocolContext
from opentrons.protocol_api.labware import Well

from hardware_testing.gravimetric.liquid_height.height import LiquidTracker

from .definition import LiquidClassSettings
from .defaults import get_liquid_class


LABWARE_BOTTOM_CLEARANCE = 1.5
TIP_SPEED_WHILE_SUBMERGED = 5


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


def _create_pipetting_heights(
    start_mm: float, end_mm: float, submerge: float, retract: float
) -> PipettingHeights:
    # Calculates the:
    #     1) current liquid-height of the well
    #     2) the resulting liquid-height of the well, after a specified volume is
    #        aspirated/dispensed
    #
    # Then, use these 2 liquid-heights (start & end heights) to return four Locations:
    #     1) Above the starting liquid height
    #     2) Submerged in the starting liquid height
    #     3) Above the ending liquid height
    #     4) Submerged in the ending liquid height
    return PipettingHeights(
        start=LiquidSurfaceHeights(
            above=max(start_mm + retract, LABWARE_BOTTOM_CLEARANCE),
            below=max(start_mm - submerge, LABWARE_BOTTOM_CLEARANCE),
        ),
        end=LiquidSurfaceHeights(
            above=max(end_mm + retract, LABWARE_BOTTOM_CLEARANCE),
            below=max(end_mm - submerge, LABWARE_BOTTOM_CLEARANCE),
        ),
    )


@dataclass
class PipettingCallbacks:
    """Pipetting callbacks."""

    on_submerging: Optional[Callable]
    on_aspirating: Optional[Callable]
    on_dispensing: Optional[Callable]
    on_retracting: Optional[Callable]
    on_blowing_out: Optional[Callable]
    on_exiting: Optional[Callable]


def _pipette_with_liquid_settings(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    liquid_class: LiquidClassSettings,
    well: Well,
    liquid_tracker: LiquidTracker,
    aspirate: Optional[float] = None,
    dispense: Optional[float] = None,
    callbacks: Optional[PipettingCallbacks] = None,
) -> None:
    """Run a pipette given some Pipetting Liquid Settings."""
    if aspirate:
        assert dispense is None
    else:
        assert dispense is not None and dispense > 0
    pipette.flow_rate.aspirate = liquid_class.aspirate.flow_rate
    pipette.flow_rate.dispense = liquid_class.dispense.flow_rate

    # CALCULATE HEIGHTS
    height_before, height_after = liquid_tracker.get_before_and_after_heights(
        pipette, well, aspirate=aspirate, dispense=dispense
    )
    if aspirate:
        height_settings = liquid_class.aspirate
    else:
        height_settings = liquid_class.dispense  # type: ignore[assignment]
    pipetting_heights = _create_pipetting_heights(
        height_before, height_after, height_settings.submerge, height_settings.retract
    )

    # APPROACH
    start_above = max(pipetting_heights.start.above, pipetting_heights.end.below)
    pipette.move_to(well.bottom(start_above))

    if aspirate:
        # LEADING AIR-GAP
        pipette.aspirate(liquid_class.aspirate.air_gap.leading_air_gap)
    else:
        # TRAILING AIR-GAP
        pipette.dispense(liquid_class.aspirate.air_gap.trailing_air_gap)

    # SUBMERGE
    if callbacks and callbacks.on_submerging:
        callbacks.on_submerging()
    # TODO: implement liquid-height tracking here
    pipette.move_to(
        well.bottom(pipetting_heights.end.below),
        force_direct=True,
        speed=TIP_SPEED_WHILE_SUBMERGED,
    )

    # ASPIRATE/DISPENSE
    if aspirate:
        if callbacks and callbacks.on_aspirating:
            callbacks.on_aspirating()
        pipette.aspirate(aspirate)
    else:
        if callbacks and callbacks.on_dispensing:
            callbacks.on_dispensing()
        pipette.dispense()  # includes air from leading air-gap
    liquid_tracker.update_affected_wells(
        pipette, well, aspirate=aspirate, dispense=dispense
    )

    # DELAY
    if aspirate and liquid_class.aspirate.delay:
        ctx.delay(liquid_class.aspirate.delay)
    elif dispense and liquid_class.dispense.delay:
        ctx.delay(liquid_class.dispense.delay)

    # RETRACT
    if callbacks and callbacks.on_retracting:
        callbacks.on_retracting()
    pipette.move_to(
        well.bottom(pipetting_heights.end.above),
        force_direct=True,
        speed=TIP_SPEED_WHILE_SUBMERGED,
    )

    if aspirate:
        # TRAILING AIR-GAP
        pipette.aspirate(liquid_class.aspirate.air_gap.trailing_air_gap)
    else:
        # BLOW-OUT
        if callbacks and callbacks.on_blowing_out:
            callbacks.on_blowing_out()
        pipette.blow_out()
        pipette.aspirate(liquid_class.aspirate.air_gap.trailing_air_gap)

    # EXIT WELL
    if callbacks and callbacks.on_exiting:
        callbacks.on_exiting()
    pipette.move_to(well.top(), force_direct=True)


def aspirate_with_liquid_class(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    tip_volume: int,
    aspirate_volume: float,
    well: Well,
    liquid_tracker: LiquidTracker,
    callbacks: Optional[PipettingCallbacks] = None,
) -> None:
    """Aspirate with liquid class."""
    liquid_class = get_liquid_class(
        int(pipette.max_volume), tip_volume, int(aspirate_volume)
    )
    print(f"\taspirate:\n"
          f"\t\tleading = {liquid_class.aspirate.air_gap.leading_air_gap}\n"
          f"\t\tvolume = {aspirate_volume}\n"
          f"\t\ttrailing = {liquid_class.aspirate.air_gap.trailing_air_gap}")
    # FIXME: change API to allow going beyond tip max volume
    artificial_aspirate_max = tip_volume * 0.9
    if aspirate_volume > artificial_aspirate_max:
        aspirate_volume = artificial_aspirate_max
        print(f"WARNING: using workaround volume: {aspirate_volume}")
    _pipette_with_liquid_settings(
        ctx,
        pipette,
        liquid_class,
        well,
        liquid_tracker,
        aspirate=aspirate_volume,
        callbacks=callbacks,
    )


def dispense_with_liquid_class(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    tip_volume: int,
    dispense_volume: float,
    well: Well,
    liquid_tracker: LiquidTracker,
    callbacks: Optional[PipettingCallbacks] = None,
) -> None:
    """Dispense with liquid class."""
    liquid_class = get_liquid_class(
        int(pipette.max_volume), tip_volume, int(dispense_volume)
    )
    _pipette_with_liquid_settings(
        ctx,
        pipette,
        liquid_class,
        well,
        liquid_tracker,
        dispense=dispense_volume,
        callbacks=callbacks,
    )
