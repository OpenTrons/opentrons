"""Command models to home the stacker."""

from __future__ import annotations

from __future__ import annotations
from typing import Literal, Union, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from ..flex_stacker.common import FlexStackerStallOrCollisionError
from opentrons_shared_data.errors.exceptions import FlexStackerStallError

from ..command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)
from ...errors import ErrorOccurrence
from ...resources import ModelUtils

if TYPE_CHECKING:
    from ...state.state import StateView
    from ...execution import EquipmentHandler

HomeCommandType = Literal["flexStacker/home"]


class HomeParams(BaseModel):
    """The parameters defining how a stacker should be emptied."""

    moduleId: str = Field(..., description="Unique ID of the Flex Stacker")


class HomeResult(BaseModel):
    """Result data from a stacker empty command."""


_ExecuteReturn = Union[
    SuccessData[HomeResult], DefinedErrorData[FlexStackerStallOrCollisionError]
]


class HomeImpl(AbstractCommandImpl[HomeParams, _ExecuteReturn]):
    """Implementation of a stacker empty command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment
        self._model_utils = model_utils

    async def execute(self, params: HomeParams) -> _ExecuteReturn:
        """Execute the stacker empty command."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )
        # Allow propagation of ModuleNotAttachedError.
        stacker_hw = self._equipment.get_module_hardware_api(stacker_state.module_id)

        try:
            if stacker_hw is not None:
                await stacker_hw.home_all()
        except FlexStackerStallError as e:
            return DefinedErrorData(
                public=FlexStackerStallOrCollisionError(
                    id=self._model_utils.generate_id(),
                    createdAt=self._model_utils.get_timestamp(),
                    wrappedErrors=[
                        ErrorOccurrence.from_failed(
                            id=self._model_utils.generate_id(),
                            createdAt=self._model_utils.get_timestamp(),
                            error=e,
                        )
                    ],
                ),
            )

        return SuccessData(public=HomeResult())


class Home(BaseCommand[HomeParams, HomeResult, ErrorOccurrence]):
    """A command to home a Flex Stacker."""

    commandType: HomeCommandType = "flexStacker/home"
    params: HomeParams
    result: HomeResult | None = None

    _ImplementationCls: Type[HomeImpl] = HomeImpl


class HomeCreate(BaseCommandCreate[HomeParams]):
    """A request to execute a Flex Stacker home command."""

    commandType: HomeCommandType = "flexStacker/home"
    params: HomeParams

    _CommandCls: Type[Home] = Home
