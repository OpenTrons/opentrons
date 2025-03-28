"""Protocol Engine types for hardware passthrough."""

from enum import Enum


class MovementAxis(str, Enum):
    """Axis on which to issue a relative movement."""

    X = "x"
    Y = "y"
    Z = "z"


class MotorAxis(str, Enum):
    """Motor axis on which to issue a home command."""

    X = "x"
    Y = "y"
    LEFT_Z = "leftZ"
    RIGHT_Z = "rightZ"
    LEFT_PLUNGER = "leftPlunger"
    RIGHT_PLUNGER = "rightPlunger"
    EXTENSION_Z = "extensionZ"
    EXTENSION_JAW = "extensionJaw"
    AXIS_96_CHANNEL_CAM = "axis96ChannelCam"
