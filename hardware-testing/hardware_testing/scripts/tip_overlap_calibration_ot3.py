"""Tip Overlap Calibration OT3."""
import argparse
import asyncio
from dataclasses import dataclass, asdict, replace
from json import load as json_load
from random import uniform
from pathlib import Path
from time import sleep
from typing import Dict, Optional, Tuple, List, Any

from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.ot3_calibration import SLOT_CENTER, calibrate_pipette
from opentrons.types import DeckSlotName

from opentrons_shared_data.load import get_shared_data_root
from opentrons_shared_data.deck import (
    Z_PREP_OFFSET,
    get_calibration_square_position_in_slot,
)

from hardware_testing.data import (
    ui,
    create_file_name,
    create_run_id,
    dump_data_to_file,
    append_data_to_file,
)
from hardware_testing.opentrons_api import helpers_ot3, types
from hardware_testing.drivers import list_ports_and_select
from hardware_testing.drivers.mitutoyo_digimatic_indicator import (
    Mitutoyo_Digimatic_Indicator,
)

DEFAULT_SLOTS_TO_TEST: List[str] = [
    "D1",
    "D2",
    "D3",
    "C1",
    "C3",
    "B1",
    "B3",
    "A1",
    "A2",
]

CSV_DIVIDER = "\t"
CSV_NEWLINE = "\n"

# use same calibration square as is used during pipette calibration
# NOTE: leave this slot EMPTY!!!
CALIBRATION_SLOT = SLOT_CENTER

DIAL_SLOT = "B2"

# make sure the numbers aren't changing when we read from it
DIAL_SETTLING_SECONDS = 2.0

# hardcoded distances for when pressure-probing the calibration square
PROBE_START_HEIGHT_ABOVE_EXPECTED_MM = 10.0
PROBE_OVERSHOOT_BELOW_EXPECTED_MM = 5.0
EXPECTED_PROBE_Z_POSITION_MM = 0.0  # NOTE: the calibration square in slot C2


def _dataclass_to_csv(dc: Any, is_header: bool = False, prepend: str = "") -> str:
    keys_or_values = []
    for key, value in asdict(dc).items():
        if is_header:
            keys_or_values.append(key)
        elif isinstance(value, float):
            keys_or_values.append(str(round(value, 2)))
        else:
            keys_or_values.append(str(value))
    if is_header:
        keys_or_values = [
            prepend + kv.upper().replace("_", " ") for kv in keys_or_values
        ]
    return CSV_DIVIDER.join([str(kv) for kv in keys_or_values])


def _get_default_tip_overlap(
    api: OT3API, mount: str, load_name: str, overlap_version: str
) -> float:
    mnt = types.Mount.LEFT if mount == "left" else types.Mount.RIGHT
    pip = api.hardware_pipettes[mnt]
    tip_overlaps_from_pipette_def = pip.tip_overlap[overlap_version]
    labware_def = _load_labware_def(load_name)
    default_overlap = tip_overlaps_from_pipette_def.get(
        "default", labware_def["parameters"]["tipOverlap"]
    )
    return tip_overlaps_from_pipette_def.get(
        f"opentrons/{load_name}/1", default_overlap
    )


def _load_labware_def(load_name: str) -> Dict[Any, Any]:
    labware_def_path = (
        get_shared_data_root() / "labware/definitions/2" / load_name / "1.json"
    )
    with open(labware_def_path, "r") as f:
        return json_load(f)


@dataclass
class TestConfig:
    run_id: str
    flex_id: str
    pipette_id: str
    pipette_mount: str
    pipette_channels: int
    pipette_volume: int

    @property
    def csv_header(self) -> str:
        return _dataclass_to_csv(self, is_header=True)

    @property
    def csv_data(self) -> str:
        return _dataclass_to_csv(self)


