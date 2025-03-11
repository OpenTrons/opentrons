"""Gravimetric."""
from time import sleep
from typing import Optional, Tuple, List, Dict, Callable

from opentrons.protocol_api import (
    ProtocolContext,
    Well,
    Labware,
    InstrumentContext,
    LiquidClass,
)
from opentrons.protocol_api._liquid import TransferProperties

from opentrons.protocol_api.core.engine.transfer_components_executor import (
    TransferType,
    LiquidAndAirGapPair,
)
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    PositionReference,
    Coordinate,
)
from opentrons.types import Location, Point
from hardware_testing.data import ui, dump_data_to_file
from hardware_testing.data.csv_report import CSVReport
from hardware_testing.opentrons_api.types import OT3Mount, Axis
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
    get_pipette_unique_name,
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
    aspirate_with_liquid_class,
    dispense_with_liquid_class,
    PipettingCallbacks,
    _get_approach_submerge_retract_heights,
)
from .liquid_class.defaults import get_liquid_class, set_liquid_class
from .liquid_class.definition import LiquidClassSettings
from .liquid_class.interactive import interactively_build_liquid_class
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

    def _encoder_monitor_start() -> None:
        nonlocal estimate_bottom, encoder_bottom
        if not volume:
            return
        estimate_bottom = hw_api.current_position_ot3(hw_mount)[pip_ax]
        encoder_bottom = hw_api.encoder_current_position_ot3(hw_mount)[pip_ax]

    def _encoder_monitor_stop() -> None:
        nonlocal estimate_aspirated, encoder_aspirated
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
    test_report.save_to_disk()


