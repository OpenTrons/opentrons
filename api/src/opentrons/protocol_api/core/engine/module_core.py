"""Protocol API module implementation logic."""

from __future__ import annotations

from typing import Optional, List, Dict, Union

from opentrons.hardware_control import SynchronousAdapter, modules as hw_modules
from opentrons.hardware_control.modules.types import (
    ModuleModel,
    TemperatureStatus,
    MagneticStatus,
    SpeedStatus,
    module_model_from_string,
)
from opentrons.drivers.types import (
    HeaterShakerLabwareLatchStatus,
    ThermocyclerLidStatus,
)

from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_engine.types import ABSMeasureMode, StackerFillEmptyStrategy
from opentrons.types import DeckSlotName
from opentrons.protocol_engine.clients import SyncClient as ProtocolEngineClient
from opentrons.protocol_engine.errors.exceptions import (
    LabwareNotLoadedOnModuleError,
    NoMagnetEngageHeightError,
    CannotPerformModuleAction,
)

from opentrons.protocols.api_support.types import APIVersion, ThermocyclerStep

from ... import validation
from ..module import (
    AbstractModuleCore,
    AbstractTemperatureModuleCore,
    AbstractMagneticModuleCore,
    AbstractThermocyclerCore,
    AbstractHeaterShakerCore,
    AbstractMagneticBlockCore,
    AbstractAbsorbanceReaderCore,
    AbstractFlexStackerCore,
)
from .exceptions import InvalidMagnetEngageHeightError
from . import load_labware_params

# Valid wavelength range for absorbance reader
ABS_WAVELENGTH_MIN = 350
ABS_WAVELENGTH_MAX = 1000


class ModuleCore(AbstractModuleCore):
    """Module core logic implementation for Python protocols.
    Args:
        module_id: ProtocolEngine ID of the loaded modules.
    """

    def __init__(
        self,
        module_id: str,
        engine_client: ProtocolEngineClient,
        api_version: APIVersion,
        sync_module_hardware: SynchronousAdapter[hw_modules.AbstractModule],
    ) -> None:
        self._module_id = module_id
        self._engine_client = engine_client
        self._api_version = api_version
        self._sync_module_hardware = sync_module_hardware

    @property
    def api_version(self) -> APIVersion:
        """Get the api version protocol module target."""
        return self._api_version

    @property
    def module_id(self) -> str:
        """The module's unique ProtocolEngine ID."""
        return self._module_id

    def get_model(self) -> ModuleModel:
        """Get the module's model identifier."""
        return module_model_from_string(
            self._engine_client.state.modules.get_connected_model(self.module_id)
        )

    def get_serial_number(self) -> str:
        """Get the module's unique hardware serial number."""
        return self._engine_client.state.modules.get_serial_number(self.module_id)

    def get_deck_slot(self) -> DeckSlotName:
        """Get the module's deck slot."""
        return self._engine_client.state.modules.get_location(self.module_id).slotName

    def get_deck_slot_id(self) -> str:
        slot_name = self.get_deck_slot()
        return validation.internal_slot_to_public_string(
            slot_name, robot_type=self._engine_client.state.config.robot_type
        )

    def get_display_name(self) -> str:
        """Get the module's display name."""
        return self._engine_client.state.modules.get_definition(
            self.module_id
        ).displayName


class NonConnectedModuleCore(AbstractModuleCore):
    """Not connected module core logic implementation for Python protocols.

    Args:
        module_id: ProtocolEngine ID of the loaded modules.
    """

    def __init__(
        self,
        module_id: str,
        engine_client: ProtocolEngineClient,
        api_version: APIVersion,
    ) -> None:
        self._module_id = module_id
        self._engine_client = engine_client
        self._api_version = api_version

    @property
    def api_version(self) -> APIVersion:
        """Get the api version protocol module target."""
        return self._api_version

    @property
    def module_id(self) -> str:
        """The module's unique ProtocolEngine ID."""
        return self._module_id

    def get_model(self) -> ModuleModel:
        """Get the module's model identifier."""
        return module_model_from_string(
            self._engine_client.state.modules.get_connected_model(self.module_id)
        )

    def get_deck_slot(self) -> DeckSlotName:
        """Get the module's deck slot."""
        return self._engine_client.state.modules.get_location(self.module_id).slotName

    def get_display_name(self) -> str:
        """Get the module's display name."""
        return self._engine_client.state.modules.get_definition(
            self.module_id
        ).displayName

    def get_deck_slot_id(self) -> str:
        slot_name = self.get_deck_slot()
        return validation.internal_slot_to_public_string(
            slot_name, robot_type=self._engine_client.state.config.robot_type
        )


