import re
from typing import Dict
from opentrons.hardware_control.g_code_parsing.g_code_functionality_defs.\
    g_code_functionality_def_base import GCodeFunctionalityDefBase


class CurrentPositionCodeFunctionalityDef(GCodeFunctionalityDefBase):
    RESPONSE_RE = re.compile(r'(?P<axis>[ABCXYZ]):(?P<value>-?\d+.\d+)')

    @classmethod
    def _generate_command_explanation(cls, g_code_args: Dict[str, str]) -> str:
        return 'Getting current position for all axes'

    @classmethod
    def _generate_response_explanation(cls, response: str) -> str:
        matches = sorted(
            [
                match.groupdict()
                for match in cls.RESPONSE_RE.finditer(response)
            ],
            key=lambda i: i['axis']
        )

        position_string = '\n\t'.join(
            [
                f"{match['axis']} Axis: {match['value']}"
                for match in matches
            ]
        )

        return '\n\t'.join(['The current position of the robot is:', position_string])
