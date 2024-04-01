"""Tip state tracking."""
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional, List, Union

from .abstract_store import HasState, HandlesActions
from ..actions import (
    Action,
    SucceedCommandAction,
    FailCommandAction,
    ResetTipsAction,
)
from ..commands import (
    Command,
    LoadLabwareResult,
    PickUpTip,
    PickUpTipResult,
    DropTipResult,
    DropTipInPlaceResult,
)
from ..commands.configuring_common import (
    PipetteConfigUpdateResultMixin,
    PipetteNozzleLayoutResultMixin,
)
from ..error_recovery_policy import ErrorRecoveryType

from opentrons.hardware_control.nozzle_manager import NozzleMap


class TipRackWellState(Enum):
    """The state of a single tip in a tip rack's well."""

    CLEAN = "clean"
    USED = "used"


TipRackStateByWellName = Dict[str, TipRackWellState]


@dataclass
class TipState:
    """State of all tips."""

    tips_by_labware_id: Dict[str, TipRackStateByWellName]
    column_by_labware_id: Dict[str, List[List[str]]]
    channels_by_pipette_id: Dict[str, int]
    length_by_pipette_id: Dict[str, float]
    active_channels_by_pipette_id: Dict[str, int]
    nozzle_map_by_pipette_id: Dict[str, NozzleMap]


class TipStore(HasState[TipState], HandlesActions):
    """Tip state container."""

    _state: TipState

    def __init__(self) -> None:
        """Initialize a liquid store and its state."""
        self._state = TipState(
            tips_by_labware_id={},
            column_by_labware_id={},
            channels_by_pipette_id={},
            length_by_pipette_id={},
            active_channels_by_pipette_id={},
            nozzle_map_by_pipette_id={},
        )

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        if isinstance(action, SucceedCommandAction):
            if isinstance(action.private_result, PipetteConfigUpdateResultMixin):
                pipette_id = action.private_result.pipette_id
                config = action.private_result.config
                self._state.channels_by_pipette_id[pipette_id] = config.channels
                self._state.active_channels_by_pipette_id[pipette_id] = config.channels
                self._state.nozzle_map_by_pipette_id[pipette_id] = config.nozzle_map
            self._handle_succeeded_command(action.command)

            if isinstance(action.private_result, PipetteNozzleLayoutResultMixin):
                pipette_id = action.private_result.pipette_id
                nozzle_map = action.private_result.nozzle_map
                if nozzle_map:
                    self._state.active_channels_by_pipette_id[
                        pipette_id
                    ] = nozzle_map.tip_count
                    self._state.nozzle_map_by_pipette_id[pipette_id] = nozzle_map
                else:
                    self._state.active_channels_by_pipette_id[
                        pipette_id
                    ] = self._state.channels_by_pipette_id[pipette_id]

        elif isinstance(action, FailCommandAction):
            self._handle_failed_command(action)

        elif isinstance(action, ResetTipsAction):
            labware_id = action.labware_id

            for well_name in self._state.tips_by_labware_id[labware_id].keys():
                self._state.tips_by_labware_id[labware_id][
                    well_name
                ] = TipRackWellState.CLEAN

    def _handle_succeeded_command(self, command: Command) -> None:
        if (
            isinstance(command.result, LoadLabwareResult)
            and command.result.definition.parameters.isTiprack
        ):
            labware_id = command.result.labwareId
            definition = command.result.definition
            self._state.tips_by_labware_id[labware_id] = {
                well_name: TipRackWellState.CLEAN
                for column in definition.ordering
                for well_name in column
            }
            self._state.column_by_labware_id[labware_id] = [
                column for column in definition.ordering
            ]

        elif isinstance(command.result, PickUpTipResult):
            labware_id = command.params.labwareId
            well_name = command.params.wellName
            pipette_id = command.params.pipetteId
            length = command.result.tipLength
            self._set_used_tips(
                pipette_id=pipette_id, well_name=well_name, labware_id=labware_id
            )
            self._state.length_by_pipette_id[pipette_id] = length

        elif isinstance(command.result, (DropTipResult, DropTipInPlaceResult)):
            pipette_id = command.params.pipetteId
            self._state.length_by_pipette_id.pop(pipette_id, None)

    def _handle_failed_command(
        self,
        action: FailCommandAction,
    ) -> None:
        # If a pickUpTip command fails recoverably, mark the tips as used. This way,
        # when the protocol is resumed and the Python Protocol API calls
        # `get_next_tip()`, we'll move on to other tips as expected.
        #
        # We don't attempt this for nonrecoverable errors because maybe the failure
        # was due to a bad labware ID or well name.
        if (
            isinstance(action.running_command, PickUpTip)
            and action.type != ErrorRecoveryType.FAIL_RUN
        ):
            self._set_used_tips(
                pipette_id=action.running_command.params.pipetteId,
                labware_id=action.running_command.params.labwareId,
                well_name=action.running_command.params.wellName,
            )
            # TODO(mm, 2024-04-01): We're logically removing the tip from the tip rack,
            # but we're not logically updating the pipette to have that tip on it,
            # which is inconsistent and confusing.
            #
            # To fix that, we need the tip length. But that traditionally comes to us
            # through the command result, which we don't have if the command failed. We
            # may need to expand failed commands to have a private result.

    def _set_used_tips(  # noqa: C901
        self, pipette_id: str, well_name: str, labware_id: str
    ) -> None:
        columns = self._state.column_by_labware_id.get(labware_id, [])
        wells = self._state.tips_by_labware_id.get(labware_id, {})
        nozzle_map = self._state.nozzle_map_by_pipette_id[pipette_id]

        # TODO (cb, 02-28-2024): Transition from using partial nozzle map to full instrument map for the set used logic
        num_nozzle_cols = len(nozzle_map.columns)
        num_nozzle_rows = len(nozzle_map.rows)

        critical_column = 0
        critical_row = 0
        for column in columns:
            if well_name in column:
                critical_row = column.index(well_name)
                critical_column = columns.index(column)

        for i in range(num_nozzle_cols):
            for j in range(num_nozzle_rows):
                if nozzle_map.starting_nozzle == "A1":
                    if (critical_column + i < len(columns)) and (
                        critical_row + j < len(columns[critical_column])
                    ):
                        well = columns[critical_column + i][critical_row + j]
                        wells[well] = TipRackWellState.USED
                elif nozzle_map.starting_nozzle == "A12":
                    if (critical_column - i >= 0) and (
                        critical_row + j < len(columns[critical_column])
                    ):
                        well = columns[critical_column - i][critical_row + j]
                        wells[well] = TipRackWellState.USED
                elif nozzle_map.starting_nozzle == "H1":
                    if (critical_column + i < len(columns)) and (critical_row - j >= 0):
                        well = columns[critical_column + i][critical_row - j]
                        wells[well] = TipRackWellState.USED
                elif nozzle_map.starting_nozzle == "H12":
                    if (critical_column - i >= 0) and (critical_row - j >= 0):
                        well = columns[critical_column - i][critical_row - j]
                        wells[well] = TipRackWellState.USED


