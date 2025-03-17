"""Testing LLD Height Estimation during 1000uL Dynamic Aspirations."""
from dataclasses import dataclass
from enum import Enum
from os import listdir
from os.path import isdir
from typing import Optional, Tuple, List, Any, Dict

from opentrons.protocol_api import (
    ProtocolContext,
    ParameterContext,
    Labware,
    InstrumentContext,
    Well,
    Liquid,
)
from opentrons_shared_data.load import get_shared_data_root

metadata = {"protocolName": "LLD 1000uL Tube-to-Tube"}
requirements = {"robotType": "Flex", "apiLevel": "2.22"}

SLOTS = {
    "trash": "A3",
    "tips_1": "A1",
    "tips_2": "A2",
    "tips_3": "B1",
    "tips_4": "B2",
    "src_reservoir": "C2",
    "test_labware_1": "D1",
    "dst_plate_1": "D2",
    "dst_plate_stack_start": "C1",  # FIXME: stack plates + lids
    "dst_plate_stack_end": "B3",  # FIXME: stack plates + lids
}

P1000_MAX_PUSH_OUT_UL = 79.0

# operator fills this labware with RED-DYE at protocol start
# ~20-25 mL per destination plate (eg: 5x plates requires 100-125 mL)
LOAD_NAME_SRC_RESERVOIRS: Dict[str, float] = {
    "nest_1_reservoir_290ml": 30000,
    "nest_1_reservoir_195ml": 30000,
    "nest_12_reservoir_15ml": 3000,
    "nest_96_wellplate_2ml_deep": 300,
}

# optical flat-bottom, for use in plate-reader (never changes)
LOAD_NAME_DST_PLATE = "corning_96_wellplate_360ul_flat"

LOAD_NAME_SRC_LABWARE_BY_CHANNELS = {
    1: {  # 1ch pipette
        "TUBES_2ML_SCREWCAP": "opentrons_24_tuberack_nest_2ml_screwcap",
        "TUBES_2ML_SNAPCAP": "opentrons_24_tuberack_nest_2ml_snapcap",
        "TUBES_1_5ML_SCREWCAP": "opentrons_24_tuberack_nest_1.5ml_screwcap",
        "TUBES_1_5ML_SNAPCAP": "opentrons_24_tuberack_nest_1.5ml_snapcap",
        "TUBES_15ML": "opentrons_15_tuberack_nest_15ml_conical",
        "TUBES_50ML": "opentrons_6_tuberack_nest_50ml_conical",
        "PLATE_200UL_PCR": "opentrons_96_wellplate_200ul_pcr_full_skirt",  # single-dispense (~150ul)
        "PLATE_200UL_FLAT": "nest_96_wellplate_200ul_flat",  # single-dispense (~150ul)
        "PLATE_360UL_FLAT": "corning_96_wellplate_360ul_flat",  # single-dispense (~200ul)
        "PLATE_2ML_DEEP": "nest_96_wellplate_2ml_deep",
    },
    8: {  # 8ch pipette
        "PLATE_15ML_RESERVOIR": "nest_12_reservoir_15ml",
    },
    96: {  # 96ch pipette
        "PLATE_195ML_RESERVOIR": "nest_1_reservoir_195ml",
        "PLATE_290ML_RESERVOIR": "nest_1_reservoir_290ml",
    },
}


class AspirateMode(Enum):
    MENISCUS = "meniscus"
    MENISCUS_LLD = "meniscus-lld"


@dataclass
class TestTrial:
    mode: AspirateMode
    test_well: Well
    ul_to_add: float
    ul_to_remove: float
    submerge_mm: float
    destination_wells: List[Well]
    destination_volumes: List[float]


def _binary_search_liquid_volume_at_height(
    well: Well, height: float, tolerance_mm: float = 0.1, max_iterations: int = 100
) -> float:
    # binary search to find a close-enough volume for a given height
    min_vol = 0.0
    max_vol = well.max_volume
    best_value = 0.0
    best_diff = float("inf")
    for _ in range(max_iterations):
        mid_vol = (min_vol + max_vol) / 2.0
        mid_vol_height = well.estimate_liquid_height_after_pipetting(mid_vol)
        diff_mm = abs(mid_vol_height - height)
        if diff_mm < best_diff:
            best_diff = diff_mm
            best_value = mid_vol
        if diff_mm < tolerance_mm:
            return best_value
        if mid_vol_height < height:
            min_vol = mid_vol  # Search in the upper half
        else:
            max_vol = mid_vol  # Search in the lower half
    return best_value


