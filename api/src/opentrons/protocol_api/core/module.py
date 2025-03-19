"""Core module control interfaces."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Dict, Optional, TypeVar, ClassVar

from opentrons.drivers.types import (
    HeaterShakerLabwareLatchStatus,
    ThermocyclerLidStatus,
)
from opentrons.hardware_control.modules.types import (
    ModuleModel,
    ModuleType,
    TemperatureStatus,
    ThermocyclerStep,
    MagneticStatus,
    SpeedStatus,
)
from opentrons.protocol_engine.types import ABSMeasureMode
from opentrons.types import DeckSlotName


class AbstractModuleCore(ABC):
    """Abstract core module control interface."""

    MODULE_TYPE: ClassVar[ModuleType]

    @abstractmethod
    def get_model(self) -> ModuleModel:
        """Get the module's model identifier."""

    @abstractmethod
    def get_deck_slot(self) -> DeckSlotName:
        """Get the module's deck slot."""

    @abstractmethod
    def get_deck_slot_id(self) -> str:
        """Get the module's deck slot in a robot accurate format."""

    @abstractmethod
    def get_display_name(self) -> str:
        """Get the module's display name."""


ModuleCoreType = TypeVar("ModuleCoreType", bound=AbstractModuleCore)


class AbstractTemperatureModuleCore(AbstractModuleCore):
    """Core control interface for an attached Temperature Module."""

    MODULE_TYPE: ClassVar = ModuleType.TEMPERATURE

    @abstractmethod
    def get_serial_number(self) -> str:
        """Get the module's unique hardware serial number."""

    @abstractmethod
    def set_target_temperature(self, celsius: float) -> None:
        """Set the Temperature Module's target temperature in °C."""

    @abstractmethod
    def wait_for_target_temperature(self, celsius: Optional[float] = None) -> None:
        """Wait until the module's target temperature is reached.

        Specifying a value for ``celsius`` that is different than
        the module's current target temperature may behave unpredictably.
        """

    @abstractmethod
    def deactivate(self) -> None:
        """Deactivate the Temperature Module."""

    @abstractmethod
    def get_current_temperature(self) -> float:
        """Get the module's current temperature in °C."""

    @abstractmethod
    def get_target_temperature(self) -> Optional[float]:
        """Get the module's target temperature in °C, if set."""

    @abstractmethod
    def get_status(self) -> TemperatureStatus:
        """Get the module's current temperature status."""


class AbstractMagneticModuleCore(AbstractModuleCore):
    """Core control interface for an attached Magnetic Module."""

    MODULE_TYPE: ClassVar = ModuleType.MAGNETIC

    @abstractmethod
    def get_serial_number(self) -> str:
        """Get the module's unique hardware serial number."""

    @abstractmethod
    def engage(
        self,
        height_from_base: Optional[float] = None,
        height_from_home: Optional[float] = None,
    ) -> None:
        """Raise the module's magnets.

        Only one of `height_from_base` or `height_from_home` may be specified.

        Args:
            height_from_base: Distance from labware base to raise the magnets.
            height_from_home: Distance from motor home position to raise the magnets.
        """

    @abstractmethod
    def engage_to_labware(
        self, offset: float = 0, preserve_half_mm: bool = False
    ) -> None:
        """Raise the module's magnets up to its loaded labware.

        Args:
            offset: Offset from the labware's default engage height.
            preserve_half_mm: For labware whose definitions
                erroneously use half-mm for their defined default engage height,
                use the value directly instead of converting it to real millimeters.

        Raises:
            Exception: Labware is not loaded or has no default engage height.
        """

    @abstractmethod
    def disengage(self) -> None:
        """Lower the magnets back into the module."""

    @abstractmethod
    def get_status(self) -> MagneticStatus:
        """Get the module's current magnet status."""


