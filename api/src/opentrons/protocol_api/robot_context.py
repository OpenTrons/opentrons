from typing import NamedTuple, Union, Dict, Optional

from opentrons.types import Mount, DeckLocation
from opentrons.legacy_commands import publisher
from opentrons.hardware_control import SyncHardwareAPI, types as hw_types

from ._types import OffDeckType
from .core.common import ProtocolCore


class HardwareManager(NamedTuple):
    """Back. compat. wrapper for a removed class called `HardwareManager`.

    This interface will not be present in PAPIv3.
    """

    hardware: SyncHardwareAPI


class RobotContext(publisher.CommandPublisher):
    """
    A context for exposing finer robot control movement.

    The RobotContext class provides the objects, attributes, and methods that allow
    you to control robot motor axes individually.

    They can command the robot to perform an action, like moving to an absolute position,
    controlling the gripper claw or pipette motors.

    Objects in this class should not be instantiated directly. Instead, instances are
    returned by :py:meth:`ProtocolContext.robot`.

    .. versionadded:: 2.20

    """

    def __init__(self, core: ProtocolCore) -> None:
        self._hardware = HardwareManager(hardware=core.get_hardware())

    @property
    def hardware(self) -> HardwareManager:
        return self._hardware

    def move_to(
        self,
        abs_axis_map: Dict[hw_types.Axis, hw_types.AxisMapValue],
        velocity: float,
        critical_point: Optional[hw_types.CriticalPoint],
    ) -> None:
        raise NotImplementedError("`move_to` not yet implemented.")

    def move_axes_to(
        self,
        abs_axis_map: Dict[hw_types.Axis, hw_types.AxisMapValue],
        velocity: float,
        critical_point: Optional[hw_types.CriticalPoint],
    ) -> None:
        raise NotImplementedError("`move_axes_to` not yet implemented.")

    def move_axes_relative(
        self, rel_axis_map: Dict[hw_types.Axis, hw_types.AxisMapValue], velocity: float
    ) -> None:
        raise NotImplementedError("`move_axes_relative` not yet implemented.")

    def grasp_gripper(self, force: float) -> None:
        raise NotImplementedError("`grasp_gripper` not yet implemented.")

    def release_gripper(self) -> None:
        raise NotImplementedError("`release_gripper` not yet implemented.")

    def axis_coordinates_for(
        self, mount: Union[Mount, str], location: Union[DeckLocation, OffDeckType]
    ) -> None:
        raise NotImplementedError("`convert_axes_map` not yet implemented.")

    def plunger_coordinates_for_volume(
        self, mount: Union[Mount, str], volume: float
    ) -> None:
        raise NotImplementedError(
            "`plunger_coordinates_for_volume` not yet implemented."
        )

    def plunger_coordinates_for_named_position(
        self, mount: Union[Mount, str], position_name: str
    ) -> None:
        raise NotImplementedError(
            "`plunger_coordinates_for_named_position` not yet implemented."
        )

    def build_axis_map(
        self, axis_map: Dict[hw_types.Axis, hw_types.AxisMapValue]
    ) -> None:
        raise NotImplementedError("`build_axis_map` not yet implemented.")
