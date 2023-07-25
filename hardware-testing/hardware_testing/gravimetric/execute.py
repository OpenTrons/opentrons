"""Gravimetric."""
from time import sleep
from dataclasses import dataclass
from statistics import stdev
from typing import Optional, Tuple, List, Dict

from opentrons.hardware_control.instruments.ot3.pipette import Pipette
from opentrons.types import Location
from opentrons.protocol_api import ProtocolContext, InstrumentContext, Well, Labware

from hardware_testing.data import create_run_id_and_start_time, ui, get_git_description
from hardware_testing.data.csv_report import CSVReport
from hardware_testing.opentrons_api.types import OT3Mount, Point
from hardware_testing.opentrons_api.helpers_ot3 import clear_pipette_ul_per_mm

from . import report
from . import config
from .helpers import get_pipette_unique_name
from .workarounds import get_sync_hw_api, get_latest_offset_for_labware
from .increments import get_volume_increments
from .liquid_class.defaults import get_test_volumes
from .liquid_class.pipetting import (
    aspirate_with_liquid_class,
    dispense_with_liquid_class,
    PipettingCallbacks,
)
from .liquid_height.height import LiquidTracker, initialize_liquid_from_deck
from .measurement import (
    MeasurementData,
    MeasurementType,
    record_measurement_data,
    calculate_change_in_volume,
    create_measurement_tag,
    DELAY_FOR_MEASUREMENT,
)
from .measurement.environment import get_min_reading, get_max_reading
from .measurement.record import (
    GravimetricRecorder,
    GravimetricRecorderConfig,
)
from .tips import get_tips, MULTI_CHANNEL_TEST_ORDER


_MEASUREMENTS: List[Tuple[str, MeasurementData]] = list()

_PREV_TRIAL_GRAMS: Optional[MeasurementData] = None

_tip_counter: Dict[int, int] = {}


def _generate_callbacks_for_trial(
    recorder: GravimetricRecorder,
    volume: Optional[float],
    channel: int,
    trial: int,
    blank_measurement: bool,
) -> PipettingCallbacks:
    # it is useful to tag the scale data by what is physically happening,
    # so we can graph the data and color-code the lines based on these tags.
    # very helpful for debugging and learning more about the system.
    if blank_measurement:
        volume = None
    return PipettingCallbacks(
        on_submerging=lambda: recorder.set_sample_tag(
            create_measurement_tag("submerge", volume, channel, trial)
        ),
        on_mixing=lambda: recorder.set_sample_tag(
            create_measurement_tag("mix", volume, channel, trial)
        ),
        on_aspirating=lambda: recorder.set_sample_tag(
            create_measurement_tag("aspirate", volume, channel, trial)
        ),
        on_retracting=lambda: recorder.set_sample_tag(
            create_measurement_tag("retract", volume, channel, trial)
        ),
        on_dispensing=lambda: recorder.set_sample_tag(
            create_measurement_tag("dispense", volume, channel, trial)
        ),
        on_blowing_out=lambda: recorder.set_sample_tag(
            create_measurement_tag("blowout", volume, channel, trial)
        ),
        on_exiting=recorder.clear_sample_tag,
    )


def _update_environment_first_last_min_max(test_report: report.CSVReport) -> None:
    # update this regularly, because the script may exit early
    env_data_list = [m.environment for tag, m in _MEASUREMENTS]
    first_data = env_data_list[0]
    last_data = env_data_list[-1]
    min_data = get_min_reading(env_data_list)
    max_data = get_max_reading(env_data_list)
    report.store_environment(
        test_report, report.EnvironmentReportState.FIRST, first_data
    )
    report.store_environment(test_report, report.EnvironmentReportState.LAST, last_data)
    report.store_environment(test_report, report.EnvironmentReportState.MIN, min_data)
    report.store_environment(test_report, report.EnvironmentReportState.MAX, max_data)


def _get_volumes(ctx: ProtocolContext, cfg: config.GravimetricConfig) -> List[float]:
    if cfg.increment:
        test_volumes = get_volume_increments(cfg.pipette_volume, cfg.tip_volume)
    elif cfg.user_volumes and not ctx.is_simulating():
        _inp = input('Enter desired volumes, comma separated (eg: "10,100,1000") :')
        test_volumes = [
            float(vol_str) for vol_str in _inp.strip().split(",") if vol_str
        ]
    else:
        test_volumes = get_test_volumes(
            cfg.pipette_volume, cfg.pipette_channels, cfg.tip_volume
        )
    if not test_volumes:
        raise ValueError("no volumes to test, check the configuration")
    return sorted(test_volumes, reverse=False)  # lowest volumes first


