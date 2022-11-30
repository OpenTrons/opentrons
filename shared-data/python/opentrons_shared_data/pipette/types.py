from typing import cast
from enum import Enum
from dataclasses import dataclass

from . import constants


class UnsupportedNumberOfChannels(Exception):
    pass


class PipetteTipType(Enum):
    t50 = "t50"
    t200 = "t200"
    t1000 = "t1000"


class PipetteChannelType(Enum):
    SINGLE_CHANNEL = "single_channel"
    EIGHT_CHANNEL = "eight_channel"
    NINETY_SIX_CHANNEL = "ninety_six_channel"

    @classmethod
    def convert_from_channels(cls, channels: int) -> "PipetteChannelType":
        if channels == 96:
            return cls.NINETY_SIX_CHANNEL
        elif channels == 8:
            return cls.EIGHT_CHANNEL
        elif channels == 1:
            return cls.SINGLE_CHANNEL
        else:
            raise UnsupportedNumberOfChannels(
                f"A pipette with {channels} channels is not available at this time."
            )

    @property
    def as_int(self) -> int:
        if self.value == "ninety_six_channel":
            return 96
        elif self.value == "eight_channel":
            return 8
        elif self.value == "single_channel":
            return 1
        return 0


class PipetteModelType(Enum):
    P50 = "p50"
    P1000 = "p1000"

    @classmethod
    def convert_from_model(cls, model: str) -> "PipetteModelType":
        return cls[model.upper()]


@dataclass(frozen=True)
class PipetteVersionType:
    major: constants.PipetteModelMajorVersion
    minor: constants.PipetteModelMinorVersion

    @classmethod
    def convert_from_float(cls, version: float) -> "PipetteVersionType":
        major = cast(constants.PipetteModelMajorVersion, int(version // 1))
        minor = cast(
            constants.PipetteModelMinorVersion, int(round((version % 1), 2) * 10)
        )
        return cls(major=major, minor=minor)
