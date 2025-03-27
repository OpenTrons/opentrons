"""Universal photometric test."""
import os
from typing import Tuple

from opentrons import protocol_api
from opentrons.protocol_engine.errors.exceptions import InvalidLiquidHeightFound
from opentrons_shared_data.load import get_shared_data_root
from ..gravimetric.liquid_class import defaults

metadata = {"protocolName": "96ch Universal Photometric Protocol"}
requirements = {"robotType": "Flex", "apiLevel": "2.20"}

DYE_RESERVOIR_DEAD_VOLUME = 10000  # 10k uL

TIPRACK_LOCATIONS = ["D1", "C1", "C2", "C3", "B1"]


def add_parameters(parameters: protocol_api.ParameterContext) -> None:
    """Add test parameters."""
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
        maximum=100,
        description="Set number of cycles",
    )

    parameters.add_float(
        display_name="target volume",
        variable_name="target_volume",
        default=5,
        minimum=0,
        maximum=1000,
        description="Set target aspirate volume.",
    )

    parameters.add_bool(
        variable_name="lld",
        display_name="enable lld",
        description=("Use LLD to detect liquid height."),
        default=True,
    )
    parameters.add_int(
        variable_name="number_of_tipracks",
        display_name="Number of tipracks",
        description="Choose 1 or 5 tipracks to load at the start.",
        default=1,
    )

    parameters.add_bool(
        variable_name="use_pip_motion_defaults",
        display_name="Use pipette motion defaults",
        description="Use default values for pipette motion.",
        default=True,
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
        description="Set aspirate flow rate.",
    )

    parameters.add_int(
        display_name="dispense flow rate min/max",
        variable_name="disp_flow_rate",
        default=22,
        minimum=1,
        maximum=200,
        description="Set dispense flow rate",
    )

    parameters.add_int(
        display_name="blowout flow rate min/max",
        variable_name="blowout_flow_rate",
        default=22,
        minimum=1,
        maximum=200,
        description="Set blowout flow rate.",
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
        choices=[
            {"display_name": "NEST 195mL", "value": "nest_1_reservoir_195ml"},
            {"display_name": "NEST 290mL", "value": "nest_1_reservoir_290ml"},
            {"display_name": "None", "value": "none"},
        ],
        default="nest_1_reservoir_195ml",
    )
    parameters.add_str(
        variable_name="destination_labware_loadname",
        display_name="Destination labware load name.",
        description=("Load name of the destination labware."),
        choices=[
            {
                "display_name": "Corning 96 360uL flat",
                "value": "corning_96_wellplate_360ul_flat",
            },
            {"display_name": "None", "value": "none"},
        ],
        default="corning_96_wellplate_360ul_flat",
        # note: add new plate here
    )


def _find_latest_labware_version(loadname: str) -> int:
    latest = sorted(
        os.listdir(f"{get_shared_data_root()}/labware/definitions/3/{loadname}/")
    )[-1]
    return int(latest[0])


def _get_height_after_liquid_handling(
    labware: protocol_api.Labware,
    height_before: float,
    volume: float,
) -> float:
    """Get height after liquid handling fr 96 channel pipetting."""
    well_core = labware._core.get_well_core("A1")
    geometry = well_core._engine_client.state.geometry  # type: ignore [attr-defined]
    labware_id = well_core.labware_id  # type: ignore [attr-defined]
    well_name = well_core._name  # type: ignore [attr-defined]

    try:
        return geometry.get_well_height_after_volume(
            labware_id=labware_id,
            well_name=well_name,
            initial_height=height_before,
            volume=volume,
        )
    except InvalidLiquidHeightFound:
        raise ValueError(f"called with height before = {height_before} vol = {volume}")


def _get_well_volume_at_height(
    labware: protocol_api.Labware,
    height: float,
) -> float:
    well_core = labware._core.get_well_core("A1")
    geometry = well_core._engine_client.state.geometry  # type: ignore [attr-defined]
    labware_id = well_core.labware_id  # type: ignore [attr-defined]
    well_name = well_core._name  # type: ignore [attr-defined]

    return geometry.get_well_volume_at_height(
        labware_id=labware_id,
        well_name=well_name,
        height=height,
    )


def _get_well_height_at_volume(
    labware: protocol_api.Labware,
    volume: float,
) -> float:
    well_core = labware._core.get_well_core("A1")
    geometry = well_core._engine_client.state.geometry  # type: ignore [attr-defined]
    labware_id = well_core.labware_id  # type: ignore [attr-defined]
    well_name = well_core._name  # type: ignore [attr-defined]

    return geometry.get_well_height_at_volume(
        labware_id=labware_id,
        well_name=well_name,
        volume=volume,
    )