def _get_channel_offset(cfg: config.GravimetricConfig, channel: int) -> Point:
    assert (
        channel < cfg.pipette_channels
    ), f"unexpected channel on {cfg.pipette_channels} channel pipette: {channel}"
    if cfg.pipette_channels == 1:
        return Point()
    if cfg.pipette_channels == 8:
        return Point(y=channel * 9.0)
    if cfg.pipette_channels == 96:
        row = channel % 8  # A-H
        col = int(float(channel) / 8.0)  # 1-12
        return Point(x=col * 9.0, y=row * 9.0)
    raise ValueError(f"unexpected number of channels in config: {cfg.pipette_channels}")


def _load_pipette(
    ctx: ProtocolContext, cfg: config.GravimetricConfig
) -> InstrumentContext:
    load_str_channels = {1: "single", 8: "multi", 96: "96"}
    if cfg.pipette_channels not in load_str_channels:
        raise ValueError(f"unexpected number of channels: {cfg.pipette_channels}")
    chnl_str = load_str_channels[cfg.pipette_channels]
    if cfg.pipette_channels == 96:
        pip_name = "p1000_96"
    else:
        pip_name = f"p{cfg.pipette_volume}_{chnl_str}_gen3"
    print(f'pipette "{pip_name}" on mount "{cfg.pipette_mount}"')
    pipette = ctx.load_instrument(pip_name, cfg.pipette_mount)
    assert pipette.channels == cfg.pipette_channels, (
        f"expected {cfg.pipette_channels} channels, "
        f"but got pipette with {pipette.channels} channels"
    )
    assert pipette.max_volume == cfg.pipette_volume, (
        f"expected {cfg.pipette_volume} uL pipette, "
        f"but got a {pipette.max_volume} uL pipette"
    )
    pipette.default_speed = cfg.gantry_speed
    # NOTE: 8ch QC testing means testing 1 channel at a time,
    #       so we need to decrease the pick-up current to work with 1 tip.
    if pipette.channels == 8 and not cfg.increment:
        hwapi = get_sync_hw_api(ctx)
        mnt = OT3Mount.LEFT if cfg.pipette_mount == "left" else OT3Mount.RIGHT
        hwpipette: Pipette = hwapi.hardware_pipettes[mnt.to_mount()]
        hwpipette.pick_up_configurations.current = 0.2
    return pipette


def _apply_labware_offsets(
    cfg: config.GravimetricConfig, tip_racks: List[Labware], labware_on_scale: Labware
) -> None:
    def _apply(labware: Labware) -> None:
        o = get_latest_offset_for_labware(cfg.labware_offsets, labware)
        print(
            f'Apply labware offset to "{labware.name}" (slot={labware.parent}): '
            f"x={round(o.x, 2)}, y={round(o.y, 2)}, z={round(o.z, 2)}"
        )
        labware.set_calibration(o)

    _apply(labware_on_scale)
    for rack in tip_racks:
        _apply(rack)


def _load_labware(
    ctx: ProtocolContext, cfg: config.GravimetricConfig
) -> Tuple[Labware, List[Labware]]:
    print(f'Loading labware on scale: "{cfg.labware_on_scale}"')
    if cfg.labware_on_scale == "radwag_pipette_calibration_vial":
        namespace = "custom_beta"
    else:
        namespace = "opentrons"
    labware_on_scale = ctx.load_labware(
        cfg.labware_on_scale, location=cfg.slot_scale, namespace=namespace
    )
    if cfg.pipette_channels == 96:
        tiprack_namespace = "custom_beta"
        tiprack_loadname = f"opentrons_flex_96_tiprack_{cfg.tip_volume}ul_adp"
    else:
        tiprack_namespace = "opentrons"
        tiprack_loadname = f"opentrons_flex_96_tiprack_{cfg.tip_volume}ul"
    tiprack_load_settings: List[Tuple[int, str, str]] = [
        (
            slot,
            tiprack_loadname,
            tiprack_namespace,
        )
        for slot in cfg.slots_tiprack
    ]
    tipracks: List[Labware] = []
    for ls in tiprack_load_settings:
        print(f'Loading tiprack "{ls[1]}" in slot #{ls[0]} with namespace "{ls[2]}"')
        tipracks.append(ctx.load_labware(ls[1], location=ls[0], namespace=ls[2]))
    _apply_labware_offsets(cfg, tipracks, labware_on_scale)
    return labware_on_scale, tipracks


