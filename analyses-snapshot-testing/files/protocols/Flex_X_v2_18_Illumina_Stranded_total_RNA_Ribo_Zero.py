from opentrons import protocol_api

metadata = {
    "protocolName": "Illumina Stranded Total RNA Prep, Ligation with Ribo-Zero Plus",
    "author": "Dandra Howell <protocols@opentrons.com>",
    "source": "Protocol Library",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.18",
}


def add_parameters(parameters):
    parameters.add_int(
        display_name="Columns",
        variable_name="Columns",
        default=1,
        minimum=1,
        maximum=6,
        description="How many columns of the plate will be processed",
    )

    parameters.add_int(
        display_name="PCR Cycles",
        variable_name="PCR_Cycles",
        default=13,
        minimum=8,
        maximum=20,
        description="Number of amplification cycles",
    )

    parameters.add_bool(
        display_name="Dry Run", variable_name="DryRun", description="Dry runs will skip incubations on the thermocycler", default=False
    )

    parameters.add_bool(
        display_name="On Deck Thermocycler",
        variable_name="on_deck_thermo",
        description="Will you be using an Opentrons Thermocycler?",
        default=True,
    )

    parameters.add_int(
        display_name="Column on Index Anchor Plate",
        variable_name="Index_Anchor_start",
        description="Choose column on the RNA Index Anchor plate that you want to use first",
        default=1,
        minimum=1,
        maximum=12,
    )

    parameters.add_int(
        display_name="Column on Index Adapter Plate",
        variable_name="Index_Adapter_start",
        description="Choose column on the Index Adapter plate that you want to use first",
        default=1,
        minimum=1,
        maximum=12,
    )


