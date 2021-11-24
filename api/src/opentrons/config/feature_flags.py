from opentrons.config import advanced_settings as advs


def short_fixed_trash() -> bool:
    return advs.get_setting_with_env_overload("shortFixedTrash")


def calibrate_to_bottom() -> bool:
    return advs.get_setting_with_env_overload("calibrateToBottom")


def dots_deck_type() -> bool:
    return advs.get_setting_with_env_overload("deckCalibrationDots")


def disable_home_on_boot() -> bool:
    return advs.get_setting_with_env_overload("disableHomeOnBoot")


def use_old_aspiration_functions() -> bool:
    return advs.get_setting_with_env_overload("useOldAspirationFunctions")


def enable_door_safety_switch() -> bool:
    return advs.get_setting_with_env_overload("enableDoorSafetySwitch")


def enable_http_protocol_sessions() -> bool:
    return advs.get_setting_with_env_overload("enableHttpProtocolSessions")


def disable_fast_protocol_upload() -> bool:
    return advs.get_setting_with_env_overload("disableFastProtocolUpload")
