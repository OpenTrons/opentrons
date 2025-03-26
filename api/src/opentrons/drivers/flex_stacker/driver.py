import asyncio
import re
import base64
from typing import List, Optional

from opentrons.drivers.asyncio.communication.errors import NoResponse
from opentrons.drivers.command_builder import CommandBuilder
from opentrons.drivers.asyncio.communication import AsyncResponseSerialConnection

from .abstract import AbstractFlexStackerDriver
from .errors import StackerErrorCodes, MotorStallDetected
from .types import (
    GCODE,
    ActiveRange,
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
    AxisParams,
    LimitSwitchStatus,
    LEDColor,
    StallGuardParams,
    TOFConfiguration,
    TOFMeasurement,
    TOFMeasurementFrame,
    TOFMeasurementResult,
    TOFSensor,
    TOFSensorMode,
    TOFSensorState,
    TOFSensorStatus,
)
from .utils import validate_histogram_frame


FS_BAUDRATE = 115200
DEFAULT_FS_TIMEOUT = 1
FS_MOVE_TIMEOUT = 20
FS_TOF_TIMEOUT = 20
FS_ACK = "OK\n"
FS_ERROR_KEYWORD = "err"
FS_ASYNC_ERROR_ACK = "async"
DEFAULT_COMMAND_RETRIES = 0
GCODE_ROUNDING_PRECISION = 2

# LED animation range values
MIN_DURATION_MS = 25  # 25ms
MAX_DURATION_MS = 10000  # 10s
MAX_REPS = 10

# TOF Sensor
TOF_FRAME_RETRIES = 1
NUMBER_OF_BINS = 128

# Stallguard defaults
STALLGUARD_CONFIG = {
    StackerAxis.X: StallGuardParams(StackerAxis.X, True, 2),
    StackerAxis.Z: StallGuardParams(StackerAxis.Z, True, 2),
}

STACKER_MOTION_CONFIG = {
    StackerAxis.X: {
        "home": AxisParams(
            run_current=1.5,  # mAmps
            hold_current=0.75,
            move_params=MoveParams(
                max_speed=10.0,  # mm/s
                acceleration=100.0,  # mm/s^2
                max_speed_discont=40.0,  # mm/s
            ),
        ),
        "move": AxisParams(
            run_current=1.0,
            hold_current=0.75,
            move_params=MoveParams(
                max_speed=200.0,
                acceleration=1500.0,
                max_speed_discont=40.0,
            ),
        ),
    },
    StackerAxis.Z: {
        "home": AxisParams(
            run_current=1.5,
            hold_current=1.8,
            move_params=MoveParams(
                max_speed=10.0,
                acceleration=100.0,
                max_speed_discont=25.0,
            ),
        ),
        "move": AxisParams(
            run_current=1.5,
            hold_current=0.5,
            move_params=MoveParams(
                max_speed=150.0,
                acceleration=500.0,
                max_speed_discont=25.0,
            ),
        ),
    },
    StackerAxis.L: {
        "home": AxisParams(
            run_current=0.8,
            hold_current=0.15,
            move_params=MoveParams(
                max_speed=100.0,
                acceleration=800.0,
                max_speed_discont=40.0,
            ),
        ),
        "move": AxisParams(
            run_current=0.6,
            hold_current=0.15,
            move_params=MoveParams(
                max_speed=100.0,
                acceleration=800.0,
                max_speed_discont=40.0,
            ),
        ),
    },
}


