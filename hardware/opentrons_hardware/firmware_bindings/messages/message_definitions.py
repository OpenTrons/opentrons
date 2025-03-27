"""Definition of CAN messages."""
from dataclasses import dataclass
from typing import Type, Any
import threading
from typing_extensions import Literal

from ..constants import MessageId, ErrorCode, ErrorSeverity
from . import payloads
from .. import utils
from logging import Logger


class SingletonMessageIndexGenerator(object):
    """Singleton class that generates uinque index values."""

    def __new__(cls) -> Any:
        """Either generate or return the singleton instance."""
        if not hasattr(cls, "instance"):
            cls.instance = super(SingletonMessageIndexGenerator, cls).__new__(cls)
        return cls.instance

    def __init__(self) -> None:
        """Initalize the lock."""
        self._lock = threading.Lock()

    def get_next_index(self) -> int:
        """Return the next index."""
        # increment before returning so we never return 0 as a value
        self._lock.acquire(timeout=1)
        self.__current_index += 1
        self._lock.release()
        return self.__current_index

    __current_index = 0


@dataclass
class BaseMessage(object):
    """Base class of a message."""

    def __post_init__(self) -> None:
        """Update the message index from the singleton."""
        try:
            index_generator = SingletonMessageIndexGenerator()
            if self.payload.message_index.value is None:  # type: ignore[attr-defined]
                self.payload.message_index = utils.UInt32Field(  # type: ignore[attr-defined]
                    index_generator.get_next_index()
                )
        except AttributeError:
            # we are probably constructing this instance from binary and it doesn't
            # have a payload yet
            pass


@dataclass
class EmptyPayloadMessage(BaseMessage):
    """Base class of a message that has an empty payload."""

    payload: payloads.EmptyPayload = payloads.EmptyPayload()
    payload_type: Type[payloads.EmptyPayload] = payloads.EmptyPayload


@dataclass
class Acknowledgement(EmptyPayloadMessage):  # noqa: D101
    message_id: MessageId = MessageId.acknowledgement


@dataclass
class ErrorMessage(BaseMessage):  # noqa: D101
    payload: payloads.ErrorMessagePayload
    payload_type: Type[payloads.ErrorMessagePayload] = payloads.ErrorMessagePayload
    message_id: Literal[MessageId.error_message] = MessageId.error_message

    def log_error(self, log: Logger) -> None:
        """Log an error message with the correct log level."""
        error_name = ""
        if self.payload.error_code.value in [err.value for err in ErrorCode]:
            error_name = str(ErrorCode(self.payload.error_code.value).name)
        else:
            error_name = "UNKNOWN ERROR"

        if self.payload.severity == ErrorSeverity.warning:
            log.warning(f"recived a firmware warning {error_name}")
        elif self.payload.severity == ErrorSeverity.recoverable:
            log.error(f"recived a firmware recoverable error {error_name}")
        elif self.payload.severity == ErrorSeverity.unrecoverable:
            log.critical(f"recived a firmware critical error {error_name}")


@dataclass
class HeartbeatRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.heartbeat_request] = MessageId.heartbeat_request


@dataclass
class HeartbeatResponse(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.heartbeat_response] = MessageId.heartbeat_response


@dataclass
class DeviceInfoRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.device_info_request] = MessageId.device_info_request


@dataclass
class DeviceInfoResponse(BaseMessage):  # noqa: D101
    payload: payloads.DeviceInfoResponsePayload
    payload_type: Type[
        payloads.DeviceInfoResponsePayload
    ] = payloads.DeviceInfoResponsePayload
    message_id: Literal[MessageId.device_info_response] = MessageId.device_info_response


@dataclass
class TaskInfoRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.task_info_request] = MessageId.task_info_request


@dataclass
class TaskInfoResponse(BaseMessage):  # noqa: D101
    payload: payloads.TaskInfoResponsePayload
    payload_type: Type[
        payloads.TaskInfoResponsePayload
    ] = payloads.TaskInfoResponsePayload
    message_id: Literal[MessageId.task_info_response] = MessageId.task_info_response


@dataclass
class StopRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.stop_request] = MessageId.stop_request


@dataclass
class GetStatusRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.get_status_request] = MessageId.get_status_request


@dataclass
class EnableMotorRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.enable_motor_request] = MessageId.enable_motor_request


@dataclass
class DisableMotorRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.disable_motor_request
    ] = MessageId.disable_motor_request


@dataclass
class GetStatusResponse(BaseMessage):  # noqa: D101
    payload: payloads.GetStatusResponsePayload
    payload_type: Type[
        payloads.GetStatusResponsePayload
    ] = payloads.GetStatusResponsePayload
    message_id: Literal[MessageId.get_status_response] = MessageId.get_status_response


