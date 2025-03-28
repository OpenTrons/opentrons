"""Thermocycler Module sub-state."""
from dataclasses import dataclass
from typing import NewType, Optional

from opentrons.protocol_engine.errors import (
    InvalidTargetTemperatureError,
    InvalidBlockVolumeError,
    NoTargetTemperatureSetError,
    InvalidHoldTimeError,
)

# TODO(mc, 2022-04-25): move to module definition
# https://github.com/Opentrons/opentrons/issues/9800
from opentrons.drivers.thermocycler.driver import (
    BLOCK_TARGET_MIN,
    BLOCK_TARGET_MAX,
    BLOCK_VOL_MIN,
    BLOCK_VOL_MAX,
    LID_TARGET_MIN,
    LID_TARGET_MAX,
)
from opentrons.hardware_control.modules import ModuleData, ModuleDataValidator

ThermocyclerModuleId = NewType("ThermocyclerModuleId", str)


@dataclass(frozen=True)
class ThermocyclerModuleSubState:
    """Thermocycler-specific state.

    Provides calculations and read-only state access
    for an individual loaded Thermocycler Module.
    """

    module_id: ThermocyclerModuleId
    is_lid_open: bool
    target_block_temperature: Optional[float]
    target_lid_temperature: Optional[float]

    @staticmethod
    def validate_target_block_temperature(celsius: float) -> float:
        """Validate a given target block temperature.

        Args:
            celsius: The requested block temperature.

        Raises:
            InvalidTargetTemperatureError: The given temperature
                is outside the thermocycler's operating range.

        Returns:
            The validated temperature in degrees Celsius.
        """
        if BLOCK_TARGET_MIN <= celsius <= BLOCK_TARGET_MAX:
            return celsius

        raise InvalidTargetTemperatureError(
            "Thermocycler block temperature must be between"
            f" {BLOCK_TARGET_MIN} and {BLOCK_TARGET_MAX}, but got {celsius}."
        )

    @staticmethod
    def validate_max_block_volume(volume: float) -> float:
        """Validate a given target block max volume.

        Args:
            volume: The requested block max volume in uL.

        Raises:
            InvalidBlockVolumeError: The given volume
                is outside the thermocycler's operating range.

        Returns:
            The validated volume in uL.
        """
        if BLOCK_VOL_MIN <= volume <= BLOCK_VOL_MAX:
            return volume

        raise InvalidBlockVolumeError(
            "Thermocycler max block volume must be between"
            f" {BLOCK_VOL_MIN} and {BLOCK_VOL_MAX}, but got {volume}."
        )

    @staticmethod
    def validate_hold_time(hold_time: float) -> float:
        """Validate a given temperature hold time.

        Args:
            hold_time: The requested hold time in seconds.

        Raises:
            InvalidHoldTimeError: The given time is invalid

        Returns:
            The validated time in seconds
        """
        if hold_time < 0:
            raise InvalidHoldTimeError(
                "Thermocycler target temperature hold time must be a positive number,"
                f" but received {hold_time}."
            )
        return hold_time

    @staticmethod
    def validate_target_lid_temperature(celsius: float) -> float:
        """Validate a given target lid temperature.

        Args:
            celsius: The requested lid temperature.

        Raises:
            InvalidTargetTemperatureError: The given temperature
                is outside the thermocycler's operating range.

        Returns:
            The validated temperature in degrees Celsius.
        """
        if LID_TARGET_MIN <= celsius <= LID_TARGET_MAX:
            return celsius

        raise InvalidTargetTemperatureError(
            "Thermocycler lid temperature must be between"
            f" {LID_TARGET_MIN} and {LID_TARGET_MAX}, but got {celsius}."
        )

    def get_target_block_temperature(self) -> float:
        """Get the thermocycler's target block temperature."""
        target = self.target_block_temperature

        if target is None:
            raise NoTargetTemperatureSetError(
                f"Module {self.module_id} does not have a target block temperature set."
            )
        return target

    def get_target_lid_temperature(self) -> float:
        """Get the thermocycler's target lid temperature."""
        target = self.target_lid_temperature

        if target is None:
            raise NoTargetTemperatureSetError(
                f"Module {self.module_id} does not have a target block temperature set."
            )
        return target

    @classmethod
    def from_live_data(
        cls, module_id: ThermocyclerModuleId, data: ModuleData | None
    ) -> "ThermocyclerModuleSubState":
        """Create a ThermocyclerModuleSubState from live data."""
        if ModuleDataValidator.is_thermocycler_data(data):
            return cls(
                module_id=module_id,
                is_lid_open=data["lid"] == "open",
                target_block_temperature=data["targetTemp"],
                target_lid_temperature=data["lidTarget"],
            )
        return cls(
            module_id=module_id,
            is_lid_open=False,
            target_block_temperature=None,
            target_lid_temperature=None,
        )