class AbstractThermocyclerCore(AbstractModuleCore):
    """Core control interface for an attached Thermocycler Module."""

    MODULE_TYPE: ClassVar = ModuleType.THERMOCYCLER

    @abstractmethod
    def get_serial_number(self) -> str:
        """Get the module's unique hardware serial number."""

    @abstractmethod
    def open_lid(self) -> ThermocyclerLidStatus:
        """Open the Thermocycler's lid."""

    @abstractmethod
    def close_lid(self) -> ThermocyclerLidStatus:
        """Close the Thermocycler's lid."""

    @abstractmethod
    def set_target_block_temperature(
        self,
        celsius: float,
        hold_time_seconds: Optional[float] = None,
        block_max_volume: Optional[float] = None,
    ) -> None:
        """Set the target temperature for the well block, in °C.

        Note:
            If ``hold_time_seconds`` is not specified, the Thermocycler
            will proceed to the next command after ``temperature`` is reached.
        Args:
            celsius: The target temperature, in °C.
            hold_time_seconds: The number of seconds to hold, after reaching
                ``temperature``, before proceeding to the next command.
            block_max_volume: The maximum volume of any individual well
                of the loaded labware. If not supplied, the thermocycler
                will default to 25µL/well.
        """

    @abstractmethod
    def wait_for_block_temperature(self) -> None:
        """Wait for target block temperature to be reached."""

    @abstractmethod
    def set_target_lid_temperature(self, celsius: float) -> None:
        """Set the target temperature for the heated lid, in °C."""

    @abstractmethod
    def wait_for_lid_temperature(self) -> None:
        """Wait for target lid temperature to be reached."""

    @abstractmethod
    def execute_profile(
        self,
        steps: List[ThermocyclerStep],
        repetitions: int,
        block_max_volume: Optional[float] = None,
    ) -> None:
        """Execute a Thermocycler Profile.

        Profile defined as a cycle of ``steps`` to repeat for a given number of ``repetitions``

        Note:
            Unlike the :py:meth:`set_block_temperature`, either or both of
            'hold_time_minutes' and 'hold_time_seconds' must be defined
            and finite for each step.
        Args:
            steps: List of unique steps that make up a single cycle.
                Each list item should be a dictionary that maps to
                the parameters of the :py:meth:`set_block_temperature`
                method with keys 'temperature', 'hold_time_seconds',
                and 'hold_time_minutes'.
            repetitions: The number of times to repeat the cycled steps.
            block_max_volume: The maximum volume of any individual well
                of the loaded labware. If not supplied, the thermocycler
                will default to 25µL/well.
        """

    @abstractmethod
    def deactivate_lid(self) -> None:
        """Turn off the heated lid."""

    @abstractmethod
    def deactivate_block(self) -> None:
        """Turn off the well block temperature controller"""

    @abstractmethod
    def deactivate(self) -> None:
        """Turn off the well block temperature controller, and heated lid"""

    @abstractmethod
    def get_lid_position(self) -> Optional[ThermocyclerLidStatus]:
        """Get the Thermocycler's lid position."""

    @abstractmethod
    def get_block_temperature_status(self) -> TemperatureStatus:
        """Get the Thermocycler's block temperature status."""

    @abstractmethod
    def get_lid_temperature_status(self) -> Optional[TemperatureStatus]:
        """Get the Thermocycler's lid temperature status."""

    @abstractmethod
    def get_block_temperature(self) -> Optional[float]:
        """Get the Thermocycler's current block temperature in °C."""

    @abstractmethod
    def get_block_target_temperature(self) -> Optional[float]:
        """Get the Thermocycler's target block temperature in °C."""

    @abstractmethod
    def get_lid_temperature(self) -> Optional[float]:
        """Get the Thermocycler's current lid temperature in °C."""

    @abstractmethod
    def get_lid_target_temperature(self) -> Optional[float]:
        """Get the Thermocycler's target lid temperature in °C."""

    @abstractmethod
    def get_ramp_rate(self) -> Optional[float]:
        """Get the Thermocycler's current ramp rate in °C/sec."""

    @abstractmethod
    def get_hold_time(self) -> Optional[float]:
        """Get the remaining hold time in seconds."""

    @abstractmethod
    def get_total_cycle_count(self) -> Optional[int]:
        """Get number of repetitions for current set cycle."""

    @abstractmethod
    def get_current_cycle_index(self) -> Optional[int]:
        """Get index of the current set cycle repetition."""

    @abstractmethod
    def get_total_step_count(self) -> Optional[int]:
        """Get number of steps within the current cycle."""

    @abstractmethod
    def get_current_step_index(self) -> Optional[int]:
        """Get the index of the current step within the current cycle."""