def _get_nominal_volume_range_for_dynamic_tracking(
    well: Well,
    pipette: InstrumentContext,
    mm_offset_pipette_tip: float,
    mm_offset_well_top: float,
) -> Tuple[float, float]:
    # this function calculate the MIN and MAX possible WELL volumes
    # that a given pipette at a given submerge depth can DYNAMICALLY pipette
    min_vol = _binary_search_liquid_volume_at_height(
        well,
        pipette.get_minimum_liquid_sense_height() + mm_offset_pipette_tip,
    )
    max_vol = _binary_search_liquid_volume_at_height(
        well,
        well.depth + mm_offset_well_top,
    )
    return min_vol, max_vol


def _get_add_then_remove_volumes_for_test_well(
    well: Well,
    pipette: InstrumentContext,
    submerge_mm: float,
    mm_offset_min_vol: float = 0.0,
    mm_offset_well_top: float = 0.0,
) -> Tuple[float, float]:
    # Returns the volumes to ADD and REMOVE to/from a given test well.
    # Use `mm_offset_min_vol_to_ending_height` to set a millimeter tolerance
    # to how LOW the liquid height can be. If `0`, the ending height will
    # be exactly
    min_vol, max_vol = _get_nominal_volume_range_for_dynamic_tracking(
        well,
        pipette,
        mm_offset_pipette_tip=(submerge_mm * -1) + mm_offset_min_vol,
        mm_offset_well_top=mm_offset_well_top,
    )
    # always try to aspirate 1000ul (b/c it creates largest Z travel)
    remove_vol = min(max_vol - min_vol, pipette.max_volume)
    return min_vol + remove_vol, remove_vol


def _get_multi_dispense_volumes(volume_in_tip: float) -> List[float]:
    # 1x dispenses
    if volume_in_tip < 200:
        disp_vols = [volume_in_tip]
    elif volume_in_tip <= 250:
        disp_vols = [volume_in_tip]

    # 2x dispenses
    elif volume_in_tip <= 200 + 200:
        disp_vols = [200, volume_in_tip - 200]
    elif volume_in_tip <= 250 + 200:
        disp_vols = [volume_in_tip - 200, 200]
    elif volume_in_tip <= 250 + 250:
        disp_vols = [250, volume_in_tip - 250]

    # 3x dispenses
    elif volume_in_tip <= 200 + 200 + 200:
        disp_vols = [200, 200, volume_in_tip - (200 + 200)]
    elif volume_in_tip <= 250 + 200 + 200:
        disp_vols = [volume_in_tip - (200 + 200), 200, 200]
    elif volume_in_tip <= 250 + 250 + 200:
        disp_vols = [250, volume_in_tip - (200 + 250), 200]
    elif volume_in_tip <= 250 + 250 + 250:
        disp_vols = [250, 250, volume_in_tip - (250 + 250)]

    # 4x dispenses
    elif volume_in_tip <= 200 + 200 + 200 + 200:
        disp_vols = [200, 200, 200, volume_in_tip - (200 + 200 + 200)]
    elif volume_in_tip <= 250 + 200 + 200 + 200:
        disp_vols = [volume_in_tip - (200 + 200 + 200), 200, 200, 200]
    elif volume_in_tip <= 250 + 250 + 200 + 200:
        disp_vols = [250, volume_in_tip - (200 + 200 + 250), 200, 200]
    elif volume_in_tip <= 250 + 250 + 250 + 200:
        disp_vols = [250, 250, volume_in_tip - (250 + 250 + 200), 200]
    elif volume_in_tip <= 250 + 250 + 250 + 250:
        disp_vols = [250, 250, 250, volume_in_tip - (250 + 250 + 250)]

    else:
        raise ValueError("this shouldn't happen")

    assert sum(disp_vols) == volume_in_tip
    for vol in disp_vols:
        # NOTE: we can support smaller volumes if we change the test to:
        #       a) use diluent
        #       b) use a different dye (not HV)
        if vol < 200 or vol > 250:
            vols_as_str = ",".join([str(v) for v in disp_vols])
            raise ValueError(f"can only dispense HV at 200-250 ul ({vols_as_str})")

    return disp_vols


