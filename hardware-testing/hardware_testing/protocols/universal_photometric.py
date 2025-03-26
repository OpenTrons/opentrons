import os

from opentrons import protocol_api
from opentrons_shared_data.load import get_shared_data_root

metadata = {"protocolName": "96ch Universal Photometric Protocol"}
requirements = {"robotType": "Flex", "apiLevel": "2.20"}


def add_parameters(parameters):

    parameters.add_int(
        display_name="tip type",
        variable_name="tip_type",
        default=50,
        choices=[
            {"display_name": "20", "value": 20},
            {"display_name": "50", "value": 50},
            {"display_name": "200", "value": 200},
            {"display_name": "1000", "value": 1000},
        ],
        description="Select tip type",
    )

    parameters.add_int(
        display_name="model type",
        variable_name="model_type",
        default=200,
        choices=[
            {"display_name": "200", "value": 200},
            {"display_name": "1000", "value": 1000},
        ],
        description="Select model type.",
    )

    parameters.add_int(
        display_name="number of cycles",
        variable_name="cycles",
        default=5,
        minimum=1,
        maximum=50,
        description="Set number of cycles",
    )

    parameters.add_float(
        display_name="target volume min/max",
        variable_name="target_volume",
        default=1,
        minimum=0,
        maximum=1000,
        description="Set target aspirate volume.",
    )

    parameters.add_float(
        display_name="conditioning volume",
        variable_name="conditioning_volume",
        default=0,
        minimum=0,
        maximum=1000,
        description="Set conditioning aspirate volume.",
    )

    parameters.add_int(
        display_name="aspirate flow rate min/max",
        variable_name="asp_flow_rate",
        default=22,
        minimum=1,
        maximum=200,
        description="Set aspirate flow rate.\n200:\nT20 - 6.5\nT50 - 14\nT200 - 15\n\n1K:\nT20 - 6\nT50 - 6\nT200 - 80\nT1K - 160",
    )

    parameters.add_int(
        display_name="dispense flow rate min/max",
        variable_name="disp_flow_rate",
        default=22,
        minimum=1,
        maximum=200,
        description="Set dispense flow rate.\n200:\nT20 - 6.5\nT50 - 14\nT200 - 15\n\n1K:\nT20 - 6\nT50 - 6\nT200 - 80\nT1K - 160",
    )

    parameters.add_int(
        display_name="blowout flow rate min/max",
        variable_name="blowout_flow_rate",
        default=22,
        minimum=1,
        maximum=200,
        description="Set blowout flow rate.\n200:\nT20 - 10\nT50 - 14\nT200 - 10\n\n1K:\nT20 - 80\nT50 - 80\nT200 - 80\nT1K - 80",
    )

    parameters.add_float(
        display_name="push out min/max",
        variable_name="push_out",
        default=3.5,
        minimum=1,
        maximum=10,
        description="Set push out volume.",
    )

    parameters.add_int(
        display_name="aspirate submerge speed",
        variable_name="asp_submerge_speed",
        default=50,
        minimum=1,
        maximum=100,
        description="Set aspirate submerge speed.",
    )

    parameters.add_int(
        display_name="dispense submerge speed",
        variable_name="disp_submerge_speed",
        default=50,
        minimum=1,
        maximum=100,
        description="Set dispense submerge speed.",
    )

    parameters.add_int(
        display_name="aspirate exit speed",
        variable_name="asp_exit_speed",
        default=50,
        minimum=1,
        maximum=100,
        description="Set aspirate exit speed.",
    )

    parameters.add_int(
        display_name="dispense exit speed",
        variable_name="disp_exit_speed",
        default=50,
        minimum=1,
        maximum=100,
        description="Set dispense exit speed.",
    )

    parameters.add_float(
        display_name="aspirate_submerge_depth",
        variable_name="asp_sub_depth",
        default=1.5,
        minimum=0,
        maximum=5,
        description="Set aspirate submerge depth.",
    )

    parameters.add_float(
        display_name="dispense_submerge_depth",
        variable_name="disp_sub_depth",
        default=1.5,
        minimum=0,
        maximum=5,
        description="Set dispense submerge depth.",
    )
    parameters.add_float(
        display_name="Dye volume",
        variable_name="dye_volume",
        default=40000,
        minimum=20000,
        maximum=290000,
        description="Set uL of Dye in the Reservoir.",
    )

    parameters.add_bool(
        variable_name="lld",
        display_name="enable lld",
        description=("Use LLD to detect liquid height."),
        default=False,
    )

    parameters.add_float(
        display_name="submerged delay time",
        variable_name="submerged_delay_time",
        default=0,
        minimum=0,
        maximum=60,
        description="Set submerged delay time.",
    )

    parameters.add_bool(
        variable_name="pause_after_asp",
        display_name="pause after aspirate",
        description=("Pause protocol after aspiration."),
        default=True,
    )

    parameters.add_str(
        variable_name="reservoir_labware_loadname",
        display_name="Source labware load name.",
        description=("Load name of the source labware."),
        default="nest_1_reservoir_195ml",
    )
    parameters.add_str(
        variable_name="destination_labware_loadname",
        display_name="Destination labware load name.",
        description=("Load name of the destination labware."),
        default="corning_96_wellplate_360ul_flat",
    )


