"""Gravimetric."""
from typing import Tuple, List, Dict
from math import ceil

from opentrons.protocol_api import ProtocolContext, Well, Labware

from hardware_testing.data import ui
from hardware_testing.opentrons_api.types import Point, OT3Mount
from .measurement import (
    MeasurementType,
    create_measurement_tag,
    EnvironmentData,
)
from hardware_testing.drivers import asair_sensor
from .measurement.environment import read_environment_data
from . import report
from . import config
from .helpers import (
    _jog_to_find_liquid_height,
    _apply_labware_offsets,
    _pick_up_tip,
    _drop_tip,
)
from .trial import (
    PhotometricTrial,
    build_photometric_trials,
    TestResources,
    _finish_test,
)
from .liquid_class.pipetting import (
    aspirate_with_liquid_class,
    dispense_with_liquid_class,
    PipettingCallbacks,
)
from .liquid_height.height import LiquidTracker

from .tips import get_tips


_MEASUREMENTS: List[Tuple[str, EnvironmentData]] = list()

_DYE_MAP: Dict[str, Dict[str, float]] = {
    "HV": {"min": 200.1, "max": 350},
    "A": {"min": 50, "max": 200},
    "B": {"min": 10, "max": 49.99},
    "C": {"min": 2, "max": 9.999},
    "D": {"min": 1, "max": 1.999},
}
_MIN_START_VOLUME_UL = {1: 1000, 96: 30000}
_MIN_END_VOLUME_UL = {1: 5000, 96: 30000}
_MAX_VOLUME_UL = {1: 15000, 96: 165000}


def get_res_well_name(cfg: config.PhotometricConfig) -> str:
    return f"A{cfg.column_offset}"


def get_photo_plate_dest(cfg: config.PhotometricConfig, trial: int) -> str:
    if cfg.pipette_channels == 96:
        return "A1"
    else:
        rows = "ABCDEFGH"
        return f"{rows[trial]}{cfg.column_offset}"


def _get_dye_type(volume: float) -> str:
    dye_type = None
    for dye in _DYE_MAP.keys():
        if volume >= _DYE_MAP[dye]["min"] and volume <= _DYE_MAP[dye]["max"]:
            dye_type = dye
            break
    assert (
        dye_type is not None
    ), f"volume {volume} is outside of the available dye range"
    return dye_type


def _load_labware(
    ctx: ProtocolContext, cfg: config.PhotometricConfig
) -> Tuple[Labware, Labware]:
    ui.print_info(f'Loading photoplate labware: "{cfg.photoplate}"')
    # If running multiple tests in one run, the labware may already be loaded
    loaded_labwares = ctx.loaded_labwares

    if (
        cfg.photoplate_slot in loaded_labwares.keys()
        and loaded_labwares[cfg.photoplate_slot].name == cfg.photoplate
    ):
        photoplate = loaded_labwares[cfg.photoplate_slot]
    else:
        photoplate = ctx.load_labware(cfg.photoplate, location=cfg.photoplate_slot)
        _apply_labware_offsets(cfg, [photoplate])

    if (
        cfg.reservoir_slot in loaded_labwares.keys()
        and loaded_labwares[cfg.reservoir_slot].name == cfg.reservoir
    ):
        reservoir = loaded_labwares[cfg.reservoir_slot]
    else:
        reservoir = ctx.load_labware(cfg.reservoir, location=cfg.reservoir_slot)
        _apply_labware_offsets(cfg, [reservoir])
    return photoplate, reservoir


def _dispense_volumes(volume: float) -> Tuple[float, float, int]:
    num_dispenses = ceil(volume / 250)
    volume_to_dispense = volume / num_dispenses
    target_volume = min(max(volume_to_dispense, 200), 250)
    return target_volume, volume_to_dispense, num_dispenses


