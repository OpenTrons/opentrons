from typing import Dict
from opentrons.hardware_control.g_code_parsing.g_code_functionality_defs.\
    g_code_functionality_def_base import GCodeFunctionalityDefBase


class ProbeGCodeFunctionalityDef(GCodeFunctionalityDefBase):

    @classmethod
    def _generate_command_explanation(cls, g_code_args: Dict[str, str]) -> str:
        return 'Magdeck probing attached labware to get height in mm'
