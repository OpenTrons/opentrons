import typing
from typing_extensions import Self

from opentrons.types import Mount
from enum import Enum
from dataclasses import dataclass, fields
from pydantic import BaseModel, Field

from opentrons_shared_data.labware.types import LabwareDefinition2
from opentrons.protocol_api import labware
from opentrons.types import DeckLocation


class RobotHealthCheck(Enum):
    IN_THRESHOLD = "IN_THRESHOLD"
    OUTSIDE_THRESHOLD = "OUTSIDE_THRESHOLD"

    def __str__(self) -> str:
        return self.name

    @classmethod
    def status_from_string(cls, status: str) -> "RobotHealthCheck":
        if status == "IN_THRESHOLD":
            return cls.IN_THRESHOLD
        else:
            return cls.OUTSIDE_THRESHOLD


class PipetteRank(str, Enum):
    """The rank in the order of pipettes to use within flow"""

    first = "first"
    second = "second"

    def __str__(self) -> str:
        return self.name

    # todo(mm, 2025-02-14): PipetteRank ordering relies on the fact that the
    # string "first" comes alphabetically before the string "second"? D:

    def __ge__(self, other: object) -> bool:
        if isinstance(other, PipetteRank):
            return self.value >= other.value
        return NotImplemented

    def __gt__(self, other: object) -> bool:
        if isinstance(other, PipetteRank):
            return self.value > other.value
        return NotImplemented

    def __le__(self, other: object) -> bool:
        if isinstance(other, PipetteRank):
            return self.value <= other.value
        return NotImplemented

    def __lt__(self, other: object) -> bool:
        if isinstance(other, PipetteRank):
            return self.value < other.value
        return NotImplemented


@dataclass
class PipetteInfo:
    rank: PipetteRank
    mount: Mount
    max_volume: int
    channels: int
    tip_rack: labware.Labware
    default_tipracks: typing.List[LabwareDefinition2]


@dataclass
class SupportedCommands:
    """
    A class that allows you to set currently supported
    commands depending on the current state.
    """

    loadLabware: bool = False

    def __init__(self, namespace: str) -> None:
        self._namespace = namespace

    def supported(self) -> list[str]:
        commands: list[str] = []
        for field in fields(self):
            result = getattr(self, field.name)
            if result:
                commands.append(f"{self._namespace}.{field.name}")
        return commands


# TODO: BC: the mount field here is typed as a string
# because of serialization problems, though they are actually
# backed by enums. This shouldn't be the case, and we should
# be able to handle the de/serialization of these fields from
# the middle ware before they are returned to the client
class AttachedPipette(BaseModel):
    """Pipette (if any) attached to the mount"""

    model: typing.Optional[str] = Field(
        None,
        description="The model of the attached pipette. These are snake "
        "case as in the Protocol API. This includes the full"
        " version string",
    )
    name: typing.Optional[str] = Field(
        None, description="Short name of pipette model without" "generation version"
    )
    tipLength: typing.Optional[float] = Field(
        None, description="The default tip length for this pipette"
    )
    mount: typing.Optional[str] = Field(
        None, description="The mount this pipette attached to"
    )
    serial: typing.Optional[str] = Field(
        None, description="The serial number of the attached pipette"
    )
    defaultTipracks: typing.Optional[
        typing.Sequence[typing.Mapping[str, typing.Any]]
    ] = Field(None, description="A list of default tipracks for this pipette")


class RequiredLabware(BaseModel):
    """
    A model that describes a single labware required for performing a
    calibration action.
    """

    slot: DeckLocation
    loadName: str
    namespace: str
    version: str
    isTiprack: bool
    # todo(mm, 2025-02-13): This should restrict input to labware schema 2 to protect
    # robot_server.robot.calibration legacy internals.
    # https://opentrons.atlassian.net/browse/EXEC-1230
    definition: typing.Dict[str, typing.Any]

    @classmethod
    def from_lw(
        cls, lw: labware.Labware, slot: typing.Optional[DeckLocation] = None
    ) -> Self:
        if not slot:
            # TODO(mc, 2021-09-08): lw.parent is not necessarily a slot
            slot = lw.parent  # type: ignore[assignment]
        lw_def = lw._core.get_definition()
        return cls(
            # TODO(mc, 2020-09-17): DeckLocation does not match
            #  Union[int,str,None] expected by cls
            slot=slot,  # type: ignore[arg-type]
            loadName=lw.load_name,
            namespace=lw_def["namespace"],
            version=str(lw_def["version"]),
            isTiprack=lw.is_tiprack,
            definition=typing.cast(typing.Dict[str, typing.Any], lw_def),
        )


class NextStepLink(BaseModel):
    url: str
    params: typing.Dict[str, typing.Any]


class NextSteps(BaseModel):
    links: typing.Dict[str, NextStepLink]