def _run_trial(trial: PhotometricTrial) -> None:
    """Aspirate dye and dispense into a photometric plate."""

    def _no_op() -> None:
        """Do Nothing."""
        return

    def _tag(m_type: MeasurementType) -> str:
        return create_measurement_tag(m_type, trial.volume, 0, trial.trial)

    def _record_measurement_and_store(m_type: MeasurementType) -> EnvironmentData:
        m_tag = _tag(m_type)
        m_data = read_environment_data(
            trial.cfg.pipette_mount, trial.ctx.is_simulating(), trial.env_sensor
        )
        report.store_measurements_pm(trial.test_report, m_tag, m_data)
        _MEASUREMENTS.append(
            (
                m_tag,
                m_data,
            )
        )
        return m_data

    pipetting_callbacks = PipettingCallbacks(
        on_submerging=_no_op,
        on_mixing=_no_op,
        on_aspirating=_no_op,
        on_dispensing=_no_op,
        on_retracting=_no_op,
        on_blowing_out=_no_op,
        on_exiting=_no_op,
    )

    channel_count = 96
    # RUN INIT
    target_volume, volume_to_dispense, num_dispenses = _dispense_volumes(trial.volume)
    photoplate_preped_vol = max(target_volume - volume_to_dispense, 0)

    if num_dispenses > 1 and not trial.ctx.is_simulating():
        # TODO: Likely will not test 1000 uL in the near-term,
        #       but eventually we'll want to be more helpful here in prompting
        #       what volumes need to be added between trials.
        ui.get_user_ready("check DYE is enough")

    ui.print_info(f"aspirating from {trial.source}")
    _record_measurement_and_store(MeasurementType.INIT)
    trial.pipette.move_to(location=trial.source.top(), minimum_z_height=133)
    # RUN ASPIRATE
    aspirate_with_liquid_class(
        trial.ctx,
        trial.pipette,
        trial.tip_volume,
        trial.volume,
        trial.source,
        Point(),
        channel_count,
        trial.liquid_tracker,
        callbacks=pipetting_callbacks,
        blank=False,
        touch_tip=False,
    )

    _record_measurement_and_store(MeasurementType.ASPIRATE)
    for i in range(num_dispenses):

        for w in trial.dest.wells():
            trial.liquid_tracker.set_start_volume(w, photoplate_preped_vol)
        trial.pipette.move_to(
            trial.dest[get_photo_plate_dest(trial.cfg, trial.trial)].top()
        )
        ui.print_info(
            f"dispensing to {trial.dest[get_photo_plate_dest(trial.cfg, trial.trial)]}"
        )
        # RUN DISPENSE
        dispense_with_liquid_class(
            trial.ctx,
            trial.pipette,
            trial.tip_volume,
            volume_to_dispense,
            trial.dest[get_photo_plate_dest(trial.cfg, trial.trial)],
            Point(),
            channel_count,
            trial.liquid_tracker,
            callbacks=pipetting_callbacks,
            blank=False,
            added_blow_out=(i + 1) == num_dispenses,
            touch_tip=trial.cfg.touch_tip,
        )
        _record_measurement_and_store(MeasurementType.DISPENSE)
        trial.ctx._core.get_hardware().retract(OT3Mount.LEFT)
        if (i + 1) == num_dispenses:
            if not trial.cfg.same_tip:
                _drop_tip(trial.pipette, trial.cfg.return_tip)
                trial.ctx._core.get_hardware().retract(OT3Mount.LEFT)
        if not trial.ctx.is_simulating():
            ui.get_user_ready("add SEAL to plate and remove from DECK")
    return