def _next_tip_for_channel(
    cfg: config.GravimetricConfig,
    resources: TestResources,
    channel: int,
    max_tips: int,
    tip_name: str = "",
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
    if tip_name and _tip.well_name != tip_name:
        raise RuntimeError(f"starting tip is {_tip.well_name} (expected {tip_name})")
    return _tip


def _take_photos(trial: GravimetricTrial, stage_str: str) -> None:
    return
    # if trial.ctx.is_simulating():
    #     cameras = ["/dev/video0"]
    # else:
    #     cameras = glob.glob("/dev/video*")
    # for camera in cameras:
    #     cam_pic_name = f"camera{camera[-1]}_channel{trial.channel}_volume{trial.volume}"
    #     cam_pic_name += f"_trial{trial.trial}_{stage_str}.jpg"
    #     if trial.ctx.is_simulating():
    #         cam_pic_name = cam_pic_name.replace(".jpg", ".txt")
    #     cam_pic_path = (
    #         f"{trial.test_report.parent}/{trial.test_report._run_id}/{cam_pic_name}"
    #     )
    #     process_cmd = CAM_CMD_OT3.format(str(cam_pic_path), camera)
    #     if trial.ctx.is_simulating():
    #         with open(cam_pic_path, "w") as f:
    #             f.write(str(cam_pic_name))  # create a test file
    #     else:
    #         try:
    #             run_subprocess(process_cmd.split(" "), timeout=2)  # take a picture
    #         except subprocess.TimeoutExpired:
    #             os.remove(cam_pic_path)


def _run_trial(
    trial: GravimetricTrial,
    new_liquid_class: Optional[LiquidClass] = None,
    tune_volume_correction: bool = False,
) -> Tuple[float, MeasurementData, float, MeasurementData]:
    global _PREV_TRIAL_GRAMS
    assert trial.pipette.has_tip
    transfer_properties: Optional[TransferProperties] = None
    old_liquid_class: Optional[LiquidClassSettings] = None
    pipetting_callbacks = None
    if not new_liquid_class:
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
        old_liquid_class = get_liquid_class(
            trial.cfg.liquid,
            trial.cfg.dilution,
            trial.cfg.pipette_volume,
            trial.pipette.channels,
            trial.tip_volume,
            trial.volume,
        )
        if trial.cfg.interactive:
            old_liquid_class = interactively_build_liquid_class(old_liquid_class)
            # store it, so that next loop we don't have to think so much
            set_liquid_class(
                old_liquid_class,
                trial.cfg.liquid,
                trial.cfg.dilution,
                trial.cfg.pipette_volume,
                trial.pipette.channels,
                trial.tip_volume,
                trial.volume,
            )
    else:
        tiprack_load_name = (
            f"opentrons/opentrons_flex_96_tiprack_{trial.cfg.tip_volume}ul/1"
        )
        transfer_properties = new_liquid_class.get_for(trial.pipette, tiprack_load_name)

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

    if trial.mix:
        raise NotImplementedError("mix testing not implemented")

    # center channel over well
    trial.pipette.move_to(
        trial.well.top(config.VIAL_SAFE_Z_OFFSET).move(trial.channel_offset)
    )
    if trial.cfg.lld_every_tip:
        liq_height = _get_liquid_height(
            trial.ctx,
            trial.pipette,
            trial.well,
            jog=trial.cfg.jog,
            same_tip=trial.cfg.same_tip,
        )
        trial.liquid_tracker.set_start_volume_from_liquid_height(
            trial.well, liq_height, name=trial.cfg.liquid
        )

    if not trial.recorder.is_simulator:
        trial.pipette._retract()  # retract to top of gantry
    else:
        trial.pipette.move_to(trial.well.top(config.VIAL_SAFE_Z_OFFSET))
    m_data_init = _record_measurement_and_store(MeasurementType.INIT)
    ui.print_info(f"\tinitial grams: {m_data_init.grams_average} g")
    # update the vials volumes, using the last-known weight
    if not trial.cfg.jog and _PREV_TRIAL_GRAMS is not None:
        liq = SupportedLiquid.from_string(trial.cfg.liquid)
        _evaporation_loss_ul = abs(
            calculate_change_in_volume(
                _PREV_TRIAL_GRAMS, m_data_init, liq, dilution=trial.cfg.dilution
            )
        )
        ui.print_info(f"{_evaporation_loss_ul} ul evaporated since last trial")
        trial.liquid_tracker.update_affected_wells(
            trial.well, aspirate=_evaporation_loss_ul, channels=1
        )
    _PREV_TRIAL_GRAMS = m_data_init

    # FIXME: Liquid-height tracking in API is not yet implemented in this script
    #        so for now we are still using the custom liquid-height code here, and
    #        tell the API's liquid-class to move the correct submerge depth (relative to well-bottom)
    def _calculate_meniscus_relative_offsets(
        is_aspirate: bool,
    ) -> Tuple[Callable, Callable]:
        _attr_name = "aspirate" if is_aspirate else "dispense"
        _asp_or_disp = getattr(transfer_properties, _attr_name)
        _retract_mm = max(
            0.0, _asp_or_disp.submerge.offset.z, _asp_or_disp.retract.offset.z
        )
        approach, submerge, retract = _get_approach_submerge_retract_heights(
            trial.well,
            trial.liquid_tracker,
            submerge_mm=-1.5,  # NOTE: this will continue to be set here in script until LLD is available
            retract_mm=_retract_mm,  # FIXME: use value from liquid-class definition
            mix=None,
            aspirate=trial.volume if is_aspirate else None,
            dispense=trial.volume if not is_aspirate else None,
            blank=trial.blank,
            channel_count=trial.channel_count,
        )

        _original_submerge_position_reference = _asp_or_disp.submerge.position_reference
        _original_position_reference = _asp_or_disp.position_reference
        _original_retract_position_reference = _asp_or_disp.retract.position_reference
        _original_submerge_offset_z = _asp_or_disp.submerge.offset.z
        _original_offset_z = _asp_or_disp.offset.z
        _original_retract_offset_z = _asp_or_disp.retract.offset.z

        # NOTE: setting all position references to BOTTOM
        _asp_or_disp.submerge.position_reference = PositionReference.WELL_BOTTOM
        _asp_or_disp.position_reference = PositionReference.WELL_BOTTOM
        _asp_or_disp.retract.position_reference = PositionReference.WELL_BOTTOM
        # update liquid-class offsets based on CALCULATED meniscus height
        _asp_or_disp.submerge.offset.z = approach
        _asp_or_disp.offset.z = submerge
        _asp_or_disp.retract.offset.z = retract

        def _enable() -> None:
            # NOTE: setting all position references to BOTTOM
            _asp_or_disp.submerge.position_reference = PositionReference.WELL_BOTTOM
            _asp_or_disp.position_reference = PositionReference.WELL_BOTTOM
            _asp_or_disp.retract.position_reference = PositionReference.WELL_BOTTOM
            # update liquid-class offsets based on CALCULATED meniscus height
            _asp_or_disp.submerge.offset.z = approach
            _asp_or_disp.offset.z = submerge
            _asp_or_disp.retract.offset.z = retract

        def _disable() -> None:
            _asp_or_disp.submerge.position_reference = (
                _original_submerge_position_reference
            )
            _asp_or_disp.position_reference = _original_position_reference
            _asp_or_disp.retract.position_reference = (
                _original_retract_position_reference
            )
            # update liquid-class offsets based on CALCULATED meniscus height
            _asp_or_disp.submerge.offset.z = _original_submerge_offset_z
            _asp_or_disp.offset.z = _original_offset_z
            _asp_or_disp.retract.offset.z = _original_retract_offset_z

        return _enable, _disable

    # RUN ASPIRATE
    if not transfer_properties:
        aspirate_with_liquid_class(
            trial.ctx,
            old_liquid_class,
            trial.pipette,
            trial.volume,
            trial.well,
            trial.channel_offset,
            trial.channel_count,
            trial.liquid_tracker,
            callbacks=pipetting_callbacks,
            blank=trial.blank,
            mode=trial.mode,
            clear_accuracy_function=trial.cfg.nominal_plunger,
            pose_for_camera=trial.cfg.interactive,
        )
        tip_contents = None
    else:
        if tune_volume_correction:
            _prev_vol_corr_val_asp = (
                transfer_properties.aspirate.correction_by_volume.get_for_volume(
                    trial.volume
                )
            )
            _prev_vol_corr_val_disp = (
                transfer_properties.dispense.correction_by_volume.get_for_volume(
                    trial.volume
                )
            )
            assert abs(_prev_vol_corr_val_asp - _prev_vol_corr_val_disp) < 0.001
            while True:
                _inp = input(
                    f"ENTER volumeCorrection (uL) for Aspirate={trial.volume} "
                    f"(currently set to {_prev_vol_corr_val_asp}): "
                )
                if not _inp:
                    print(f"using old volumeCorrection {_prev_vol_corr_val_asp}")
                    break
                try:
                    _new_vol_corr_val = float(_inp.strip())
                    # NOTE: aspirate/dispense need identical values to avoid errors
                    transfer_properties.aspirate.correction_by_volume.set_for_volume(
                        trial.volume, _new_vol_corr_val
                    )
                    transfer_properties.dispense.correction_by_volume.set_for_volume(
                        trial.volume, _new_vol_corr_val
                    )
                    break
                except ValueError as e:
                    print(e)
        # NOTE: required to remove air-gap before calling configure-for-volume
        trial.pipette.dispense(trial.pipette.current_volume, push_out=0)
        # FIXME: this should happen inside the `transfer_liquid` command
        #        so delete this `configure` call once that is added
        if trial.mode == "default":
            trial.pipette.configure_for_volume(volume=trial.cfg.pipette_volume)
        elif trial.mode == "lowVolumeDefault":
            assert trial.pipette.max_volume == 50
            trial.pipette.configure_for_volume(volume=trial.pipette.min_volume)
        else:
            trial.pipette.configure_for_volume(volume=trial.volume)
        trial.pipette.prepare_to_aspirate()
        (
            enable_meniscus_rel,
            disable_meniscus_rel,
        ) = _calculate_meniscus_relative_offsets(is_aspirate=True)
        enable_meniscus_rel()  # TODO: delete this and use actual liquid-height tracking
        # FIXME: This assumes whatever is in the pipette from last trial is air (not liquid),
        #        and so this would break any sort of multi-dispense testing
        assumed_air_gap = trial.pipette.current_volume
        tip_contents = trial.pipette._core.aspirate_liquid_class(
            volume=trial.volume,
            source=(Location(Point(), trial.well), trial.well._core),
            transfer_properties=transfer_properties,
            transfer_type=TransferType.ONE_TO_ONE,
            tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=assumed_air_gap)],
        )
        disable_meniscus_rel()  # TODO: delete this and use actual liquid-height tracking
        trial.liquid_tracker.update_affected_wells(
            trial.well, aspirate=trial.volume, channels=trial.channel_count
        )
    if not trial.recorder.is_simulator:
        trial.pipette._retract()  # retract to top of gantry
    else:
        trial.pipette.move_to(trial.well.top(config.VIAL_SAFE_Z_OFFSET))

    _take_photos(trial, "aspirate")
    m_data_aspirate = _record_measurement_and_store(MeasurementType.ASPIRATE)
    ui.print_info(f"\tgrams after aspirate: {m_data_aspirate.grams_average} g")
    ui.print_info(f"\tcelsius after aspirate: {m_data_aspirate.celsius_pipette} C")

    if trial.recorder.is_simulator and trial.cfg.interactive:
        ui.get_user_ready("dispensing")

    # RUN DISPENSE
    if not transfer_properties:
        dispense_with_liquid_class(
            ctx=trial.ctx,
            liquid_class=old_liquid_class,
            pipette=trial.pipette,
            dispense_volume=trial.volume,
            well=trial.well,
            channel_offset=trial.channel_offset,
            channel_count=trial.channel_count,
            liquid_tracker=trial.liquid_tracker,
            callbacks=pipetting_callbacks,
            blank=trial.blank,
            mode=trial.mode,
            clear_accuracy_function=trial.cfg.nominal_plunger,
            pose_for_camera=trial.cfg.interactive,
        )
    else:
        (
            enable_meniscus_rel,
            disable_meniscus_rel,
        ) = _calculate_meniscus_relative_offsets(is_aspirate=False)
        enable_meniscus_rel()  # TODO: delete this and use actual liquid-height tracking
        _ = trial.pipette._core.dispense_liquid_class(
            volume=trial.volume,
            dest=(Location(Point(), trial.well), trial.well._core),
            source=(Location(Point(), trial.well), trial.well._core),
            transfer_properties=transfer_properties,
            transfer_type=TransferType.ONE_TO_ONE,
            tip_contents=tip_contents,
            add_final_air_gap=True,
            trash_location=trial.pipette.trash_container,
        )
        disable_meniscus_rel()
        trial.liquid_tracker.update_affected_wells(
            trial.well, dispense=trial.volume, channels=trial.channel_count
        )
    if not trial.recorder.is_simulator:
        trial.pipette._retract()  # retract to top of gantry
    else:
        trial.pipette.move_to(trial.well.top(config.VIAL_SAFE_Z_OFFSET))
    _take_photos(trial, "dispense")
    m_data_dispense = _record_measurement_and_store(MeasurementType.DISPENSE)
    ui.print_info(f"\tgrams after dispense: {m_data_dispense.grams_average} g")
    # calculate volumes
    liq = SupportedLiquid.from_string(trial.cfg.liquid)
    volume_aspirate = calculate_change_in_volume(
        m_data_init, m_data_aspirate, liq, dilution=trial.cfg.dilution
    )
    volume_dispense = calculate_change_in_volume(
        m_data_aspirate, m_data_dispense, liq, dilution=trial.cfg.dilution
    )
    if trial.cfg.interactive and not trial.blank:
        ui.get_user_ready("examine tip")

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
            frequency=1000 if scale.is_simulator else 5,
            stable=False,
        ),
        scale,
        simulate=scale.is_simulator,
    )
    ui.print_info(f'found scale "{recorder.serial_number}"')
    if scale.is_simulator:
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
    use_old_method: bool,
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
        new_liquid_class = None
        if not use_old_method:
            lc_name = SupportedLiquid.from_string(
                b_trial.cfg.liquid
            ).name_with_dilution(b_trial.cfg.dilution)
            new_liquid_class = b_trial.ctx.define_liquid_class(
                lc_name.lower().replace("-", "_")
            )
        evap_aspirate, _, evap_dispense, _ = _run_trial(
            b_trial, new_liquid_class=new_liquid_class
        )
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
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    well: Well,
    jog: bool = False,
    same_tip: bool = False,
) -> float:
    assert pipette.has_tip
    pipette.move_to(well.top(0))
    if pipette.channels == 96:
        if not ctx.is_simulating() and not same_tip:
            ui.alert_user_ready(
                "Please replace the tips in slot 2",
                get_sync_hw_api(ctx),
            )
        _tip_counter[0] = 0
    if jog:
        ui.print_title("FIND LIQUID HEIGHT")
        _liquid_height = _jog_to_find_liquid_height(ctx, pipette, well)
    else:
        _liquid_height = _sense_liquid_height(ctx, pipette, well)
    pipette.move_to(well.top(0))
    return _liquid_height


