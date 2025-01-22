"""Defaults."""
from copy import deepcopy
from dataclasses import fields
from typing import Dict

from .definition import (
    LiquidClassSettings,
    AspirateSettings,
    DispenseSettings,
    interpolate,
)
from ..measurement import SupportedLiquid


_WATER = SupportedLiquid.WATER.name
_GLYCEROL_50 = SupportedLiquid.GLYCEROL.name_with_dilution(0.5)
_ETHANOL_80 = SupportedLiquid.ETHANOL.name_with_dilution(0.8)

_default_aspirate: Dict[str, AspirateSettings] = {
    _WATER: AspirateSettings(
        z_speed=50,
        flow_rate=None,
        air_gap=None,
        submerge_mm=-3.0,
        retract_mm=3.0,
        retract_delay=0.0,
        delay=1.0,
    ),
    _GLYCEROL_50: AspirateSettings(
        z_speed=4,
        flow_rate=None,
        air_gap=None,
        submerge_mm=-3.0,
        retract_mm=3.0,
        retract_delay=0.0,
        delay=2.0,
    ),
    _ETHANOL_80: AspirateSettings(
        z_speed=100,
        flow_rate=None,
        air_gap=None,
        submerge_mm=-3.0,
        retract_mm=3.0,
        retract_delay=0.0,
        delay=0.2,
    ),
}
_default_dispense: Dict[str, DispenseSettings] = {
    _WATER: DispenseSettings(
        z_speed=50,
        flow_rate=None,
        break_off_flow_acceleration=None,
        push_out=None,
        submerge_mm=3.0,
        retract_mm=3.0,
        retract_delay=0.0,
        delay=0.5,
        blow_out=False,
    ),
    _GLYCEROL_50: DispenseSettings(
        z_speed=4,
        flow_rate=None,
        break_off_flow_acceleration=None,
        push_out=None,
        submerge_mm=3.0,
        retract_mm=3.0,
        retract_delay=0.0,
        delay=1.0,
        blow_out=False,
    ),
    _ETHANOL_80: DispenseSettings(
        z_speed=100,
        flow_rate=None,
        break_off_flow_acceleration=None,
        push_out=None,
        submerge_mm=3.0,  # NOTE: P50S uses "0.0" b/c not fast enough for non-contact
        retract_mm=3.0,
        retract_delay=0.5,
        delay=0.2,  # NOTE: P50S uses "0.0"
        blow_out=False,
    ),
}

_default_accel_p50_ul_sec_sec = 1200
_default_accel_p1000_ul_sec_sec = 24000
_default_accel_96ch_ul_sec_sec = 16000

_defaults: Dict[
    int, Dict[int, Dict[int, Dict[float, Dict[str, LiquidClassSettings]]]]
] = {
    50: {  # T50
        50: {  # P50
            1: {  # 1CH
                1: {  # 1uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=35,
                            air_gap=0.1,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=57,
                            break_off_flow_acceleration=_default_accel_p50_ul_sec_sec,
                            push_out=11.7,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=7.0,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=1.0,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=25.0,
                            break_off_flow_acceleration=_default_accel_p50_ul_sec_sec,
                            push_out=11.7,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.5,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=7.0,
                            air_gap=5.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=30.0,
                            break_off_flow_acceleration=_default_accel_p50_ul_sec_sec,
                            push_out=0.5,
                            submerge_mm=0.0,  # NOTE: P50S cannot do non-contact w/ Ethanol
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.0,  # NOTE: reduce time for Ethanol to slide back up tip
                            blow_out=None,
                        ),
                    ),
                },
                10: {  # 10uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=23.5,
                            air_gap=0.1,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=57,
                            break_off_flow_acceleration=_default_accel_p50_ul_sec_sec,
                            push_out=7.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=10.0,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=1.0,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=25.0,
                            break_off_flow_acceleration=_default_accel_p50_ul_sec_sec,
                            push_out=11.7,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.5,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=10.0,
                            air_gap=5.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=30.0,
                            break_off_flow_acceleration=_default_accel_p50_ul_sec_sec,
                            push_out=1.0,
                            submerge_mm=0.0,  # NOTE: P50S cannot do non-contact w/ Ethanol
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.0,  # NOTE: reduce time for Ethanol to slide back up tip
                            blow_out=None,
                        ),
                    ),
                },
                50: {  # 50uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=35,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=57,
                            break_off_flow_acceleration=_default_accel_p50_ul_sec_sec,
                            push_out=3.9,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=50.0,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=1.0,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=25.0,
                            break_off_flow_acceleration=_default_accel_p50_ul_sec_sec,
                            push_out=3.9,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.5,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=30.0,
                            air_gap=5.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=30.0,
                            break_off_flow_acceleration=_default_accel_p50_ul_sec_sec,
                            push_out=0.5,
                            submerge_mm=0.0,  # NOTE: P50S cannot do non-contact w/ Ethanol
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.0,  # NOTE: reduce time for Ethanol to slide back up tip
                            blow_out=None,
                        ),
                    ),
                },
            },
        },
        1000: {  # P1000
            1: {  # 1CH
                5: {  # 5uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=318,
                            air_gap=0.1,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=318,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=7.0,
                            air_gap=0.0,  # ~3.1uL and it "slides" up during retract
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=2.0,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=50.0,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=12,  # 8uL is minimum (and best performer?)
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=1.0,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=7.0,
                            air_gap=5.0,  # ~3.1uL and it "slides" up during retract
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=125,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=10,  # 8uL is minimum (and best performer?)
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                },
                10: {  # 10uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=478,
                            air_gap=0.1,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=478,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=10.0,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=2.0,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=50,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=12,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=1.0,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=10.0,
                            air_gap=5.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=125,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=5,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                },
                50: {  # 50uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=478,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=478,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=40,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=2.0,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=50,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=12.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=1.0,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=30,
                            air_gap=5.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=125,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=5.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                },
            },
        },
    },
    200: {  # T200
        1000: {  # P1000
            1: {  # 1CH
                5: {  # 5uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=716,
                            air_gap=5,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=716,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,  # NOTE: production (contact) is 5uL
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=10,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=1.0,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=50,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.5,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=7.0,
                            air_gap=10,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=125.0,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=8.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                },
                50: {  # 50uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=716,
                            air_gap=3.5,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=716,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,  # NOTE: production (contact) is 5uL
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=50,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=1.0,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=50,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.5,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=50.0,
                            air_gap=10,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=125.0,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=4.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                },
                200: {  # 200uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=716,
                            air_gap=0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=716,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,  # NOTE: production (contact) uses 5uL
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=200,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=1.0,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=50,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.5,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=200.0,
                            air_gap=10,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=125.0,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=4.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                },
            },
        },
    },
    1000: {  # T1000
        1000: {  # P1000
            1: {  # 1CH
                10: {  # 10uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=160,
                            air_gap=10,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=160,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=10,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.7,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=250,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=35,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.5,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=7,
                            air_gap=12,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=250,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=6,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                },
                100: {  # 100uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=716,
                            air_gap=10,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=716,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=100,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.7,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=250,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=35,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.5,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=100,
                            air_gap=12,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=250,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=3,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                },
                1000: {  # 1000uL
                    _WATER: LiquidClassSettings(  # water
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=716,
                            air_gap=0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=716,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=20,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                    _GLYCEROL_50: LiquidClassSettings(  # glycerol-50
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=800,
                            air_gap=0.0,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.7,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=250,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=35,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=0.5,
                            blow_out=None,
                        ),
                    ),
                    _ETHANOL_80: LiquidClassSettings(  # ethanol-70
                        aspirate=AspirateSettings(
                            z_speed=None,
                            flow_rate=200,
                            air_gap=12,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                        ),
                        dispense=DispenseSettings(
                            z_speed=None,
                            flow_rate=250,
                            break_off_flow_acceleration=_default_accel_p1000_ul_sec_sec,
                            push_out=3,
                            submerge_mm=None,
                            retract_mm=None,
                            retract_delay=None,
                            delay=None,
                            blow_out=None,
                        ),
                    ),
                },
            },
        },
    },
}

