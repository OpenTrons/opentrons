"""Gravimetric."""
from time import sleep
from typing import Optional, Tuple, List, Dict

from opentrons.protocol_api import ProtocolContext, Well, Labware, InstrumentContext
from subprocess import run as run_subprocess
import subprocess
from hardware_testing.data import ui
from hardware_testing.data.csv_report import CSVReport
from hardware_testing.opentrons_api.types import Point, OT3Mount, Axis
from hardware_testing.drivers import asair_sensor
import os
from . import report
from . import config
from .helpers import (
    _calculate_stats,
    _get_channel_offset,
    _calculate_average,
    _jog_to_find_liquid_height,
    _sense_liquid_height,
    _pick_up_tip,
    _drop_tip,
    get_latest_offset_for_labware,
    _get_offsets_from_ctx,
)
from .trial import (
    build_gravimetric_trials,
    GravimetricTrial,
    TestResources,
    _finish_test,
)
from .liquid_class.pipetting import (
    mix_with_liquid_class,
    aspirate_with_liquid_class,
    dispense_with_liquid_class,
    PipettingCallbacks,
)
from .liquid_height.height import LiquidTracker
from .measurement import (
    MeasurementData,
    MeasurementType,
    record_measurement_data,
    calculate_change_in_volume,
    create_measurement_tag,
    SupportedLiquid,
)
from .measurement.environment import get_min_reading, get_max_reading
from .measurement.record import (
    GravimetricRecorder,
    GravimetricRecorderConfig,
    GravimetricRecording,
)
from .measurement.scale import Scale
from .tips import MULTI_CHANNEL_TEST_ORDER
import glob

from opentrons.hardware_control.types import StatusBarState
from hardware_testing.gravimetric.workarounds import get_sync_hw_api
from opentrons.protocol_api.labware import SET_OFFSET_RESTORED_API_VERSION

_MEASUREMENTS: List[Tuple[str, MeasurementData]] = list()

_PREV_TRIAL_GRAMS: Optional[MeasurementData] = None

_tip_counter: Dict[int, int] = {}

CAM_CMD_OT3 = (
    "v4l2-ctl --device {1} --set-fmt-video=width=1920,height=1080,pixelformat=MJPG "
    "--stream-mmap --stream-to={0} --stream-count=1"
)


def _minimum_z_height(cfg: config.GravimetricConfig) -> int:
    if cfg.pipette_channels == 96:
        return 133
    else:
        return 0


