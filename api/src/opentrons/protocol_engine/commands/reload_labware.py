"""Reload labware command request, result, and implementation models."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from .labware_handling_common import LabwarePositionResultMixin
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence
from ..state.update_types import StateUpdate

if TYPE_CHECKING:
    from ..state.state import StateView
    from ..execution import EquipmentHandler


ReloadLabwareCommandType = Literal["reloadLabware"]


class ReloadLabwareParams(BaseModel):
    """Payload required to load a labware into a slot."""

    labwareId: str = Field(
        ..., description="The already-loaded labware instance to update."
    )


class ReloadLabwareResult(LabwarePositionResultMixin):
    """Result data from the execution of a LoadLabware command."""


class ReloadLabwareImplementation(
    AbstractCommandImpl[ReloadLabwareParams, SuccessData[ReloadLabwareResult]]
):
    """Reload labware command implementation."""

    def __init__(
        self, equipment: EquipmentHandler, state_view: StateView, **kwargs: object
    ) -> None:
        self._equipment = equipment
        self._state_view = state_view

    async def execute(
        self, params: ReloadLabwareParams
    ) -> SuccessData[ReloadLabwareResult]:
        """Reload the definition and calibration data for a specific labware."""
        reloaded_labware = await self._equipment.reload_labware(
            labware_id=params.labwareId,
        )

        state_update = StateUpdate()

        state_update.set_labware_location(
            labware_id=params.labwareId,
            new_location=reloaded_labware.location,
            new_offset_id=reloaded_labware.offsetId,
        )

        return SuccessData(
            public=ReloadLabwareResult(
                labwareId=params.labwareId,
                offsetId=reloaded_labware.offsetId,
                locationSequence=self._state_view.geometry.get_predicted_location_sequence(
                    reloaded_labware.location
                ),
            ),
            state_update=state_update,
        )


class ReloadLabware(
    BaseCommand[ReloadLabwareParams, ReloadLabwareResult, ErrorOccurrence]
):
    """Reload labware command resource model."""

    commandType: ReloadLabwareCommandType = "reloadLabware"
    params: ReloadLabwareParams
    result: Optional[ReloadLabwareResult] = None

    _ImplementationCls: Type[ReloadLabwareImplementation] = ReloadLabwareImplementation


class ReloadLabwareCreate(BaseCommandCreate[ReloadLabwareParams]):
    """Reload labware command creation request."""

    commandType: ReloadLabwareCommandType = "reloadLabware"
    params: ReloadLabwareParams

    _CommandCls: Type[ReloadLabware] = ReloadLabware