@dataclass
class GearStatusResponse(BaseMessage):  # noqa: D101
    payload: payloads.GetStatusResponsePayload
    payload_type: Type[
        payloads.GetStatusResponsePayload
    ] = payloads.GetStatusResponsePayload
    message_id: Literal[
        MessageId.get_gear_status_response
    ] = MessageId.get_gear_status_response


@dataclass
class MoveRequest(BaseMessage):  # noqa: D101
    payload: payloads.MoveRequestPayload
    payload_type: Type[payloads.MoveRequestPayload] = payloads.MoveRequestPayload
    message_id: Literal[MessageId.move_request] = MessageId.move_request


@dataclass
class WriteToEEPromRequest(BaseMessage):  # noqa: D101
    payload: payloads.EEPromDataPayload
    payload_type: Type[payloads.EEPromDataPayload] = payloads.EEPromDataPayload
    message_id: Literal[MessageId.write_eeprom] = MessageId.write_eeprom


@dataclass
class ReadFromEEPromRequest(BaseMessage):  # noqa: D101
    payload: payloads.EEPromReadPayload
    payload_type: Type[payloads.EEPromReadPayload] = payloads.EEPromReadPayload
    message_id: Literal[MessageId.read_eeprom_request] = MessageId.read_eeprom_request


@dataclass
class ReadFromEEPromResponse(BaseMessage):  # noqa: D101
    payload: payloads.EEPromDataPayload
    payload_type: Type[payloads.EEPromDataPayload] = payloads.EEPromDataPayload
    message_id: Literal[MessageId.read_eeprom_response] = MessageId.read_eeprom_response


@dataclass
class AddLinearMoveRequest(BaseMessage):  # noqa: D101
    payload: payloads.AddLinearMoveRequestPayload
    payload_type: Type[
        payloads.AddLinearMoveRequestPayload
    ] = payloads.AddLinearMoveRequestPayload
    message_id: Literal[MessageId.add_move_request] = MessageId.add_move_request


@dataclass
class AddSensorLinearMoveRequest(BaseMessage):
    """Sensor Linear Move Request."""

    payload: payloads.AddSensorLinearMoveBasePayload
    payload_type: Type[
        payloads.AddSensorLinearMoveBasePayload
    ] = payloads.AddSensorLinearMoveBasePayload
    message_id: Literal[
        MessageId.add_sensor_move_request
    ] = MessageId.add_sensor_move_request


@dataclass
class GetMoveGroupRequest(BaseMessage):  # noqa: D101
    payload: payloads.MoveGroupRequestPayload
    payload_type: Type[
        payloads.MoveGroupRequestPayload
    ] = payloads.MoveGroupRequestPayload
    message_id: Literal[
        MessageId.get_move_group_request
    ] = MessageId.get_move_group_request


@dataclass
class GetMoveGroupResponse(BaseMessage):  # noqa: D101
    payload: payloads.GetMoveGroupResponsePayload
    payload_type: Type[
        payloads.GetMoveGroupResponsePayload
    ] = payloads.GetMoveGroupResponsePayload
    message_id: Literal[
        MessageId.get_move_group_response
    ] = MessageId.get_move_group_response


@dataclass
class ExecuteMoveGroupRequest(BaseMessage):  # noqa: D101
    payload: payloads.ExecuteMoveGroupRequestPayload
    payload_type: Type[
        payloads.ExecuteMoveGroupRequestPayload
    ] = payloads.ExecuteMoveGroupRequestPayload
    message_id: Literal[
        MessageId.execute_move_group_request
    ] = MessageId.execute_move_group_request


@dataclass
class ClearAllMoveGroupsRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.clear_all_move_groups_request
    ] = MessageId.clear_all_move_groups_request


@dataclass
class MoveCompleted(BaseMessage):  # noqa: D101
    payload: payloads.MoveCompletedPayload
    payload_type: Type[payloads.MoveCompletedPayload] = payloads.MoveCompletedPayload
    message_id: Literal[MessageId.move_completed] = MessageId.move_completed


@dataclass
class MotorPositionRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.motor_position_request
    ] = MessageId.motor_position_request


@dataclass
class MotorPositionResponse(BaseMessage):  # noqa: D101
    payload: payloads.MotorPositionResponse
    payload_type: Type[payloads.MotorPositionResponse] = payloads.MotorPositionResponse
    message_id: Literal[
        MessageId.motor_position_response
    ] = MessageId.motor_position_response


