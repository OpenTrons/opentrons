"""Legacy Protocol API module implementation logic."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, List, Optional, cast

from opentrons.drivers.types import (
    HeaterShakerLabwareLatchStatus,
    ThermocyclerLidStatus,
)
from opentrons.hardware_control import SynchronousAdapter, modules as hw_modules
from opentrons.hardware_control.types import Axis
from opentrons.hardware_control.modules.types import (
    ModuleModel,
    ModuleType,
    TemperatureStatus,
    MagneticStatus,
    SpeedStatus,
    MagneticModuleModel,
    ThermocyclerStep,
)
from opentrons.protocols.geometry.module_geometry import (
    ModuleGeometry,
    ThermocyclerGeometry,
    HeaterShakerGeometry,
)
from opentrons.types import DeckSlotName, Location

from ..module import (
    AbstractModuleCore,
    AbstractTemperatureModuleCore,
    AbstractMagneticModuleCore,
    AbstractThermocyclerCore,
    AbstractHeaterShakerCore,
)

from .labware import LabwareImplementation
from ...labware import Labware

if TYPE_CHECKING:
    from .protocol_context import ProtocolContextImplementation


_log = logging.getLogger(__name__)


class NoTargetTemperatureSetError(RuntimeError):
    """An error raised when awaiting temperature when no target was set."""


class CannotPerformModuleAction(RuntimeError):
    """An error raised when attempting to execute an invalid module action."""


class LegacyModuleCore(AbstractModuleCore[LabwareImplementation]):
    """Legacy ModuleCore implementation for pre-ProtocolEngine protocols."""

    def __init__(
        self,
        sync_module_hardware: SynchronousAdapter[hw_modules.AbstractModule],
        requested_model: ModuleModel,
        geometry: ModuleGeometry,
        protocol_core: ProtocolContextImplementation,
    ) -> None:
        self._sync_module_hardware = sync_module_hardware
        self._requested_model = requested_model
        self._geometry = geometry
        self._protocol_core = protocol_core

    @property
    def geometry(self) -> ModuleGeometry:
        return self._geometry

    def get_model(self) -> ModuleModel:
        """Get the module's model identifier."""
        return self._geometry.model

    def get_type(self) -> ModuleType:
        """Get the module's general type."""
        return self._geometry.module_type

    def get_requested_model(self) -> ModuleModel:
        """Get the model identifier the module was requested as.

        This may differ from the actual model returned by `get_model`.
        """
        return self._requested_model

    def get_serial_number(self) -> str:
        """Get the module's unique hardware serial number."""
        device_info = self._sync_module_hardware.device_info
        return cast(str, device_info["serial"])

    def get_deck_slot(self) -> DeckSlotName:
        """Get the module's deck slot."""
        return DeckSlotName.from_primitive(self._geometry.parent)  # type: ignore[arg-type]

    def add_labware_core(self, labware_core: LabwareImplementation) -> None:
        """Add a labware to the module."""
        pass


class LegacyTemperatureModuleCore(
    LegacyModuleCore, AbstractTemperatureModuleCore[LabwareImplementation]
):
    """Legacy core control implementation for an attached Temperature Module."""

    _sync_module_hardware: SynchronousAdapter[hw_modules.TempDeck]

    def set_target_temperature(self, celsius: float) -> None:
        """Set the Temperature Module's target temperature in °C."""
        self._sync_module_hardware.start_set_temperature(celsius)

    def wait_for_target_temperature(self, celsius: Optional[float] = None) -> None:
        """Wait until the module's target temperature is reached.

        Specifying a value for ``celsius`` that is different than
        the module's current target temperature may beahave unpredictably.
        """
        self._sync_module_hardware.await_temperature(celsius)

    def deactivate(self) -> None:
        """Deactivate the Temperature Module."""
        self._sync_module_hardware.deactivate()

    def get_current_temperature(self) -> float:
        """Get the module's current temperature in °C."""
        return self._sync_module_hardware.temperature  # type: ignore[no-any-return]

    def get_target_temperature(self) -> Optional[float]:
        """Get the module's target temperature in °C, if set."""
        return self._sync_module_hardware.target  # type: ignore[no-any-return]

    def get_status(self) -> TemperatureStatus:
        """Get the module's current temperature status."""
        return self._sync_module_hardware.status  # type: ignore[no-any-return]