class FlexStackerDriver(AbstractFlexStackerDriver):
    """FLEX Stacker driver."""

    @classmethod
    def parse_device_info(cls, response: str) -> StackerInfo:
        """Parse stacker info."""
        _RE = re.compile(
            f"^{GCODE.DEVICE_INFO} FW:(?P<fw>\\S+) HW:Opentrons-flex-stacker-(?P<hw>\\S+) SerialNo:(?P<sn>\\S+)$"
        )
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for device info: {response}")
        return StackerInfo(
            m.group("fw"), HardwareRevision(m.group("hw")), m.group("sn")
        )

    @classmethod
    def parse_reset_reason(cls, response: str) -> int:
        """Parse the reset reason"""
        _RE = re.compile(rf"^{GCODE.GET_RESET_REASON} R:(?P<R>\d)$")
        match = _RE.match(response)
        if not match:
            raise ValueError(f"Incorrect Response for reset reason: {response}")
        return int(match.group("R"))

    @classmethod
    def parse_limit_switch_status(cls, response: str) -> LimitSwitchStatus:
        """Parse limit switch statuses."""
        field_names = LimitSwitchStatus.get_fields()
        pattern = r"\s".join([rf"{name}:(?P<{name}>\d)" for name in field_names])
        _RE = re.compile(f"^{GCODE.GET_LIMIT_SWITCH} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for limit switch status: {response}")
        return LimitSwitchStatus(*(bool(int(m.group(name))) for name in field_names))

    @classmethod
    def parse_platform_sensor_status(cls, response: str) -> PlatformStatus:
        """Parse platform statuses."""
        field_names = PlatformStatus.get_fields()
        pattern = r"\s".join([rf"{name}:(?P<{name}>\d)" for name in field_names])
        _RE = re.compile(f"^{GCODE.GET_PLATFORM_SENSOR} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for platform status: {response}")
        return PlatformStatus(*(bool(int(m.group(name))) for name in field_names))

    @classmethod
    def parse_door_closed(cls, response: str) -> bool:
        """Parse door closed."""
        _RE = re.compile(rf"^{GCODE.GET_DOOR_SWITCH} D:(\d)$")
        match = _RE.match(response)
        if not match:
            raise ValueError(f"Incorrect Response for door closed: {response}")
        return bool(int(match.group(1)))

    @classmethod
    def parse_installation_detected(cls, response: str) -> bool:
        """Parse install detection."""
        _RE = re.compile(rf"^{GCODE.GET_INSTALL_DETECTED} I:(\d)$")
        match = _RE.match(response)
        if not match:
            raise ValueError(
                f"Incorrect Response for installation detected: {response}"
            )
        return bool(int(match.group(1)))

    @classmethod
    def parse_move_params(cls, response: str) -> MoveParams:
        """Parse move params."""
        field_names = MoveParams.get_fields()
        pattern = r"\s".join(rf"{f}:(?P<{f}>(\d*\.)?\d+)" for f in field_names)
        _RE = re.compile(rf"^{GCODE.GET_MOVE_PARAMS} M:([XZL]) {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for move params: {response}")
        return MoveParams(
            max_speed=float(m.group("V")),
            acceleration=float(m.group("A")),
            max_speed_discont=float(m.group("D")),
        )

    @classmethod
    def parse_stallguard_params(cls, response: str) -> StallGuardParams:
        """Parse stallguard params."""
        pattern = r"(?P<M>[XZL]):(?P<E>\d) T:(?P<T>\d+)"
        _RE = re.compile(f"^{GCODE.GET_STALLGUARD_THRESHOLD} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for stallfguard params: {response}")
        return StallGuardParams(
            axis=StackerAxis(m.group("M")),
            enabled=bool(int(m.group("E"))),
            threshold=int(m.group("T")),
        )

    @classmethod
    def parse_get_motor_register(cls, response: str) -> int:
        """Parse get motor register value."""
        pattern = r"(?P<M>[XZL]):(?P<R>\d+) V:(?P<V>\d+)"
        _RE = re.compile(f"^{GCODE.GET_MOTOR_DRIVER_REGISTER} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(
                f"Incorrect Response for get motor driver register: {response}"
            )
        return int(m.group("V"))

    @classmethod
    def parse_get_tof_sensor_register(cls, response: str) -> int:
        """Parse get tof sensor register value."""
        pattern = r"(?P<S>[XZ]):(?P<R>\d+) V:(?P<V>\d+)"
        _RE = re.compile(f"^{GCODE.GET_TOF_DRIVER_REGISTER} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(
                f"Incorrect Response for get tof sensor driver register: {response}"
            )
        return int(m.group("V"))

    @classmethod
    def parse_tof_sensor_status(cls, response: str) -> TOFSensorStatus:
        """Parse get tof sensor status response."""
        pattern = r"(?P<S>[XZ]):(?P<O>\d) T:(?P<T>\d) M:(?P<M>\d)"
        _RE = re.compile(f"^{GCODE.GET_TOF_SENSOR_STATUS} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(
                f"Incorrect Response for get tof sensor status: {response}"
            )
        return TOFSensorStatus(
            sensor=TOFSensor(m.group("S")),
            state=TOFSensorState(int(m.group("T"))),
            mode=TOFSensorMode(int(m.group("M"))),
            ok=bool(int(m.group("O"))),
        )

    @classmethod
    def parse_manage_tof_measurement(cls, response: str) -> TOFMeasurement:
        """Parse manage tof measurement response."""
        pattern = r"(?P<S>[XZ]) K:(?P<K>\d+) C:(?P<C>\d) L:(?P<L>\d+)"
        _RE = re.compile(f"^{GCODE.MANAGE_TOF_MEASUREMENT} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(
                f"Incorrect Response for manage tof measurements: {response}"
            )
        return TOFMeasurement(
            sensor=TOFSensor(m.group("S")),
            kind=MeasurementKind(int(m.group("K"))),
            cancelled=bool(int(m.group("C"))),
            total_bytes=int(m.group("L")),
        )

    @classmethod
    def parse_get_tof_measurement(cls, response: str) -> TOFMeasurementFrame:
        """Parse get tof measurement response frame."""
        pattern = r"(?P<S>[XZ]) I:(?P<I>\d+) D:(?P<D>.+)"
        _RE = re.compile(f"^{GCODE.GET_TOF_MEASUREMENT} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(
                f"Incorrect Response for get tof measurement frame: {response}"
            )
        return TOFMeasurementFrame(
            sensor=TOFSensor(m.group("S")),
            frame_id=int(m.group("I")),
            data=base64.b64decode(m.group("D")),
        )

    @classmethod
    def parse_get_tof_configuration(cls, response: str) -> TOFConfiguration:
        """Parse get tof sensor configuration response."""
        pattern = r"(?P<S>[XZ]) I:(?P<I>\d+) A:(?P<A>\d+) K:(?P<K>\d+) P:(?P<P>\d+) H:(?P<H>\d)"
        _RE = re.compile(f"^{GCODE.GET_TOF_CONFIGURATION} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(
                f"Incorrect Response for get tof sensor configuration: {response}"
            )
        return TOFConfiguration(
            sensor=TOFSensor(m.group("S")),
            spad_map_id=SpadMapID(int(m.group("I"))),
            active_range=ActiveRange(int(m.group("A"))),
            kilo_iterations=int(m.group("K")),
            report_period_ms=int(m.group("P")),
            histogram_dump=bool(m.group("H")),
        )

    @classmethod
    def append_move_params(
        cls, command: CommandBuilder, params: MoveParams | None
    ) -> CommandBuilder:
        """Append move params."""
        if params is not None:
            command.add_float("V", params.max_speed, GCODE_ROUNDING_PRECISION)
            command.add_float("A", params.acceleration, GCODE_ROUNDING_PRECISION)
            command.add_float("D", params.max_speed_discont, GCODE_ROUNDING_PRECISION)
        return command

    @classmethod
    async def create(
        cls, port: str, loop: Optional[asyncio.AbstractEventLoop]
    ) -> "FlexStackerDriver":
        """Create a FLEX Stacker driver."""
        connection = await AsyncResponseSerialConnection.create(
            port=port,
            baud_rate=FS_BAUDRATE,
            timeout=DEFAULT_FS_TIMEOUT,
            number_of_retries=DEFAULT_COMMAND_RETRIES,
            ack=FS_ACK,
            loop=loop,
            error_keyword=FS_ERROR_KEYWORD,
            async_error_ack=FS_ASYNC_ERROR_ACK,
            reset_buffer_before_write=True,
            error_codes=StackerErrorCodes,
        )
        return cls(connection)

    def __init__(self, connection: AsyncResponseSerialConnection) -> None:
        """
        Constructor

        Args:
            connection: Connection to the FLEX Stacker
        """
        self._connection = connection

    async def connect(self) -> None:
        """Connect to stacker."""
        await self._connection.open()

    async def disconnect(self) -> None:
        """Disconnect from stacker."""
        await self._connection.close()

    async def is_connected(self) -> bool:
        """Check connection to stacker."""
        return await self._connection.is_open()

    async def get_device_info(self) -> StackerInfo:
        """Get Device Info."""
        response = await self._connection.send_command(
            GCODE.DEVICE_INFO.build_command()
        )
        device_info = self.parse_device_info(response)
        reason_resp = await self._connection.send_command(
            GCODE.GET_RESET_REASON.build_command()
        )
        reason = self.parse_reset_reason(reason_resp)
        device_info.rr = reason
        return device_info

    async def set_serial_number(self, sn: str) -> None:
        """Set Serial Number."""
        if not re.match(r"^FST[\w]{1}[\d]{2}[\d]{8}[\d]+$", sn):
            raise ValueError(
                f"Invalid serial number: ({sn}) expected format: FSTA1020250119001"
            )
        resp = await self._connection.send_command(
            GCODE.SET_SERIAL_NUMBER.build_command().add_element(sn)
        )
        if not re.match(rf"^{GCODE.SET_SERIAL_NUMBER}$", resp):
            raise ValueError(f"Incorrect Response for set serial number: {resp}")

    async def enable_motors(self, axis: List[StackerAxis]) -> None:
        """Enables the axis motor if present, disables it otherwise."""
        command = GCODE.ENABLE_MOTORS.build_command()
        for a in axis:
            command.add_element(a.name)
        resp = await self._connection.send_command(command)
        if not re.match(rf"^{GCODE.ENABLE_MOTORS}$", resp):
            raise ValueError(f"Incorrect Response for enable motors: {resp}")

    async def stop_motors(self) -> None:
        """Stop all motor movement."""
        resp = await self._connection.send_command(GCODE.STOP_MOTORS.build_command())
        if not re.match(rf"^{GCODE.STOP_MOTORS}$", resp):
            raise ValueError(f"Incorrect Response for stop motors: {resp}")

    async def set_run_current(self, axis: StackerAxis, current: float) -> None:
        """Set axis peak run current in amps."""
        resp = await self._connection.send_command(
            GCODE.SET_RUN_CURRENT.build_command().add_float(axis.name, current)
        )
        if not re.match(rf"^{GCODE.SET_RUN_CURRENT}$", resp):
            raise ValueError(f"Incorrect Response for set run current: {resp}")

    async def set_ihold_current(self, axis: StackerAxis, current: float) -> None:
        """Set axis hold current in amps."""
        resp = await self._connection.send_command(
            GCODE.SET_IHOLD_CURRENT.build_command().add_float(axis.name, current)
        )
        if not re.match(rf"^{GCODE.SET_IHOLD_CURRENT}$", resp):
            raise ValueError(f"Incorrect Response for set ihold current: {resp}")

    async def set_stallguard_threshold(
        self, axis: StackerAxis, enable: bool, threshold: int
    ) -> None:
        """Enables and sets the stallguard threshold for the given axis motor."""
        assert axis != StackerAxis.L, "Stallguard not supported for L axis"
        if not -64 < threshold < 63:
            raise ValueError(
                f"Threshold value ({threshold}) should be between -64 and 63."
            )
        resp = await self._connection.send_command(
            GCODE.SET_STALLGUARD.build_command()
            .add_int(axis.name, int(enable))
            .add_int("T", threshold)
        )
        if not re.match(rf"^{GCODE.SET_STALLGUARD}$", resp):
            raise ValueError(f"Incorrect Response for set stallguard threshold: {resp}")

    async def enable_tof_sensor(self, sensor: TOFSensor, enable: bool) -> None:
        """Enable or disable the TOF sensor."""
        # Enabling the TOF sensor takes a while, so give extra timeout.
        timeout = FS_TOF_TIMEOUT if enable else DEFAULT_FS_TIMEOUT
        resp = await self._connection.send_command(
            GCODE.ENABLE_TOF_SENSOR.build_command().add_int(sensor.name, int(enable)),
            timeout=timeout,
        )
        if not re.match(rf"^{GCODE.ENABLE_TOF_SENSOR}$", resp):
            raise ValueError(f"Incorrect Response for enable TOF sensor: {resp}")

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
        command = (
            GCODE.SET_TOF_CONFIGURATION.build_command()
            .add_element(sensor.name)
            .add_int("I", spad_map_id.value)
        )
        if active_range:
            command.add_int("A", active_range.value)
        if kilo_iterations:
            command.add_int("K", kilo_iterations)
        if report_period_ms:
            command.add_int("P", report_period_ms)
        if histogram_dump:
            command.add_int("H", int(histogram_dump))
        resp = await self._connection.send_command(command)
        if not re.match(rf"^{GCODE.SET_TOF_CONFIGURATION}$", resp):
            raise ValueError(f"Incorrect Response for set TOF configuration: {resp}")

    async def get_tof_configuration(self, sensor: TOFSensor) -> TOFConfiguration:
        """Get the configuration of the TOF sensor."""
        resp = await self._connection.send_command(
            GCODE.GET_TOF_CONFIGURATION.build_command().add_element(sensor.value)
        )
        return self.parse_get_tof_configuration(resp)

    async def manage_tof_measurement(
        self,
        sensor: TOFSensor,
        kind: MeasurementKind = MeasurementKind.HISTOGRAM,
        start: bool = True,
    ) -> TOFMeasurement:
        """Start or stop Measurements from the TOF sensor."""
        command = (
            GCODE.MANAGE_TOF_MEASUREMENT.build_command()
            .add_element(sensor.name)
            .add_int("K", kind.value)
        )
        if not start:
            command.add_element("C")
        resp = await self._connection.send_command(command)
        return self.parse_manage_tof_measurement(resp)

    async def _get_tof_histogram_frame(
        self, sensor: TOFSensor, resend: bool = False
    ) -> TOFMeasurementFrame:
        """Get the next measurement frame from TOF sensor or resend previous."""
        command = GCODE.GET_TOF_MEASUREMENT.build_command().add_element(sensor.name)
        if resend:
            command.add_element("R")
        resp = await self._connection.send_command(command)
        return self.parse_get_tof_measurement(resp)

    async def get_tof_histogram(self, sensor: TOFSensor) -> TOFMeasurementResult:
        """Get the full histogram measurement from the TOF sensor."""
        data = []
        data_len = 0
        next_frame_id = 0
        resend = False
        retries = TOF_FRAME_RETRIES

        # Cancel any ongoing measurements
        status = await self.get_tof_sensor_status(sensor)
        if status.state == TOFSensorState.MEASURING:
            await self.manage_tof_measurement(sensor, start=False)

        # Put the TOF sensor into histogram measurement mode
        start = await self.manage_tof_measurement(
            sensor, MeasurementKind.HISTOGRAM, start=True
        )
        # Request frames until the full histogram is transfered
        while data_len < start.total_bytes:
            try:
                # Request next histogram frame
                frame = await self._get_tof_histogram_frame(sensor, resend=resend)
                # Validate histogram frame
                validate_histogram_frame(frame.data, next_frame_id)
                # append frame data
                channel = frame.data[7:]
                data.append(channel)
                data_len += len(channel)
                assert (
                    not data_len > start.total_bytes
                ), f"Invalid number of bytes, expected {start.total_bytes} got {data_len}."
                retries = TOF_FRAME_RETRIES
                next_frame_id += 1
                resend = False
            except (ValueError, NoResponse):
                # There was a timeout or timing error, request previous frame.
                if retries <= 0:
                    # Cancel the measurement
                    await self.manage_tof_measurement(sensor, start.kind, start=False)
                    raise RuntimeError(f"Exceded frame {next_frame_id} retries")
                retries -= 1
                resend = True
                continue
            except Exception as e:
                # Cancel the histogram request
                await self.manage_tof_measurement(sensor, start.kind, start=False)
                raise RuntimeError(f"Could not get {sensor} Histogram", e)

        # Parse channel bin measurements from data
        #
        # There are 10 channels (0 - 9), each channel is comprised of 3 * 128 bytes.
        # The data starts with all the 128 LSB bytes, then all the 128 MID bytes, and
        # finally all the 128 MSB bytes for all the channels as seen below.
        #
        # ch0 lsb = data[0], mid = data[10], msb = data[20]
        # ch1 lsb = data[1], mid = data[11], msb = data[21]
        # ch2 lsb = data[2], mid = data[12], msb = data[22]
        # ...
        # ch9 lsb = data[9], mid = data[19], msb = data[29]
        #
        # Each channel has 128 bins comprised of the lsb, mid, and msb payload from above.
        # We can get the bins for each channel by combining the lsb, mid, and msb payload
        # for that specific channel.
        bins = {}
        for ch in range(10):  # 0-9 channels
            # Get the lsb, mid, and msb payload for the ch
            lsb = data[ch]
            mid = data[ch + 10]
            msb = data[ch + 20]
            # combine lsb, mid, and msb bytes to generate bin count for the ch
            bins[ch] = [
                (msb[b] << 16) | (mid[b] << 8) | lsb[b] for b in range(NUMBER_OF_BINS)
            ]
        return TOFMeasurementResult(start.sensor, start.kind, bins)

    async def set_motor_driver_register(
        self, axis: StackerAxis, reg: int, value: int
    ) -> None:
        """Set the register of the given motor axis driver to the given value."""
        resp = await self._connection.send_command(
            GCODE.SET_MOTOR_DRIVER_REGISTER.build_command()
            .add_int(axis.name, reg)
            .add_element(str(value))
        )
        if not re.match(rf"^{GCODE.SET_MOTOR_DRIVER_REGISTER}$", resp):
            raise ValueError(
                f"Incorrect Response for set motor driver register: {resp}"
            )

    async def get_motor_driver_register(self, axis: StackerAxis, reg: int) -> int:
        """Gets the register value of the given motor axis driver."""
        response = await self._connection.send_command(
            GCODE.GET_MOTOR_DRIVER_REGISTER.build_command().add_int(axis.name, reg)
        )
        return self.parse_get_motor_register(response)

    async def set_tof_driver_register(
        self, sensor: TOFSensor, reg: int, value: int
    ) -> None:
        """Set the register of the given tof sensor driver to the given value."""
        resp = await self._connection.send_command(
            GCODE.SET_TOF_DRIVER_REGISTER.build_command()
            .add_int(sensor.name, reg)
            .add_element(str(value))
        )
        if not re.match(rf"^{GCODE.SET_TOF_DRIVER_REGISTER}$", resp):
            raise ValueError(
                f"Incorrect Response for set tof sensor driver register: {resp}"
            )

    async def get_tof_driver_register(self, sensor: TOFSensor, reg: int) -> int:
        """Gets the register value of the given tof sensor driver."""
        response = await self._connection.send_command(
            GCODE.GET_TOF_DRIVER_REGISTER.build_command().add_int(sensor.name, reg)
        )
        return self.parse_get_tof_sensor_register(response)

    async def get_tof_sensor_status(self, sensor: TOFSensor) -> TOFSensorStatus:
        """Get the status of the tof sensor."""
        response = await self._connection.send_command(
            GCODE.GET_TOF_SENSOR_STATUS.build_command().add_element(sensor.name)
        )
        return self.parse_tof_sensor_status(response)

    async def get_motion_params(self, axis: StackerAxis) -> MoveParams:
        """Get the motion parameters used by the given axis motor."""
        response = await self._connection.send_command(
            GCODE.GET_MOVE_PARAMS.build_command().add_element(axis.name)
        )
        return self.parse_move_params(response)

    async def get_stallguard_threshold(self, axis: StackerAxis) -> StallGuardParams:
        """Get the stallguard parameters by the given axis motor."""
        response = await self._connection.send_command(
            GCODE.GET_STALLGUARD_THRESHOLD.build_command().add_element(axis.name)
        )
        return self.parse_stallguard_params(response)

    async def get_limit_switch(self, axis: StackerAxis, direction: Direction) -> bool:
        """Get limit switch status.

        :return: True if limit switch is triggered, False otherwise
        """
        response = await self.get_limit_switches_status()
        return response.get(axis, direction)

    async def get_limit_switches_status(self) -> LimitSwitchStatus:
        """Get limit switch statuses for all axes."""
        response = await self._connection.send_command(
            GCODE.GET_LIMIT_SWITCH.build_command()
        )
        return self.parse_limit_switch_status(response)

    async def get_platform_sensor(self, direction: Direction) -> bool:
        """Get platform sensor at one direction."""
        response = await self.get_platform_status()
        return response.get(direction)

    async def get_platform_status(self) -> PlatformStatus:
        """Get platform sensor status.

        :return: True if platform is detected, False otherwise
        """
        response = await self._connection.send_command(
            GCODE.GET_PLATFORM_SENSOR.build_command()
        )
        return self.parse_platform_sensor_status(response)

    async def get_hopper_door_closed(self) -> bool:
        """Get whether or not door is closed.

        :return: True if door is closed, False otherwise
        """
        response = await self._connection.send_command(
            GCODE.GET_DOOR_SWITCH.build_command()
        )
        return self.parse_door_closed(response)

    async def get_installation_detected(self) -> bool:
        """Get whether or not installation is detected.

        :return: True if installation is detected, False otherwise
        """
        response = await self._connection.send_command(
            GCODE.GET_INSTALL_DETECTED.build_command()
        )
        return self.parse_installation_detected(response)

    async def move_in_mm(
        self, axis: StackerAxis, distance: float, params: MoveParams | None = None
    ) -> MoveResult:
        """Move axis by the given distance in mm."""
        command = self.append_move_params(
            GCODE.MOVE_TO.build_command().add_float(
                axis.name, distance, GCODE_ROUNDING_PRECISION
            ),
            params,
        )
        try:
            resp = await self._connection.send_command(command, timeout=FS_MOVE_TIMEOUT)
            if not re.match(rf"^{GCODE.MOVE_TO}$", resp):
                raise ValueError(f"Incorrect Response for move to: {resp}")
        except MotorStallDetected:
            self.reset_serial_buffers()
            return MoveResult.STALL_ERROR
        return MoveResult.NO_ERROR

    async def move_to_limit_switch(
        self, axis: StackerAxis, direction: Direction, params: MoveParams | None = None
    ) -> MoveResult:
        """Move until limit switch is triggered."""
        command = self.append_move_params(
            GCODE.MOVE_TO_SWITCH.build_command().add_int(axis.name, direction.value),
            params,
        )
        try:
            resp = await self._connection.send_command(command, timeout=FS_MOVE_TIMEOUT)
            if not re.match(rf"^{GCODE.MOVE_TO_SWITCH}$", resp):
                raise ValueError(f"Incorrect Response for move to switch: {resp}")
        except MotorStallDetected:
            self.reset_serial_buffers()
            return MoveResult.STALL_ERROR
        return MoveResult.NO_ERROR

    async def home_axis(self, axis: StackerAxis, direction: Direction) -> MoveResult:
        """Home axis."""
        command = GCODE.HOME_AXIS.build_command().add_int(axis.name, direction.value)
        try:
            resp = await self._connection.send_command(command, timeout=FS_MOVE_TIMEOUT)
        except MotorStallDetected:
            self.reset_serial_buffers()
            return MoveResult.STALL_ERROR
        if not re.match(rf"^{GCODE.HOME_AXIS}$", resp):
            raise ValueError(f"Incorrect Response for home axis: {resp}")
        return MoveResult.NO_ERROR

    async def set_led(
        self,
        power: float,
        color: Optional[LEDColor] = None,
        external: Optional[bool] = None,
        pattern: Optional[LEDPattern] = None,
        duration: Optional[int] = None,
        reps: Optional[int] = None,
    ) -> None:
        """Set LED Status bar color and pattern.

        :param power: Power of the LED (0-1.0), 0 is off, 1 is full power
        :param color: Color of the LED
        :param external: True if external LED, False if internal LED
        :param pattern: Animation pattern of the LED status bar
        :param duration: Animation duration in milliseconds (25-10000), 10s max
        :param reps: Number of times to repeat the animation (-1 - 10), -1 is forever.
        """
        power = max(0, min(power, 1.0))
        command = GCODE.SET_LED.build_command().add_float(
            "P", power, GCODE_ROUNDING_PRECISION
        )
        if color is not None:
            command.add_int("C", color.value)
        if external is not None:
            command.add_int("K", int(external))
        if pattern is not None:
            command.add_int("A", pattern.value)
        if duration is not None:
            duration = max(MIN_DURATION_MS, min(duration, MAX_DURATION_MS))
            command.add_int("D", duration)
        if reps is not None:
            command.add_int("R", max(-1, min(reps, MAX_REPS)))
        resp = await self._connection.send_command(command)
        if not re.match(rf"^{GCODE.SET_LED}$", resp):
            raise ValueError(f"Incorrect Response for set led: {resp}")

    async def enter_programming_mode(self) -> None:
        """Reboot into programming mode"""
        command = GCODE.ENTER_BOOTLOADER.build_command()
        await self._connection.send_dfu_command(command)
        await self._connection.close()

    def reset_serial_buffers(self) -> None:
        """Reset the input and output serial buffers."""
        self._connection._serial.reset_input_buffer()
        self._connection._serial.reset_output_buffer()