@dataclass
class UpdateMotorPositionEstimationRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.update_motor_position_estimation_request
    ] = MessageId.update_motor_position_estimation_request


@dataclass
class UpdateMotorPositionEstimationResponse(BaseMessage):  # noqa: D101
    payload: payloads.MotorPositionResponse
    payload_type: Type[payloads.MotorPositionResponse] = payloads.MotorPositionResponse
    message_id: Literal[
        MessageId.update_motor_position_estimation_response
    ] = MessageId.update_motor_position_estimation_response


@dataclass
class SetMotionConstraints(BaseMessage):  # noqa: D101
    payload: payloads.MotionConstraintsPayload
    payload_type: Type[
        payloads.MotionConstraintsPayload
    ] = payloads.MotionConstraintsPayload
    message_id: Literal[
        MessageId.set_motion_constraints
    ] = MessageId.set_motion_constraints


@dataclass
class GetMotionConstraintsRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.get_motion_constraints_request
    ] = MessageId.get_motion_constraints_request


@dataclass
class GetMotionConstraintsResponse(BaseMessage):  # noqa: D101
    payload: payloads.MotionConstraintsPayload
    payload_type: Type[
        payloads.MotionConstraintsPayload
    ] = payloads.MotionConstraintsPayload
    message_id: Literal[
        MessageId.get_motion_constraints_response
    ] = MessageId.get_motion_constraints_response


@dataclass
class WriteMotorDriverRegister(BaseMessage):  # noqa: D101
    payload: payloads.MotorDriverRegisterDataPayload
    payload_type: Type[
        payloads.MotorDriverRegisterPayload
    ] = payloads.MotorDriverRegisterDataPayload
    message_id: Literal[
        MessageId.write_motor_driver_register_request
    ] = MessageId.write_motor_driver_register_request


@dataclass
class ReadMotorDriverRequest(BaseMessage):  # noqa: D101
    payload: payloads.MotorDriverRegisterPayload
    payload_type: Type[
        payloads.MotorDriverRegisterPayload
    ] = payloads.MotorDriverRegisterPayload
    message_id: Literal[
        MessageId.read_motor_driver_register_request
    ] = MessageId.read_motor_driver_register_request


@dataclass
class ReadMotorDriverResponse(BaseMessage):  # noqa: D101
    payload: payloads.ReadMotorDriverRegisterResponsePayload
    payload_type: Type[
        payloads.ReadMotorDriverRegisterResponsePayload
    ] = payloads.ReadMotorDriverRegisterResponsePayload
    message_id: Literal[
        MessageId.read_motor_driver_register_response
    ] = MessageId.read_motor_driver_register_response


@dataclass
class ReadMotorDriverErrorStatusRequest(BaseMessage):  # noqa: D101
    payload: payloads.EmptyPayload
    payload_type: Type[payloads.EmptyPayload] = payloads.EmptyPayload
    message_id: Literal[
        MessageId.read_motor_driver_error_status_request
    ] = MessageId.read_motor_driver_error_status_request


@dataclass
class ReadMotorDriverErrorStatusResponse(BaseMessage):  # noqa: D101
    payload: payloads.ReadMotorDriverErrorStatusResponsePayload
    payload_type: Type[
        payloads.ReadMotorDriverErrorStatusResponsePayload
    ] = payloads.ReadMotorDriverErrorStatusResponsePayload
    message_id: Literal[
        MessageId.read_motor_driver_error_status_response
    ] = MessageId.read_motor_driver_error_status_response


@dataclass
class WriteMotorCurrentRequest(BaseMessage):  # noqa: D101
    payload: payloads.MotorCurrentPayload
    payload_type: Type[payloads.MotorCurrentPayload] = payloads.MotorCurrentPayload
    message_id: Literal[
        MessageId.write_motor_current_request
    ] = MessageId.write_motor_current_request


@dataclass
class ReadPresenceSensingVoltageRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.read_presence_sensing_voltage_request
    ] = MessageId.read_presence_sensing_voltage_request


@dataclass
class ReadPresenceSensingVoltageResponse(BaseMessage):  # noqa: D101
    payload: payloads.ReadPresenceSensingVoltageResponsePayload
    payload_type: Type[
        payloads.ReadPresenceSensingVoltageResponsePayload
    ] = payloads.ReadPresenceSensingVoltageResponsePayload
    message_id: Literal[
        MessageId.read_presence_sensing_voltage_response
    ] = MessageId.read_presence_sensing_voltage_response


@dataclass
class PushToolsDetectedNotification(BaseMessage):  # noqa: D101
    payload: payloads.ToolsDetectedNotificationPayload
    payload_type: Type[
        payloads.ToolsDetectedNotificationPayload
    ] = payloads.ToolsDetectedNotificationPayload
    message_id: Literal[
        MessageId.tools_detected_notification
    ] = MessageId.tools_detected_notification


