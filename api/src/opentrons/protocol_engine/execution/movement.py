"""Movement command handling."""
from __future__ import annotations

from typing import Dict, Optional, Sequence
from dataclasses import dataclass

from opentrons.types import Point
from opentrons.hardware_control import API as HardwareAPI
from opentrons.hardware_control.modules import (
    Thermocycler as HardwareThermocycler,
)
from opentrons.hardware_control.types import (
    CriticalPoint,
    Axis as HardwareAxis,
    MustHomeError as HardwareMustHomeError,
)
from opentrons.drivers.types import ThermocyclerLidStatus

from ..types import (
    ModuleLocation,
    ModuleModel,
    WellLocation,
    DeckPoint,
    MovementAxis,
    MotorAxis,
)
from ..state import StateStore, CurrentWell
from ..errors import MustHomeError, ThermocyclerNotOpenError
from ..resources import ModelUtils


MOTOR_AXIS_TO_HARDWARE_AXIS: Dict[MotorAxis, HardwareAxis] = {
    MotorAxis.X: HardwareAxis.X,
    MotorAxis.Y: HardwareAxis.Y,
    MotorAxis.LEFT_Z: HardwareAxis.Z,
    MotorAxis.RIGHT_Z: HardwareAxis.A,
    MotorAxis.LEFT_PLUNGER: HardwareAxis.B,
    MotorAxis.RIGHT_PLUNGER: HardwareAxis.C,
}


@dataclass(frozen=True)
class SavedPositionData:
    """The result of a save position procedure."""

    positionId: str
    position: DeckPoint


class MovementHandler:
    """Implementation logic for gantry movement."""

    _state_store: StateStore
    _hardware_api: HardwareAPI
    _model_utils: ModelUtils

    def __init__(
        self,
        state_store: StateStore,
        hardware_api: HardwareAPI,
        model_utils: Optional[ModelUtils] = None,
        thermocycler_movement_flagger: Optional[ThermocyclerMovementFlagger] = None,
    ) -> None:
        """Initialize a MovementHandler instance."""
        self._state_store = state_store
        self._hardware_api = hardware_api
        self._model_utils = model_utils or ModelUtils()
        self._thermocycler_movement_flagger = (
            thermocycler_movement_flagger
            or ThermocyclerMovementFlagger(
                state_store=self._state_store, hardware_api=self._hardware_api
            )
        )

    async def move_to_well(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        well_location: Optional[WellLocation] = None,
        current_well: Optional[CurrentWell] = None,
    ) -> None:
        """Move to a specific well."""
        self._thermocycler_movement_flagger.raise_if_labware_in_non_open_thermocycler(
            labware_id=labware_id
        )

        # get the pipette's mount and current critical point, if applicable
        pipette_location = self._state_store.motion.get_pipette_location(
            pipette_id=pipette_id,
            current_well=current_well,
        )
        hw_mount = pipette_location.mount.to_hw_mount()
        origin_cp = pipette_location.critical_point

        # get the origin of the movement from the hardware controller
        origin = await self._hardware_api.gantry_position(
            mount=hw_mount,
            critical_point=origin_cp,
        )
        max_travel_z = self._hardware_api.get_instrument_max_height(mount=hw_mount)

        # calculate the movement's waypoints
        waypoints = self._state_store.motion.get_movement_waypoints(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
            origin=origin,
            origin_cp=origin_cp,
            max_travel_z=max_travel_z,
            current_well=current_well,
        )

        # move through the waypoints
        for wp in waypoints:
            await self._hardware_api.move_to(
                mount=hw_mount,
                abs_position=wp.position,
                critical_point=wp.critical_point,
            )

    async def move_relative(
        self,
        pipette_id: str,
        axis: MovementAxis,
        distance: float,
    ) -> None:
        """Move a given pipette a relative amount in millimeters."""
        pipette_location = self._state_store.motion.get_pipette_location(
            pipette_id=pipette_id,
        )
        hw_mount = pipette_location.mount.to_hw_mount()
        delta = Point(
            x=distance if axis == MovementAxis.X else 0,
            y=distance if axis == MovementAxis.Y else 0,
            z=distance if axis == MovementAxis.Z else 0,
        )

        try:
            await self._hardware_api.move_rel(
                mount=hw_mount,
                delta=delta,
                fail_on_not_homed=True,
            )
        except HardwareMustHomeError as e:
            raise MustHomeError(str(e)) from e

    async def save_position(
        self,
        pipette_id: str,
        position_id: Optional[str],
    ) -> SavedPositionData:
        """Get the pipette position and save to state."""
        pipette_location = self._state_store.motion.get_pipette_location(
            pipette_id=pipette_id,
        )

        hw_mount = pipette_location.mount.to_hw_mount()
        pip_cp = pipette_location.critical_point
        if pip_cp is None:
            hw_pipette = self._state_store.pipettes.get_hardware_pipette(
                pipette_id=pipette_id,
                attached_pipettes=self._hardware_api.attached_instruments,
            )
            if hw_pipette.config.get("tip_length"):
                pip_cp = CriticalPoint.TIP
            else:
                pip_cp = CriticalPoint.NOZZLE

        try:
            point = await self._hardware_api.gantry_position(
                mount=hw_mount,
                critical_point=pip_cp,
                fail_on_not_homed=True,
            )
        except HardwareMustHomeError as e:
            raise MustHomeError(str(e)) from e

        position_id = position_id or self._model_utils.generate_id()

        return SavedPositionData(
            positionId=position_id,
            position=DeckPoint(x=point.x, y=point.y, z=point.z),
        )

    async def home(self, axes: Optional[Sequence[MotorAxis]]) -> None:
        """Send the requested axes to their "home" positions.

        If axes is `None`, will home all motors.
        """
        hardware_axes = None
        if axes is not None:
            hardware_axes = [MOTOR_AXIS_TO_HARDWARE_AXIS[a] for a in axes]

        await self._hardware_api.home(axes=hardware_axes)


