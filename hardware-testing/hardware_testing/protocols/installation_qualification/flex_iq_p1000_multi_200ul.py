"""Flex IQ: P1000 Multi 200ul."""
from math import pi
from typing import List

from opentrons.protocol_api import ProtocolContext, InstrumentContext, Labware

metadata = {"protocolName": "Flex IQ: P1000 Multi 200ul"}
requirements = {"robotType": "Flex", "apiLevel": "2.15"}

# EDIT-START ------>>>>>>

ALLOW_TEST_PIPETTE_TO_TRANSFER_DILUENT = True
RETURN_TIP = True

TEST_VOLUME = 200  # TODO: add support for volumes >250uL (requires multi-dispensing)
TEST_PIPETTE = "p1000_multi_gen3"
TEST_TIPS = "opentrons_flex_96_tiprack_200uL"
TEST_SOURCES = [
    {
        "source": "A1",
        "destinations": ["A1", "A2", "A3", "A4", "A5", "A6"],
    },
    {
        "source": "A2",
        "destinations": ["A7", "A8", "A9", "A10", "A11", "A12"],
    },
]

# <<<<<<------ EDIT-STOP

SUBMERGE_MM = 1.5
RETRACT_MM = 5.0

DELAY_ASPIRATE = 1.0
DELAY_DISPENSE = 0.5

SRC_LABWARE_BY_CHANNELS = {
    1: "nest_96_wellplate_2ml_deep",
    8: "nest_12_reservoir_15ml",
    96: "nest_1_reservoir_195ml",
}

MIN_VOL_SRC = {
    "nest_96_wellplate_2ml_deep": 500,
    "nest_12_reservoir_15ml": 3000,
    "nest_1_reservoir_195ml": 30000,
}


class LiquidHeightInFlatBottomWell:
    def __init__(
        self,
        bottom_diameter: float,
        top_diameter: float,
        height: float,
        resolution_mm: float = 0.1,
    ) -> None:
        self._bottom_radius = bottom_diameter / 2
        self._top_radius = top_diameter / 2
        self._height = height
        self._resolution_mm = resolution_mm

    def _volume_of_frustum(self, surface_height: float, surface_radius: float) -> float:
        """Calculate the volume of a frustum given its height and radii."""
        a = pi * self._bottom_radius * surface_radius
        b = pi * surface_radius**2
        c = pi * self._bottom_radius**2
        return (a + b + c) * (surface_height / 3)

    def height_from_volume(self, volume: float) -> float:
        """Given the volume, compute the height of the liquid in the well."""
        _rad_diff = self._top_radius - self._bottom_radius
        low, high = 0, self._height
        while high - low > self._resolution_mm:
            mid = (low + high) / 2
            r_mid = self._bottom_radius + (mid / self._height) * _rad_diff
            if self._volume_of_frustum(mid, r_mid) < volume:
                low = mid
            else:
                high = mid
        return (low + high) / 2

    def volume_from_height(self, height: float) -> float:
        """Given the height, compute the volume of the liquid in the well."""
        _rel_height = height / self._height
        _rad_diff = self._top_radius - self._bottom_radius
        surface_radius = self._bottom_radius + _rad_diff * _rel_height
        return self._volume_of_frustum(height, surface_radius)


LIQUID_HEIGHT_LOOKUP = {
    "nest_1_reservoir_195ml": [(0, 0), (195000, 25)],
    "nest_12_reservoir_15ml": [
        (0, 0),
        (3000, 6.0),
        (3500, 7.0),
        (4000, 8.0),
        (5500, 10.5),
        (8000, 14.7),
        (10000, 18.0),
        (12600, 22.5),
        (15000, 26.85),  # full depth of well
    ],
    "nest_96_wellplate_2ml_deep": [
        (0, 0),
        (2000, 38),  # FIXME: create real lookup table
    ],
}


def _convert_ul_in_well_to_height_in_well(load_name: str, ul: float) -> float:
    if load_name in LIQUID_HEIGHT_LOOKUP:
        lookup = LIQUID_HEIGHT_LOOKUP[load_name]
        for i in range(len(lookup) - 1):
            low = lookup[i]
            high = lookup[i + 1]
            if low[0] <= ul <= high[0]:
                ul_scale = (ul - low[0]) / (high[0] - low[0])
                return (ul_scale * (high[1] - low[1])) + low[1]
    elif load_name == "corning_96_wellplate_360ul_flat":
        well = LiquidHeightInFlatBottomWell(
            bottom_diameter=6.35, top_diameter=6.858, height=10.668
        )
        return well.height_from_volume(ul)
    raise ValueError(f"unable to find height of {ul:.1} ul in {load_name}")


def _start_volumes_per_trial(
    volume: float, load_name: str, channels: int, trials: int
) -> List[float]:
    ul_per_aspirate = volume * channels
    ul_per_run = ul_per_aspirate * trials
    ul_at_start = ul_per_run + MIN_VOL_SRC[load_name]
    return [ul_at_start - (ul_per_aspirate * i) for i in range(trials)]


def _end_volumes_per_trial(
    volume: float, load_name: str, channels: int, trials: int
) -> List[float]:
    return [
        ul - (volume * channels)
        for ul in _start_volumes_per_trial(volume, load_name, channels, trials)
    ]


def _dye_start_volumes_per_trial(
    load_name: str, channels: int, trials: int
) -> List[float]:
    return _start_volumes_per_trial(TEST_VOLUME, load_name, channels, trials)


def _diluent_start_volumes_per_trial(load_name: str, trials: int) -> List[float]:
    return _start_volumes_per_trial(max(200 - TEST_VOLUME, 0), load_name, 8, trials)


