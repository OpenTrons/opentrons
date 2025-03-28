"""Temperature module sub-state."""

from dataclasses import dataclass
from typing import NewType, Optional

from opentrons.hardware_control.modules import ModuleDataValidator, ModuleData
from opentrons.protocol_engine.types import TemperatureRange
from opentrons.protocol_engine.errors import (
    InvalidTargetTemperatureError,
    NoTargetTemperatureSetError,
)

TemperatureModuleId = NewType("TemperatureModuleId", str)

# TODO (spp, 2022-03-22): Move these values to temperature module definition.
TEMP_MODULE_TEMPERATURE_RANGE = TemperatureRange(min=-9, max=99)


@dataclass(frozen=True)
class TemperatureModuleSubState:
    """Temperature Module specific state.

    Provides calculations and read-only state access
    for an individual loaded Temperaute Module.
    """

    module_id: TemperatureModuleId
    plate_target_temperature: Optional[float]

    @staticmethod
    def validate_target_temperature(celsius: float) -> int:
        """Verify target temperature is within range and of correct type."""
        # Both Gen1 & 2 Temperature modules use 0 decimal precision.
        celsius_int = int(round(celsius, 0))
        if (
            TEMP_MODULE_TEMPERATURE_RANGE.min
            <= celsius_int
            <= TEMP_MODULE_TEMPERATURE_RANGE.max
        ):
            return celsius_int
        else:
            raise InvalidTargetTemperatureError(
                f"Temperature module got an invalid temperature {celsius} °C."
                f" Valid range is {TEMP_MODULE_TEMPERATURE_RANGE}."
            )

    def get_plate_target_temperature(self) -> float:
        """Get the module's target plate temperature."""
        target = self.plate_target_temperature

        if target is None:
            raise NoTargetTemperatureSetError(
                f"Module {self.module_id} does not have a target temperature set."
            )
        return target

    @classmethod
    def from_live_data(
        cls, module_id: TemperatureModuleId, data: ModuleData | None
    ) -> "TemperatureModuleSubState":
        """Create a TemperatureModuleSubState from live data."""
        return cls(
            module_id=module_id,
            plate_target_temperature=data["targetTemp"]
            if ModuleDataValidator.is_temperature_module_data(data)
            else None,
        )
