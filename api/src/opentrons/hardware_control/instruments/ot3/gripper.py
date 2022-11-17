from __future__ import annotations

""" Classes and functions for gripper state tracking
"""
from dataclasses import asdict, replace
import logging
from typing import Any, Optional, Set

from opentrons.types import Point
from opentrons.config import gripper_config
from opentrons.hardware_control.types import (
    GripperProbe,
    CriticalPoint,
    GripperJawState,
    InvalidMoveError,
)
from .instrument_calibration import (
    GripperCalibrationOffset,
    load_gripper_calibration_offset,
    save_gripper_calibration_offset,
)
from ..instrument_abc import AbstractInstrument
from opentrons.hardware_control.dev_types import AttachedGripper, GripperDict

from opentrons_shared_data.gripper.dev_types import GripperName, GripperModel

RECONFIG_KEYS = {"quirks"}


mod_log = logging.getLogger(__name__)


class Gripper(AbstractInstrument[gripper_config.GripperConfig]):
    """A class to gather and track gripper state and configs.

    This class should not touch hardware or call back out to the hardware
    control API. Its only purpose is to gather state.
    """

    def __init__(
        self,
        config: gripper_config.GripperConfig,
        gripper_cal_offset: GripperCalibrationOffset,
        gripper_id: str,
    ) -> None:
        self._config = config
        self._name = self._config.name
        self._model = self._config.model
        base_offset = Point(*self._config.base_offset_from_mount)
        self._jaw_center_offset = (
            Point(*self._config.jaw_center_offset_from_base) + base_offset
        )
        #: the distance between the gripper mount and the jaw center at home
        self._front_calibration_pin_offset = (
            Point(*self._config.pin_one_offset_from_base) + base_offset
        )
        #: the distance between the gripper mount and the front calibration pin
        #: at home
        self._rear_calibration_pin_offset = (
            Point(*self._config.pin_two_offset_from_base) + base_offset
        )
        #: the distance between the gripper mount and the rear calibration pin
        #: at home
        self._calibration_offset = gripper_cal_offset
        #: The output value of calibration - the additional vector added into
        #: the critical point geometry based on gripper mount calibration
        self._gripper_id = gripper_id
        self._state = GripperJawState.UNHOMED
        self._current_jaw_displacement = 0.0
        self._attached_probe: Optional[GripperProbe] = None
        self._log = mod_log.getChild(self._gripper_id)
        self._log.info(
            f"loaded: {self._model}, gripper offset: {self._calibration_offset}"
        )

    @property
    def attached_probe(self) -> Optional[GripperProbe]:
        return self._attached_probe

    def add_probe(self, probe: GripperProbe) -> None:
        """This is used for finding the critical point during calibration."""
        assert not self.attached_probe
        self._attached_probe = probe

    def remove_probe(self) -> None:
        assert self.attached_probe
        self._attached_probe = None

    @property
    def current_jaw_displacement(self) -> float:
        """The distance one side of the jaw has traveled from home."""
        return self._current_jaw_displacement

    @current_jaw_displacement.setter
    def current_jaw_displacement(self, mm: float) -> None:
        assert mm >= 0.0, "jaw displacement from home should always be positive"
        mm <= (self._max_jaw_displacement() + 0.5), (
            "jaw displacement exceeds max expected value: "
            f"{self._max_jaw_displacement() + 0.5} mm"
        )
        self._current_jaw_displacement = mm

    def _max_jaw_displacement(self) -> float:
        return (self._config.jaw_sizes_mm["max"] - self._config.jaw_sizes_mm["min"]) / 2

    @property
    def state(self) -> GripperJawState:
        return self._state

    @state.setter
    def state(self, s: GripperJawState) -> None:
        self._state = s

    @property
    def config(self) -> gripper_config.GripperConfig:
        return self._config

    def update_config_item(self, elem_name: str, elem_val: Any) -> None:
        self._log.info(f"updated config: {elem_name}={elem_val}")
        self._config = replace(self._config, **{elem_name: elem_val})

    @property
    def name(self) -> GripperName:
        return self._name

    @property
    def model(self) -> GripperModel:
        return self._model

    @property
    def gripper_id(self) -> str:
        return self._gripper_id

    def reset_offset(self, to_default: bool) -> None:
        """Tempoarily reset the gripper offsets to default values."""
        if to_default:
            self._calibration_offset = load_gripper_calibration_offset(gripper_id=None)
        else:
            self._calibration_offset = load_gripper_calibration_offset(
                gripper_id=self._gripper_id
            )

    def save_offset(self, delta: Point) -> None:
        """Tempoarily reset the gripper offsets to default values."""
        save_gripper_calibration_offset(self._gripper_id, delta)
        self._calibration_offset = load_gripper_calibration_offset(self._gripper_id)

    def _check_calibration_pin_location_is_accurate(self) -> None:
        if not self.attached_probe:
            raise RuntimeError(
                "gripper is not currently holding a probe, use Gripper.add_probe()"
            )
        if self.state != GripperJawState.GRIPPING:
            raise RuntimeError(
                "gripper probe pin locations are not accurate if jaw is not gripping"
            )
        # NOTE: (AS) the gripper jaws have a larger positional tolerance stackup when they are open
        # but we initialize our encoder position when the jaw it open. So when we close the jaw, the
        # two jaws are physically more precisely located, but the encoders will still have some error
        # in their value. So, here we add a 2mm tolerance to check that the encoder is reading a position
        # close to what we expect
        jaw_sizes = self.config.jaw_sizes_mm
        expected_displacement = (jaw_sizes["max"] - jaw_sizes["min"]) * 0.5
        displacement_error_tolerance_mm = 1.5
        min_disp = expected_displacement - displacement_error_tolerance_mm
        max_disp = expected_displacement + displacement_error_tolerance_mm
        if (
            self.current_jaw_displacement < min_disp
            or self.current_jaw_displacement > max_disp
        ):
            raise RuntimeError(
                f"gripper is gripping at an unexpected displacement: {self.current_jaw_displacement}"
            )

    def critical_point(self, cp_override: Optional[CriticalPoint] = None) -> Point:
        """
        The vector from the gripper mount to the critical point, which is selectable
        between the center of the gripper engagement volume and the calibration pins.
        """
        if cp_override in [CriticalPoint.NOZZLE, CriticalPoint.TIP]:
            raise InvalidMoveError(
                f"Critical point {cp_override.name} is not valid for a gripper"
            )

        if not self._attached_probe:
            cp = cp_override or CriticalPoint.GRIPPER_JAW_CENTER
        else:
            if self._attached_probe is GripperProbe.REAR:
                cp = cp_override or CriticalPoint.GRIPPER_REAR_CALIBRATION_PIN
            else:
                cp = cp_override or CriticalPoint.GRIPPER_FRONT_CALIBRATION_PIN

        if cp in [CriticalPoint.GRIPPER_JAW_CENTER, CriticalPoint.XY_CENTER]:
            return self._jaw_center_offset + Point(*self._calibration_offset.offset)
        elif cp == CriticalPoint.GRIPPER_FRONT_CALIBRATION_PIN:
            self._check_calibration_pin_location_is_accurate()
            return self._front_calibration_pin_offset + Point(
                *self._calibration_offset.offset
            )
        elif cp == CriticalPoint.GRIPPER_REAR_CALIBRATION_PIN:
            self._check_calibration_pin_location_is_accurate()
            return self._rear_calibration_pin_offset + Point(
                *self._calibration_offset.offset
            )
        else:
            raise InvalidMoveError(f"Critical point {cp_override} is not valid")

    def duty_cycle_by_force(self, newton: float) -> float:
        return gripper_config.piecewise_force_conversion(
            newton, self.config.jaw_force_per_duty_cycle
        )

    def __str__(self) -> str:
        return f"{self._config.display_name}"

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}: {self._config.display_name} {id(self)}"

    def as_dict(self) -> GripperDict:
        d: GripperDict = {
            "name": self._config.name,
            "model": self._config.model,
            "gripper_id": self._gripper_id,
            "display_name": self._config.display_name,
            "state": self._state,
        }
        return d


