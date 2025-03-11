"""Common pipetting command base models."""

from __future__ import annotations
from typing import Literal, Tuple, TYPE_CHECKING, Optional
import numpy
from typing_extensions import TypedDict
from pydantic import BaseModel, Field

from opentrons_shared_data.errors import ErrorCodes
from opentrons.protocol_engine.errors.error_occurrence import ErrorOccurrence
from opentrons.protocol_engine.types import AspiratedFluid, FluidKind
from opentrons_shared_data.errors.exceptions import PipetteOverpressureError
from .command import DefinedErrorData, SuccessData
from opentrons.protocol_engine.state.update_types import StateUpdate


if TYPE_CHECKING:
    from ..execution.pipetting import PipettingHandler
    from ..resources import ModelUtils
    from ..notes import CommandNoteAdder


DEFAULT_CORRECTION_VOLUME = 0.0
"""Default correction volume (uL) for any aspirate/ dispense volume."""


class PipetteIdMixin(BaseModel):
    """Mixin for command requests that take a pipette ID."""

    pipetteId: str = Field(
        ...,
        description="Identifier of pipette to use for liquid handling.",
    )


class AspirateVolumeMixin(BaseModel):
    """Mixin for the `volume` field of aspirate commands."""

    volume: float = Field(
        ...,
        description="The amount of liquid to aspirate, in µL."
        " Must not be greater than the remaining available amount, which depends on"
        " the pipette (see `loadPipette`), its configuration (see `configureForVolume`),"
        " the tip (see `pickUpTip`), and the amount you've aspirated so far."
        " There is some tolerance for floating point rounding errors.",
        ge=0,
    )
    correctionVolume: Optional[float] = Field(
        None,
        description="The correction volume in uL.",
    )


class DispenseVolumeMixin(BaseModel):
    """Mixin for the `volume` field of dispense commands."""

    volume: float = Field(
        ...,
        description="The amount of liquid to dispense, in µL."
        " Must not be greater than the currently aspirated volume."
        " There is some tolerance for floating point rounding errors.",
        ge=0,
    )
    correctionVolume: Optional[float] = Field(
        None,
        description="The correction volume in uL.",
    )


class FlowRateMixin(BaseModel):
    """Mixin for command requests that take a flow rate."""

    flowRate: float = Field(
        ..., description="Speed in µL/s configured for the pipette", gt=0
    )


class BaseLiquidHandlingResult(BaseModel):
    """Base properties of a liquid handling result."""

    volume: float = Field(
        ...,
        description="Amount of liquid in uL handled in the operation.",
        ge=0,
    )


class EmptyResult(BaseModel):
    """A result with no data."""


class ErrorLocationInfo(TypedDict):
    """Holds a retry location for in-place error recovery.

    This is appropriate to pass to a `moveToCoordinates` command,
    assuming the pipette has not been configured with a different nozzle layout
    in the meantime.
    """

    retryLocation: Tuple[float, float, float]


class OverpressureError(ErrorOccurrence):
    """Returned when sensors detect an overpressure error while moving liquid.

    The pipette plunger motion is stopped at the point of the error.

    The next thing to move the plunger must account for the robot not having a valid
    estimate of its position. It should be a `home`, `unsafe/updatePositionEstimators`,
    `unsafe/dropTipInPlace`, or `unsafe/blowOutInPlace`.
    """

    isDefined: bool = True

    errorType: Literal["overpressure"] = "overpressure"

    errorCode: str = ErrorCodes.PIPETTE_OVERPRESSURE.value.code
    detail: str = ErrorCodes.PIPETTE_OVERPRESSURE.value.detail

    errorInfo: ErrorLocationInfo


class LiquidNotFoundError(ErrorOccurrence):
    """Returned when no liquid is detected during the liquid probe process/move.

    After a failed probing, the pipette returns to the process start position.
    """

    isDefined: bool = True

    errorType: Literal["liquidNotFound"] = "liquidNotFound"

    errorCode: str = ErrorCodes.PIPETTE_LIQUID_NOT_FOUND.value.code
    detail: str = ErrorCodes.PIPETTE_LIQUID_NOT_FOUND.value.detail


class TipPhysicallyAttachedError(ErrorOccurrence):
    """Returned when sensors determine that a tip remains on the pipette after a drop attempt.

    The pipette will act as if the tip was not dropped. So, you won't be able to pick
    up a new tip without dropping the current one, and movement commands will assume
    there is a tip hanging off the bottom of the pipette.
    """

    isDefined: bool = True

    errorType: Literal["tipPhysicallyAttached"] = "tipPhysicallyAttached"

    errorCode: str = ErrorCodes.TIP_DROP_FAILED.value.code
    detail: str = ErrorCodes.TIP_DROP_FAILED.value.detail

    errorInfo: ErrorLocationInfo


