""" opentrons.protocol_api.module_geometry: classes and functions for modules
as deck objects

This module provides things like :py:class:`ModuleGeometry` and
:py:func:`load_module` to create and manipulate module objects as geometric
objects on the deck (as opposed to calling commands on them, which is handled
by :py:mod:`.module_contexts`)
"""
from __future__ import annotations

import logging
from enum import Enum
from typing import TYPE_CHECKING, Optional

import numpy as np
from numpy.typing import NDArray

from opentrons_shared_data import module
from opentrons_shared_data.module.types import ModuleDefinitionV3
from opentrons_shared_data.module import OLD_TC_GEN2_LABWARE_OFFSET

from opentrons.types import Location, Point, LocationLabware
from opentrons.motion_planning.adjacent_slots_getters import (
    get_north_south_slots,
    get_east_west_slots,
    get_adjacent_slots,
)

from opentrons.drivers.types import ThermocyclerLidStatus
from opentrons.hardware_control.modules.types import (
    ModuleModel,
    ModuleType,
    module_model_from_string,
    ThermocyclerModuleModel,
)

if TYPE_CHECKING:
    from opentrons.protocol_api.labware import Labware


_log = logging.getLogger(__name__)


class ThermocyclerConfiguration(str, Enum):
    FULL = "full"
    SEMI = "semi"


class NoSuchModuleError(ValueError):
    """An error raised if a requested model does not match a known module."""


class PipetteMovementRestrictedByHeaterShakerError(Exception):
    """Error raised when trying to move to labware restricted by Heater-Shaker."""


# TODO (spp, 2022-05-09): add tests
class ModuleGeometry:
    """
    This class represents an active peripheral, such as an Opentrons Magnetic
    Module, Temperature Module or Thermocycler Module. It defines the physical
    geometry of the device (primarily the offset that modifies the position of
    the labware mounted on top of it).
    """

    @property
    def separate_calibration(self) -> bool:
        _log.warning(
            "ModuleGeometry.separate_calibrations is a deprecated internal property."
            " It has no longer has meaning, but will always return `True`"
        )
        return True

    def __init__(
        self,
        display_name: str,
        model: ModuleModel,
        module_type: ModuleType,
        offset: Point,
        overall_height: float,
        height_over_labware: float,
        parent: Location,
    ) -> None:
        """
        Create a Module for tracking the position of a module.

        Note that modules do not currently have a concept of calibration apart
        from calibration of labware on top of the module. The practical result
        of this is that if the module parent :py:class:`.Location` is
        incorrect, then a correct calibration of one labware on the deck would
        be incorrect on the module, and vice-versa. Currently, the way around
        this would be to correct the :py:class:`.Location` so that the
        calibrated labware is targeted accurately in both positions.

        :param display_name: A human-readable display name of only the module
                             (for instance, "Thermocycler Module" - not
                             including parents or location)
        :param model: The model of module this represents
        :param offset: The offset from the slot origin at which labware loaded
                       on this module should be placed
        :param overall_height: The height of the module without labware
        :param height_over_labware: The height of this module over the top of
                                    the labware
        :param parent: A location representing location of the front left of
                       the outside of the module (usually the front-left corner
                       of a slot on the deck).
        :type parent: :py:class:`.Location`
        """
        self._parent = parent
        self._module_type = module_type

        self._display_name = display_name
        self._model = model
        self._offset = offset
        self._height = overall_height + self._parent.point.z
        self._over_labware = height_over_labware
        self._labware: Optional[Labware] = None
        self._location = Location(point=self._offset + self._parent.point, labware=self)

    def add_labware(self, labware: Labware) -> Labware:
        if self._labware is not None:
            raise RuntimeError(f"{self._labware} is already on this module")
        self._labware = labware
        return self._labware

    def reset_labware(self) -> None:
        self._labware = None

    @property
    def display_name(self) -> str:
        return self._display_name

    @property
    def model(self) -> ModuleModel:
        return self._model

    @property
    def load_name(self) -> str:
        # Mypy (at the time of writing, v0.910) incorrectly types self.model.value as
        # Any. It seems to have trouble with it being a union of enums.
        assert isinstance(self.model.value, str)
        return self.model.value

    @property
    def module_type(self) -> ModuleType:
        """The Moduletype"""
        return self._module_type

    @property
    def parent(self) -> LocationLabware:
        return self._parent.labware.object

    @property
    def labware(self) -> Optional[Labware]:
        return self._labware

    @property
    def location(self) -> Location:
        """
        :return: a :py:class:`.Location` representing the top of the module
        """
        return self._location

    @property
    def labware_offset(self) -> Point:
        """
        :return: a :py:class:`.Point` representing the transformation
        between the critical point of the module and the critical
        point of its contained labware
        """
        return self._offset

    @property
    def highest_z(self) -> float:
        if self.labware:
            return self.labware.highest_z + self._over_labware
        else:
            return self._height

    def __repr__(self) -> str:
        location = f" on {self.parent}" if isinstance(self.parent, str) else ""
        return f"{self._display_name}{location}"