def _get_current_liquid_height(labware: protocol_api.Labware) -> float:
    source_core = labware._core.get_well_core("A1")
    source_core_geometry = source_core._engine_client.state.geometry  # type: ignore [attr-defined]
    source_labware_id = source_core._labware_id  # type: ignore [attr-defined]
    source_well_name = source_core._name  # type: ignore [attr-defined]
    return source_core_geometry.get_meniscus_height(source_labware_id, source_well_name)


def run(ctx: protocol_api.ProtocolContext) -> None:
    """Run."""
    ctx.load_trash_bin("A3")

    # tips
    tipracks = [
        ctx.load_labware(
            f"opentrons_flex_96_tiprack_{ctx.params.tip_type}uL",  # type: ignore [attr-defined]
            location=deck_slot,
            adapter="opentrons_flex_96_tiprack_adapter",
        )
        for deck_slot in TIPRACK_LOCATIONS
    ]

    def _get_tiprack(trial_number: int) -> protocol_api.Labware:
        if ctx.params.number_of_tipracks == 1:  # type: ignore [attr-defined]
            return tipracks[0]
        return tipracks[trial_number]

    # pipette
    pip = ctx.load_instrument(
        f"flex_96channel_{ctx.params.model_type}",  # type: ignore [attr-defined]
        "left",
        tip_racks=tipracks,
    )

    # dye source
    src_labware_version = _find_latest_labware_version(
        loadname=ctx.params.reservoir_labware_loadname  # type: ignore [attr-defined]
    )
    dye_source = ctx.load_labware(
        ctx.params.reservoir_labware_loadname,  # type: ignore [attr-defined]
        "D2",
        version=src_labware_version,  # type: ignore [attr-defined]
    )
    dye = ctx.define_liquid(
        name="Dye",
        description="Food Coloring",
        display_color="#FF0000",
    )
    if not ctx.params.lld:  # type: ignore [attr-defined]
        dye_source["A1"].load_liquid(dye, ctx.params.dye_volume)  # type: ignore [attr-defined]

    # destination plate
    plate_labware_version = _find_latest_labware_version(
        loadname=ctx.params.destination_labware_loadname  # type: ignore [attr-defined]
    )
    plate = ctx.load_labware(
        ctx.params.destination_labware_loadname,  # type: ignore [attr-defined]
        location="D3",
        version=plate_labware_version,
    )
    diluent = ctx.define_liquid(
        name="Diluent",
        description="Food Coloring",
        display_color="#FE0000",
    )
    diluent_volume = 200 - ctx.params.target_volume  # type: ignore [attr-defined]
    dye_source["A1"].load_liquid(diluent, diluent_volume)  # type: ignore [attr-defined]

    def _validate_dye_liquid_height() -> float:

        liquid_height_valid = False
        retrying = False
        nonlocal dye_source
        while not liquid_height_valid:
            # liquid probe and make sure there is enough volume for all trials
            if ctx.params.lld or retrying:  # type: ignore [attr-defined]
                # if this detects no liquid, the protocol will exit
                # if it detects liquid that is lower than expected, it will let you
                # try again.
                pip.detect_liquid_presence(dye_source["A1"])

            src_liquid_height = _get_current_liquid_height(dye_source)

            actual_starting_dye_volume = _get_well_volume_at_height(
                labware=dye_source, height=src_liquid_height
            )
            needed_starting_dye_volume = (
                96
                * ctx.params.cycles  # type: ignore [attr-defined]
                * ctx.params.target_volume  # type: ignore [attr-defined]
            ) + DYE_RESERVOIR_DEAD_VOLUME
            # note: want to acct for needed dead volume here
            if actual_starting_dye_volume > needed_starting_dye_volume:
                liquid_height_valid = True
            else:
                pip._retract()
                ctx.pause(
                    f"Need {round(needed_starting_dye_volume, 2)} uL dye to start. \
                     Only {round(actual_starting_dye_volume, 2)} uL detected. Refill and try again."
                )
                retrying = True
        return src_liquid_height

    def _set_pipettte_motion_settings() -> Tuple[float, float, float, float, float]:
        if ctx.params.use_pip_motion_defaults:  # type: ignore [attr-defined]
            aspirate_submerge_speed = 50
            dispense_submerge_speed = 50
            aspirate_exit_speed = 50
            dispense_exit_speed = 50
            liquid_class = defaults.get_liquid_class(
                pipette=ctx.params.model_type,  # type: ignore [attr-defined]
                channels=96,
                tip=ctx.params.tip_type,  # type: ignore [attr-defined]
                volume=ctx.params.target_volume,  # type: ignore [attr-defined]
            )
            pip.flow_rate.aspirate = liquid_class.aspirate.plunger_flow_rate
            pip.flow_rate.dispense = liquid_class.dispense.plunger_flow_rate
            set_push_out = liquid_class.dispense.blow_out_submerged
        else:
            set_push_out = ctx.params.push_out  # type: ignore [attr-defined]
            pip.flow_rate.aspirate = ctx.params.asp_flow_rate  # type: ignore [attr-defined]
            pip.flow_rate.dispense = ctx.params.disp_flow_rate  # type: ignore [attr-defined]
            pip.flow_rate.blow_out = ctx.params.blowout_flow_rate  # type: ignore [attr-defined]
            aspirate_submerge_speed = ctx.params.asp_submerge_speed  # type: ignore [attr-defined]
            dispense_submerge_speed = ctx.params.disp_submerge_speed  # type: ignore [attr-defined]
        return (
            aspirate_submerge_speed,
            aspirate_exit_speed,
            dispense_submerge_speed,
            dispense_exit_speed,
            set_push_out,
        )

    (
        aspirate_submerge_speed,
        aspirate_exit_speed,
        dispense_submerge_speed,
        dispense_exit_speed,
        set_push_out,
    ) = _set_pipettte_motion_settings()
    current_src_volume = ctx.params.dye_volume  # type: ignore [attr-defined]
    current_plate_volume = 0
    for i in range(ctx.params.cycles):  # type: ignore [attr-defined]
        tips = _get_tiprack(i)
        pip.pick_up_tip(tips["A1"])

        if i == 0:
            source_liquid_height = _validate_dye_liquid_height()
        else:
            source_liquid_height = _get_well_height_at_volume(
                labware=dye_source, volume=current_src_volume
            )
        aspirate_pos = (
            _get_height_after_liquid_handling(
                labware=dye_source,
                height_before=source_liquid_height,
                volume=-(ctx.params.target_volume * 96),  # type: ignore [attr-defined]
            )
            - ctx.params.asp_sub_depth  # type: ignore [attr-defined]
        )
        aspirate_volume = (
            ctx.params.target_volume  # type: ignore [attr-defined]
            + ctx.params.conditioning_volume  # type: ignore [attr-defined]
        )
        # Move above reservoir
        pip.move_to(location=dye_source["A1"].top())
        # Move to aspirate position at aspirate submerge speed
        pip.move_to(
            location=dye_source["A1"].bottom(aspirate_pos),
            speed=aspirate_submerge_speed,
        )
        # Submerged delay time
        ctx.delay(seconds=ctx.params.submerged_delay_time)  # type: ignore [attr-defined]
        # Aspirate in place
        pip.aspirate(
            volume=aspirate_volume,
            location=None,
        )
        current_src_volume -= aspirate_volume  # type: ignore [attr-defined]
        # Dispense conditioning volume, if any, while submerged
        if ctx.params.conditioning_volume:  # type: ignore [attr-defined]
            pip.dispense(
                volume=ctx.params.conditioning_volume,  # type: ignore [attr-defined]
                location=None,
            )
        # Exit liquid from aspirate position at aspirate exit speed
        pip.move_to(
            location=dye_source["A1"].top(),
            speed=aspirate_exit_speed,
        )
        # Retract pipette
        pip._retract()
        # Pause after aspiration
        if ctx.params.pause_after_asp:  # type: ignore [attr-defined]
            ctx.pause("Inspect for dropouts.")
        # we'll always end up with 200 uL after dispensing
        dispense_pos = _get_well_height_at_volume(labware=plate, volume=200)

        # note: would probably be good to add a needed dead volume in this comparison
        dispense_submerge_depth = ctx.params.disp_sub_depth  # type: ignore [attr-defined]
        if dispense_submerge_depth >= dispense_pos:  # type: ignore [attr-defined]
            raise ValueError(
                f"submerge depth {dispense_submerge_depth} \
                too deep for dispense position {dispense_pos}"
            )
        dispense_pos -= ctx.params.disp_sub_depth  # type: ignore [attr-defined]
        # Move to plate
        pip.move_to(location=plate["A1"].top())
        # Move to dispense position at dispense submerge speed
        pip.move_to(
            location=plate["A1"].bottom(dispense_pos),
            speed=dispense_submerge_speed,
        )
        # Dispense
        pip.dispense(
            volume=ctx.params.target_volume,  # type: ignore [attr-defined]
            location=None,
            push_out=set_push_out,  # type: ignore [attr-defined]
        )
        current_plate_volume += ctx.params.target_volume  # type: ignore [attr-defined]
        # Exit liquid from dispense position at dispense exit speed
        pip.move_to(
            location=plate["A1"].top(),
            speed=dispense_exit_speed,
        )
        # Perform blow out
        pip.blow_out()
        # Return tip to tip rack
        pip.return_tip()
        # Retract pipette
        pip._retract()
        # Pause protocol
        ctx.pause("Replace tips and dispense plate.")
