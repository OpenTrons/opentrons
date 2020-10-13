"""Pipetting command models."""

from pydantic import BaseModel, Field


class BasePipettingRequest(BaseModel):
    pipetteId: str = Field(
        ...,
        description="Identifier of pipette to use for liquid handling."
    )
    labwareId: str = Field(..., description="Identifier of labware to use.")
    wellId: str = Field(..., description="Identifier of well to use.")


class BaseLiquidHandlingRequest(BasePipettingRequest):
    volume: float = Field(
        ...,
        description="Amount of liquid in uL. Must be greater than 0 and less "
                    "than a pipette-specific maximum volume.",
        gt=0,
    )
    # TODO(mc, 2020-10-08): allow a vector
    offsetFromBottom: float = Field(
        ...,
        description="Offset from the bottom of the well in mm",
        gt=0,
    )
    flowRate: float = Field(
        ...,
        description="The absolute flow rate in uL/second. Must be greater "
                    "than 0 and less than a pipette-specific maximum flow "
                    "rate.",
        gt=0
    )


class MoveToWellRequest(BasePipettingRequest):
    pass


class PickUpTipRequest(BasePipettingRequest):
    pass


class DropTipRequest(BasePipettingRequest):
    pass


class AspirateRequest(BaseLiquidHandlingRequest):
    pass


class DispenseRequest(BaseLiquidHandlingRequest):
    pass
