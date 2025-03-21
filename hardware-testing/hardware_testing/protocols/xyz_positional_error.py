"""XYZ Positional Error."""
from typing import Dict, Tuple, Optional, List

from opentrons.protocol_api import ProtocolContext, Labware
from opentrons.protocol_api.protocol_context import ModuleTypes
from opentrons.types import Point

metadata = {"protocolName": "XYZ Positional Error"}
requirements = {"robotType": "Flex", "apiLevel": "2.23"}

SLOTS: Dict[str, Tuple[str, Point]] = {
    "A1": ("thermocyclerModuleV2,opentrons_96_wellplate_200ul_pcr_full_skirt", Point()),
    "A2": ("opentrons_96_wellplate_200ul_pcr_full_skirt", Point()),
    "A3": ("opentrons_96_wellplate_200ul_pcr_full_skirt", Point()),
    # B1 is taken by thermocycler
    "B2": ("magneticBlockV1,opentrons_96_wellplate_200ul_pcr_full_skirt", Point()),
    "B3": ("absorbanceReaderV1,opentrons_96_wellplate_200ul_pcr_full_skirt", Point()),
    "C1": (
        "temperatureModuleV2,opentrons_96_well_aluminum_block,opentrons_96_wellplate_200ul_pcr_full_skirt",
        Point(),
    ),
    "C2": ("opentrons_96_wellplate_200ul_pcr_full_skirt", Point()),
    "C3": (
        "heaterShakerModuleV1,opentrons_96_pcr_adapter,opentrons_96_wellplate_200ul_pcr_full_skirt",
        Point(),
    ),
    "D1": ("opentrons_96_wellplate_200ul_pcr_full_skirt", Point()),
    "D2": ("opentrons_96_wellplate_200ul_pcr_full_skirt", Point()),
    "D3": ("opentrons_96_wellplate_200ul_pcr_full_skirt", Point()),
}


def _initialize_module(mod: ModuleTypes, mod_name: str) -> None:
    if "cycler" in mod_name:
        mod.deactivate_lid()
        mod.deactivate_block()
        mod.open_lid()
    elif "magnetic" in mod_name:
        pass
    elif "absorbance" in mod_name:
        if mod.is_lid_on():
            mod.open_lid()
    elif "temperature" in mod_name:
        mod.deactivate()
    elif "heater" in mod_name:
        mod.close_labware_latch()
        mod.deactivate_heater()
        mod.deactivate_shaker()
        mod.open_labware_latch()


def run(ctx: ProtocolContext) -> None:
    plates: Dict[str, Labware] = {}
    for slot, info in SLOTS.items():
        load_names_str, expected = info
        load_names = load_names_str.split(",")
        if len(load_names) >= 2:
            module_name = load_names[0]
            load_name = load_names[-1]
            module_slot: Optional[str] = None if "cycler" in module_name else slot
            module = ctx.load_module(module_name, module_slot)
            _initialize_module(module, module_name)
            if len(load_names) > 2:
                adapter = module.load_adapter(load_names[1])
                new_plate = adapter.load_labware(load_name)
            else:
                new_plate = module.load_labware(load_name)
        else:
            new_plate = ctx.load_labware(
                load_name=load_names[0],
                location=slot,
                version=None,  # TODO: (sigler) confirm what this defaults to
            )
        plates[slot] = new_plate
    ctx.comment("--------START--------")
    ctx.comment(
        "slot\tinfo\texpected-x\tfound-x\texpected-y\tfound-y\texpected-z\tfound-z"
    )
    for slot, plate in plates.items():
        found = plate["A1"].top().point
        load_name, expected = SLOTS[slot]
        ctx.comment(
            f"{slot}\t{load_name}\t"
            f"{round(expected.x, 3)}\t{round(found.x, 3)}\t"
            f"{round(expected.y, 3)}\t{round(found.y, 3)}\t"
            f"{round(expected.z, 3)}\t{round(found.z, 3)}"
        )
    ctx.comment("--------END--------")
