from dataclasses import dataclass
from typing import Any, Optional, Union
from opentrons.protocol_api import SINGLE, COLUMN, PARTIAL_COLUMN, ROW, ALL

metadata = {
    "protocolName": "Basic flex RTP template",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.20",
}

####### RTP DEFINITIONS #######
# NozzleConfigurationType is from opentrons.hardware_control.nozzle_manager import NozzleConfigurationType
# do not want to import that as that interface or location might change
# type is not in shared-data
# cannot do the below
# ApiTipConfigType = Union[SINGLE, COLUMN, PARTIAL_COLUMN, ROW]


@dataclass
class PartialTipConfig:
    """Dataclass to hold a partial tip configuration descriptively."""

    key: str
    description: str
    starting_tip: str
    starting_nozzle: str
    api_tip_config: Any
    api_start: str
    api_end: Optional[str]

    def __str__(self):
        return (
            f"🔑 Key: {self.key} | 📝 Description: {self.description} | "
            f"💉 Starting Tip: {self.starting_tip} | 🔧 Starting Nozzle: {self.starting_nozzle} | "
            f"📜 API Tip Config: {self.api_tip_config} | 🚀 API Start: {self.api_start} | "
            f"🛑 API End: {self.api_end if self.api_end else 'None'}"
        )


#### Define all viable partial tip configurations.

# flex_96channel_1000 SINGLE
# names and descriptions describe where relative to the tiprack the pipette will pick up tips

ninety_six_single_back_left = PartialTipConfig(
    key="ninety_six_single_back_left",
    description="96 single picking up back left of tiprack",
    starting_tip="A1",
    starting_nozzle="H12",
    api_tip_config=SINGLE,
    api_start="H12",
    api_end=None,
)

ninety_six_single_back_right = PartialTipConfig(
    key="ninety_six_single_back_right",
    description="96 single picking up back right of tiprack",
    starting_tip="A12",
    starting_nozzle="H1",
    api_tip_config=SINGLE,
    api_start="H1",
    api_end=None,
)

ninety_six_single_front_left = PartialTipConfig(
    key="ninety_six_single_front_left",
    description="96 single picking up front left of tiprack",
    starting_tip="H1",
    starting_nozzle="A12",
    api_tip_config=SINGLE,
    api_start="A12",
    api_end=None,
)

ninety_six_single_front_right = PartialTipConfig(
    key="ninety_six_single_front_right",
    description="96 single picking up front right of tiprack",
    starting_tip="H12",
    starting_nozzle="A1",
    api_tip_config=SINGLE,
    api_start="A1",
    api_end=None,
)

# flex_96channel_1000 COLUMN

ninety_six_column_left = PartialTipConfig(
    key="ninety_six_column_left",
    description="96 column picking up left column of tiprack",
    starting_tip="Column 1",
    starting_nozzle="Column 12",
    api_tip_config=COLUMN,
    api_start="A12",
    api_end=None,
)


ninety_six_column_right = PartialTipConfig(
    key="ninety_six_column_right",
    description="96 column picking up right column of tiprack",
    starting_tip="Row 12",
    starting_nozzle="Row 1",
    api_tip_config=COLUMN,
    api_start="A1",
    api_end=None,
)

# flex_96channel_1000 ROW

ninety_six_row_back = PartialTipConfig(
    key="ninety_six_row_back",
    description="96 row picking up back row of tiprack",
    starting_tip="Row A",
    starting_nozzle="Row H",
    api_tip_config=ROW,
    api_start="H1",
    api_end=None,
)

ninety_six_row_front = PartialTipConfig(
    key="ninety_six_row_front",
    description="96 row picking up front row of tiprack",
    starting_tip="Row H",
    starting_nozzle="Row A",
    api_tip_config=ROW,
    api_start="A1",
    api_end=None,
)

