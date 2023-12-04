from typing import Union, Dict, Any
from typing_extensions import Protocol

from opentrons.config.types import RobotConfig, OT3Config
from opentrons.hardware_control.types import HardwareFeatureFlags


class Configurable(Protocol):
    """Protocol specifying hardware control configuration."""

    def get_config(self) -> Union[RobotConfig, OT3Config]:
        """Get the robot's configuration object.

        :returns .RobotConfig: The object.
        """
        ...

    def set_config(self, config: Union[RobotConfig, OT3Config]) -> None:
        """Replace the currently-loaded config"""
        ...

    @property
    def hardware_feature_flags(self) -> HardwareFeatureFlags:
        ...

    @hardware_feature_flags.setter
    def hardware_feature_flags(self, feature_flags: HardwareFeatureFlags) -> None:
        """Replace the currently-configured hardware feature flags."""
        ...

    @property
    def config(self) -> Union[RobotConfig, OT3Config]:
        ...

    @config.setter
    def config(self, config: Union[RobotConfig, OT3Config]) -> None:
        ...

    async def update_config(self, **kwargs: Dict[str, Any]) -> None:
        """Update values of the robot's configuration.

        `kwargs` should contain keys of the robot's configuration. For
        instance, `update_config(log_level='debug)` would change the API
        server log level to logging.DEBUG.

        Documentation on keys can be found in the documentation for RobotConfig.
        """
        ...