class TemperatureModuleCore(ModuleCore, AbstractTemperatureModuleCore):
    """Temperature Module core logic implementation for Python protocols."""

    _sync_module_hardware: SynchronousAdapter[hw_modules.TempDeck]

    def set_target_temperature(self, celsius: float) -> None:
        """Set the Temperature Module's target temperature in °C."""
        self._engine_client.execute_command(
            cmd.temperature_module.SetTargetTemperatureParams(
                moduleId=self.module_id, celsius=celsius
            )
        )

    def wait_for_target_temperature(self, celsius: Optional[float] = None) -> None:
        """Wait until the module's target temperature is reached.
        Specifying a value for ``celsius`` that is different than
        the module's current target temperature may behave unpredictably.
        """
        self._engine_client.execute_command(
            cmd.temperature_module.WaitForTemperatureParams(
                moduleId=self.module_id, celsius=celsius
            )
        )

    def deactivate(self) -> None:
        """Deactivate the Temperature Module."""
        self._engine_client.execute_command(
            cmd.temperature_module.DeactivateTemperatureParams(moduleId=self.module_id)
        )

    def get_current_temperature(self) -> float:
        """Get the module's current temperature in °C."""
        return self._sync_module_hardware.temperature  # type: ignore[no-any-return]

    def get_target_temperature(self) -> Optional[float]:
        """Get the module's target temperature in °C, if set."""
        return self._sync_module_hardware.target  # type: ignore[no-any-return]

    def get_status(self) -> TemperatureStatus:
        """Get the module's current temperature status."""
        return self._sync_module_hardware.status  # type: ignore[no-any-return]


class MagneticModuleCore(ModuleCore, AbstractMagneticModuleCore):
    """Magnetic Module control interface via a ProtocolEngine."""

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

        # This core will only be used in apiLevels >=2.14, where
        # MagneticModuleContext.engage(height=...) is no longer available.
        # So these asserts should always pass.
        assert (
            height_from_home is None
        ), "Expected engage height to be specified from base."
        assert (
            height_from_base is not None
        ), "Expected engage height to be specified from base."

        self._engine_client.execute_command(
            cmd.magnetic_module.EngageParams(
                moduleId=self._module_id, height=height_from_base
            )
        )

    def engage_to_labware(
        self, offset: float = 0, preserve_half_mm: bool = False
    ) -> None:
        """Raise the module's magnets up to its loaded labware.
        Args:
            offset: Offset from the labware's default engage height.
            preserve_half_mm: For labware whose definitions
                erroneously use half-mm for their defined default engage height,
                use the value directly instead of converting it to real millimeters.
        """
        try:
            default_height = (
                self._engine_client.state.labware.get_default_magnet_height(
                    module_id=self.module_id, offset=offset
                )
            )
        except LabwareNotLoadedOnModuleError:
            raise InvalidMagnetEngageHeightError(
                "There is no labware loaded on this Magnetic Module,"
                " so you must specify an engage height"
                " with the `height_from_base` parameter."
            )
        except NoMagnetEngageHeightError:
            raise InvalidMagnetEngageHeightError(
                "The labware loaded on this Magnetic Module"
                " does not have a default engage height,"
                " so you must specify an engage height"
                " with the `height_from_base` parameter."
            )

        self._engine_client.execute_command(
            cmd.magnetic_module.EngageParams(
                moduleId=self.module_id, height=default_height
            )
        )

    def disengage(self) -> None:
        """Lower the magnets back into the module."""
        self._engine_client.execute_command(
            cmd.magnetic_module.DisengageParams(moduleId=self.module_id)
        )

    def get_status(self) -> MagneticStatus:
        """Get the module's current magnet status."""
        return self._sync_module_hardware.status  # type: ignore[no-any-return]


