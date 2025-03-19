from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class SessionCreateParams(BaseModel):
    """
    The parameters required to start the following types of sessions;
    1. Tip Length Calibration
    2. Pipette Offset Calibration
    3. Tip Length Calibration + Pipette Offset Calibration
    """

    mount: str = Field(
        ..., description="The mount on which the pipette is attached, left or right"
    )
    hasCalibrationBlock: bool = Field(
        False,
        description="Whether to use a calibration block in the"
        "instance of TLC + pipette offset flow. If no tip length "
        "is performed, this is ignored, but it should always be "
        "specified.",
    )
    # todo(mm, 2025-02-13): This should restrict input to labware schema 2 to protect
    # robot_server.robot.calibration legacy internals.
    # https://opentrons.atlassian.net/browse/EXEC-1230
    tipRackDefinition: Optional[Dict[str, Any]] = Field(
        None,
        description="The full labware definition of the tip rack to "
        "calibrate. If not specified, then a default will be "
        "used - either the same tiprack as in the current "
        "calibration, or, if there is no calibration, the "
        "default Opentrons tiprack for this pipette.",
    )
    shouldRecalibrateTipLength: bool = Field(
        True,
        description="whether to perform TLC with the loaded tip rack, "
        "prior to recalibrating the pipette offset. If the "
        "tiprack used (either the one specified by "
        "tipRackDefinition or the default if not specified) "
        "does not have a tip length calibration, this will be "
        "forced to be true.",
    )
