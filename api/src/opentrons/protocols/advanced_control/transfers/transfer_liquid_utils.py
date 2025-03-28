"""Utility functions for transfer_liquid, consolidate_liquid and distribute_liquid"""
from __future__ import annotations

from typing import Literal, Sequence, List, Optional, TYPE_CHECKING
from dataclasses import dataclass

from opentrons.protocol_engine.errors import LiquidHeightUnknownError
from opentrons.protocol_engine.state._well_math import (
    wells_covered_by_pipette_configuration,
)
from opentrons.types import NozzleMapInterface, NozzleConfigurationType

if TYPE_CHECKING:
    from logging import Logger
    from opentrons.types import Location
    from opentrons.protocol_api.core.engine import WellCore
    from opentrons.protocol_api.labware import Well, Labware


@dataclass
class LocationCheckDescriptors:
    location_type: Literal["submerge start", "retract end"]
    pipetting_action: Literal["aspirate", "dispense"]


def raise_if_location_inside_liquid(
    location: Location,
    well_location: Location,
    well_core: WellCore,
    location_check_descriptors: LocationCheckDescriptors,
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
    try:
        liquid_height_from_bottom = well_core.current_liquid_height()
    except LiquidHeightUnknownError:
        liquid_height_from_bottom = None
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


def group_wells_for_multi_channel_transfer(
    targets: Sequence[Well],
    nozzle_map: NozzleMapInterface,
) -> List[Well]:
    """Takes a list of wells and a nozzle map and returns a list of target wells to address every well given

    This currently only supports 8-tip columns, 12-tip rows and full 96-channel configurations,
    and only is used for 96 and 384 well plates. This assumes the wells are being given in a
    contiguous order (or every other for 384), and will raise if a well is found that does not overlap
    with the first target well given for a sequence, or if not all wells are given for that sequence.
    """
    configuration = nozzle_map.configuration
    active_nozzles = nozzle_map.tip_count

    if (
        (
            (
                configuration == NozzleConfigurationType.COLUMN
                or configuration == NozzleConfigurationType.FULL
            )
            and active_nozzles == 8
        )
        or (configuration == NozzleConfigurationType.ROW and active_nozzles == 12)
        or active_nozzles == 96
    ):
        return _group_wells_for_nozzle_configuration(list(targets), nozzle_map)
    else:
        raise ValueError("Unsupported tip configuration for well grouping")


def _group_wells_for_nozzle_configuration(  # noqa: C901
    targets: List[Well], nozzle_map: NozzleMapInterface
) -> List[Well]:
    """Groups wells together for a column, row, or full 96 configuration and returns a reduced list of target wells."""
    grouped_wells = []
    active_wells_covered: List[str] = []
    active_labware: Optional[Labware] = None
    alternate_384_well_coverage_count = 0
    labware_format: Optional[str] = None

    # We are assuming the wells are ordered A1, B1, C1... A2, B2, C2..., for columns and
    # A1, A2, A3... B1, B2, B3 for rows. So if the active nozzle is on H row/12 column,
    # reverse the list so the correct primary nozzle is chosen
    reverse_lookup = (
        nozzle_map.starting_nozzle == "H12"
        or (
            nozzle_map.configuration == NozzleConfigurationType.COLUMN
            and nozzle_map.starting_nozzle == "H1"
        )
        or (
            nozzle_map.configuration == NozzleConfigurationType.ROW
            and nozzle_map.starting_nozzle == "A12"
        )
    )
    if reverse_lookup:
        targets.reverse()

    for well in targets:
        # If we have wells that are covered by the pipette's nozzles while primary nozzle is over
        # a target well that aren't accounted for, check if the current well is in that list
        if active_wells_covered:
            if well.parent != active_labware:
                raise ValueError(
                    "Could not resolve wells provided to pipette's nozzle configuration. "
                    "Please ensure wells are ordered to match pipette's nozzle layout."
                )

            if well.well_name in active_wells_covered:
                active_wells_covered.remove(well.well_name)
            # If it's a 384 well plate, contiguous wells are not covered by the pipette targeting the
            # initial target well. To support these kinds of transfers given a list of contiguous wells,
            # allow another target well (or up to 4 total for a full 96-tip config) and add those wells
            # to the list of covered wells
            elif labware_format == "384Standard" and (
                alternate_384_well_coverage_count == 0
                or (
                    nozzle_map.tip_count == 96 and alternate_384_well_coverage_count < 3
                )
            ):
                active_wells_covered.extend(
                    list(
                        wells_covered_by_pipette_configuration(
                            nozzle_map,  # type: ignore[arg-type]
                            well.well_name,
                            labware_wells_by_column=[
                                [labware_well.well_name for labware_well in column]
                                for column in well.parent.columns()
                            ],
                        )
                    )
                )
                active_wells_covered.remove(well.well_name)
                grouped_wells.append(well)
                alternate_384_well_coverage_count += 1
            else:
                raise ValueError(
                    "Could not resolve wells provided to pipette's nozzle configuration. "
                    "Please ensure wells are ordered to match pipette's nozzle layout."
                )
        # If we have no active wells covered to account for, add a new target well and list of covered wells to check
        else:
            # If the labware is not a 96 or 384 well plate, add this well to the final result and move on to the next
            labware_format = well.parent.parameters["format"]
            if labware_format != "96Standard" and labware_format != "384Standard":
                grouped_wells.append(well)
                continue

            active_wells_covered = list(
                wells_covered_by_pipette_configuration(
                    nozzle_map,  # type: ignore[arg-type]
                    well.well_name,
                    labware_wells_by_column=[
                        [labware_well.well_name for labware_well in column]
                        for column in well.parent.columns()
                    ],
                )
            )
            active_wells_covered.remove(well.well_name)
            grouped_wells.append(well)
            active_labware = well.parent
            alternate_384_well_coverage_count = 0

    if active_wells_covered:
        raise ValueError(
            "Could not target all wells provided without aspirating or dispensing from other wells. "
            f"Other wells that would be targeted: {active_wells_covered}"
        )

    # If we reversed the lookup of wells, reverse the grouped wells we will return
    if reverse_lookup:
        grouped_wells.reverse()

    return grouped_wells