@dataclass
class TipConfig:
    load_name: str
    lot: str
    volume: int
    filter: bool
    slot: str
    well: str
    count: int
    overlap_version: str
    overlap: float

    @classmethod
    def build_from_input(cls, api: OT3API, mount: str, tip_count: int) -> "TipConfig":
        get_inp = not api.is_simulator
        # NOTE: (sigler) we can configure this later, default to latest
        overlap_version: str = (
            input("Overlap version [v0 or v1]: ") if get_inp else "v1"
        )
        slot: str = input("Tip-Rack Slot (eg: C3): ") if get_inp else "C3"
        lot: str = input("Tip-Rack Lot #: ").strip() if get_inp else "1"
        volume: int = (
            int(input("Tip-Rack Volume [50, 200, or 1000]: ")) if get_inp else 200
        )
        has_filter: bool = (
            bool("y" in input("Tip is filtered? (y/n): ")) if get_inp else False
        )
        well: str = (
            input("Start at tip (eg: A1): ").strip() if not api.is_simulator else "A1"
        )
        return cls.build(
            api, mount, lot, volume, has_filter, slot, well, tip_count, overlap_version
        )

    @classmethod
    def build(
        cls,
        api: OT3API,
        mount: str,
        lot: str,
        volume: int,
        has_filter: bool,
        slot: str,
        well: str,
        tip_count: int,
        overlap_version: str,
    ) -> "TipConfig":
        load_name = (
            f"opentrons_flex_96_{'filter' if has_filter else ''}tiprack_{volume}ul"
        )
        overlap = _get_default_tip_overlap(api, mount, load_name, overlap_version)
        return TipConfig(
            load_name=load_name,
            lot=lot,
            volume=volume,
            filter=has_filter,
            slot=slot,
            well=well,
            count=tip_count,
            overlap_version=overlap_version,
            overlap=overlap,
        )

    @property
    def csv_header(self) -> str:
        return _dataclass_to_csv(self, is_header=True, prepend="TIP ")

    @property
    def csv_data(self) -> str:
        return _dataclass_to_csv(self)

    @property
    def tip_point(self) -> types.Point:
        tip_row_idx = "ABCDEFGH".index(self.well[0])
        tip_col_idx = int(self.well[1:]) - 1
        tip_well_offset = types.Point(x=tip_col_idx * 9.0, y=tip_row_idx * -9.0, z=0)
        # NOTE: the ot3 helpers were made back when all slots were numbered (slots 1-12)
        #       so here we convert the new slot name (eg: "C3") to an integer
        numbered_deck_slot = int(
            DeckSlotName.from_primitive(self.slot).to_ot2_equivalent().value
        )
        tip_a1_pos = helpers_ot3.get_theoretical_a1_position(
            numbered_deck_slot, self.load_name
        )
        return tip_a1_pos + tip_well_offset

    def _load_labware_def(self) -> Dict[Any, Any]:
        labware_def_path = (
            get_shared_data_root() / "labware/definitions/2" / self.load_name / "1.json"
        )
        with open(labware_def_path, "r") as f:
            return json_load(f)

    def get_point_and_length_and_overlap(self) -> Tuple[types.Point, float, float]:
        labware_def = self._load_labware_def()
        tip_pos = self.tip_point
        tip_length = labware_def["parameters"]["tipLength"]
        return tip_pos, tip_length, self.overlap

    @classmethod
    def create_copy_and_increment_well(cls, tc: "TipConfig") -> "TipConfig":
        if tc.well == "H12":
            raise RuntimeError("ran out of tips to pickup")
        cpy = replace(tc)
        tip_row_idx = "ABCDEFGH".index(tc.well[0])
        tip_col_idx = int(tc.well[1:]) - 1
        if tip_row_idx == 7:
            next_tip_row_idx = 0
            next_tip_col_idx = tip_col_idx + 1
        else:
            next_tip_row_idx = tip_row_idx + 1
            next_tip_col_idx = tip_col_idx + 0
        next_col_letter = "ABCDEFGH"[next_tip_row_idx]
        cpy.well = f"{next_col_letter}{next_tip_col_idx + 1}"
        return cpy


@dataclass
class TrialResult:
    dial_nozzle: float
    dial_tip_nominal: float
    tip_z_error: float
    probed_deck_z: float
    overlap_calibrated: float
    dial_tip_calibrated: float
    tip_z_error_calibrated: float
    error_reduction: float

    @property
    def csv_header(self) -> str:
        return _dataclass_to_csv(self, is_header=True)

    @property
    def csv_data(self) -> str:
        return _dataclass_to_csv(self)


@dataclass
class Trial:
    config: TipConfig
    result: TrialResult

    @property
    def csv_header(self) -> str:
        return CSV_DIVIDER.join([self.config.csv_header, self.result.csv_header])

    @property
    def csv_data(self) -> str:
        return CSV_DIVIDER.join([self.config.csv_data, self.result.csv_data])


