"""Testing LLD Height Estimation during 1000uL Dynamic Aspirations."""
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from os import listdir
from os.path import isdir
from typing import Optional, Tuple, List, Any, Dict

from opentrons.types import Point
from opentrons.protocol_api import (
    ProtocolContext,
    ParameterContext,
    Labware,
    InstrumentContext,
    Well,
    Liquid,
)
from opentrons.hardware_control.types import OT3Mount
from opentrons.hardware_control.ot3_calibration import SLOT_CENTER
from opentrons_shared_data.deck import (
    Z_PREP_OFFSET,
    get_calibration_square_position_in_slot,
)
from opentrons_shared_data.load import get_shared_data_root

metadata = {"protocolName": "LLD 1000uL Tube-to-Tube"}
requirements = {"robotType": "Flex", "apiLevel": "2.22"}

SHAKER_RPM = 1100  # TODO: (sigler) double-check this again production script
SHAKER_SECONDS = 30

# hardcoded distances for when pressure-probing the calibration square
PROBE_START_HEIGHT_ABOVE_EXPECTED_MM = 10.0
PROBE_OVERSHOOT_BELOW_EXPECTED_MM = 5.0
EXPECTED_PROBE_Z_POSITION_MM = 0.0  # NOTE: the calibration square in slot C2

CALIBRATION_SLOT = SLOT_CENTER  # NOTE: also "B2"

SLOTS = {
    "trash": "A3",
    "tips_1": "A1",
    "tips_2": "A2",
    "tips_3": "B1",
    "src_reservoir": "B2",
    "test_labware": "D1",
    "dst_plate": "D2",
    "dst_plate_stack_start": "C1",  # FIXME: stack plates + lids
    "dst_plate_stack_end": "B3",  # FIXME: stack plates + lids
    "reader": "D3",
    "shaker": "C3",
    "empty": "B2",  # NOTE: (sigler) use for tip-overlap calibration
}

P1000_MAX_PUSH_OUT_UL = 79.0
DISPENSE_MM_FROM_MENISCUS = 2.0

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


# ASPIRATE-MODES are PRE-CONFIGURED by SOURCE-WELL
M = AspirateMode.MENISCUS
M_LLD = AspirateMode.MENISCUS_LLD
ASPIRATE_MODE_BY_WELL: Dict[int, Dict[str, List[AspirateMode]]] = {
    6: {
        "A": [M_LLD, M, M_LLD],
        "B": [M, M_LLD, M],
    },
    12: {
        "A": [M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M],
    },
    15: {
        "A": [M_LLD, M, M_LLD, M, M_LLD],
        "B": [M, M_LLD, M, M_LLD, M],
        "C": [M_LLD, M, M_LLD, M, M_LLD],
    },
    24: {
        "A": [M_LLD, M, M_LLD, M, M_LLD, M],
        "B": [M_LLD, M, M_LLD, M, M_LLD, M],
        "C": [M_LLD, M, M_LLD, M, M_LLD, M],
        "D": [M_LLD, M, M_LLD, M, M_LLD, M],
    },
    96: {
        "A": [M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M],
        "B": [M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M],
        "C": [M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M],
        "D": [M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M],
        "E": [M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M],
        "F": [M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M],
        "G": [M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M],
        "H": [M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M, M_LLD, M],
    },
}


@dataclass
class TestTrial:
    mode: AspirateMode
    test_well: Well
    ul_to_add: float
    ul_to_remove: float
    submerge_mm: float
    destination_wells: List[Well]
    destination_volumes: List[float]