def _display_dye_information(
    cfg: config.PhotometricConfig, resources: TestResources
) -> None:
    ui.print_header("PREPARE")
    dye_types_req: Dict[str, float] = {dye: 0 for dye in _DYE_MAP.keys()}
    for vol in resources.test_volumes:
        _, volume_to_dispense, num_dispenses = _dispense_volumes(vol)
        dye_per_vol = vol * 96 * cfg.trials
        dye_types_req[_get_dye_type(volume_to_dispense)] += dye_per_vol

    include_hv = not [
        v
        for v in resources.test_volumes
        if _DYE_MAP["A"]["min"] <= v < _DYE_MAP["A"]["max"]
    ]

    for dye in dye_types_req.keys():
        transfered_ul = dye_types_req[dye]
        reservoir_ul = max(
            _MIN_START_VOLUME_UL[cfg.pipette_channels],
            transfered_ul + _MIN_END_VOLUME_UL[cfg.pipette_channels],
        )
        leftover_ul = reservoir_ul - transfered_ul

        def _ul_to_ml(x: float) -> float:
            return round(x / 1000.0, 1)

        if dye_types_req[dye] > 0:
            if cfg.refill:
                # only add the minimum required volume
                ui.print_info(
                    f' * {_ul_to_ml(leftover_ul)} mL "{dye}" LEFTOVER in reservoir'
                )
                if not resources.ctx.is_simulating():
                    ui.get_user_ready(
                        f'[refill] ADD {_ul_to_ml(transfered_ul)} mL more DYE type "{dye}"'
                    )
            else:
                # add minimum required volume PLUS labware's dead-volume
                if not resources.ctx.is_simulating():
                    dye_msg = 'A" or "HV' if include_hv and dye == "A" else dye
                    ui.get_user_ready(
                        f'add {_ul_to_ml(reservoir_ul)} mL of DYE type "{dye_msg}"'
                    )


def build_pm_report(
    test_volumes: List[float],
    run_id: str,
    pipette_tag: str,
    operator_name: str,
    git_description: str,
    tip_batches: Dict[str, str],
    environment_sensor: asair_sensor.AsairSensorBase,
    trials: int,
    name: str,
    robot_serial: str,
) -> report.CSVReport:
    """Build a CSVReport formated for photometric tests."""
    ui.print_header("CREATE TEST-REPORT")
    test_report = report.create_csv_test_report_photometric(
        test_volumes, trials, name, run_id
    )
    test_report.set_tag(pipette_tag)
    test_report.set_operator(operator_name)
    test_report.set_version(git_description)
    report.store_serial_numbers_pm(
        test_report,
        robot=robot_serial,
        pipette=pipette_tag,
        tips=tip_batches,
        environment=environment_sensor.get_serial(),
        liquid="None",
    )
    return test_report


def execute_trials(
    cfg: config.PhotometricConfig,
    resources: TestResources,
    tips: Dict[int, List[Well]],
    trials: Dict[float, List[PhotometricTrial]],
) -> None:
    """Execute a batch of pre-constructed trials."""
    ui.print_info("homing...")
    resources.ctx.home()
    resources.pipette.home_plunger()

    def _next_tip() -> Well:
        # get the first channel's first-used tip
        # NOTE: note using list.pop(), b/c tip will be re-filled by operator,
        #       and so we can use pick-up-tip from there again
        nonlocal tips
        if not len(tips[0]):
            if not resources.ctx.is_simulating():
                ui.get_user_ready(f"replace TIPRACKS in slots {cfg.slots_tiprack}")
            tips = get_tips(resources.ctx, resources.pipette, cfg.tip_volume, True)
        return tips[0].pop(0)

    trial_total = len(resources.test_volumes) * cfg.trials
    trial_count = 0
    for volume in trials.keys():
        ui.print_title(f"{volume} uL")
        for trial in trials[volume]:
            trial_count += 1
            ui.print_header(f"{volume} uL ({trial.trial + 1}/{cfg.trials})")
            ui.print_info(f"trial total {trial_count}/{trial_total}")
            if not resources.ctx.is_simulating():
                ui.get_user_ready(f"put PLATE #{trial.trial + 1} and remove SEAL")
            next_tip: Well = _next_tip()
            next_tip_location = next_tip.top()
            if not cfg.same_tip:
                _pick_up_tip(
                    resources.ctx, resources.pipette, cfg, location=next_tip_location
                )
            _run_trial(trial)


