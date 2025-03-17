"""Error codes."""

from enum import Enum
from dataclasses import dataclass
import json
from typing import Tuple, Dict
from functools import lru_cache

from ..load import load_shared_data
from .categories import ErrorCategories

CODES: Dict[str, Dict[str, str]] = json.loads(
    load_shared_data("errors/definitions/1/errors.json")
)["codes"]


@dataclass(frozen=True)
class ErrorCode:
    """Individual error code data."""

    code: str
    detail: str
    category: ErrorCategories


def _code_from_dict_entry(entry_code: str) -> ErrorCode:
    return ErrorCode(
        code=entry_code,
        detail=CODES[entry_code]["detail"],
        category=ErrorCategories.by_category_name(CODES[entry_code]["category"]),
    )


class ErrorCodes(Enum):
    """All enumerated error codes."""

    COMMUNICATION_ERROR = _code_from_dict_entry("1000")
    CANBUS_COMMUNICATION_ERROR = _code_from_dict_entry("1001")
    INTERNAL_USB_COMMUNICATION_ERROR = _code_from_dict_entry("1002")
    MODULE_COMMUNICATION_ERROR = _code_from_dict_entry("1003")
    COMMAND_TIMED_OUT = _code_from_dict_entry("1004")
    FIRMWARE_UPDATE_FAILED = _code_from_dict_entry("1005")
    INTERNAL_MESSAGE_FORMAT_ERROR = _code_from_dict_entry("1006")
    CANBUS_CONFIGURATION_ERROR = _code_from_dict_entry("1007")
    CANBUS_BUS_ERROR = _code_from_dict_entry("1008")
    ROBOTICS_CONTROL_ERROR = _code_from_dict_entry("2000")
    MOTION_FAILED = _code_from_dict_entry("2001")
    HOMING_FAILED = _code_from_dict_entry("2002")
    STALL_OR_COLLISION_DETECTED = _code_from_dict_entry("2003")
    MOTION_PLANNING_FAILURE = _code_from_dict_entry("2004")
    POSITION_ESTIMATION_INVALID = _code_from_dict_entry("2005")
    MOVE_CONDITION_NOT_MET = _code_from_dict_entry("2006")
    CALIBRATION_STRUCTURE_NOT_FOUND = _code_from_dict_entry("2007")
    EDGE_NOT_FOUND = _code_from_dict_entry("2008")
    EARLY_CAPACITIVE_SENSE_TRIGGER = _code_from_dict_entry("2009")
    INACCURATE_NON_CONTACT_SWEEP = _code_from_dict_entry("2010")
    MISALIGNED_GANTRY = _code_from_dict_entry("2011")
    UNMATCHED_TIP_PRESENCE_STATES = _code_from_dict_entry("2012")
    POSITION_UNKNOWN = _code_from_dict_entry("2013")
    EXECUTION_CANCELLED = _code_from_dict_entry("2014")
    FAILED_GRIPPER_PICKUP_ERROR = _code_from_dict_entry("2015")
    MOTOR_DRIVER_ERROR = _code_from_dict_entry("2016")
    PIPETTE_LIQUID_NOT_FOUND = _code_from_dict_entry("2017")
    TIP_HIT_WELL_BOTTOM = _code_from_dict_entry("2018")
    FLEX_STACKER_STALL_OR_COLLISION_DETECTED = _code_from_dict_entry("2019")
    ROBOTICS_INTERACTION_ERROR = _code_from_dict_entry("3000")
    LABWARE_DROPPED = _code_from_dict_entry("3001")
    LABWARE_NOT_PICKED_UP = _code_from_dict_entry("3002")
    TIP_PICKUP_FAILED = _code_from_dict_entry("3003")
    TIP_DROP_FAILED = _code_from_dict_entry("3004")
    UNEXPECTED_TIP_REMOVAL = _code_from_dict_entry("3005")
    PIPETTE_OVERPRESSURE = _code_from_dict_entry("3006")
    E_STOP_ACTIVATED = _code_from_dict_entry("3008")
    E_STOP_NOT_PRESENT = _code_from_dict_entry("3009")
    PIPETTE_NOT_PRESENT = _code_from_dict_entry("3010")
    GRIPPER_NOT_PRESENT = _code_from_dict_entry("3011")
    UNEXPECTED_TIP_ATTACH = _code_from_dict_entry("3012")
    FIRMWARE_UPDATE_REQUIRED = _code_from_dict_entry("3013")
    INVALID_ACTUATOR = _code_from_dict_entry("3014")
    MODULE_NOT_PRESENT = _code_from_dict_entry("3015")
    INVALID_INSTRUMENT_DATA = _code_from_dict_entry("3016")
    INVALID_LIQUID_CLASS_NAME = _code_from_dict_entry("3017")
    TIP_DETECTOR_NOT_FOUND = _code_from_dict_entry("3018")
    HEPA_UV_FAILED = _code_from_dict_entry("3019")
    GENERAL_ERROR = _code_from_dict_entry("4000")
    ROBOT_IN_USE = _code_from_dict_entry("4001")
    API_REMOVED = _code_from_dict_entry("4002")
    NOT_SUPPORTED_ON_ROBOT_TYPE = _code_from_dict_entry("4003")
    COMMAND_PRECONDITION_VIOLATED = _code_from_dict_entry("4004")
    COMMAND_PARAMETER_LIMIT_VIOLATED = _code_from_dict_entry("4005")
    INVALID_PROTOCOL_DATA = _code_from_dict_entry("4006")
    API_MISCONFIGURATION = _code_from_dict_entry("4007")
    INVALID_STORED_DATA = _code_from_dict_entry("4008")
    MISSING_CONFIGURATION_DATA = _code_from_dict_entry("4009")
    RUNTIME_PARAMETER_VALUE_REQUIRED = _code_from_dict_entry("4010")
    INCORRECT_API_VERSION = _code_from_dict_entry("4011")

    @classmethod
    @lru_cache(25)
    def by_error_code(cls, error_code: str) -> "ErrorCodes":
        """Get an error by its code.

        Note: this is a linear search because it makes life easier and also this is rare in python.
        """
        for error in cls:
            if error.value.code == error_code:
                return error
        raise KeyError(error_code)

    @classmethod
    @lru_cache(len(ErrorCategories))
    def of_category(cls, category: ErrorCategories) -> Tuple["ErrorCodes", ...]:
        """Get all error codes by their category."""
        return tuple(
            error
            for error in cls
            if error.value.code.startswith(category.value.code_prefix)
        )