class ThermocyclerModuleCore(ModuleCore, AbstractThermocyclerCore):
    """Core control interface for an attached Thermocycler Module."""

    _sync_module_hardware: SynchronousAdapter[hw_modules.Thermocycler]
    _repetitions: Optional[int] = None
    _step_count: Optional[int] = None

    def open_lid(self) -> ThermocyclerLidStatus:
        """Open the Thermocycler's lid."""
        self._engine_client.execute_command(
            cmd.thermocycler.OpenLidParams(moduleId=self.module_id)
        )
        return ThermocyclerLidStatus.OPEN

    def close_lid(self) -> ThermocyclerLidStatus:
        """Close the Thermocycler's lid."""
        self._engine_client.execute_command(
            cmd.thermocycler.CloseLidParams(moduleId=self.module_id)
        )
        return ThermocyclerLidStatus.CLOSED

    def set_target_block_temperature(
        self,
        celsius: float,
        hold_time_seconds: Optional[float] = None,
        block_max_volume: Optional[float] = None,
    ) -> None:
        """Set the target temperature for the well block, in °C."""
        self._engine_client.execute_command(
            cmd.thermocycler.SetTargetBlockTemperatureParams(
                moduleId=self.module_id,
                celsius=celsius,
                blockMaxVolumeUl=block_max_volume,
                holdTimeSeconds=hold_time_seconds,
            )
        )

    def wait_for_block_temperature(self) -> None:
        """Wait for target block temperature to be reached."""
        self._engine_client.execute_command(
            cmd.thermocycler.WaitForBlockTemperatureParams(moduleId=self.module_id)
        )

    def set_target_lid_temperature(self, celsius: float) -> None:
        """Set the target temperature for the heated lid, in °C."""
        self._engine_client.execute_command(
            cmd.thermocycler.SetTargetLidTemperatureParams(
                moduleId=self.module_id, celsius=celsius
            )
        )

    def wait_for_lid_temperature(self) -> None:
        """Wait for target lid temperature to be reached."""
        self._engine_client.execute_command(
            cmd.thermocycler.WaitForLidTemperatureParams(moduleId=self.module_id)
        )

    def _execute_profile_pre_221(
        self,
        steps: List[ThermocyclerStep],
        repetitions: int,
        block_max_volume: Optional[float],
    ) -> None:
        """Execute a thermocycler profile using thermocycler/runProfile and flattened steps."""
        engine_steps = [
            cmd.thermocycler.RunProfileStepParams(
                celsius=step["temperature"],
                holdSeconds=step["hold_time_seconds"],
            )
            for step in steps
        ]
        repeated_engine_steps = engine_steps * repetitions
        self._engine_client.execute_command(
            cmd.thermocycler.RunProfileParams(
                moduleId=self.module_id,
                profile=repeated_engine_steps,
                blockMaxVolumeUl=block_max_volume,
            )
        )

    def _execute_profile_post_221(
        self,
        steps: List[ThermocyclerStep],
        repetitions: int,
        block_max_volume: Optional[float],
    ) -> None:
        """Execute a thermocycler profile using thermocycler/runExtendedProfile."""
        engine_steps: List[
            Union[cmd.thermocycler.ProfileCycle, cmd.thermocycler.ProfileStep]
        ] = [
            cmd.thermocycler.ProfileCycle(
                repetitions=repetitions,
                steps=[
                    cmd.thermocycler.ProfileStep(
                        celsius=step["temperature"],
                        holdSeconds=step["hold_time_seconds"],
                    )
                    for step in steps
                ],
            )
        ]
        self._engine_client.execute_command(
            cmd.thermocycler.RunExtendedProfileParams(
                moduleId=self.module_id,
                profileElements=engine_steps,
                blockMaxVolumeUl=block_max_volume,
            )
        )

    def execute_profile(
        self,
        steps: List[ThermocyclerStep],
        repetitions: int,
        block_max_volume: Optional[float] = None,
    ) -> None:
        """Execute a Thermocycler Profile."""
        self._repetitions = repetitions
        self._step_count = len(steps)
        if self.api_version >= APIVersion(2, 21):
            return self._execute_profile_post_221(steps, repetitions, block_max_volume)
        else:
            return self._execute_profile_pre_221(steps, repetitions, block_max_volume)

    def deactivate_lid(self) -> None:
        """Turn off the heated lid."""
        self._engine_client.execute_command(
            cmd.thermocycler.DeactivateLidParams(moduleId=self.module_id)
        )

    def deactivate_block(self) -> None:
        """Turn off the well block temperature controller"""
        self._clear_cycle_counters()
        self._engine_client.execute_command(
            cmd.thermocycler.DeactivateBlockParams(moduleId=self.module_id)
        )

    def deactivate(self) -> None:
        """Turn off the well block temperature controller, and heated lid"""
        self.deactivate_block()
        self.deactivate_lid()

    def get_lid_position(self) -> Optional[ThermocyclerLidStatus]:
        """Get the thermocycler's lid position."""
        return self._sync_module_hardware.lid_status  # type: ignore[no-any-return]

    def get_block_temperature_status(self) -> TemperatureStatus:
        """Get the thermocycler's block temperature status."""
        return self._sync_module_hardware.status  # type: ignore[no-any-return]

    def get_lid_temperature_status(self) -> Optional[TemperatureStatus]:
        """Get the thermocycler's lid temperature status."""
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
        return self._repetitions

    def get_current_cycle_index(self) -> Optional[int]:
        """Get index of the current set cycle repetition."""
        if self._repetitions is None:
            return None
        step_index = self._sync_module_hardware.current_step_index
        # TODO(jbl 2022-10-31) this is intended to work even if execute profile is non-blocking, but it is blocking so
        #   this is not guaranteed to be accurate
        return (step_index - 1) // self._step_count + 1  # type: ignore[no-any-return]

    def get_total_step_count(self) -> Optional[int]:
        """Get number of steps within the current cycle."""
        return self._step_count

    def get_current_step_index(self) -> Optional[int]:
        """Get the index of the current step within the current cycle."""
        if self._step_count is None:
            return None
        step_index = self._sync_module_hardware.current_step_index
        # TODO(jbl 2022-10-31) this is intended to work even if execute profile is non-blocking, but it is blocking so
        #   this is not guaranteed to be accurate
        return (step_index - 1) % self._step_count + 1  # type: ignore[no-any-return]

    def _clear_cycle_counters(self) -> None:
        """Clear core-tracked cycle counters."""
        self._repetitions = None
        self._step_count = None