def _get_aspirate_mode_for_well(well: Well) -> AspirateMode:
    # if given a labware and well in that labware, what strategy to use?
    well_row = well.well_name[0]
    well_column = int(well.well_name[1:])
    num_wells_in_labware = len(well.parent.wells())
    if num_wells_in_labware == 1:  # just the 2x different 1-well reservoirs
        raise NotImplementedError(
            "haven't yet implemented testing 1-well reservoir with 96ch"
        )
    elif num_wells_in_labware == 12:  # just the 12-row reservoir
        if well_row % 2 == 1:
            return AspirateMode.MENISCUS_LLD
        else:
            return AspirateMode.MENISCUS
    elif num_wells_in_labware == 15:  # just the 15ml tube-rack
        if well_column % 2 == 1:
            return (
                AspirateMode.MENISCUS_LLD if well_row in "AC" else AspirateMode.MENISCUS
            )
        else:
            return (
                AspirateMode.MENISCUS_LLD if well_row in "B" else AspirateMode.MENISCUS
            )
    else:
        # DEFAULT: assign a strategy to an entire ROW of the plate
        return (
            AspirateMode.MENISCUS_LLD if well_row in "ACEG" else AspirateMode.MENISCUS
        )


def _load_labware(
    ctx: ProtocolContext,
    load_name: str,
    location: str,
    liquid: Optional[Tuple[Liquid, float]] = None,
    **kwargs: Any,
) -> Labware:
    version: Optional[int] = None
    # will attempt to load the newest version of a Schema 3 labware (if found)
    # else it will fall back to whatever the API defaults to
    # finally, load it as empty (why not?)
    try:
        labware_def_location = (
            f"{get_shared_data_root()}/labware/definitions/3/{load_name}/"
        )
        assert isdir(labware_def_location)
        labware_def_latest = sorted(listdir(labware_def_location))[-1]
        version = int(labware_def_latest[0])
    except (AssertionError, FileNotFoundError, IndexError, ValueError):
        pass
    ret_labware = ctx.load_labware(load_name, location, version=version, **kwargs)
    if not ret_labware.is_tiprack:
        if liquid is not None:
            ret_labware.load_liquid(ret_labware.wells(), liquid[-1], liquid[0])
        else:
            ret_labware.load_empty(ret_labware.wells())
    return ret_labware


def _helper_load_all_labware(
    ctx: ProtocolContext,
    reservoir_load_name: str,
    test_labware_load_name: str,
    num_plates: int,
    pipette_channels: int,
) -> Tuple[Labware, List[Labware], List[Labware]]:
    assert test_labware_load_name in list(
        LOAD_NAME_SRC_LABWARE_BY_CHANNELS[pipette_channels].values()
    ), f"{test_labware_load_name} cannot be tested with {pipette_channels}ch pipette"
    # FIXME: get rid of this "air" liquid once the bug is fixed
    #        where we're not able to estimate-height if well is empty
    air = ctx.define_liquid(name="air", display_color="#FFFFFF")
    src_reservoir = _load_labware(
        ctx,
        reservoir_load_name,
        SLOTS["src_reservoir"],
        liquid=(air, 0.01),
    )
    test_labwares = [
        _load_labware(
            ctx,
            test_labware_load_name,
            SLOTS[f"test_labware_{i + 1}"],
            liquid=(air, 0.01),
        )
        for i in range(num_plates)
    ]
    # FIXME: make this a stack of plates and lids
    dst_plates = [
        _load_labware(
            ctx,
            LOAD_NAME_DST_PLATE,
            SLOTS[f"dst_plate_{i + 1}"],
            liquid=(air, 0.01),
        )
        for i in range(num_plates)
    ]
    return src_reservoir, test_labwares, dst_plates


