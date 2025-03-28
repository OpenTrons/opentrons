from dataclasses import dataclass
from enum import Enum
from os import listdir
from typing import List, Dict, Optional

from opentrons.protocol_api import (
    ProtocolContext,
    Well,
    ParameterContext,
    Labware,
    Liquid,
    InstrumentContext,
)
from opentrons_shared_data.load import get_shared_data_root


class Strategy(Enum, str):
    M = "M"
    M_LLD = "M_LLD"
    M_LLD_TIP = "M_LLD_TIP"
    B = "B"
    T = "T"

    def includes_lld(self) -> bool:
        return bool("lld" in self.value.lower())

    def includes_meniscus(self) -> bool:
        return bool("m" in self.value.lower())

    def includes_new_tip(self) -> bool:
        return bool("tip" in self.value.lower())

    def includes_bottom(self) -> bool:
        return bool("b" in self.value.lower())

    def includes_top(self) -> bool:
        return bool("t" in self.value.lower())


TEST_MATRIX: Dict[str, Dict[str, Strategy]] = {
    "A": {"aspirate": Strategy.M_LLD_TIP, "dispense": Strategy.M},
    "B": {"aspirate": Strategy.M, "dispense": Strategy.M},
    "C": {"aspirate": Strategy.M_LLD, "dispense": Strategy.M},
    "D": {"aspirate": Strategy.B, "DSP": Strategy.T},
    "E": {"aspirate": Strategy.M_LLD_TIP, "dispense": Strategy.M},
    "F": {"aspirate": Strategy.M, "dispense": Strategy.M},
    "G": {"aspirate": Strategy.M_LLD, "dispense": Strategy.M},
    "H": {"aspirate": Strategy.B, "dispense": Strategy.B},
}

MAX_NUMBER_OF_PLATES = 5
DEFAULT_SUBMERGE_MM = -1.5
BOTTOM_MM = 1.5
DEFAULT_TARGET_BY_PLATE = [1.0, 1.2, 1.5, 2.0, 5.0]
DILUENT_PUSH_OUT = 20.0

metadata = {"protocolName": "LLD 1uL PCR-to-MVS-21MAR"}
requirements = {"robotType": "Flex", "apiLevel": "2.22"}

SLOTS = {
    "tips": ["A3", "B2", "B3", "C1", "B4", "C4", "A4"],
    "src": "D2",
    "dye_holder": "B1",
    "dst": "D3",
    "tips_200": "A2",
    "diluent_reservoir": "C2",
    "lids": "D4",
    "done": "D1",
}
# OPEN AREAS C3 AND C4

TIP_VOLUME = 50
PIP_VOLUME = 50

DEAD_VOL_PER_LABWARE = {
    "nest_12_reservoir_15ml": 3000,
    "nest_96_wellplate_2ml_deep": 30,
}

DYE_LABWARE = "nest_96_wellplate_2ml_deep"
SRC_LABWARE = "opentrons_96_wellplate_200ul_pcr_full_skirt"
DST_LABWARE = "corning_96_wellplate_360ul_flat"
DILUENT_LABWARE = "nest_12_reservoir_15ml"

PLATE_LID_LOAD_NAME = "plate_lid"  # custom labware?

DILUENT_SUMMED_UL_PER_COLUMN = [
    200,
    100,
    200,
    100,
    200,
    100,
    200,
    100,
    200,
    100,
    200,
    100,
]


@dataclass
class DyeInfo:
    min: float
    max: float
    total_ul: float
    num_plates: int
    liquid: Optional[Liquid]
    color: str
    src_well: str

    @classmethod
    def get_dye_for_volume(cls, volume: float) -> str:
        for n, info in DYE_INFO.items():
            if info.min <= volume <= info.max:
                return n


