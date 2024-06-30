from opentrons import protocol_api

# metadata
metadata = {
    "protocolName": "RTP Demo DNA Extration with 96-channel pipette",
    "author": "Anurag Kanase <anurag.kanase@opentrons.com>",
    "description": "DNA extraction Flex with 96-ch and Run Time Parameters",
}

# requirements
requirements = {"robotType": "Flex", "apiLevel": "2.18"}


def add_parameters(parameters):
    get_choices_plate = lambda: [{"display_name": str(i), "value": i} for i in range(1, 3)]
    get_choices_batd = lambda: [{"display_name": str(i), "value": i} for i in [True, False]]
    get_choices_mixes = lambda: [{"display_name": str(i), "value": i} for i in range(3, 6)]
    get_choices_bind = lambda: [{"display_name": str(i) + " seconds", "value": i} for i in range(10, 60, 10)]

    parameters.add_int(
        variable_name="plate_count",
        display_name="Plate count",
        description="Number of input plates per run (max. 2 plates)",
        default=2,
        choices=get_choices_plate(),
    )

    parameters.add_int(
        variable_name="mixes",
        display_name="Bead mixes",
        description="Number of mixes to resuspend the beads",
        default=3,
        choices=get_choices_mixes(),
    )

    parameters.add_int(
        variable_name="bind",
        display_name="Bead binding time (s)",
        description="Duration of sample plate placement on magnetic block",
        default=10,
        choices=get_choices_bind(),
    )

    parameters.add_bool(
        variable_name="batd",
        display_name="Special mix",
        description="Do you want to Aspirate beads at bottom and dispense at top of well?",
        default=True,
    )
    parameters.add_bool(
        variable_name="hs_mix",
        display_name="Mix with Heater Shaker",
        description="Use heater-shaker module for sample + bead mixing",
        default=True,
    )


