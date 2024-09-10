from ..liquid_class_settings import *

default = Liquid(
    submerge=Submerge(
        position=Position(
            offset=Point(
                x=0.0,
                y=0.0,
                z=2.0,
            ),
            ref=PositionRef.MENISCUS,
        ),
        speed=50.0,
        delay=0.0,
        lld=False,
    ),
    retract=Retract(
        position=Position(
            offset=Point(x=0.0, y=0.0, z=5.0),
            ref=PositionRef.MENISCUS,
        ),
        speed=50.0,
        delay=0.0,
        air_gap=0.1,
        blow_out=BlowOut(
            enabled=True,
            position=Position(
                offset=Point(
                    x=0.0,
                    y=0.0,
                    z=2.0,
                ),
                ref=PositionRef.MENISCUS,
            ),
            volume=20.0,
        ),
        touch_tip=TouchTip(
            enabled=False,
            position=Position(
                offset=Point(
                    x=0.0,
                    y=0.0,
                    z=-1.0,
                ),
                ref=PositionRef.WELL_TOP,
            ),
            speed=30.0,
            mm_to_edge=1.0,
        ),
    ),
    aspirate=Aspirate(
        order=[],
        position=Position(
            offset=Point(
                x=0.0,
                y=0.0,
                z=-1.5,
            ),
            ref=PositionRef.MENISCUS,
        ),
        flow_rate=30.0,
        delay=0.5,
        mix=Mix(
            enabled=False,
            count=0,
            volume=0.0,
        ),
        distribute=Distribute(
            enabled=False,
            conditioning_volume=0.0,
            disposal_volume=0.0,
        ),
    ),
    dispense=Dispense(
        order=[],
        position=Position(
            offset=Point(
                x=0.0,
                y=0.0,
                z=-1.5,
            ),
            ref=PositionRef.MENISCUS,
        ),
        flow_rate=30.0,
        delay=1.0,
        mix=Mix(
            enabled=False,
            count=0,
            volume=0.0,
        ),
        push_out=7.0,
    ),
)