def calibrate_tip_overlap(ctx: ProtocolContext, pipette: InstrumentContext) -> None:
    if ctx.is_simulating:
        return
    api = ctx._core.get_hardware()
    pip_mount = OT3Mount.LEFT if pipette.mount == "left" else OT3Mount.RIGHT
    deck_probe_position = Point(
        *get_calibration_square_position_in_slot(slot=CALIBRATION_SLOT)
    ) + Point(x=Z_PREP_OFFSET.x, y=Z_PREP_OFFSET.y, z=Z_PREP_OFFSET.z)

    # RETRACT and move to above the deck slot
    api.retract(pip_mount)
    current_pos = api.gantry_position(pip_mount)
    api.move_to(
        pip_mount,
        Point(x=deck_probe_position.x, y=deck_probe_position.y, z=current_pos.z),
    )
    api.move_to(
        pip_mount, deck_probe_position + Point(z=PROBE_START_HEIGHT_ABOVE_EXPECTED_MM)
    )

    # PROBE
    probed_deck_z = api.liquid_probe(
        pip_mount,
        PROBE_START_HEIGHT_ABOVE_EXPECTED_MM + PROBE_OVERSHOOT_BELOW_EXPECTED_MM,
    )
    api.retract(pip_mount)
    tip_overlap_error_mm = probed_deck_z - EXPECTED_PROBE_Z_POSITION_MM

    # MODIFY current tip length
    old_tip_length = api.hardware_pipette[pip_mount.to_mount()].current_tip_length
    new_tip_length = old_tip_length + tip_overlap_error_mm
    api.remove_tip(pip_mount)
    api.add_tip(pip_mount, tip_length=new_tip_length)


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
    # Use `mm_offset_min_vol` to set a millimeter tolerance keep the tip from
    # going below the "minimum LLD height" of this pipette+tip combo
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
            f"{get_shared_data_root()}/labware/definitions/2/{load_name}/"
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
) -> Tuple[Labware, Labware, List[Labware]]:
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
    test_labware = _load_labware(
        ctx,
        test_labware_load_name,
        SLOTS["test_labware"],
        liquid=(air, 0.01),
    )
    # TODO: stack plate w/ lids
    if num_plates > 1:
        raise NotImplementedError("multiple plates not yet implemented")
    dst_plates = [
        _load_labware(
            ctx,
            LOAD_NAME_DST_PLATE,
            SLOTS["dst_plate_stack_start"],
            liquid=(air, 0.01),
        )
    ]
    return src_reservoir, test_labware, dst_plates


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
        default=-1.5,
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
    # factor of safety (defined in mm) to guarantee that the tip will not submerge
    # BELOW the minimum LLD height of that pipette + tip combination.
    parameters.add_float(
        display_name="mm_offset_min_vol",
        variable_name="mm_offset_min_vol",
        default=0.5,
        minimum=0.1,  # NOTE: minimum seems to be >=0.05 to pass simulation
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
    parameters.add_int(
        display_name="wavelength",
        variable_name="wavelength",
        default=450,
        choices=[
            {"display_name": "450", "value": 450},
            {"display_name": "562", "value": 562},
            {"display_name": "600", "value": 600},
            {"display_name": "650", "value": 650},
        ],
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
    wavelength = ctx.params.wavelength  # type: ignore[attr-defined]

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
    # NOTE: `InstrumentContext.get_minimum_liquid_sense_height()`
    #       requires a tip to be currently attached, else it raises an error.
    #       We call that function when pre-calculating stuff.
    pipette.pick_up_tip()

    # LOAD PLATE-READER
    reader_module = ctx.load_module("absorbanceReaderV1", SLOTS["reader"])
    reader_module.close_lid()
    reader_module.initialize(mode="single", wavelengths=[wavelength])

    # LOAD HEATER-SHAKER
    shaker_module = ctx.load_module("heaterShakerModuleV1", SLOTS["shaker"])
    shaker_module.close_labware_latch()
    shaker_module.deactivate_heater()
    shaker_module.deactivate_shaker()
    shaker_adapter = shaker_module.load_adapter("opentrons_universal_flat_adapter")

    # LOAD LABWARE
    ctx.load_trash_bin(SLOTS["trash"])
    assert test_labware_load_name in list(
        LOAD_NAME_SRC_LABWARE_BY_CHANNELS[channels].values()
    ), f"{test_labware_load_name} cannot be tested with {channels}ch pipette"
    src_reservoir, test_labware, dst_plates = _helper_load_all_labware(
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
    test_trials_by_dst_plate: Dict[Labware, List[TestTrial]] = {
        dst_plate: [] for dst_plate in dst_plates
    }
    for dst_plate in dst_plates:
        remaining_dst_wells = dst_plate.wells()
        num_wells_in_labware = len(remaining_dst_wells)
        for test_well in test_labware.wells():
            # stop testing once the destination plate is full
            if not remaining_dst_wells:
                break
            # gather all variables needed for testing this well
            well_row = test_well.well_name[0]
            well_column = int(test_well.well_name[1:]) - 1  # zero indexed
            mode = ASPIRATE_MODE_BY_WELL[num_wells_in_labware][well_row][well_column]
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
            test_trials_by_dst_plate[dst_plate].append(
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
    range_hv = ctx.define_liquid(name="red-dye", display_color="#FF0000")
    dead_vol_for_reservoir = LOAD_NAME_SRC_RESERVOIRS[reservoir_load_name]
    total_dye_transferred = sum(
        [t.ul_to_add for tl in test_trials_by_dst_plate.values() for t in tl]
    )
    min_dye_required_in_reservoir = dead_vol_for_reservoir + total_dye_transferred
    src_reservoir.load_liquid([dye_src_well], min_dye_required_in_reservoir, range_hv)

    # DETECT LIQUID
    # NOTE: pipette should already have tip attached
    # FIXME: remove this once positioning bug is fixed in PE
    # pipette.move_to(dye_src_well.top())
    pipette.require_liquid_presence(dye_src_well)
    if not ctx.is_simulating():
        assert dye_src_well.current_liquid_volume() >= min_dye_required_in_reservoir, (
            f"must have >= {int(min_dye_required_in_reservoir)} uL "
            f"(detected {int(dye_src_well.current_liquid_volume())} uL)"
        )

    # RUN
    _detected_src = False
    for dst_plate, test_trials in test_trials_by_dst_plate.items():

        # MOVE PLATE TO DECK SLOT
        # TODO: stack plate w/ lids
        ctx.move_labware(dst_plate, new_location=SLOTS["dst_plate"], use_gripper=True)

        for trial in test_trials:
            # ADD DYE TO TEST-LABWARE
            while trial.test_well.current_liquid_volume() < trial.ul_to_add:
                remaining_ul = trial.ul_to_add - trial.test_well.current_liquid_volume()
                # NOTE: 1st trial has tip already attached
                if not pipette.has_tip:
                    pipette.pick_up_tip()
                # FIXME: remove this once positioning bug is fixed in PE
                # pipette.move_to(dye_src_well.top())
                pipette.prepare_to_aspirate()
                pipette.aspirate(
                    volume=min(remaining_ul, pipette.max_volume),
                    location=dye_src_well.meniscus(
                        target="dynamic", z=trial.submerge_mm
                    ),
                )
                # FIXME: remove this once positioning bug is fixed in PE
                # pipette.move_to(trial.test_well.top())
                pipette.dispense(
                    volume=pipette.current_volume,
                    location=trial.test_well.meniscus(
                        target="dynamic", z=DISPENSE_MM_FROM_MENISCUS
                    ),
                    push_out=P1000_MAX_PUSH_OUT_UL,
                )
            pipette.drop_tip()

            # REMOVE DYE FROM TEST-LABWARE
            print(f"removing {trial.ul_to_remove} uL")
            pipette.pick_up_tip()
            # NOTE: (sigler) calibrating THIS tip, because the
            #       position is critical to determine if our submerge
            #       depths are reliable or not
            calibrate_tip_overlap(ctx, pipette)
            if trial.mode == AspirateMode.MENISCUS_LLD and not ctx.is_simulating():
                # FIXME: remove this once positioning bug is fixed in PE
                # pipette.move_to(trial.test_well.top())
                pipette.require_liquid_presence(trial.test_well)
            # FIXME: remove this once positioning bug is fixed in PE
            # pipette.move_to(trial.test_well.top())
            pipette.prepare_to_aspirate()
            pipette.aspirate(
                volume=trial.ul_to_remove,
                location=trial.test_well.meniscus(
                    target="dynamic", z=trial.submerge_mm
                ),
            )

            # MULTI-DISPENSE TO PLATE
            for w, v in zip(trial.destination_wells, trial.destination_volumes):
                push_out = 0 if v < pipette.current_volume else P1000_MAX_PUSH_OUT_UL
                # FIXME: remove this once positioning bug is fixed in PE
                # pipette.move_to(w.top())
                pipette.dispense(
                    volume=v,
                    location=w.meniscus(target="dynamic", z=DISPENSE_MM_FROM_MENISCUS),
                    push_out=push_out,
                )
                pipette.touch_tip(w)
            pipette.drop_tip()

        # MOVE PLATE TO SHAKER & SHAKE
        shaker_module.open_labware_latch()
        ctx.move_labware(dst_plate, new_location=shaker_adapter, use_gripper=True)
        shaker_module.close_labware_latch()
        shaker_module.set_and_wait_for_shake_speed(SHAKER_RPM)
        ctx.delay(seconds=SHAKER_SECONDS)
        shaker_module.deactivate_shaker()
        shaker_module.open_labware_latch()

        # MOVE PLATE TO READER & READ
        reader_module.open_lid()
        ctx.move_labware(dst_plate, new_location=reader_module, use_gripper=True)
        reader_module.close_lid()
        reader_module.read(
            export_filename=f"{dst_plate.load_name}_"
            f"{datetime.now().strftime('%Y-%m-%d_%H:%M:%S')}"
        )

        # MOVE PLATE TO FINAL SLOT
        # TODO: stack plate w/ lids
        reader_module.open_lid()
        ctx.move_labware(
            dst_plate, new_location=SLOTS["dst_plate_stack_end"], use_gripper=True
        )
        reader_module.close_lid()