@dataclass
class AttachedToolsRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.attached_tools_request
    ] = MessageId.attached_tools_request


@dataclass
class FirmwareUpdateInitiate(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.fw_update_initiate] = MessageId.fw_update_initiate


@dataclass
class FirmwareUpdateData(BaseMessage):  # noqa: D101
    payload: payloads.FirmwareUpdateData
    payload_type: Type[payloads.FirmwareUpdateData] = payloads.FirmwareUpdateData
    message_id: Literal[MessageId.fw_update_data] = MessageId.fw_update_data


@dataclass
class FirmwareUpdateDataAcknowledge(BaseMessage):  # noqa: D101
    payload: payloads.FirmwareUpdateDataAcknowledge
    payload_type: Type[
        payloads.FirmwareUpdateDataAcknowledge
    ] = payloads.FirmwareUpdateDataAcknowledge
    message_id: Literal[MessageId.fw_update_data_ack] = MessageId.fw_update_data_ack


@dataclass
class FirmwareUpdateComplete(BaseMessage):  # noqa: D101
    payload: payloads.FirmwareUpdateComplete
    payload_type: Type[
        payloads.FirmwareUpdateComplete
    ] = payloads.FirmwareUpdateComplete
    message_id: Literal[MessageId.fw_update_complete] = MessageId.fw_update_complete


@dataclass
class FirmwareUpdateCompleteAcknowledge(BaseMessage):  # noqa: D101
    payload: payloads.FirmwareUpdateAcknowledge
    payload_type: Type[
        payloads.FirmwareUpdateAcknowledge
    ] = payloads.FirmwareUpdateAcknowledge
    message_id: Literal[
        MessageId.fw_update_complete_ack
    ] = MessageId.fw_update_complete_ack


@dataclass
class FirmwareUpdateStatusRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.fw_update_status_request
    ] = MessageId.fw_update_status_request


@dataclass
class FirmwareUpdateStatusResponse(BaseMessage):  # noqa: D101
    payload: payloads.FirmwareUpdateStatus
    payload_type: Type[payloads.FirmwareUpdateStatus] = payloads.FirmwareUpdateStatus
    message_id: Literal[
        MessageId.fw_update_status_response
    ] = MessageId.fw_update_status_response


@dataclass
class FirmwareUpdateEraseAppRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.fw_update_erase_app] = MessageId.fw_update_erase_app


@dataclass
class FirmwareUpdateEraseAppResponse(BaseMessage):  # noqa: D101
    payload: payloads.FirmwareUpdateAcknowledge
    payload_type: Type[
        payloads.FirmwareUpdateAcknowledge
    ] = payloads.FirmwareUpdateAcknowledge
    message_id: Literal[
        MessageId.fw_update_erase_app_ack
    ] = MessageId.fw_update_erase_app_ack


@dataclass
class HomeRequest(BaseMessage):  # noqa: D101
    payload: payloads.HomeRequestPayload
    payload_type: Type[payloads.HomeRequestPayload] = payloads.HomeRequestPayload
    message_id: Literal[MessageId.home_request] = MessageId.home_request


@dataclass
class FirmwareUpdateStartApp(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.fw_update_start_app] = MessageId.fw_update_start_app


@dataclass
class ReadLimitSwitchRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[MessageId.limit_sw_request] = MessageId.limit_sw_request


@dataclass
class ReadLimitSwitchResponse(BaseMessage):  # noqa: D101
    payload: payloads.GetLimitSwitchResponse
    payload_type: Type[
        payloads.GetLimitSwitchResponse
    ] = payloads.GetLimitSwitchResponse
    message_id: Literal[MessageId.limit_sw_response] = MessageId.limit_sw_response


@dataclass
class MaxSensorValueRequest(BaseMessage):  # noqa: D101
    payload: payloads.ReadFromSensorRequestPayload
    payload_type: Type[
        payloads.ReadFromSensorRequestPayload
    ] = payloads.ReadFromSensorRequestPayload
    message_id: Literal[
        MessageId.max_sensor_value_request
    ] = MessageId.max_sensor_value_request


@dataclass
class MaxSensorValueResponse(BaseMessage):  # noqa: D101
    payload: payloads.ReadFromSensorRequestPayload
    payload_type: Type[
        payloads.ReadFromSensorRequestPayload
    ] = payloads.ReadFromSensorRequestPayload
    message_id: Literal[
        MessageId.max_sensor_value_response
    ] = MessageId.max_sensor_value_response