@dataclass
class TestData:
    config: TestConfig
    trials: List[Trial]

    @property
    def csv_header(self) -> str:
        assert len(self.trials)
        return CSV_DIVIDER.join([self.config.csv_header, self.trials[0].csv_header])

    @property
    def csv_data(self) -> str:
        assert len(self.trials)
        return CSV_NEWLINE.join(
            [
                CSV_DIVIDER.join([self.config.csv_data, trial.csv_data])
                for trial in self.trials
            ]
        )

    @property
    def csv_data_latest_trial(self) -> str:
        assert len(self.trials)
        return CSV_DIVIDER.join([self.config.csv_data, self.trials[-1].csv_data])


async def _run_trial(
    api: OT3API,
    pipette_mount: str,
    tip_cfg: TipConfig,
    dial: Optional[Mitutoyo_Digimatic_Indicator],
    dial_pos: types.Point,
) -> TrialResult:
    # TIP INFO
    tip_pos, tip_length, tip_overlap = tip_cfg.get_point_and_length_and_overlap()

    def _read_dial() -> float:
        if dial is None:
            return uniform(-3, -2)
        sleep(DIAL_SETTLING_SECONDS)
        # NOTE: (sigler) the dial-indicator is upside-down
        #       which is confusing when comparing the pipette's positions.
        #       To make the math/logic easier, I've flipped the dial's reading
        #       to be negative, so that the more it is PRESSED-DOWN, the
        #       more NEGATIVE it will be (which is more intuitive I think)
        return dial.read() * -1.0

    pip_mount = types.OT3Mount.LEFT if pipette_mount == "left" else types.OT3Mount.RIGHT

    # NOZZLE POSITION
    ui.print_info("moving to the DIAL-INDICATOR")
    await api.retract(pip_mount)
    await helpers_ot3.move_to_arched_ot3(api, pip_mount, dial_pos)
    dial_nozzle = _read_dial()

    # TIP NOMINAL POSITION
    ui.print_info("picking up TIP")
    await api.retract(pip_mount)
    await helpers_ot3.move_to_arched_ot3(api, pip_mount, tip_pos)
    await api.pick_up_tip(pip_mount, tip_length=tip_length - tip_overlap)
    await api.retract(pip_mount)
    await helpers_ot3.move_to_arched_ot3(api, pip_mount, dial_pos)
    dial_tip_nominal = _read_dial()
    tip_z_error = dial_tip_nominal - dial_nozzle

    ui.print_header("PROBING the CALIBRATION-SQUARE")
    square_pos = types.Point(
        *get_calibration_square_position_in_slot(slot=CALIBRATION_SLOT)
    ) + types.Point(x=Z_PREP_OFFSET.x, y=Z_PREP_OFFSET.y, z=Z_PREP_OFFSET.z)
    await api.retract(pip_mount)
    await helpers_ot3.move_to_arched_ot3(
        api, pip_mount, square_pos + types.Point(z=PROBE_START_HEIGHT_ABOVE_EXPECTED_MM)
    )
    probed_deck_z = await api.liquid_probe(
        pip_mount,
        PROBE_START_HEIGHT_ABOVE_EXPECTED_MM + PROBE_OVERSHOOT_BELOW_EXPECTED_MM,
    )
    if api.is_simulator:
        probed_deck_z = uniform(-0.5, 0.5)
    tip_overlap_error_mm = probed_deck_z - EXPECTED_PROBE_Z_POSITION_MM
    overlap_calibrated = tip_overlap - tip_overlap_error_mm
    ui.print_info(
        f"tip is {round(tip_overlap_error_mm, 2)} mm "
        f"(overlap={round(overlap_calibrated, 2)}) "
        f"from expected overlap ({tip_overlap})"
    )
    api.remove_tip(pip_mount)
    api.add_tip(pip_mount, tip_length=tip_length - overlap_calibrated)

    ui.print_header("measure ERROR from EXPECTED (again)")
    await api.retract(pip_mount)
    await helpers_ot3.move_to_arched_ot3(api, pip_mount, dial_pos)
    dial_tip_calibrated = _read_dial()
    tip_z_error_calibrated = dial_tip_calibrated - dial_nozzle
    error_reduction = tip_z_error_calibrated - tip_z_error

    ui.print_info(
        f"RESULT: "
        f"before={round(tip_z_error, 2)} "
        f"after={round(tip_z_error_calibrated, 2)} "
        f"improvement={round(error_reduction, 2)} "
        f"({int((error_reduction / tip_z_error) * 100.0)}%)"
    )

    ui.print_info("dropping tip in trash")
    await api.retract(pip_mount)
    trash_pos = helpers_ot3.get_theoretical_a1_position(12, tip_cfg.load_name)
    trash_pos += types.Point(x=0, y=-9 * 4.5, z=-20)
    await helpers_ot3.move_to_arched_ot3(api, pip_mount, trash_pos)
    await api.drop_tip(pip_mount)

    ui.print_info("trial complete")
    await api.retract(pip_mount)

    return TrialResult(
        dial_nozzle=dial_nozzle,
        dial_tip_nominal=dial_tip_nominal,
        tip_z_error=tip_z_error,
        probed_deck_z=probed_deck_z,
        overlap_calibrated=overlap_calibrated,
        dial_tip_calibrated=dial_tip_calibrated,
        tip_z_error_calibrated=tip_z_error_calibrated,
        error_reduction=error_reduction,
    )