DYE_INFO: Dict[str, DyeInfo] = {
    "HV": DyeInfo(
        min=200.1,
        max=250.0,
        total_ul=0.0,
        num_plates=0,
        liquid=None,
        color="#9999FF",
        src_well="A6",
    ),
    "A": DyeInfo(
        min=50.0,
        max=200.0,
        total_ul=0.0,
        num_plates=0,
        liquid=None,
        color="#6666FF",
        src_well="A5",
    ),
    "B": DyeInfo(
        min=10.0,
        max=49.99,
        total_ul=0.0,
        num_plates=0,
        liquid=None,
        color="#3333FF",
        src_well="A4",
    ),
    "C": DyeInfo(
        min=2.0,
        max=9.99,
        total_ul=0.0,
        num_plates=0,
        liquid=None,
        color="#0000FF",
        src_well="A3",
    ),
    "D": DyeInfo(
        min=1.0,
        max=1.99,
        total_ul=0.0,
        num_plates=0,
        liquid=None,
        color="#0000CC",
        src_well="A2",
    ),
    "E": DyeInfo(
        min=0.1,
        max=0.99,
        total_ul=0.0,
        num_plates=0,
        liquid=None,
        color="#000088",
        src_well="A1",
    ),
}

_tip_counter = 0

_diluent_wells_used: List[Well] = []


def get_latest_version(load_name: str) -> int:
    labware_def_location = (
        f"{get_shared_data_root()}/labware/definitions/3/{load_name}/"
    )
    labware_def_latest = sorted(listdir(labware_def_location))[-1]
    return int(labware_def_latest[0])


def _pick_up_tip(pipette: InstrumentContext) -> None:
    global _tip_counter
    _pick_up_tip(pipette)
    _tip_counter += 1


def _do_tip_racks_need_rearranging() -> bool:
    return bool(_tip_counter >= ((4 * 96) - 21))


def _rearrange_tip_racks(ctx: ProtocolContext, tip_racks) -> None:
    global _tip_counter
    # if 4 tip racks have been used, switch out two of them
    # tip rack a3 goes to d3
    ctx.move_labware(tip_racks[0], SLOTS["dst"], use_gripper=True)
    # tip rack b4 goes to a3
    ctx.move_labware(tip_racks[4], SLOTS["tips"][0], use_gripper=True)
    # tip rack d3 goes to b4
    ctx.move_labware(tip_racks[0], SLOTS["tips"][4], use_gripper=True)
    # tip rack b2 goes to d3
    ctx.move_labware(tip_racks[1], SLOTS["dst"], use_gripper=True)
    # tip rack c4 goes to b2
    ctx.move_labware(tip_racks[5], SLOTS["tips"][1], use_gripper=True)
    # tip rack d3 goes to c4
    ctx.move_labware(tip_racks[1], SLOTS["tips"][5], use_gripper=True)
    # tip rack b3 goes to d3
    ctx.move_labware(tip_racks[2], SLOTS["dst"], use_gripper=True)
    ctx.move_labware(tip_racks[6], SLOTS["tips"][2], use_gripper=True)
    ctx.move_labware(tip_racks[2], SLOTS["tips"][6], use_gripper=True)
    _tip_counter = 0


def _spread_diluent_or_baseline(
    multi: InstrumentContext,
    labware: Labware,
    num_cols: int,
    red_dye_ul: float,
    alternate_ul: bool,
    is_init: bool,
) -> None:
    if not multi.has_tip:
        multi.pick_up_tip()
    diluent_well = _diluent_wells_used[0]
    for i, col in enumerate(labware.columns()[:num_cols]):
        if is_init:
            if alternate_ul:
                diluent_ul = DILUENT_SUMMED_UL_PER_COLUMN[i] - red_dye_ul
            else:
                diluent_ul = 200 - red_dye_ul  # baseline
        else:
            diluent_ul = 200.0 - diluent_well.current_liquid_volume()
        if diluent_ul > 0.0:
            multi.aspirate(diluent_ul, diluent_well.bottom(BOTTOM_MM))
            multi.dispense(diluent_ul, col[0].top(), push_out=DILUENT_PUSH_OUT)
            min_diluent_in_well = DEAD_VOL_PER_LABWARE[diluent_well.parent.load_name]
            if (
                diluent_well.current_liquid_volume() - (diluent_ul * 8)
                < min_diluent_in_well - 100.0
            ):
                _diluent_wells_used.pop(0)
                diluent_well = _diluent_wells_used[0]