class ThermocyclerGeometry(ModuleGeometry):
    def __init__(
        self,
        display_name: str,
        model: ModuleModel,
        module_type: ModuleType,
        offset: Point,
        overall_height: float,
        height_over_labware: float,
        lid_height: float,
        parent: Location,
        configuration: ThermocyclerConfiguration = ThermocyclerConfiguration.FULL,
    ) -> None:
        """
        Create a Module for tracking the position of a module.

        Note that modules do not currently have a concept of calibration apart
        from calibration of labware on top of the module. The practical result
        of this is that if the module parent :py:class:`.Location` is
        incorrect, then a correct calibration of one labware on the deck would
        be incorrect on the module, and vice-versa. Currently, the way around
        this would be to correct the :py:class:`.Location` so that the
        calibrated labware is targeted accurately in both positions.

        :param display_name: A human-readable display name of only the module
                             (for instance, "Thermocycler Module" - not
                             including parents or location)
        :param model: The model of module this represents
        :param offset: The offset from the slot origin at which labware loaded
                       on this module should be placed
        :param overall_height: The height of the module without labware
        :param height_over_labware: The height of this module over the top of
                                    the labware
        :param parent: A location representing location of the front left of
                       the outside of the module (usually the front-left corner
                       of a slot on the deck).
        :type parent: :py:class:`.Location`
        :param configuration: Used to specify the slot configuration of
                              the Thermocycler. It should by of type
                              :py:class:`.ThermocyclerConfiguration` and can
                              either be FULL or SEMI.
        """
        super().__init__(
            display_name,
            model,
            module_type,
            offset,
            overall_height,
            height_over_labware,
            parent,
        )
        self._lid_height = lid_height
        self._lid_status = ThermocyclerLidStatus.OPEN  # Needs to reflect true status
        self._configuration = configuration
        if self.is_semi_configuration:
            self._offset = self._offset + Point(-23.28, 0, 0)

    @property
    def highest_z(self) -> float:
        # TODO: BC 2019-08-27 this highest_z value represents the distance
        # from the top of the open TC chassis to the base. Once we have a
        # more robust collision detection system in place, the collision
        # model for the TC should change based on it's lid_status
        # (open or closed). A prerequisite for that check will be
        # path-specific highest z calculations, as opposed to the current
        # global check on instrument.move_to. For example: a move from slot 1
        # to slot 3 should only check the highest z of all deck items between
        # the source and destination in the x,y plane.
        return super().highest_z

    @property
    def lid_status(self) -> ThermocyclerLidStatus:
        return self._lid_status

    @lid_status.setter
    def lid_status(self, status: ThermocyclerLidStatus) -> None:
        self._lid_status = status

    @property
    def is_semi_configuration(self) -> bool:
        return bool(self._configuration == ThermocyclerConfiguration.SEMI)

    # TODO(mc, 2022-11-16): this method causes bugs and should not be used;
    # Thermocycler `configuration="semi"` does not work properly and should be removed
    # https://opentrons.atlassian.net/browse/RSS-106
    def labware_accessor(self, labware: Labware) -> Labware:
        from opentrons.protocol_api.labware import Labware
        from opentrons.protocol_api.core.legacy.legacy_labware_core import (
            LegacyLabwareCore,
        )

        definition = labware._core.get_definition()

        # For type checking. This should always pass because
        # opentrons.protocol_api.core.legacy should only load labware with schema 2.
        assert definition["schemaVersion"] == 2

        # Block first three columns from being accessed
        definition["ordering"] = definition["ordering"][2::]
        return Labware(
            core=LegacyLabwareCore(definition, super().location),
            api_version=labware.api_version,
            protocol_core=None,  # type: ignore[arg-type]
            core_map=None,  # type: ignore[arg-type]
        )

    def add_labware(self, labware: Labware) -> Labware:
        if self._labware is not None:
            raise RuntimeError(f"{self._labware} is already on this module")
        if self.lid_status == "closed":
            raise RuntimeError("Cannot place labware in closed module")
        if self.is_semi_configuration:
            self._labware = self.labware_accessor(labware)
        else:
            self._labware = labware
        return self._labware

    def flag_unsafe_move(
        self,
        to_loc: Location,
        from_loc: Location,
        lid_position: Optional[str],
    ) -> None:
        to_lw, to_well = to_loc.labware.get_parent_labware_and_well()
        from_lw, from_well = from_loc.labware.get_parent_labware_and_well()

        if (
            self.labware is not None
            and (self.labware == to_lw or self.labware == from_lw)
            and lid_position != "open"
        ):
            raise RuntimeError(
                "Cannot move to labware loaded in Thermocycler"
                " when lid is not fully open."
            )