def _assign_starting_volumes_dye(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    reservoir: Labware,
) -> None:
    dye = ctx.define_liquid(
        name="Dye",
        description="Dye",
        display_color="#FF0000",
    )
    for test in TEST_SOURCES:
        src_ul_per_trial = _dye_start_volumes_per_trial(
            reservoir.load_name, pipette.channels, len(test["destinations"])
        )
        first_trial_ul = src_ul_per_trial[0]
        reservoir[test["source"]].load_liquid(dye, first_trial_ul)


def _assign_starting_volumes_diluent(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    reservoir: Labware,
) -> None:
    if TEST_VOLUME >= 200:
        return
    diluent = ctx.define_liquid(
        name="Diluent",
        description="Diluent",
        display_color="#0000FF",
    )
    if pipette.channels == 1:
        num_transfers_per_source_well = 1
    else:
        num_transfers_per_source_well = 6
    source_wells = ["A11", "A12"]
    for well in source_wells:
        src_ul_per_trial = _diluent_start_volumes_per_trial(
            reservoir.load_name, num_transfers_per_source_well
        )
        first_trial_ul = src_ul_per_trial[0]
        reservoir[well].load_liquid(diluent, first_trial_ul)


def _transfer(
    ctx: ProtocolContext,
    volume: float,
    pipette: InstrumentContext,
    tips: Labware,
    reservoir: Labware,
    plate: Labware,
    source: str,
    destinations: List[str],
    same_tip: bool = False,
) -> None:
    end_volumes = _end_volumes_per_trial(
        volume, reservoir.load_name, pipette.channels, len(destinations)
    )
    src_heights = [
        _convert_ul_in_well_to_height_in_well(reservoir.load_name, ul)
        for ul in end_volumes
    ]
    dst_height = _convert_ul_in_well_to_height_in_well(plate.load_name, volume)
    if same_tip and not pipette.has_tip:
        pipette.pick_up_tip()
    for dst_name, height_src in zip(destinations, src_heights):
        # calculate pipetting positions
        aspirate_pos = reservoir[source].bottom(height_src - SUBMERGE_MM)
        dispense_pos = plate[dst_name].bottom(dst_height - SUBMERGE_MM)
        blow_out_pos = plate[dst_name].bottom(dst_height + RETRACT_MM)
        # transfer
        if not same_tip:
            pipette.pick_up_tip(tips.next_tip(pipette.channels))
        pipette.aspirate(TEST_VOLUME, aspirate_pos)
        ctx.delay(seconds=DELAY_ASPIRATE)
        pipette.dispense(TEST_VOLUME, dispense_pos)
        ctx.delay(seconds=DELAY_DISPENSE)
        pipette.blow_out(blow_out_pos)
        if not same_tip:
            if RETURN_TIP:
                pipette.return_tip()
            else:
                pipette.drop_tip()


def _transfer_diluent(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    tips: Labware,
    reservoir: Labware,
    plate: Labware,
) -> None:
    diluent_vol = 200 - TEST_VOLUME
    if diluent_vol <= 0:
        return
    target_cols = set(
        [dst[1:] for test in TEST_SOURCES for dst in test["destinations"]]
    )
    destinations = [f"A{col}" for col in target_cols]
    pipette.pick_up_tip(tips.next_tip(pipette.channels))
    for i, dst in enumerate(destinations):
        if i < len(destinations) / 2:
            src = "A11"
        else:
            src = "A12"
        _transfer(
            ctx,
            diluent_vol,
            pipette,
            tips,
            reservoir,
            plate,
            src,
            destinations,
            same_tip=True,
        )
    if RETURN_TIP:
        pipette.return_tip()
    else:
        pipette.drop_tip()


def _transfer_dye(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    tips: Labware,
    reservoir: Labware,
    plate: Labware,
) -> None:
    for test in TEST_SOURCES:
        _transfer(
            ctx,
            TEST_VOLUME,
            pipette,
            tips,
            reservoir,
            plate,
            test["source"],
            test["destinations"],
        )


def run(ctx: ProtocolContext) -> None:
    # the target plate, handle with great care
    plate = ctx.load_labware("corning_96_wellplate_360ul_flat", "D2")

    # dye tips, pipette, and reservoir
    dye_tips = ctx.load_labware(TEST_TIPS, "B2")
    dye_pipette = ctx.load_instrument(TEST_PIPETTE, "left")
    dye_reservoir = ctx.load_labware(
        SRC_LABWARE_BY_CHANNELS[dye_pipette.channels], "C2"
    )
    _assign_starting_volumes_dye(ctx, dye_pipette, dye_reservoir)

    # diluent tips, pipette, and reservoir
    if TEST_VOLUME < 200:
        diluent_tips = ctx.load_labware("opentrons_flex_96_tiprack_200uL", "B3")
        if "p1000_multi" in TEST_PIPETTE and ALLOW_TEST_PIPETTE_TO_TRANSFER_DILUENT:
            diluent_pipette = dye_pipette  # share the 8ch pipette
        else:
            diluent_pipette = ctx.load_instrument("p1000_multi_gen3", "right")
        if dye_pipette.channels == 8:
            reservoir_diluent = dye_reservoir  # share the 12-row reservoir
        else:
            reservoir_diluent = ctx.load_labware(
                SRC_LABWARE_BY_CHANNELS[diluent_pipette.channels], "C3"
            )
        _assign_starting_volumes_diluent(ctx, dye_pipette, reservoir_diluent)

        # transfer diluent
        _transfer_diluent(ctx, diluent_pipette, diluent_tips, reservoir_diluent, plate)

    # transfer dye
    _transfer_dye(ctx, dye_pipette, dye_tips, dye_reservoir, plate)