# 8 channel SINGLE
eight_single = PartialTipConfig(
    key="eight_single",
    description="8 channel single picking up from the back left of the tiprack",
    starting_tip="A1",
    starting_nozzle="H1",
    api_tip_config=SINGLE,
    api_start="H1",
    api_end=None,
)

# PARTIAL_COLUMN
eight_partial_back_7_tips = PartialTipConfig(
    key="eight_partial_back_7_tips",
    description="8 channel picking up 7 tips",
    starting_tip="H1",
    starting_nozzle="B1",
    api_tip_config=PARTIAL_COLUMN,
    api_start="H1",
    api_end="B1",
)

eight_partial_back_6_tips = PartialTipConfig(
    key="eight_partial_back_6_tips",
    description="8 channel picking up 6 tips",
    starting_tip="H1",
    starting_nozzle="C1",
    api_tip_config=PARTIAL_COLUMN,
    api_start="H1",
    api_end="C1",
)
eight_partial_back_5_tips = PartialTipConfig(
    key="eight_partial_back_5_tips",
    description="8 channel picking up 5 tips",
    starting_tip="H1",
    starting_nozzle="D1",
    api_tip_config=PARTIAL_COLUMN,
    api_start="H1",
    api_end="D1",
)
eight_partial_back_4_tips = PartialTipConfig(
    key="eight_partial_back_4_tips",
    description="8 channel picking up 4 tips",
    starting_tip="H1",
    starting_nozzle="E1",
    api_tip_config=PARTIAL_COLUMN,
    api_start="H1",
    api_end="E1",
)
eight_partial_back_3_tips = PartialTipConfig(
    key="eight_partial_back_3_tips",
    description="8 channel picking up 3 tips",
    starting_tip="H1",
    starting_nozzle="F1",
    api_tip_config=PARTIAL_COLUMN,
    api_start="H1",
    api_end="F1",
)

eight_partial_back_2_tips = PartialTipConfig(
    key="eight_partial_back_2_tips",
    description="8 channel picking up 2 tips",
    starting_tip="H1",
    starting_nozzle="G1",
    api_tip_config=PARTIAL_COLUMN,
    api_start="H1",
    api_end="G1",
)

no_tip_config = PartialTipConfig(
    key="no_tip_config",
    description="Will discard and not set a partial tip config",
    starting_tip="",
    starting_nozzle="",
    api_tip_config=ALL,
    api_start="",
    api_end="",
)

# make a list of all the partial tip configurations

all_partial_configs = [
    ninety_six_single_back_left,
    ninety_six_single_back_right,
    ninety_six_single_front_left,
    ninety_six_single_front_right,
    ninety_six_column_left,
    ninety_six_column_right,
    ninety_six_row_back,
    ninety_six_row_front,
    eight_single,
    eight_partial_back_2_tips,
    eight_partial_back_3_tips,
    eight_partial_back_4_tips,
    eight_partial_back_5_tips,
    eight_partial_back_6_tips,
    eight_partial_back_7_tips,
    no_tip_config,
]


def find_partial_tip_config(key: str) -> Optional[PartialTipConfig]:
    """Find a partial tip config by key."""
    for config in all_partial_configs:
        if config.key == key:
            return config
    raise ValueError(f"Could not find partial tip config with key {key}")


reservoir_choices = [
    {
        "display_name": "Agilent Reservoir 290 mL",
        "value": "agilent_1_reservoir_290ml",
    },
    {
        "display_name": "Axygen Reservoir 90 mL",
        "value": "axygen_1_reservoir_90ml",
    },
    {
        "display_name": "nest_12_reservoir_15ml",
        "value": "nest_12_reservoir_15ml",
    },
    {
        "display_name": "Nest Reservoir 195 mL",
        "value": "nest_1_reservoir_195ml",
    },
    {
        "display_name": "Nest Reservoir 290 mL",
        "value": "nest_1_reservoir_290ml",
    },
    {
        "display_name": "usa..._12_reservoir_22ml",
        "value": "usascientific_12_reservoir_22ml",
    },
]