def add_parameters(parameters: ParameterContext) -> None:
    """Add parameters."""
    parameters.add_int(
        display_name="channels",
        variable_name="channels",
        default=min(list(LOAD_NAME_SRC_LABWARE_BY_CHANNELS.keys())),
        choices=[
            {"display_name": str(ch), "value": ch}
            for ch in LOAD_NAME_SRC_LABWARE_BY_CHANNELS.keys()
        ],
    )
    parameters.add_int(
        display_name="num_plates",
        variable_name="num_plates",
        default=1,
        minimum=1,
        maximum=5,
    )
    parameters.add_str(
        display_name="reservoir",
        variable_name="reservoir",
        default=list(LOAD_NAME_SRC_RESERVOIRS.keys())[0],
        choices=[
            {"display_name": load_name, "value": load_name}
            for load_name in LOAD_NAME_SRC_RESERVOIRS.keys()
        ],
    )
    parameters.add_str(
        display_name="test_labware",
        variable_name="test_labware",
        default=LOAD_NAME_SRC_LABWARE_BY_CHANNELS[1]["TUBES_2ML_SCREWCAP"],
        choices=[
            {"display_name": label, "value": load_name}
            for info in LOAD_NAME_SRC_LABWARE_BY_CHANNELS.values()
            for label, load_name in info.items()
        ],
    )
    parameters.add_str(
        display_name="mount",
        variable_name="mount",
        default="left",
        choices=[{"display_name": m, "value": m} for m in ["left", "right"]],
    )
    parameters.add_float(
        display_name="submerge_no_lld",
        variable_name="submerge_no_lld",
        default=-3.0,
        minimum=-10.0,
        maximum=0.0,
    )
    parameters.add_float(
        display_name="submerge_yes_lld",
        variable_name="submerge_yes_lld",
        default=-1.5,
        minimum=-10.0,
        maximum=0.0,
    )
    # factor of safety (defined in mm) to guarantee that the liquid height
    # will NOT be too LOW, such that the pipette cannot reach the defined
    # SUBMERGE depth
    parameters.add_float(
        display_name="mm_offset_min_vol",
        variable_name="mm_offset_min_vol",
        default=3.0,  # NOTE: minimum seems to be >=0.05 to pass simulation
        minimum=0.0,
        maximum=100.0,
    )
    # NOTE: (sigler) this represents the deformation
    #       observed at the top ~1mm of the PCR well. We assume all labware have
    #       a similar thing going on, so let's stay away (eg: 2mm) from the top.
    parameters.add_float(
        display_name="mm_offset_well_top",
        variable_name="mm_offset_well_top",
        default=-2.0,
        minimum=-100.0,
        maximum=0.0,
    )


