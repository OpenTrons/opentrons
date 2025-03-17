"""DVT Flex Stacker QC."""
from opentrons.protocol_api import ProtocolContext
from opentrons.protocol_api.module_contexts import (
    FlexStackerContext,
)

metadata = {
    "protocolName": "Flex Stacker DVT QC",
    "author": "Opentrons <protocols@opentrons.com>",
}
requirements = {
    "robotType": "Flex",
    "apiLevel": "2.23",
}


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    # ======================= SIMPLE SETUP ARRANGEMENT ======================
    # STACKERS
    stacker: FlexStackerContext = protocol.load_module(
        "flexStackerModuleV1", "D4"
    )  # type: ignore[assignment]
    stacker.set_stored_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        count=6,
        lid="opentrons_flex_tiprack_lid",
    )

    SLOTS = ["C1", "C2", "C3", "D1", "D2", "D3"]

    # ======================= RETRIEVE/STORE TIPRACKS ======================
    tipracks = []
    for slot in SLOTS:
        tiprack = stacker.retrieve()
        protocol.move_labware(tiprack, slot, use_gripper=True)
        tipracks.append(tiprack)

    for tiprack in tipracks:
        protocol.move_labware(tiprack, stacker, use_gripper=True)
        stacker.store()

    # =================== FILL TIPRACKS WITH PCR PLATES ======================

    stacker.empty("Emptying all labware from the Flex Stacker")
    stacker.set_stored_labware(
        load_name="opentrons_96_wellplate_200ul_pcr_full_skirt",
        count=5,
    )
    stacker.fill("Fill stacker with pcr plates")

    # ======================= RETRIEVE/STORE PCR PLATES ======================
    plates = []
    for slot in SLOTS:
        plate = stacker.retrieve()
        protocol.move_labware(plate, slot, use_gripper=True)
        plates.append(plate)

    for plate in plates:
        protocol.move_labware(plate, stacker, use_gripper=True)
        stacker.store()
