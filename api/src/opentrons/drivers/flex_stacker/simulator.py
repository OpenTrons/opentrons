from typing import List, Optional, Dict

from opentrons.drivers.flex_stacker.driver import NUMBER_OF_BINS
from opentrons.util.async_helpers import ensure_yield

from .abstract import AbstractFlexStackerDriver
from .types import (
    ActiveRange,
    LEDColor,
    LEDPattern,
    MeasurementKind,
    MoveResult,
    SpadMapID,
    StackerAxis,
    PlatformStatus,
    Direction,
    StackerInfo,
    HardwareRevision,
    MoveParams,
    LimitSwitchStatus,
    StallGuardParams,
    TOFConfiguration,
    TOFMeasurement,
    TOFMeasurementResult,
    TOFSensor,
    TOFSensorMode,
    TOFSensorState,
    TOFSensorStatus,
)


class SimulatingDriver(AbstractFlexStackerDriver):
    """FLEX Stacker driver simulator."""

    def __init__(self, serial_number: Optional[str] = None) -> None:
        self._sn = serial_number or "dummySerialFS"
        self._limit_switch_status = LimitSwitchStatus(False, False, False, False, False)
        self._platform_sensor_status = PlatformStatus(False, False)
        self._door_closed = True
        self._install_detected = True
        self._connected = True
        self._stallgard_threshold = {
            a: StallGuardParams(a, False, 0) for a in StackerAxis
        }
        self._motor_registers: Dict[StackerAxis, Dict[int, int]] = {
            a: {} for a in StackerAxis
        }
        self._tof_registers: Dict[TOFSensor, Dict[int, int]] = {
            a: {} for a in TOFSensor
        }
        self._tof_sensor_status: Dict[TOFSensor, TOFSensorStatus] = {
            s: TOFSensorStatus(s, TOFSensorState.IDLE, TOFSensorMode.MEASURE, True)
            for s in TOFSensor
        }
        self._tof_sensor_configuration: Dict[TOFSensor, TOFConfiguration] = {
            s: TOFConfiguration(
                s, SpadMapID.SPAD_MAP_ID_14, ActiveRange.SHORT_RANGE, 4000, 500, True
            )
            for s in TOFSensor
        }

    def set_limit_switch(self, status: LimitSwitchStatus) -> None:
        self._limit_switch_status = status

    def set_platform_sensor(self, status: PlatformStatus) -> None:
        self._platform_sensor_status = status

    def set_door_closed(self, door_closed: bool) -> None:
        self._door_closed = door_closed

    @ensure_yield
    async def connect(self) -> None:
        """Connect to stacker."""
        self._connected = True

    @ensure_yield
    async def disconnect(self) -> None:
        """Disconnect from stacker."""
        self._connected = False

    @ensure_yield
    async def is_connected(self) -> bool:
        """Check connection to stacker."""
        return self._connected

    @ensure_yield
    async def get_device_info(self) -> StackerInfo:
        """Get Device Info."""
        return StackerInfo(fw="stacker-fw", hw=HardwareRevision.EVT, sn=self._sn)

    @ensure_yield
    async def set_serial_number(self, sn: str) -> None:
        """Set Serial Number."""
        self._sn = sn

    @ensure_yield
    async def enable_motors(self, axis: List[StackerAxis]) -> None:
        """Enables the axis motor if present, disables it otherwise."""
        pass

    @ensure_yield
    async def stop_motors(self) -> None:
        """Stop all motor movement."""
        pass

    @ensure_yield
    async def set_run_current(self, axis: StackerAxis, current: float) -> None:
        """Set axis peak run current in amps."""
        pass

    @ensure_yield
    async def set_ihold_current(self, axis: StackerAxis, current: float) -> None:
        """Set axis hold current in amps."""
        pass

    @ensure_yield
    async def set_stallguard_threshold(
        self, axis: StackerAxis, enable: bool, threshold: int
    ) -> None:
        """Enables and sets the stallguard threshold for the given axis motor."""
        self._stallgard_threshold[axis] = StallGuardParams(axis, enable, threshold)

    @ensure_yield
    async def enable_tof_sensor(self, sensor: TOFSensor, enable: bool) -> None:
        """Enable or disable the TOF sensor."""
        state = TOFSensorState.IDLE if enable else TOFSensorState.DISABLED
        self._tof_sensor_status[sensor].state = state
        self._tof_sensor_status[sensor].ok = enable

    @ensure_yield
    async def manage_tof_measurement(
        self,
        sensor: TOFSensor,
        kind: MeasurementKind = MeasurementKind.HISTOGRAM,
        start: bool = True,
    ) -> TOFMeasurement:
        """Start or stop Measurements from the TOF sensor."""
        return TOFMeasurement(
            sensor=sensor,
            kind=kind,
            cancelled=not start,
            # Each histogram frame is 135 bytes and there are 30 frames.
            # (3b header + 4b sub-header + 128 data) * 30 frames = 3840b.
            # The firmware sends 0 when the measurement is cancelled.
            total_bytes=3840 if start else 0,
        )

    @ensure_yield
    async def get_tof_histogram(self, sensor: TOFSensor) -> TOFMeasurementResult:
        """Get the full histogram measurement from the TOF sensor."""
        return TOFMeasurementResult(
            sensor=sensor,
            kind=MeasurementKind.HISTOGRAM,
            bins={c: [b for b in range(NUMBER_OF_BINS)] for c in range(10)},
        )

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
        config = self._tof_sensor_configuration[sensor]
        config.spad_map_id = spad_map_id
        config.active_range = active_range or config.active_range
        config.kilo_iterations = kilo_iterations or config.kilo_iterations
        config.report_period_ms = report_period_ms or config.report_period_ms
        config.histogram_dump = histogram_dump or config.histogram_dump

    async def get_tof_configuration(self, sensor: TOFSensor) -> TOFConfiguration:
        """Get the configuration of the TOF sensor."""
        return self._tof_sensor_configuration[sensor]

    @ensure_yield
    async def set_motor_driver_register(
        self, axis: StackerAxis, reg: int, value: int
    ) -> None:
        """Set the register of the given motor axis driver to the given value."""
        self._motor_registers[axis].update({reg: value})

    @ensure_yield
    async def get_motor_driver_register(self, axis: StackerAxis, reg: int) -> int:
        """Gets the register value of the given motor axis driver."""
        return self._motor_registers[axis].get(reg, 0)

    @ensure_yield
    async def set_tof_driver_register(
        self, sensor: TOFSensor, reg: int, value: int
    ) -> None:
        """Set the register of the given tof sensor driver to the given value."""
        self._tof_registers[sensor].update({reg: value})

    @ensure_yield
    async def get_tof_driver_register(self, sensor: TOFSensor, reg: int) -> int:
        """Gets the register value of the given tof sensor driver."""
        return self._tof_registers[sensor].get(reg, 0)

    @ensure_yield
    async def get_tof_sensor_status(self, sensor: TOFSensor) -> TOFSensorStatus:
        """Get the status of the tof sensor."""
        return self._tof_sensor_status[sensor]

    @ensure_yield
    async def get_motion_params(self, axis: StackerAxis) -> MoveParams:
        """Get the motion parameters used by the given axis motor."""
        return MoveParams(1, 1, 1)

    @ensure_yield
    async def get_stallguard_threshold(self, axis: StackerAxis) -> StallGuardParams:
        """Get the stallguard parameters by the given axis motor."""
        return self._stallgard_threshold[axis]

    @ensure_yield
    async def get_limit_switch(self, axis: StackerAxis, direction: Direction) -> bool:
        """Get limit switch status.

        :return: True if limit switch is triggered, False otherwise
        """
        return self._limit_switch_status.get(axis, direction)

    @ensure_yield
    async def get_limit_switches_status(self) -> LimitSwitchStatus:
        """Get limit switch statuses for all axes."""
        return self._limit_switch_status

    @ensure_yield
    async def get_platform_sensor(self, direction: Direction) -> bool:
        """Get platform sensor status.

        :return: True if platform is present, False otherwise
        """
        return self._platform_sensor_status.get(direction)

    @ensure_yield
    async def get_platform_status(self) -> PlatformStatus:
        """Get platform status."""
        return self._platform_sensor_status

    @ensure_yield
    async def get_hopper_door_closed(self) -> bool:
        """Get whether or not door is closed.

        :return: True if door is closed, False otherwise
        """
        return self._door_closed

    @ensure_yield
    async def get_installation_detected(self) -> bool:
        """Get whether or not installation is detected.

        :return: True if installation is detected, False otherwise
        """
        return self._install_detected

    @ensure_yield
    async def move_in_mm(
        self, axis: StackerAxis, distance: float, params: MoveParams | None = None
    ) -> MoveResult:
        """Move axis by the given distance in mm."""
        return MoveResult.NO_ERROR

    @ensure_yield
    async def move_to_limit_switch(
        self, axis: StackerAxis, direction: Direction, params: MoveParams | None = None
    ) -> MoveResult:
        """Move until limit switch is triggered."""
        return MoveResult.NO_ERROR

    @ensure_yield
    async def home_axis(self, axis: StackerAxis, direction: Direction) -> MoveResult:
        """Home axis."""
        return MoveResult.NO_ERROR

    @ensure_yield
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
        pass

    @ensure_yield
    async def enter_programming_mode(self) -> None:
        """Reboot into programming mode"""
        pass

    def reset_serial_buffers(self) -> None:
        """Reset the input and output serial buffers."""
        pass