def _jog_to_find_liquid_height(
    ctx: ProtocolContext, pipette: InstrumentContext, well: Well
) -> float:
    _well_depth = well.depth
    _liquid_height = _well_depth
    _jog_size = -1.0
    if ctx.is_simulating():
        return _liquid_height - 1
    while True:
        pipette.move_to(well.bottom(_liquid_height))
        inp = input(
            f"height={_liquid_height}: ENTER to jog {_jog_size} mm, "
            f'or enter new jog size, or "yes" to save: '
        )
        if inp:
            if inp[0] == "y":
                break
            try:
                _jog_size = min(max(float(inp), -1.0), 1.0)
            except ValueError:
                continue
        _liquid_height = min(max(_liquid_height + _jog_size, 0), _well_depth)
    return _liquid_height


def _calculate_average(volume_list: List[float]) -> float:
    return sum(volume_list) / len(volume_list)


def _calculate_stats(
    volume_list: List[float], total_volume: float
) -> Tuple[float, float, float]:
    average = _calculate_average(volume_list)
    if len(volume_list) <= 1:
        print("skipping CV, only 1x trial per volume")
        cv = -0.01  # negative number is impossible
    else:
        cv = stdev(volume_list) / average
    d = (average - total_volume) / total_volume
    return average, cv, d


def _print_stats(mode: str, average: float, cv: float, d: float) -> None:
    print(
        f"{mode}:\n"
        f"\tavg: {round(average, 2)} uL\n"
        f"\tcv: {round(cv * 100.0, 2)}%\n"
        f"\td: {round(d * 100.0, 2)}%"
    )


def _print_final_results(
    volumes: List[float], channel_count: int, test_report: CSVReport
) -> None:
    for vol in volumes:
        print(f"  * {vol}ul channel all:")
        for mode in ["aspirate", "dispense"]:
            avg, cv, d = report.get_volume_results_all(test_report, mode, vol)
            print(f"    - {mode}:")
            print(f"        avg: {avg}ul")
            print(f"        cv:  {cv}%")
            print(f"        d:   {d}%")
        for channel in range(channel_count):
            print(f"  * vol {vol}ul channel {channel + 1}:")
            for mode in ["aspirate", "dispense"]:
                avg, cv, d = report.get_volume_results_per_channel(
                    test_report, mode, vol, channel
                )
                print(f"    - {mode}:")
                print(f"        avg: {avg}ul")
                print(f"        cv:  {cv}%")
                print(f"        d:   {d}%")


