"""Protocol engine types to do with partial tip configurations."""

from typing import Literal, Union

from pydantic import (
    BaseModel,
    Field,
)

NOZZLE_NAME_REGEX = r"[A-Z]\d{1,2}"
PRIMARY_NOZZLE_LITERAL = Literal["A1", "H1", "A12", "H12"]


class AllNozzleLayoutConfiguration(BaseModel):
    """All basemodel to represent a reset to the nozzle configuration. Sending no parameters resets to default."""

    style: Literal["ALL"] = "ALL"


class SingleNozzleLayoutConfiguration(BaseModel):
    """Minimum information required for a new nozzle configuration."""

    style: Literal["SINGLE"] = "SINGLE"
    primaryNozzle: PRIMARY_NOZZLE_LITERAL = Field(
        ...,
        description="The primary nozzle to use in the layout configuration. This nozzle will update the critical point of the current pipette. For now, this is also the back left corner of your rectangle.",
    )


class RowNozzleLayoutConfiguration(BaseModel):
    """Minimum information required for a new nozzle configuration."""

    style: Literal["ROW"] = "ROW"
    primaryNozzle: PRIMARY_NOZZLE_LITERAL = Field(
        ...,
        description="The primary nozzle to use in the layout configuration. This nozzle will update the critical point of the current pipette. For now, this is also the back left corner of your rectangle.",
    )


class ColumnNozzleLayoutConfiguration(BaseModel):
    """Information required for nozzle configurations of type ROW and COLUMN."""

    style: Literal["COLUMN"] = "COLUMN"
    primaryNozzle: PRIMARY_NOZZLE_LITERAL = Field(
        ...,
        description="The primary nozzle to use in the layout configuration. This nozzle will update the critical point of the current pipette. For now, this is also the back left corner of your rectangle.",
    )


class QuadrantNozzleLayoutConfiguration(BaseModel):
    """Information required for nozzle configurations of type QUADRANT."""

    style: Literal["QUADRANT"] = "QUADRANT"
    primaryNozzle: PRIMARY_NOZZLE_LITERAL = Field(
        ...,
        description="The primary nozzle to use in the layout configuration. This nozzle will update the critical point of the current pipette. For now, this is also the back left corner of your rectangle.",
    )
    frontRightNozzle: str = Field(
        ...,
        pattern=NOZZLE_NAME_REGEX,
        description="The front right nozzle in your configuration.",
    )
    backLeftNozzle: str = Field(
        ...,
        pattern=NOZZLE_NAME_REGEX,
        description="The back left nozzle in your configuration.",
    )


NozzleLayoutConfigurationType = Union[
    AllNozzleLayoutConfiguration,
    SingleNozzleLayoutConfiguration,
    ColumnNozzleLayoutConfiguration,
    RowNozzleLayoutConfiguration,
    QuadrantNozzleLayoutConfiguration,
]