async def prepare_for_aspirate(
    pipette_id: str,
    pipetting: PipettingHandler,
    model_utils: ModelUtils,
    location_if_error: ErrorLocationInfo,
) -> SuccessData[EmptyResult] | DefinedErrorData[OverpressureError]:
    """Execute pipetting.prepare_for_aspirate, handle errors, and marshal success."""
    try:
        await pipetting.prepare_for_aspirate(pipette_id)
    except PipetteOverpressureError as e:
        return DefinedErrorData(
            public=OverpressureError(
                id=model_utils.generate_id(),
                createdAt=model_utils.get_timestamp(),
                wrappedErrors=[
                    ErrorOccurrence.from_failed(
                        id=model_utils.generate_id(),
                        createdAt=model_utils.get_timestamp(),
                        error=e,
                    )
                ],
                errorInfo=location_if_error,
            ),
            state_update=StateUpdate().set_fluid_unknown(pipette_id=pipette_id),
        )
    else:
        return SuccessData(
            public=EmptyResult(),
            state_update=StateUpdate().set_fluid_empty(pipette_id=pipette_id),
        )


async def aspirate_in_place(
    pipette_id: str,
    volume: float,
    flow_rate: float,
    correction_volume: float,
    location_if_error: ErrorLocationInfo,
    command_note_adder: CommandNoteAdder,
    pipetting: PipettingHandler,
    model_utils: ModelUtils,
) -> SuccessData[BaseLiquidHandlingResult] | DefinedErrorData[OverpressureError]:
    """Execute an aspirate in place micro-operation."""
    try:
        volume_aspirated = await pipetting.aspirate_in_place(
            pipette_id=pipette_id,
            volume=volume,
            flow_rate=flow_rate,
            command_note_adder=command_note_adder,
            correction_volume=correction_volume,
        )
    except PipetteOverpressureError as e:
        return DefinedErrorData(
            public=OverpressureError(
                id=model_utils.generate_id(),
                createdAt=model_utils.get_timestamp(),
                wrappedErrors=[
                    ErrorOccurrence.from_failed(
                        id=model_utils.generate_id(),
                        createdAt=model_utils.get_timestamp(),
                        error=e,
                    )
                ],
                errorInfo=location_if_error,
            ),
            state_update=StateUpdate().set_fluid_unknown(pipette_id=pipette_id),
        )
    else:
        return SuccessData(
            public=BaseLiquidHandlingResult(
                volume=volume_aspirated,
            ),
            state_update=StateUpdate().set_fluid_aspirated(
                pipette_id=pipette_id,
                fluid=AspiratedFluid(kind=FluidKind.LIQUID, volume=volume_aspirated),
            ),
        )


async def aspirate_while_tracking(
    pipette_id: str,
    labware_id: str,
    well_name: str,
    volume: float,
    flow_rate: float,
    location_if_error: ErrorLocationInfo,
    command_note_adder: CommandNoteAdder,
    pipetting: PipettingHandler,
    model_utils: ModelUtils,
) -> SuccessData[BaseLiquidHandlingResult] | DefinedErrorData[OverpressureError]:
    """Execute an aspirate while tracking microoperation."""
    try:
        volume_aspirated = await pipetting.aspirate_while_tracking(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            volume=volume,
            flow_rate=flow_rate,
            command_note_adder=command_note_adder,
        )
    except PipetteOverpressureError as e:
        return DefinedErrorData(
            public=OverpressureError(
                id=model_utils.generate_id(),
                createdAt=model_utils.get_timestamp(),
                wrappedErrors=[
                    ErrorOccurrence.from_failed(
                        id=model_utils.generate_id(),
                        createdAt=model_utils.get_timestamp(),
                        error=e,
                    )
                ],
                errorInfo=location_if_error,
            ),
            state_update=StateUpdate().set_fluid_unknown(pipette_id=pipette_id),
        )
    else:
        return SuccessData(
            public=BaseLiquidHandlingResult(
                volume=volume_aspirated,
            ),
            state_update=StateUpdate().set_fluid_aspirated(
                pipette_id=pipette_id,
                fluid=AspiratedFluid(kind=FluidKind.LIQUID, volume=volume_aspirated),
            ),
        )


