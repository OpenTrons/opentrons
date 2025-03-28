#!/usr/bin/env python3

"""Protocol Engine types that have to do with runtime parameters."""

from pathlib import Path
from typing import Optional, Mapping, Union, Literal, Dict, List
from pydantic import (
    BaseModel,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
)


# TODO (spp, 2024-04-02): move all RTP types to runner
class RTPBase(BaseModel):
    """Parameters defined in a protocol."""

    displayName: StrictStr = Field(..., description="Display string for the parameter.")
    variableName: StrictStr = Field(
        ..., description="Python variable name of the parameter."
    )
    description: Optional[StrictStr] = Field(
        None, description="Detailed description of the parameter."
    )
    suffix: Optional[StrictStr] = Field(
        None,
        description="Units (like mL, mm/sec, etc) or a custom suffix for the parameter.",
    )


class NumberParameter(RTPBase):
    """An integer parameter defined in a protocol."""

    type: Literal["int", "float"] = Field(
        ..., description="String specifying whether the number is an int or float type."
    )
    min: Union[StrictInt, StrictFloat] = Field(
        ..., description="Minimum value that the number param is allowed to have."
    )
    max: Union[StrictInt, StrictFloat] = Field(
        ..., description="Maximum value that the number param is allowed to have."
    )
    value: Union[StrictInt, StrictFloat] = Field(
        ...,
        description="The value assigned to the parameter; if not supplied by the client, will be assigned the default value.",
    )
    default: Union[StrictInt, StrictFloat] = Field(
        ...,
        description="Default value of the parameter, to be used when there is no client-specified value.",
    )


class BooleanParameter(RTPBase):
    """A boolean parameter defined in a protocol."""

    type: Literal["bool"] = Field(
        default="bool", description="String specifying the type of this parameter"
    )
    value: StrictBool = Field(
        ...,
        description="The value assigned to the parameter; if not supplied by the client, will be assigned the default value.",
    )
    default: StrictBool = Field(
        ...,
        description="Default value of the parameter, to be used when there is no client-specified value.",
    )


class EnumChoice(BaseModel):
    """Components of choices used in RTP Enum Parameters."""

    displayName: StrictStr = Field(
        ..., description="Display string for the param's choice."
    )
    value: Union[StrictInt, StrictFloat, StrictStr] = Field(
        ..., description="Enum value of the param's choice."
    )


class EnumParameter(RTPBase):
    """A string enum defined in a protocol."""

    type: Literal["int", "float", "str"] = Field(
        ...,
        description="String specifying whether the parameter is an int or float or string type.",
    )
    choices: List[EnumChoice] = Field(
        ..., description="List of valid choices for this parameter."
    )
    value: Union[StrictInt, StrictFloat, StrictStr] = Field(
        ...,
        description="The value assigned to the parameter; if not supplied by the client, will be assigned the default value.",
    )
    default: Union[StrictInt, StrictFloat, StrictStr] = Field(
        ...,
        description="Default value of the parameter, to be used when there is no client-specified value.",
    )


class FileInfo(BaseModel):
    """A file UUID descriptor."""

    id: str = Field(
        ...,
        description="The UUID identifier of the file stored on the robot.",
    )
    name: str = Field(..., description="Name of the file, including the extension.")


class CSVParameter(RTPBase):
    """A CSV file parameter defined in a protocol."""

    type: Literal["csv_file"] = Field(
        default="csv_file", description="String specifying the type of this parameter"
    )
    file: Optional[FileInfo] = Field(
        default=None,
        description="ID of the CSV file stored on the robot; to be used for fetching the CSV file."
        " For local analysis this will most likely be empty.",
    )


RunTimeParameter = Union[NumberParameter, EnumParameter, BooleanParameter, CSVParameter]

PrimitiveRunTimeParamValuesType = Mapping[
    StrictStr, Union[StrictInt, StrictFloat, StrictBool, StrictStr]
]  # update value types as more RTP types are added

CSVRunTimeParamFilesType = Mapping[StrictStr, StrictStr]
CSVRuntimeParamPaths = Dict[str, Path]
