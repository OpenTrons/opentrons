"""Omega HDQ DNA Extraction: Bacteria - Tissue Protocol."""
from abr_testing.protocols import helpers
import math
from opentrons import types
from opentrons.protocol_api import (
    ProtocolContext,
    Well,
    ParameterContext,
    InstrumentContext,
)
import numpy as np
from opentrons.protocol_api.module_contexts import (
    HeaterShakerContext,
    TemperatureModuleContext,
    MagneticBlockContext,
    AbsorbanceReaderContext,
)
from typing import List, Dict
from datetime import datetime
import statistics

metadata = {
    "author": "Zach Galluzzo <zachary.galluzzo@opentrons.com>",
    "protocolName": "Omega HDQ DNA Extraction: Bacteria- Tissue Protocol + Plate Reader",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.22",
}
"""
Slot A1: Tips 1000
Slot A2: Tips 1000
Slot A3: Temperature module (gen2) with 96 well PCR block and Armadillo 96 well PCR Plate
Slot B1: Tips 1000
Slot B2:
Slot B3: Nest 1 Well Reservoir
Slot C1: Magblock
Slot C2:
Slot C3:
Slot D1: H-S with Nest 96 Well Deep well and DW Adapter
Slot D2: Nest 12 well 15 ml Reservoir
Slot D3: Trash

Reservoir 1:
Wells 1-2 - 9,900 ul
Well 3 - 14,310 ul
Wells 4-12 - 11,400 ul
"""

whichwash = 1
sample_max = 48
tip1k = 0
drop_count = 0
waste_vol = 0


