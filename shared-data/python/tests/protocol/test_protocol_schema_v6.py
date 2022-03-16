import json
import pytest
from typing import Any, Dict
from opentrons_shared_data import load_shared_data
from opentrons_shared_data.protocol.models import ProtocolSchemaV6

from . import list_fixtures


@pytest.mark.parametrize("defpath", list_fixtures(6))
def test_v6_types(defpath):
    def_data = load_shared_data(defpath)
    def_model = ProtocolSchemaV6.parse_raw(def_data)
    def_dict_from_model = def_model.dict(
        exclude_unset=True,
        # 'schemaVersion' in python is '$schemaVersion' in JSON
        by_alias=True,
    )
    expected_def_dict = json.loads(def_data)
    delete_unexpected_results(expected_def_dict)
    assert def_dict_from_model == expected_def_dict


def delete_unexpected_results(protocol_fixture: Dict[str, Any]) -> None:
    for command_object_dict in protocol_fixture["commands"]:
        try:
            command_object_dict.pop("result")
        except KeyError:
            pass
