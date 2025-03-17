from os import listdir

from opentrons.protocol_api import (
    ProtocolContext,
    Well,
    ParameterContext,
    OFF_DECK,
    Labware,
)
from opentrons_shared_data.load import get_shared_data_root
from hardware_testing.protocols import (
    create_dye_source_well_parameter,
)
import math
from typing import Tuple

metadata = {"protocolName": "LLD 1uL PCR-to-MVS-07MAR"}
requirements = {"robotType": "Flex", "apiLevel": "2.22"}

SLOTS = {
    "tips": ["A3", "B2", "B3", "C1", "B4", "C4", "A4"],
    "src": "D2",
    "src_holder": "B1",
    "dst": "D3",
    "tips_200": "A2",
    "diluent_reservoir": "C2",
    "lids": "D4",
}
# OPEN AREAS C3 AND C4

TARGET_UL = 1
SUBMERGE_MM_LLD = -1.5
SUBMERGE_MM = -1.5

TIP_VOLUME = 50
PIP_VOLUME = 50
DEAD_VOL_DILUENT = 3000
DEAD_VOL_DYE = 30

SRC_LABWARE = "opentrons_96_wellplate_200ul_pcr_full_skirt"
DST_LABWARE = "corning_96_wellplate_360ul_flat"
DILUENT_LABWARE = "nest_12_reservoir_15ml"


def add_parameters(parameters: ParameterContext) -> None:
    """Add parameters."""
    parameters.add_int(
        variable_name="columns",
        display_name="Number of Columns",
        minimum=1,
        maximum=12,
        default=2,
    )
    parameters.add_bool(
        variable_name="baseline", display_name="Baseline", default=False
    )
    parameters.add_bool(
        variable_name="test_gripper_only", display_name="Gripper Only", default=False
    )
    create_dye_source_well_parameter(parameters)
    parameters.add_int(
        variable_name="num_of_plates",
        display_name="Number of Plates",
        minimum=1,
        maximum=5,
        default=5,
    )
    parameters.add_bool(
        variable_name="skip_diluent", display_name="Skip Diluent", default=False
    )
    parameters.add_float(
        variable_name="push_out",
        display_name="Push Out",
        choices=[
            {"display_name": "LV default", "value": 7},
            {"display_name": "LV MAX", "value": 11.7},
            {"display_name": "Default default", "value": 2},
            {"display_name": "Default MAX", "value": 3.9},
        ],
        default=11.7,
    ),
    parameters.add_bool(
        variable_name="use_test_matrix", display_name="Use Test Matrix", default=True
    )
    parameters.add_float(
        variable_name = "dot_bottom_submerge_depth",
        display_name = "Dot bottom submerge depth",
        default = 1.5,
        maximum = 2,
        minimum = 0.5
    )
    parameters.add_float(
        variable_name = "single_plate_vol",
        display_name="Single Plate Volume",
        default = 5.0,
        minimum=1.0, 
        maximum=5.0
    )


def get_latest_version(load_name: str) -> int:
    labware_def_location = (
        f"{get_shared_data_root()}/labware/definitions/3/{load_name}/"
    )
    labware_def_latest = sorted(listdir(labware_def_location))[-1]
    return int(labware_def_latest[0])