# protocol run function
def run(protocol: protocol_api.ProtocolContext):

    plate_count = protocol.params.plate_count
    batd = protocol.params.batd
    mixes = protocol.params.mixes
    bind_time = protocol.params.bind
    hs_mixes = protocol.params.hs_mix

    # modules
    hs = protocol.load_module(module_name="heaterShakerModuleV1", location="B1")
    hs_adapt = hs.load_adapter("opentrons_96_deep_well_adapter")
    hs.close_labware_latch()

    def shake(time):
        hs.close_labware_latch()
        hs.set_and_wait_for_shake_speed(1000)
        protocol.delay(time)
        hs.deactivate_shaker()

    # labware

    # tip1000 = [protocol.load_labware('opentrons_flex_96_filtertiprack_1000ul',
    #                                  location=slot, adapter="opentrons_flex_96_tiprack_adapter") for slot in ["A1", "A2", "A3"]]
    tip1k = protocol.load_labware("opentrons_flex_96_filtertiprack_1000ul", location="A1", adapter="opentrons_flex_96_tiprack_adapter")
    tip200 = protocol.load_labware("opentrons_flex_96_filtertiprack_200ul", location="A2", adapter="opentrons_flex_96_tiprack_adapter")
    tip50 = protocol.load_labware("opentrons_flex_96_filtertiprack_50ul", location="A4")
    tip50_adapt = protocol.load_adapter("opentrons_flex_96_tiprack_adapter", location="A3")
    tip1000 = [tip1k, tip200, tip50]
    trash = protocol.load_trash_bin(location="D1")

    dwp = [
        protocol.load_labware("nest_96_wellplate_2ml_deep", location=slot, label=f"Sample Plate {no}")
        for slot, no in zip(["B2", "B3"][:plate_count], [1, 2][:plate_count])
    ]

    pcr = [
        protocol.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt", location=slot, label=f"Elution Plate {no}")
        for slot, no in zip(["C4", "D4"][:plate_count], [1, 2][:plate_count])
    ]

    wash = protocol.load_labware("nest_1_reservoir_195ml", location="C2", label=f"Wash Buffer")

    elution = protocol.load_labware("nest_1_reservoir_195ml", location="C3", label=f"Elution buffer")

    beads = protocol.load_labware("nest_12_reservoir_15ml", "C1", label="Binding buffer + Beads")

    magblock = protocol.load_module("magneticBlockV1", location="D3")
    # pipettes
    pip = protocol.load_instrument("flex_96channel_1000", mount="left")

    protocol.comment("-------- Resuspending Beads --------")
    src = beads["A1"]
    dest = beads["A1"]
    pip.pick_up_tip(tip1000[0]["A1"])
    for i in range(mixes):
        pip.aspirate(200, src.bottom(2))
        if batd:
            pip.dispense(200, dest.top())
        else:
            pip.dispense(200, dest.bottom(2))

    protocol.comment("------- Binding Bead Transfer ------")

    for dest in dwp:
        src = beads["A1"]
        pip.aspirate(100, src.bottom(2))
        pip.dispense(100, dest["A1"].top(-4))

    pip.return_tip()

    protocol.comment("------- Sample + Bead Binding ------")

    for i in range(plate_count):
        if hs_mixes:
            hs.open_labware_latch()
            protocol.move_labware(dwp[i], hs_adapt, use_gripper=True)
            protocol.comment(f"Bead binding on {dwp[i].name}")
            shake(10)
            hs.open_labware_latch()
            protocol.move_labware(dwp[i], magblock, use_gripper=True)
            hs.close_labware_latch()
        else:
            pip.pick_up_tip(tip1000[i]["A1"])
            for j in range(mixes):
                src = dwp[i]["A1"]
                dest = dwp[i]["A1"]
                pip.aspirate(1000, src.bottom(2))
                if batd:
                    pip.dispense(1000, dest.top())
                else:
                    pip.dispense(1000, dest.bottom(2))
            pip.return_tip()
            protocol.comment(f"Bead binding on {dwp[i].name}")
            protocol.move_labware(dwp[i], magblock, use_gripper=True)
        pip.pick_up_tip(tip1000[i]["A1"])
        protocol.delay(bind_time / 5)
        protocol.comment("----- Removing Supernatant -------")
        pip.aspirate(200, dwp[i]["A1"].bottom(2))
        pip.dispense(200, trash)
        pip.return_tip()
        if i == 0:
            protocol.move_labware(dwp[i], "B2", use_gripper=True)
        else:
            protocol.move_labware(dwp[i], "B3", use_gripper=True)

    protocol.comment("-------- Transferring Washbuffer --------")
    src = wash["A1"]
    pip.pick_up_tip(tip1000[0]["A1"])
    for dest in dwp:
        src = wash["A1"]
        pip.aspirate(100, src.bottom(2))
        pip.dispense(100, dest["A1"].top(-4))
    pip.return_tip()

    protocol.comment("------- Washing Beads ------")

    for i in range(plate_count):
        if hs_mixes:
            hs.open_labware_latch()
            protocol.move_labware(dwp[i], hs_adapt, use_gripper=True)
            protocol.comment(f"Bead binding on {dwp[i].name}")
            shake(10)
            hs.open_labware_latch()
            protocol.move_labware(dwp[i], magblock, use_gripper=True)
            hs.close_labware_latch()
        else:
            pip.pick_up_tip(tip1000[i]["A1"])
            for j in range(mixes):
                src = dwp[i]["A1"]
                dest = dwp[i]["A1"]
                pip.aspirate(200, src.bottom(2))
                if batd:
                    pip.dispense(200, dest.top())
                else:
                    pip.dispense(200, dest.bottom(2))
            pip.return_tip()
            protocol.comment(f"Bead washing on {dwp[i].name}")
            protocol.move_labware(dwp[i], magblock, use_gripper=True)
        pip.pick_up_tip(tip1000[i]["A1"])
        protocol.delay(bind_time / 5)
        protocol.comment("----- Removing Supernatant -------")
        pip.aspirate(200, dwp[i]["A1"].bottom(2))
        pip.dispense(200, trash)
        pip.return_tip()
        if i == 0:
            protocol.move_labware(dwp[i], "B2", use_gripper=True)
        else:
            protocol.move_labware(dwp[i], "B3", use_gripper=True)

    protocol.comment("-------- BEAD WASHING COMPLETE -------")

    protocol.comment("==========Preparing for ELUTION ============")
    protocol.move_labware(beads, "B4", use_gripper="True")
    protocol.move_labware(pcr[0], "C1", use_gripper="True")
    protocol.move_labware(wash, "C4", use_gripper="True")
    protocol.move_labware(pcr[1], "C2", use_gripper="True")
    protocol.move_labware(tip50, tip50_adapt, use_gripper="True")

    protocol.comment("-------- Transferring Elution Buffer --------")
    src = elution["A1"]
    pip.pick_up_tip(tip1000[2]["A1"])
    for dest in dwp:
        src = elution["A1"]
        pip.aspirate(50, src.bottom(2))
        pip.dispense(50, dest["A1"].top(-4))
    pip.return_tip()

    protocol.comment("------- Eluting NA ------")

    for i in range(plate_count):
        if hs_mixes:
            hs.open_labware_latch()
            protocol.move_labware(dwp[i], hs_adapt, use_gripper=True)
            protocol.comment(f"Bead binding on {dwp[i].name}")
            shake(10)
            hs.open_labware_latch()
            protocol.move_labware(dwp[i], magblock, use_gripper=True)
            hs.close_labware_latch()
        else:
            pip.pick_up_tip(tip1000[i]["A1"])
            for j in range(mixes):
                src = dwp[i]["A1"]
                dest = dwp[i]["A1"]
                pip.aspirate(100, src.bottom(2))
                if batd:
                    pip.dispense(100, dest.top())
                else:
                    pip.dispense(100, dest.bottom(2))
            pip.return_tip()
            protocol.comment(f"Eluting on {dwp[i].name}")
            protocol.move_labware(dwp[i], magblock, use_gripper=True)
        pip.pick_up_tip(tip1000[2]["A1"])
        protocol.delay(bind_time / 5)
        protocol.comment("----- Eluting 40 uL DNA -------")
        pip.aspirate(40, dwp[i]["A1"].bottom(2))
        pip.dispense(40, pcr[i]["A1"].bottom(2))
        pip.return_tip()
        if i == 0:
            protocol.move_labware(dwp[i], "B2", use_gripper=True)
        else:
            protocol.move_labware(dwp[i], "B3", use_gripper=True)

    protocol.comment("====== DNA Extraction Completed =========")

    def add_liquid(name, color, well, volume):
        liquid = protocol.define_liquid(name=name, description="generic", display_color=color)
        well.load_liquid(liquid=liquid, volume=volume)
        return liquid, well

    for dw in dwp:
        for well in dw.wells():
            add_liquid("Sample", "#E8C547", well, 200)

    for well in beads.wells():
        add_liquid("Beads", "#1F9D8A", well, 2000)

    add_liquid("Elution Buffer", "#B28FCE", elution["A1"], 20000)
    add_liquid("Wash Buffer", "#5D2E8C", wash["A1"], 20000)
