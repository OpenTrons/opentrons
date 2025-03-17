"""Utility functions for transfer_liquid, consolidate_liquid and distribute_liquid"""
from __future__ import annotations

from typing import Literal, TYPE_CHECKING
from dataclasses import dataclass


if TYPE_CHECKING:
    from logging import Logger
    from opentrons.types import Location
    from opentrons.protocol_api.core.engine import WellCore


@dataclass
class _LocationCheckDescriptors:
    location_type: Literal["submerge start", "retract end"]
    pipetting_action: Literal["aspirate", "dispense"]


def raise_if_location_inside_liquid(
    location: Location,
    well_location: Location,
    well_core: WellCore,
    location_check_descriptors: _LocationCheckDescriptors,
    logger: Logger,
) -> None:
    """Raise an error if the location in question would be inside the liquid.

    This checker will raise an error if:
    - the location in question is below the target well location during aspirate/dispense or,
    - if we can find the liquid height AND the location in question is below this height.
      If we can't find the liquid height, then we simply log a warning and no error is raised.
    """
    if location.point.z < well_location.point.z:
        raise RuntimeError(
            f"Received {location_check_descriptors.location_type} location of {location}"
            f" and {location_check_descriptors.pipetting_action} location of {well_location}."
            f" {location_check_descriptors.location_type.capitalize()} location z should not be lower"
            f" than the {location_check_descriptors.pipetting_action} location z."
        )
    liquid_height_from_bottom = well_core.current_liquid_height()
    if isinstance(liquid_height_from_bottom, (int, float)):
        if liquid_height_from_bottom + well_core.get_bottom(0).z > location.point.z:
            raise RuntimeError(
                f"{location_check_descriptors.location_type.capitalize()} location {location} is"
                f" inside the liquid in well {well_core.get_display_name()} when it should be outside"
                f"(above) the liquid."
            )
    else:
        # We could raise an error here but that would restrict the use of
        # liquid classes-based transfer to only when LPD is enabled or when liquids are
        # loaded in protocols using `load_liquid`. This can be quite restrictive
        # so we will not raise but just log a warning.
        logger.warning(
            f"Could not verify height of liquid in well {well_core.get_display_name()}, either"
            f" because the liquid in this well has not been probed or because"
            f" liquid was not loaded in this well using `load_liquid`."
            f" Proceeding without verifying if {location_check_descriptors.location_type}"
            f" location is outside the liquid."
        )