def _ask_user_for_number_of_trials(simulate: bool) -> int:
    num_trials_to_run = 0
    while not num_trials_to_run:
        try:
            if not simulate:
                num_trials_to_run = int(
                    input("number of trials to run without stopping: ")
                )
            else:
                num_trials_to_run = 10
        except ValueError as e:
            print(e)
    return num_trials_to_run


async def main(
    simulate: bool,
    calibrate: bool,
    pip_mount: types.OT3Mount,
    slots_to_test: List[str],
    starting_tip: str,
    num_tips_per_rack: int,
    overlap_version: str,
    tip_lot: str,
    tip_volume: int,
    has_filter: bool,
    default_dial_position: Optional[types.Point] = None,
    dial_port: str = "",
) -> None:
    ui.print_title("TIP-OVERLAP CALIBRATION")

    # DIAL-INDICATOR
    dial: Optional[Mitutoyo_Digimatic_Indicator] = None
    if not simulate:
        if not dial_port:
            dial_port = list_ports_and_select("Dial Indicator")
        dial = Mitutoyo_Digimatic_Indicator(port=dial_port)
        dial.connect()
        dial.read()

    # GET HARDWARE CONTROLLER
    api = await helpers_ot3.build_async_ot3_hardware_api(
        is_simulating=simulate,
        pipette_left="p1000_single_v3.6",
        pipette_right="p1000_single_v3.6",
    )

    # STORE TEST CONFIGURATIONS
    pip_hw = api.hardware_pipettes[pip_mount.to_mount()]
    mnt_str = pip_mount.name.lower()
    pip_ch = int(pip_hw.channels.value)
    test_data = TestData(
        config=TestConfig(
            run_id=create_run_id(),
            flex_id=helpers_ot3.get_robot_serial_ot3(api),
            pipette_id=helpers_ot3.get_pipette_serial_ot3(pip_hw),
            pipette_mount=pip_mount.name.lower(),
            pipette_channels=int(pip_hw.channels.value),
            pipette_volume=int(pip_hw.pipette_type.value[1:]),
        ),
        trials=[],
    )

    # CSV FILE
    csv_test_name = Path(__file__).name.replace("_", "-").replace(".py", "")
    csv_tag = f"{test_data.config.pipette_id}"
    csv_file_name = create_file_name(csv_test_name, test_data.config.run_id, csv_tag)

    # CALIBRATE PIPETTE
    await api.home()
    if calibrate:
        attach_probe_pos = types.Point(
            *get_calibration_square_position_in_slot(slot=CALIBRATION_SLOT)
        )
        attach_probe_pos += types.Point(
            x=Z_PREP_OFFSET.x, y=Z_PREP_OFFSET.y, z=Z_PREP_OFFSET.z
        )
        attach_probe_pos += types.Point(z=100)
        await helpers_ot3.move_to_arched_ot3(api, pip_mount, attach_probe_pos)
        if not simulate:
            ui.get_user_ready("ATTACH calibration probe")
        api.add_tip(pip_mount, api.config.calibration.probe_length)
        if not simulate:
            await calibrate_pipette(api, pip_mount)
        await api.retract(pip_mount)
        if not simulate:
            ui.get_user_ready("REMOVE calibration probe")
        api.remove_tip(pip_mount)

    # CONFIRM DIAL POSITION
    if default_dial_position:
        dial_pos = default_dial_position
        ui.print_info("moving to the DIAL-INDICATOR")
        await api.retract(pip_mount)
        await helpers_ot3.move_to_arched_ot3(api, pip_mount, default_dial_position)
    else:
        ui.print_info("please jog to the DIAL-INDICATOR")
        ui.print_info("NOTE: dial should be PRESSED DOWN about 2-4 mm from neutral")
        await helpers_ot3.jog_mount_ot3(api, pip_mount)
        dial_pos = await api.gantry_position(pip_mount)
        ui.print_info(
            f"--dial {round(dial_pos.x, 2)} {round(dial_pos.y, 2)} {round(dial_pos.z, 2)}"
        )
        if not simulate:
            ui.get_user_ready("copy/paste the dial position (above) for next time")

    test_tip_configs: List[TipConfig] = [
        TipConfig.build(
            api,
            mnt_str,
            lot=tip_lot,
            volume=tip_volume,
            has_filter=has_filter,
            slot=slot,
            well=starting_tip,
            tip_count=pip_ch,
            overlap_version=overlap_version,
        )
        for slot in slots_to_test
    ]

    async def _test_tip_and_save_results(_cfg: TipConfig) -> None:
        trial_result = await _run_trial(
            api, pip_mount.name.lower(), _cfg, dial, dial_pos
        )
        test_data.trials.append(Trial(config=_cfg, result=trial_result))
        if len(test_data.trials) == 1:
            # FIXME: header cannot be compiled without
            #        first having at least 1x trial stored
            dump_data_to_file(
                csv_test_name,
                test_data.config.run_id,
                csv_file_name,
                data=test_data.csv_header + CSV_NEWLINE,
            )
        append_data_to_file(
            csv_test_name,
            test_data.config.run_id,
            csv_file_name,
            data=test_data.csv_data_latest_trial + CSV_NEWLINE,
        )

    total_tips_to_test = len(test_tip_configs) * num_tips_per_rack
    total_tips_tested = 0
    for tip_cfg in test_tip_configs:
        _cfg = replace(tip_cfg)
        for i in range(num_tips_per_rack):
            total_tips_tested += 1
            ui.print_title(f"TIP {total_tips_tested}/{total_tips_to_test}")
            if i > 0:
                # same tip-rack, so just copy the config
                # but increment to the next well location
                _cfg = TipConfig.create_copy_and_increment_well(_cfg)
            await _test_tip_and_save_results(_cfg)
        if simulate:
            break