def _find_liquid_height(
    cfg: config.PhotometricConfig,
    resources: TestResources,
    liquid_tracker: LiquidTracker,
    reservoir: Well,
) -> None:
    channel_count = cfg.pipette_channels
    setup_tip = resources.tips[0][0]
    volume_for_setup = max(resources.test_volumes)
    _pick_up_tip(resources.ctx, resources.pipette, cfg, location=setup_tip.top())
    mnt = OT3Mount.LEFT if cfg.pipette_mount == "left" else OT3Mount.RIGHT
    resources.ctx._core.get_hardware().retract(mnt)
    if not resources.ctx.is_simulating() and not cfg.same_tip:
        ui.get_user_ready("REPLACE first tip with NEW TIP")
    required_ul = max(
        (volume_for_setup * channel_count * cfg.trials)
        + _MIN_END_VOLUME_UL[cfg.pipette_channels],
        _MIN_START_VOLUME_UL[cfg.pipette_channels],
    )
    if not resources.ctx.is_simulating():
        _liquid_height = _jog_to_find_liquid_height(
            resources.ctx, resources.pipette, reservoir
        )
        height_below_top = reservoir.depth - _liquid_height
        ui.print_info(f"liquid is {height_below_top} mm below top of reservoir")
        liquid_tracker.set_start_volume_from_liquid_height(
            reservoir, _liquid_height, name="Dye"
        )
    else:
        liquid_tracker.set_start_volume(reservoir, required_ul)
    reservoir_ul = liquid_tracker.get_volume(reservoir)
    ui.print_info(
        f"software thinks there is {round(reservoir_ul / 1000, 1)} mL "
        f"of liquid in the reservoir (required = {round(required_ul / 1000, 1)} ml)"
    )
    if required_ul <= reservoir_ul < _MAX_VOLUME_UL[cfg.pipette_channels]:
        ui.print_info("valid liquid height")
    elif required_ul > _MAX_VOLUME_UL[cfg.pipette_channels]:
        raise NotImplementedError(
            f"too many trials ({cfg.trials}) at {volume_for_setup} uL, "
            f"refilling reservoir is currently not supported"
        )
    elif reservoir_ul < required_ul:
        error_msg = (
            f"not enough volume in reservoir to aspirate {volume_for_setup} uL "
            f"across {channel_count}x channels for {cfg.trials}x trials"
        )
        if resources.ctx.is_simulating():
            raise ValueError(error_msg)
        ui.print_error(error_msg)
        resources.pipette.move_to(location=reservoir.top(100))
        difference_ul = required_ul - reservoir_ul
        ui.get_user_ready(
            f"ADD {round(difference_ul / 1000.0, 1)} mL more liquid to RESERVOIR"
        )
        resources.pipette.move_to(location=reservoir.top())
    else:
        raise RuntimeError(
            f"bad volume in reservoir: {round(reservoir_ul / 1000, 1)} ml"
        )
    resources.ctx._core.get_hardware().retract(OT3Mount.LEFT)
    if not cfg.same_tip:
        resources.pipette.drop_tip(home_after=False)  # always trash setup tips
        resources.ctx._core.get_hardware().retract(OT3Mount.LEFT)
        # NOTE: the first tip-rack should have already been replaced
        #       with new tips by the operator


def run(cfg: config.PhotometricConfig, resources: TestResources) -> None:
    """Run."""
    trial_total = len(resources.test_volumes) * cfg.trials

    resources.ctx._core.get_hardware().home()
    ui.print_header("LOAD LABWARE")
    photoplate, reservoir = _load_labware(resources.ctx, cfg)
    liquid_tracker = LiquidTracker(resources.ctx)

    total_tips = len(
        [tip for chnl_tips in resources.tips.values() for tip in chnl_tips]
    ) * len(resources.test_volumes)

    assert (
        trial_total <= total_tips
    ), f"more trials ({trial_total}) than tips ({total_tips})"

    _display_dye_information(cfg, resources)
    _find_liquid_height(
        cfg, resources, liquid_tracker, reservoir[get_res_well_name(cfg)]
    )

    trials = build_photometric_trials(
        resources.ctx,
        resources.test_report,
        resources.pipette,
        reservoir[get_res_well_name(cfg)],
        photoplate,
        resources.test_volumes,
        liquid_tracker,
        cfg,
        resources.env_sensor,
    )

    try:
        execute_trials(cfg, resources, resources.tips, trials)
    finally:
        _finish_test(cfg, resources, cfg.return_tip)