def _find_latest_labware_version(loadname: str) -> int:
    latest = sorted(os.listdir(f"{get_shared_data_root()}/labware/definitions/3/{loadname}/"))[-1]
    return int(latest[0])


def _get_height_after_liquid_handling(
    labware: protocol_api.Labware,
    height_before: float,
    volume: float,
) -> float:
    well_core = labware._core.get_well_core("A1")
    geometry = well_core._engine_client.state.geometry
    labware_id = well_core.labware_id
    well_name = well_core._name

    return geometry.get_well_height_after_volume(
        labware_id=labware_id,
        well_name=well_name,
        initial_height=height_before,
        volume=volume,
    )


def _get_well_volume_at_height(
    labware: protocol_api.Labware,
    height: float,
) -> float:
    well_core = labware._core.get_well_core("A1")
    geometry = well_core._engine_client.state.geometry
    labware_id = well_core.labware_id
    well_name = well_core._name

    return geometry.get_well_volume_at_height(
        labware_id=labware_id,
        well_name=well_name,
        height=height,
    )


def run(ctx: protocol_api.ProtocolContext) -> None:
    """Run."""

    ctx.load_trash_bin("A3")

    # tips
    tips = ctx.load_labware(
        f"opentrons_flex_96_tiprack_{ctx.params.tip_type}uL",
        location="D1",
        adapter="opentrons_flex_96_tiprack_adapter",
    )
    # pipette
    pip = ctx.load_instrument(
        f"flex_96channel_{ctx.params.model_type}", "left", tip_racks=[tips]
    )

    # dye source
    src_labware_version = _find_latest_labware_version(loadname=ctx.params.soure_labware_loadname)
    dye_source = ctx.load_labware(ctx.params.soure_labware_loadname, "D2", version=src_labware_version)
    dye = ctx.define_liquid(
        name="Dye",
        description="Food Coloring",
        display_color="#FF0000",
    )
    dye_source["A1"].load_liquid(dye, ctx.params.dye_volume)

    # destination plate
    plate_labware_version = _find_latest_labware_version(loadname=ctx.params.destination_labware_loadname)
    plate = ctx.load_labware(ctx.params.destination_labware_loadname, location="D3", version=plate_labware_version)

    # liquid probe and make sure there is enough volume for all 5 trials
    if ctx.params.lld:
        # Measuring aspirate height relative to the top of the reservoir
        src_liquid_height = pip.measure_liquid_height(dye_source["A1"])

        actual_starting_dye_volume = _get_well_volume_at_height(
            labware=dye_source, height=src_liquid_height
        )
        needed_starting_dye_volume = 96 * ctx.params.cycles * ctx.params.target_volume
        # note: maybe we wanna make sure that the actual volume is some number above the needed value ?
        if actual_starting_dye_volume <= needed_starting_dye_volume:
            raise ValueError(
                f"Need {needed_starting_dye_volume} uL dye to start. Only {actual_starting_dye_volume} uL detected."
            )

    # Set aspirate, dispense, and blow out flow rates
    pip.flow_rate.aspirate = ctx.params.asp_flow_rate
    pip.flow_rate.dispense = ctx.params.disp_flow_rate
    pip.flow_rate.blow_out = ctx.params.blowout_flow_rate

    def _get_liquid_handling_height(
        labware: protocol_api.Labware, 
        current_labware_volume: float, # the volume that's currently in the labware
        operation_volume: float, # the volume to be aspirated/dispensed
    ) -> float:
        """Get the desired height above the bottom of the well to aspirate/dispense at."""

        # Update meniscus height using lld, otherwise use loaded liquid to calculate liquid height
        if ctx.params.lld:
            # Measuring aspirate height relative to the top of the reservoir
            src_liquid_height = pip.measure_liquid_height(labware["A1"])
        else:
            src_liquid_height = _get_well_height_at_volume(labware=labware, volume=current_labware_volume)

        try:
            target_pos = _get_height_after_liquid_handling(
                labware=labware,
                height_before=src_liquid_height,
                volume=operation_volume,
            )
        except Exception:
            target_pos = labware["A1"].bottom(z=1.0)
        else:
            target_pos = max(target_pos, 1.0)
        return target_pos

    current_src_volume = ctx.params.dye_volume
    current_plate_volume = 0
    for i in range(ctx.params.cycles):

        pip.pick_up_tip(tips["A1"])

        aspirate_pos = _get_liquid_handling_height(
            labware=dye_source, current_labware_volume=current_src_volume, opreration_volume=-ctx.params.target_volume
        )

        # Move above reservoir
        pip.move_to(location=dye_source["A1"].top())
        # Move to aspirate position at aspirate submerge speed
        pip.move_to(
            location=dye_source["A1"].bottom(aspirate_pos),
            speed=ctx.params.asp_sub_depth,
        )

        # Submerged delay time
        ctx.delay(seconds=ctx.params.submerged_delay_time)
        # Aspirate in place
        pip.aspirate(
            volume=ctx.params.target_volume + ctx.params.conditioning_volume,
            location=None,
        )
        current_src_volume -= aspirate_volume
        # Dispense conditioning volume, if any, while submerged
        if ctx.params.conditioning_volume:
            pip.dispense(volume=ctx.params.conditioning_volume, location=None)
        # Exit liquid from aspirate position at aspirate exit speed
        pip.move_to(location=dye_source["A1"].top(), speed=ctx.params.asp_exit_speed)
        # Retract pipette
        pip._retract()
        # Pause after aspiration
        if ctx.params.pause_after_asp:
            ctx.pause()

        # Dispense position
        dispense_pos = _get_liquid_handling_height(
            labware=plate, current_labware_volume=current_plate_volume, operation_volume=ctx.params.target_volume
        )
        # Move to plate
        pip.move_to(location=plate["A1"].top())
        # Move to dispense position at dispense submerge speed
        pip.move_to(
            location=plate["A1"].bottom(dispense_pos),
            speed=ctx.params.disp_submerge_speed,
        )
        # Dispense
        pip.dispense(
            volume=ctx.params.target_volume, location=None, push_out=ctx.params.push_out
        )
        current_plate_volume += ctx.params.target_volume
        # Exit liquid from dispense position at dispense exit speed
        pip.move_to(location=plate["A1"].top(), speed=ctx.params.disp_exit_speed)
        # Perform blow out
        pip.blow_out()
        # Return tip to tip rack
        pip.return_tip()
        # Retract pipette
        pip._retract()
        # Pause protocol
        ctx.pause()
