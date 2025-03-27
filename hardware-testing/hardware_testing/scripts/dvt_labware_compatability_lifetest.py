"""DVT Flex Stacker with 4 or 2 stackers.

This protocol is used to validate stacker store/dispense commands

"""

from opentrons.protocol_api import ParameterContext, ProtocolContext
from opentrons.protocol_api.module_contexts import (
    FlexStackerContext,
)
from datetime import datetime
from typing import Optional, Dict, Any
import os
import csv

metadata = {
    "protocolName": "Flex Stacker Labware Compatibility Lifetime Test.",
    "author": "Opentrons <protocols@opentrons.com>",
    "description": "This protocol dispenses labware from one stacker and into"
    "another stacker, the second stacker then stores it, and the actions are"
    "reversed.",
}
requirements = {
    "robotType": "Flex",
    "apiLevel": "2.23",
}

test_data: Dict[str, Optional[Any]] = {
    "Cycles": None,
    "Stacker SN": None,
    "State": None,
    "labware": None,
    "plate_num": None,
    "Error": None,
}


def add_parameters(parameters: ParameterContext) -> None:
    """Runtime parameters."""
    parameters.add_str(
        display_name="Target Labware",
        variable_name="labware_name",
        description="The labware that will be stored/dispensed.",
        default="nest_96_wellplate_2ml_deep",
        choices=[
            {
                "display_name": "Opentrons 96 Tipack 50ul",
                "value": "opentrons_flex_96_tiprack_50ul",
            },
            {
                "display_name": "Opentrons 96 Tipack 200ul",
                "value": "opentrons_flex_96_tiprack_200ul",
            },
            {
                "display_name": "Opentrons 96 Tipack 1000ul",
                "value": "opentrons_flex_96_tiprack_1000ul",
            },
            {
                "display_name": "Armadillo Plates",
                "value": "armadillo_96_wellplate_200ul_pcr_full_skirt",
            },
            {
                "display_name": "NEST 96 Deep Well Plates",
                "value": "nest_96_wellplate_2ml_deep",
            },
            {
                "display_name": "NEST 96 Flat Bottom Plates",
                "value": "nest_96_wellplate_200ul_flat",
            },
        ],
    )
    parameters.add_int(
        display_name="Cycles",
        variable_name="test_cycles",
        description="The number of cycles of dispensing/storing to perform.",
        default=5616,
        minimum=1,
        maximum=5616,
    )
    parameters.add_int(
        display_name="Labware Count",
        variable_name="labware_count",
        description="The number of labware in the stacker",
        default=6,
        minimum=1,
        maximum=100,
    )

    parameters.add_str(
        display_name="Number of Stackers",
        variable_name="stackers_mounted",
        description="choose the stackers that is on the deck.",
        default="D4 C4 B4 A4",
        choices=[
            {"display_name": "4 STACKERS", "value": "D4 C4 B4 A4"},
            {"display_name": "2 STACKERS (D4, C4)", "value": "D4 C4"},
        ],
    )


