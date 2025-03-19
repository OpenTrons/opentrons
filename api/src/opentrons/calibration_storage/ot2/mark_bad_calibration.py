import typing

from opentrons.util.helpers import utc_now

from .. import types as local_types

from .models import v1


CalibrationType = typing.TypeVar(
    "CalibrationType",
    v1.PipetteOffsetCalibration,
    v1.InstrumentOffsetModel,
    v1.TipLengthCalibration,
    v1.TipLengthModel,
    v1.DeckCalibrationModel,
)


def mark_bad(
    calibration: CalibrationType,
    source_marked_bad: local_types.SourceType,
) -> CalibrationType:
    calibration.status = v1.CalibrationStatus(
        markedBad=True, source=source_marked_bad, markedAt=utc_now()
    )
    return calibration
