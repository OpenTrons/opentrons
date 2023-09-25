from typing import Dict, List, Optional, Any, Sequence
from typing_extensions import Final
from dataclasses import dataclass
from collections import OrderedDict
from enum import Enum

from opentrons.hardware_control.types import CriticalPoint
from opentrons.types import Point
from opentrons_shared_data.errors import (
    ErrorCodes,
    GeneralError,
)

INTERNOZZLE_SPACING = 9


class NozzleConfigurationType(Enum):
    """
    Nozzle Configuration Type.

    Represents the current nozzle
    configuration stored in NozzleMap
    """

    COLUMN = "COLUMN"
    ROW = "ROW"
    QUADRANT = "QUADRANT"
    SINGLE = "SINGLE"
    FULL = "FULL"

    @classmethod
    def determine_nozzle_configuration(
        cls,
        nozzle_difference: Point,
        physical_nozzlemap_length: int,
        current_nozzlemap_length: int,
    ) -> "NozzleConfigurationType":
        """
        Determine the nozzle configuration based on the starting and
        ending nozzle.

        :param nozzle_difference: the difference between the back
        left and front right nozzle
        :param physical_nozzlemap_length: integer representing the
        length of the default physical configuration of the pipette.
        :param current_nozzlemap_length: integer representing the
        length of the current physical configuration of the pipette.
        :return : nozzle configuration type
        """
        if physical_nozzlemap_length == current_nozzlemap_length:
            return NozzleConfigurationType.FULL

        if nozzle_difference == Point(0, 0, 0):
            return NozzleConfigurationType.SINGLE
        elif nozzle_difference[0] == 0:
            return NozzleConfigurationType.COLUMN
        elif nozzle_difference[1] == 0:
            return NozzleConfigurationType.ROW
        else:
            return NozzleConfigurationType.QUADRANT


