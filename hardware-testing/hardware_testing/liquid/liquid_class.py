from dataclasses import dataclass
from typing import Optional

# NOTE: Nick Starno calculated the actual Pipette.blow_out() volumes:
ACTUAL_OT2_BLOW_OUT_VOLUME_P1000 = 123.6
ACTUAL_OT2_BLOW_OUT_VOLUME_P300 = 41.7
ACTUAL_OT2_BLOW_OUT_VOLUME_P20 = 2.39


@dataclass
class SampleConfig:
    acceleration: Optional[float]  # TODO: API update so acceleration is configurable
    flow_rate: float
    delay: float


@dataclass
class AirConfig:
    flow_rate: float
    volume: float


@dataclass
class MovementConfig:
    distance: Optional[float]
    speed: Optional[float]
    acceleration: Optional[float]  # TODO: API update so acceleration is configurable
    delay: Optional[float]


@dataclass
class LiquidClassSettings:
    aspirate: SampleConfig
    dispense: SampleConfig
    blow_out: AirConfig
    wet_air_gap: AirConfig
    dry_air_gap: AirConfig
    submerge: MovementConfig
    tracking: MovementConfig  # TODO: APi update to aspirate/dispense while also moving Z axis
    retract: MovementConfig
    traverse: MovementConfig


LIQUID_CLASS_DEFAULT = LiquidClassSettings(
    aspirate=SampleConfig(flow_rate=10, delay=0, acceleration=None),
    dispense=SampleConfig(flow_rate=10, delay=0, acceleration=None),
    blow_out=AirConfig(flow_rate=20, volume=ACTUAL_OT2_BLOW_OUT_VOLUME_P300),
    wet_air_gap=AirConfig(flow_rate=10, volume=0),
    dry_air_gap=AirConfig(flow_rate=20, volume=0),
    submerge=MovementConfig(distance=1.5, speed=5, delay=None, acceleration=None),
    tracking=MovementConfig(distance=0, speed=None, delay=None, acceleration=None),
    retract=MovementConfig(distance=3, speed=5, delay=None, acceleration=None),
    traverse=MovementConfig(distance=None, speed=200, delay=None, acceleration=None),
)

LIQUID_CLASS_OT2_P300_SINGLE = LiquidClassSettings(
    aspirate=SampleConfig(flow_rate=47, delay=1, acceleration=None),
    dispense=SampleConfig(flow_rate=47, delay=0, acceleration=None),
    blow_out=AirConfig(flow_rate=200, volume=ACTUAL_OT2_BLOW_OUT_VOLUME_P300),
    wet_air_gap=AirConfig(flow_rate=10, volume=4),
    dry_air_gap=AirConfig(flow_rate=47, volume=0),
    submerge=MovementConfig(distance=1.5, speed=5, delay=None, acceleration=None),
    tracking=MovementConfig(distance=0, speed=None, delay=None, acceleration=None),
    retract=MovementConfig(distance=3, speed=5, delay=None, acceleration=None),
    traverse=MovementConfig(distance=None, speed=50, delay=None, acceleration=None),
)