def _reload_gripper(
    new_config: gripper_config.GripperConfig,
    attached_instr: Gripper,
    cal_offset: GripperCalibrationOffset,
) -> Gripper:
    # Once we have determined that the new and attached grippers
    # are similar enough that we might skip, see if the configs
    # match closely enough.
    # Returns a gripper object
    if (
        new_config == attached_instr.config
        and cal_offset == attached_instr._calibration_offset
    ):
        # Same config, good enough
        return attached_instr
    else:
        newdict = asdict(new_config)
        olddict = asdict(attached_instr.config)
        changed: Set[str] = set()
        for k in newdict.keys():
            if newdict[k] != olddict[k]:
                changed.add(k)
        if changed.intersection(RECONFIG_KEYS):
            # Something has changed that requires reconfig
            return Gripper(new_config, cal_offset, attached_instr._gripper_id)
    return attached_instr


def compare_gripper_config_and_check_skip(
    freshly_detected: AttachedGripper,
    attached: Optional[Gripper],
    cal_offset: GripperCalibrationOffset,
) -> Optional[Gripper]:
    """
    Given the gripper config for an attached gripper (if any) freshly read
    from disk, and any attached instruments,

    - Compare the new and configured gripper configs
    - Load the new configs if they differ
    - Return a bool indicating whether hardware reconfiguration may be
      skipped
    """
    config = freshly_detected.get("config")
    serial = freshly_detected.get("id") or ""

    if not config and not attached:
        # nothing attached now, nothing used to be attached, nothing
        # to reconfigure
        return attached

    if config and attached:
        # something was attached and something is attached. are they
        # the same? we can tell by comparing serials
        if serial == attached.gripper_id:
            # similar enough to check
            return _reload_gripper(config, attached, cal_offset)

    if config:
        return Gripper(config, cal_offset, serial)
    else:
        return None
