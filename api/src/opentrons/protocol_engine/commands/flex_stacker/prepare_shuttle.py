"""Command models to prepare the stacker shuttle for movement."""

from __future__ import annotations

from __future__ import annotations
from typing import Literal, Union, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from .common import FlexStackerStallOrCollisionError
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

PrepareShuttleCommandType = Literal["flexStacker/prepareShuttle"]


class PrepareShuttleParams(BaseModel):
    """The parameters for a PrepareShuttle command."""

    moduleId: str = Field(..., description="Unique ID of the Flex Stacker")
    ignoreLatch: bool = Field(
        default=False, description="Ignore the latch state of the shuttle"
    )


class PrepareShuttleResult(BaseModel):
    """Result data from a stacker PrepareShuttle command."""


_ExecuteReturn = Union[
    SuccessData[PrepareShuttleResult],
    DefinedErrorData[FlexStackerStallOrCollisionError],
]


class PrepareShuttleImpl(AbstractCommandImpl[PrepareShuttleParams, _ExecuteReturn]):
    """Implementation of a stacker prepare shuttle command."""

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

    async def execute(self, params: PrepareShuttleParams) -> _ExecuteReturn:
        """Execute the stacker prepare shuttle command."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )
        # Allow propagation of ModuleNotAttachedError.
        stacker_hw = self._equipment.get_module_hardware_api(stacker_state.module_id)

        try:
            if stacker_hw is not None:
                await stacker_hw.home_all(params.ignoreLatch)
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
        # TODO we should also add a check for shuttle not detected error

        return SuccessData(public=PrepareShuttleResult())


class PrepareShuttle(
    BaseCommand[PrepareShuttleParams, PrepareShuttleResult, ErrorOccurrence]
):
    """A command to prepare Flex Stacker shuttle."""

    commandType: PrepareShuttleCommandType = "flexStacker/prepareShuttle"
    params: PrepareShuttleParams
    result: PrepareShuttleResult | None = None

    _ImplementationCls: Type[PrepareShuttleImpl] = PrepareShuttleImpl


class PrepareShuttleCreate(BaseCommandCreate[PrepareShuttleParams]):
    """A request to execute a Flex Stacker PrepareShuttle command."""

    commandType: PrepareShuttleCommandType = "flexStacker/prepareShuttle"
    params: PrepareShuttleParams

    _CommandCls: Type[PrepareShuttle] = PrepareShuttle