def _run_trial(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    well: Well,
    channel_offset: Point,
    tip_volume: int,
    volume: float,
    channel: int,
    channel_count: int,
    trial: int,
    recorder: GravimetricRecorder,
    test_report: report.CSVReport,
    liquid_tracker: LiquidTracker,
    blank: bool,
    inspect: bool,
    mix: bool = False,
    stable: bool = True,
    scale_delay: int = DELAY_FOR_MEASUREMENT,
) -> Tuple[float, MeasurementData, float, MeasurementData]:
    global _PREV_TRIAL_GRAMS
    pipetting_callbacks = _generate_callbacks_for_trial(
        recorder, volume, channel, trial, blank
    )

    def _tag(m_type: MeasurementType) -> str:
        return create_measurement_tag(m_type, None if blank else volume, channel, trial)

    def _record_measurement_and_store(m_type: MeasurementType) -> MeasurementData:
        m_tag = _tag(m_type)
        if recorder.is_simulator and not blank:
            if m_type == MeasurementType.ASPIRATE:
                recorder.add_simulation_mass(volume * -0.001)
            elif m_type == MeasurementType.DISPENSE:
                recorder.add_simulation_mass(volume * 0.001)
        m_data = record_measurement_data(
            ctx,
            m_tag,
            recorder,
            pipette.mount,
            stable,
            shorten=inspect,
            delay_seconds=scale_delay,
        )
        report.store_measurement(test_report, m_tag, m_data)
        _MEASUREMENTS.append(
            (
                m_tag,
                m_data,
            )
        )
        _update_environment_first_last_min_max(test_report)
        return m_data

    print("recorded weights:")

    # RUN INIT
    pipette.move_to(well.top(50).move(channel_offset))  # center channel over well
    mnt = OT3Mount.RIGHT if pipette.mount == "right" else OT3Mount.LEFT
    ctx._core.get_hardware().retract(mnt)  # retract to top of gantry
    m_data_init = _record_measurement_and_store(MeasurementType.INIT)
    print(f"\tinitial grams: {m_data_init.grams_average} g")
    if _PREV_TRIAL_GRAMS is not None:
        _evaporation_loss_ul = abs(
            calculate_change_in_volume(_PREV_TRIAL_GRAMS, m_data_init)
        )
        print(f"{_evaporation_loss_ul} ul evaporated since last trial")
        liquid_tracker.update_affected_wells(
            well, aspirate=_evaporation_loss_ul, channels=1
        )
    _PREV_TRIAL_GRAMS = m_data_init

    # RUN ASPIRATE
    aspirate_with_liquid_class(
        ctx,
        pipette,
        tip_volume,
        volume,
        well,
        channel_offset,
        channel_count,
        liquid_tracker,
        callbacks=pipetting_callbacks,
        blank=blank,
        inspect=inspect,
        mix=mix,
    )
    ctx._core.get_hardware().retract(mnt)
    m_data_aspirate = _record_measurement_and_store(MeasurementType.ASPIRATE)
    print(f"\tgrams after aspirate: {m_data_aspirate.grams_average} g")
    print(f"\tcelsius after aspirate: {m_data_aspirate.celsius_pipette} C")

    # RUN DISPENSE
    dispense_with_liquid_class(
        ctx,
        pipette,
        tip_volume,
        volume,
        well,
        channel_offset,
        channel_count,
        liquid_tracker,
        callbacks=pipetting_callbacks,
        blank=blank,
        inspect=inspect,
        mix=mix,
    )
    ctx._core.get_hardware().retract(mnt)
    m_data_dispense = _record_measurement_and_store(MeasurementType.DISPENSE)
    print(f"\tgrams after dispense: {m_data_dispense.grams_average} g")

    # calculate volumes
    volume_aspirate = calculate_change_in_volume(m_data_init, m_data_aspirate)
    volume_dispense = calculate_change_in_volume(m_data_aspirate, m_data_dispense)
    return volume_aspirate, m_data_aspirate, volume_dispense, m_data_dispense


def _get_operator_name(is_simulating: bool) -> str:
    if not is_simulating:
        return input("OPERATOR name:").strip()
    else:
        return "simulation"


def _get_robot_serial(is_simulating: bool) -> str:
    if not is_simulating:
        return input("ROBOT SERIAL NUMBER:").strip()
    else:
        return "simulation-serial-number"


def _get_tip_batch(is_simulating: bool) -> str:
    if not is_simulating:
        return input("TIP BATCH:").strip()
    else:
        return "simulation-tip-batch"


def _pick_up_tip(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    cfg: config.GravimetricConfig,
    location: Location,
) -> None:
    print(
        f"picking tip {location.labware.as_well().well_name} "
        f"from slot #{location.labware.parent.parent}"
    )
    pipette.pick_up_tip(location)
    # NOTE: the accuracy-adjust function gets set on the Pipette
    #       each time we pick-up a new tip.
    if cfg.increment:
        print("clearing pipette ul-per-mm table to be linear")
        clear_pipette_ul_per_mm(
            get_sync_hw_api(ctx)._obj_to_adapt,  # type: ignore[arg-type]
            OT3Mount.LEFT if cfg.pipette_mount == "left" else OT3Mount.RIGHT,
        )


def _drop_tip(pipette: InstrumentContext, return_tip: bool) -> None:
    if return_tip:
        pipette.return_tip(home_after=False)
    else:
        pipette.drop_tip(home_after=False)


def _get_test_channels(cfg: config.GravimetricConfig) -> List[int]:
    if cfg.pipette_channels == 8 and not cfg.increment:
        # NOTE: only test channels separately when QC'ing a 8ch
        return MULTI_CHANNEL_TEST_ORDER
    else:
        return [0]


def _get_channel_divider(cfg: config.GravimetricConfig) -> float:
    if cfg.pipette_channels == 8 and not cfg.increment:
        return 1.0
    else:
        return float(cfg.pipette_channels)