class HeaterShakerModuleCore(ModuleCore, AbstractHeaterShakerCore):
    """Core control interface for an attached Heater-Shaker Module."""

    _sync_module_hardware: SynchronousAdapter[hw_modules.HeaterShaker]

    def set_target_temperature(self, celsius: float) -> None:
        """Set the labware plate's target temperature in °C."""
        self._engine_client.execute_command(
            cmd.heater_shaker.SetTargetTemperatureParams(
                moduleId=self.module_id, celsius=celsius
            )
        )

    def wait_for_target_temperature(self) -> None:
        """Wait for the labware plate's target temperature to be reached."""
        self._engine_client.execute_command(
            cmd.heater_shaker.WaitForTemperatureParams(moduleId=self.module_id)
        )

    def set_and_wait_for_shake_speed(self, rpm: int) -> None:
        """Set the shaker's target shake speed and wait for it to spin up."""
        self._engine_client.execute_command(
            cmd.heater_shaker.SetAndWaitForShakeSpeedParams(
                moduleId=self.module_id, rpm=rpm
            )
        )

    def open_labware_latch(self) -> None:
        """Open the labware latch."""
        self._engine_client.execute_command(
            cmd.heater_shaker.OpenLabwareLatchParams(moduleId=self.module_id)
        )

    def close_labware_latch(self) -> None:
        """Close the labware latch."""
        self._engine_client.execute_command(
            cmd.heater_shaker.CloseLabwareLatchParams(moduleId=self.module_id)
        )

    def deactivate_shaker(self) -> None:
        """Stop shaking."""
        self._engine_client.execute_command(
            cmd.heater_shaker.DeactivateShakerParams(moduleId=self.module_id)
        )

    def deactivate_heater(self) -> None:
        """Stop heating."""
        self._engine_client.execute_command(
            cmd.heater_shaker.DeactivateHeaterParams(moduleId=self.module_id)
        )

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


