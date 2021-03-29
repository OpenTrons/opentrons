"""
This was initially generated by datamodel-codegen from the labware schema in
shared-data. It's been modified by hand to be more friendly.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Extra, Field
from typing_extensions import Literal

SAFE_STRING_REGEX = '^[a-z0-9._]+$'


class CornerOffsetFromSlot(BaseModel):
    """
    Distance from left-front-bottom corner of slot to left-front-bottom corner
     of labware bounding box. Used for labware that spans multiple slots. For
      labware that does not span multiple slots, x/y/z should all be zero.
    """

    x: float
    y: float
    z: float


class BrandData(BaseModel):
    brand: str = Field(..., description='Brand/manufacturer name')
    brandId: Optional[List[str]] = Field(
        None,
        description='An array of manufacture numbers pertaining to a given labware',
    )
    links: Optional[List[str]] = Field(
        None, description='URLs for manufacturer page(s)'
    )


class DisplayCategory(Enum):
    tipRack = 'tipRack'
    tubeRack = 'tubeRack'
    reservoir = 'reservoir'
    trash = 'trash'
    wellPlate = 'wellPlate'
    aluminumBlock = 'aluminumBlock'
    other = 'other'


class Metadata(BaseModel):
    """
    Properties used for search and display
    """

    displayName: str = Field(
        ...,
        description='Easy to remember name of labware')
    displayCategory: DisplayCategory = Field(
        ...,
        description='Label(s) used in UI to categorize labware'
    )
    displayVolumeUnits: Literal['µL', 'mL', 'L'] = Field(
        ...,
        description='Volume units for display'
    )
    tags: Optional[List[str]] = Field(
        None,
        description='List of descriptions for a given labware'
    )


class Parameters(BaseModel):
    """
    Internal describers used to determine pipette movement to labware
    """

    format: Literal[
        '96Standard', '384Standard', 'trough', 'irregular', 'trash'
    ] = Field(
        ...,
        description='Property to determine compatibility with multichannel pipette'
    )
    quirks: Optional[List[str]] = Field(
        None,
        description='Property to classify a specific behavior this labware '
                    'should have',
    )
    isTiprack: bool = Field(
        ...,
        description='Flag marking whether a labware is a tiprack or not'
    )
    tipLength: Optional[float] = Field(
        None,
        ge=0.0,
        description='Required if labware is tiprack, specifies length of tip'
                    ' from drawing or as measured with calipers',
    )
    tipOverlap: Optional[float] = Field(
        None,
        ge=0.0,
        description='Required if labware is tiprack, specifies the length of '
                    'the area of the tip that overlaps the nozzle of the pipette',
    )
    loadName: str = Field(
        ...,
        description='Name used to reference a labware definition',
        regex=SAFE_STRING_REGEX
    )
    isMagneticModuleCompatible: bool = Field(
        ...,
        description='Flag marking whether a labware is compatible by default '
                    'with the Magnetic Module',
    )
    magneticModuleEngageHeight: Optional[float] = Field(
        None,
        ge=0.0,
        description='Distance to move magnetic module magnets to engage'
    )


class Dimensions(BaseModel):
    """
    Outer dimensions of a labware
    """

    yDimension: float = Field(..., ge=0.0)
    zDimension: float = Field(..., ge=0.0)
    xDimension: float = Field(..., ge=0.0)


class Wells(BaseModel):
    class Config:
        extra = Extra.allow

    depth: float = Field(..., ge=0.0)
    x: float = Field(
        ...,
        ge=0.0,
        description='x location of center-bottom of well in reference to '
                    'left-front-bottom of labware',
    )
    y: float = Field(
        ...,
        ge=0.0,
        description='y location of center-bottom of well in reference to '
                    'left-front-bottom of labware',
    )
    z: float = Field(
        ...,
        ge=0.0,
        description='z location of center-bottom of well in reference to '
                    'left-front-bottom of labware',
    )
    totalLiquidVolume: float = Field(
        ...,
        ge=0.0,
        description='Total well, tube, or tip volume in microliters'
    )
    xDimension: Optional[float] = Field(
        None,
        ge=0.0,
        description='x dimension of rectangular wells'
    )
    yDimension: Optional[float] = Field(
        None,
        ge=0.0,
        description='y dimension of rectangular wells'
    )
    diameter: Optional[float] = Field(
        None,
        ge=0.0,
        description='diameter of circular wells'
    )
    shape: Literal['rectangular', 'circular'] = Field(
        ...,
        description="If 'rectangular', use xDimension and "
                    "yDimension; if 'circular' use diameter",
    )


class Metadata1(BaseModel):
    """
    Metadata specific to a grid of wells in a labware
    """

    displayName: Optional[str] = Field(
        None, description='User-readable name for the well group'
    )
    displayCategory: Optional[DisplayCategory] = Field(
        None, description='Label(s) used in UI to categorize well groups'
    )
    wellBottomShape: Optional[Literal['flat', 'u', 'v']] = Field(
        None, description='Bottom shape of the well for UI purposes'
    )


class Group(BaseModel):
    wells: List[str] = Field(
        ..., description='An array of wells that contain the same metadata',
        min_items=1
    )
    metadata: Metadata1 = Field(
        ..., description='Metadata specific to a grid of wells in a labware'
    )
    brand: Optional[BrandData] = Field(
        None, description='Brand data for the well group (e.g. for tubes)'
    )


class Model(BaseModel):
    schemaVersion: Literal[2] = Field(
        ..., description='Which schema version a labware is using'
    )
    version: int = Field(
        ...,
        description='Version of the labware definition itself '
                    '(eg myPlate v1/v2/v3). An incrementing integer',
        ge=1.0,
    )
    namespace: str = Field(..., regex=SAFE_STRING_REGEX)
    metadata: Metadata = Field(
        ..., description='Properties used for search and display'
    )
    brand: BrandData = Field(
        ...,
        description='Real-world labware that the definition is modeled '
                    'from and/or compatible with',
    )
    parameters: Parameters = Field(
        ...,
        description='Internal describers used to determine pipette movement '
                    'to labware',
    )
    ordering: List[List[str]] = Field(
        ...,
        description='Generated array that keeps track of how wells should be '
                    'ordered in a labware',
    )
    cornerOffsetFromSlot: CornerOffsetFromSlot = Field(
        ...,
        description='Distance from left-front-bottom corner of slot to '
                    'left-front-bottom corner of labware bounding box. Used for '
                    'labware that spans multiple slots. For labware that does '
                    'not span multiple slots, x/y/z should all be zero.',
    )
    dimensions: Dimensions = Field(
        ...,
        description='Outer dimensions of a labware'
    )
    wells: Dict[str, Wells] = Field(
        ...,
        description='Unordered object of well objects with position and '
                    'dimensional information',
    )
    groups: List[Group] = Field(
        ...,
        description='Logical well groupings for metadata/display purposes; '
                    'changes in groups do not affect protocol execution',
    )