class HeaterShakerGeometry(ModuleGeometry):
    """Class holding the state of a Heater-Shaker's physical geometry."""

    def flag_unsafe_move(
        self,
        to_slot: int,
        is_tiprack: bool,
        is_using_multichannel: bool,
        is_labware_latch_closed: bool,
        is_plate_shaking: bool,
    ) -> None:
        """Raise error if unsafe to move pipette due to Heater-Shaker placement."""
        assert isinstance(self.parent, str), "Could not determine module slot location"

        heater_shaker_slot = int(self.parent)
        dest_east_west = to_slot in get_east_west_slots(heater_shaker_slot)
        dest_north_south = to_slot in get_north_south_slots(heater_shaker_slot)
        dest_heater_shaker = to_slot == heater_shaker_slot

        # If Heater-Shaker is running, can't move to or around it
        if (
            any([dest_east_west, dest_north_south, dest_heater_shaker])
            and is_plate_shaking
        ):
            raise PipetteMovementRestrictedByHeaterShakerError(
                "Cannot move pipette to Heater-Shaker or adjacent slot while module is shaking"
            )

        # If Heater-Shaker's latch is open, can't move to it or east and west of it
        elif (dest_east_west or dest_heater_shaker) and not is_labware_latch_closed:
            raise PipetteMovementRestrictedByHeaterShakerError(
                "Cannot move pipette to Heater-Shaker or adjacent slot to the left or right while labware latch is open"
            )

        elif is_using_multichannel:
            # Can't go to east/west slot under any circumstances if pipette is multi-channel
            if dest_east_west:
                raise PipetteMovementRestrictedByHeaterShakerError(
                    "Cannot move 8-Channel pipette to slot adjacent to the left or right of Heater-Shaker"
                )
            # Can only go north/south if the labware is a tip rack
            elif dest_north_south and not is_tiprack:
                raise PipetteMovementRestrictedByHeaterShakerError(
                    "Cannot move 8-Channel pipette to non-tip-rack labware directly in front of or behind a Heater-Shaker"
                )

    def is_pipette_blocking_shake_movement(
        self, pipette_location: Optional[Location]
    ) -> bool:
        """Check whether pipette is parked adjacent to Heater-Shaker.

        Returns True if pipette's last known location was in a slot adjacent to or
        on the Heater-Shaker. Also returns True if last location is not known or is
        not associated with a slot.
        """
        if pipette_location is None:
            # If we don't know the pipette's latest location then let's be extra
            # cautious and call it blocking
            return True

        pipette_location_slot = pipette_location.labware.first_parent()
        if pipette_location_slot is None:
            # If a location is not associated w/ a slot (e.g., if it has labware=None)
            # then we don't know if it's close to the h/s, so, we will be cautious
            # and call it blocking
            return True

        heater_shaker_slot = self.parent

        assert isinstance(
            heater_shaker_slot, str
        ), "Could not determine module slot location"

        return heater_shaker_slot == pipette_location_slot or int(
            pipette_location_slot
        ) in get_adjacent_slots(int(heater_shaker_slot))

    def is_pipette_blocking_latch_movement(
        self, pipette_location: Optional[Location]
    ) -> bool:
        """Check whether pipette is parked left or right of Heater-Shaker.

        Returns True is pipette's last known location was on the Heater-Shaker
        or in a slot adjacent to its left or right. Also returns True if last
        location is not known or is not associated with a slot.
        """
        if pipette_location is None:
            # If we don't know the pipette's latest location then let's be extra
            # cautious and call it blocking
            return True

        pipette_location_slot = pipette_location.labware.first_parent()
        if pipette_location_slot is None:
            # If a location is not associated w/ a slot (e.g., if it has labware=None)
            # then we don't know if it's close to the h/s, so, we will be cautious
            # and call it blocking
            return True

        heater_shaker_slot = self.parent

        assert isinstance(
            heater_shaker_slot, str
        ), "Could not determine module slot location"

        return heater_shaker_slot == pipette_location_slot or int(
            pipette_location_slot
        ) in get_east_west_slots(int(heater_shaker_slot))