class ThermocyclerMovementFlagger:
    """Flags unsafe movements to a Thermocycler Module.

    This is only for use in MovementHandler.
    It's a separate class for independent testability.
    """

    def __init__(self, state_store: StateStore, hardware_api: HardwareAPI) -> None:
        """Initialize the ThermocyclerMovementFlagger.

        Args:
            state_store: The Protocol Engine state store interface. Used to figure out
                         which Thermocycler a labware is in, if any.
            hardware_api: The underlying hardware interface. Used to query
                          Thermocyclers' current lid states.
        """
        self._state_store = state_store
        self._hardware_api = hardware_api

    def raise_if_labware_in_non_open_thermocycler(self, labware_id: str) -> None:
        """Raise if the given labware is inside a Thermocycler whose lid isn't open.

        Otherwise, no-op.

        Raises:
            ThermocyclerNotOpenError
        """
        try:
            lid_status = self._get_parent_thermocycler_lid_status(labware_id=labware_id)
        except self._NotInAThermocyclerError:
            pass
        else:
            if lid_status != ThermocyclerLidStatus.OPEN:
                raise ThermocyclerNotOpenError(
                    f"Thermocycler must be open when moving to labware inside it,"
                    f' but Thermocycler is currently "{lid_status}".'
                )

    def _get_parent_thermocycler_lid_status(
        self,
        labware_id: str,
    ) -> Optional[ThermocyclerLidStatus]:
        """Return the current lid status of the Thermocycler containing the labware.

        Raises:
            NotInAThermocyclerError: If the labware isn't contained in a Thermocycler.
                                     We need to raise an exception to signal this
                                     instead of returning None because None is already
                                     a possible Thermocycler lid status.
        """
        labware_location = self._state_store.labware.get_location(labware_id=labware_id)
        if isinstance(labware_location, ModuleLocation):
            module_id = labware_location.moduleId
            if (
                self._state_store.modules.get_model(module_id=module_id)
                == ModuleModel.THERMOCYCLER_MODULE_V1
            ):
                thermocycler_serial = self._state_store.modules.get_serial(
                    module_id=module_id
                )
                thermocycler = self._find_thermocycler_by_serial(
                    serial_number=thermocycler_serial
                )
                return thermocycler.lid_status
            else:
                # The labware is in a module, but it's not a Thermocycler.
                raise self._NotInAThermocyclerError()
        else:
            # The labware isn't in any module.
            raise self._NotInAThermocyclerError()

    def _find_thermocycler_by_serial(self, serial_number: str) -> HardwareThermocycler:
        for attached_module in self._hardware_api.attached_modules:
            # Different module types have different keys under .device_info.
            # Thermocyclers should always have .device_info["serial"].
            if (
                isinstance(attached_module, HardwareThermocycler)
                and attached_module.device_info["serial"] == serial_number
            ):
                return attached_module

        # FIX BEFORE MERGE:
        # Better error. This can happen if the module was disconnected
        # between load and now, I think.
        assert False

    class _NotInAThermocyclerError(Exception):
        pass