class LegacyMagneticModuleCore(
    LegacyModuleCore, AbstractMagneticModuleCore[LabwareImplementation]
):
    """Core control interface for an attached Magnetic Module."""

    _sync_module_hardware: SynchronousAdapter[hw_modules.MagDeck]

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
        # TODO(mc, 2022-09-23): update when HW API uses real millimeters
        # https://opentrons.atlassian.net/browse/RET-1242
        if height_from_base is not None:
            self._sync_module_hardware.engage(height_from_base=height_from_base)
        else:
            assert height_from_home is not None, "Engage height must be specified"
            self._sync_module_hardware.engage(height=height_from_home)

    def engage_to_labware(
        self,
        offset: float = 0,
        preserve_half_mm: bool = False,
    ) -> None:
        """Raise the module's magnets up to its loaded labware.

        Args:
            offset: Offset from the labware's default engage height.
            preserve_half_mm: Preserve any values that may accidentally be in half-mm,
                passing them directly onwards to the hardware control API.

        Raises:
            ValueError: Labware is not loaded or has no default engage height.
        """
        labware = self._geometry.labware

        if labware is None:
            raise ValueError(
                "No labware loaded in Magnetic Module;"
                " you must specify an engage height explicitly"
                " using `height_from_base` or `height`"
            )

        engage_height = labware._implementation.get_default_magnet_engage_height(
            preserve_half_mm
        )

        if engage_height is None:
            raise ValueError(
                f"Currently loaded labware {labware} does not have"
                " a default engage height; specify engage height explicitly"
                " using `height_from_base` or `height`"
            )

        if (
            self._geometry.model == MagneticModuleModel.MAGNETIC_V1
            and not preserve_half_mm
        ):
            engage_height *= 2

        # TODO(mc, 2022-09-23): use real millimeters instead of model-dependent mm
        # https://opentrons.atlassian.net/browse/RET-1242
        # TODO(mc, 2022-09-23): use `height_from_base` to match JSONv5
        # https://opentrons.atlassian.net/browse/RSS-110
        self._sync_module_hardware.engage(height=engage_height + offset)

    def disengage(self) -> None:
        """Lower the magnets back into the module."""
        self._sync_module_hardware.deactivate()

    def get_status(self) -> MagneticStatus:
        """Get the module's current magnet status."""
        return self._sync_module_hardware.status  # type: ignore[no-any-return]

    def add_labware_core(self, labware_core: LabwareImplementation) -> None:
        """Add a labware to the module."""
        if labware_core.get_default_magnet_engage_height() is None:
            name = labware_core.get_name()
            _log.warning(
                f"The labware definition for {name} does not define a"
                " default engagement height for use with the Magnetic Module;"
                " you must specify a height explicitly when calling engage()."
            )


