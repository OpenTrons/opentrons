"""Protocol engine types to do with liquid classes."""
from typing import Any
from pydantic import Field

from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    ByTipTypeSetting,
)


class LiquidClassRecord(ByTipTypeSetting, frozen=True):
    """LiquidClassRecord is our internal representation of an (immutable) liquid class.

    Conceptually, a liquid class record is the tuple (name, pipette, tip, transfer properties).
    We consider two liquid classes to be the same if every entry in that tuple is the same; and liquid
    classes are different if any entry in the tuple is different.

    This class defines the tuple via inheritance so that we can reuse the definitions from shared_data.
    """

    liquidClassName: str = Field(
        ...,
        description="Identifier for the liquid of this liquid class, e.g. glycerol50.",
    )
    pipetteModel: str = Field(
        ...,
        description="Identifier for the pipette of this liquid class.",
    )
    # The other fields like tiprack ID, aspirate properties, etc. are pulled in from ByTipTypeSetting.

    def __hash__(self) -> int:
        """Hash function for LiquidClassRecord."""
        # Within the Protocol Engine, LiquidClassRecords are immutable, and we'd like to be able to
        # look up LiquidClassRecords by value, which involves hashing. However, Pydantic does not
        # generate a usable hash function if any of the subfields (like Coordinate) are not frozen.
        # So we have to implement the hash function ourselves.
        # Our strategy is to recursively convert this object into a list of (key, value) tuples.
        def dict_to_tuple(d: dict[str, Any]) -> tuple[tuple[str, Any], ...]:
            return tuple(
                (
                    field_name,
                    dict_to_tuple(value)
                    if isinstance(value, dict)
                    else tuple(value)
                    if isinstance(value, list)
                    else value,
                )
                for field_name, value in d.items()
            )

        return hash(dict_to_tuple(self.model_dump()))


class LiquidClassRecordWithId(LiquidClassRecord, frozen=True):
    """A LiquidClassRecord with its ID, for use in summary lists."""

    liquidClassId: str = Field(
        ...,
        description="Unique identifier for this liquid class.",
    )