def run(ctx: ProtocolContext) -> None:
    """Run."""
    # RUNTIME PARAMETERS
    channels = ctx.params.channels  # type: ignore[attr-defined]
    num_plates = ctx.params.num_plates  # type: ignore[attr-defined]
    test_labware_load_name = ctx.params.test_labware  # type: ignore[attr-defined]
    reservoir_load_name = ctx.params.reservoir  # type: ignore[attr-defined]
    mount = ctx.params.mount  # type: ignore[attr-defined]
    submerge_mm_by_mode = {
        AspirateMode.MENISCUS: ctx.params.submerge_no_lld,  # type: ignore[attr-defined]
        AspirateMode.MENISCUS_LLD: ctx.params.submerge_yes_lld,  # type: ignore[attr-defined]
    }
    mm_offset_min_vol = ctx.params.mm_offset_min_vol  # type: ignore[attr-defined]
    mm_offset_well_top = ctx.params.mm_offset_well_top  # type: ignore[attr-defined]

    # LOAD PIPETTES
    num_tip_slots = len([s for s in SLOTS.keys() if "tip" in s])
    pipette = ctx.load_instrument(
        instrument_name=f"flex_{channels}channel_1000",
        mount=mount,
        tip_racks=[
            _load_labware(
                ctx, "opentrons_flex_96_tiprack_1000ul", SLOTS[f"tips_{i + 1}"]
            )
            for i in range(num_tip_slots)
        ],
    )
    # NOTE: Keep it simple. Just pick up a tip right-away.
    #       `InstrumentContext.get_minimum_liquid_sense_height()` requires a tip
    #       to be currently attached, else it raises an error.
    #       We call that function when pre-calculating stuff.
    pipette.pick_up_tip()

    # LOAD LABWARE
    ctx.load_trash_bin(SLOTS["trash"])
    assert test_labware_load_name in list(
        LOAD_NAME_SRC_LABWARE_BY_CHANNELS[channels].values()
    ), f"{test_labware_load_name} cannot be tested with {channels}ch pipette"
    src_reservoir, test_labwares, dst_plates = _helper_load_all_labware(
        ctx,
        reservoir_load_name=reservoir_load_name,
        test_labware_load_name=test_labware_load_name,
        num_plates=num_plates,
        pipette_channels=channels,
    )

    # PRE-DETERMINE VOLUME/LOCATIONS
    # NOTE: storing trials by test-labware instance, so that during
    #       the test-run loop we can easily know when to use the
    #       gripper to re-arrange things
    test_trials_by_labware: Dict[Labware, List[TestTrial]] = {
        test_labware: [] for test_labware in test_labwares
    }
    for test_labware, dst_plate in zip(test_labwares, dst_plates):
        remaining_dst_wells = dst_plate.wells()
        for test_well in test_labware.wells():
            # stop testing once the destination plate is full
            if not remaining_dst_wells:
                break
            # gather all variables needed for testing this well
            mode = _get_aspirate_mode_for_well(test_well)
            submerge_mm = submerge_mm_by_mode[mode]
            ul_to_add, ul_to_remove = _get_add_then_remove_volumes_for_test_well(
                test_well,
                pipette,
                submerge_mm,
                mm_offset_min_vol,
                mm_offset_well_top,
            )
            destination_volumes = _get_multi_dispense_volumes(
                volume_in_tip=ul_to_remove
            )
            destination_wells = [
                remaining_dst_wells.pop(0) for _ in range(len(destination_volumes))
            ]
            test_trials_by_labware[test_labware].append(
                TestTrial(
                    mode=mode,
                    test_well=test_well,
                    ul_to_add=ul_to_add,
                    ul_to_remove=ul_to_remove,
                    submerge_mm=submerge_mm,
                    destination_wells=destination_wells,
                    destination_volumes=destination_volumes,
                )
            )

    # LOAD LIQUID
    dye_src_well = src_reservoir["A1"]
    range_hv = ctx.define_liquid(name="range-hv", display_color="#FF0000")
    src_reservoir.load_liquid([dye_src_well], dye_src_well.max_volume, range_hv)

    # DETECT LIQUID
    # NOTE: pipette should already have tip attached
    pipette.require_liquid_presence(dye_src_well)
    dead_vol_for_reservoir = LOAD_NAME_SRC_RESERVOIRS[reservoir_load_name]
    total_dye_transferred = sum(
        [t.ul_to_add for tl in test_trials_by_labware.values() for t in tl]
    )
    min_dye_required_in_reservoir = dead_vol_for_reservoir + total_dye_transferred
    if not ctx.is_simulating():
        assert dye_src_well.current_liquid_volume() >= min_dye_required_in_reservoir, (
            f"must have >= {int(min_dye_required_in_reservoir)} uL "
            f"(detected {int(dye_src_well.current_liquid_volume())} uL)"
        )

    # RUN
    _detected_src = False
    for test_labware, test_trials in test_trials_by_labware.items():
        # TODO: use gripper to arrange things between test-labwares
        for trial in test_trials:

            # FIXME: use dynamic tracking for ALL aspirates/dispenses (entire test, why not)

            # ADD DYE TO TEST-LABWARE
            # NOTE: 1st trial has tip already attached
            if not pipette.has_tip:
                pipette.pick_up_tip()
            print(f"adding {trial.ul_to_add} uL")

            while trial.test_well.current_liquid_volume() < trial.ul_to_add:
                remaining_ul = trial.ul_to_add - trial.test_well.current_liquid_volume()
                pipette.aspirate(
                    min(remaining_ul, pipette.max_volume), dye_src_well.bottom(2)
                )
                pipette.dispense(
                    pipette.current_volume,
                    trial.test_well.top(),
                    push_out=P1000_MAX_PUSH_OUT_UL,
                )
            pipette.drop_tip()

            # REMOVE DYE FROM TEST-LABWARE
            print(f"removing {trial.ul_to_remove} uL")
            pipette.pick_up_tip()
            if trial.mode == AspirateMode.MENISCUS_LLD and not ctx.is_simulating():
                pipette.require_liquid_presence(trial.test_well)
            pipette.aspirate(
                trial.ul_to_remove, trial.test_well.meniscus(target="dynamic", z=trial.submerge_mm)
            )

            # MULTI-DISPENSE TO PLATE
            for w, v in zip(trial.destination_wells, trial.destination_volumes):
                push_out = 0 if v < pipette.current_volume else P1000_MAX_PUSH_OUT_UL
                pipette.dispense(v, w.top(), push_out=push_out)
            pipette.drop_tip()

        # TODO: move dst_plate to plate-reader and take reading
