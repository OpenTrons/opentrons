"""Sample event models."""
from pydantic import BaseModel
from typing_extensions import Literal


class SampleOneData(BaseModel):
    """Sample data field of SampleOne payload."""

    val1: int
    val2: str


class SampleOne(BaseModel):
    """An example of a payload with a type and data member."""

    type: Literal["SampleOne"] = "SampleOne"
    data: SampleOneData


class SampleTwo(BaseModel):
    """An example of a payload with type and other attributes."""

    type: Literal["SampleTwo"] = "SampleTwo"
    val1: int
    val2: str