def record_test_data(
    test_data: Dict[str, Optional[Any]],
    cycle: int,
    SNs: str,
    state: str,
    labware_name: str,
    plate_num: int,
    log_file: Any,
    csvfile: Any,
) -> None:
    """Records test data."""
    test_data["Cycles"] = cycle
    test_data["Stacker SN"] = SNs
    test_data["State"] = state
    test_data["labware"] = labware_name
    test_data["plate_num"] = plate_num
    test_data["Error"] = None
    log_file.writerow(test_data)
    csvfile.flush()


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    directory = f'/data/dvt_stacker_lifetime_{datetime.now().strftime("%m_%d_%y")}'
    if not os.path.exists(directory):
        os.makedirs(directory)
    labware_name = protocol.params.labware_name  # type: ignore[attr-defined]
    labware_count = protocol.params.labware_count  # type: ignore[attr-defined]
    test_cycles = protocol.params.test_cycles  # type: ignore[attr-defined]
    stackers_mounted = protocol.params.stackers_mounted  # type: ignore[attr-defined]
    deck_slots_for_stackers = stackers_mounted.split()

    # define lid
    if "tiprack" in labware_name:
        tiprack_lid = "opentrons_flex_tiprack_lid"
    else:
        tiprack_lid = None

    # ======================= Stacker Setup ======================
    s_num = 0
    SNs = []
    num_of_stackers = len(deck_slots_for_stackers)
    for d in deck_slots_for_stackers:
        s_num += 1
        globals()[f"f_stacker_{s_num}"]: FlexStackerContext = protocol.load_module(  # type: ignore
            "flexStackerModuleV1", d
        )
        if s_num % 2 == 0:
            globals()[f"f_stacker_{s_num}"].set_stored_labware(
                load_name=labware_name,
                count=0,  # always zero so we can store the labware
                lid=tiprack_lid
                if "opentrons_flex_96_tiprack" in labware_name
                else None,
            )
        else:
            globals()[f"f_stacker_{s_num}"].set_stored_labware(
                load_name=labware_name,
                count=labware_count,
                lid=tiprack_lid
                if "opentrons_flex_96_tiprack" in labware_name
                else None,
            )

        SNs.append(globals()[f"f_stacker_{s_num}"]._core.get_serial_number())
    folder_name = "labware_compatibility_lifetime_test_"
    f_name = f'{directory}/{folder_name}{datetime.now().strftime("%m_%d_%y_%H_%M")}.csv'
    # ======================= RETRIEVE/STORE TIPRACKS ======================
    if not protocol.is_simulating():
        with open(f_name, "w", newline="") as csvfile:
            test_details = csv.writer(
                csvfile, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL
            )
            test_details.writerow({"test details"})
            test_details.writerow({"Flex Stacker"})
            log_file = csv.DictWriter(csvfile, test_data)
            log_file.writeheader()
            try:
                for cycle in range(test_cycles):
                    labware_list = []
                    protocol.comment(f"Starting cycle: {cycle} for {labware_name}")
                    for lc in range(labware_count):
                        protocol.comment(f"Starting cycle: {cycle} for {labware_name}")
                        if num_of_stackers == 4:
                            # ---------------------Retrieve labware Stacker A
                            lw = globals()[f"f_stacker_{1}"].retrieve()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[0],
                                "retrieve",
                                labware_name,
                                lc,
                                log_file,
                                csvfile,
                            )
                            protocol.move_labware(
                                lw, globals()[f"f_stacker_{2}"], use_gripper=True
                            )
                            # ---------------------Store labware Stacker B
                            globals()[f"f_stacker_{2}"].store()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[1],
                                "Store",
                                labware_name,
                                lc,
                                log_file,
                                csvfile,
                            )
                            labware_list.append(lw)
                            # ---------------------Retrieve labware Stacker C
                            lw = globals()[f"f_stacker_{3}"].retrieve()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[2],
                                "retrieve",
                                labware_name,
                                lc,
                                log_file,
                                csvfile,
                            )
                            protocol.move_labware(
                                lw, globals()[f"f_stacker_{4}"], use_gripper=True
                            )
                            # ---------------------Store labware Stacker D
                            globals()[f"f_stacker_{4}"].store()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[3],
                                "Store",
                                labware_name,
                                lc,
                                log_file,
                                csvfile,
                            )
                            labware_list.append(lw)

                        elif num_of_stackers == 2:
                            # ---------------------Retrieve labware Stacker A
                            lw = globals()[f"f_stacker_{1}"].retrieve()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[0],
                                "retrieve",
                                labware_name,
                                lc,
                                log_file,
                                csvfile,
                            )
                            protocol.move_labware(
                                lw, globals()[f"f_stacker_{2}"], use_gripper=True
                            )
                            # ---------------------Store labware Stacker B
                            globals()[f"f_stacker_{2}"].store()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[1],
                                "store",
                                labware_name,
                                lc,
                                log_file,
                                csvfile,
                            )
                            labware_list.append(lw)

                    for stored_lw in range(labware_count):
                        protocol.comment(
                            f"Starting cycle: {stored_lw} for {labware_name}"
                        )
                        if num_of_stackers == 4:
                            # go backwards
                            # ---------------------Store labware Stacker B
                            lw = globals()[f"f_stacker_{2}"].retrieve()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[1],
                                "retrieve",
                                labware_name,
                                stored_lw,
                                log_file,
                                csvfile,
                            )
                            protocol.move_labware(
                                lw, globals()[f"f_stacker_{1}"], use_gripper=True
                            )
                            # ---------------------Retrieve labware Stacker A
                            globals()[f"f_stacker_{1}"].store()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[0],
                                "Store",
                                labware_name,
                                stored_lw,
                                log_file,
                                csvfile,
                            )
                            # go backwards
                            # ---------------------Store labware Stacker D
                            lw = globals()[f"f_stacker_{4}"].retrieve()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[3],
                                "retrieve",
                                labware_name,
                                stored_lw,
                                log_file,
                                csvfile,
                            )
                            protocol.move_labware(
                                lw, globals()[f"f_stacker_{3}"], use_gripper=True
                            )
                            # ---------------------Store labware Stacker C
                            globals()[f"f_stacker_{3}"].store()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[2],
                                "store",
                                labware_name,
                                stored_lw,
                                log_file,
                                csvfile,
                            )

                        elif num_of_stackers == 2:
                            # go backwards
                            # ---------------------Store labware Stacker B
                            lw = globals()[f"f_stacker_{2}"].retrieve()
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[1],
                                "retrieve",
                                labware_name,
                                stored_lw,
                                log_file,
                                csvfile,
                            )
                            protocol.move_labware(
                                lw, globals()[f"f_stacker_{1}"], use_gripper=True
                            )
                            # ---------------------Retrieve labware Stacker A
                            record_test_data(
                                test_data,
                                cycle,
                                SNs[0],
                                "store",
                                labware_name,
                                stored_lw,
                                log_file,
                                csvfile,
                            )
                            globals()[f"f_stacker_{1}"].store()

            except Exception as e:
                test_data["Error"] = e
                log_file.writerow(test_data)
                csvfile.flush()
                raise (e)