position_choices = [
    {"display_name": "A1", "value": "A1"},
    {"display_name": "A2", "value": "A2"},
    {"display_name": "A3", "value": "A3"},
    {"display_name": "B1", "value": "B1"},
    {"display_name": "B2", "value": "B2"},
    {"display_name": "B3", "value": "B3"},
    {"display_name": "C1", "value": "C1"},
    {"display_name": "C2", "value": "C2"},
    {"display_name": "C3", "value": "C3"},
    {"display_name": "D1", "value": "D1"},
    {"display_name": "D2", "value": "D2"},
    {"display_name": "D3", "value": "D3"},
]


def add_parameters(parameters):
    parameters.add_str(
        display_name="Partial Tip Configuration",
        variable_name="partial_tip_config_key",
        default="ninety_six_single_back_left",
        description="Partial tip configurations described by pickup nozzle and tip count",
        choices=[  # value of each choice maps to the key of the partial tip config dataclass we defined
            {"display_name": "96 SINGLE nozzle H12", "value": "ninety_six_single_back_left"},
            {"display_name": "96 SINGLE nozzle H1", "value": "ninety_six_single_back_right"},
            {"display_name": "96 SINGLE nozzle A12", "value": "ninety_six_single_front_left"},
            {"display_name": "96 SINGLE nozzle A1", "value": "ninety_six_single_front_right"},
            {"display_name": "96 COLUMN 1", "value": "ninety_six_column_left"},
            {"display_name": "96 COLUMN 12", "value": "ninety_six_column_right"},
            {"display_name": "96 ROW A", "value": "ninety_six_row_back"},
            {"display_name": "96 ROW H", "value": "ninety_six_row_front"},
            {"display_name": "8 SINGLE", "value": "eight_single"},
            {"display_name": "8 PARTIAL 2 tips", "value": "eight_partial_back_2_tips"},
            {"display_name": "8 PARTIAL 3 tips", "value": "eight_partial_back_3_tips"},
            {"display_name": "8 PARTIAL 4 tips", "value": "eight_partial_back_4_tips"},
            {"display_name": "8 PARTIAL 5 tips", "value": "eight_partial_back_5_tips"},
            {"display_name": "8 PARTIAL 6 tips", "value": "eight_partial_back_6_tips"},
            {"display_name": "8 PARTIAL 7 tips", "value": "eight_partial_back_7_tips"},
            {"display_name": "No Partial tip config", "value": "no_tip_config"},
        ],
    )

    parameters.add_str(
        display_name="Pipette",
        variable_name="pipette_load_name",
        choices=[
            {
                "display_name": "50µl single channel",
                "value": "flex_1channel_50",
            },
            {
                "display_name": "1000µl single channel",
                "value": "flex_1channel_1000",
            },
            {
                "display_name": "50µl 8 channel",
                "value": "flex_8channel_50",
            },
            {
                "display_name": "1000µl 8 channel",
                "value": "flex_8channel_1000",
            },
            {
                "display_name": "96-Channel Pipette",
                "value": "flex_96channel_1000",
            },
        ],
        default="flex_96channel_1000",
        description="Select the pipette type",
    )

    parameters.add_str(
        display_name="Tip Rack",
        variable_name="tiprack_load_name",
        choices=[
            {
                "display_name": "1000µl Filter Tip Rack",
                "value": "opentrons_flex_96_filtertiprack_1000ul",
            },
            {
                "display_name": "1000µl Standard Tip Rack",
                "value": "opentrons_flex_96_tiprack_1000ul",
            },
            {
                "display_name": "200µl Standard Tip Rack",
                "value": "opentrons_flex_96_tiprack_200ul",
            },
            {
                "display_name": "200µl Filter Tip Rack",
                "value": "opentrons_flex_96_filtertiprack_200ul",
            },
            {
                "display_name": "50µl Filter Tip Rack",
                "value": "opentrons_flex_96_filtertiprack_50ul",
            },
            {
                "display_name": "50µl Standard Tip Rack",
                "value": "opentrons_flex_96_tiprack_50ul",
            },
        ],
        default="opentrons_flex_96_tiprack_1000ul",
        description="Select the tip rack type",
    )

    parameters.add_str(
        display_name="Pipette Mount",
        variable_name="pipette_mount",
        choices=[
            {"display_name": "left", "value": "left"},
            {"display_name": "right", "value": "right"},
        ],
        default="left",
        description="Select the pipette mount.",
    )

    parameters.add_str(
        display_name="Reservoir A",
        variable_name="reservoir_a_load_name",
        choices=reservoir_choices,
        default="nest_1_reservoir_290ml",
        description="Select the reservoir type",
    )

    parameters.add_str(
        display_name="Reservoir B",
        variable_name="reservoir_b_load_name",
        choices=reservoir_choices,
        default="nest_1_reservoir_290ml",
        description="Select the reservoir type",
    )

    parameters.add_str(
        display_name="Tiprack Position",
        variable_name="tiprack_position",
        default="B2",
        description="Select the position of the tiprack",
        choices=position_choices,
    )

    parameters.add_str(
        display_name="Reservoir A Position",
        variable_name="reservoir_a_position",
        default="C1",
        description="Select the position of reservoir A",
        choices=position_choices,
    )

    parameters.add_str(
        display_name="Reservoir B Position",
        variable_name="reservoir_b_position",
        default="D1",
        description="Select the position of reservoir B",
        choices=position_choices,
    )


