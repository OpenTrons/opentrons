from opentrons.protocol_api import ProtocolContext, Labware
from opentrons.drivers.stacker.flex_stacker_driver import FlexStacker, LABWARE_Z_HEIGHT
from typing import Optional, List

metadata = {"protocolName": "Flex Stacker SLAS Demo"}
requirements = {"robotType": "Flex", "apiLevel": "2.17"}

CYCLES = 1000
STACKER_HEIGHT = 30
TRASH_HEIGHT = 50
SEAL_HEIGHT = 9
LID_FIXTURE_HEIGHT = 1


class StackerModule:
    stacker: Optional[FlexStacker]
    STACKER_GRIPPER_OFFSET = {"x": -3, "y": 0, "z": 12}
    LABWARE_Z_OFFSET = {
        "opentrons_flex_96_tiprack_1000ul": LABWARE_Z_HEIGHT.OPENTRONS_TIPRACKS,
        "opentrons_96_wellplate_200ul_pcr_full_skirt": LABWARE_Z_HEIGHT.BIORAD_HARDSHELL_PCR,
    }

    def __init__(
        self, serial_number: str, labware_name: str, slot: str, protocol: ProtocolContext
    ):
        self.stacker = (
            FlexStacker.create_from_sn(serial_number) if not protocol.is_simulating() else None
        )
        self.labware_name = labware_name
        self.slot = slot
        self.protocol = protocol

    def unload_and_move_labware(self, new_location: Labware | str) -> Labware:
        lw = self.protocol.load_labware(self.labware_name, self.slot)
        if self.stacker:
            self.stacker.unload_labware(self.LABWARE_Z_OFFSET[self.labware_name])
        self.protocol.move_labware(
            lw,
            new_location,
            use_gripper=True,
            pick_up_offset=self.STACKER_GRIPPER_OFFSET,
        )
        del self.protocol.deck[self.slot]
        return lw

    def move_and_store_labware(self, lw: Labware) -> None:
        self.protocol.move_labware(
            lw, self.slot, use_gripper=True, drop_offset=self.STACKER_GRIPPER_OFFSET
        )
        if self.stacker:
            self.stacker.load_labware(
                self.LABWARE_Z_OFFSET[self.labware_name]
            )
        del self.protocol.deck[self.slot]


def run(protocol: ProtocolContext) -> None:
    hardware = protocol._hw_manager.hardware
    hardware.cache_instruments()

    tiprack_stacker = StackerModule(
        serial_number="PS241204SZEVT01",
        labware_name="opentrons_flex_96_tiprack_1000ul",
        slot="C4",
        protocol=protocol,
    )
    plate_stacker = StackerModule(
        serial_number="PS241204SZEVT01",
        labware_name="opentrons_96_wellplate_200ul_pcr_full_skirt",
        slot="D4",
        protocol=protocol,
    )

    # # Thermocycler in A1
    thermocycler = protocol.load_module("thermocyclerModuleV2")
    thermocycler.open_lid()

    # Tiprack adapaters in A2, A3, B2
    tiprack_adapters = [
        protocol.load_adapter("opentrons_flex_96_tiprack_adapter", slot)
        for slot in ["A2", "A3", "B2"]
    ]
    # Dispoable lid stack on Deck Riser in C1
    deck_riser = protocol.load_adapter("opentrons_flex_deck_riser", "C1")
    lids: List[Labware] = [
        deck_riser.load_labware("opentrons_tough_pcr_auto_sealing_lid")
    ]
    for _ in range(3):
        lids.append(lids[-1].load_labware("opentrons_tough_pcr_auto_sealing_lid"))

    # MagBlock in D2
    magnetic_block = protocol.load_module("magneticBlockV1", "D2")

    """Unload and move tipracks"""
    tipracks: List[Labware] = []
    for adapter in tiprack_adapters:
        tiprack = tiprack_stacker.unload_and_move_labware(adapter)
        tipracks.append(tiprack)

    """Unload and move plate"""
    plates: List[Labware] = []
    plate_dests = ["C2", magnetic_block, thermocycler]
    for dest in plate_dests:
        plate = plate_stacker.unload_and_move_labware(dest)
        plates.append(plate)

    """Move disposable lid on thermocycler plate"""
    protocol.move_labware(lids[-1], plates[-1], use_gripper=True)

    """Remove disposable lid from thermocycler plate"""
    protocol.move_labware(lids[-1], lids[-2], use_gripper=True)

    """Store plates in stacker"""
    plates.reverse()
    for plate in plates:
        plate_stacker.move_and_store_labware(plate)

    """Store tipracks in stacker"""
    tipracks.reverse()
    for tiprack in tipracks:
        tiprack_stacker.move_and_store_labware(tiprack)
