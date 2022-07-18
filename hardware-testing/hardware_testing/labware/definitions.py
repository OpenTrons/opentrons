"""Labware definitions."""
import json
from pathlib import Path

from opentrons_shared_data.labware.dev_types import LabwareDefinition

# the custom labware file for the pipette-calibration glass-vial
# NOTE: if running through the App, this custom labware definition
#       must have already been saved to that App installation
SCALE_JSON_FILENAME = "radwag_pipette_calibration_vial.json"


def load_radwag_vial_definition(directory: Path) -> LabwareDefinition:
    """Load Radwag Vial labware definition."""
    # load custom labware definition from this file's directory
    with open(directory / SCALE_JSON_FILENAME) as f:
        # NOTE: b/c we are using the run() both inside and outside the App
        #       this means we must support loading our custom labware in
        #       both scenarios. So, because here we are outside the App,
        #       we must load the labware definition from disk
        radwag_vial_def = json.load(f)
    return radwag_vial_def