def add_parameters(parameters: ParameterContext) -> None:
    """Define Parameters."""
    helpers.create_single_pipette_mount_parameter(parameters)
    helpers.create_hs_speed_parameter(parameters)
    helpers.create_dot_bottom_parameter(parameters)
    helpers.create_deactivate_modules_parameter(parameters)
    parameters.add_bool(
        variable_name="plate_reader", display_name="Plate Reader Use", default=False
    )


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    heater_shaker_speed = protocol.params.heater_shaker_speed  # type: ignore[attr-defined]
    mount = protocol.params.pipette_mount  # type: ignore[attr-defined]
    dot_bottom = protocol.params.dot_bottom  # type: ignore[attr-defined]
    deactivate_modules_bool = protocol.params.deactivate_modules  # type: ignore[attr-defined]
    plate_reader_bool = protocol.params.plate_reader  # type: ignore[attr-defined]
    helpers.comment_protocol_version(protocol, "02")

    dry_run = False
    TIP_TRASH = False
    res_type = "nest_12_reservoir_22ml"

    num_samples = 96
    wash1_vol = 600.0
    wash2_vol = 600.0
    wash3_vol = 600.0
    AL_vol = 230.0
    sample_vol = 180.0
    bind_vol = 320.0
    elution_vol = 100.0

    # Protocol Parameters
    deepwell_type = "nest_96_wellplate_2ml_deep"
    res_type = "nest_12_reservoir_15ml"
    if not dry_run:
        settling_time = 2.0
        A_lysis_time_1 = 15.0
        A_lysis_time_2 = 10.0
        bind_time = 10.0
        elute_wash_time = 5.0
    else:
        settling_time = (
            elute_wash_time
        ) = A_lysis_time_1 = A_lysis_time_2 = bind_time = 0.25
    PK_vol = bead_vol = 20
    AL_total_vol = AL_vol + PK_vol
    starting_vol = AL_vol + sample_vol
    binding_buffer_vol = bind_vol + bead_vol

    h_s: HeaterShakerContext = protocol.load_module(
        helpers.hs_str, "D1"
    )  # type: ignore[assignment]
    if plate_reader_bool:
        sample_plate_name = "Tartrazine Plate 1"
        plate_for_plate_reader = h_s.load_labware(
            "corning_96_wellplate_360ul_flat", sample_plate_name
        )
    h_s.close_labware_latch()
    temp: TemperatureModuleContext = protocol.load_module(
        helpers.temp_str, "D3"
    )  # type: ignore[assignment]
    elutionplate, temp_adapter = helpers.load_temp_adapter_and_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", temp, "Elution Plate"
    )
    magnetic_block: MagneticBlockContext = protocol.load_module(
        helpers.mag_str, "C1"
    )  # type: ignore[assignment]
    waste_reservoir = protocol.load_labware(
        "nest_1_reservoir_195ml", "C2", "Liquid Waste"
    )
    waste = waste_reservoir.wells()[0].top()

    # Plate Reader
    if plate_reader_bool:
        plate_reader: AbsorbanceReaderContext = protocol.load_module(
            helpers.abs_mod_str, "A3"
        )  # type: ignore[assignment]
    sample_plate = protocol.load_labware(deepwell_type, "B3", "Sample Plate")
    if plate_reader_bool:
        reservoir_for_plate_reader = protocol.load_labware(res_type, "C3")
        tartrazine_well = reservoir_for_plate_reader["A1"]
        all_percent_error_dict = {}
        cv_dict = {}

    res1 = protocol.load_labware(res_type, "D2", "Reagent Reservoir 1")
    num_cols = math.ceil(num_samples / 8)
    # Load tips and combine all similar boxes
    tips1000 = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "A1", "Tips 1")
    tips1001 = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "A2", "Tips 2")
    tips1002 = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "B1", "Tips 3")
    tips50 = protocol.load_labware("opentrons_flex_96_tiprack_50ul", "B2", "Tips 4")

    tips = [
        *tips1000.wells()[num_samples:96],
        *tips1001.wells(),
        *tips1002.wells(),
    ]
    tips_sn = tips1000.wells()[:num_samples]

    # load instruments
    m1000 = protocol.load_instrument(
        "flex_8channel_1000", mount, tip_racks=[tips1000, tips1001, tips1002]
    )
    m50 = protocol.load_instrument(
        "flex_8channel_50", mount="right", tip_racks=[tips50]
    )
    """
    Here is where you can define the locations of your reagents.
    """
    reservoir_dead_vol = 3000
    tartrazine_vol = (96 * 10) + reservoir_dead_vol
    water_vol = (96 * 190) + reservoir_dead_vol
    water_vol_per_well = water_vol / 2
    binding_buffer = res1.wells()[:2]
    AL = res1.wells()[2]
    wash1 = res1.wells()[3:6]
    wash2 = res1.wells()[6:9]
    wash3 = res1.wells()[9:]

    samples_m = sample_plate.rows()[0][:num_cols]
    elution_samples_m = elutionplate.rows()[0][:num_cols]
    # Probe wells
    liquid_vols_and_wells: Dict[str, List[Dict[str, Well | List[Well] | float]]] = {
        "AL Lysis": [{"well": AL, "volume": AL_vol}],
        "PK": [{"well": AL, "volume": PK_vol}],
        "Beads": [{"well": binding_buffer, "volume": bead_vol}],
        "Binding": [{"well": binding_buffer, "volume": bind_vol}],
        "Wash 1": [{"well": wash1, "volume": wash1_vol}],
        "Wash 2": [{"well": wash2, "volume": wash2_vol}],
        "Wash 3": [{"well": wash3, "volume": wash3_vol}],
        "Samples": [{"well": sample_plate.wells()[:num_samples], "volume": sample_vol}],
        "Elution Buffer": [
            {"well": elutionplate.wells()[:num_samples], "volume": elution_vol}
        ],
    }
    if plate_reader_bool:
        plate_reader_dict: Dict[str, List[Dict[str, Well | List[Well] | float]]] = {
            "Tartrazine": [{"well": tartrazine_well, "volume": tartrazine_vol}],
            "Water": [
                {
                    "well": [
                        reservoir_for_plate_reader["A2"],
                        reservoir_for_plate_reader["A3"],
                    ],
                    "volume": water_vol_per_well,
                }
            ],
        }

        liquid_vols_and_wells.update(plate_reader_dict)

    m1000.flow_rate.aspirate = 300
    m1000.flow_rate.dispense = 300
    m1000.flow_rate.blow_out = 300
    helpers.find_liquid_height_of_loaded_liquids(protocol, liquid_vols_and_wells, m1000)

    def tiptrack(tipbox: List[Well]) -> None:
        """Track Tips."""
        global tip1k
        global drop_count
        if tipbox == tips:
            m1000.pick_up_tip(tipbox[int(tip1k)])
            tip1k = tip1k + 8
            if tip1k >= len(tipbox):
                tip1k = 0
        drop_count = drop_count + 8
        if drop_count >= 150:
            drop_count = 0

    def remove_supernatant(vol: float) -> None:
        """Remove supernatants."""
        protocol.comment("-----Removing Supernatant-----")
        m1000.flow_rate.aspirate = 150
        num_trans = math.ceil(vol / 980)
        vol_per_trans = vol / num_trans

        for i, m in enumerate(samples_m):
            m1000.pick_up_tip(tips_sn[8 * i])
            loc = m.bottom(dot_bottom)
            for _ in range(num_trans):
                if m1000.current_volume > 0:
                    # void air gap if necessary
                    m1000.dispense(m1000.current_volume, m.top())
                m1000.move_to(m.center())
                m1000.prepare_to_aspirate()
                m1000.transfer(vol_per_trans, loc, waste, new_tip="never", air_gap=20)
                m1000.blow_out(waste)
                m1000.prepare_to_aspirate()
                m1000.air_gap(20)
            m1000.drop_tip(tips_sn[8 * i]) if TIP_TRASH else m1000.return_tip()
        m1000.flow_rate.aspirate = 300
        helpers.move_labware_to_hs(protocol, sample_plate, h_s, h_s)

    def bead_mixing(
        well: Well, pip: InstrumentContext, mvol: float, reps: int = 8
    ) -> None:
        """Bead Mixing.

        'mixing' will mix liquid that contains beads. This will be done by
        aspirating from the bottom of the well and dispensing from the top as to
        mix the beads with the other liquids as much as possible. Aspiration and
        dispensing will also be reversed for a short to to ensure maximal mixing.
        param well: The current well that the mixing will occur in.
        param pip: The pipet that is currently attached/ being used.
        param mvol: The volume that is transferred before the mixing steps.
        param reps: The number of mix repetitions that should occur. Note~
        During each mix rep, there are 2 cycles of aspirating from bottom,
        dispensing at the top and 2 cycles of aspirating from middle,
        dispensing at the bottom
        """
        center = well.top().move(types.Point(x=0, y=0, z=5))
        aspbot = well.bottom().move(types.Point(x=0, y=2, z=1))
        asptop = well.bottom().move(types.Point(x=0, y=-2, z=2.5))
        disbot = well.bottom().move(types.Point(x=0, y=1.5, z=3))
        distop = well.top().move(types.Point(x=0, y=1.5, z=0))

        if mvol > 1000:
            mvol = 1000

        vol = mvol * 0.9

        pip.flow_rate.aspirate = 500
        pip.flow_rate.dispense = 500

        pip.move_to(center)
        for _ in range(reps):
            pip.aspirate(vol, aspbot)
            pip.dispense(vol, distop)
            pip.aspirate(vol, asptop)
            pip.dispense(vol, disbot)
            if _ == reps - 1:
                pip.flow_rate.aspirate = 150
                pip.flow_rate.dispense = 100
                pip.aspirate(vol, aspbot)
                pip.dispense(vol, aspbot)

        pip.flow_rate.aspirate = 300
        pip.flow_rate.dispense = 300

    def mixing(well: Well, pip: InstrumentContext, mvol: float, reps: int = 8) -> None:
        """Mixing.

        'mixing' will mix liquid that contains beads. This will be done by
        aspirating from the bottom of the well and dispensing from the top as to
        mix the beads with the other liquids as much as possible. Aspiration and
        dispensing will also be reversed for a short to to ensure maximal mixing.
        param well: The current well that the mixing will occur in.
        param pip: The pipet that is currently attached/ being used.
        param mvol: The volume that is transferred before the mixing steps.
        param reps: The number of mix repetitions that should occur. Note~
        During each mix rep, there are 2 cycles of aspirating from bottom,
        dispensing at the top and 2 cycles of aspirating from middle,
        dispensing at the bottom
        """
        center = well.top(5)
        asp = well.bottom(1)
        disp = well.top(-8)

        if mvol > 1000:
            mvol = 1000

        vol = mvol * 0.9

        pip.flow_rate.aspirate = 500
        pip.flow_rate.dispense = 500

        pip.move_to(center)
        for _ in range(reps):
            pip.aspirate(vol, asp)
            pip.dispense(vol, disp)
            pip.aspirate(vol, asp)
            pip.dispense(vol, disp)
            if _ == reps - 1:
                pip.flow_rate.aspirate = 150
                pip.flow_rate.dispense = 100
                pip.aspirate(vol, asp)
                pip.dispense(vol, asp)

        pip.flow_rate.aspirate = 300
        pip.flow_rate.dispense = 300

    def A_lysis(vol: float, source: Well) -> None:
        """A Lysis."""
        protocol.comment("-----Mixing then transferring AL buffer-----")
        num_transfers = math.ceil(vol / 980)
        tiptrack(tips)
        m1000.prepare_to_aspirate()
        for i in range(num_cols):
            if num_cols >= 5:
                if i == 0:
                    height = 10
                else:
                    height = 1
            else:
                height = 1
            src = source
            tvol = vol / num_transfers
            for t in range(num_transfers):
                if i == 0 and t == 0:
                    for _ in range(3):
                        m1000.require_liquid_presence(src)
                        m1000.aspirate(tvol, src.bottom(1))
                        m1000.dispense(tvol, src.bottom(4))
                m1000.aspirate(tvol, src.bottom(height))
                m1000.air_gap(10)
                m1000.dispense(m1000.current_volume, samples_m[i].top())
                m1000.prepare_to_aspirate()
                m1000.air_gap(20)

        for i in range(num_cols):
            if i != 0:
                tiptrack(tips)
                m1000.prepare_to_aspirate()
            mixing(
                samples_m[i], m1000, tvol - 40, reps=10 if not dry_run else 1
            )  # vol is 250 AL + 180 sample
            m1000.dispense(m1000.current_volume, waste)
            m1000.prepare_to_aspirate()
            m1000.air_gap(20)
            m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

        protocol.comment("-----Mixing then Heating AL and Sample-----")

        helpers.set_hs_speed(protocol, h_s, heater_shaker_speed, A_lysis_time_1, False)
        if not dry_run:
            h_s.set_and_wait_for_temperature(55)
            protocol.delay(
                minutes=A_lysis_time_2,
                msg="Incubating at 55C "
                + str(heater_shaker_speed)
                + " rpm for 10 minutes.",
            )
            h_s.deactivate_shaker()

    def bind(vol: float) -> None:
        """Bind.

        `bind` will perform magnetic bead binding on each sample in the
        deepwell plate. Each channel of binding beads will be mixed before
        transfer, and the samples will be mixed with the binding beads after
        the transfer. The magnetic deck activates after the addition to all
        samples, and the supernatant is removed after bead bining.
        :param vol (float): The amount of volume to aspirate from the elution
                            buffer source and dispense to each well containing
                            beads.
        :param park (boolean): Whether to save sample-corresponding tips
                               between adding elution buffer and transferring
                               supernatant to the final clean elutions PCR
                               plate.
        """
        protocol.comment("-----Beginning Bind Steps-----")
        tiptrack(tips)
        for i, well in enumerate(samples_m):
            num_trans = math.ceil(vol / 980)
            vol_per_trans = vol / num_trans
            source = binding_buffer[i // 7]
            if i == 0:
                reps = 6 if not dry_run else 1
            else:
                reps = 1
            protocol.comment("-----Mixing Beads in Reservoir-----")
            bead_mixing(source, m1000, vol_per_trans, reps=reps if not dry_run else 1)
            # Transfer beads and binding from source to H-S plate
            for t in range(num_trans):
                if m1000.current_volume > 0:
                    # void air gap if necessary
                    m1000.dispense(m1000.current_volume, source.top())
                m1000.transfer(
                    vol_per_trans, source, well.top(), air_gap=20, new_tip="never"
                )
                if t < num_trans - 1:
                    m1000.prepare_to_aspirate()
                    m1000.air_gap(20)

        protocol.comment("-----Mixing Beads in Plate-----")
        for i in range(num_cols):
            if i != 0:
                tiptrack(tips)
            mixing(
                samples_m[i], m1000, vol + starting_vol, reps=10 if not dry_run else 1
            )
            m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

        protocol.comment("-----Incubating Beads and Bind on H-S-----")

        speed_val = heater_shaker_speed * 0.9
        helpers.set_hs_speed(protocol, h_s, speed_val, bind_time, True)

        # Transfer from H-S plate to Magdeck plate
        helpers.move_labware_from_hs_to_destination(
            protocol, sample_plate, h_s, magnetic_block
        )
        for bindi in np.arange(
            settling_time + 1, 0, -0.5
        ):  # Settling time delay with countdown timer
            protocol.delay(
                minutes=0.5,
                msg="There are " + str(bindi) + " minutes left in the incubation.",
            )

        # remove initial supernatant
        remove_supernatant(vol + starting_vol)

    def wash(vol: float, source: List[Well]) -> None:
        """Wash function."""
        global whichwash  # Defines which wash the protocol is on to log on the app

        if source == wash1:
            whichwash = 1
        if source == wash2:
            whichwash = 2
        if source == wash3:
            whichwash = 3

        protocol.comment("-----Beginning Wash #" + str(whichwash) + "-----")

        num_trans = math.ceil(vol / 980)
        vol_per_trans = vol / num_trans
        tiptrack(tips)
        for i, m in enumerate(samples_m):
            src = source[i // 4]
            for n in range(num_trans):
                if m1000.current_volume > 0:
                    m1000.dispense(m1000.current_volume, src.top())
                m1000.transfer(vol_per_trans, src, m.top(), air_gap=20, new_tip="never")
        m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

        helpers.set_hs_speed(protocol, h_s, heater_shaker_speed, elute_wash_time, True)

        helpers.move_labware_from_hs_to_destination(
            protocol, sample_plate, h_s, magnetic_block
        )

        for washi in np.arange(
            settling_time, 0, -0.5
        ):  # settling time timer for washes
            protocol.delay(
                minutes=0.5,
                msg="There are "
                + str(washi)
                + " minutes left in wash "
                + str(whichwash)
                + " incubation.",
            )

        remove_supernatant(vol)

    def elute(vol: float) -> None:
        """Elution Function."""
        protocol.comment("-----Beginning Elution Steps-----")
        tiptrack(tips)
        for i, (m, e) in enumerate(zip(samples_m, elution_samples_m)):
            m1000.flow_rate.aspirate = 25
            m1000.aspirate(vol, e.bottom(dot_bottom))
            m1000.air_gap(20)
            m1000.dispense(m1000.current_volume, m.top())
        m1000.flow_rate.aspirate = 150
        m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

        h_s.set_and_wait_for_shake_speed(heater_shaker_speed * 1.1)
        speed_val = heater_shaker_speed * 1.1
        helpers.set_hs_speed(protocol, h_s, speed_val, elute_wash_time, True)

        # Transfer back to magnet
        helpers.move_labware_from_hs_to_destination(
            protocol, sample_plate, h_s, magnetic_block
        )

        for elutei in np.arange(settling_time, 0, -0.5):
            protocol.delay(
                minutes=0.5,
                msg="Incubating on MagDeck for " + str(elutei) + " more minutes.",
            )

        for i, (m, e) in enumerate(zip(samples_m, elution_samples_m)):
            tiptrack(tips)
            m1000.flow_rate.dispense = 100
            m1000.flow_rate.aspirate = 150
            m1000.transfer(
                vol, m.bottom(dot_bottom), e.bottom(5), air_gap=20, new_tip="never"
            )
            m1000.blow_out(e.top(-2))
            m1000.prepare_to_aspirate()
            m1000.air_gap(20)
            m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

    if plate_reader_bool:
        # Plate reader steps
        # 1. Fill plate with water
        water_well = reservoir_for_plate_reader["A2"]
        total_dispensed = 0
        for well in plate_for_plate_reader.rows()[0]:
            m1000.pick_up_tip()
            m1000.prepare_to_aspirate()
            m1000.aspirate(190, water_well)
            m1000.air_gap(10)
            m1000.dispense(10, well.top())
            m1000.dispense(190, well)
            m1000.blow_out(well.top())
            protocol.delay(minutes=0.1)
            m1000.blow_out(well.top())
            m1000.prepare_to_aspirate()
            total_dispensed += 190 * m1000.active_channels
            if total_dispensed > (water_vol_per_well - reservoir_dead_vol):
                water_well = reservoir_for_plate_reader["A3"]
            m1000.return_tip()
        # 2. Mix tartrazine
        m1000.pick_up_tip()
        top_of_tartrazine = helpers.find_liquid_height(m1000, tartrazine_well)
        for i in range(20):
            m1000.aspirate(1, tartrazine_well.bottom(z=1))
            m1000.dispense(1, tartrazine_well.bottom(z=top_of_tartrazine + 1))
        m1000.return_tip()
        # 2. Fill plate with tartrazine
        for well in plate_for_plate_reader.rows()[0]:
            m50.pick_up_tip()
            height = helpers.find_liquid_height(m50, tartrazine_well)
            m50.prepare_to_aspirate()
            if height <= 0.0:
                # If a negative tartrazine height is found,
                # the protocol will pause, prompt a refill, and reprobe.
                protocol.pause("Fill tartrazine")
                height = helpers.find_liquid_height(m50, tartrazine_well)
            m50.aspirate(10, tartrazine_well.bottom(z=height), rate=0.15)
            m50.air_gap(5)
            m50.dispense(5, well.top())
            m50.dispense(10, well.bottom(z=0.5), rate=0.15)
            m50.blow_out()
            protocol.delay(minutes=0.1)
            m50.blow_out()
            m1000.prepare_to_aspirate()
            m50.return_tip()
        # 3. Read plate
        # Move labware to heater shaker to be mixed
        helpers.set_hs_speed(protocol, h_s, 1500, 2.0, True)
        h_s.open_labware_latch()
        # Initialize plate reader
        plate_reader.close_lid()
        plate_reader.initialize("single", [450])
        plate_reader.open_lid()
        # Move sample plate into plate reader
        protocol.move_labware(plate_for_plate_reader, plate_reader, use_gripper=True)
        sample_plate_name = "sample plate_" + str(i + 1)
        csv_string = sample_plate_name + "_" + str(datetime.now())
        plate_reader.close_lid()
        result = plate_reader.read(csv_string)
        # Calculate CV and % error of expected value.
        for wavelength in result:
            dict_of_wells = result[wavelength]
            readings_and_wells = dict_of_wells.items()
            readings = dict_of_wells.values()
            avg = statistics.mean(readings)
            # Check if every average is within +/- 5% of 2.85
            percent_error_dict = {}
            percent_error_sum = 0.0
            for reading in readings_and_wells:
                well_name = str(reading[0])
                measurement = reading[1]
                percent_error = (measurement - 2.85) / 2.85 * 100
                percent_error_dict[well_name] = percent_error
                percent_error_sum += percent_error
            avg_percent_error = percent_error_sum / 96.0
            standard_deviation = statistics.stdev(readings)
            try:
                cv = standard_deviation / avg
            except ZeroDivisionError:
                cv = 0.0
            cv_percent = cv * 100
            cv_dict[sample_plate_name] = {
                "CV": cv_percent,
                "Mean": avg,
                "SD": standard_deviation,
                "Avg Percent Error": avg_percent_error,
            }
        # Move Plate back to original location
        all_percent_error_dict[sample_plate_name] = percent_error_dict
        plate_reader.open_lid()
        protocol.comment(
            f"------plate {plate_for_plate_reader}. {cv_dict[sample_plate_name]}------"
        )
    helpers.move_labware_to_hs(protocol, sample_plate, h_s, h_s)
    if plate_reader_bool:
        protocol.move_labware(plate_for_plate_reader, "B3", use_gripper=True)
        i += 1
        # Print percent error dictionary
        protocol.comment("Percent Error: " + str(all_percent_error_dict))
        # Print cv dictionary
        protocol.comment("Plate Reader Result: " + str(cv_dict))

    """
    Here is where you can call the methods defined above to fit your specific
    protocol. The normal sequence is:
    """
    A_lysis(AL_total_vol, AL)
    bind(binding_buffer_vol)
    wash(wash1_vol, wash1)
    wash(wash2_vol, wash2)
    wash(wash3_vol, wash3)
    if not dry_run:
        drybeads = 10.0  # Number of minutes you want to dry for
    else:
        drybeads = 0.5
    for beaddry in np.arange(drybeads, 0, -0.5):
        protocol.delay(
            minutes=0.5,
            msg="There are " + str(beaddry) + " minutes left in the drying step.",
        )
    elute(elution_vol)

    # Probe wells
    end_wells_with_liquid = [
        waste_reservoir.wells()[0],
    ]
    m1000.reset_tipracks()
    helpers.clean_up_plates(m1000, [res1, elutionplate], waste_reservoir["A1"], 1000)
    helpers.find_liquid_height_of_all_wells(protocol, m1000, end_wells_with_liquid)
    if deactivate_modules_bool:
        helpers.deactivate_modules(protocol)