@dataclass
class ReadFromSensorRequest(BaseMessage):  # noqa: D101
    payload: payloads.ReadFromSensorRequestPayload
    payload_type: Type[
        payloads.ReadFromSensorRequestPayload
    ] = payloads.ReadFromSensorRequestPayload
    message_id: Literal[MessageId.read_sensor_request] = MessageId.read_sensor_request


@dataclass
class WriteToSensorRequest(BaseMessage):  # noqa: D101
    payload: payloads.WriteToSensorRequestPayload
    payload_type: Type[
        payloads.WriteToSensorRequestPayload
    ] = payloads.WriteToSensorRequestPayload
    message_id: Literal[MessageId.write_sensor_request] = MessageId.write_sensor_request


@dataclass
class BaselineSensorRequest(BaseMessage):  # noqa: D101
    payload: payloads.BaselineSensorRequestPayload
    payload_type: Type[
        payloads.BaselineSensorRequestPayload
    ] = payloads.BaselineSensorRequestPayload
    message_id: Literal[
        MessageId.baseline_sensor_request
    ] = MessageId.baseline_sensor_request


@dataclass
class BaselineSensorResponse(BaseMessage):  # noqa: D101
    payload: payloads.BaselineSensorResponsePayload
    payload_type: Type[
        payloads.BaselineSensorResponsePayload
    ] = payloads.BaselineSensorResponsePayload
    message_id: Literal[
        MessageId.baseline_sensor_response
    ] = MessageId.baseline_sensor_response


@dataclass
class ReadFromSensorResponse(BaseMessage):  # noqa: D101
    payload: payloads.ReadFromSensorResponsePayload
    payload_type: Type[
        payloads.ReadFromSensorResponsePayload
    ] = payloads.ReadFromSensorResponsePayload
    message_id: Literal[MessageId.read_sensor_response] = MessageId.read_sensor_response


@dataclass
class BatchReadFromSensorResponse(BaseMessage):  # noqa: D101
    payload: payloads.BatchReadFromSensorResponsePayload
    payload_type: Type[
        payloads.BatchReadFromSensorResponsePayload
    ] = payloads.BatchReadFromSensorResponsePayload
    message_id: Literal[
        MessageId.batch_read_sensor_response
    ] = MessageId.batch_read_sensor_response


@dataclass
class SetSensorThresholdRequest(BaseMessage):  # noqa: D101
    payload: payloads.SetSensorThresholdRequestPayload
    payload_type: Type[
        payloads.SetSensorThresholdRequestPayload
    ] = payloads.SetSensorThresholdRequestPayload
    message_id: Literal[
        MessageId.set_sensor_threshold_request
    ] = MessageId.set_sensor_threshold_request


@dataclass
class SensorThresholdResponse(BaseMessage):  # noqa: D101
    payload: payloads.SensorThresholdResponsePayload
    payload_type: Type[
        payloads.SensorThresholdResponsePayload
    ] = payloads.SensorThresholdResponsePayload
    message_id: Literal[
        MessageId.set_sensor_threshold_response
    ] = MessageId.set_sensor_threshold_response


@dataclass
class SensorDiagnosticRequest(BaseMessage):  # noqa: D101
    payload: payloads.SensorDiagnosticRequestPayload
    payload_type: Type[
        payloads.SensorDiagnosticRequestPayload
    ] = payloads.SensorDiagnosticRequestPayload
    message_id: Literal[
        MessageId.sensor_diagnostic_request
    ] = MessageId.sensor_diagnostic_request


@dataclass
class SensorDiagnosticResponse(BaseMessage):  # noqa: D101
    payload: payloads.SensorDiagnosticResponsePayload
    payload_type: Type[
        payloads.SensorDiagnosticResponsePayload
    ] = payloads.SensorDiagnosticResponsePayload
    message_id: Literal[
        MessageId.sensor_diagnostic_response
    ] = MessageId.sensor_diagnostic_response


@dataclass
class PipetteInfoResponse(BaseMessage):  # noqa: D101
    payload: payloads.PipetteInfoResponsePayload
    payload_type: Type[
        payloads.PipetteInfoResponsePayload
    ] = payloads.PipetteInfoResponsePayload
    message_id: Literal[
        MessageId.pipette_info_response
    ] = MessageId.pipette_info_response


@dataclass
class SetBrushedMotorVrefRequest(BaseMessage):  # noqa: D101
    payload: payloads.BrushedMotorVrefPayload
    payload_type: Type[
        payloads.BrushedMotorVrefPayload
    ] = payloads.BrushedMotorVrefPayload
    message_id: Literal[
        MessageId.set_brushed_motor_vref_request
    ] = MessageId.set_brushed_motor_vref_request