# Deck Configuration
def run(ctx):
    # Parameters
    DryRun = ctx.params.DryRun
    Columns = ctx.params.Columns
    on_deck_thermo = ctx.params.on_deck_thermo
    PCR_Cycles = ctx.params.PCR_Cycles
    Index_Adapter_start = ctx.params.Index_Anchor_start
    Index_Anchor_start = ctx.params.Index_Adapter_start
    # Hardware and Consumables
    if Columns == 1:
        # Hardware and Consumables
        temp_block = ctx.load_module("temperature module gen2", "D1")
        temp_adapter = temp_block.load_adapter("opentrons_96_well_aluminum_block")
        reagent_plate = temp_adapter.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt")
        mag_block = ctx.load_module("magneticBlockV1", "A3")
        if on_deck_thermo == True:
            thermo = ctx.load_module("thermocycler module gen2")
        Reservior = ctx.load_labware("nest_96_wellplate_2ml_deep", "A2")
        Index_Anchors = ctx.load_labware("eppendorf_96_wellplate_150ul", "A4", "Index Anchors")  # Custom labware
        chute = ctx.load_waste_chute()
        Index_Plate = ctx.load_labware("eppendorf_96_wellplate_150ul", "B4", "Index Plate")  # Custom labware
        sample_1 = ctx.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt", "C1", "Sample_1")
        sample_2 = ctx.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt", "C4", "Sample_2")

        # Pipettes
        tip50_1 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "B3", "tip50_1")
        tip50_2 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "C3", "tip50_2")
        tip50_3 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "D2", "tip50_3")
        tip200_1 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", "B2", "tip200_1")
        tip200_2 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", "C2", "tip200_2")
        tip200_3 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", "D4", "tip200_3")

        p50 = ctx.load_instrument("flex_8channel_50", "right", tip_racks=[tip50_1, tip50_2, tip50_3])
        p200 = ctx.load_instrument("flex_8channel_1000", "left", tip_racks=[tip200_1, tip200_2, tip200_3])

        # Lists for Tip Tracking
        p50_on_deck_slots = ["B3", "C3"]
        p50_extension_tips = []
        p50_manual_tips = []
        p50_slots = ["B3", "C3", "A4", "B4"]
        p50_extension_slots = ["A4", "B4"]

        p200_on_deck_slots = ["B2", "C2"]
        p200_extension_tips = [tip200_3]
        p200_manual_tips = []
        p200_slots = ["B2", "C2", "D2", "C4", "D4"]
        p200_extension_slots = ["C4", "D4"]
    else:
        temp_block = ctx.load_module("temperature module gen2", "D1")
        temp_adapter = temp_block.load_adapter("opentrons_96_well_aluminum_block")
        reagent_plate = temp_adapter.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt")
        mag_block = ctx.load_module("magneticBlockV1", "A3")
        if on_deck_thermo == True:
            thermo = ctx.load_module("thermocycler module gen2")
        Reservior = ctx.load_labware("nest_96_wellplate_2ml_deep", "A2")
        Index_Anchors = ctx.load_labware("eppendorf_96_wellplate_150ul", protocol_api.OFF_DECK, "Index Anchors")  # Custom labware
        chute = ctx.load_waste_chute()
        Index_Plate = ctx.load_labware("eppendorf_96_wellplate_150ul", protocol_api.OFF_DECK, "Index Plate")  # Custom labware
        sample_1 = ctx.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt", "C1", "Sample_1")
        sample_2 = ctx.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt", protocol_api.OFF_DECK, "Sample_2")
        if Columns > 3:
            sample_3 = ctx.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt", protocol_api.OFF_DECK, "Sample_3")
            sample_3_as = sample_3.rows()[0][:12]
        # Pipettes
        tip50_1 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "B3", "tip50_1")
        tip50_2 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "C3", "tip50_2")
        tip50_3 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "A4", "tip50_3")
        tip50_4 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "B4", "tip50_4")
        tip50_5 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_5")
        if Columns >= 3:
            tip50_6 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_6")
            tip50_7 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_7")
        if Columns >= 4:
            tip50_8 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_8")
            tip50_9 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_9")
            tip50_10 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_10")
        if Columns >= 5:
            tip50_11 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_11")
            tip50_12 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_12")
        if Columns == 6:
            tip50_13 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_13")
            tip50_14 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", protocol_api.OFF_DECK, "tip50_14")
        tip200_1 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", "B2", "tip200_1")
        tip200_2 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", "C2", "tip200_2")
        tip200_3 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", "D2", "tip200_3")
        tip200_4 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", "C4", "tip200_4")
        tip200_5 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", "D4", "tip200_5")
        if Columns >= 3:
            tip200_6 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", protocol_api.OFF_DECK, "tip200_6")
            tip200_7 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", protocol_api.OFF_DECK, "tip200_7")
        if Columns >= 4:
            tip200_8 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", protocol_api.OFF_DECK, "tip200_8")
            tip200_9 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", protocol_api.OFF_DECK, "tip200_9")
        if Columns >= 5:
            tip200_10 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", protocol_api.OFF_DECK, "tip200_10")
            tip200_11 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", protocol_api.OFF_DECK, "tip200_11")
        if Columns == 6:
            tip200_12 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", protocol_api.OFF_DECK, "tip200_12")
            tip200_13 = ctx.load_labware("opentrons_flex_96_tiprack_200ul", protocol_api.OFF_DECK, "tip200_13")

        if Columns == 2:
            p50 = ctx.load_instrument("flex_8channel_50", "right", tip_racks=[tip50_1, tip50_2, tip50_3, tip50_4, tip50_5])
            p200 = ctx.load_instrument("flex_8channel_1000", "left", tip_racks=[tip200_1, tip200_2, tip200_3, tip200_4, tip200_5])

            # Lists for Tip Tracking
            p50_on_deck_slots = ["B3", "C3"]
            p50_extension_tips = [tip50_3, tip50_4]
            p50_manual_tips = [tip50_5]
            p50_slots = ["B3", "C3", "A4", "B4"]
            p50_extension_slots = ["A4", "B4"]

            p200_on_deck_slots = ["B2", "C2", "D2"]
            p200_extension_tips = [tip200_4, tip200_5]
            p200_manual_tips = []
            p200_slots = ["B2", "C2", "D2", "C4", "D4"]
            p200_extension_slots = ["C4", "D4"]

        if Columns == 3:
            p50 = ctx.load_instrument(
                "flex_8channel_50", "right", tip_racks=[tip50_1, tip50_2, tip50_3, tip50_4, tip50_5, tip50_6, tip50_7]
            )
            p200 = ctx.load_instrument(
                "flex_8channel_1000", "left", tip_racks=[tip200_1, tip200_2, tip200_3, tip200_4, tip200_5, tip200_6, tip200_7]
            )

            # Lists for Tip Tracking
            p50_on_deck_slots = ["B3", "C3"]
            p50_extension_tips = [tip50_3, tip50_4]
            p50_manual_tips = [tip50_5, tip50_6, tip50_7]
            p50_slots = ["B3", "C3", "A4", "B4"]
            p50_extension_slots = ["A4", "B4"]

            p200_on_deck_slots = ["B2", "C2", "D2"]
            p200_extension_tips = [tip200_4, tip200_5]
            p200_manual_tips = [tip200_6, tip200_7]
            p200_slots = ["B2", "C2", "D2", "C4", "D4"]
            p200_extension_slots = ["C4", "D4"]

        if Columns == 4:
            p50 = ctx.load_instrument(
                "flex_8channel_50",
                "right",
                tip_racks=[tip50_1, tip50_2, tip50_3, tip50_4, tip50_5, tip50_6, tip50_7, tip50_8, tip50_9, tip50_10],
            )
            p200 = ctx.load_instrument(
                "flex_8channel_1000",
                "left",
                tip_racks=[tip200_1, tip200_2, tip200_3, tip200_4, tip200_5, tip200_6, tip200_7, tip200_8, tip200_9],
            )

            # Lists for Tip Tracking
            p50_on_deck_slots = ["B3", "C3"]
            p50_extension_tips = [tip50_3, tip50_4]
            p50_manual_tips = [tip50_5, tip50_6, tip50_7, tip50_8, tip50_9, tip50_10]
            p50_slots = ["B3", "C3", "A4", "B4"]
            p50_extension_slots = ["A4", "B4"]

            p200_on_deck_slots = ["B2", "C2", "D2"]
            p200_extension_tips = [tip200_4, tip200_5]
            p200_manual_tips = [tip200_6, tip200_7, tip200_8, tip200_9]
            p200_slots = ["B2", "C2", "D2", "C4", "D4"]
            p200_extension_slots = ["C4", "D4"]

        if Columns == 5:
            p50 = ctx.load_instrument(
                "flex_8channel_50",
                "right",
                tip_racks=[tip50_1, tip50_2, tip50_3, tip50_4, tip50_5, tip50_6, tip50_7, tip50_8, tip50_9, tip50_10, tip50_11, tip50_12],
            )
            p200 = ctx.load_instrument(
                "flex_8channel_1000",
                "left",
                tip_racks=[tip200_1, tip200_2, tip200_3, tip200_4, tip200_5, tip200_6, tip200_7, tip200_8, tip200_9, tip200_10, tip200_11],
            )

            # Lists for Tip Tracking
            p50_on_deck_slots = ["B3", "C3"]
            p50_extension_tips = [tip50_3, tip50_4]
            p50_manual_tips = [tip50_5, tip50_6, tip50_7, tip50_8, tip50_9, tip50_10, tip50_11, tip50_12]
            p50_slots = ["B3", "C3", "A4", "B4"]
            p50_extension_slots = ["A4", "B4"]

            p200_on_deck_slots = ["B2", "C2", "D2"]
            p200_extension_tips = [tip200_4, tip200_5]
            p200_manual_tips = [tip200_6, tip200_7, tip200_8, tip200_9, tip200_10, tip200_11]
            p200_slots = ["B2", "C2", "D2", "C4", "D4"]
            p200_extension_slots = ["C4", "D4"]

        if Columns == 6:
            p50 = ctx.load_instrument(
                "flex_8channel_50",
                "right",
                tip_racks=[
                    tip50_1,
                    tip50_2,
                    tip50_3,
                    tip50_4,
                    tip50_5,
                    tip50_6,
                    tip50_7,
                    tip50_8,
                    tip50_9,
                    tip50_10,
                    tip50_11,
                    tip50_12,
                    tip50_13,
                    tip50_14,
                ],
            )
            p200 = ctx.load_instrument(
                "flex_8channel_1000",
                "left",
                tip_racks=[
                    tip200_1,
                    tip200_2,
                    tip200_3,
                    tip200_4,
                    tip200_5,
                    tip200_6,
                    tip200_7,
                    tip200_8,
                    tip200_9,
                    tip200_10,
                    tip200_11,
                    tip200_12,
                    tip200_13,
                ],
            )

            # Lists for Tip Tracking
            p50_on_deck_slots = ["B3", "C3"]
            p50_extension_tips = [tip50_3, tip50_4]
            p50_manual_tips = [tip50_5, tip50_6, tip50_7, tip50_8, tip50_9, tip50_10, tip50_11, tip50_12, tip50_13, tip50_14]
            p50_slots = ["B3", "C3", "A4", "B4"]
            p50_extension_slots = ["A4", "B4"]

            p200_on_deck_slots = ["B2", "C2", "D2"]
            p200_extension_tips = [tip200_4, tip200_5]
            p200_manual_tips = [tip200_6, tip200_7, tip200_8, tip200_9, tip200_10, tip200_11, tip200_12, tip200_13]
            p200_slots = ["B2", "C2", "D2", "C4", "D4"]
            p200_extension_slots = ["C4", "D4"]
    p50.flow_rate.aspirate = 10
    p50.flow_rate.blow_out = 3
    p200.flow_rate.blow_out = 40
    p50.default_speed = 500
    p200.default_speed = 500

    # Reagent Assignments
    # REAGENT PLATE
    HPMM = reagent_plate["A1"]
    RDMM = reagent_plate["A2"]
    PRMM = reagent_plate["A3"]
    EB = reagent_plate["A4"]
    EPH3 = reagent_plate["A5"]
    FSMM = reagent_plate["A6"]
    SMM = reagent_plate["A7"]
    ATL4 = reagent_plate["A8"]
    LIGX = reagent_plate["A9"]
    STL = reagent_plate["A10"]
    EPM = reagent_plate["A11"]

    # RESERVIOR
    RNA_BEADS = Reservior["A1"]
    AMP = Reservior["A2"]
    RSB = Reservior["A3"]
    ETOH = Reservior.rows()[0][3:12]

    # Plate Assignments
    sample_1_as = sample_1.rows()[0][:12]
    sample_2_as = sample_2.rows()[0][:12]
    Anchors = Index_Anchors.rows()[0][Index_Anchor_start - 1 : 12]
    Index_Adap = Index_Plate.rows()[0][Index_Adapter_start - 1 : 12]

    def move_gripper(labware, new_location):  # shortened version of move_labware function
        ctx.move_labware(
            labware,
            new_location,
            use_gripper=True,
        )

    def move_chute(labware):  # move labware to trash chute
        ctx.move_labware(labware, chute, use_gripper=True) if DryRun == False else ctx.move_labware(labware, chute, use_gripper=False)

    def move_offdeck(labware, new_location):  # manually move labware from off deck locations onto deck
        ctx.move_labware(
            labware,
            new_location,
            use_gripper=False,
        )

    def drop_tip(pipette):
        if DryRun == True:
            pipette.return_tip()
        else:
            pipette.drop_tip()

    def mix(mix, volume, reagent):
        p50.flow_rate.aspirate = 12
        p50.configure_for_volume(volume)
        for x in range(mix):
            p50.aspirate(volume, reagent.bottom(0.4))
            p50.dispense(volume, reagent.bottom(1), push_out=0)
        ctx.delay(seconds=5)
        p50.blow_out(reagent.top(-11))
        p50.flow_rate.aspirate = 10

    def cleanup_mix(mix, volume, reagent):
        for x in range(mix):
            p200.aspirate(volume, reagent.bottom(0.4))
            p200.dispense(volume, reagent.top(-10), push_out=0)
        ctx.delay(seconds=5)
        p200.blow_out(reagent.top(-7))

    def get_next_tip(pipette):
        if pipette == p50:
            try:
                p50.pick_up_tip()
            except:
                for x in p50.tip_racks[:]:
                    if x.wells()[-1].has_tip == False:  # if tip racks are empty move to chute and remove empty tip rack from list
                        move_chute(x)
                        p50.tip_racks.remove(x)
                try:  # move tip racks on extension slots to deck
                    for y, z in zip(p50_extension_tips, p50_on_deck_slots):
                        ctx.move_labware(y, z, use_gripper=True)
                    p50.pick_up_tip()
                    for b in range(len(p50_on_deck_slots)):
                        del p50_extension_tips[0]
                except:
                    # assumes all relevant deck slots are empty
                    for x, a in zip(p50_manual_tips, p50_slots):
                        ctx.move_labware(x, a, use_gripper=False)
                    p50.pick_up_tip()
                    for b in range(len(p50_slots)):
                        try:
                            del p50_manual_tips[0]
                        except:
                            pass
                    for c in p50_extension_slots:  # only add tipracks on extension slot to extension tip list
                        try:
                            p50_extension_tips.append(ctx.deck[c])
                        except:
                            pass
        if pipette == p200:
            try:
                p200.pick_up_tip()
            except:
                for x in p200.tip_racks[:]:
                    if x.wells()[-1].has_tip == False:  # if tip racks are empty move to chute and remove empty tip rack from list
                        move_chute(x)
                        p200.tip_racks.remove(x)
                try:  # move tip racks on extension slots to deck
                    for y, z in zip(p200_extension_tips, p200_on_deck_slots):
                        ctx.move_labware(y, z, use_gripper=True)
                    p200.pick_up_tip()
                    for b in range(2):
                        try:
                            del p200_extension_tips[0]
                        except:
                            pass
                except:
                    # assumes all relevant deck slots are empty
                    for x, a in zip(p200_manual_tips, p200_slots):
                        ctx.move_labware(x, a, use_gripper=False)
                    p200.pick_up_tip()
                    for b in range(len(p200_slots)):
                        try:
                            del p200_manual_tips[0]
                        except:
                            pass
                    for c in p200_extension_slots:  # only add tipracks on extension slot to extension tip list
                        p200_extension_tips.append(ctx.deck[c])

    ctx.comment(f"{p200.default_speed}")
    # Commands
    #                                       HYBRIDIZE PROBES
    ################################################################################################
    temp_block.set_temperature(4)
    if DryRun == False:
        if on_deck_thermo == True:
            thermo.set_lid_temperature(100)
            thermo.set_block_temperature(95)
    ctx.comment("---------HYBRIDIZE PROBES---------")
    get_next_tip(p50)
    if Columns > 1:
        mix(8, 3 * Columns, HPMM)
    p50.aspirate(4, HPMM.bottom(z=0.4))
    p50.dispense(4, sample_1_as[0], push_out=0)
    p50.blow_out(sample_1_as[0].top(-10))
    mix(10, 10, sample_1_as[0])
    drop_tip(p50)
    for x in range(Columns - 1):  # Looping through remaing columns with new tips
        get_next_tip(p50)
        p50.aspirate(4, HPMM.bottom(z=0.5))
        p50.dispense(4, sample_1_as[x + 1].bottom(z=0.5), push_out=0)
        p50.blow_out(sample_1_as[x + 1].top(-10))
        mix(10, 10, sample_1_as[x + 1])
        drop_tip(p50)
    if on_deck_thermo == True:
        thermo.open_lid()
        move_gripper(sample_1, thermo)
        thermo.close_lid()
        if DryRun == False:
            profile_HYB_DP1 = [{"temperature": 95, "hold_time_minutes": 2}]
            thermo.execute_profile(steps=profile_HYB_DP1, repetitions=1, block_max_volume=15)
            start_temp = 95
            temp = start_temp
            while temp > 37:  # Setting .1C/s ramp rate
                thermo.set_block_temperature(temp)
                temp -= 2.4
            thermo.set_block_temperature(37)
            thermo.open_lid()
            thermo.set_block_temperature(20)
    else:
        ctx.pause("Transfer plate to thermocycler and begin HYB-DP1 program")
        move_offdeck(sample_1, protocol_api.OFF_DECK)
        ctx.pause("Quick spin plate, remove seal and place on slot C1")
        move_offdeck(sample_1, "C1")

    #                                             DEPLETE rRNA
    ####################################################################################################
    ctx.comment("---------DEPLETE rRNA---------")
    get_next_tip(p50)
    if Columns > 1:
        mix(8, 3 * Columns, RDMM)
    p50.aspirate(5, RDMM.bottom(z=0.5))
    p50.dispense(5, sample_1_as[0], push_out=0)
    p50.blow_out(sample_1_as[0].top(-10))
    mix(10, 15, sample_1_as[0])
    drop_tip(p50)
    for x in range(Columns - 1):  # Looping through remaing coluns with new tips
        get_next_tip(p50)
        p50.aspirate(5, RDMM)
        p50.dispense(5, sample_1_as[x + 1], push_out=0)
        ctx.delay(seconds=3)
        p50.blow_out(sample_1_as[x + 1].top(-10))
        mix(10, 15, sample_1_as[x + 1])
        drop_tip(p50)
    if on_deck_thermo == True:
        thermo.close_lid()
        if DryRun == False:
            profile_RNA_DEP = [{"temperature": 37, "hold_time_minutes": 15}]
            thermo.execute_profile(steps=profile_RNA_DEP, repetitions=1, block_max_volume=20)
            thermo.set_block_temperature(4)
        thermo.open_lid()
    else:
        ctx.pause("Transfer plate to thermocycler and begin RNA_DEP program")
        move_offdeck(sample_1, protocol_api.OFF_DECK)
        ctx.pause("Quick spin plate, remove seal and place on slot C1")
        move_offdeck(sample_1, "C1")

    #                                           REMOVE PROBES
    #####################################################################################################
    ctx.comment("---------REMOVE PROBES---------")
    get_next_tip(p50)
    mix(10, 8 * Columns, PRMM)
    p50.aspirate(10, PRMM.bottom(z=0.5))
    p50.dispense(10, sample_1_as[0], push_out=0)
    ctx.delay(seconds=3)
    p50.blow_out(sample_1_as[0].top(-10))
    mix(8, 20, sample_1_as[0])
    drop_tip(p50)
    for x in range(Columns - 1):  # Looping through remaing coluns with new tips
        get_next_tip(p50)
        p50.aspirate(10, PRMM.bottom(z=0.5))
        p50.dispense(10, sample_1_as[x + 1], push_out=0)
        ctx.delay(seconds=3)
        p50.blow_out(sample_1_as[x + 1].top(-10))
        mix(10, 20, sample_1_as[x + 1])
        drop_tip(p50)
    if on_deck_thermo == True:
        thermo.close_lid()
        if DryRun == False:
            profile_PRB_REM = [{"temperature": 37, "hold_time_minutes": 15}, {"temperature": 70, "hold_time_minutes": 15}]
            thermo.execute_profile(steps=profile_PRB_REM, repetitions=1, block_max_volume=30)
            thermo.set_block_temperature(4)
        thermo.open_lid()
        move_gripper(sample_1, "C1")
    else:
        ctx.pause("Transfer plate to thermocycler and begin PRB_REM program")
        move_offdeck(sample_1, protocol_api.OFF_DECK)
        ctx.pause("Quick spin plate, remove seal and place on slot C1")
        move_offdeck(sample_1, "C1")

    #                                             CLEANUP RNA
    ######################################################################################################
    ctx.comment("---------CLEANUP RNA---------")
    p200.flow_rate.aspirate = 2000
    p200.flow_rate.dispense = 2000
    get_next_tip(p200)
    if Columns <= 4:
        p200.mix(20, 50 * Columns, RNA_BEADS)
    else:
        p200.mix(20, 200, RNA_BEADS)
    p200.flow_rate.aspirate = 160
    p200.flow_rate.dispense = 100
    ctx.delay(seconds=3)
    p200.blow_out()
    drop_tip(p200)
    for x in range(Columns):  # adding RNA Cleanup beads to wells
        get_next_tip(p200)
        p200.aspirate(60, RNA_BEADS.bottom(z=0.5))
        p200.dispense(60, sample_1_as[x].top(-10))
        cleanup_mix(15, 80, sample_1_as[x])
        drop_tip(p200)
    ctx.delay(minutes=5)
    move_gripper(sample_1, mag_block)
    ctx.delay(minutes=5)
    for x in range(Columns):  # removing supernatant
        get_next_tip(p200)
        p200.aspirate(80, sample_1_as[x])
        p200.dispense(80, chute)
        drop_tip(p200)
    for z in range(2):  # 2 EtOH washes
        for x in range(Columns):  # adding EtOH
            get_next_tip(p200)
            p200.aspirate(175, ETOH[x])
            p200.dispense(175, sample_1_as[x].top(z=-3))
            drop_tip(p200)
        if Columns <= 2:
            ctx.delay(seconds=20)
        for x in range(Columns):  # remove EtOH
            get_next_tip(p200)
            p200.aspirate(80, sample_1_as[x].bottom(z=6))
            p200.aspirate(95, sample_1_as[x])
            p200.dispense(175, chute)
            drop_tip(p200)
    for x in range(Columns):  # remove excess liquid
        get_next_tip(p50)
        p50.aspirate(50, sample_1_as[x].bottom(z=0.5))
        p50.dispense(50, chute)
        drop_tip(p50)
    if Columns <= 2:
        ctx.delay(minutes=1.2)  # air dry beads
    move_gripper(sample_1, "C1")
    for x in range(Columns):  # resuspend beads
        get_next_tip(p50)
        p50.aspirate(10.5, EB.bottom(z=0.5))
        p50.dispense(10.5, sample_1_as[x], push_out=0)
        ctx.delay(seconds=5)
        p50.blow_out(sample_1_as[x].top(-10))
        mix(20, 8, sample_1_as[x])
        drop_tip(p50)
    ctx.delay(minutes=2)
    move_gripper(sample_1, mag_block)
    ctx.delay(minutes=2)
    for x in range(Columns):  # transfer
        get_next_tip(p50)
        p50.aspirate(8.5, sample_1_as[x].bottom(z=0.5))
        if Columns > 3:
            p50.dispense(8.5, sample_1_as[x + 6], push_out=0)
            ctx.delay(seconds=5)
            p50.blow_out(sample_1_as[x + 6].top(-10))
        else:
            p50.dispense(8.5, sample_1_as[x + 4], push_out=0)
            ctx.delay(seconds=5)
            p50.blow_out(sample_1_as[x + 4].top(-10))
        drop_tip(p50)

    #                                            FRAGMENT AND DENATURE RNA
    ##########################################################################################################
    ctx.comment("--------Fragment and Denature RNA---------")
    if on_deck_thermo == True:
        if DryRun == False:
            thermo.set_lid_temperature(100)
            thermo.set_block_temperature(94)
            thermo.open_lid()
    move_gripper(sample_1, "C1")
    for x in range(Columns):
        get_next_tip(p50)
        p50.aspirate(8.5, EPH3.bottom(z=0.5))
        if Columns > 3:
            p50.dispense(8.5, sample_1_as[x + 6], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_1_as[x + 6].top(-10))
            mix(10, 13, sample_1_as[x + 6])
        else:
            p50.dispense(8.5, sample_1_as[x + 4], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_1_as[x + 4].top(-10))
            mix(10, 13, sample_1_as[x + 4])
        drop_tip(p50)
    if on_deck_thermo == True:
        move_gripper(sample_1, thermo)
        thermo.close_lid()
        if DryRun == False:
            profile_DEN_RNA = [{"temperature": 94, "hold_time_minutes": 2}]
            thermo.execute_profile(steps=profile_DEN_RNA, repetitions=1, block_max_volume=17)
            thermo.set_block_temperature(4)
        thermo.open_lid()
    else:
        ctx.pause("Transfer plate to thermocycler and begin DEN_RNA program")
        move_offdeck(sample_1, protocol_api.OFF_DECK)
        ctx.pause("Quick spin plate, remove seal and place on slot C1")
        move_offdeck(sample_1, "C1")

    #                                            FIRST STRAND SYNTHESIS
    ##############################################################################################################
    ctx.comment("---------First Strand Synthesis---------")
    get_next_tip(p50)
    mix(10, 8 * Columns, FSMM)
    p50.aspirate(8, FSMM.bottom(z=0.5))
    if Columns > 3:
        p50.dispense(8, sample_1_as[6].top(-10))
        mix(10, 20, sample_1_as[6])
    else:
        p50.dispense(8, sample_1_as[4].top(-10))
        mix(10, 20, sample_1_as[4])
    drop_tip(p50)
    for x in range(Columns - 1):  # looping through remaining columns with new tips
        get_next_tip(p50)
        p50.aspirate(8, FSMM.bottom(z=0.5))
        if Columns > 3:
            p50.dispense(8, sample_1_as[x + 7].top(-10))
            mix(10, 20, sample_1_as[x + 7])
        else:
            p50.dispense(8, sample_1_as[x + 5].top(-10))
            mix(10, 20, sample_1_as[x + 5])
        drop_tip(p50)
    if on_deck_thermo == True:
        thermo.close_lid()
        if DryRun == False:
            profile_FSS = [
                {"temperature": 25, "hold_time_minutes": 10},
                {"temperature": 42, "hold_time_minutes": 15},
                {"temperature": 70, "hold_time_minutes": 15},
            ]
            thermo.execute_profile(steps=profile_FSS, repetitions=1, block_max_volume=25)
            thermo.set_block_temperature(4)
        thermo.open_lid()
    else:
        ctx.pause("Transfer plate to thermocycler and begin FSS program")
        move_offdeck(sample_1, protocol_api.OFF_DECK)
        ctx.pause("Quick spin plate, remove seal and place on slot C1")
        move_offdeck(sample_1, "C1")

    #                                               SECOND STRAND SYNTHESIS
    ################################################################################################################
    ctx.comment("---------Second Strand Synthesis---------")
    if on_deck_thermo == True:
        if DryRun == False:
            thermo.set_lid_temperature(40)
    for x in range(Columns):
        get_next_tip(p50)
        p50.aspirate(25, SMM.bottom(z=0.5))
        if Columns > 3:
            p50.dispense(25, sample_1_as[x + 6].top(-10))
            mix(10, 40, sample_1_as[x + 6])
        else:
            p50.dispense(25, sample_1_as[x + 4].top(-10))
            mix(10, 40, sample_1_as[x + 4])
        drop_tip(p50)
    if on_deck_thermo == True:
        thermo.close_lid()
        if DryRun == False:
            profile_SSS = [{"temperature": 16, "hold_time_minutes": 60}]
            thermo.execute_profile(steps=profile_SSS, repetitions=1, block_max_volume=50)
            thermo.set_block_temperature(4)
        thermo.open_lid()
        move_gripper(sample_1, "C1")
    else:
        ctx.pause("Transfer plate to thermocycler and begin SSS program")
        move_offdeck(sample_1, protocol_api.OFF_DECK)
        ctx.pause("Quick spin plate, remove seal and place on slot C1")
        move_offdeck(sample_1, "C1")

    #                                                   CLEANUP cDNA
    ##################################################################################################################
    ctx.comment("---------CLEANUP cDNA---------")
    p200.flow_rate.aspirate = 2000
    p200.flow_rate.dispense = 2000
    get_next_tip(p200)
    if Columns <= 1:
        p200.mix(50, 160 * Columns, AMP)
    else:
        p200.mix(50, 200, AMP)
    ctx.delay(seconds=3)
    p200.flow_rate.aspirate = 160
    p200.flow_rate.dispense = 100
    p200.blow_out(AMP.top(z=-5))
    drop_tip(p200)
    for x in range(Columns):  # adding Ampure beads
        get_next_tip(p200)
        p200.aspirate(90, AMP)
        if Columns > 3:
            p200.dispense(90, sample_1_as[x + 6].top(-10))
            cleanup_mix(10, 120, sample_1_as[x + 6])
        else:
            p200.dispense(90, sample_1_as[x + 4].top(-10))
            cleanup_mix(10, 120, sample_1_as[x + 4])
        drop_tip(p200)
    ctx.delay(minutes=5)
    move_gripper(sample_1, mag_block)
    ctx.delay(minutes=5)
    for x in range(Columns):  # remove supernatant
        get_next_tip(p200)
        if Columns > 3:
            p200.aspirate(70, sample_1_as[x + 6].bottom(4))
            p200.aspirate(65, sample_1_as[x + 6].bottom(z=0.5))
        else:
            p200.aspirate(70, sample_1_as[x + 4].bottom(4))
            p200.aspirate(65, sample_1_as[x + 4].bottom(z=0.5))
        p200.dispense(130, chute)
        drop_tip(p200)
    for z in range(2):
        for x in range(Columns):  # add EtOH
            get_next_tip(p200)
            p200.aspirate(175, ETOH[x])
            if Columns > 3:
                p200.dispense(175, sample_1_as[x + 6].top(z=-3))
            else:
                p200.dispense(175, sample_1_as[x + 4].top(z=-3))
            drop_tip(p200)
        if Columns == 1:
            ctx.delay(seconds=20)
        for x in range(Columns):  # remove EtOH
            get_next_tip(p200)
            if Columns > 3:
                p200.aspirate(80, sample_1_as[x + 6].bottom(z=6))
                p200.aspirate(95, sample_1_as[x + 6].bottom(0.3))
            else:
                p200.aspirate(80, sample_1_as[x + 4].bottom(z=6))
                p200.aspirate(95, sample_1_as[x + 4].bottom(0.3))
            p200.dispense(175, chute)
            drop_tip(p200)
    for x in range(Columns):  # Remove residual liquid
        get_next_tip(p50)
        if Columns > 3:
            p50.aspirate(50, sample_1_as[x + 6].bottom(z=0.5))
        else:
            p50.aspirate(50, sample_1_as[x + 4].bottom(z=0.5))
        p50.dispense(50, chute)
        drop_tip(p50)
    if Columns <= 2:
        ctx.delay(minutes=1.2)  # dry beads
    move_gripper(sample_1, "C1")
    for x in range(Columns):  # resuspend beads
        get_next_tip(p50)
        p50.aspirate(19.5, RSB.bottom(z=0.5))
        if Columns > 3:
            p50.dispense(19.5, sample_1_as[x + 6], push_out=0)
            ctx.delay(seconds=2)
            p50.blow_out(sample_1_as[x + 6].top(-10))
            mix(25, 16, sample_1_as[x + 6])
        else:
            p50.dispense(19.5, sample_1_as[x + 4], push_out=0)
            ctx.delay(seconds=2)
            p50.blow_out(sample_1_as[x + 4].top(-10))
            mix(25, 16, sample_1_as[x + 4])
        drop_tip(p50)
    ctx.delay(minutes=2)
    move_gripper(sample_1, mag_block)
    if Columns > 3:
        move_offdeck(sample_2, "C1")
    ctx.delay(minutes=2)
    for x in range(Columns):  # transfer
        get_next_tip(p50)
        if Columns > 3:
            p50.aspirate(17.5, sample_1_as[x + 6].bottom(z=0.5))
            p50.dispense(17.5, sample_2_as[x], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_2_as[x].top(-10))
        else:
            p50.aspirate(17.5, sample_1_as[x + 4].bottom(z=0.5))
            p50.dispense(17.5, sample_1_as[x + 8], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_1_as[x + 8].top(-10))
        drop_tip(p50)
    if Columns > 3:
        move_chute(sample_1)

    # SAFE STOPPING POINT
    #                                                   dA-TAILING
    #################################################################################################################
    ctx.comment("---------Adenylate 3-Prime Ends---------")
    if Columns <= 3:
        if on_deck_thermo == True:
            move_gripper(sample_1, thermo)
        else:
            move_gripper(sample_1, "C1")
    if on_deck_thermo == True:
        if DryRun == False:
            thermo.set_lid_temperature(100)
            thermo.set_block_temperature(37)
        thermo.open_lid()
    for x in range(Columns):
        get_next_tip(p50)
        p50.aspirate(12.5, ATL4.bottom(z=0.5))
        if Columns > 3:
            p50.dispense(12.5, sample_2_as[x].top(-10))
            mix(10, 25, sample_2_as[x])
        else:
            p50.dispense(12.5, sample_1_as[x + 8].top(-10))
            mix(10, 25, sample_1_as[x + 8])
        drop_tip(p50)
    if on_deck_thermo == True:
        if Columns > 3:
            move_gripper(sample_2, thermo)
        else:
            move_gripper(sample_1, thermo)
        thermo.close_lid()
        if DryRun == False:
            profile_ATAIL = [{"temperature": 37, "hold_time_minutes": 30}, {"temperature": 70, "hold_time_minutes": 5}]
            thermo.execute_profile(steps=profile_ATAIL, repetitions=1, block_max_volume=30)
            thermo.set_block_temperature(4)
        thermo.open_lid()
    else:
        ctx.pause("Transfer plate to thermocycler and begin ATAIL program")
        if Columns > 3:
            move_offdeck(sample_2, protocol_api.OFF_DECK)
            ctx.pause("Quick spin plate, remove seal and place on slot B1")
            move_offdeck(sample_2, "B1")
        else:
            move_offdeck(sample_1, protocol_api.OFF_DECK)
            ctx.pause("Quick spin plate, remove seal and place on slot B1")
            move_offdeck(sample_1, "B1")
    move_offdeck(Index_Anchors, "C1")

    #                                               LIGATE ANCHORS
    #################################################################################################################
    ctx.comment("---------LIGATE ANCHORS---------")
    p50.configure_for_volume(2.5)
    for x in range(Columns):
        get_next_tip(p50)
        p50.aspirate(2.5, RSB.bottom(z=0.5))
        if Columns > 3:
            p50.dispense(2.5, sample_2_as[x].top(-10))
        else:
            p50.dispense(2.5, sample_1_as[x + 8].top(-10))
        drop_tip(p50)
    for x in range(Columns):
        get_next_tip(p50)
        p50.move_to(Anchors[x].top(-10))
        p50.touch_tip(Anchors[x], radius=1.2, v_offset=-10, speed=20)
        drop_tip(p50)
        get_next_tip(p50)
        p50.aspirate(2.5, Anchors[x].bottom(z=0.5))
        if Columns > 3:
            p50.dispense(2.5, sample_2_as[x].top(-10))
        else:
            p50.dispense(2.5, sample_1_as[x + 8].top(-10))
        drop_tip(p50)
    for x in range(Columns):  # break surface tension here
        p50.flow_rate.aspirate = 2
        get_next_tip(p50)
        p50.move_to(LIGX.bottom(0.3))
        ctx.delay(seconds=3)
        p50.aspirate(2.5, LIGX.bottom(z=0.3))
        p50.flow_rate.aspirate = 8
        if Columns > 3:
            p50.dispense(2.5, sample_2_as[x].top(-10))
            mix(12, 30, sample_2_as[x])
        else:
            p50.dispense(2.5, sample_1_as[x + 8].top(-10))
            mix(12, 30, sample_1_as[x + 8])
        drop_tip(p50)
    move_offdeck(Index_Anchors, protocol_api.OFF_DECK)
    if on_deck_thermo == True:
        thermo.close_lid()
        if DryRun == False:
            profile_LIG = [{"temperature": 30, "hold_time_minutes": 10}]
            thermo.execute_profile(steps=profile_LIG, repetitions=1, block_max_volume=38)
            thermo.set_block_temperature(4)
        thermo.open_lid()
    else:
        ctx.pause("Transfer plate to thermocycler and begin LIG program")
        if Columns > 3:
            move_offdeck(sample_2, protocol_api.OFF_DECK)
            ctx.pause("Quick spin plate, remove seal and place on slot B1")
            move_offdeck(sample_2, "B1")
        else:
            move_offdeck(sample_1, protocol_api.OFF_DECK)
            ctx.pause("Quick spin plate, remove seal and place on slot B1")
            move_offdeck(sample_1, "B1")

    #                                               STOP LIGATION
    ############################################################################################################
    ctx.comment("---------STOP LIGATION---------")
    p50.configure_for_volume(5)
    for x in range(Columns):
        get_next_tip(p50)
        p50.aspirate(5, STL.bottom(z=0.4))
        if Columns > 3:
            p50.dispense(5, sample_2_as[x], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_2_as[x].top(-10))
        else:
            p50.dispense(5, sample_1_as[x + 8], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_1_as[x + 8].top(-10))
        drop_tip(p50)
    for x in range(Columns):
        get_next_tip(p50)
        if Columns > 3:
            mix(15, 35, sample_2_as[x])
        else:
            mix(15, 35, sample_1_as[x + 8])
        drop_tip(p50)

    #                                              CLEANUP FRAGMENTS
    #############################################################################################################
    ctx.comment("---------CLEANUP FRAGMENTS---------")
    if Columns > 3:
        move_gripper(sample_2, "C1")
    else:
        move_gripper(sample_1, "C1")
    get_next_tip(p200)
    p200.flow_rate.aspirate = 2000
    p200.flow_rate.dispense = 2000
    if Columns <= 2:
        p200.mix(20, 80 * Columns, AMP)
    else:
        p200.mix(20, 200, AMP)
    ctx.delay(seconds=3)
    p200.flow_rate.aspirate = 160
    p200.flow_rate.dispense = 100
    p200.blow_out()
    drop_tip(p200)
    for x in range(Columns):  # adding Ampure Beads
        get_next_tip(p200)
        p200.aspirate(34, AMP.bottom(z=0.5))
        if Columns > 3:
            p200.dispense(34, sample_2_as[x].top(-10))
            cleanup_mix(15, 75, sample_2_as[x])
        else:
            p200.dispense(34, sample_1_as[x + 8].top(-10))
            cleanup_mix(15, 75, sample_1_as[x + 8])
        drop_tip(p200)
    ctx.delay(minutes=5)
    if Columns > 3:
        move_gripper(sample_2, mag_block)
    else:
        move_gripper(sample_1, mag_block)
    ctx.delay(minutes=5)
    for x in range(Columns):  # remove supernatant
        get_next_tip(p200)
        if Columns > 3:
            p200.aspirate(75, sample_2_as[x])
        else:
            p200.aspirate(75, sample_1_as[x + 8])
        p200.dispense(75, chute)
        drop_tip(p200)
    for z in range(2):
        for x in range(Columns):  # adding EtOH
            get_next_tip(p200)
            p200.aspirate(175, ETOH[x])
            if Columns > 3:
                p200.dispense(175, sample_2_as[x].top(z=-3))
            else:
                p200.dispense(175, sample_1_as[x + 8].top(z=-3))
            drop_tip(p200)
        if Columns == 1:
            ctx.delay(seconds=20)
        for x in range(Columns):  # remove EtOH
            get_next_tip(p200)
            if Columns > 3:
                p200.aspirate(80, sample_2_as[x].bottom(z=6))
                p200.aspirate(95, sample_2_as[x].bottom(z=0.3))
            else:
                p200.aspirate(80, sample_1_as[x + 8].bottom(z=6))
                p200.aspirate(95, sample_1_as[x + 8].bottom(z=0.3))
            p200.dispense(175, chute)
            drop_tip(p200)
    for x in range(Columns):  # remove residual liquid
        get_next_tip(p50)
        if Columns > 3:
            p50.aspirate(50, sample_2_as[x].bottom(z=0.3))
        else:
            p50.aspirate(50, sample_1_as[x + 8].bottom(z=0.3))
        p50.dispense(50, chute)
        drop_tip(p50)
    if Columns <= 2:
        ctx.delay(minutes=1.2)  # dry beads
    if Columns > 3:
        move_gripper(sample_2, "C1")
    else:
        move_gripper(sample_1, "C1")
    for x in range(Columns):  # resuspend beads
        get_next_tip(p50)
        p50.aspirate(22, RSB.bottom(z=0.5))
        if Columns > 3:
            p50.dispense(22, sample_2_as[x], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_2_as[x].top(-10))
            mix(20, 15, sample_2_as[x])
        else:
            p50.dispense(22, sample_1_as[x + 8], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_1_as[x + 8].top(-10))
            mix(20, 15, sample_1_as[x + 8])
        drop_tip(p50)
    ctx.delay(minutes=2)
    if Columns > 3:
        move_gripper(sample_2, mag_block)
    else:
        move_gripper(sample_1, mag_block)
    if Columns <= 3:
        if on_deck_thermo == True:
            move_offdeck(sample_2, "C1")
        else:
            move_offdeck(sample_2, "B1")
    else:
        if on_deck_thermo == True:
            move_offdeck(sample_3, "C1")
        else:
            move_offdeck(sample_3, "B1")
    ctx.delay(minutes=1.5)
    if on_deck_thermo == True:
        thermo.open_lid()
    for x in range(Columns):  # transfer
        get_next_tip(p50)
        if Columns > 3:
            p50.aspirate(20, sample_2_as[x].bottom(z=0.5))
            p50.dispense(20, sample_3_as[x], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_3_as[x].top(-10))
        else:
            p50.aspirate(20, sample_1_as[x + 8].bottom(z=0.5))
            p50.dispense(20, sample_2_as[x], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_2_as[x].top(-10))
        drop_tip(p50)

    if on_deck_thermo == True:
        if Columns > 3:
            move_gripper(sample_3, thermo)
        else:
            move_gripper(sample_2, thermo)
    if Columns > 3:
        move_chute(sample_2)
    else:
        move_chute(sample_1)

    #                                           AMPLIFY LIBRARIES
    ###################################################################################################
    ctx.comment("---------AMPLIFY LIBRARIES---------")
    move_offdeck(Index_Plate, "C1")
    for x in range(Columns):  # poke holes in Index Plate Seal
        get_next_tip(p50)
        p50.move_to(Index_Adap[x].top(-10))
        p50.touch_tip(Index_Adap[x], radius=1.2, v_offset=-10, speed=20)
        drop_tip(p50)
        get_next_tip(p50)
        mix(5, 7, Index_Adap[x])
        p50.aspirate(10, Index_Adap[x].bottom(z=0.5))
        if Columns > 3:
            p50.dispense(10, sample_3_as[x].top(-10))
        else:
            p50.dispense(10, sample_2_as[x].top(-10))
        drop_tip(p50)
    for x in range(Columns):
        get_next_tip(p50)
        p50.aspirate(20, EPM.bottom(z=0.5))
        if Columns > 3:
            p50.dispense(20, sample_3_as[x].top(-10))
            mix(10, 45, sample_3_as[x])
        else:
            p50.dispense(20, sample_2_as[x].top(-10))
            mix(10, 45, sample_2_as[x])
        drop_tip(p50)
    move_offdeck(Index_Plate, protocol_api.OFF_DECK)
    if on_deck_thermo == True:
        thermo.close_lid()
        if DryRun == False:
            profile_PCR_1 = [{"temperature": 98, "hold_time_minutes": 30}]
            thermo.execute_profile(steps=profile_PCR_1, repetitions=1, block_max_volume=50)
            profile_PCR_2 = [
                {"temperature": 98, "hold_time_seconds": 10},
                {"temperature": 60, "hold_time_seconds": 30},
                {"temperature": 72, "hold_time_seconds": 30},
            ]
            thermo.execute_profile(steps=profile_PCR_2, repetitions=PCR_Cycles, block_max_volume=50)
            profile_PCR_3 = [{"temperature": 72, "hold_time_minutes": 5}]
            thermo.execute_profile(steps=profile_PCR_3, repetitions=1, block_max_volume=50)
            thermo.set_block_temperature(4)
        thermo.open_lid()
    else:
        if Columns > 3:
            ctx.pause("Transfer plate to thermocycler and begin PCR program")
            move_offdeck(sample_3, protocol_api.OFF_DECK)
            ctx.pause("Quick spin plate, remove seal and place on slot B1")
            move_offdeck(sample_3, "B1")
        else:
            ctx.pause("Transfer plate to thermocycler and begin PCR program")
            move_offdeck(sample_2, protocol_api.OFF_DECK)
            ctx.pause("Quick spin plate, remove seal and place on slot B1")
            move_offdeck(sample_2, "B1")

    #                                           CLEANUP LIBRARIES
    ########################################################################################################
    ctx.comment("---------CLEANUP LIBRARIES---------")
    p200.flow_rate.aspirate = 2000
    p200.flow_rate.dispense = 2000
    if Columns > 3:
        move_gripper(sample_3, "C1")
    else:
        move_gripper(sample_2, "C1")
    if on_deck_thermo == True:
        thermo.deactivate_lid()
        thermo.deactivate_block()
    get_next_tip(p200)
    if Columns <= 5:
        p200.mix(30, 40 * Columns, AMP)
    else:
        p200.mix(30, 200, AMP)
    ctx.delay(seconds=3)
    p200.blow_out(AMP.top(z=-7))
    drop_tip(p200)
    p200.flow_rate.aspirate = 160
    p200.flow_rate.dispense = 100
    for x in range(Columns):  # adding Ampure Beads
        get_next_tip(p200)
        p200.aspirate(50, AMP)
        ctx.delay(seconds=3)
        if Columns > 3:
            p200.dispense(50, sample_3_as[x].top(-10))
            cleanup_mix(15, 100, sample_3_as[x])
        else:
            p200.dispense(50, sample_2_as[x].top(-10))
            cleanup_mix(15, 100, sample_2_as[x])
        drop_tip(p200)
    ctx.delay(minutes=5)
    if Columns > 3:
        move_gripper(sample_3, mag_block)
    else:
        move_gripper(sample_2, mag_block)
    ctx.delay(minutes=5)
    for x in range(Columns):  # remove supernatant
        get_next_tip(p200)
        if Columns > 3:
            p200.aspirate(90, sample_3_as[x])
        else:
            p200.aspirate(90, sample_2_as[x])
        ctx.delay(seconds=3)
        p200.dispense(90, chute)
        drop_tip(p200)
    for z in range(2):
        for x in range(Columns):  # adding EtOH
            get_next_tip(p200)
            p200.aspirate(175, ETOH[x])
            if Columns > 3:
                p200.dispense(175, sample_3_as[x].top(-3))
            else:
                p200.dispense(175, sample_2_as[x].top(-3))
            drop_tip(p200)
        if Columns == 1:
            ctx.delay(seconds=20)
        for x in range(Columns):  # removing EtOH
            get_next_tip(p200)
            if Columns > 3:
                p200.aspirate(80, sample_3_as[x].bottom(z=6))
                p200.aspirate(95, sample_3_as[x])
            else:
                p200.aspirate(80, sample_2_as[x].bottom(z=6))
                p200.aspirate(95, sample_2_as[x])
            p200.dispense(175, chute)
            drop_tip(p200)
    for x in range(Columns):  # remove excess liquid
        get_next_tip(p50)
        if Columns > 3:
            p50.aspirate(50, sample_3_as[x])
        else:
            p50.aspirate(50, sample_2_as[x])
        p50.dispense(50, chute)
        drop_tip(p50)
    if Columns <= 2:
        ctx.delay(minutes=1.2)  # dry beads
    if Columns > 3:
        move_gripper(sample_3, "C1")
    else:
        move_gripper(sample_2, "C1")
    for x in range(Columns):  # resuspend beads
        get_next_tip(p50)
        p50.aspirate(17, RSB.bottom(z=0.4))
        if Columns > 3:
            p50.dispense(17, sample_3_as[x], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_3_as[x].top(-10))
            mix(15, 15, sample_3_as[x])
        else:
            p50.dispense(17, sample_2_as[x], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_2_as[x].top(-10))
            mix(15, 15, sample_2_as[x])
        drop_tip(p50)
    ctx.delay(minutes=2)
    if Columns > 3:
        move_gripper(sample_3, mag_block)
    else:
        move_gripper(sample_2, mag_block)
    ctx.delay(minutes=2)
    for x in range(Columns):  # transfer
        get_next_tip(p50)
        if Columns > 3:
            p50.aspirate(15, sample_3_as[x].bottom(z=0.4))
            p50.dispense(15, sample_3_as[x + 6], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_3_as[x + 6].top(-10))
        else:
            p50.aspirate(15, sample_2_as[x].bottom(z=0.4))
            p50.dispense(15, sample_2_as[x + 4], push_out=0)
            ctx.delay(seconds=3)
            p50.blow_out(sample_2_as[x + 4].top(-10))
        drop_tip(p50)
    if Columns > 3:
        move_gripper(sample_3, "C1")
    else:
        move_gripper(sample_2, "C1")
    ctx.home()

    #                                              Liquid Definitions and Assignments
    #######################################################################################################################################################
    HPMM_ = ctx.define_liquid(name="Hybridization Probe Master Mix", description="Hybridization Probe Master Mix", display_color="#cc3399")
    for well in reagent_plate.wells()[0:8]:
        well.load_liquid(liquid=HPMM_, volume=4.8 * Columns)
    RDMM_ = ctx.define_liquid(name="rRNA Depletion Master Mix", description="rRNA Depletion Master Mix", display_color="#ff6699")
    for well in reagent_plate.wells()[8:16]:
        well.load_liquid(liquid=RDMM_, volume=6 * Columns)
    PRMM_ = ctx.define_liquid(name="Probe Removal Master Mix", description="Probe Removal Master Mix", display_color="#ffcc99")
    for well in reagent_plate.wells()[16:24]:
        well.load_liquid(liquid=PRMM_, volume=11 * Columns)
    EB_ = ctx.define_liquid(name="Elution Buffer", description="Elution Buffer", display_color="#ff9966")
    for well in reagent_plate.wells()[24:32]:
        well.load_liquid(liquid=EB_, volume=12 * Columns)
    EPH3_ = ctx.define_liquid(name="EPH3", description="Elute, Prime, Fragment 3HC Mix", display_color="#009933")
    for well in reagent_plate.wells()[32:40]:
        well.load_liquid(liquid=EPH3_, volume=10 * Columns)
    FSMM_ = ctx.define_liquid(name="First Strand Master Mix", description="First Strand Master Mix", display_color="#0066ff")
    for well in reagent_plate.wells()[40:48]:
        well.load_liquid(liquid=FSMM_, volume=10 * Columns)
    SMM_ = ctx.define_liquid(name="SMM", description="Second Strand Marking Master Mix", display_color="#00cc99")
    for well in reagent_plate.wells()[48:56]:
        well.load_liquid(liquid=SMM_, volume=27.5 * Columns)
    ATL4_ = ctx.define_liquid(name="ATL4", description="A-Tailing Mix", display_color="#6699ff")
    for well in reagent_plate.wells()[56:64]:
        well.load_liquid(liquid=ATL4_, volume=13.8 * Columns)
    LIGX_ = ctx.define_liquid(name="LIGX", description="Ligation Mix", display_color="#ff9933")
    for well in reagent_plate.wells()[64:72]:
        well.load_liquid(liquid=LIGX_, volume=3 * Columns)
    STL_ = ctx.define_liquid(name="STL", description="Stop Ligation Buffer", display_color="#ffff99")
    for well in reagent_plate.wells()[72:80]:
        well.load_liquid(liquid=STL_, volume=6 * Columns)
    EPM_ = ctx.define_liquid(name="EPM", description="Enhanced PCR Mix", display_color="#cc99ff")
    for well in reagent_plate.wells()[80:88]:
        well.load_liquid(liquid=EPM_, volume=22 * Columns)
    RNA_BEADS_ = ctx.define_liquid(name="RNA XP Beads", description="RNAClean XP Beads", display_color="#66ffff")
    for well in Reservior.wells()[0:8]:
        well.load_liquid(liquid=RNA_BEADS_, volume=66 * Columns)
    AMP_ = ctx.define_liquid(name="Ampure XP Beads", description="Ampure XP Beads", display_color="#663300")
    for well in Reservior.wells()[8:16]:
        well.load_liquid(liquid=AMP_, volume=200 * Columns)
    RSB_ = ctx.define_liquid(name="Resuspension Buffer", description="Resuspension Buffer", display_color="#b3ffb3")
    for well in Reservior.wells()[16:24]:
        well.load_liquid(liquid=RSB_, volume=77 * Columns)
    ETOH_ = ctx.define_liquid(name="80% Ethanol", description="80% Ethanol", display_color="#f2f2f2")
    for well in Reservior.wells()[24 : 24 + (Columns * 8)]:
        well.load_liquid(liquid=ETOH_, volume=1500)
    Samples = ctx.define_liquid(name="Input RNA", description="Input RNA", display_color="#99ff99")
    for well in sample_1.wells()[: Columns * 8]:
        well.load_liquid(liquid=Samples, volume=11)