def _get_tag_from_pipette(
    pipette: InstrumentContext, cfg: config.GravimetricConfig
) -> str:
    pipette_tag = get_pipette_unique_name(pipette)
    print(f'found pipette "{pipette_tag}"')
    if cfg.increment:
        pipette_tag += "-increment"
    elif cfg.user_volumes:
        pipette_tag += "-user-volume"
    else:
        pipette_tag += "-qc"
    return pipette_tag


def _change_pipettes(
    ctx: ProtocolContext, pipette: InstrumentContext, return_tip: bool
) -> None:
    if pipette.has_tip:
        if pipette.current_volume > 0:
            print("dispensing liquid to trash")
            trash = pipette.trash_container.wells()[0]
            # FIXME: this should be a blow_out() at max volume,
            #        but that is not available through PyAPI yet
            #        so instead just dispensing.
            pipette.dispense(pipette.current_volume, trash.top())
            pipette.aspirate(10)  # to pull any droplets back up
        print("dropping tip")
        _drop_tip(pipette, return_tip)
    print("moving to attach position")
    pipette.move_to(ctx.deck.position_for(5).move(Point(x=0, y=9 * 7, z=150)))


def _next_tip_for_channel(
    ctx: ProtocolContext,
    cfg: config.GravimetricConfig,
    tips: Dict[int, List[Well]],
    channel: int,
    max_tips: int,
) -> Well:
    _tips_used = sum([tc for tc in _tip_counter.values()])
    if _tips_used >= max_tips:
        if cfg.pipette_channels != 96:
            raise RuntimeError("ran out of tips")
        if not ctx.is_simulating():
            ui.print_title("Reset 96ch Tip Racks")
            ui.get_user_ready(f"ADD {max_tips}x new tip-racks")
        _tip_counter[channel] = 0
    _tip = tips[channel][_tip_counter[channel]]
    _tip_counter[channel] += 1
    return _tip


@dataclass
class _RunParameters:
    test_volumes: List[float]
    tips: Dict[int, List[Well]]
    num_channels_per_transfer: int
    channels_to_test: List[int]
    trial_total: int
    total_tips: int


def _calculate_parameters(
    ctx: ProtocolContext, cfg: config.GravimetricConfig, pipette: InstrumentContext
) -> _RunParameters:
    test_volumes = _get_volumes(ctx, cfg)
    for v in test_volumes:
        print(f"\t{v} uL")
    all_channels_same_time = cfg.increment or cfg.pipette_channels == 96
    tips = get_tips(ctx, pipette, all_channels=all_channels_same_time)
    total_tips = len([tip for chnl_tips in tips.values() for tip in chnl_tips])
    channels_to_test = _get_test_channels(cfg)
    for channel in channels_to_test:
        # initialize the global tip counter, per each channel that will be tested
        _tip_counter[channel] = 0
    if len(channels_to_test) > 1:
        num_channels_per_transfer = 1
    else:
        num_channels_per_transfer = cfg.pipette_channels
    trial_total = len(test_volumes) * cfg.trials * len(channels_to_test)
    support_tip_resupply = bool(cfg.pipette_channels == 96 and cfg.increment)
    if trial_total > total_tips:
        if not support_tip_resupply:
            raise ValueError(f"more trials ({trial_total}) than tips ({total_tips})")
        elif not ctx.is_simulating():
            ui.get_user_ready(f"prepare {trial_total - total_tips} extra tip-racks")
    return _RunParameters(
        test_volumes=test_volumes,
        tips=tips,
        num_channels_per_transfer=num_channels_per_transfer,
        channels_to_test=channels_to_test,
        trial_total=trial_total,
        total_tips=total_tips,
    )