####### END RTP DEFINITIONS #######


def set_configure_nozzle_layout(ctx, pipette, tipracks, tip_config):
    """Convenience function to set the nozzle layout of a pipette
    with the given tip config we have mapped to a RTP."""
    ctx.comment(f"Setting nozzle layout for {pipette}")
    ctx.comment(f"Tip config: {tip_config}")
    if tip_config.api_end:
        pipette.configure_nozzle_layout(
            style=tip_config.api_tip_config, start=tip_config.api_start, end=tip_config.api_end, tip_racks=tipracks
        )
    else:
        pipette.configure_nozzle_layout(style=tip_config.api_tip_config, start=tip_config.api_start, tip_racks=tipracks)


def comment_tip_rack_status(ctx, tip_rack):
    """
    Print out the tip status for each row in a tip rack.
    Each row (A-H) will print the well statuses for columns 1-12 in a single comment,
    with a '🟢' for present tips and a '❌' for missing tips.
    """
    range_A_to_H = [chr(i) for i in range(ord("A"), ord("H") + 1)]
    range_1_to_12 = range(1, 13)

    ctx.comment(f"Tip rack in {tip_rack.parent}")

    for row in range_A_to_H:
        status_line = f"{row}: "
        for col in range_1_to_12:
            well = f"{row}{col}"
            has_tip = tip_rack.wells_by_name()[well].has_tip
            status_emoji = "🟢" if has_tip else "❌"
            status_line += f"{well} {status_emoji}  "

        # Print the full status line for the row
        ctx.comment(status_line)


### Helper functions


def is_tip_rack_empty(tip_rack):
    """
    Check if a tip rack is completely empty.

    Args:
        tip_rack: An Opentrons tip rack labware object

    Returns:
        bool: True if the tip rack has no tips, False if it has at least one tip
    """
    range_A_to_H = [chr(i) for i in range(ord("A"), ord("H") + 1)]
    range_1_to_12 = range(1, 13)

    for row in range_A_to_H:
        for col in range_1_to_12:
            well = f"{row}{col}"
            if tip_rack.wells_by_name()[well].has_tip:
                return False

    return True


