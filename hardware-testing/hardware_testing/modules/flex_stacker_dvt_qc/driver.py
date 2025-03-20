"""FLEX Stacker Driver."""
import asyncio
from typing import Union, Optional
import re
from serial.tools.list_ports import comports  # type: ignore[import]
from opentrons.drivers.flex_stacker.driver import (
    STACKER_MOTION_CONFIG,
    FlexStackerDriver,
)
from opentrons.drivers.flex_stacker.types import (
    StackerAxis,
    Direction,
    MoveResult,
)
from opentrons.drivers.flex_stacker.simulator import SimulatingDriver
from opentrons.hardware_control.modules.types import PlatformState

STACKER_VID = 0x483
STACKER_PID = 0xEF24
# Maximum distance in mm the axis can travel.
MAX_TRAVEL = {
    StackerAxis.X: 192.5,
    StackerAxis.Z: 136.0,
    StackerAxis.L: 23.0,
}


class FlexStackerStallError(Exception):
    """FLEX Stacker stall error."""

    pass


class FlexStackerInterface:
    """FLEX Stacker Driver."""

    @classmethod
    async def build(cls, port: str = "") -> "FlexStackerInterface":
        """Build FLEX Stacker driver."""
        if not port:
            for i in comports():
                if i.vid == STACKER_VID and i.pid == STACKER_PID:
                    port = i.device
                    break
        assert port, "could not find connected FLEX Stacker"
        driver = await FlexStackerDriver.create(port, loop=asyncio.get_running_loop())
        return cls(driver)

    @classmethod
    async def build_simulator(cls, port: str = "") -> "FlexStackerInterface":
        """Build FLEX Stacker simulator."""
        return cls(SimulatingDriver(), simulating=True)

    def __init__(
        self,
        driver: Union[FlexStackerDriver, SimulatingDriver],
        simulating: bool = False,
    ) -> None:
        """Constructor."""
        self._simulating = simulating
        self._driver = driver

    async def move_axis(
        self,
        axis: StackerAxis,
        direction: Direction,
        distance: float,
        speed: Optional[float] = None,
        acceleration: Optional[float] = None,
        current: Optional[float] = None,
    ) -> bool:
        """Move the axis in a direction by the given distance in mm."""
        default = STACKER_MOTION_CONFIG[axis]["move"]
        await self._driver.set_run_current(
            axis, current if current is not None else default.run_current
        )
        await self._driver.set_ihold_current(axis, default.hold_current)
        move_params = default.move_params.update(
            max_speed=speed, acceleration=acceleration
        )
        distance = direction.distance(distance)
        res = await self._driver.move_in_mm(axis, distance, params=move_params)
        if res == MoveResult.STALL_ERROR:
            raise FlexStackerStallError()
        return res == MoveResult.NO_ERROR

    async def close_latch(
        self,
        velocity: Optional[float] = None,
        acceleration: Optional[float] = None,
    ) -> bool:
        """Close the latch, dropping any labware its holding."""
        # Dont move the latch if its already closed.
        if await self._driver.get_limit_switch(StackerAxis.L, Direction.RETRACT):
            return True

        success = await self.home_axis(
            StackerAxis.L,
            Direction.RETRACT,
            speed=velocity,
            acceleration=acceleration,
        )
        # Check that the latch is closed.
        closed = await self._driver.get_limit_switch(StackerAxis.L, Direction.RETRACT)
        return success and closed

    async def open_latch(
        self,
        velocity: Optional[float] = None,
        acceleration: Optional[float] = None,
    ) -> bool:
        """Open the latch."""
        # Dont move the latch if its already opened.
        if not await self._driver.get_limit_switch(StackerAxis.L, Direction.RETRACT):
            return True

        # The latch only has one limit switch, so we have to travel a fixed distance
        # to open the latch.
        success = await self.move_axis(
            StackerAxis.L,
            Direction.EXTEND,
            distance=MAX_TRAVEL[StackerAxis.L],
            speed=velocity,
            acceleration=acceleration,
        )
        # Check that the latch is opened.
        open = not await self._driver.get_limit_switch(StackerAxis.L, Direction.RETRACT)
        return success and open

    async def home_axis(
        self,
        axis: StackerAxis,
        direction: Direction,
        speed: Optional[float] = None,
        acceleration: Optional[float] = None,
        current: Optional[float] = None,
    ) -> bool:
        """Home the axis."""
        default = STACKER_MOTION_CONFIG[axis]["home"]
        await self._driver.set_run_current(
            axis, current if current is not None else default.run_current
        )

        move_params = default.move_params.update(
            max_speed=speed, acceleration=acceleration
        )
        success = await self._driver.move_to_limit_switch(
            axis=axis, direction=direction, params=move_params
        )
        if success == MoveResult.STALL_ERROR:
            raise FlexStackerStallError()
        return success == MoveResult.NO_ERROR

    async def _move_and_home_axis(
        self, axis: StackerAxis, direction: Direction, offset: float = 0
    ) -> bool:
        distance = MAX_TRAVEL[axis] - offset
        await self.move_axis(axis, direction, distance)
        return await self.home_axis(axis, direction)

    async def get_estop(self) -> bool:
        """Get E-Stop status.

        :return: True if E-Stop is triggered, False otherwise
        """
        if self._simulating:
            return True

        assert isinstance(self._driver, FlexStackerDriver)
        _LS_RE = re.compile(r"^M112 E:(\d)$")
        res = await self._driver._connection.send_data("M112\n")
        match = _LS_RE.match(res)
        assert match, f"Incorrect Response for E-Stop switch: {res}"
        return bool(int(match.group(1)))

    async def get_platform_state(self) -> PlatformState:
        """Get platform state.

        :return: PlatformState
        """
        if self._simulating:
            return PlatformState.UNKNOWN

        assert isinstance(self._driver, FlexStackerDriver)
        res = await self._driver.get_platform_status()
        return PlatformState.from_status(res)
