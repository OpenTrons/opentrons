"""Protocol Engine types dealing with command annotations."""

from typing import List, Literal, Dict, Any, Optional, Union
from pydantic import (
    ConfigDict,
    BaseModel,
    Field,
)


class BaseCommandAnnotation(BaseModel):
    """Optional annotations for protocol engine commands."""

    commandKeys: List[str] = Field(
        ..., description="Command keys to which this annotation applies"
    )
    annotationType: str = Field(
        ..., description="The type of annotation (for machine parsing)"
    )


class SecondOrderCommandAnnotation(BaseCommandAnnotation):
    """Annotates a group of atomic commands which were the direct result of a second order command.

    Examples of second order commands would be transfer, consolidate, mix, etc.
    """

    annotationType: Literal["secondOrderCommand"] = "secondOrderCommand"
    params: Dict[str, Any] = Field(
        ...,
        description="Key value pairs of the parameters passed to the second order command that this annotates.",
    )
    machineReadableName: str = Field(
        ...,
        description="The name of the second order command in the form that the generating software refers to it",
    )
    userSpecifiedName: Optional[str] = Field(
        None, description="The optional user-specified name of the second order command"
    )
    userSpecifiedDescription: Optional[str] = Field(
        None,
        description="The optional user-specified description of the second order command",
    )


class CustomCommandAnnotation(BaseCommandAnnotation):
    """Annotates a group of atomic commands in some manner that Opentrons software does not anticipate or originate."""

    annotationType: Literal["custom"] = "custom"
    model_config = ConfigDict(extra="allow")


CommandAnnotation = Union[SecondOrderCommandAnnotation, CustomCommandAnnotation]