@dataclass
class SetBrushedMotorPwmRequest(BaseMessage):  # noqa: D101
    payload: payloads.BrushedMotorPwmPayload
    payload_type: Type[
        payloads.BrushedMotorPwmPayload
    ] = payloads.BrushedMotorPwmPayload
    message_id: Literal[
        MessageId.set_brushed_motor_pwm_request
    ] = MessageId.set_brushed_motor_pwm_request


@dataclass
class BrushedMotorConfRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.brushed_motor_conf_request
    ] = MessageId.brushed_motor_conf_request


@dataclass
class BrushedMotorConfResponse(BaseMessage):  # noqa: D101
    payload: payloads.BrushedMotorConfPayload
    payload_type: Type[
        payloads.BrushedMotorConfPayload
    ] = payloads.BrushedMotorConfPayload
    message_id: Literal[
        MessageId.brushed_motor_conf_response
    ] = MessageId.brushed_motor_conf_response


@dataclass
class GripperJawStateRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.gripper_jaw_state_request
    ] = MessageId.gripper_jaw_state_request


@dataclass
class GripperJawStateResponse(BaseMessage):  # noqa: D101
    payload: payloads.GripperJawStatePayload
    payload_type: Type[
        payloads.GripperJawStatePayload
    ] = payloads.GripperJawStatePayload
    message_id: Literal[
        MessageId.gripper_jaw_state_response
    ] = MessageId.gripper_jaw_state_response


@dataclass
class SetGripperJawHoldoffRequest(BaseMessage):  # noqa: D101
    payload: payloads.GripperJawHoldoffPayload
    payload_type: Type[
        payloads.GripperJawHoldoffPayload
    ] = payloads.GripperJawHoldoffPayload
    message_id: Literal[
        MessageId.set_gripper_jaw_holdoff_request
    ] = MessageId.set_gripper_jaw_holdoff_request


@dataclass
class GripperJawHoldoffResponse(BaseMessage):  # noqa: D101
    payload: payloads.GripperJawHoldoffPayload
    payload_type: Type[
        payloads.GripperJawHoldoffPayload
    ] = payloads.GripperJawHoldoffPayload
    message_id: Literal[
        MessageId.gripper_jaw_holdoff_response
    ] = MessageId.gripper_jaw_holdoff_response


@dataclass
class GripperJawHoldoffRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.gripper_jaw_holdoff_request
    ] = MessageId.gripper_jaw_holdoff_request


@dataclass
class GripperGripRequest(BaseMessage):  # noqa: D101
    payload: payloads.GripperMoveRequestPayload
    payload_type: Type[
        payloads.GripperMoveRequestPayload
    ] = payloads.GripperMoveRequestPayload
    message_id: Literal[MessageId.gripper_grip_request] = MessageId.gripper_grip_request


@dataclass
class GripperHomeRequest(BaseMessage):  # noqa: D101
    payload: payloads.GripperMoveRequestPayload
    payload_type: Type[
        payloads.GripperMoveRequestPayload
    ] = payloads.GripperMoveRequestPayload
    message_id: Literal[MessageId.gripper_home_request] = MessageId.gripper_home_request


@dataclass
class AddBrushedLinearMoveRequest(BaseMessage):  # noqa: D101
    payload: payloads.GripperMoveRequestPayload
    payload_type: Type[
        payloads.GripperMoveRequestPayload
    ] = payloads.GripperMoveRequestPayload
    message_id: Literal[
        MessageId.add_brushed_linear_move_request
    ] = MessageId.add_brushed_linear_move_request


@dataclass
class BindSensorOutputRequest(BaseMessage):  # noqa: D101
    payload: payloads.BindSensorOutputRequestPayload
    payload_type: Type[
        payloads.BindSensorOutputRequestPayload
    ] = payloads.BindSensorOutputRequestPayload
    message_id: Literal[
        MessageId.bind_sensor_output_request
    ] = MessageId.bind_sensor_output_request


@dataclass
class BindSensorOutputResponse(BaseMessage):  # noqa: D101
    payload: payloads.BindSensorOutputResponsePayload
    payload_type: Type[
        payloads.BindSensorOutputResponsePayload
    ] = payloads.BindSensorOutputResponsePayload
    message_id: Literal[
        MessageId.bind_sensor_output_response
    ] = MessageId.bind_sensor_output_response


