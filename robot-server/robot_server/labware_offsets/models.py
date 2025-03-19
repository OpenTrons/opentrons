"""Request/response models for the `/labwareOffsets` endpoints."""

from datetime import datetime
import enum
from textwrap import dedent
from typing import Literal, Annotated, Final, TypeAlias, Sequence

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.protocol_engine import (
    LabwareOffsetVector,
)
from opentrons.protocol_engine.types.labware_offset_location import (
    LabwareOffsetLocationSequenceComponentsUnion,
)

from robot_server.errors.error_responses import ErrorDetails


class _DoNotFilter(enum.Enum):
    DO_NOT_FILTER = enum.auto()


DO_NOT_FILTER: Final = _DoNotFilter.DO_NOT_FILTER
"""A sentinel value for when a filter should not be applied.

We use this instead of `None` to avoid confusion when it looks like `None` might have
some other meaning, like "filter for entries that are equal to the value `None`".
"""


DoNotFilterType: TypeAlias = Literal[_DoNotFilter.DO_NOT_FILTER]
"""The type of `DO_NOT_FILTER`, as `NoneType` is to `None`.

Unfortunately, mypy doesn't let us write `Literal[DO_NOT_FILTER]`. Use this instead.
"""


ANY_LOCATION: Final = "anyLocation"


AnyLocation: TypeAlias = Literal["anyLocation"]


class UnknownLabwareOffsetLocationSequenceComponent(BaseModel):
    """A labware offset location sequence component from the future."""

    kind: Literal["unknown"] = "unknown"
    storedKind: str
    primaryValue: str


# This is redefined here so we can add stuff to it easily
StoredLabwareOffsetLocationSequenceComponents = Annotated[
    LabwareOffsetLocationSequenceComponentsUnion, Field(discriminator="kind")
]


ReturnedLabwareOffsetLocationSequenceComponents = Annotated[
    LabwareOffsetLocationSequenceComponentsUnion
    | UnknownLabwareOffsetLocationSequenceComponent,
    Field(discriminator="kind"),
]


class StoredLabwareOffsetCreate(BaseModel):
    """Create an offset for storage."""

    definitionUri: str = Field(..., description="The URI for the labware's definition.")

    locationSequence: Sequence[
        StoredLabwareOffsetLocationSequenceComponents
    ] | AnyLocation = Field(
        ...,
        description=(
            "Where the labware is located on the robot."
            " The special value `anyLocation` means this offset applies to any labware"
            " with a matching `definitionUri`, regardless of its location."
        ),
        min_length=1,
    )
    vector: LabwareOffsetVector = Field(
        ...,
        description="The offset applied to matching labware.",
    )


class StoredLabwareOffset(BaseModel):
    """An offset that the robot adds to a pipette's position when it moves to labware."""

    # This is a separate thing from the model defined in protocol engine because as a new API it does
    # not have to handle legacy locations. There is probably a better way to do this than to copy the model
    # contents, but I'm not sure what it is.
    id: str = Field(..., description="Unique labware offset record identifier.")
    createdAt: datetime = Field(..., description="When this labware offset was added.")

    definitionUri: str = Field(..., description="The URI for the labware's definition.")
    locationSequence: Sequence[
        ReturnedLabwareOffsetLocationSequenceComponents
    ] | AnyLocation = Field(
        ...,
        description=(
            "Where the labware is located on the robot."
            " The special value `anyLocation` means this offset applies to any labware"
            " with a matching `definitionUri`, regardless of its location."
        ),
        min_length=1,
    )

    vector: LabwareOffsetVector = Field(
        ...,
        description="The offset applied to matching labware.",
    )


class SearchFilter(BaseModel):  # noqa: D101 - more docs are in SearchCreate.
    id: Annotated[
        str | SkipJsonSchema[DoNotFilterType],
        Field(
            description=(
                "Return only results having this exact `id`. Omit to accept any `id`."
            )
        ),
    ] = DO_NOT_FILTER
    definitionUri: Annotated[
        str | SkipJsonSchema[DoNotFilterType],
        Field(
            description=(
                "Return only results having this exact `definitionUri`."
                " Omit to accept any `definitionUri`."
            )
        ),
    ] = DO_NOT_FILTER
    locationSequence: Annotated[
        Annotated[
            Sequence[StoredLabwareOffsetLocationSequenceComponents], Field(min_length=1)
        ]
        | AnyLocation
        | SkipJsonSchema[DoNotFilterType],
        Field(
            description=(
                "Return only results having this exact `locationSequence`."
                " Omit to accept any `locationSequence`."
            )
        ),
    ] = DO_NOT_FILTER

    mostRecentOnly: Annotated[
        bool,
        Field(
            description=(
                "If `true`, this filter returns only the most recently-added result"
                " of all that matched it. Otherwise, it returns all of them."
            )
        ),
    ] = False


class SearchCreate(BaseModel):
    """A search query for labware offsets."""

    filters: Annotated[
        list[SearchFilter],
        Field(
            description=dedent(
                """\
                A list of filters to search by.

                A result is returned if it passes any of these filters
                (in other words, these filters are OR'd together).
                If this list is empty, no results are returned.
                """
            )
        ),
    ]


class LabwareOffsetNotFound(ErrorDetails):
    """An error returned when a requested labware offset does not exist."""

    id: Literal["LabwareOffsetNotFound"] = "LabwareOffsetNotFound"
    title: str = "Labware Offset Not Found"

    @classmethod
    def build(cls, bad_offset_id: str) -> "LabwareOffsetNotFound":
        """Return an error with a standard message."""
        return cls.model_construct(detail=f'No offset found with ID "{bad_offset_id}".')
