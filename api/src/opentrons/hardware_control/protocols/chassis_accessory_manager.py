from typing import Dict, Optional
from typing_extensions import Protocol
from ..types import DoorState, StatusBarState
from .event_sourcer import EventSourcer


class ChassisAccessoryManager(EventSourcer, Protocol):
    """Protocol specifying control of non-motion peripherals on the robot."""

    @property
    def door_state(self) -> DoorState:
        """The current state of the machine's door."""
        ...

    async def set_lights(
        self,
        button: Optional[bool] = None,
        rails: Optional[bool] = None,
    ) -> None:
        """Control the robot lights.

        button If specified, turn the button light on (`True`) or
               off (`False`). If not specified, do not change the
               button light.
        rails: If specified, turn the rail lights on (`True`) or
               off (`False`). If not specified, do not change the
               rail lights.
        """
        ...

    async def get_lights(self) -> Dict[str, bool]:
        """Return the current status of the robot lights.

        :returns: A dict of the lights: `{'button': bool, 'rails': bool}`
        """
        ...

    async def identify(self, duration_s: int = 5) -> None:
        """Run a routine to identify the robot.

        duration_s: The duration to blink for, in seconds.
        """
        ...

    async def set_status_bar_state(self, state: StatusBarState) -> None:
        """Control the status bar to indicate robot state.

        state: The state to set the robot to. Some states are transient
        and will implicitly revert back to the previous state after a short
        action, while others"""
        ...
