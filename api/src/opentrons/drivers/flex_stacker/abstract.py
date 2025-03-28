from typing import List, Optional, Protocol

from .types import (
    ActiveRange,
    LEDPattern,
    LimitSwitchStatus,
    MeasurementKind,
    MoveResult,
    SpadMapID,
    StackerAxis,
    PlatformStatus,
    Direction,
    MoveParams,
    StackerInfo,
    LEDColor,
    StallGuardParams,
    TOFConfiguration,
    TOFMeasurement,
    TOFMeasurementResult,
    TOFSensor,
    TOFSensorStatus,
)


class AbstractFlexStackerDriver(Protocol):
    """Protocol for the Stacker driver."""

    async def connect(self) -> None:
        """Connect to stacker."""
        ...

    async def disconnect(self) -> None:
        """Disconnect from stacker."""
        ...

    async def is_connected(self) -> bool:
        """Check connection to stacker."""
        ...

    async def get_device_info(self) -> StackerInfo:
        """Get Device Info."""
        ...

    async def set_serial_number(self, sn: str) -> None:
        """Set Serial Number."""
        ...

    async def enable_motors(self, axis: List[StackerAxis]) -> None:
        """Enables the axis motor if present, disables it otherwise."""
        ...

    async def stop_motors(self) -> None:
        """Stop all motor movement."""
        ...

    async def set_run_current(self, axis: StackerAxis, current: float) -> None:
        """Set axis peak run current in amps."""
        ...

    async def set_ihold_current(self, axis: StackerAxis, current: float) -> None:
        """Set axis hold current in amps."""
        ...

    async def set_stallguard_threshold(
        self, axis: StackerAxis, enable: bool, threshold: int
    ) -> None:
        """Enables and sets the stallguard threshold for the given axis motor."""
        ...

    async def enable_tof_sensor(self, sensor: TOFSensor, enable: bool) -> None:
        """Enable or disable the TOF sensor."""
        ...

    async def manage_tof_measurement(
        self,
        sensor: TOFSensor,
        kind: MeasurementKind = MeasurementKind.HISTOGRAM,
        start: bool = True,
    ) -> TOFMeasurement:
        """Start or stop Measurements from the TOF sensor."""
        ...

    async def get_tof_histogram(self, sensor: TOFSensor) -> TOFMeasurementResult:
        """Get the full histogram measurement from the TOF sensor."""
        ...

    async def set_tof_configuration(
        self,
        sensor: TOFSensor,
        spad_map_id: SpadMapID,
        active_range: Optional[ActiveRange] = None,
        kilo_iterations: Optional[int] = None,
        report_period_ms: Optional[int] = None,
        histogram_dump: Optional[bool] = None,
    ) -> None:
        """Set the configuration of the TOF sensor.

        :param sensor: The TOF sensor to configure.
        :param spad_map_id: The pre-defined SPAD map which sets the fov and focus area (14 default).
        :active_range: The operating mode Short-range high-accuracy (default) or long range.
        :kilo_iterations: The Measurement iterations times 1024 (4000 default).
        :report_period_ms: The reporting period before each measurement (500 default).
        :histogram_dump: Enables/Disables histogram measurements (True default).
        :return: None
        """
        ...

    async def get_tof_configuration(self, sensor: TOFSensor) -> TOFConfiguration:
        """Get the configuration of the TOF sensor."""
        ...

    async def set_motor_driver_register(
        self, axis: StackerAxis, reg: int, value: int
    ) -> None:
        """Set the register of the given motor axis driver to the given value."""
        ...

    async def get_motor_driver_register(self, axis: StackerAxis, reg: int) -> int:
        """Gets the register value of the given motor axis driver."""
        ...

    async def set_tof_driver_register(
        self, sensor: TOFSensor, reg: int, value: int
    ) -> None:
        """Set the register of the given tof sensor driver to the given value."""
        ...

    async def get_tof_driver_register(self, sensor: TOFSensor, reg: int) -> int:
        """Gets the register value of the given tof sensor driver."""
        ...

    async def get_tof_sensor_status(self, sensor: TOFSensor) -> TOFSensorStatus:
        """Get the status of the tof sensor."""
        ...

    async def get_motion_params(self, axis: StackerAxis) -> MoveParams:
        """Get the motion parameters used by the given axis motor."""
        ...

    async def get_stallguard_threshold(self, axis: StackerAxis) -> StallGuardParams:
        """Get the stallguard parameters by the given axis motor."""
        ...

    async def get_limit_switch(self, axis: StackerAxis, direction: Direction) -> bool:
        """Get limit switch status.

        :return: True if limit switch is triggered, False otherwise
        """
        ...

    async def get_limit_switches_status(self) -> LimitSwitchStatus:
        """Get limit switch statuses for all axes."""
        ...

    async def get_platform_sensor(self, direction: Direction) -> bool:
        """Get platform sensor status.

        :return: True if platform is present, False otherwise
        """
        ...

    async def get_platform_status(self) -> PlatformStatus:
        """Get platform status."""
        ...

    async def get_hopper_door_closed(self) -> bool:
        """Get whether or not door is closed.

        :return: True if door is closed, False otherwise
        """
        ...

    async def get_installation_detected(self) -> bool:
        """Get whether or not installation is detected.

        :return: True if installation is detected, False otherwise
        """
        ...

    async def move_in_mm(
        self, axis: StackerAxis, distance: float, params: MoveParams | None = None
    ) -> MoveResult:
        """Move axis by the given distance in mm."""
        ...

    async def move_to_limit_switch(
        self, axis: StackerAxis, direction: Direction, params: MoveParams | None = None
    ) -> MoveResult:
        """Move until limit switch is triggered."""
        ...

    async def home_axis(self, axis: StackerAxis, direction: Direction) -> MoveResult:
        """Home axis."""
        ...

    async def set_led(
        self,
        power: float,
        color: Optional[LEDColor] = None,
        external: Optional[bool] = None,
        pattern: Optional[LEDPattern] = None,
        duration: Optional[int] = None,
        reps: Optional[int] = None,
    ) -> None:
        """Set LED Status bar color and pattern."""
        ...

    async def enter_programming_mode(self) -> None:
        """Reboot into programming mode"""
        ...

    def reset_serial_buffers(self) -> None:
        """Reset the input and output serial buffers."""
        ...
