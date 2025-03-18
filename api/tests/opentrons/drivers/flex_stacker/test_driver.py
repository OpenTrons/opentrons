import base64
from typing import Generator, Dict, List, Any
import pytest
from binascii import Error as BinError
from decoy import Decoy
from mock import AsyncMock, MagicMock
from opentrons.drivers.asyncio.communication.serial_connection import (
    AsyncResponseSerialConnection,
)
from opentrons.drivers.flex_stacker.driver import (
    DEFAULT_FS_TIMEOUT,
    FS_MOVE_TIMEOUT,
    FS_TOF_TIMEOUT,
    FlexStackerDriver,
)
from opentrons.drivers.flex_stacker import types
from opentrons.drivers.flex_stacker.errors import MotorStallDetected


@pytest.fixture
def connection() -> AsyncMock:
    return AsyncMock(spec=AsyncResponseSerialConnection)


@pytest.fixture
def subject(connection: AsyncMock) -> FlexStackerDriver:
    connection.send_command.return_value = ""
    connection._serial = MagicMock()
    return FlexStackerDriver(connection)


async def test_get_device_info(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get device info command"""
    connection.send_command.side_effect = [
        "M115 FW:0.0.1 HW:Opentrons-flex-stacker-a1 SerialNo:STCA120230605001",
        "M114 R:0",
    ]
    response = await subject.get_device_info()
    assert response == types.StackerInfo(
        fw="0.0.1",
        hw=types.HardwareRevision.EVT,
        sn="STCA120230605001",
        rr=0,
    )

    device_info = types.GCODE.DEVICE_INFO.build_command()
    reset_reason = types.GCODE.GET_RESET_REASON.build_command()
    connection.send_command.assert_any_call(device_info)
    connection.send_command.assert_called_with(reset_reason)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.side_effect = [
        "M115 FW:0.0.1 SerialNo:STCA120230605001",
        "M114 R:0",
    ]

    # This should raise ValueError
    with pytest.raises(ValueError):
        response = await subject.get_device_info()

    device_info = types.GCODE.DEVICE_INFO.build_command()
    connection.send_command.assert_any_call(device_info)
    # M115 response is invalid, so we dont send M114.
    connection.send_command.assert_called_once()


async def test_stop_motors(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a stop motors command"""
    connection.send_command.return_value = "M0"
    response = await subject.stop_motors()
    assert response

    stop_motors = types.GCODE.STOP_MOTORS.build_command()
    connection.send_command.assert_any_call(stop_motors)
    connection.reset_mock()

    # This should raise ValueError
    with pytest.raises(ValueError):
        await subject.get_device_info()


async def test_get_motion_params(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get motion params command."""
    connection.send_command.return_value = "M120 M:X V:200.000 A:1500.000 D:5.000"
    response = await subject.get_motion_params(types.StackerAxis.X)
    assert response == types.MoveParams(
        acceleration=1500.0,
        max_speed=200.0,
        max_speed_discont=5.0,
    )

    command = types.GCODE.GET_MOVE_PARAMS.build_command().add_element(
        types.StackerAxis.X.name
    )
    response = await connection.send_command(command)
    connection.send_command.assert_any_call(command)
    connection.reset_mock()


async def test_set_serial_number(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a set serial number command"""
    connection.send_command.return_value = "M996"

    serial_number = "FSTA1020250119001"
    response = await subject.set_serial_number(serial_number)
    assert response

    set_serial_number = types.GCODE.SET_SERIAL_NUMBER.build_command().add_element(
        serial_number
    )
    connection.send_command.assert_any_call(set_serial_number)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M9nn"
    with pytest.raises(ValueError):
        response = await subject.set_serial_number(serial_number)

    set_serial_number = types.GCODE.SET_SERIAL_NUMBER.build_command().add_element(
        serial_number
    )
    connection.send_command.assert_any_call(set_serial_number)
    connection.reset_mock()

    # Test invalid serial number
    with pytest.raises(ValueError):
        response = await subject.set_serial_number("invalid")

    connection.send_command.assert_not_called()
    connection.reset_mock()


async def test_enable_motors(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a enable motors command"""
    connection.send_command.return_value = "M17"
    response = await subject.enable_motors([types.StackerAxis.X])
    assert response

    move_to = types.GCODE.ENABLE_MOTORS.build_command().add_element(
        types.StackerAxis.X.value
    )
    connection.send_command.assert_any_call(move_to)
    connection.reset_mock()

    # Test no arg to disable all motors
    response = await subject.enable_motors(list(types.StackerAxis))
    assert response

    move_to = types.GCODE.ENABLE_MOTORS.build_command()
    move_to.add_element(types.StackerAxis.X.value)
    move_to.add_element(types.StackerAxis.Z.value)
    move_to.add_element(types.StackerAxis.L.value)

    connection.send_command.assert_any_call(move_to)
    connection.reset_mock()


async def test_get_limit_switch(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get limit switch command and return the boolean of one."""
    connection.send_command.return_value = "M119 XE:1 XR:0 ZE:0 ZR:1 LR:1"
    response = await subject.get_limit_switch(
        types.StackerAxis.X, types.Direction.EXTEND
    )
    assert response

    limit_switch_status = types.GCODE.GET_LIMIT_SWITCH.build_command()
    connection.send_command.assert_any_call(limit_switch_status)
    connection.reset_mock()


async def test_get_limit_switches_status(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get limit switch status and return LimitSwitchStatus."""
    connection.send_command.return_value = "M119 XE:1 XR:0 ZE:0 ZR:1 LR:1"
    response = await subject.get_limit_switches_status()
    assert response == types.LimitSwitchStatus(
        XE=True,
        XR=False,
        ZE=False,
        ZR=True,
        LR=True,
    )

    limit_switch_status = types.GCODE.GET_LIMIT_SWITCH.build_command()
    connection.send_command.assert_any_call(limit_switch_status)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M119 XE:b XR:0 ZE:a ZR:1 LR:n"
    with pytest.raises(ValueError):
        response = await subject.get_limit_switches_status()

    limit_switch_status = types.GCODE.GET_LIMIT_SWITCH.build_command()
    connection.send_command.assert_any_call(limit_switch_status)


async def test_get_platform_sensor(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get platform sensor command return status of specified sensor."""
    connection.send_command.return_value = "M121 E:1 R:1"
    response = await subject.get_platform_sensor(types.Direction.EXTEND)
    assert response

    platform_sensor = types.GCODE.GET_PLATFORM_SENSOR.build_command()
    connection.send_command.assert_any_call(platform_sensor)
    connection.reset_mock()


async def test_get_platform_status(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """it should send a get platform sensors status."""
    connection.send_command.return_value = "M121 E:0 R:1"
    response = await subject.get_platform_status()
    assert response == types.PlatformStatus(
        E=False,
        R=True,
    )

    platform_status = types.GCODE.GET_PLATFORM_SENSOR.build_command()
    connection.send_command.assert_any_call(platform_status)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M121 E:0 R:1 something"
    with pytest.raises(ValueError):
        response = await subject.get_platform_status()

    platform_status = types.GCODE.GET_PLATFORM_SENSOR.build_command()
    connection.send_command.assert_any_call(platform_status)


async def test_get_hopper_door_closed(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get door closed command."""
    connection.send_command.return_value = "M122 D:1"
    response = await subject.get_hopper_door_closed()
    assert response

    door_closed = types.GCODE.GET_DOOR_SWITCH.build_command()
    connection.send_command.assert_any_call(door_closed)
    connection.reset_mock()

    # Test door open
    connection.send_command.return_value = "M122 D:0"
    response = await subject.get_hopper_door_closed()
    assert not response

    door_closed = types.GCODE.GET_DOOR_SWITCH.build_command()
    connection.send_command.assert_any_call(door_closed)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M122 78gybhjk"

    with pytest.raises(ValueError):
        response = await subject.get_hopper_door_closed()

    door_closed = types.GCODE.GET_DOOR_SWITCH.build_command()
    connection.send_command.assert_any_call(door_closed)
    connection.reset_mock()


async def test_move_in_mm(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a move to command"""
    connection.send_command.return_value = "G0"
    response = await subject.move_in_mm(types.StackerAxis.X, 10)
    assert response

    move_to = types.GCODE.MOVE_TO.build_command().add_float("X", 10)
    connection.send_command.assert_any_call(move_to, timeout=FS_MOVE_TIMEOUT)
    connection.reset_mock()


@pytest.mark.parametrize(
    "command,command_args",
    [
        ("home_axis", (types.StackerAxis.X, types.Direction.EXTEND)),
        ("move_to_limit_switch", (types.StackerAxis.X, types.Direction.EXTEND)),
        ("move_in_mm", (types.StackerAxis.X, 10)),
    ],
)
async def test_move_stall(
    subject: FlexStackerDriver,
    connection: AsyncMock,
    command: str,
    command_args: list[Any],
) -> None:
    """It should handle motor stall exceptions during move commands."""
    # raise a motor stall detected exception
    connection.send_command.side_effect = MotorStallDetected(
        port="port", response="response", command="move command"
    )

    response = await subject.__getattribute__(command)(*command_args)

    connection.send_command.assert_called_once()
    # Verify we got a stall error result
    assert response == types.MoveResult.STALL_ERROR
    connection.reset_mock()


async def test_move_to_switch(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a move to switch command"""
    connection.send_command.return_value = "G5"
    axis = types.StackerAxis.X
    direction = types.Direction.EXTEND
    response = await subject.move_to_limit_switch(axis, direction)
    assert response

    move_to = types.GCODE.MOVE_TO_SWITCH.build_command().add_int(
        axis.name, direction.value
    )
    connection.send_command.assert_any_call(move_to, timeout=FS_MOVE_TIMEOUT)
    connection.reset_mock()


async def test_home_axis(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a home axis command"""
    connection.send_command.return_value = "G28"
    axis = types.StackerAxis.X
    direction = types.Direction.EXTEND
    response = await subject.home_axis(axis, direction)
    assert response

    move_to = types.GCODE.HOME_AXIS.build_command().add_int(axis.name, direction.value)
    connection.send_command.assert_any_call(move_to, timeout=FS_MOVE_TIMEOUT)
    connection.reset_mock()


async def test_set_led(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a set led command"""
    connection.send_command.return_value = "M200"
    response = await subject.set_led(1, types.LEDColor.RED)
    assert response

    set_led = types.GCODE.SET_LED.build_command().add_float("P", 1).add_int("C", 1)
    connection.send_command.assert_any_call(set_led)
    connection.reset_mock()

    # test setting only external leds
    response = await subject.set_led(1, types.LEDColor.RED, external=True)
    assert response

    set_led = (
        types.GCODE.SET_LED.build_command()
        .add_float("P", 1)
        .add_int("C", 1)
        .add_int("K", 1)
    )
    connection.send_command.assert_any_call(set_led)
    connection.reset_mock()


async def test_get_stallguard_threshold(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should get the stallguard threshold."""
    connection.send_command.return_value = "M911 Z:1 T:2"
    response = await subject.get_stallguard_threshold(types.StackerAxis.Z)
    assert response == types.StallGuardParams(types.StackerAxis.Z, True, 2)

    get_theshold = types.GCODE.GET_STALLGUARD_THRESHOLD.build_command().add_element(
        types.StackerAxis.Z.name
    )
    connection.send_command.assert_any_call(get_theshold)
    connection.reset_mock()


async def test_set_stallguard_threshold(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should set the stallguard threshold."""
    axis = types.StackerAxis.Z
    enable = True
    threshold = 2
    connection.send_command.return_value = "M910"
    response = await subject.set_stallguard_threshold(axis, enable, threshold)
    assert response

    set_threshold = (
        types.GCODE.SET_STALLGUARD.build_command()
        .add_int(axis.name, int(enable))
        .add_int("T", threshold)
    )
    connection.send_command.assert_any_call(set_threshold)
    connection.reset_mock()

    # test invalid threshold
    with pytest.raises(ValueError):
        response = await subject.set_stallguard_threshold(axis, enable, 1000)

    connection.send_command.assert_not_called()
    connection.reset_mock()


async def test_get_motor_driver_register(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should get the motor driver register."""
    connection.send_command.return_value = "M920 Z:1 V:2"
    response = await subject.get_motor_driver_register(types.StackerAxis.Z, 1)
    assert response == 2

    get_register = types.GCODE.GET_MOTOR_DRIVER_REGISTER.build_command().add_int(
        types.StackerAxis.Z.name, 1
    )
    connection.send_command.assert_any_call(get_register)
    connection.reset_mock()


async def test_set_motor_driver_register(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should set the motor driver register."""
    connection.send_command.return_value = "M921"
    response = await subject.set_motor_driver_register(types.StackerAxis.Z, 1, 2)
    assert response

    set_register = (
        types.GCODE.SET_MOTOR_DRIVER_REGISTER.build_command()
        .add_int(types.StackerAxis.Z.name, 1)
        .add_element(str(2))
    )
    connection.send_command.assert_any_call(set_register)
    connection.reset_mock()


async def test_enable_tof_sensor(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a enable tof sensor command."""
    connection.send_command.return_value = "M224"
    response = await subject.enable_tof_sensor(types.TOFSensor.X, False)
    assert response

    enable_tof = types.GCODE.ENABLE_TOF_SENSOR.build_command().add_int(
        types.TOFSensor.X.name, 0
    )
    connection.send_command.assert_any_call(enable_tof, timeout=DEFAULT_FS_TIMEOUT)
    connection.reset_mock()

    # Test enable, with longer timeout
    response = await subject.enable_tof_sensor(types.TOFSensor.X, True)
    assert response

    enable_tof = types.GCODE.ENABLE_TOF_SENSOR.build_command().add_int(
        types.TOFSensor.X.name, 1
    )
    connection.send_command.assert_any_call(enable_tof, timeout=FS_TOF_TIMEOUT)
    connection.reset_mock()


async def test_get_tof_driver_register(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should get the tof driver register."""
    connection.send_command.return_value = "M222 X:0 V:3"
    response = await subject.get_tof_driver_register(types.TOFSensor.X, 0)
    assert response == 3

    get_register = types.GCODE.GET_TOF_DRIVER_REGISTER.build_command().add_int(
        types.TOFSensor.X.name, 0
    )
    connection.send_command.assert_any_call(get_register)
    connection.reset_mock()


async def test_set_tof_driver_register(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should set the tof driver register."""
    connection.send_command.return_value = "M223"
    response = await subject.set_tof_driver_register(types.TOFSensor.X, 1, 1)
    assert response

    set_register = (
        types.GCODE.SET_TOF_DRIVER_REGISTER.build_command()
        .add_int(types.TOFSensor.X.name, 1)
        .add_element(str(1))
    )
    connection.send_command.assert_any_call(set_register)
    connection.reset_mock()


async def test_get_tof_sensor_status(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """it should send a get tof sensors status."""
    connection.send_command.return_value = "M215 Z:1 T:2 M:3"
    response = await subject.get_tof_sensor_status(types.TOFSensor.Z)
    assert response == types.TOFSensorStatus(
        sensor=types.TOFSensor.Z,
        state=types.TOFSensorState.IDLE,
        mode=types.TOFSensorMode.MEASURE,
        ok=True,
    )

    tof_status = types.GCODE.GET_TOF_SENSOR_STATUS.build_command().add_element(
        types.TOFSensor.Z.name
    )
    connection.send_command.assert_any_call(tof_status)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M215 Z:1 T:2 :99"
    with pytest.raises(ValueError):
        response = await subject.get_tof_sensor_status(types.TOFSensor.Z)

    tof_status = types.GCODE.GET_TOF_SENSOR_STATUS.build_command().add_element(
        types.TOFSensor.Z.name
    )
    connection.send_command.assert_any_call(tof_status)


async def test_manage_tof_measurement(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """it should send a start tof measurement and receive payload info."""
    connection.send_command.return_value = "M225 X K:0 C:0 L:3840"
    response = await subject.manage_tof_measurement(types.TOFSensor.X)
    assert response == types.TOFMeasurement(
        sensor=types.TOFSensor.X,
        kind=types.MeasurementKind.HISTOGRAM,
        cancelled=False,
        total_bytes=3840,
    )

    manage_measurement = (
        types.GCODE.MANAGE_TOF_MEASUREMENT.build_command()
        .add_element(types.TOFSensor.X.name)
        .add_int("K", types.MeasurementKind.HISTOGRAM.value)
    )
    connection.send_command.assert_any_call(manage_measurement)
    connection.reset_mock()

    # Test cancel transfer
    connection.send_command.return_value = "M225 X K:0 C:1 L:0"
    response = await subject.manage_tof_measurement(types.TOFSensor.X, start=False)
    assert response == types.TOFMeasurement(
        sensor=types.TOFSensor.X,
        kind=types.MeasurementKind.HISTOGRAM,
        cancelled=True,
        total_bytes=0,
    )

    manage_measurement = (
        types.GCODE.MANAGE_TOF_MEASUREMENT.build_command()
        .add_element(types.TOFSensor.X.name)
        .add_int("K", types.MeasurementKind.HISTOGRAM.value)
        .add_element("C")
    )
    connection.send_command.assert_any_call(manage_measurement)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M225 X K:0 LA0"

    # This should raise ValueError
    with pytest.raises(ValueError):
        response = await subject.manage_tof_measurement(types.TOFSensor.X)

    manage_measurement = (
        types.GCODE.MANAGE_TOF_MEASUREMENT.build_command()
        .add_element(types.TOFSensor.X.name)
        .add_int("K", types.MeasurementKind.HISTOGRAM.value)
    )
    connection.send_command.assert_any_call(manage_measurement)
    connection.reset_mock()


async def test_get_tof_histogram_frame(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """it should send a get tof measurement and receive a frame."""
    connection.send_command.return_value = "M226 X I:30 D:gSGAAB2AAAAAAAAAAAAAA\
            AAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\
            AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\
            AAAAAAAAAAAAAAAAAAAAAAAAAAA"
    response = await subject._get_tof_histogram_frame(types.TOFSensor.X)
    assert response == types.TOFMeasurementFrame(
        sensor=types.TOFSensor.X,
        frame_id=30,
        data=b"\x81!\x80\x00\x1d\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x07\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00",
    )

    get_measurement = types.GCODE.GET_TOF_MEASUREMENT.build_command().add_element(
        types.TOFSensor.X.name
    )
    connection.send_command.assert_any_call(get_measurement)
    connection.reset_mock()

    # Test cancel transfer
    connection.send_command.return_value = "M226 X I:30 D:gSGAAB2AAAAAAAAAAAAAA\
            AAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\
            AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\
            AAAAAAAAAAAAAAAAAAAAAAAAAAA"
    response = await subject._get_tof_histogram_frame(types.TOFSensor.X, resend=True)
    assert response == types.TOFMeasurementFrame(
        sensor=types.TOFSensor.X,
        frame_id=30,
        data=b"\x81!\x80\x00\x1d\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x07\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00",
    )

    get_measurement = (
        types.GCODE.GET_TOF_MEASUREMENT.build_command()
        .add_element(types.TOFSensor.X.name)
        .add_element("R")
    )
    connection.send_command.assert_any_call(get_measurement)
    connection.reset_mock()

    # Test invalid index response
    connection.send_command.return_value = "M226 X I:a D:asdsd3"

    # This should raise ValueError
    with pytest.raises(ValueError):
        response = await subject._get_tof_histogram_frame(types.TOFSensor.X)

    # Test invalid base64 frame
    connection.send_command.return_value = "M226 X I:23 D:INVALID"

    # This should raise binascii.Error
    with pytest.raises(BinError):
        response = await subject._get_tof_histogram_frame(types.TOFSensor.X)


def get_histogram_payload(frames: int) -> Generator[str, None, None]:
    """Helper to get histogram payload."""
    length = 0
    frame_id = 0
    while length < frames:
        first = bytearray(
            b"\x81\x04\x00\x0f\x00\x80\x00\x01\x00\x03\x00\x02\x02\x02\x02\x06\x03\x07\x02\x04\x03\x0b\xcc\xe5CJ\xf07I-\x9aT%\xe2\xd3\xb3\xa7\x82\x8clGKE/%.+$%\x1a\x1a\x11\x12\x10\x12\x11\x0c\x0b\t\x07\x0c\n\t\x05\x06\x0b\x0b\x05\x05\x07\x01\x0b\x05\x08\x05\x08\x03\x05\x02\x04\t\x04\x02\x02\x07\x06\x05\x06\x03\x03\x03\x07\x02\x00\x06\x03\x06\x02\x03\x05\x04\x03\x04\x02\x07\x02\x01\x05\x04\x05\x03\x02\x01\x01\x02\x02\x01\x04\x04\x04\x06\x03\x02\x04\x03\x02\x03\x01\x05\x05\x03\x02\x04\x03\x04"
        )
        rest = bytearray(
            b"\x81\x05\x80\x0e\x01\x80\x0020-*1$)213/-\x1e8\x14\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
        )
        rest[4] = frame_id
        data = first if frame_id == 0 else rest
        encoded = base64.b64encode(data).decode("utf-8")
        yield f"M226 X I:{frame_id+1} D:{encoded}"
        frame_id += 1
        length += 1


async def test_get_tof_histogram(
    subject: FlexStackerDriver,
    connection: AsyncMock,
    decoy: Decoy,
    histogram_bins: Dict[int, List[int]],
) -> None:
    """it should send a start and get tof measurements until full payload is transfered"""
    connection.send_command.side_effect = [
        "M215 X:1 T:2 M:3",
        "M225 X K:0 C:0 L:3840",
    ] + [p for p in get_histogram_payload(30)]
    response = await subject.get_tof_histogram(types.TOFSensor.X)
    assert response == types.TOFMeasurementResult(
        sensor=types.TOFSensor.X,
        kind=types.MeasurementKind.HISTOGRAM,
        bins=histogram_bins,
    )

    manage_measurement = (
        types.GCODE.MANAGE_TOF_MEASUREMENT.build_command()
        .add_element(types.TOFSensor.X.name)
        .add_int("K", types.MeasurementKind.HISTOGRAM.value)
    )
    get_measurement = types.GCODE.GET_TOF_MEASUREMENT.build_command().add_element(
        types.TOFSensor.X.name
    )
    connection.send_command.assert_any_call(manage_measurement)
    connection.send_command.assert_any_call(get_measurement)
    connection.reset_mock()

    # Test invalid frame_id
    payload = [p for p in get_histogram_payload(2)]
    connection.send_command.side_effect = (
        ["M215 X:1 T:2 M:3", "M225 X K:0 C:1 L:3840"]
        + payload
        + [payload[1], "M225 X K:0 C:1 L:0"]
    )

    # This should raise an exception
    with pytest.raises(RuntimeError):
        response = await subject.get_tof_histogram(types.TOFSensor.X)

    manage_measurement = (
        types.GCODE.MANAGE_TOF_MEASUREMENT.build_command()
        .add_element(types.TOFSensor.X.name)
        .add_int("K", types.MeasurementKind.HISTOGRAM.value)
    )
    get_measurement = types.GCODE.GET_TOF_MEASUREMENT.build_command().add_element(
        types.TOFSensor.X.name
    )
    connection.send_command.assert_any_call(manage_measurement)
    connection.send_command.assert_any_call(get_measurement)
    connection.reset_mock()