async def dispense_while_tracking(
    pipette_id: str,
    labware_id: str,
    well_name: str,
    volume: float,
    flow_rate: float,
    push_out: float | None,
    location_if_error: ErrorLocationInfo,
    pipetting: PipettingHandler,
    model_utils: ModelUtils,
) -> SuccessData[BaseLiquidHandlingResult] | DefinedErrorData[OverpressureError]:
    """Execute an dispense while tracking microoperation."""
    # The current volume won't be none since it passed validation
    current_volume = (
        pipetting.get_state_view().pipettes.get_aspirated_volume(pipette_id) or 0.0
    )
    is_full_dispense = numpy.isclose(current_volume - volume, 0)
    ready = push_out == 0 if push_out is not None else not is_full_dispense
    try:
        volume_dispensed = await pipetting.dispense_while_tracking(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            volume=volume,
            flow_rate=flow_rate,
            push_out=push_out,
        )
    except PipetteOverpressureError as e:
        return DefinedErrorData(
            public=OverpressureError(
                id=model_utils.generate_id(),
                createdAt=model_utils.get_timestamp(),
                wrappedErrors=[
                    ErrorOccurrence.from_failed(
                        id=model_utils.generate_id(),
                        createdAt=model_utils.get_timestamp(),
                        error=e,
                    )
                ],
                errorInfo=location_if_error,
            ),
            state_update=StateUpdate()
            .set_fluid_unknown(pipette_id=pipette_id)
            .set_pipette_ready_to_aspirate(
                pipette_id=pipette_id, ready_to_aspirate=False
            ),
        )
    else:
        return SuccessData(
            public=BaseLiquidHandlingResult(
                volume=volume_dispensed,
            ),
            state_update=StateUpdate()
            .set_fluid_ejected(
                pipette_id=pipette_id,
                volume=volume_dispensed,
            )
            .set_pipette_ready_to_aspirate(
                pipette_id=pipette_id, ready_to_aspirate=ready
            ),
        )


async def dispense_in_place(
    pipette_id: str,
    volume: float,
    flow_rate: float,
    push_out: float | None,
    correction_volume: float,
    location_if_error: ErrorLocationInfo,
    pipetting: PipettingHandler,
    model_utils: ModelUtils,
) -> SuccessData[BaseLiquidHandlingResult] | DefinedErrorData[OverpressureError]:
    """Dispense-in-place as a micro-operation."""
    # The current volume won't be none since it passed validation
    current_volume = (
        pipetting.get_state_view().pipettes.get_aspirated_volume(pipette_id) or 0.0
    )
    is_full_dispense = bool(numpy.isclose(current_volume - volume, 0))
    ready: bool = push_out == 0 if push_out is not None else not is_full_dispense
    try:
        volume = await pipetting.dispense_in_place(
            pipette_id=pipette_id,
            volume=volume,
            flow_rate=flow_rate,
            push_out=push_out,
            is_full_dispense=is_full_dispense,
            correction_volume=correction_volume,
        )
    except PipetteOverpressureError as e:
        return DefinedErrorData(
            public=OverpressureError(
                id=model_utils.generate_id(),
                createdAt=model_utils.get_timestamp(),
                wrappedErrors=[
                    ErrorOccurrence.from_failed(
                        id=model_utils.generate_id(),
                        createdAt=model_utils.get_timestamp(),
                        error=e,
                    )
                ],
                errorInfo=location_if_error,
            ),
            state_update=StateUpdate()
            .set_fluid_unknown(pipette_id=pipette_id)
            .set_pipette_ready_to_aspirate(
                pipette_id=pipette_id, ready_to_aspirate=False
            ),
        )
    else:
        print(f"Volume {volume}")
        return SuccessData(
            public=BaseLiquidHandlingResult(volume=volume),
            state_update=StateUpdate()
            .set_fluid_ejected(pipette_id=pipette_id, volume=volume)
            .set_pipette_ready_to_aspirate(
                pipette_id=pipette_id, ready_to_aspirate=ready
            ),
        )


async def blow_out_in_place(
    pipette_id: str,
    flow_rate: float,
    location_if_error: ErrorLocationInfo,
    pipetting: PipettingHandler,
    model_utils: ModelUtils,
) -> SuccessData[EmptyResult] | DefinedErrorData[OverpressureError]:
    """Execute a blow-out-in-place micro-operation."""
    try:
        await pipetting.blow_out_in_place(pipette_id=pipette_id, flow_rate=flow_rate)
    except PipetteOverpressureError as e:
        return DefinedErrorData(
            public=OverpressureError(
                id=model_utils.generate_id(),
                createdAt=model_utils.get_timestamp(),
                wrappedErrors=[
                    ErrorOccurrence.from_failed(
                        id=model_utils.generate_id(),
                        createdAt=model_utils.get_timestamp(),
                        error=e,
                    )
                ],
                errorInfo=location_if_error,
            ),
            state_update=StateUpdate().set_fluid_unknown(pipette_id=pipette_id),
        )
    else:
        return SuccessData(
            public=EmptyResult(),
            state_update=StateUpdate().set_fluid_empty(pipette_id=pipette_id),
        )
