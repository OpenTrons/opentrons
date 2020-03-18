from typing import Dict, Optional
from pydantic import BaseModel, Field, UUID4

from opentrons.hardware_control.types import Axis


def convert_uuid(obj: UUID4):
    return obj.hex


class AttachedPipette(BaseModel):
    """Pipette (if any) attached to the mount"""
    model: Optional[str] =\
        Field(None,
              description="The model of the attached pipette. These are snake "
                          "case as in the Protocol API. This includes the full"
                          " version string")
    name: Optional[str] =\
        Field(None, description="")
    tip_length: Optional[float] =\
        Field(None, description="")
    mount_axis: Optional[Axis] =\
        Field(None, description="")
    plunger_axis: Optional[Axis] =\
        Field(None, description="")
    pipette_id: Optional[str] =\
        Field(None, description="")

    class Config:
        json_encoders = {Axis: str}


class Instruments(BaseModel):
    """
    A Dictionary of Attached Pipettes. Note that although the key should be
    a UUID type, we have to set it to a string and convert the UUID to a hex
    string at serialization time.
    """
    Dict[str, AttachedPipette]

    class Config:
        schema_extra = {
            "examples": [
                {
                    "fakeUUID4": {
                        "model": "p300_single_v1.5",
                        "name": "p300_single",
                        "tip_length": 51.7,
                        "mount_axis": "z",
                        "plunger_axis": "b",
                        "id": "P3HS12123041"
                    },
                    "fakeUUID2": {
                        "model": None,
                        "name": None,
                        "tip_length": None,
                        "mount_axis": "a",
                        "plunger_axis": "c",
                        "id": None
                    }
                }
            ]
        }


class CalibrationSessionStatus(BaseModel):
    """
    The current status of a given session.
    """
    instruments: Instruments
    activeInstrument: Optional[UUID4] =\
        Field(None, description="The active instrument")
    currentStep: str = Field(..., description="Current step of session")
    nextSteps: Dict[str, Dict[str, str]] =\
        Field(..., description="Next Available Step in Session")
    sessionToken: UUID4 = Field(..., description="Session token")

    class Config:
        json_encoders = {UUID4: convert_uuid}
        schema_extra = {
            "examples": [
                {
                    "instruments": {
                        "fakeUUID4": {
                            "model": "p300_single_v1.5",
                            "name": "p300_single",
                            "tip_length": 51.7,
                            "mount_axis": "z",
                            "plunger_axis": "b",
                            "id": "P3HS12123041"
                        },
                        "fakeUUID2": {
                            "model": None,
                            "name": None,
                            "tip_length": None,
                            "mount_axis": "a",
                            "plunger_axis": "c",
                            "id": None
                        }
                    },
                    "activeInstrument": "FakeUUIDHex",
                    "currentStep": "sessionStart",
                    "nextSteps": {
                        "links": {
                            "specifyLabware": ""
                        }
                    },
                    "sessionToken": "FakeUUIDHex"

                }
            ]
        }