def create_geometry(
    definition: ModuleDefinitionV3,
    parent: Location,
    configuration: Optional[str],
) -> ModuleGeometry:
    """Create a module geometry object from the module's definition and location.

    The definition should be schema checked before being passed to this
    function; all definitions passed here are assumed to be valid.
    """
    module_type = ModuleType(definition["moduleType"])
    module_model = module_model_from_string(definition["model"])
    overall_height = definition["dimensions"]["bareOverallHeight"]
    height_over_labware = definition["dimensions"]["overLabwareHeight"]
    display_name = definition["displayName"]

    if module_model == ThermocyclerModuleModel.THERMOCYCLER_V2:
        pre_transform: NDArray[np.double] = np.array(
            (
                OLD_TC_GEN2_LABWARE_OFFSET["x"],
                OLD_TC_GEN2_LABWARE_OFFSET["y"],
                OLD_TC_GEN2_LABWARE_OFFSET["z"],
                1,
            )
        )
    else:
        pre_transform = np.array(
            (
                definition["labwareOffset"]["x"],
                definition["labwareOffset"]["y"],
                definition["labwareOffset"]["z"],
                1,
            )
        )
    if not parent.labware.is_slot:
        par = ""
        _log.warning(
            f"module location parent labware was {parent.labware} which is"
            "not a slot name; slot transforms will not be loaded"
        )
    else:
        par = str(parent.labware.object)

    # This ModuleGeometry class is only used in Python Protocol API versions <=2.13,
    # which only support the OT-2, so we can ignore OT-3s and hard-code "ot2_standard."
    # We also assume that "ot2_short_trash" has the same transforms as "ot2_standard."
    xforms_ser = (
        definition["slotTransforms"]
        .get("ot2_standard", {})
        .get(
            par,
            {"labwareOffset": [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]},
        )
    )
    xform_ser = xforms_ser["labwareOffset"]

    # apply the slot transform if any
    xform: NDArray[np.double] = np.array(xform_ser)
    xformed = np.dot(xform, pre_transform)
    labware_offset = Point(xformed[0], xformed[1], xformed[2])

    if module_type == ModuleType.MAGNETIC or module_type == ModuleType.TEMPERATURE:
        return ModuleGeometry(
            parent=parent,
            offset=labware_offset,
            overall_height=overall_height,
            height_over_labware=height_over_labware,
            model=module_model,
            module_type=module_type,
            display_name=display_name,
        )
    elif module_type == ModuleType.THERMOCYCLER:
        return ThermocyclerGeometry(
            parent=parent,
            offset=labware_offset,
            overall_height=overall_height,
            height_over_labware=height_over_labware,
            model=module_model,
            module_type=module_type,
            display_name=display_name,
            lid_height=definition["dimensions"]["lidHeight"],
            configuration=(
                ThermocyclerConfiguration(configuration)
                if configuration is not None
                else ThermocyclerConfiguration.FULL
            ),
        )
    elif module_type == ModuleType.HEATER_SHAKER:
        return HeaterShakerGeometry(
            parent=parent,
            offset=labware_offset,
            overall_height=overall_height,
            height_over_labware=height_over_labware,
            model=module_model,
            module_type=module_type,
            display_name=display_name,
        )
    else:
        raise AssertionError(f"Module type {module_type} is invalid")


def load_definition(model: str) -> ModuleDefinitionV3:
    """Load the geometry definition of a given module by model."""
    try:
        return module.load_definition("3", model)
    except module.ModuleNotFoundError:
        raise NoSuchModuleError(f'Could not find a module with model "{model}"')


def models_compatible(
    requested_model: ModuleModel, candidate_definition: ModuleDefinitionV3
) -> bool:
    """Check if a requested model is compatible with a given definition."""
    return (
        requested_model.value == candidate_definition["model"]
        or requested_model.value in candidate_definition["compatibleWith"]
    )