class MagneticBlockCore(NonConnectedModuleCore, AbstractMagneticBlockCore):
    """Magnetic Block control interface via a ProtocolEngine."""


class AbsorbanceReaderCore(ModuleCore, AbstractAbsorbanceReaderCore):
    """Absorbance Reader core logic implementation for Python protocols."""

    _sync_module_hardware: SynchronousAdapter[hw_modules.AbsorbanceReader]
    _initialized_value: Optional[List[int]] = None
    _ready_to_initialize: bool = False

    def initialize(
        self,
        mode: ABSMeasureMode,
        wavelengths: List[int],
        reference_wavelength: Optional[int] = None,
    ) -> None:
        """Initialize the Absorbance Reader by taking zero reading."""
        if not self._ready_to_initialize:
            raise CannotPerformModuleAction(
                "Cannot perform Initialize action on Absorbance Reader without calling `.close_lid()` first."
            )

        wavelength_len = len(wavelengths)
        if mode == "single" and wavelength_len != 1:
            raise ValueError(
                f"Single mode can only be initialized with 1 wavelength"
                f" {wavelength_len} wavelengths provided instead."
            )

        if mode == "multi" and (wavelength_len < 1 or wavelength_len > 6):
            raise ValueError(
                f"Multi mode can only be initialized with 1 - 6 wavelengths."
                f" {wavelength_len} wavelengths provided instead."
            )

        if reference_wavelength is not None and (
            reference_wavelength < ABS_WAVELENGTH_MIN
            or reference_wavelength > ABS_WAVELENGTH_MAX
        ):
            raise ValueError(
                f"Unsupported reference wavelength: ({reference_wavelength}) needs"
                f" to between {ABS_WAVELENGTH_MIN} and {ABS_WAVELENGTH_MAX} nm."
            )

        for wavelength in wavelengths:
            if (
                not isinstance(wavelength, int)
                or wavelength < ABS_WAVELENGTH_MIN
                or wavelength > ABS_WAVELENGTH_MAX
            ):
                raise ValueError(
                    f"Unsupported sample wavelength: ({wavelength}) needs"
                    f" to between {ABS_WAVELENGTH_MIN} and {ABS_WAVELENGTH_MAX} nm."
                )

        self._engine_client.execute_command(
            cmd.absorbance_reader.InitializeParams(
                moduleId=self.module_id,
                measureMode=mode,
                sampleWavelengths=wavelengths,
                referenceWavelength=reference_wavelength,
            ),
        )
        self._initialized_value = wavelengths

    def read(self, filename: Optional[str] = None) -> Dict[int, Dict[str, float]]:
        """Initiate a read on the Absorbance Reader, and return the results. During Analysis, this will return a measurement of zero for all wells."""
        wavelengths = self._engine_client.state.modules.get_absorbance_reader_substate(
            self.module_id
        ).configured_wavelengths
        if wavelengths is None:
            raise CannotPerformModuleAction(
                "Cannot perform Read action on Absorbance Reader without calling `.initialize(...)` first."
            )
        if self._initialized_value:
            self._engine_client.execute_command(
                cmd.absorbance_reader.ReadAbsorbanceParams(
                    moduleId=self.module_id, fileName=filename
                )
            )
        if not self._engine_client.state.config.use_virtual_modules:
            read_result = (
                self._engine_client.state.modules.get_absorbance_reader_substate(
                    self.module_id
                ).data
            )
            if read_result is not None:
                return read_result
            raise CannotPerformModuleAction(
                "Absorbance Reader failed to return expected read result."
            )

        # When using virtual modules, return all zeroes
        virtual_asbsorbance_result: Dict[int, Dict[str, float]] = {}
        for wavelength in wavelengths:
            converted_values = (
                self._engine_client.state.modules.convert_absorbance_reader_data_points(
                    data=[0] * 96
                )
            )
            virtual_asbsorbance_result[wavelength] = converted_values
        return virtual_asbsorbance_result

    def close_lid(
        self,
    ) -> None:
        """Close the Absorbance Reader's lid."""
        self._engine_client.execute_command(
            cmd.absorbance_reader.CloseLidParams(
                moduleId=self.module_id,
            )
        )
        self._ready_to_initialize = True

    def open_lid(self) -> None:
        """Close the Absorbance Reader's lid."""
        self._engine_client.execute_command(
            cmd.absorbance_reader.OpenLidParams(
                moduleId=self.module_id,
            )
        )

    def is_lid_on(self) -> bool:
        """Returns True if the Absorbance Reader's lid is currently on the Reader slot."""
        abs_state = self._engine_client.state.modules.get_absorbance_reader_substate(
            self.module_id
        )
        return abs_state.is_lid_on