def get_default(liquid: str, dilution: float) -> LiquidClassSettings:
    """Get default."""
    cls_name = SupportedLiquid.from_string(liquid).name_with_dilution(dilution)
    return LiquidClassSettings(
        aspirate=deepcopy(_default_aspirate[cls_name]),
        dispense=deepcopy(_default_dispense[cls_name]),
    )


def get_liquid_class(
    liquid: str, dilution: float, pipette: int, channels: int, tip: int, volume: float
) -> LiquidClassSettings:
    """Get liquid class."""
    cls_name = SupportedLiquid.from_string(liquid).name_with_dilution(dilution)
    _cls_per_volume = _defaults[tip][pipette][channels]
    defined_volumes = list(_cls_per_volume.keys())
    defined_volumes.sort()

    def _build_liquid_class(vol: float) -> LiquidClassSettings:
        _cls = deepcopy(_cls_per_volume[vol][cls_name])
        for f in fields(_cls.aspirate):
            if getattr(_cls.aspirate, f.name) is None:
                setattr(
                    _cls.aspirate, f.name, getattr(_default_aspirate[cls_name], f.name)
                )
        for f in fields(_cls.dispense):
            if getattr(_cls.dispense, f.name) is None:
                setattr(
                    _cls.dispense, f.name, getattr(_default_dispense[cls_name], f.name)
                )
        return _cls

    def _get_interp_liq_class(lower_ul: float, upper_ul: float) -> LiquidClassSettings:
        factor = (volume - lower_ul) / (upper_ul - lower_ul)
        lower_cls = _build_liquid_class(lower_ul)
        upper_cls = _build_liquid_class(upper_ul)
        return interpolate(lower_cls, upper_cls, factor)

    # check if volume is below/above defined range
    if volume <= defined_volumes[0]:
        return _build_liquid_class(defined_volumes[0])
    if volume >= defined_volumes[-1]:
        return _build_liquid_class(defined_volumes[-1])

    # check if volume exactly equals one of the defined volumes
    for def_vol in defined_volumes:
        if volume == def_vol:
            return _build_liquid_class(volume)

    # interpolate between defined volumes below/above the volume
    for i in range(len(defined_volumes) - 1):
        vol_low = defined_volumes[i]
        vol_high = defined_volumes[i + 1]
        if vol_low < volume < vol_high:
            return _get_interp_liq_class(vol_low, vol_high)
    raise ValueError(f"unable to get class for volume: {volume}")


def set_liquid_class(
    new_settings: LiquidClassSettings,
    liquid: str,
    dilution: float,
    pipette: int,
    channels: int,
    tip: int,
    volume: float,
) -> None:
    """Set liquid class."""
    cls_name = SupportedLiquid.from_string(liquid).name_with_dilution(dilution)
    _cls_per_volume = _defaults[tip][pipette][channels]
    if volume not in _cls_per_volume:
        _cls_per_volume[volume] = {}
    _cls_per_volume[volume][cls_name] = new_settings
