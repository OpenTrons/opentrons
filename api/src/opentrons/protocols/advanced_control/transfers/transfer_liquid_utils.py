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
    from opentrons.protocol_api.labware import Well


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
            configuration == NozzleConfigurationType.COLUMN
            or configuration == NozzleConfigurationType.FULL
        )
        and active_nozzles == 8
    ) or (configuration == NozzleConfigurationType.ROW and active_nozzles == 12):
        return _group_wells_for_columns_or_rows(list(targets), nozzle_map)
    elif active_nozzles == 96:
        return _group_wells_for_full_96(list(targets))
    else:
        raise ValueError("Unsupported tip configuration for well grouping")


def _group_wells_for_columns_or_rows(  # noqa: C901
    targets: List[Well], nozzle_map: NozzleMapInterface
) -> List[Well]:
    """Groups wells together for a column or row configuration and returns a reduced list of target wells."""
    from opentrons.protocol_api.labware import Labware

    grouped_wells = []
    active_column_or_row: List[str] = []
    secondary_384_column_or_row: List[str] = []
    active_labware: Optional[Labware] = None

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
        # If the labware is not a 96 or 384 well plate, don't group it and move on to the next well
        labware_format = well.parent.parameters["format"]
        if labware_format != "96Standard" and labware_format != "384Standard":
            grouped_wells.append(well)
            continue

        # If we have an active column or row already, check if the well is in that list
        if active_column_or_row:
            if well.parent != active_labware:
                raise ValueError(
                    "Could not resolve wells provided to pipette's nozzle configuration. "
                    "Please ensure wells are ordered to match pipette's nozzle layout."
                )

            if well.well_name in active_column_or_row:
                active_column_or_row.remove(well.well_name)
            elif labware_format == "384Standard":
                # If the labware is a 384 plate we need to potentially keep track of two columns/rows
                # worth of wells due to spacing. If we haven't started keeping track of that, start it,
                # otherwise check if it's in the existing second list, otherwise it's an error
                if not secondary_384_column_or_row:
                    secondary_384_column_or_row = list(
                        wells_covered_by_pipette_configuration(
                            nozzle_map,  # type: ignore[arg-type]
                            well.well_name,
                            labware_wells_by_column=[
                                [labware_well.well_name for labware_well in column]
                                for column in well.parent.columns()
                            ],
                        )
                    )
                    secondary_384_column_or_row.remove(well.well_name)
                    grouped_wells.append(well)
                elif well.well_name in secondary_384_column_or_row:
                    secondary_384_column_or_row.remove(well.well_name)
                else:
                    raise ValueError(
                        "Could not resolve wells provided to pipette's nozzle configuration. "
                        "Please ensure wells are ordered to match pipette's nozzle layout."
                    )
            else:
                raise ValueError(
                    "Could not resolve wells provided to pipette's nozzle configuration. "
                    "Please ensure wells are ordered to match pipette's nozzle layout."
                )
        # This handles the case when the first column/row has been completed but there is still wells left
        # in the secondary one. For a 96 well plate this will never be True, since creating this list requires
        # the format to be 384
        elif secondary_384_column_or_row:
            if (
                well.well_name in secondary_384_column_or_row
                and well.parent == active_labware
            ):
                secondary_384_column_or_row.remove(well.well_name)
            else:
                raise ValueError(
                    "Could not resolve wells provided to pipette's nozzle configuration. "
                    "Please ensure wells are ordered to match pipette's nozzle layout."
                )
        # We have no active columns/rows so start a new one and add that well to the grouped wells
        else:
            active_column_or_row = list(
                wells_covered_by_pipette_configuration(
                    nozzle_map,  # type: ignore[arg-type]
                    well.well_name,
                    labware_wells_by_column=[
                        [labware_well.well_name for labware_well in column]
                        for column in well.parent.columns()
                    ],
                )
            )
            active_column_or_row.remove(well.well_name)
            grouped_wells.append(well)
            active_labware = well.parent

    if active_column_or_row or secondary_384_column_or_row:
        raise ValueError(
            "Could not target all wells provided without aspirating or dispensing from other wells. "
            f"Other wells that would be targeted: {active_column_or_row + secondary_384_column_or_row}"
        )

    # If we reversed the lookup of wells, reverse the grouped wells we will return
    if reverse_lookup:
        grouped_wells.reverse()

    return grouped_wells


def _group_wells_by_labware(target_wells: List[Well]) -> List[List[Well]]:
    """Returns a list of wells grouped by labware.

    Note that this only groups contiguous wells. If a list is given with a well from
    labware 1, followed by a well from labware 2, followed by more wells from labware 1,
    there will be three lists returned in the outer list
    """
    from opentrons.protocol_api.labware import Labware

    wells_by_labware: List[List[Well]] = []
    active_labware: Optional[Labware] = None
    active_wells: List[Well] = []

    for well in target_wells:
        if active_labware is None or well.parent == active_labware:
            active_labware = well.parent
            active_wells.append(well)
        else:
            wells_by_labware.append(active_wells)
            active_wells = []

    if active_wells:
        wells_by_labware.append(active_wells)

    return wells_by_labware


def _group_wells_for_full_96(targets: List[Well]) -> List[Well]:
    """Groups wells together for a full 96-channel configuration and returns a reduced list of target wells.

    This will only ever return wells A1 for a 96 well plate, or wells A1, B1, A2, and/or B2 for a 384 well plate.
    """
    if not targets:
        return []

    wells_by_labware = _group_wells_by_labware(targets)

    grouped_wells: List[Well] = []
    for well_group in wells_by_labware:
        parent_labware = well_group[0].parent
        labware_format = parent_labware.parameters["format"]
        if labware_format != "96Standard" and labware_format != "384Standard":
            grouped_wells.extend(well_group)
            continue

        # Check set as well to make sure there's also 96 (or a multiple of) unique wells
        if len(targets) % 96 != 0 or len(set(targets)) % 96 != 0:
            raise ValueError(
                "Improper amount of wells given for a full 96-channel transfer. "
                "Ensure there are 96 or a multiple of 96 wells given."
            )

        if labware_format == "96Standard":
            target_wells = [well for well in well_group if well.well_name == "A1"]
        else:
            target_wells = [
                well
                for well in well_group
                if well.well_name in {"A1", "B1", "A2", "B2"}
            ]
        grouped_wells.extend(target_wells)

    return grouped_wells