def _spread_init_diluent(multi: InstrumentContext, labware: Labware) -> None:
    _spread_diluent_or_baseline(
        multi, labware, num_cols=12, red_dye_ul=0.0, alternate_ul=True, is_init=True
    )


def _spread_final_diluent(multi: InstrumentContext, labware: Labware) -> None:
    _spread_diluent_or_baseline(
        multi, labware, num_cols=12, red_dye_ul=0.0, alternate_ul=True, is_init=False
    )


def _spread_baseline(multi: InstrumentContext, labware: Labware) -> None:
    _spread_diluent_or_baseline(
        multi, labware, num_cols=12, red_dye_ul=0.0, alternate_ul=False, is_init=True
    )


def _load_liquid_diluent(
    ctx: ProtocolContext, diluent_reservoir: Labware, num_plates: int, num_cols: int
) -> None:
    global _diluent_wells_used
    # DILUENT (or BASELINE)
    total_photo_wells = num_plates * num_cols * 8
    total_diluent_needed = 200 * total_photo_wells  # worst case is 200uL
    dead_vol_diluent = DEAD_VOL_PER_LABWARE[diluent_reservoir.load_name]
    diluent_well_capacity = (
        diluent_reservoir["A1"].max_volume - 1000
    ) - dead_vol_diluent
    number_of_wells_needed = int(total_diluent_needed / diluent_well_capacity)
    total_diluent_per_well = (
        total_diluent_needed / number_of_wells_needed
    ) + dead_vol_diluent
    _diluent_wells_used = diluent_reservoir.wells()[:number_of_wells_needed]
    diluent = ctx.define_liquid("diluent", display_color="#0000FF")
    diluent_reservoir.load_liquid(_diluent_wells_used, total_diluent_per_well, diluent)


def _load_liquid_red_dye(
    ctx: ProtocolContext, dye_holder: Labware, volumes: List[float], num_cols: int
) -> None:
    # RED DYE
    dead_vol_dye = DEAD_VOL_PER_LABWARE[dye_holder.load_name]
    for v in volumes:
        dye_name = DyeInfo.get_dye_for_volume(v)
        DYE_INFO[dye_name].total_ul += v * num_cols * 8
        DYE_INFO[dye_name].num_plates += 1
        if DYE_INFO[dye_name].liquid is None:
            DYE_INFO[dye_name].liquid = ctx.define_liquid(
                name=f"dye_{dye_name.lower()}", display_color=DYE_INFO[dye_name].color
            )
        if DYE_INFO[dye_name].liquid:
            dye_ul = DYE_INFO[dye_name].total_ul + dead_vol_dye
            well = dye_holder[DYE_INFO[dye_name].src_well]
            well.load_liquid(DYE_INFO[dye_name].liquid, dye_ul)


def add_parameters(parameters: ParameterContext) -> None:
    """Add parameters."""
    for i in range(MAX_NUMBER_OF_PLATES):
        parameters.add_float(
            variable_name=f"volume_{i}",
            display_name=f"volume_{i}",
            default=DEFAULT_TARGET_BY_PLATE[i],
            minimum=0.0,
            maximum=50.0,
        )
    parameters.add_int(
        variable_name="columns_to_test",
        display_name="columns_to_test",
        minimum=1,
        maximum=12,
        default=12,  # default to a full plate
    )
    parameters.add_bool(
        variable_name="is_baseline", display_name="is_baseline", default=False
    )
    parameters.add_bool(
        variable_name="test_gripper_only",
        display_name="test_gripper_only",
        default=False,
    )
    for name, info in DYE_INFO.items():
        parameters.add_str(
            variable_name=f"dye_{name}_well",
            display_name=f"dye_{name}_well",
            default=info.src_well,
            choices=[
                {
                    "display_name": row + str(col),
                    "value": row + str(col),
                }
                for col in range(1, 13)
                for row in "ABCDEFGH"
            ],
        )
    parameters.add_float(
        variable_name="submerge_depth",
        display_name="submerge_depth",
        default=DEFAULT_SUBMERGE_MM,
        maximum=0.0,
        minimum=-10.0,
    )


