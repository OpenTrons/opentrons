from typing import Dict
from opentrons.hardware_control.g_code_parsing.g_code_functionality_defs.\
    g_code_functionality_def_base import GCodeFunctionalityDefBase


class MicrosteppingBDisableGCodeFunctionalityDef(GCodeFunctionalityDefBase):

    @classmethod
    def _generate_command_explanation(cls, g_code_args: Dict[str, str]) -> str:
        return 'Disabling microstepping on B-Axis'

    @classmethod
    def _generate_response_explanation(cls, response: str) -> str:
        return ''