def run(ctx: ProtocolContext) -> None:
    global TRIALS
    columns = ctx.params.columns  # type: ignore[attr-defined]
    baseline = ctx.params.baseline  # type: ignore[attr-defined]
    num_of_plates = ctx.params.num_of_plates  # type: ignore[attr-defined]
    skip_diluent = ctx.params.skip_diluent  # type: ignore[attr-defined]
    push_out = ctx.params.push_out  # type: ignore[attr-defined]
    use_test_matrix = ctx.params.use_test_matrix  # type: ignore[attr-defined]
    test_gripper_only = ctx.params.test_gripper_only  # type: ignore[attr-defined]
    single_plate_vol = ctx.params.single_plate_vol # type: ignore[attr-defined]
    TRIALS = columns * 8 * num_of_plates
    BOTTOM_MM = ctx.params.dot_bottom_submerge_depth # type: ignore[attr-defined]
    ctx.load_trash_bin("A1")
    # Test Matrix
    test_matrix = {
        "A": {"ASP": "M_LLD_TIP", "DSP": "M"},
        "B": {"ASP": "M", "DSP": "M"},
        "C": {"ASP": "M_LLD", "DSP": "M"},
        "D": {"ASP": "B", "DSP": "T"},
        "E": {"ASP": "M_LLD_TIP", "DSP": "M"},
        "F": {"ASP": "M", "DSP": "M"},
        "G": {"ASP": "M_LLD", "DSP": "M"},
        "H": {"ASP": "B", "DSP": "B"},
    }
    # LOAD 50 UL TIPS based on # of plates
    tip_racks_50s = []
    if not test_matrix:
        for i in range(num_of_plates):
            tip_rack = ctx.load_labware(
                f"opentrons_flex_96_tiprack_{TIP_VOLUME}ul",
                location=SLOTS["tips"][i],
                version=1,
            )
            tip_racks_50s.append(tip_rack)
    else:
        for i in SLOTS["tips"]:
            tip_rack = ctx.load_labware(
                f"opentrons_flex_96_tiprack_{TIP_VOLUME}ul",
                location=i,
                version=1,
            )
            tip_racks_50s.append(tip_rack)
    tip_rack_200 = ctx.load_labware(
        "opentrons_flex_96_tiprack_200ul", location=SLOTS["tips_200"]
    )
    diluent_reservoir = ctx.load_labware(
        DILUENT_LABWARE,
        location=SLOTS["diluent_reservoir"],
        version=get_latest_version(DILUENT_LABWARE),
    )
    # Load diluent reservoir lid
    diluent_lid = diluent_reservoir.load_labware("plate_lid")
    pipette = ctx.load_instrument(
        f"flex_1channel_{PIP_VOLUME}", mount="left", tip_racks=tip_racks_50s
    )
    diluent_pipette = ctx.load_instrument(
        "flex_8channel_1000", mount="right", tip_racks=[tip_rack_200]
    )
    # SRC and DST labware
    src_holder = ctx.load_labware(
        "nest_96_wellplate_2ml_deep",
        location=SLOTS["src_holder"],
        version=get_latest_version("nest_96_wellplate_2ml_deep"),
    )
    # lOAD SRC LID
    src_lid = src_holder.load_labware(
        "plate_lid",
    )
    src_labware = ctx.load_labware(
        SRC_LABWARE, location=SLOTS["src"], version=get_latest_version(SRC_LABWARE)
    )
    src_labware.load_empty(src_labware.wells())

    # LOAD stack of plates and lids, lid on bottom plate on top
    lids_and_plates = [ctx.load_labware("plate_lid", SLOTS["lids"])]
    dst_labwares = []
    for i in range(num_of_plates):
        dst_labware = lids_and_plates[-1].load_labware(
            DST_LABWARE, version=get_latest_version(DST_LABWARE)
        )
        lids_and_plates.append(dst_labware)
        dst_labwares.append(dst_labware)
        if i < (num_of_plates - 1):
            lids_and_plates.append(lids_and_plates[-1].load_labware("plate_lid"))
    dst_labwares.reverse()
    lids_and_plates.reverse()
    # DEFINE LIQUIDS #
    # DILUENT
    total_diluent_needed = 200 * TRIALS  # total diluent needed
    number_of_wells_needed = math.ceil(
        total_diluent_needed / (diluent_reservoir["A1"].max_volume - (diluent_pipette.channels * 200) - DEAD_VOL_DILUENT)
    )  # total number of wells needed
    total_diluent_per_well = (
        total_diluent_needed / number_of_wells_needed
    ) + DEAD_VOL_DILUENT
    diluent = ctx.define_liquid("diluent", "#0000FF")
    diluent_wells_used = diluent_reservoir.wells()[:number_of_wells_needed]
    diluent_reservoir.load_liquid(diluent_wells_used, total_diluent_per_well, diluent)
    # DYE - two different types for appropriate volumes
    volume_list = [1.0, 1.2, 1.5, 2.0, 5.0]
    volume_list_d = [1.0, 1.2, 1.5]
    total_dye_needed_d = (
        sum([(vol * 24) + 10 for vol in volume_list_d[:num_of_plates]]) * 3
    )
    if num_of_plates == 4:
        volume_list_c = [2.0]
        dye_c_plates = 1
    elif num_of_plates == 5:
        volume_list_c = [2.0, 5.0]
        dye_c_plates = 2
    else:
        dye_c_plates = 0
        volume_list_c = []
    total_dye_needed_c = (
        sum([(vol * 24) + 10 for vol in volume_list_c[:num_of_plates]]) * dye_c_plates
    )
    if num_of_plates == 1:
        volume_list = [single_plate_vol]
        if single_plate_vol >= 2.0:
            dye_c_plates = 1
            total_dye_needed_c = (
                sum([(vol * 24) + 10 for vol in volume_list_c[:num_of_plates]]) * dye_c_plates
            )
            total_dye_needed_d = 0.0
        else:
             total_dye_needed_d = (
                sum([(vol * 24) + 10 for vol in volume_list_d[:num_of_plates]]) 
            )
             total_dye_needed_c = 0
            
    dye_d = ctx.define_liquid("dye_d", "#FF0000")
    dye_c = ctx.define_liquid("dye_c", "F1C232")

    # SOURCE WELL
    if baseline:
        # if baseline, do not load dye
        src_holder.load_empty([src_holder["A1"]])
        src_holder.load_empty([src_holder["A2"]])
    else:
        src_holder.load_liquid([src_holder["A1"]], total_dye_needed_d + 100, dye_d)
        src_holder.load_liquid([src_holder["A2"]], total_dye_needed_c + 100, dye_c)
        src_labware.load_empty(src_labware.wells())
    for dst_labware in dst_labwares:
        if not diluent:
            # if skipping diluent step, preload with diluent
            dst_labware.load_liquid(dst_labware.wells(), 199, diluent)
        else:
            # load empty
            dst_labware.load_empty(dst_labware.wells())
    tip_counter = 0

    def fill_well_with_dye(
        plate: Labware, vol: float, plate_num: int, tip_counter: int, src_well: Well
    ) -> int:
        """Fill plate with dye from source."""
        ctx.move_labware(
            src_lid,
            diluent_lid,
            use_gripper=True,
            pick_up_offset={"x": 0, "y": 0, "z": -3},
        )  # move lid off of source plate
        if not test_gripper_only:
            dye_needed_in_well = (vol * columns) + (DEAD_VOL_DYE)
            if dye_needed_in_well < 50:
                dye_needed_in_well = 50
            pipette.configure_for_volume(dye_needed_in_well)
            pipette.pick_up_tip()
            num_of_transfers = 1
            
            if dye_needed_in_well > pipette.max_volume:
                dye_needed_in_well = dye_needed_in_well / 2
                num_of_transfers = 2
            for i in range(num_of_transfers):
                if vol < 2.0:
                    pipette.aspirate(dye_needed_in_well, src_holder["A1"])
                else:
                    pipette.aspirate(dye_needed_in_well, src_holder["A2"])
                pipette.dispense(dye_needed_in_well, src_well.bottom(BOTTOM_MM))
                pipette.touch_tip(speed = 30)
            pipette.drop_tip()
            tip_counter += 1
        ctx.move_labware(
            src_lid,
            src_holder,
            use_gripper=True,
            pick_up_offset={"x": 0, "y": 0, "z": -3},
        )  # put lid back on source plate
        return tip_counter

    def fill_plate_with_diluent(
        plate: Labware, baseline: bool, initial_fill: bool, vol: float, diluent_src_index: int, total_diluent_ul: float
    ) -> Tuple[int, float]:
        """Fill plate with diluent."""
        # fill with diluent
        if initial_fill:
            print(f"--------------plate in loop {n} vol is {vol}")
        ctx.move_labware(
            diluent_lid,
            src_lid,
            use_gripper=True,
            pick_up_offset={"x": 0, "y": 0, "z": -3},
        )  # move lid off diluent reservoir
        if not test_gripper_only:
            ctx.comment("FILLING DESTINATION PLATE WITH DILUENT")
            columns_list = plate.columns()[:columns]
            for i in columns_list:
                i_index = columns_list.index(i)
                if i_index % 2 == 0:
                    if initial_fill:
                        diluent_ul = 200 - vol
                else:
                    diluent_ul = 100
                if baseline:
                    diluent_ul = 200
                diluent_well = diluent_wells_used[diluent_src_index]
                if initial_fill:
                    # If first time filling do all wells
                    diluent_pipette.aspirate(diluent_ul, diluent_well.bottom(BOTTOM_MM))
                    diluent_pipette.dispense(
                        diluent_ul, plate[f"A{i_index+1}"].top(), push_out=20
                    )
                    total_diluent_ul += (diluent_ul * 8)
                    print(f"initial fill, filling index {i_index} with {diluent_ul}")
                elif not initial_fill and i_index % 2 != 0:
                    diluent_ul = 200 - (100 + vol)
                    print(f"not initial fill, filling index {i_index} with {diluent_ul}")
                    diluent_pipette.aspirate(diluent_ul, diluent_well.bottom(BOTTOM_MM))
                    diluent_pipette.dispense(
                        diluent_ul, plate[f"A{i_index+1}"].top(), push_out=20
                    )
                    total_diluent_ul += (diluent_ul * 8)
                if (total_diluent_per_well - total_diluent_ul) <= DEAD_VOL_DILUENT:
                    diluent_src_index +=1
                    total_diluent_ul = 0
                    print(f"total diluent ul {total_diluent_ul} diluent src index {diluent_src_index}")
        ctx.move_labware(
            diluent_lid,
            diluent_reservoir,
            use_gripper=True,
            pick_up_offset={"x": 0, "y": 0, "z": -3},
        )  # put lid back on diluent reservoir
        return diluent_src_index, total_diluent_ul

    def _run_trial(
        dst_well: Well,
        tip_counter: int,
        target_ul: float,
        plate_num: int,
    ) -> int:
        # change tip before every aspirate
        well_name_letter = dst_well.well_name[0]
        asp_behavior = test_matrix[well_name_letter]["ASP"]
        dsp_behavior = test_matrix[well_name_letter]["DSP"]
        src_well_letter = well_name_letter
        src_well_str = src_well_letter + str(plate_num + 1)
        src_well = src_labware[src_well_str]
        tip_counter += 1
        if target_ul == 5:
            push_out = 3.9
        else:
            push_out = 11.7
        pipette.pick_up_tip()
        if "LLD" in asp_behavior:
            pipette.require_liquid_presence(src_well)
            if "T" in asp_behavior:
                # switch tip
                pipette.drop_tip()
                pipette.pick_up_tip()
                tip_counter += 1
            SUBMERGE_MM = SUBMERGE_MM_LLD
        pipette.configure_for_volume(target_ul)
        # ASPIRATE
        if "M" in asp_behavior:
            # NOTE: if liquid height is <2.5mm, protocol may error out
            #       this can be avoided by adding extra starting liquid in the SRC labware
            SUBMERGE_MM = -1.5
            pipette.aspirate(target_ul, src_well.meniscus(SUBMERGE_MM))
            pipette.touch_tip(speed = 30)
        else:
            pipette.aspirate(target_ul, src_well.bottom(BOTTOM_MM))
            pipette.touch_tip(speed = 30)
        # DISPENSE
        if "M" in dsp_behavior:
            SUBMERGE_MM = -1.5
            pipette.dispense(
                target_ul, dst_well.meniscus(SUBMERGE_MM), push_out=push_out
            )  # contact
        elif "B" in dsp_behavior:
            pipette.dispense(
                target_ul, dst_well.bottom(BOTTOM_MM), push_out=push_out
            )  # contact
        else:
            pipette.dispense(target_ul, dst_well.top(), push_out=push_out)  # top
        pipette.drop_tip()
        return tip_counter
    diluent_src_index = 0
    total_diluent_ul = 0
    n = 0
    diluent_pipette.pick_up_tip()
    if not skip_diluent:
        for (vol, plate) in zip(volume_list, dst_labwares):
            lid_for_plate = plate.parent
            if tip_counter >= ((4 * 96) - 21):
                # if 4 tip racks have been used, switch out two of them
                print("started moving tip racks before plate move")
                # tip rack a3 goes to d3
                ctx.move_labware(tip_racks_50s[0], "D3", use_gripper=True)
                # tip rack b4 goes to a3
                ctx.move_labware(tip_racks_50s[4], SLOTS["tips"][0], use_gripper=True)
                # tip rack d3 goes to b4
                ctx.move_labware(tip_racks_50s[0], SLOTS["tips"][4], use_gripper=True)
                # tip rack b2 goes to d3
                ctx.move_labware(tip_racks_50s[1], "D3", use_gripper=True)
                # tip rack c4 goes to b2
                ctx.move_labware(tip_racks_50s[5], SLOTS["tips"][1], use_gripper=True)
                # tip rack d3 goes to c4
                ctx.move_labware(tip_racks_50s[1], SLOTS["tips"][5], use_gripper=True)
                # tip rack b3 goes to d3
                ctx.move_labware(tip_racks_50s[2], "D3", use_gripper=True)
                ctx.move_labware(tip_racks_50s[6], SLOTS["tips"][2], use_gripper=True)
                ctx.move_labware(tip_racks_50s[2], SLOTS["tips"][6], use_gripper=True)

                tip_counter = 0
            ctx.move_labware(plate, "D3", use_gripper=True)
            # FILL PLATE WITH DILUENT
            diluent_src_index, total_diluent_ul = fill_plate_with_diluent(
                plate=plate, baseline=baseline, initial_fill=True, vol=vol, diluent_src_index=diluent_src_index, total_diluent_ul=total_diluent_ul
            )
            if not baseline:
                
                if not test_gripper_only:
                    for i, row in enumerate(plate.rows()):
                        # FILL SOURCE PLATE WITH DYE
                        well_letter = str(row[0])[0]
                        src_well = src_labware[f"{well_letter}{n+1}"]
                        print(src_well)
                        tip_counter = fill_well_with_dye(
                            plate=plate, vol=vol, plate_num=n, tip_counter=tip_counter, src_well = src_well
                        )
                        for w in row[:columns]:
                            # FILL DESTINATION PLATE WITH DYE
                            tip_counter = _run_trial(
                                w,
                                tip_counter=tip_counter,
                                target_ul=vol,
                                plate_num=n,
                            )
            # FILL REMAINING COLUMNS WITH DILUENT
            diluent_src_index, total_diluent_ul = fill_plate_with_diluent(
                plate=plate, baseline=baseline, initial_fill=False, vol=vol,diluent_src_index = diluent_src_index, total_diluent_ul=total_diluent_ul
            )
            if vol == 5:
                push_out = 3.9
                print(f"push out is {push_out}")
            if n == 0:
                # if first plate, move to slot D1
                ctx.move_labware(plate, "D1", use_gripper=True)
            else:
                # for all other plates, stack on previous lid
                ctx.move_labware(plate, previous_lid, use_gripper=True)
            # move lid onto plate
            if n != (num_of_plates - 1):
                ctx.move_labware(lid_for_plate, plate, use_gripper=True)
                # assign lid on plate to next lid to stack to
                previous_lid = lid_for_plate
                n += 1
    diluent_pipette.drop_tip()