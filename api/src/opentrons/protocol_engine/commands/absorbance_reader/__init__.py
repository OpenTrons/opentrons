"""Command models for Absorbance Reader commands."""
from typing import Union
from .close_lid import (
    CloseLidCommandType,
    CloseLidParams,
    CloseLidResult,
    CloseLid,
    CloseLidCreate,
)

from .open_lid import (
    OpenLidCommandType,
    OpenLidParams,
    OpenLidResult,
    OpenLid,
    OpenLidCreate,
)

from .initialize import (
    InitializeCommandType,
    InitializeParams,
    InitializeResult,
    Initialize,
    InitializeCreate,
)

from .measure import (
    MeasureAbsorbanceCommandType,
    MeasureAbsorbanceParams,
    MeasureAbsorbanceResult,
    MeasureAbsorbance,
    MeasureAbsorbanceCreate,
)

MoveLidResult = Union[CloseLidResult, OpenLidResult]

__all__ = [
    # absorbanace_reader/closeLid
    "CloseLidCommandType",
    "CloseLidParams",
    "CloseLidResult",
    "CloseLid",
    "CloseLidCreate",
    # absorbanace_reader/openLid
    "OpenLidCommandType",
    "OpenLidParams",
    "OpenLidResult",
    "OpenLid",
    "OpenLidCreate",
    # absorbanace_reader/initialize
    "InitializeCommandType",
    "InitializeParams",
    "InitializeResult",
    "Initialize",
    "InitializeCreate",
    # absorbanace_reader/measure
    "MeasureAbsorbanceCommandType",
    "MeasureAbsorbanceParams",
    "MeasureAbsorbanceResult",
    "MeasureAbsorbance",
    "MeasureAbsorbanceCreate",
    # union type
    "MoveLidResult",
]