def run(ctx: ProtocolContext, cfg: config.GravimetricConfig) -> None:
    """Run."""
    run_id, start_time = create_run_id_and_start_time()

    ui.print_header("LOAD LABWARE")
    labware_on_scale, tipracks = _load_labware(ctx, cfg)
    liquid_tracker = LiquidTracker()
    initialize_liquid_from_deck(ctx, liquid_tracker)

    ui.print_header("LOAD PIPETTE")
    pipette = _load_pipette(ctx, cfg)
    pipette_tag = _get_tag_from_pipette(pipette, cfg)

    ui.print_header("GET PARAMETERS")
    parameters = _calculate_parameters(ctx, cfg, pipette)

    ui.print_header("LOAD SCALE")
    print(
        "Some Radwag settings cannot be controlled remotely.\n"
        "Listed below are the things the must be done using the touchscreen:\n"
        "  1) Set profile to USER\n"
        "  2) Set screensaver to NONE\n"
    )
    recorder = GravimetricRecorder(
        GravimetricRecorderConfig(
            test_name=cfg.name,
            run_id=run_id,
            tag=pipette_tag,
            start_time=start_time,
            duration=0,
            frequency=1000 if ctx.is_simulating() else 5,
            stable=False,
        ),
        simulate=ctx.is_simulating(),
    )
    print(f'found scale "{recorder.serial_number}"')
    if ctx.is_simulating():
        start_sim_mass = {50: 15, 200: 200, 1000: 200}
        recorder.set_simulation_mass(start_sim_mass[cfg.tip_volume])
    recorder.record(in_thread=True)
    print(f'scale is recording to "{recorder.file_name}"')

    ui.print_header("CREATE TEST-REPORT")
    test_report = report.create_csv_test_report(
        parameters.test_volumes, cfg, run_id=run_id
    )
    test_report.set_tag(pipette_tag)
    test_report.set_operator(_get_operator_name(ctx.is_simulating()))
    serial_number = _get_robot_serial(ctx.is_simulating())
    tip_batch = _get_tip_batch(ctx.is_simulating())
    test_report.set_version(get_git_description())
    report.store_serial_numbers(
        test_report,
        robot=serial_number,
        pipette=pipette_tag,
        tips=tip_batch,
        scale=recorder.serial_number,
        environment="None",
        liquid="None",
    )

    calibration_tip_in_use = True
    try:
        ui.print_title("FIND LIQUID HEIGHT")
        print("homing...")
        ctx.home()
        pipette.home_plunger()
        first_tip = parameters.tips[0][0]
        setup_channel_offset = _get_channel_offset(cfg, channel=0)
        first_tip_location = first_tip.top().move(setup_channel_offset)
        _pick_up_tip(ctx, pipette, cfg, location=first_tip_location)
        mnt = OT3Mount.LEFT if cfg.pipette_mount == "left" else OT3Mount.RIGHT
        ctx._core.get_hardware().retract(mnt)
        if not ctx.is_simulating():
            ui.get_user_ready("REPLACE first tip with NEW TIP")
            ui.get_user_ready("CLOSE the door, and MOVE AWAY from machine")
        print("moving to scale")
        well = labware_on_scale["A1"]
        pipette.move_to(well.top(0))
        _liquid_height = _jog_to_find_liquid_height(ctx, pipette, well)
        height_below_top = well.depth - _liquid_height
        print(f"liquid is {height_below_top} mm below top of vial")
        liquid_tracker.set_start_volume_from_liquid_height(
            labware_on_scale["A1"], _liquid_height, name="Water"
        )
        vial_volume = liquid_tracker.get_volume(well)
        print(f"software thinks there is {vial_volume} uL of liquid in the vial")

        if not cfg.blank or cfg.inspect:
            average_aspirate_evaporation_ul = 0.0
            average_dispense_evaporation_ul = 0.0
        else:
            ui.print_title("MEASURE EVAPORATION")
            print(f"running {config.NUM_BLANK_TRIALS}x blank measurements")
            mnt = OT3Mount.RIGHT if pipette.mount == "right" else OT3Mount.LEFT
            ctx._core.get_hardware().retract(mnt)
            for i in range(config.SCALE_SECONDS_TO_TRUE_STABILIZE):
                print(
                    f"wait for scale to stabilize "
                    f"({i + 1}/{config.SCALE_SECONDS_TO_TRUE_STABILIZE})"
                )
                sleep(1)
            actual_asp_list_evap: List[float] = []
            actual_disp_list_evap: List[float] = []
            for trial in range(config.NUM_BLANK_TRIALS):
                ui.print_header(f"BLANK {trial + 1}/{config.NUM_BLANK_TRIALS}")
                evap_aspirate, _, evap_dispense, _ = _run_trial(
                    ctx=ctx,
                    pipette=pipette,
                    well=labware_on_scale["A1"],
                    channel_offset=Point(),  # first channel
                    tip_volume=cfg.tip_volume,
                    volume=parameters.test_volumes[-1],
                    channel=0,  # first channel
                    channel_count=parameters.num_channels_per_transfer,
                    trial=trial,
                    recorder=recorder,
                    test_report=test_report,
                    liquid_tracker=liquid_tracker,
                    blank=True,  # stay away from the liquid
                    inspect=cfg.inspect,
                    mix=cfg.mix,
                    stable=True,
                    scale_delay=cfg.scale_delay,
                )
                print(
                    f"blank {trial + 1}/{config.NUM_BLANK_TRIALS}:\n"
                    f"\taspirate: {evap_aspirate} uL\n"
                    f"\tdispense: {evap_dispense} uL"
                )
                actual_asp_list_evap.append(evap_aspirate)
                actual_disp_list_evap.append(evap_dispense)
            ui.print_header("EVAPORATION AVERAGE")
            average_aspirate_evaporation_ul = _calculate_average(actual_asp_list_evap)
            average_dispense_evaporation_ul = _calculate_average(actual_disp_list_evap)
            print(
                "average:\n"
                f"\taspirate: {average_aspirate_evaporation_ul} uL\n"
                f"\tdispense: {average_dispense_evaporation_ul} uL"
            )
            report.store_average_evaporation(
                test_report,
                average_aspirate_evaporation_ul,
                average_dispense_evaporation_ul,
            )
        print("dropping tip")
        _drop_tip(pipette, return_tip=False)  # always trash calibration tips
        calibration_tip_in_use = False
        trial_count = 0
        for volume in parameters.test_volumes:
            actual_asp_list_all = []
            actual_disp_list_all = []
            ui.print_title(f"{volume} uL")

            trial_asp_dict: Dict[int, List[float]] = {
                trial: [] for trial in range(cfg.trials)
            }
            trial_disp_dict: Dict[int, List[float]] = {
                trial: [] for trial in range(cfg.trials)
            }
            for channel in parameters.channels_to_test:
                if cfg.isolate_channels and (channel + 1) not in cfg.isolate_channels:
                    print(f"skipping channel {channel + 1}")
                    continue
                channel_offset = _get_channel_offset(cfg, channel)
                actual_asp_list_channel = []
                actual_disp_list_channel = []
                aspirate_data_list = []
                dispense_data_list = []
                for trial in range(cfg.trials):
                    trial_count += 1
                    ui.print_header(
                        f"{volume} uL channel {channel + 1} ({trial + 1}/{cfg.trials})"
                    )
                    print(f"trial total {trial_count}/{parameters.trial_total}")
                    # NOTE: always pick-up new tip for each trial
                    #       b/c it seems tips heatup
                    next_tip: Well = _next_tip_for_channel(
                        ctx, cfg, parameters.tips, channel, parameters.total_tips
                    )
                    next_tip_location = next_tip.top().move(channel_offset)
                    _pick_up_tip(ctx, pipette, cfg, location=next_tip_location)
                    (
                        actual_aspirate,
                        aspirate_data,
                        actual_dispense,
                        dispense_data,
                    ) = _run_trial(
                        ctx=ctx,
                        pipette=pipette,
                        well=labware_on_scale["A1"],
                        channel_offset=channel_offset,
                        tip_volume=cfg.tip_volume,
                        volume=volume,
                        channel=channel,
                        channel_count=parameters.num_channels_per_transfer,
                        trial=trial,
                        recorder=recorder,
                        test_report=test_report,
                        liquid_tracker=liquid_tracker,
                        blank=False,
                        inspect=cfg.inspect,
                        mix=cfg.mix,
                        stable=True,
                        scale_delay=cfg.scale_delay,
                    )
                    print(
                        "measured volumes:\n"
                        f"\taspirate: {round(actual_aspirate, 2)} uL\n"
                        f"\tdispense: {round(actual_dispense, 2)} uL"
                    )
                    asp_with_evap = actual_aspirate - average_aspirate_evaporation_ul
                    disp_with_evap = actual_dispense + average_dispense_evaporation_ul
                    chnl_div = _get_channel_divider(cfg)
                    disp_with_evap /= chnl_div
                    asp_with_evap /= chnl_div
                    print(
                        "per-channel volume, with evaporation:\n"
                        f"\taspirate: {round(asp_with_evap, 2)} uL\n"
                        f"\tdispense: {round(disp_with_evap, 2)} uL"
                    )

                    actual_asp_list_channel.append(asp_with_evap)
                    actual_disp_list_channel.append(disp_with_evap)

                    trial_asp_dict[trial].append(asp_with_evap)
                    trial_disp_dict[trial].append(disp_with_evap)

                    aspirate_data_list.append(aspirate_data)
                    dispense_data_list.append(dispense_data)

                    report.store_trial(
                        test_report,
                        trial,
                        volume,
                        channel,
                        asp_with_evap,
                        disp_with_evap,
                    )
                    print("dropping tip")
                    _drop_tip(pipette, cfg.return_tip)

                ui.print_header(f"{volume} uL channel {channel + 1} CALCULATIONS")
                aspirate_average, aspirate_cv, aspirate_d = _calculate_stats(
                    actual_asp_list_channel, volume
                )
                dispense_average, dispense_cv, dispense_d = _calculate_stats(
                    actual_disp_list_channel, volume
                )

                # Average Celsius
                aspirate_celsius_avg = sum(
                    a_data.environment.celsius_pipette for a_data in dispense_data_list
                ) / len(aspirate_data_list)
                dispense_celsius_avg = sum(
                    d_data.environment.celsius_pipette for d_data in aspirate_data_list
                ) / len(dispense_data_list)
                # Average humidity
                aspirate_humidity_avg = sum(
                    a_data.environment.humidity_pipette for a_data in dispense_data_list
                ) / len(aspirate_data_list)
                dispense_humidity_avg = sum(
                    d_data.environment.humidity_pipette for d_data in aspirate_data_list
                ) / len(dispense_data_list)

                _print_stats("aspirate", aspirate_average, aspirate_cv, aspirate_d)
                _print_stats("dispense", dispense_average, dispense_cv, dispense_d)

                report.store_volume_per_channel(
                    report=test_report,
                    mode="aspirate",
                    volume=volume,
                    channel=channel,
                    average=aspirate_average,
                    cv=aspirate_cv,
                    d=aspirate_d,
                    celsius=aspirate_celsius_avg,
                    humidity=aspirate_humidity_avg,
                )
                report.store_volume_per_channel(
                    report=test_report,
                    mode="dispense",
                    volume=volume,
                    channel=channel,
                    average=dispense_average,
                    cv=dispense_cv,
                    d=dispense_d,
                    celsius=dispense_celsius_avg,
                    humidity=dispense_humidity_avg,
                )
                actual_asp_list_all.extend(actual_asp_list_channel)
                actual_disp_list_all.extend(actual_disp_list_channel)

            for trial in range(cfg.trials):
                trial_asp_list = trial_asp_dict[trial]
                trial_disp_list = trial_disp_dict[trial]

                aspirate_average, aspirate_cv, aspirate_d = _calculate_stats(
                    trial_asp_list, volume
                )
                dispense_average, dispense_cv, dispense_d = _calculate_stats(
                    trial_disp_list, volume
                )

                report.store_volume_per_trial(
                    report=test_report,
                    mode="aspirate",
                    volume=volume,
                    trial=trial,
                    average=aspirate_average,
                    cv=aspirate_cv,
                    d=aspirate_d,
                )
                report.store_volume_per_trial(
                    report=test_report,
                    mode="dispense",
                    volume=volume,
                    trial=trial,
                    average=dispense_average,
                    cv=dispense_cv,
                    d=dispense_d,
                )

            ui.print_header(f"{volume} uL channel all CALCULATIONS")
            aspirate_average, aspirate_cv, aspirate_d = _calculate_stats(
                actual_asp_list_all, volume
            )
            dispense_average, dispense_cv, dispense_d = _calculate_stats(
                actual_disp_list_all, volume
            )

            _print_stats("aspirate", aspirate_average, aspirate_cv, aspirate_d)
            _print_stats("dispense", dispense_average, dispense_cv, dispense_d)

            report.store_volume_all(
                report=test_report,
                mode="aspirate",
                volume=volume,
                average=aspirate_average,
                cv=aspirate_cv,
                d=aspirate_d,
            )
            report.store_volume_all(
                report=test_report,
                mode="dispense",
                volume=volume,
                average=dispense_average,
                cv=dispense_cv,
                d=dispense_d,
            )
    finally:
        print("ending recording")
        recorder.stop()
        recorder.deactivate()
        ui.print_title("CHANGE PIPETTES")
        _return_tip = False if calibration_tip_in_use else cfg.return_tip
        _change_pipettes(ctx, pipette, _return_tip)
    ui.print_title("RESULTS")
    _print_final_results(
        volumes=parameters.test_volumes,
        channel_count=len(parameters.channels_to_test),
        test_report=test_report,
    )
