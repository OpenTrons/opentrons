from opentrons import protocol_api

metadata = {
    "protocolName": "2.17 Dispense",
    "author": "Opentrons Engineering <engineering@opentrons.com>",
    "source": "Software Testing Team",
    "description": ("Description of the protocol that is longish \n has \n returns and \n emoji 😊 ⬆️ "),
}

requirements = {"robotType": "OT-2", "apiLevel": "2.17"}


def run(ctx: protocol_api.ProtocolContext) -> None:
    """This method is run by the protocol engine."""

    ctx.set_rail_lights(True)
    ctx.comment(f"Let there be light! {ctx.rail_lights_on} 🌠🌠🌠")
    ctx.comment(f"Is the door is closed? {ctx.door_closed} 🚪🚪🚪")
    ctx.comment(f"Is this a simulation? {ctx.is_simulating()} 🔮🔮🔮")
    ctx.comment(f"Running against API Version: {ctx.api_version}")

    # deck positions
    tips_300ul_position = "5"
    tips_20ul_position = "4"
    res_1_position = "3"
    res_2_position = "2"

    # Thermocycler has a default position that covers Slots 7, 8, 10, and 11.
    # This is the only valid location for the Thermocycler on the OT-2 deck.
    # This position is a default parameter when declaring the TC so you do not need to specify.

    # 300ul tips
    tips_300ul = [
        ctx.load_labware(
            load_name="opentrons_96_tiprack_300ul",
            location=tips_300ul_position,
            label="300ul tips",
        )
    ]

    # 20ul tips
    tips_20ul = [
        ctx.load_labware(
            load_name="opentrons_96_tiprack_20ul",
            location=tips_20ul_position,
            label="20ul tips",
        )
    ]

    # pipettesdye_source = dye_container.wells_by_name()["A2"]
    pipette_left = ctx.load_instrument(instrument_name="p300_multi_gen2", mount="left", tip_racks=tips_300ul)

    pipette_right = ctx.load_instrument(instrument_name="p20_single_gen2", mount="right", tip_racks=tips_20ul)

    res_1 = ctx.load_labware(
        load_name="nest_12_reservoir_15ml",
        location=res_1_position,
    )

    res_2 = ctx.load_labware(
        load_name="nest_12_reservoir_15ml",
        location=res_2_position,
    )

    pipette_right.pick_up_tip()
    pipette_right.aspirate(volume=20, location=res_1.wells_by_name()["A1"])

    pipette_right.dispense(volume=0.0, location=res_2.wells_by_name()["A1"])

    # everything less than or equal protocol api version 2.15 should dispense everything
    # in the pipette when you pass 0.0 as the volume. Since this is 2.16, the dispense should not change the volume
    assert pipette_right.current_volume == 20.0

    # In protocol api versions 2.16 and lower, if you pass a volume greater than the current volume, the dispense should clamp
    # to the current volume. In versions greater than 2.16, if you pass a volume greater than the current volume, an error should be thrown
    pipette_right.dispense(volume=21, location=res_2.wells_by_name()["A1"])