def is_missing_tips(tip_rack):
    """
    Check if a tip rack is missing any tips.

    Args:
        tip_rack: An Opentrons tip rack labware object

    Returns:
        bool: True if the tip rack is missing at least one tip, False if all tips are present
    """
    range_A_to_H = [chr(i) for i in range(ord("A"), ord("H") + 1)]
    range_1_to_12 = range(1, 13)

    for row in range_A_to_H:
        for col in range_1_to_12:
            well = f"{row}{col}"
            if not tip_rack.wells_by_name()[well].has_tip:
                return True

    return False


def using_96_channel(ctx) -> bool:
    """Check if a 96-channel pipette is loaded in the protocol."""
    for instrument in ctx.loaded_instruments.values():
        if instrument.channels == 96:
            ctx.comment("9️⃣6️⃣ channel pipette is loaded")
            return True
    return False


def run(ctx):
    trash = ctx.load_trash_bin("A3")  # must load trash bin
    # get the key from the parameters
    tip_config = find_partial_tip_config(ctx.params.partial_tip_config_key)
    pipette_load_name = ctx.params.pipette_load_name
    tiprack_load_name = ctx.params.tiprack_load_name
    tip_rack_position = ctx.params.tiprack_position
    pipette_mount = ctx.params.pipette_mount
    reservoir_a_load_name = ctx.params.reservoir_a_load_name
    reservoir_b_load_name = ctx.params.reservoir_b_load_name
    reservoir_a_position = ctx.params.reservoir_a_position
    reservoir_b_position = ctx.params.reservoir_b_position
    # print out the tip config
    ctx.comment(f"Running with {tip_config}")
    ctx.comment(f"Using pipette {pipette_load_name}")
    ctx.comment(f"Using tip rack {tiprack_load_name}")
    ctx.comment(f"Using pipette mount {pipette_mount}")
    ctx.comment(f"Using reservoir A {reservoir_a_load_name}")
    ctx.comment(f"Using reservoir B {reservoir_b_load_name}")
    ctx.comment(f"Using reservoir A position {reservoir_a_position}")
    ctx.comment(f"Using reservoir B position {reservoir_b_position}")
    # load the labware
    reservoir_a = ctx.load_labware(reservoir_a_load_name, reservoir_a_position)
    reservoir_b = ctx.load_labware(reservoir_b_load_name, reservoir_b_position)
    # example code on Flex for a pipette
    # comment shows we picked up the tips we expected
    if tip_config.key == "no_tip_config" and pipette_load_name == "flex_96channel_1000":
        tip_rack = ctx.load_labware(tiprack_load_name, tip_rack_position, adapter="opentrons_flex_96_tiprack_adapter")
    else:
        tip_rack = ctx.load_labware(tiprack_load_name, tip_rack_position)
    pipette = ctx.load_instrument(pipette_load_name, pipette_mount)
    # use this convenience function to set the nozzle layout
    set_configure_nozzle_layout(ctx=ctx, pipette=pipette, tipracks=[tip_rack], tip_config=tip_config)

    def how_much_to_pipette(tiprack_load_name):
        if "50" in tiprack_load_name:
            return 20
        else:
            return 100

    volume = how_much_to_pipette(tiprack_load_name)

    pipette.pick_up_tip()
    comment_tip_rack_status(ctx=ctx, tip_rack=tip_rack)
    ctx.comment("aspirate from reservoir A")
    pipette.aspirate(volume=volume, location=reservoir_a.wells()[0])
    ctx.comment("dispense to reservoir B")
    pipette.dispense(volume=volume, location=reservoir_b.wells()[0])
    ctx.comment("mixing in reservoir B")
    pipette.mix(repetitions=3, volume=volume / 2)
    ctx.comment("Aspirate from reservoir A")
    pipette.aspirate(volume=volume, location=reservoir_a.wells()[0])
    ctx.comment("Blow out in reservoir A")
    pipette.blow_out()
    ctx.comment("Aspirate from reservoir B")
    pipette.aspirate(volume=volume, location=reservoir_b.wells()[0])
    ctx.comment("air_gap with no argument in reservoir B")
    pipette.air_gap()
    pipette.drop_tip()