class LegacyThermocyclerCore(
    LegacyModuleCore, AbstractThermocyclerCore[LabwareImplementation]
):
    """Core control interface for an attached Thermocycler Module."""

    _sync_module_hardware: SynchronousAdapter[hw_modules.Thermocycler]
    _geometry: ThermocyclerGeometry

    def open_lid(self) -> str:
        """Open the thermocycler's lid."""
        self._prepare_for_lid_move()
        self._geometry.lid_status = self._sync_module_hardware.open()
        return self._geometry.lid_status

    def close_lid(self) -> str:
        """Close the thermocycler's lid."""
        self._prepare_for_lid_move()
        self._geometry.lid_status = self._sync_module_hardware.close()
        return self._geometry.lid_status

    def set_block_temperature(
        self,
        celsius: float,
        hold_time_seconds: Optional[float] = None,
        hold_time_minutes: Optional[float] = None,
        ramp_rate: Optional[float] = None,
        block_max_volume: Optional[float] = None,
    ) -> None:
        """Set the target temperature for the well block, in °C."""
        self._sync_module_hardware.set_temperature(
            temperature=celsius,
            hold_time_seconds=hold_time_seconds,
            hold_time_minutes=hold_time_minutes,
            ramp_rate=ramp_rate,
            volume=block_max_volume,
        )

    def set_lid_temperature(self, celsius: float) -> None:
        """Set the target temperature for the heated lid, in °C."""
        self._sync_module_hardware.set_lid_temperature(temperature=celsius)

    def execute_profile(
        self,
        steps: List[ThermocyclerStep],
        repetitions: int,
        block_max_volume: Optional[float] = None,
    ) -> None:
        """Execute a Thermocycler Profile."""
        if repetitions <= 0:
            raise ValueError("repetitions must be a positive integer")
        for step in steps:
            if step.get("temperature") is None:
                raise ValueError("temperature must be defined for each step in cycle")
            hold_mins = step.get("hold_time_minutes")
            hold_secs = step.get("hold_time_seconds")
            if hold_mins is None and hold_secs is None:
                raise ValueError(
                    "either hold_time_minutes or hold_time_seconds must be"
                    "defined for each step in cycle"
                )
        self._sync_module_hardware.cycle_temperatures(
            steps=steps, repetitions=repetitions, volume=block_max_volume
        )

    def deactivate_lid(self) -> None:
        """Turn off the heated lid."""
        self._sync_module_hardware.deactivate_lid()

    def deactivate_block(self) -> None:
        """Turn off the well block temperature controller"""
        self._sync_module_hardware.deactivate_block()

    def deactivate(self) -> None:
        """Turn off the well block temperature controller, and heated lid"""
        self._sync_module_hardware.deactivate()

    def get_lid_position(self) -> Optional[ThermocyclerLidStatus]:
        """Get the thermoycler's lid position."""
        return self._sync_module_hardware.lid_status  # type: ignore[no-any-return]

    def get_block_temperature_status(self) -> TemperatureStatus:
        """Get the thermoycler's block temperature status."""
        return self._sync_module_hardware.status  # type: ignore[no-any-return]

    def get_lid_temperature_status(self) -> Optional[TemperatureStatus]:
        """Get the thermoycler's lid temperature status."""
        return self._sync_module_hardware.lid_temp_status  # type: ignore[no-any-return]

    def get_block_temperature(self) -> Optional[float]:
        """Get the thermocycler's current block temperature in °C."""
        return self._sync_module_hardware.temperature  # type: ignore[no-any-return]

    def get_block_target_temperature(self) -> Optional[float]:
        """Get the thermocycler's target block temperature in °C."""
        return self._sync_module_hardware.target  # type: ignore[no-any-return]

    def get_lid_temperature(self) -> Optional[float]:
        """Get the thermocycler's current lid temperature in °C."""
        return self._sync_module_hardware.lid_temp  # type: ignore[no-any-return]

    def get_lid_target_temperature(self) -> Optional[float]:
        """Get the thermocycler's target lid temperature in °C."""
        return self._sync_module_hardware.lid_target  # type: ignore[no-any-return]

    def get_ramp_rate(self) -> Optional[float]:
        """Get the thermocycler's current ramp rate in °C/sec."""
        return self._sync_module_hardware.ramp_rate  # type: ignore[no-any-return]

    def get_hold_time(self) -> Optional[float]:
        """Get the remaining hold time in seconds."""
        return self._sync_module_hardware.hold_time  # type: ignore[no-any-return]

    def get_total_cycle_count(self) -> Optional[int]:
        """Get number of repetitions for current set cycle."""
        return self._sync_module_hardware.total_cycle_count  # type: ignore[no-any-return]

    def get_current_cycle_index(self) -> Optional[int]:
        """Get index of the current set cycle repetition."""
        return self._sync_module_hardware.current_cycle_index  # type: ignore[no-any-return]

    def get_total_step_count(self) -> Optional[int]:
        """Get number of steps within the current cycle."""
        return self._sync_module_hardware.total_step_count  # type: ignore[no-any-return]

    def get_current_step_index(self) -> Optional[int]:
        """Get the index of the current step within the current cycle."""
        return self._sync_module_hardware.current_step_index  # type: ignore[no-any-return]

    def _get_fixed_trash(self) -> Labware:
        trash = self._protocol_core.get_fixed_trash()

        if isinstance(trash, LabwareImplementation):
            trash = Labware(implementation=trash)

        return cast(Labware, trash)

    def _prepare_for_lid_move(self) -> None:
        loaded_instruments = [
            instr
            for mount, instr in self._protocol_core.get_loaded_instruments().items()
            if instr is not None
        ]
        try:
            instr_core = loaded_instruments[0]
        except IndexError:
            _log.warning(
                "Cannot assure a safe gantry position to avoid colliding"
                " with the lid of the Thermocycler Module."
            )
        else:
            protocol_core = self._protocol_core
            hardware = protocol_core.get_hardware()
            hardware.retract(instr_core.get_mount())
            high_point = hardware.current_position(instr_core.get_mount())
            trash_top = self._get_fixed_trash().wells()[0].top()
            safe_point = trash_top.point._replace(
                z=high_point[Axis.by_mount(instr_core.get_mount())]
            )
            instr_core.move_to(
                Location(safe_point, None),
                force_direct=True,
                minimum_z_height=None,
                speed=None,
            )