@dataclass
class GripperInfoResponse(BaseMessage):  # noqa: D101
    payload: payloads.GripperInfoResponsePayload
    payload_type: Type[
        payloads.GripperInfoResponsePayload
    ] = payloads.GripperInfoResponsePayload
    message_id: Literal[
        MessageId.gripper_info_response
    ] = MessageId.gripper_info_response


@dataclass
class GearEnableMotorRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.gear_enable_motor_request
    ] = MessageId.gear_enable_motor_request


@dataclass
class GearDisableMotorRequest(EmptyPayloadMessage):  # noqa: D101
    message_id: Literal[
        MessageId.gear_disable_motor_request
    ] = MessageId.gear_disable_motor_request


@dataclass
class TipActionRequest(BaseMessage):  # noqa: D101
    payload: payloads.TipActionRequestPayload
    payload_type: Type[
        payloads.TipActionRequestPayload
    ] = payloads.TipActionRequestPayload
    message_id: Literal[
        MessageId.do_self_contained_tip_action_request
    ] = MessageId.do_self_contained_tip_action_request


@dataclass
class TipActionResponse(BaseMessage):  # noqa: D101
    payload: payloads.TipActionResponsePayload
    payload_type: Type[
        payloads.TipActionResponsePayload
    ] = payloads.TipActionResponsePayload
    message_id: Literal[
        MessageId.do_self_contained_tip_action_response
    ] = MessageId.do_self_contained_tip_action_response


@dataclass
class GearWriteMotorDriverRegisterRequest(BaseMessage):  # noqa: D101
    payload: payloads.MotorDriverRegisterDataPayload
    payload_type: Type[
        payloads.MotorDriverRegisterPayload
    ] = payloads.MotorDriverRegisterDataPayload
    message_id: Literal[
        MessageId.gear_write_motor_driver_request
    ] = MessageId.gear_write_motor_driver_request


@dataclass
class GearReadMotorDriverRegisterRequest(BaseMessage):  # noqa: D101
    payload: payloads.MotorDriverRegisterPayload
    payload_type: Type[
        payloads.MotorDriverRegisterPayload
    ] = payloads.MotorDriverRegisterPayload
    message_id: Literal[
        MessageId.gear_read_motor_driver_request
    ] = MessageId.gear_read_motor_driver_request


@dataclass
class GearWriteMotorCurrentRequest(BaseMessage):  # noqa: D101
    payload: payloads.MotorCurrentPayload
    payload_type: Type[payloads.MotorCurrentPayload] = payloads.MotorCurrentPayload
    message_id: Literal[
        MessageId.gear_set_current_request
    ] = MessageId.gear_set_current_request


@dataclass
class PeripheralStatusRequest(BaseMessage):  # noqa: D101
    payload: payloads.SensorPayload
    payload_type: Type[payloads.SensorPayload] = payloads.SensorPayload
    message_id: Literal[
        MessageId.peripheral_status_request
    ] = MessageId.peripheral_status_request


@dataclass
class PeripheralStatusResponse(BaseMessage):  # noqa: D101
    payload: payloads.PeripheralStatusResponsePayload
    payload_type: Type[
        payloads.PeripheralStatusResponsePayload
    ] = payloads.PeripheralStatusResponsePayload
    message_id: Literal[
        MessageId.peripheral_status_response
    ] = MessageId.peripheral_status_response


@dataclass
class SetSerialNumber(BaseMessage):  # noqa: D101
    payload: payloads.SerialNumberPayload
    payload_type: Type[payloads.SerialNumberPayload] = payloads.SerialNumberPayload
    message_id: Literal[MessageId.set_serial_number] = MessageId.set_serial_number


@dataclass
class InstrumentInfoRequest(EmptyPayloadMessage):
    """Prompt pipettes and grippers to respond.

    Pipette should respond with PipetteInfoResponse.
    Gripper should respond with GripperInfoResponse.
    """

    message_id: Literal[
        MessageId.instrument_info_request
    ] = MessageId.instrument_info_request


@dataclass
class SetGripperErrorTolerance(BaseMessage):  # noqa: D101
    payload: payloads.GripperErrorTolerancePayload
    payload_type: Type[
        payloads.GripperErrorTolerancePayload
    ] = payloads.GripperErrorTolerancePayload
    message_id: Literal[
        MessageId.set_gripper_error_tolerance
    ] = MessageId.set_gripper_error_tolerance


@dataclass
class TipStatusQueryRequest(EmptyPayloadMessage):
    """Request to query the tip presence pin.

    The response should be a PushTipPresenceNotification.
    """

    message_id: Literal[
        MessageId.get_tip_status_request
    ] = MessageId.get_tip_status_request