class FlexStackerCore(ModuleCore, AbstractFlexStackerCore):
    """Flex Stacker core logic implementation for Python protocols."""

    _sync_module_hardware: SynchronousAdapter[hw_modules.FlexStacker]

    def retrieve(self) -> None:
        """Retrieve a labware from the Flex Stacker's hopper."""
        self._engine_client.execute_command(
            cmd.flex_stacker.RetrieveParams(
                moduleId=self.module_id,
            )
        )

    def store(self) -> None:
        """Store a labware into Flex Stacker's hopper."""
        self._engine_client.execute_command(
            cmd.flex_stacker.StoreParams(
                moduleId=self.module_id,
            )
        )

    def fill(self, message: str, count: int | None) -> None:
        """Pause the protocol to add more labware to the Flex Stacker's hopper."""
        self._engine_client.execute_command(
            cmd.flex_stacker.FillParams(
                moduleId=self.module_id,
                strategy=StackerFillEmptyStrategy.MANUAL_WITH_PAUSE,
                message=message,
                count=count,
            )
        )

    def empty(self, message: str) -> None:
        """Pause the protocol to remove labware from the Flex Stacker's hopper."""
        self._engine_client.execute_command(
            cmd.flex_stacker.EmptyParams(
                moduleId=self.module_id,
                strategy=StackerFillEmptyStrategy.MANUAL_WITH_PAUSE,
                message=message,
                count=0,
            )
        )

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

        custom_labware_params = (
            self._engine_client.state.labware.find_custom_labware_load_params()
        )

        main_namespace, main_version = load_labware_params.resolve(
            main_load_name,
            main_namespace,
            main_version,
            custom_labware_params,
            self._api_version,
        )
        main_labware = cmd.flex_stacker.StackerStoredLabwareDetails(
            loadName=main_load_name, namespace=main_namespace, version=main_version
        )

        lid_labware: cmd.flex_stacker.StackerStoredLabwareDetails | None = None

        if lid_load_name:
            lid_namespace, lid_version = load_labware_params.resolve(
                lid_load_name,
                lid_namespace,
                lid_version,
                custom_labware_params,
                self._api_version,
            )
            lid_labware = cmd.flex_stacker.StackerStoredLabwareDetails(
                loadName=lid_load_name, namespace=lid_namespace, version=lid_version
            )

        adapter_labware: cmd.flex_stacker.StackerStoredLabwareDetails | None = None

        if adapter_load_name:
            adapter_namespace, adapter_version = load_labware_params.resolve(
                adapter_load_name,
                adapter_namespace,
                adapter_version,
                custom_labware_params,
                self._api_version,
            )
            adapter_labware = cmd.flex_stacker.StackerStoredLabwareDetails(
                loadName=adapter_load_name,
                namespace=adapter_namespace,
                version=adapter_version,
            )

        self._engine_client.execute_command(
            cmd.flex_stacker.SetStoredLabwareParams(
                moduleId=self.module_id,
                initialCount=count,
                primaryLabware=main_labware,
                lidLabware=lid_labware,
                adapterLabware=adapter_labware,
            )
        )