class AbstractHeaterShakerCore(AbstractModuleCore):
    """Core control interface for an attached Heater-Shaker Module."""

    MODULE_TYPE: ClassVar = ModuleType.HEATER_SHAKER

    @abstractmethod
    def get_serial_number(self) -> str:
        """Get the module's unique hardware serial number."""

    @abstractmethod
    def set_target_temperature(self, celsius: float) -> None:
        """Set the labware plate's target temperature in °C."""

    @abstractmethod
    def wait_for_target_temperature(self) -> None:
        """Wait for the labware plate's target temperature to be reached."""

    @abstractmethod
    def set_and_wait_for_shake_speed(self, rpm: int) -> None:
        """Set the shaker's target shake speed and wait for it to spin up."""

    @abstractmethod
    def open_labware_latch(self) -> None:
        """Open the labware latch."""

    @abstractmethod
    def close_labware_latch(self) -> None:
        """Close the labware latch."""

    @abstractmethod
    def deactivate_shaker(self) -> None:
        """Stop shaking."""

    @abstractmethod
    def deactivate_heater(self) -> None:
        """Stop heating."""

    @abstractmethod
    def get_current_temperature(self) -> float:
        """Get the labware plate's current temperature in °C."""

    @abstractmethod
    def get_target_temperature(self) -> Optional[float]:
        """Get the labware plate's target temperature in °C, if set."""

    @abstractmethod
    def get_current_speed(self) -> int:
        """Get the shaker's current speed in RPM."""

    @abstractmethod
    def get_target_speed(self) -> Optional[int]:
        """Get the shaker's target speed in RPM, if set."""

    @abstractmethod
    def get_temperature_status(self) -> TemperatureStatus:
        """Get the module's heater status."""

    @abstractmethod
    def get_speed_status(self) -> SpeedStatus:
        """Get the module's heater status."""

    @abstractmethod
    def get_labware_latch_status(self) -> HeaterShakerLabwareLatchStatus:
        """Get the module's labware latch status."""


class AbstractMagneticBlockCore(AbstractModuleCore):
    """Core control interface for an attached Magnetic Block."""

    MODULE_TYPE: ClassVar = ModuleType.MAGNETIC_BLOCK


class AbstractAbsorbanceReaderCore(AbstractModuleCore):
    """Core control interface for an attached Absorbance Reader Module."""

    MODULE_TYPE: ClassVar = ModuleType.ABSORBANCE_READER

    @abstractmethod
    def get_serial_number(self) -> str:
        """Get the module's unique hardware serial number."""

    @abstractmethod
    def initialize(
        self,
        mode: ABSMeasureMode,
        wavelengths: List[int],
        reference_wavelength: Optional[int] = None,
    ) -> None:
        """Initialize the Absorbance Reader by taking zero reading."""

    @abstractmethod
    def read(self, filename: Optional[str] = None) -> Dict[int, Dict[str, float]]:
        """Get an absorbance reading from the Absorbance Reader."""

    @abstractmethod
    def close_lid(self) -> None:
        """Close the Absorbance Reader's lid."""

    @abstractmethod
    def open_lid(self) -> None:
        """Open the Absorbance Reader's lid."""

    @abstractmethod
    def is_lid_on(self) -> bool:
        """Return True if the Absorbance Reader's lid is currently closed."""


class AbstractFlexStackerCore(AbstractModuleCore):
    """Core control interface for an attached Flex Stacker."""

    MODULE_TYPE: ClassVar = ModuleType.FLEX_STACKER

    @abstractmethod
    def get_serial_number(self) -> str:
        """Get the module's unique hardware serial number."""

    @abstractmethod
    def retrieve(self) -> None:
        """Release a labware from the hopper to the staging slot."""

    @abstractmethod
    def store(self) -> None:
        """Store a labware in the stacker hopper."""

    @abstractmethod
    def fill(self, message: str, count: int | None) -> None:
        """Pause the protocol to allow for filling the stacker."""

    @abstractmethod
    def empty(self, message: str) -> None:
        """Pause the protocol to allow for emptying the stacker."""

    @abstractmethod
    def set_stored_labware(
        self,
        main_load_name: str,
        main_namespace: str | None,
        main_version: int | None,
        lid_load_name: str | None,
        lid_namespace: str | None,
        lid_version: int | None,
        adapter_load_name: str | None,
        adapter_namespace: str | None,
        adapter_version: int | None,
        count: int | None,
    ) -> None:
        """Configure the kind of labware that the stacker stores."""