def run(cfg: config.GravimetricConfig, resources: TestResources) -> None:  # noqa: C901
    """Run."""
    new_liquid_class = None
    if not cfg.use_old_method:
        lc_name = SupportedLiquid.from_string(cfg.liquid).name_with_dilution(
            cfg.dilution
        )
        new_liquid_class = resources.ctx.define_liquid_class(
            lc_name.lower().replace("-", "_")
        )
    global _PREV_TRIAL_GRAMS
    global _MEASUREMENTS
    ui.print_header("LOAD LABWARE")
    labware_on_scale = _load_labware(resources.ctx, cfg)
    liquid_tracker = LiquidTracker(resources.ctx)

    UNITS = {
        "P1KSV3520230101A01": "A",
        "P1KSV3620231024A08": "B",
        "P1KSV3620240304A05": "C",
        "P1KSV3520230810A07": "D",
        "P50SV3520230812A17": "A",
        "P50SV3520230724A01": "B",
        "P50SV3520230724A02": "C",
        "P50SV3520231024A11": "D",
    }
    unit_tag: str = UNITS.get(get_pipette_unique_name(resources.pipette), "S")
    meta_data: List[str] = [
        resources.test_report._run_id,
        cfg.liquid,
        f"P{cfg.pipette_volume}S",
        unit_tag,
        str(cfg.tip_volume),
    ]
    simplified_results_for_calibration_test: List[List[str]] = []

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
        well = labware_on_scale["A1"]
        if cfg.jog or cfg.blank or not cfg.lld_every_tip:
            first_tip = _next_tip_for_channel(
                cfg, resources, 0, total_tips, tip_name=cfg.starting_tip
            )
            setup_channel_offset = _get_channel_offset(cfg, channel=0)
            first_tip_location = first_tip.top().move(setup_channel_offset)
            resources.pipette._retract()
            _pick_up_tip(
                resources.ctx, resources.pipette, cfg, location=first_tip_location
            )
            resources.pipette._retract()
            for i in range(5):
                resources.pipette.aspirate()
                resources.pipette.dispense(push_out=0)
            resources.pipette.prepare_to_aspirate()
            ui.print_info("moving to scale")
        if cfg.jog or not cfg.lld_every_tip:
            liq_height = _get_liquid_height(
                resources.ctx,
                resources.pipette,
                well,
                jog=cfg.jog,
                same_tip=cfg.same_tip,
            )
        else:
            # NOTE: give it a "safe" height near the top, knowing that
            #       we will eventually be probing the liquid
            liq_height = well.depth - 1
        liquid_tracker.set_start_volume_from_liquid_height(
            well, liq_height, name=cfg.liquid
        )

        # EVAPORATION MEASUREMENT
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
                cfg.use_old_method,
            )
        hw_api.set_status_bar_state(StatusBarState.IDLE)

        # drop that first "setup" tip
        if not cfg.same_tip and resources.pipette.has_tip:
            ui.print_info("dropping tip")
            resources.pipette._retract()
            _drop_tip(
                resources.pipette,
                return_tip=False,
                minimum_z_height=_minimum_z_height(cfg),
                offset=_get_channel_offset(cfg, 0),
            )  # always trash calibration tips
            resources.pipette._retract()
        calibration_tip_in_use = False

        # RUN TRIALS
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
            if cfg.use_old_method:
                resources.pipette.configure_for_volume(volume)
            trial_asp_dict: Dict[int, List[float]] = {
                trial: [] for trial in range(cfg.trials)
            }
            trial_disp_dict: Dict[int, List[float]] = {
                trial: [] for trial in range(cfg.trials)
            }
            # CREATE new line entry for this volume to be tested (line includes all trials)
            simplified_results_for_calibration_test.append(meta_data + [str(volume)])
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
                        resources.pipette._retract()
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
                    ) = _run_trial(
                        run_trial,
                        new_liquid_class=new_liquid_class,
                        tune_volume_correction=cfg.tune_volume_correction,
                    )
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
                    # NOTE: saving test CSV explicitly AFTER pipetting is complete
                    #       to avoid any unwanted delays
                    # FIXME: see why it takes so long to store CSV data
                    resources.test_report.save_to_disk()

                    simplified_results_for_calibration_test[-1].append(
                        str(round(asp_with_evap, 2))
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
                        resources.pipette._retract()

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
                # FIXME: see why it takes so long to store CSV data
                resources.test_report.save_to_disk()
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
            # FIXME: see why it takes so long to store CSV data
            resources.test_report.save_to_disk()

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
            # FIXME: see why it takes so long to store CSV data
            resources.test_report.save_to_disk()
    finally:
        _return_tip = False if calibration_tip_in_use else cfg.return_tip
        _finish_test(cfg, resources, _return_tip)
    ui.print_title("RESULTS")
    _print_final_results(
        volumes=resources.test_volumes,
        channel_count=len(channels_to_test),
        test_report=resources.test_report,
    )
    csv_data_str = "\n".join(
        ["\t".join(csv_line) for csv_line in simplified_results_for_calibration_test]
    )
    print(csv_data_str)
    dump_data_to_file(
        resources.test_report._test_name,
        resources.test_report._run_id,
        f"aspirate-volumes-{resources.test_report._tag}.csv",
        csv_data_str,
    )
