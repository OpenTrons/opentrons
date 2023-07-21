from opentrons.config import advanced_settings as advs


def short_fixed_trash() -> bool:
    return advs.get_setting_with_env_overload("shortFixedTrash")


def dots_deck_type() -> bool:
    return advs.get_setting_with_env_overload("deckCalibrationDots")


def disable_home_on_boot() -> bool:
    return advs.get_setting_with_env_overload("disableHomeOnBoot")


def use_old_aspiration_functions() -> bool:
    return advs.get_setting_with_env_overload("useOldAspirationFunctions")


def enable_door_safety_switch() -> bool:
    return advs.get_setting_with_env_overload("enableDoorSafetySwitch")


def disable_fast_protocol_upload() -> bool:
    return advs.get_setting_with_env_overload("disableFastProtocolUpload")


def enable_ot3_hardware_controller() -> bool:
    """Get whether to use the OT-3 hardware controller."""

    return advs.get_setting_with_env_overload("enableOT3HardwareController")


def rear_panel_integration() -> bool:
    """Whether to enable usb connected rear_panel for the OT-3."""

    return advs.get_setting_with_env_overload("rearPanelIntegration")


def stall_detection_enabled() -> bool:
    return not advs.get_setting_with_env_overload("disableStallDetection")


def overpressure_detection_enabled() -> bool:
    return not advs.get_setting_with_env_overload("disableOverpressureDetection")


def status_bar_enabled() -> bool:
    """Whether the status bar is enabled."""
    return not advs.get_setting_with_env_overload("disableStatusBar")


def require_estop() -> bool:
    """Whether the OT3 should allow gantry movements with no Estop plugged in."""
    return not advs.get_setting_with_env_overload("estopNotRequired")
