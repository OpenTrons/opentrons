"""Module data resource provider."""
from typing import Dict
from opentrons.hardware_control.modules.module_calibration import (
    load_all_module_calibrations,
)
from opentrons_shared_data.module import load_definition

from ..types import ModuleModel, ModuleDefinition, ModuleOffsetVector


class ModuleDataProvider:
    """Module data provider."""

    @staticmethod
    def get_definition(model: ModuleModel) -> ModuleDefinition:
        """Get the module definition."""
        data = load_definition(model_or_loadname=model.value, version="3")
        return ModuleDefinition.parse_obj(data)

    @staticmethod
    def load_module_calibrations() -> Dict[str, ModuleOffsetVector]:
        """Load the module calibration offsets."""
        module_calibrations: Dict[str, ModuleOffsetVector] = dict()
        calibration_data = load_all_module_calibrations()
        for calibration in calibration_data:
            # NOTE module_id is really the module serial number, change this
            module_calibrations[calibration.module_id] = ModuleOffsetVector(
                x=calibration.offset.x,
                y=calibration.offset.y,
                z=calibration.offset.z,
            )
        return module_calibrations