class LegacyHeaterShakerCore(
    LegacyModuleCore, AbstractHeaterShakerCore[LabwareImplementation]
):
    """Core control interface for an attached Heater-Shaker Module."""

    _sync_module_hardware: SynchronousAdapter[hw_modules.HeaterShaker]
    _geometry: HeaterShakerGeometry

    def set_target_temperature(self, celsius: float) -> None:
        """Set the labware plate's target temperature in °C."""
        self._sync_module_hardware.start_set_temperature(celsius)

    def wait_for_target_temperature(self) -> None:
        """Wait for the labware plate's target temperature to be reached."""
        target_temperature = self.get_target_temperature()

        if target_temperature is None:
            raise NoTargetTemperatureSetError(
                "Heater-Shaker Module does not have a target temperature set."
            )

        self._sync_module_hardware.await_temperature(target_temperature)

    def set_and_wait_for_shake_speed(self, rpm: int) -> None:
        """Set the shaker's target shake speed and wait for it to spin up."""
        if (
            self.get_labware_latch_status()
            == HeaterShakerLabwareLatchStatus.IDLE_CLOSED
        ):
            self._prepare_for_shake()
            self._sync_module_hardware.set_speed(rpm=rpm)
        else:
            # TODO: Figure out whether to issue close latch behind the scenes instead
            raise CannotPerformModuleAction(
                "Cannot start shaking unless labware latch is closed."
            )

    def open_labware_latch(self) -> None:
        """Open the labware latch."""
        if self.get_speed_status() != SpeedStatus.IDLE:
            # TODO: What to do when speed status is ERROR?
            raise CannotPerformModuleAction(
                """Cannot open labware latch while module is shaking."""
            )
        self._prepare_for_latch_open()
        self._sync_module_hardware.open_labware_latch()

    def close_labware_latch(self) -> None:
        """Close the labware latch."""
        self._sync_module_hardware.close_labware_latch()

    def deactivate_shaker(self) -> None:
        """Stop shaking."""
        self._sync_module_hardware.deactivate_shaker()

    def deactivate_heater(self) -> None:
        """Stop heating."""
        self._sync_module_hardware.deactivate_heater()

    def get_current_temperature(self) -> float:
        """Get the labware plate's current temperature in °C."""
        return self._sync_module_hardware.temperature  # type: ignore[no-any-return]

    def get_target_temperature(self) -> Optional[float]:
        """Get the labware plate's target temperature in °C, if set."""
        return self._sync_module_hardware.target_temperature  # type: ignore[no-any-return]

    def get_current_speed(self) -> int:
        """Get the shaker's current speed in RPM."""
        return self._sync_module_hardware.speed  # type: ignore[no-any-return]

    def get_target_speed(self) -> Optional[int]:
        """Get the shaker's target speed in RPM, if set."""
        return self._sync_module_hardware.target_speed  # type: ignore[no-any-return]

    def get_temperature_status(self) -> TemperatureStatus:
        """Get the module's heater status."""
        return self._sync_module_hardware.temperature_status  # type: ignore[no-any-return]

    def get_speed_status(self) -> SpeedStatus:
        """Get the module's heater status."""
        return self._sync_module_hardware.speed_status  # type: ignore[no-any-return]

    def get_labware_latch_status(self) -> HeaterShakerLabwareLatchStatus:
        """Get the module's labware latch status."""
        return self._sync_module_hardware.labware_latch_status  # type: ignore[no-any-return]

    def _prepare_for_shake(self) -> None:
        """
        Before shaking, retracts pipettes if they're parked over a slot
        adjacent to the heater-shaker.
        """
        protocol_core = self._protocol_core
        if self._geometry.is_pipette_blocking_shake_movement(
            pipette_location=protocol_core.get_last_location()
        ):
            hardware = protocol_core.get_hardware()
            hardware.home(axes=[axis for axis in Axis.mount_axes()])
            protocol_core.set_last_location(None)

    def _prepare_for_latch_open(self) -> None:
        """
        Before opening latch, retracts pipettes if they're parked over a slot
        east/ west of the heater-shaker.
        """
        protocol_core = self._protocol_core
        if self._geometry.is_pipette_blocking_latch_movement(
            pipette_location=protocol_core.get_last_location()
        ):
            hardware = protocol_core.get_hardware()
            hardware.home(axes=[axis for axis in Axis.mount_axes()])
            protocol_core.set_last_location(None)


def create_module_core(
    module_hardware_api: hw_modules.AbstractModule,
    requested_model: ModuleModel,
    geometry: ModuleGeometry,
    protocol_core: ProtocolContextImplementation,
) -> LegacyModuleCore:
    core_cls = LegacyModuleCore

    if isinstance(module_hardware_api, hw_modules.TempDeck):
        core_cls = LegacyTemperatureModuleCore
    elif isinstance(module_hardware_api, hw_modules.MagDeck):
        core_cls = LegacyMagneticModuleCore
    elif isinstance(module_hardware_api, hw_modules.Thermocycler):
        core_cls = LegacyThermocyclerCore
    elif isinstance(module_hardware_api, hw_modules.HeaterShaker):
        core_cls = LegacyHeaterShakerCore

    return core_cls(
        sync_module_hardware=SynchronousAdapter(module_hardware_api),
        requested_model=requested_model,
        geometry=geometry,
        protocol_core=protocol_core,
    )