def _run_trial(
    pipette: InstrumentContext,
    trial_ul: float,
    src: Well,
    dst: Well,
    submerge_mm: float,
) -> None:
    strategy = TEST_MATRIX[dst.well_name[0]]

    # PICK-UP TIP
    pipette.configure_for_volume(trial_ul)
    _pick_up_tip(pipette)

    # LLD
    if strategy["aspirate"].includes_lld():
        pipette.require_liquid_presence(src)
        if strategy["aspirate"].includes_new_tip():
            pipette.drop_tip()
            _pick_up_tip(pipette)

    # ASPIRATE
    if strategy["aspirate"].includes_meniscus():
        src_loc = src.meniscus(z=submerge_mm)
    elif strategy["aspirate"].includes_bottom():
        src_loc = src.bottom(BOTTOM_MM)
    else:
        mode_name = str(strategy["aspirate"].name)
        raise ValueError(f"unexpected mode: {mode_name}")
    pipette.aspirate(trial_ul, src_loc)
    pipette.touch_tip(speed=30)

    # DISPENSE
    if strategy["dispense"].includes_meniscus():
        dst_loc = dst.meniscus(z=submerge_mm)
    elif strategy["dispense"].includes_bottom():
        dst_loc = dst.bottom(BOTTOM_MM)
    elif strategy["dispense"].includes_top():
        dst_loc = dst.top()
    else:
        mode_name = str(strategy["dispense"].name)
        raise ValueError(f"unexpected mode: {mode_name}")
    push_out = 3.9 if trial_ul >= 5 else 11.7
    pipette.dispense(trial_ul, dst_loc, push_out=push_out)

    # DROP-TIP
    pipette.drop_tip()