class TipView(HasState[TipState]):
    """Read-only tip state view."""

    _state: TipState

    def __init__(self, state: TipState) -> None:
        """Initialize the computed view of liquid state.

        Arguments:
            state: Liquid state dataclass used for all calculations.
        """
        self._state = state

    def get_next_tip(  # noqa: C901
        self,
        labware_id: str,
        num_tips: int,
        starting_tip_name: Optional[str],
        nozzle_map: Optional[NozzleMap],
    ) -> Optional[str]:
        """Get the next available clean tip. Does not support use of a starting tip if the pipette used is in a partial configuration."""
        wells = self._state.tips_by_labware_id.get(labware_id, {})
        columns = self._state.column_by_labware_id.get(labware_id, [])

        def _identify_tip_cluster(
            active_columns: int,
            active_rows: int,
            critical_column: int,
            critical_row: int,
            entry_well: str,
        ) -> Optional[List[str]]:
            tip_cluster = []
            for i in range(active_columns):
                if entry_well == "A1" or entry_well == "H1":
                    if critical_column - i >= 0:
                        column = columns[critical_column - i]
                    else:
                        return None
                elif entry_well == "A12" or entry_well == "H12":
                    if critical_column + i < len(columns):
                        column = columns[critical_column + i]
                    else:
                        return None
                else:
                    raise ValueError(
                        f"Invalid entry well {entry_well} for tip cluster identification."
                    )
                for j in range(active_rows):
                    if entry_well == "A1" or entry_well == "A12":
                        if critical_row - j >= 0:
                            well = column[critical_row - j]
                        else:
                            return None
                    elif entry_well == "H1" or entry_well == "H12":
                        if critical_row + j < len(column):
                            well = column[critical_row + j]
                        else:
                            return None
                    tip_cluster.append(well)

            if any(well not in [*wells] for well in tip_cluster):
                return None

            return tip_cluster

        def _validate_tip_cluster(
            active_columns: int, active_rows: int, tip_cluster: List[str]
        ) -> Union[str, int, None]:
            if not any(wells[well] == TipRackWellState.USED for well in tip_cluster):
                return tip_cluster[0]
            elif all(wells[well] == TipRackWellState.USED for well in tip_cluster):
                return None
            else:
                # The tip cluster list is ordered: Each row from a column in order by columns
                tip_cluster_final_column = []
                for i in range(active_rows):
                    tip_cluster_final_column.append(
                        tip_cluster[((active_columns * active_rows) - 1) - i]
                    )
                tip_cluster_final_row = []
                for i in range(active_columns):
                    tip_cluster_final_row.append(
                        tip_cluster[(active_rows - 1) + (i * active_rows)]
                    )
                if all(
                    wells[well] == TipRackWellState.USED
                    for well in tip_cluster_final_column
                ):
                    return None
                elif all(
                    wells[well] == TipRackWellState.USED
                    for well in tip_cluster_final_row
                ):
                    return None
                else:
                    # Tiprack has no valid tip selection, cannot progress
                    return -1

        # Search through the tiprack beginning at A1
        def _cluster_search_A1(active_columns: int, active_rows: int) -> Optional[str]:
            critical_column = active_columns - 1
            critical_row = active_rows - 1

            while critical_column <= len(columns):
                tip_cluster = _identify_tip_cluster(
                    active_columns, active_rows, critical_column, critical_row, "A1"
                )
                if tip_cluster is not None:
                    result = _validate_tip_cluster(
                        active_columns, active_rows, tip_cluster
                    )
                    if isinstance(result, str):
                        return result
                    elif isinstance(result, int) and result == -1:
                        return None
                if critical_row + active_rows < len(columns[0]):
                    critical_row = critical_row + active_rows
                else:
                    critical_column = critical_column + 1
                    critical_row = active_rows - 1
            return None

        # Search through the tiprack beginning at A12
        def _cluster_search_A12(active_columns: int, active_rows: int) -> Optional[str]:
            critical_column = len(columns) - active_columns
            critical_row = active_rows - 1

            while critical_column >= 0:
                tip_cluster = _identify_tip_cluster(
                    active_columns, active_rows, critical_column, critical_row, "A12"
                )
                if tip_cluster is not None:
                    result = _validate_tip_cluster(
                        active_columns, active_rows, tip_cluster
                    )
                    if isinstance(result, str):
                        return result
                    elif isinstance(result, int) and result == -1:
                        return None
                if critical_row + active_rows < len(columns[0]):
                    critical_row = critical_row + active_rows
                else:
                    critical_column = critical_column - 1
                    critical_row = active_rows - 1
            return None

        # Search through the tiprack beginning at H1
        def _cluster_search_H1(active_columns: int, active_rows: int) -> Optional[str]:
            critical_column = active_columns - 1
            critical_row = len(columns[critical_column]) - active_rows

            while critical_column <= len(columns):  # change to max size of labware
                tip_cluster = _identify_tip_cluster(
                    active_columns, active_rows, critical_column, critical_row, "H1"
                )
                if tip_cluster is not None:
                    result = _validate_tip_cluster(
                        active_columns, active_rows, tip_cluster
                    )
                    if isinstance(result, str):
                        return result
                    elif isinstance(result, int) and result == -1:
                        return None
                if critical_row - active_rows >= 0:
                    critical_row = critical_row - active_rows
                else:
                    critical_column = critical_column + 1
                    critical_row = len(columns[critical_column]) - active_rows
            return None

        # Search through the tiprack beginning at H12
        def _cluster_search_H12(active_columns: int, active_rows: int) -> Optional[str]:
            critical_column = len(columns) - active_columns
            critical_row = len(columns[critical_column]) - active_rows

            while critical_column >= 0:
                tip_cluster = _identify_tip_cluster(
                    active_columns, active_rows, critical_column, critical_row, "H12"
                )
                if tip_cluster is not None:
                    result = _validate_tip_cluster(
                        active_columns, active_rows, tip_cluster
                    )
                    if isinstance(result, str):
                        return result
                    elif isinstance(result, int) and result == -1:
                        return None
                if critical_row - active_rows >= 0:
                    critical_row = critical_row - active_rows
                else:
                    critical_column = critical_column - 1
                    critical_row = len(columns[critical_column]) - active_rows
            return None

        if starting_tip_name is None and nozzle_map is not None and columns:
            num_channels = len(nozzle_map.full_instrument_map_store)
            num_nozzle_cols = len(nozzle_map.columns)
            num_nozzle_rows = len(nozzle_map.rows)
            # Each pipette's cluster search is determined by the point of entry for a given pipette/configuration:
            # - Single channel pipettes always search a tiprack top to bottom, left to right
            # - Eight channel pipettes will begin at the top if the primary nozzle is H1 and at the bottom if
            #   it is A1. The eight channel will always progress across the columns left to right.
            # - 96 Channel pipettes will begin in the corner opposite their primary/starting nozzle (if starting nozzle = A1, enter tiprack at H12)
            #   The 96 channel will then progress towards the opposite corner, either going up or down, left or right depending on configuration.

            if num_channels == 1:
                return _cluster_search_A1(num_nozzle_cols, num_nozzle_rows)
            elif num_channels == 8:
                if nozzle_map.starting_nozzle == "A1":
                    return _cluster_search_H1(num_nozzle_cols, num_nozzle_rows)
                elif nozzle_map.starting_nozzle == "H1":
                    return _cluster_search_A1(num_nozzle_cols, num_nozzle_rows)
            elif num_channels == 96:
                if nozzle_map.starting_nozzle == "A1":
                    return _cluster_search_H12(num_nozzle_cols, num_nozzle_rows)
                elif nozzle_map.starting_nozzle == "A12":
                    return _cluster_search_H1(num_nozzle_cols, num_nozzle_rows)
                elif nozzle_map.starting_nozzle == "H1":
                    return _cluster_search_A12(num_nozzle_cols, num_nozzle_rows)
                elif nozzle_map.starting_nozzle == "H12":
                    return _cluster_search_A1(num_nozzle_cols, num_nozzle_rows)
                else:
                    raise ValueError(
                        f"Nozzle {nozzle_map.starting_nozzle} is an invalid starting tip for automatic tip pickup."
                    )
            else:
                raise RuntimeError(
                    "Invalid number of channels for automatic tip tracking."
                )
        else:
            if columns and num_tips == len(columns[0]):  # Get next tips for 8-channel
                column_head = [column[0] for column in columns]
                starting_column_index = 0

                if starting_tip_name:
                    for idx, column in enumerate(columns):
                        if starting_tip_name in column:
                            if starting_tip_name not in column_head:
                                starting_column_index = idx + 1
                            else:
                                starting_column_index = idx

                for column in columns[starting_column_index:]:
                    if not any(wells[well] == TipRackWellState.USED for well in column):
                        return column[0]

            elif num_tips == len(wells.keys()):  # Get next tips for 96 channel
                if starting_tip_name and starting_tip_name != columns[0][0]:
                    return None

                if not any(
                    tip_state == TipRackWellState.USED for tip_state in wells.values()
                ):
                    return next(iter(wells))

            else:  # Get next tips for single channel
                if starting_tip_name is not None:
                    wells = _drop_wells_before_starting_tip(wells, starting_tip_name)

                for well_name, tip_state in wells.items():
                    if tip_state == TipRackWellState.CLEAN:
                        return well_name
        return None

    def get_pipette_channels(self, pipette_id: str) -> int:
        """Return the given pipette's number of channels."""
        return self._state.channels_by_pipette_id[pipette_id]

    def get_pipette_active_channels(self, pipette_id: str) -> int:
        """Get the number of channels being used in the given pipette's configuration."""
        return self._state.active_channels_by_pipette_id[pipette_id]

    def get_pipette_nozzle_map(self, pipette_id: str) -> NozzleMap:
        """Get the current nozzle map the given pipette's configuration."""
        return self._state.nozzle_map_by_pipette_id[pipette_id]

    def has_clean_tip(self, labware_id: str, well_name: str) -> bool:
        """Get whether a well in a labware has a clean tip.

        Args:
            labware_id: The labware ID to check.
            well_name: The well name to check.

        Returns:
            True if the labware is a tip rack and the well has a clean tip,
            otherwise False.
        """
        tip_rack = self._state.tips_by_labware_id.get(labware_id)
        well_state = tip_rack.get(well_name) if tip_rack else None

        return well_state == TipRackWellState.CLEAN

    def get_tip_length(self, pipette_id: str) -> float:
        """Return the given pipette's tip length."""
        return self._state.length_by_pipette_id.get(pipette_id, 0)


def _drop_wells_before_starting_tip(
    wells: TipRackStateByWellName, starting_tip_name: str
) -> TipRackStateByWellName:
    """Drop any wells that come before the starting tip and return the remaining ones after."""
    seen_starting_well = False
    remaining_wells = {}
    for well_name, tip_state in wells.items():
        if well_name == starting_tip_name:
            seen_starting_well = True
        if seen_starting_well:
            remaining_wells[well_name] = tip_state
    return remaining_wells