if __name__ == "__main__":
    _parser = argparse.ArgumentParser()
    _parser.add_argument("--simulate", action="store_true")
    _parser.add_argument("--calibrate", action="store_true")
    _parser.add_argument("--dial-port", type=str, default="")
    _parser.add_argument("--mount", type=str, choices=["left", "right"], default="left")
    _parser.add_argument("--slots", nargs="+", type=str, default=DEFAULT_SLOTS_TO_TEST)
    _parser.add_argument("--starting-tip", type=str, default="A1")
    _parser.add_argument("--tips-per-rack", type=int, default=96)
    _parser.add_argument(
        "--overlap-version", type=str, choices=["v0", "v1"], default="v1"
    )
    _parser.add_argument("--lot", type=str, required=True)
    _parser.add_argument("--tip", type=int, choices=[20, 50, 200, 1000], required=True)
    _parser.add_argument("--filter", action="store_true")
    _parser.add_argument("--dial", nargs="+", type=float, default=[])
    _args = _parser.parse_args()
    _mnt_hw = {"left": types.OT3Mount.LEFT, "right": types.OT3Mount.RIGHT}[_args.mount]
    if _args.dial:
        assert len(_args.dial) == 3
    asyncio.run(
        main(
            _args.simulate,
            _args.calibrate,
            _mnt_hw,
            slots_to_test=_args.slots,
            starting_tip=_args.starting_tip,
            num_tips_per_rack=_args.tips_per_rack,
            overlap_version=_args.overlap_version,
            tip_lot=_args.lot,
            tip_volume=_args.tip,
            has_filter=_args.filter,
            default_dial_position=types.Point(*_args.dial) if _args.dial else None,
            dial_port=_args.dial_port,
        )
    )