def run(ctx: ProtocolContext) -> None:
    global _tip_counter, _diluent_wells_used

    # RUNTIME PARAMETERS
    is_baseline = ctx.params.is_baseline  # type: ignore[attr-defined]
    volume_list = [0.0]
    if not is_baseline:
        volume_list = [
            getattr(ctx.params, f"volume_{i}")
            for i in range(MAX_NUMBER_OF_PLATES)
            if getattr(ctx.params, f"volume_{i}") > 0
        ]
    for n in DYE_INFO.keys():
        DYE_INFO[n].src_well = getattr(ctx.params, f"dye_{n}_well")
    columns_to_test = ctx.params.columns_to_test  # type: ignore[attr-defined]
    test_gripper_only = ctx.params.test_gripper_only  # type: ignore[attr-defined]
    submerge_depth = ctx.params.submerge_depth  # type: ignore[attr-defined]

    # PIPETTES
    tip_racks_50s: List[Labware] = []
    pipette: Optional[InstrumentContext] = None
    if not is_baseline:
        tip_racks_50s = [
            ctx.load_labware(
                load_name=f"opentrons_flex_96_tiprack_{TIP_VOLUME}ul",
                location=location,
            )
            for location in SLOTS["tips"]
        ]
        pipette = ctx.load_instrument(
            instrument_name=f"flex_1channel_{PIP_VOLUME}",
            mount="left",
            tip_racks=tip_racks_50s,
        )
    diluent_pipette = ctx.load_instrument(
        instrument_name="flex_8channel_1000",
        mount="right",
        tip_racks=[
            ctx.load_labware(
                load_name="opentrons_flex_96_tiprack_200ul", location=SLOTS["tips_200"]
            )
        ],
    )

    # LABWARE
    ctx.load_trash_bin("A1")
    dye_holder: Optional[Labware] = None
    src_labware: Optional[Labware] = None
    if not is_baseline:
        dye_holder = ctx.load_labware(
            load_name=DYE_LABWARE,
            location=SLOTS["dye_holder"],
            version=get_latest_version(DYE_LABWARE),
        )
        src_labware = ctx.load_labware(
            load_name=SRC_LABWARE,
            location=SLOTS["src"],
            version=get_latest_version(SRC_LABWARE),
        )
    diluent_reservoir = ctx.load_labware(
        load_name=DILUENT_LABWARE,
        location=SLOTS["diluent_reservoir"],
        version=get_latest_version(DILUENT_LABWARE),
    )

    # STACK of EMPTY PLATES
    stack: List[Labware] = []
    stack_done: List[Labware] = []
    dst_version = get_latest_version(DST_LABWARE)
    for i in range(len(volume_list)):
        stack.append(stack[-1].load_labware(PLATE_LID_LOAD_NAME))
        stack.append(stack[-1].load_labware(DST_LABWARE, version=dst_version))

    # LIQUIDS
    if not test_gripper_only:
        if not is_baseline:
            src_labware.load_empty(src_labware.wells())
            dye_holder.load_empty(dye_holder.wells())
            _load_liquid_red_dye(
                ctx, dye_holder, volumes=volume_list, num_cols=columns_to_test
            )
        diluent_reservoir.load_empty(diluent_reservoir.wells())
        _load_liquid_diluent(
            ctx,
            diluent_reservoir,
            num_plates=len(volume_list),
            num_cols=columns_to_test,
        )
        for labware in stack:
            if labware.load_name == DST_LABWARE:
                labware.load_empty(labware.wells())

    for pcr_col_idx, target_ul in enumerate(volume_list):
        # MOVE PLATE and FILL with DILUENT
        plate = stack.pop()
        ctx.move_labware(plate, SLOTS["dst"], use_gripper=True)
        if not test_gripper_only:
            if is_baseline:
                _spread_baseline(diluent_pipette, plate)
                break
            else:
                _spread_init_diluent(diluent_pipette, plate)

        # REARRANGE TIP-RACKS
        if _do_tip_racks_need_rearranging():
            _rearrange_tip_racks(ctx, tip_racks_50s)

        # MOVE DYE to PCR PLATE
        ul_needed_in_pcr = (
            DEAD_VOL_PER_LABWARE[src_labware.load_name] + target_ul * columns_to_test
        )
        dye_name = DyeInfo.get_dye_for_volume(target_ul)
        dye_well = dye_holder[DYE_INFO[dye_name].src_well]
        if not test_gripper_only:
            for row in "ABCDEFGH":
                pipette.aspirate(ul_needed_in_pcr, dye_well.bottom(BOTTOM_MM))
                pcr_well = src_labware[f"{row}{pcr_col_idx + 1}"]
                pipette.dispense(ul_needed_in_pcr, pcr_well.bottom(BOTTOM_MM))

        # RUN TRIALS
        if not test_gripper_only:
            for row in "ABCDEFGH":
                pcr_well = src_labware[f"{row}{pcr_col_idx + 1}"]
                for col_idx in range(12):
                    photo_well = plate[f"{row}{col_idx + 1}"]
                    _run_trial(
                        pipette,
                        target_ul,
                        src=pcr_well,
                        dst=photo_well,
                        submerge_mm=submerge_depth,
                    )

        # FILL REMAINING COLUMNS WITH DILUENT
        if not test_gripper_only:
            _spread_final_diluent(diluent_pipette, plate)

        # MOVE PLATE to DONE SLOT/STACK
        done_dst = stack_done[-1] if len(stack_done) else SLOTS["done"]
        ctx.move_labware(plate, done_dst, use_gripper=True)
        stack_done.append(plate)

        # MOVE LID to DONE SLOT/STACK
        lid = stack.pop()
        ctx.move_labware(lid, stack_done[-1], use_gripper=True)
        stack_done.append(lid)

    if diluent_pipette.has_tip:
        diluent_pipette.drop_tip()