@dataclass
class NozzleMap:
    """
    Nozzle Map.

    A data store class that can build
    and store nozzle configurations
    based on the physical default
    nozzle map of the pipette and
    the requested starting/ending tips.
    """

    back_left: str
    front_right: str
    starting_nozzle: str
    map_store: Dict[str, Point]
    configuration: NozzleConfigurationType

    def __str__(self) -> str:
        return f"back_left_nozzle: {self.back_left} front_right_nozzle: {self.front_right} configuration: {self.configuration}"

    @property
    def starting_nozzle_offset(self) -> Point:
        return self.map_store[self.starting_nozzle]

    @property
    def xy_center_offset(self) -> Point:
        difference = self.map_store[self.front_right] - self.map_store[self.back_left]
        return self.map_store[self.back_left] + Point(
            difference[0] / 2, difference[1] / 2, 0
        )

    @property
    def front_nozzle_offset(self) -> Point:
        # front left-most nozzle of the 96 channel in a given configuration
        # and front nozzle of the 8 channel
        if self.starting_nozzle == self.front_right:
            return self.map_store[self.front_right]
        map_store_list = list(self.map_store.values())
        starting_idx = map_store_list.index(self.map_store[self.back_left])
        difference = self.map_store[self.back_left] - self.map_store[self.front_right]
        y_rows_length = int(difference[1] // INTERNOZZLE_SPACING)
        return map_store_list[starting_idx + y_rows_length]

    @classmethod
    def build(
        cls,
        physical_nozzle_map: Dict[str, Point],
        starting_nozzle: str,
        back_left_nozzle: str,
        front_right_nozzle: str,
    ) -> "NozzleMap":
        difference = (
            physical_nozzle_map[front_right_nozzle]
            - physical_nozzle_map[back_left_nozzle]
        )
        x_columns_length = int(abs(difference[0] // INTERNOZZLE_SPACING)) + 1
        y_rows_length = int(abs(difference[1] // INTERNOZZLE_SPACING)) + 1

        map_store_list = list(physical_nozzle_map.items())

        map_store = OrderedDict(
            {
                k: v
                for i in range(x_columns_length)
                for k, v in map_store_list[i * 8 : y_rows_length * (i + 1)]
            }
        )
        return cls(
            back_left=back_left_nozzle,
            front_right=front_right_nozzle,
            starting_nozzle=starting_nozzle,
            map_store=map_store,
            configuration=NozzleConfigurationType.determine_nozzle_configuration(
                difference, len(physical_nozzle_map), len(map_store)
            ),
        )

    @staticmethod
    def validate_nozzle_configuration(
        back_left_nozzle: str,
        front_right_nozzle: str,
        default_configuration: "NozzleMap",
        current_configuration: Optional["NozzleMap"] = None,
    ) -> None:
        """
        Validate nozzle configuration.
        """
        if back_left_nozzle > front_right_nozzle:
            raise IncompatibleNozzleConfiguration(
                message=f"Back left nozzle {back_left_nozzle} provided is not to the back or left of {front_right_nozzle}.",
                detail={
                    "current_nozzle_configuration": current_configuration,
                    "requested_back_left_nozzle": back_left_nozzle,
                    "requested_front_right_nozzle": front_right_nozzle,
                },
            )
        if not default_configuration.map_store.get(back_left_nozzle):
            raise IncompatibleNozzleConfiguration(
                message=f"Starting nozzle {back_left_nozzle} does not exist in the nozzle map.",
                detail={
                    "current_nozzle_configuration": current_configuration,
                    "requested_back_left_nozzle": back_left_nozzle,
                    "requested_front_right_nozzle": front_right_nozzle,
                },
            )

        if not default_configuration.map_store.get(front_right_nozzle):
            raise IncompatibleNozzleConfiguration(
                message=f"Ending nozzle {front_right_nozzle} does not exist in the nozzle map.",
                detail={
                    "current_nozzle_configuration": current_configuration,
                    "requested_back_left_nozzle": back_left_nozzle,
                    "requested_front_right_nozzle": front_right_nozzle,
                },
            )


class IncompatibleNozzleConfiguration(GeneralError):
    """Error raised if nozzle configuration is incompatible with the currently loaded pipette."""

    def __init__(
        self,
        message: Optional[str] = None,
        detail: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[GeneralError]] = None,
    ) -> None:
        """Build a IncompatibleNozzleConfiguration error."""
        super().__init__(
            code=ErrorCodes.API_MISCONFIGURATION,
            message=message,
            detail=detail,
            wrapping=wrapping,
        )


class NozzleConfigurationManager:
    def __init__(
        self,
        nozzle_map: NozzleMap,
        current_scalar: float,
    ) -> None:
        self._physical_nozzle_map = nozzle_map
        self._current_nozzle_configuration = nozzle_map
        self._current_scalar: Final[float] = current_scalar

    @classmethod
    def build_from_nozzlemap(
        cls, nozzle_map: Dict[str, List[float]], current_scalar: float
    ) -> "NozzleConfigurationManager":

        sorted_nozzlemap = list(nozzle_map.keys())
        sorted_nozzlemap.sort(key=lambda x: int(x[1::]))
        nozzle_map_ordereddict: Dict[str, Point] = OrderedDict(
            {k: Point(*nozzle_map[k]) for k in sorted_nozzlemap}
        )
        first_nozzle = next(iter(list(nozzle_map_ordereddict.keys())))
        last_nozzle = next(reversed(list(nozzle_map_ordereddict.keys())))
        starting_nozzle_config = NozzleMap.build(
            nozzle_map_ordereddict,
            starting_nozzle=first_nozzle,
            back_left_nozzle=first_nozzle,
            front_right_nozzle=last_nozzle,
        )
        return cls(starting_nozzle_config, current_scalar)

    @property
    def starting_nozzle_offset(self) -> Point:
        return self._current_nozzle_configuration.starting_nozzle_offset

    def update_nozzle_configuration(
        self,
        back_left_nozzle: str,
        front_right_nozzle: str,
        starting_nozzle: Optional[str] = None,
    ) -> None:
        if (
            back_left_nozzle == self._physical_nozzle_map.back_left
            and front_right_nozzle == self._physical_nozzle_map.front_right
        ):
            self._current_nozzle_configuration = self._physical_nozzle_map
        else:
            NozzleMap.validate_nozzle_configuration(
                back_left_nozzle,
                front_right_nozzle,
                self._physical_nozzle_map,
                self._current_nozzle_configuration,
            )

            self._current_nozzle_configuration = NozzleMap.build(
                self._physical_nozzle_map.map_store,
                starting_nozzle=starting_nozzle or back_left_nozzle,
                back_left_nozzle=back_left_nozzle,
                front_right_nozzle=front_right_nozzle,
            )

    def get_current_for_tip_configuration(self) -> float:
        # TODO While implementing this PR I realized that
        # the current scalar truly is inefficient for
        # encapsulating varying currents needed for
        # pick up tip so we'll need to follow this up
        # with a lookup table.
        return self._current_scalar

    def critical_point_with_tip_length(
        self,
        cp_override: Optional[CriticalPoint],
        tip_length: float = 0.0,
    ) -> Point:
        if cp_override == CriticalPoint.XY_CENTER:
            current_nozzle = self._current_nozzle_configuration.xy_center_offset
        elif cp_override == CriticalPoint.FRONT_NOZZLE:
            current_nozzle = self._current_nozzle_configuration.front_nozzle_offset
        else:
            current_nozzle = self.starting_nozzle_offset
        return current_nozzle - Point(0, 0, tip_length)