@dataclass
class PushTipPresenceNotification(BaseMessage):
    """Hardware triggered notification of ejector flag status.

    The response should be a boolean of the ejector flag
    either being occluded or not.
    """

    payload: payloads.PushTipPresenceNotificationPayload
    payload_type: Type[
        payloads.PushTipPresenceNotificationPayload
    ] = payloads.PushTipPresenceNotificationPayload
    message_id: Literal[
        MessageId.tip_presence_notification
    ] = MessageId.tip_presence_notification


@dataclass
class GetMotorUsageRequest(EmptyPayloadMessage):
    """Prompt a motor to send it's total lifetime usage."""

    message_id: Literal[
        MessageId.get_motor_usage_request
    ] = MessageId.get_motor_usage_request


@dataclass
class GetMotorUsageResponse(BaseMessage):
    """Motor response with total lifetime usage."""

    payload: payloads.GetMotorUsageResponsePayload
    payload_type: Type[
        payloads.GetMotorUsageResponsePayload
    ] = payloads.GetMotorUsageResponsePayload
    message_id: Literal[
        MessageId.get_motor_usage_response
    ] = MessageId.get_motor_usage_response


@dataclass
class HepaUVInfoResponse(BaseMessage):  # noqa: D101
    payload: payloads.HepaUVInfoResponsePayload
    payload_type: Type[
        payloads.HepaUVInfoResponsePayload
    ] = payloads.HepaUVInfoResponsePayload
    message_id: Literal[MessageId.hepauv_info_response] = MessageId.hepauv_info_response


@dataclass
class SetHepaFanStateRequest(BaseMessage):
    """Request to set the state and duty cycle of the hepa fan."""

    payload: payloads.SetHepaFanStateRequestPayload
    payload_type: Type[
        payloads.SetHepaFanStateRequestPayload
    ] = payloads.SetHepaFanStateRequestPayload
    message_id: Literal[
        MessageId.set_hepa_fan_state_request
    ] = MessageId.set_hepa_fan_state_request


@dataclass
class GetHepaFanStateRequest(EmptyPayloadMessage):
    """Request the Hepa/UV to send the state and duty cycle of the fan."""

    message_id: Literal[
        MessageId.get_hepa_fan_state_request
    ] = MessageId.get_hepa_fan_state_request


@dataclass
class GetHepaFanStateResponse(BaseMessage):
    """Hepa/UV response with the state and duty cycle of the fan."""

    payload: payloads.GetHepaFanStatePayloadResponse
    payload_type: Type[
        payloads.GetHepaFanStatePayloadResponse
    ] = payloads.GetHepaFanStatePayloadResponse
    message_id: Literal[
        MessageId.get_hepa_fan_state_response
    ] = MessageId.get_hepa_fan_state_response


@dataclass
class SetHepaUVStateRequest(BaseMessage):
    """Sets the state and timeout in seconds the UV light should stay on."""

    payload: payloads.SetHepaUVStateRequestPayload
    payload_type: Type[
        payloads.SetHepaUVStateRequestPayload
    ] = payloads.SetHepaUVStateRequestPayload
    message_id: Literal[
        MessageId.set_hepa_uv_state_request
    ] = MessageId.set_hepa_uv_state_request


@dataclass
class GetHepaUVStateRequest(EmptyPayloadMessage):
    """Request the Hepa/UV send the state and timeout in seconds for the UV light."""

    message_id: Literal[
        MessageId.get_hepa_uv_state_request
    ] = MessageId.get_hepa_uv_state_request


@dataclass
class GetHepaUVStateResponse(BaseMessage):
    """Response from the Hepa/UV state and timeout in seconds for the UV light."""

    payload: payloads.GetHepaUVStatePayloadResponse
    payload_type: Type[
        payloads.GetHepaUVStatePayloadResponse
    ] = payloads.GetHepaUVStatePayloadResponse
    message_id: Literal[
        MessageId.get_hepa_uv_state_response
    ] = MessageId.get_hepa_uv_state_response


@dataclass
class SendAccumulatedSensorDataRequest(BaseMessage):
    """Send all the saved sensor data."""

    payload: payloads.SendAccumulatedSensorDataPayload
    payload_type: Type[
        payloads.SendAccumulatedSensorDataPayload
    ] = payloads.SendAccumulatedSensorDataPayload
    message_id: Literal[
        MessageId.send_accumulated_sensor_data
    ] = MessageId.send_accumulated_sensor_data


@dataclass
class IncreaseEvoTipDispenseCountRequestRequest(EmptyPayloadMessage):
    """Send all the saved sensor data."""

    message_id: Literal[
        MessageId.increase_evo_disp_count_request
    ] = MessageId.increase_evo_disp_count_request