def _generate_callbacks_for_trial(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    test_report: CSVReport,
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

    hw_api = get_sync_hw_api(ctx)
    hw_mount = OT3Mount.LEFT if pipette.mount == "left" else OT3Mount.RIGHT
    pip_ax = Axis.of_main_tool_actuator(hw_mount)
    estimate_bottom: float = -1
    estimate_aspirated: float = -1
    encoder_bottom: float = -1
    encoder_aspirated: float = -1

    def _on_aspirating() -> None:
        nonlocal estimate_bottom, encoder_bottom
        recorder.set_sample_tag(
            create_measurement_tag("aspirate", volume, channel, trial)
        )
        if not volume:
            return
        estimate_bottom = hw_api.current_position_ot3(hw_mount)[pip_ax]
        encoder_bottom = hw_api.encoder_current_position_ot3(hw_mount)[pip_ax]

    def _on_retracting() -> None:
        nonlocal estimate_aspirated, encoder_aspirated
        recorder.set_sample_tag(
            create_measurement_tag("retract", volume, channel, trial)
        )
        if not volume or estimate_aspirated >= 0 or encoder_aspirated >= 0:
            # NOTE: currently in dispense, because trial was already recorded
            return
        estimate_aspirated = hw_api.current_position_ot3(hw_mount)[pip_ax]
        encoder_aspirated = hw_api.encoder_current_position_ot3(hw_mount)[pip_ax]
        report.store_encoder(
            test_report,
            volume,
            channel,
            trial,
            estimate_bottom,
            encoder_bottom,
            estimate_aspirated,
            encoder_aspirated,
        )

    return PipettingCallbacks(
        on_submerging=lambda: recorder.set_sample_tag(
            create_measurement_tag("submerge", volume, channel, trial)
        ),
        on_mixing=lambda: recorder.set_sample_tag(
            create_measurement_tag("mix", volume, channel, trial)
        ),
        on_aspirating=_on_aspirating,
        on_retracting=_on_retracting,
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


def _load_labware(ctx: ProtocolContext, cfg: config.GravimetricConfig) -> Labware:
    ui.print_info(f'Loading labware on scale: "{cfg.labware_on_scale}"')
    if cfg.labware_on_scale == "radwag_pipette_calibration_vial":
        namespace = "custom_beta"
    else:
        namespace = "opentrons"
    # If running multiple tests in one run, the labware may already be loaded
    loaded_labwares = ctx.loaded_labwares
    if (
        cfg.slot_scale in loaded_labwares.keys()
        and loaded_labwares[cfg.slot_scale].name == cfg.labware_on_scale
    ):
        return loaded_labwares[cfg.slot_scale]

    labware_on_scale = ctx.load_labware(
        cfg.labware_on_scale, location=cfg.slot_scale, namespace=namespace
    )
    if ctx.api_version >= SET_OFFSET_RESTORED_API_VERSION:
        offset = get_latest_offset_for_labware(
            _get_offsets_from_ctx(ctx), labware_on_scale
        )
        labware_on_scale.set_offset(offset.x, offset.y, offset.z)
    return labware_on_scale


def _print_stats(mode: str, average: float, cv: float, d: float) -> None:
    ui.print_info(
        f"{mode}:\n"
        f"\tavg: {round(average, 2)} uL\n"
        f"\tcv: {round(cv * 100.0, 2)}%\n"
        f"\td: {round(d * 100.0, 2)}%"
    )


def _print_final_results(
    volumes: List[float], channel_count: int, test_report: CSVReport
) -> None:
    for vol in volumes:
        ui.print_info(f"  * {vol}ul channel all:")
        for mode in ["aspirate", "dispense"]:
            avg, cv, d = report.get_volume_results_all(test_report, mode, vol)
            ui.print_info(f"    - {mode}:")
            ui.print_info(f"        avg: {avg}ul")
            ui.print_info(f"        cv:  {cv}%")
            ui.print_info(f"        d:   {d}%")
        for channel in range(channel_count):
            ui.print_info(f"  * vol {vol}ul channel {channel + 1}:")
            for mode in ["aspirate", "dispense"]:
                avg, cv, d = report.get_volume_results_per_channel(
                    test_report, mode, vol, channel
                )
                ui.print_info(f"    - {mode}:")
                ui.print_info(f"        avg: {avg}ul")
                ui.print_info(f"        cv:  {cv}%")
                ui.print_info(f"        d:   {d}%")


def _next_tip_for_channel(
    cfg: config.GravimetricConfig,
    resources: TestResources,
    channel: int,
    max_tips: int,
) -> Well:
    _tips_used = sum([tc for tc in _tip_counter.values()])
    if _tips_used >= max_tips:
        if cfg.pipette_channels != 96:
            raise RuntimeError("ran out of tips")
        if not resources.ctx.is_simulating():
            ui.print_title("Reset 96ch Tip Racks")
            ui.get_user_ready(f"ADD {max_tips}x new tip-racks")
        _tip_counter[channel] = 0
    _tip = resources.tips[channel][_tip_counter[channel]]
    _tip_counter[channel] += 1
    return _tip


def _take_photos(trial: GravimetricTrial, stage_str: str) -> None:
    if trial.ctx.is_simulating():
        cameras = ["/dev/video0"]
    else:
        cameras = glob.glob("/dev/video*")
    for camera in cameras:
        cam_pic_name = f"camera{camera[-1]}_channel{trial.channel}_volume{trial.volume}"
        cam_pic_name += f"_trial{trial.trial}_{stage_str}.jpg"
        if trial.ctx.is_simulating():
            cam_pic_name = cam_pic_name.replace(".jpg", ".txt")
        cam_pic_path = (
            f"{trial.test_report.parent}/{trial.test_report._run_id}/{cam_pic_name}"
        )
        process_cmd = CAM_CMD_OT3.format(str(cam_pic_path), camera)
        if trial.ctx.is_simulating():
            with open(cam_pic_path, "w") as f:
                f.write(str(cam_pic_name))  # create a test file
        else:
            try:
                run_subprocess(process_cmd.split(" "), timeout=2)  # take a picture
            except subprocess.TimeoutExpired:
                os.remove(cam_pic_path)


def _run_trial(
    trial: GravimetricTrial,
) -> Tuple[float, MeasurementData, float, MeasurementData]:
    global _PREV_TRIAL_GRAMS
    pipetting_callbacks = _generate_callbacks_for_trial(
        trial.ctx,
        trial.pipette,
        trial.test_report,
        trial.recorder,
        trial.volume,
        trial.channel,
        trial.trial,
        trial.blank,
    )

    def _tag(m_type: MeasurementType) -> str:
        tag = create_measurement_tag(
            m_type, None if trial.blank else trial.volume, trial.channel, trial.trial
        )
        return tag

    def _record_measurement_and_store(m_type: MeasurementType) -> MeasurementData:
        m_tag = _tag(m_type)
        if trial.recorder.is_simulator and not trial.blank:
            if m_type == MeasurementType.ASPIRATE:
                trial.recorder.add_simulation_mass(
                    trial.channel_count * trial.volume * -0.001
                )
            elif m_type == MeasurementType.DISPENSE:
                trial.recorder.add_simulation_mass(
                    trial.channel_count * trial.volume * 0.001
                )
        m_data = record_measurement_data(
            trial.ctx,
            m_tag,
            trial.recorder,
            trial.pipette.mount,
            trial.stable,
            trial.env_sensor,
            shorten=False,  # TODO: remove this
            delay_seconds=trial.scale_delay,
        )
        report.store_measurement(trial.test_report, m_tag, m_data)
        _MEASUREMENTS.append(
            (
                m_tag,
                m_data,
            )
        )
        _update_environment_first_last_min_max(trial.test_report)
        return m_data

    ui.print_info("recorded weights:")

    # RUN MIX
    if trial.mix:
        mix_with_liquid_class(
            trial.ctx,
            trial.pipette,
            trial.tip_volume,
            max(trial.volume, 5),
            trial.well,
            trial.channel_offset,
            trial.channel_count,
            trial.liquid_tracker,
            callbacks=pipetting_callbacks,
            blank=trial.blank,
            mode=trial.mode,
            clear_accuracy_function=trial.cfg.increment,
        )
    else:
        # center channel over well
        trial.pipette.move_to(trial.well.top(50).move(trial.channel_offset))
    trial.pipette._retract()  # retract to top of gantry
    m_data_init = _record_measurement_and_store(MeasurementType.INIT)
    ui.print_info(f"\tinitial grams: {m_data_init.grams_average} g")
    # update the vials volumes, using the last-known weight
    if _PREV_TRIAL_GRAMS is not None:
        liq = SupportedLiquid.from_string(trial.cfg.liquid)
        _evaporation_loss_ul = abs(
            calculate_change_in_volume(_PREV_TRIAL_GRAMS, m_data_init, liq)
        )
        ui.print_info(f"{_evaporation_loss_ul} ul evaporated since last trial")
        trial.liquid_tracker.update_affected_wells(
            trial.well, aspirate=_evaporation_loss_ul, channels=1
        )
    _PREV_TRIAL_GRAMS = m_data_init

    # RUN ASPIRATE
    aspirate_with_liquid_class(
        trial.ctx,
        trial.pipette,
        trial.tip_volume,
        trial.volume,
        trial.well,
        trial.channel_offset,
        trial.channel_count,
        trial.liquid_tracker,
        callbacks=pipetting_callbacks,
        blank=trial.blank,
        mode=trial.mode,
        clear_accuracy_function=trial.cfg.increment,
    )



    pipette.transfer_liquid(10, well_a1, well_b1, liquid_class=custom_cls)
    pipette.transfer_liquid(20, well_a1, well_b1, liquid_class=custom_cls)
    pipette.transfer_liquid(30, well_a1, well_b1, liquid_class=custom_cls)
    pipette.transfer_liquid(40, well_a1, well_b1, liquid_class=custom_cls)



    trial.pipette._retract()  # retract to top of gantry

    _take_photos(trial, "aspirate")
    m_data_aspirate = _record_measurement_and_store(MeasurementType.ASPIRATE)
    ui.print_info(f"\tgrams after aspirate: {m_data_aspirate.grams_average} g")
    ui.print_info(f"\tcelsius after aspirate: {m_data_aspirate.celsius_pipette} C")

    # RUN DISPENSE
    dispense_with_liquid_class(
        trial.ctx,
        trial.pipette,
        trial.tip_volume,
        trial.volume,
        trial.well,
        trial.channel_offset,
        trial.channel_count,
        trial.liquid_tracker,
        callbacks=pipetting_callbacks,
        blank=trial.blank,
        mode=trial.mode,
        clear_accuracy_function=trial.cfg.increment,
    )
    trial.pipette._retract()  # retract to top of gantry
    _take_photos(trial, "dispense")
    m_data_dispense = _record_measurement_and_store(MeasurementType.DISPENSE)
    ui.print_info(f"\tgrams after dispense: {m_data_dispense.grams_average} g")
    # calculate volumes
    liq = SupportedLiquid.from_string(trial.cfg.liquid)
    volume_aspirate = calculate_change_in_volume(m_data_init, m_data_aspirate, liq)
    volume_dispense = calculate_change_in_volume(m_data_aspirate, m_data_dispense, liq)
    return volume_aspirate, m_data_aspirate, volume_dispense, m_data_dispense


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


def build_gm_report(
    test_volumes: List[float],
    run_id: str,
    pipette_tag: str,
    operator_name: str,
    git_description: str,
    robot_serial: str,
    tip_batchs: Dict[str, str],
    recorder: GravimetricRecorder,
    pipette_channels: int,
    increment: bool,
    name: str,
    environment_sensor: asair_sensor.AsairSensorBase,
    trials: int,
    fw_version: str,
) -> report.CSVReport:
    """Build a CSVReport formated for gravimetric tests."""
    ui.print_header("CREATE TEST-REPORT")
    test_report = report.create_csv_test_report(
        test_volumes, pipette_channels, increment, trials, name, run_id=run_id
    )
    test_report.set_tag(pipette_tag)
    test_report.set_operator(operator_name)
    test_report.set_version(git_description)
    test_report.set_firmware(fw_version)
    report.store_serial_numbers(
        test_report,
        robot=robot_serial,
        pipette=pipette_tag,
        tips=tip_batchs,
        scale=recorder.serial_number,
        environment=environment_sensor.get_serial(),
        liquid="None",
    )
    return test_report


def _load_scale(
    name: str,
    scale: Scale,
    run_id: str,
    pipette_tag: str,
    start_time: float,
    simulating: bool,
) -> GravimetricRecorder:
    ui.print_header("LOAD SCALE")
    ui.print_info(
        "Some Radwag settings cannot be controlled remotely.\n"
        "Listed below are the things the must be done using the touchscreen:\n"
        "  1) Set profile to USER\n"
        "  2) Set screensaver to NONE\n"
    )
    recorder = GravimetricRecorder(
        GravimetricRecorderConfig(
            test_name=name,
            run_id=run_id,
            tag=pipette_tag,
            start_time=start_time,
            duration=0,
            frequency=1000 if simulating else 5,
            stable=False,
        ),
        scale,
        simulate=simulating,
    )
    ui.print_info(f'found scale "{recorder.serial_number}"')
    if simulating:
        recorder.set_simulation_mass(0)
    recorder.record(in_thread=True)
    ui.print_info(f'scale is recording to "{recorder.file_name}"')
    return recorder


def _calculate_evaporation(
    cfg: config.GravimetricConfig,
    resources: TestResources,
    recorder: GravimetricRecorder,
    liquid_tracker: LiquidTracker,
    test_report: report.CSVReport,
    labware_on_scale: Labware,
) -> Tuple[float, float]:
    ui.print_title("MEASURE EVAPORATION")
    blank_trials = build_gravimetric_trials(
        resources.ctx,
        resources.pipette,
        cfg,
        labware_on_scale["A1"],
        [resources.test_volumes[-1]],
        [],
        recorder,
        test_report,
        liquid_tracker,
        True,
        resources.env_sensor,
    )
    ui.print_info(f"running {config.NUM_BLANK_TRIALS}x blank measurements")
    resources.pipette._retract()
    for i in range(config.SCALE_SECONDS_TO_TRUE_STABILIZE):
        ui.print_info(
            f"wait for scale to stabilize "
            f"({i + 1}/{config.SCALE_SECONDS_TO_TRUE_STABILIZE})"
        )
        if not resources.ctx.is_simulating():
            sleep(1)
    actual_asp_list_evap: List[float] = []
    actual_disp_list_evap: List[float] = []
    for b_trial in blank_trials[resources.test_volumes[-1]][0]:
        ui.print_header(f"BLANK {b_trial.trial + 1}/{config.NUM_BLANK_TRIALS}")
        evap_aspirate, _, evap_dispense, _ = _run_trial(b_trial)
        ui.print_info(
            f"blank {b_trial.trial + 1}/{config.NUM_BLANK_TRIALS}:\n"
            f"\taspirate: {evap_aspirate} uL\n"
            f"\tdispense: {evap_dispense} uL"
        )
        actual_asp_list_evap.append(evap_aspirate)
        actual_disp_list_evap.append(evap_dispense)
    ui.print_header("EVAPORATION AVERAGE")
    average_aspirate_evaporation_ul = _calculate_average(actual_asp_list_evap)
    average_dispense_evaporation_ul = _calculate_average(actual_disp_list_evap)
    ui.print_info(
        "average:\n"
        f"\taspirate: {average_aspirate_evaporation_ul} uL\n"
        f"\tdispense: {average_dispense_evaporation_ul} uL"
    )
    report.store_average_evaporation(
        test_report,
        average_aspirate_evaporation_ul,
        average_dispense_evaporation_ul,
    )
    return average_aspirate_evaporation_ul, average_dispense_evaporation_ul


def _get_liquid_height(
    resources: TestResources, cfg: config.GravimetricConfig, well: Well
) -> float:
    resources.pipette.move_to(well.top(0), minimum_z_height=_minimum_z_height(cfg))
    if cfg.pipette_channels == 96:
        if not resources.ctx.is_simulating() and not cfg.same_tip:
            ui.alert_user_ready(
                f"Please replace the {cfg.tip_volume}ul tips in slot 2",
                get_sync_hw_api(resources.ctx),
            )
        _tip_counter[0] = 0
    if cfg.jog:
        _liquid_height = _jog_to_find_liquid_height(
            resources.ctx, resources.pipette, well
        )
    else:
        _liquid_height = _sense_liquid_height(
            resources.ctx, resources.pipette, well, cfg
        )
    resources.pipette.move_to(well.top().move(Point(0, 0, _minimum_z_height(cfg))))
    return _liquid_height


def run(cfg: config.GravimetricConfig, resources: TestResources) -> None:  # noqa: C901
    """Run."""
    global _PREV_TRIAL_GRAMS
    global _MEASUREMENTS
    ui.print_header("LOAD LABWARE")
    labware_on_scale = _load_labware(resources.ctx, cfg)
    liquid_tracker = LiquidTracker(resources.ctx)

    total_tips = len(
        [tip for chnl_tips in resources.tips.values() for tip in chnl_tips]
    )
    channels_to_test = _get_test_channels(cfg)
    for channel in channels_to_test:
        # initialize the global tip counter, per each channel that will be tested
        _tip_counter[channel] = 0
    trial_total = len(resources.test_volumes) * cfg.trials * len(channels_to_test)
    support_tip_resupply = bool(cfg.pipette_channels == 96)
    if (trial_total + 1) > total_tips:
        if not support_tip_resupply:
            raise ValueError(f"more trials ({trial_total}) than tips ({total_tips})")
        elif not resources.ctx.is_simulating():
            ui.get_user_ready(
                f"prepare {(trial_total + 1) - total_tips} extra tip-racks"
            )
    assert resources.recorder is not None
    recorder = resources.recorder
    if resources.ctx.is_simulating():
        start_sim_mass = {20: 5, 50: 15, 200: 200, 1000: 200}
        resources.recorder.set_simulation_mass(start_sim_mass[cfg.tip_volume])
    os.makedirs(
        f"{resources.test_report.parent}/{resources.test_report._run_id}", exist_ok=True
    )
    recorder._recording = GravimetricRecording()
    report.store_config_gm(resources.test_report, cfg)
    calibration_tip_in_use = True
    hw_api = get_sync_hw_api(resources.ctx)
    if resources.ctx.is_simulating():
        _PREV_TRIAL_GRAMS = None
        _MEASUREMENTS = list()
    try:
        ui.print_title("FIND LIQUID HEIGHT")
        first_tip = _next_tip_for_channel(cfg, resources, 0, total_tips)
        setup_channel_offset = _get_channel_offset(cfg, channel=0)
        first_tip_location = first_tip.top().move(setup_channel_offset)
        _pick_up_tip(resources.ctx, resources.pipette, cfg, location=first_tip_location)
        ui.print_info("moving to scale")
        well = labware_on_scale["A1"]
        _liquid_height = _get_liquid_height(resources, cfg, well)
        height_below_top = well.depth - _liquid_height
        ui.print_info(f"liquid is {height_below_top} mm below top of vial")
        liquid_tracker.set_start_volume_from_liquid_height(
            well, _liquid_height, name="Water"
        )
        vial_volume = liquid_tracker.get_volume(well)
        ui.print_info(
            f"software thinks there is {vial_volume} uL of liquid in the vial"
        )
        if not cfg.blank:
            average_aspirate_evaporation_ul = 0.0
            average_dispense_evaporation_ul = 0.0
        else:
            hw_api.set_status_bar_state(StatusBarState.SOFTWARE_ERROR)
            (
                average_aspirate_evaporation_ul,
                average_dispense_evaporation_ul,
            ) = _calculate_evaporation(
                cfg,
                resources,
                recorder,
                liquid_tracker,
                resources.test_report,
                labware_on_scale,
            )
        hw_api.set_status_bar_state(StatusBarState.IDLE)
        ui.print_info("dropping tip")
        if not cfg.same_tip:
            _drop_tip(
                resources.pipette,
                return_tip=False,
                minimum_z_height=_minimum_z_height(cfg),
                offset=_get_channel_offset(cfg, 0),
            )  # always trash calibration tips
        calibration_tip_in_use = False
        trial_count = 0
        trials = build_gravimetric_trials(
            resources.ctx,
            resources.pipette,
            cfg,
            labware_on_scale["A1"],
            resources.test_volumes,
            channels_to_test,
            recorder,
            resources.test_report,
            liquid_tracker,
            False,
            resources.env_sensor,
        )
        for volume in trials.keys():
            actual_asp_list_all = []
            actual_disp_list_all = []
            ui.print_title(f"{volume} uL")
            resources.pipette.configure_for_volume(volume)
            trial_asp_dict: Dict[int, List[float]] = {
                trial: [] for trial in range(cfg.trials)
            }
            trial_disp_dict: Dict[int, List[float]] = {
                trial: [] for trial in range(cfg.trials)
            }
            for channel in trials[volume].keys():
                channel_offset = _get_channel_offset(cfg, channel)
                actual_asp_list_channel = []
                actual_disp_list_channel = []
                aspirate_data_list = []
                dispense_data_list = []
                for run_trial in trials[volume][channel]:
                    trial_count += 1
                    ui.print_header(
                        f"{volume} uL channel {channel + 1} ({run_trial.trial + 1}/{cfg.trials})"
                    )
                    ui.print_info(f"trial total {trial_count}/{trial_total}")
                    # NOTE: always pick-up new tip for each trial
                    #       b/c it seems tips heatup
                    next_tip: Well = _next_tip_for_channel(
                        cfg, resources, channel, total_tips
                    )
                    next_tip_location = next_tip.top().move(channel_offset)
                    if not cfg.same_tip:
                        _pick_up_tip(
                            resources.ctx,
                            resources.pipette,
                            cfg,
                            location=next_tip_location,
                        )
                        resources.pipette._retract()  # retract to top of gantry
                    (
                        actual_aspirate,
                        aspirate_data,
                        actual_dispense,
                        dispense_data,
                    ) = _run_trial(run_trial)
                    ui.print_info(
                        "measured volumes:\n"
                        f"\taspirate: {round(actual_aspirate, 2)} uL\n"
                        f"\tdispense: {round(actual_dispense, 2)} uL"
                    )
                    asp_with_evap = actual_aspirate - average_aspirate_evaporation_ul
                    disp_with_evap = actual_dispense + average_dispense_evaporation_ul
                    chnl_div = _get_channel_divider(cfg)
                    disp_with_evap /= chnl_div
                    asp_with_evap /= chnl_div
                    ui.print_info(
                        "per-channel volume, with evaporation:\n"
                        f"\taspirate: {round(asp_with_evap, 2)} uL\n"
                        f"\tdispense: {round(disp_with_evap, 2)} uL"
                    )

                    actual_asp_list_channel.append(asp_with_evap)
                    actual_disp_list_channel.append(disp_with_evap)

                    trial_asp_dict[run_trial.trial].append(asp_with_evap)
                    trial_disp_dict[run_trial.trial].append(disp_with_evap)

                    aspirate_data_list.append(aspirate_data)
                    dispense_data_list.append(dispense_data)

                    report.store_trial(
                        resources.test_report,
                        run_trial.trial,
                        run_trial.volume,
                        run_trial.channel,
                        asp_with_evap,
                        disp_with_evap,
                        liquid_tracker.get_liquid_height(well),
                    )
                    ui.print_info("dropping tip")
                    if not cfg.same_tip:
                        resources.pipette._retract()  # retract to top of gantry
                        _drop_tip(
                            resources.pipette,
                            cfg.return_tip,
                            _minimum_z_height(cfg),
                            _get_channel_offset(cfg, run_trial.channel),
                        )

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
                    report=resources.test_report,
                    mode="aspirate",
                    volume=volume,
                    channel=channel,
                    average=aspirate_average,
                    cv=aspirate_cv,
                    d=aspirate_d,
                    celsius=aspirate_celsius_avg,
                    humidity=aspirate_humidity_avg,
                    flag="isolated" if cfg.isolate_volumes else "",
                )
                report.store_volume_per_channel(
                    report=resources.test_report,
                    mode="dispense",
                    volume=volume,
                    channel=channel,
                    average=dispense_average,
                    cv=dispense_cv,
                    d=dispense_d,
                    celsius=dispense_celsius_avg,
                    humidity=dispense_humidity_avg,
                    flag="isolated" if cfg.isolate_volumes else "",
                )
                actual_asp_list_all.extend(actual_asp_list_channel)
                actual_disp_list_all.extend(actual_disp_list_channel)

                acceptable_cv = trials[volume][channel][0].acceptable_cv
                acceptable_d = trials[volume][channel][0].acceptable_d
                print(f"acceptable cv {acceptable_cv} acceptable_d {acceptable_d}")
                print(f"dispense cv {dispense_cv} aspirate_cv {aspirate_cv}")
                print(f"dispense d {dispense_d} aspirate_d {aspirate_d}")
                if (
                    not cfg.ignore_fail
                    and acceptable_cv is not None
                    and acceptable_d is not None
                ):
                    acceptable_cv = abs(acceptable_cv / 100)
                    acceptable_d = abs(acceptable_d / 100)
                    if (
                        dispense_cv > acceptable_cv
                        or aspirate_cv > acceptable_cv
                        or abs(aspirate_d) > acceptable_d
                        or abs(dispense_d) > acceptable_d
                    ):
                        raise RuntimeError(
                            f"Trial with volume {volume} on channel {channel} did not pass spec"
                        )
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
                    report=resources.test_report,
                    mode="aspirate",
                    volume=volume,
                    trial=trial,
                    average=aspirate_average,
                    cv=aspirate_cv,
                    d=aspirate_d,
                    flag="isolated" if cfg.isolate_volumes else "",
                )
                report.store_volume_per_trial(
                    report=resources.test_report,
                    mode="dispense",
                    volume=volume,
                    trial=trial,
                    average=dispense_average,
                    cv=dispense_cv,
                    d=dispense_d,
                    flag="isolated" if cfg.isolate_volumes else "",
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
                report=resources.test_report,
                mode="aspirate",
                volume=volume,
                average=aspirate_average,
                cv=aspirate_cv,
                d=aspirate_d,
                flag="isolated" if cfg.isolate_volumes else "",
            )
            report.store_volume_all(
                report=resources.test_report,
                mode="dispense",
                volume=volume,
                average=dispense_average,
                cv=dispense_cv,
                d=dispense_d,
                flag="isolated" if cfg.isolate_volumes else "",
            )
    finally:
        _return_tip = False if calibration_tip_in_use else cfg.return_tip
        _finish_test(cfg, resources, _return_tip)
    ui.print_title("RESULTS")
    _print_final_results(
        volumes=resources.test_volumes,
        channel_count=len(channels_to_test),
        test_report=resources.test_report,
    )
