import os
import json
import typing
from pathlib import Path
from pydantic import ValidationError
from dataclasses import asdict

from opentrons import config

from .. import file_operators as io, helpers, types as local_types

from opentrons.protocols.api_support.constants import OPENTRONS_NAMESPACE
from opentrons.util.helpers import utc_now


from .models import v1

if typing.TYPE_CHECKING:
    from opentrons_shared_data.labware.dev_types import LabwareDefinition


TipLengthCalibrations = typing.Dict[
    local_types.PipetteId, typing.Dict[local_types.TiprackHash, v1.TipLengthModel]
]

# Tip Length Calibrations Look-Up


def _tip_length_calibrations() -> TipLengthCalibrations:
    tip_length_dir = config.get_tip_length_cal_path()
    tip_length_calibrations: TipLengthCalibrations = {}
    for file in os.scandir(tip_length_dir):
        if file.name == "index.json":
            continue
        if file.is_file() and ".json" in file.name:
            pipette_id = typing.cast(local_types.PipetteId, file.name.split(".json")[0])
            tip_length_calibrations[pipette_id] = {}
            all_tip_lengths_for_pipette = io.read_cal_file(Path(file.path))
            for tiprack, data in all_tip_lengths_for_pipette.items():
                try:
                    tip_length_calibrations[pipette_id][
                        typing.cast(local_types.TiprackHash, tiprack)
                    ] = v1.TipLengthModel(**data)
                except (json.JSONDecodeError, ValidationError):
                    pass
    return tip_length_calibrations


def _tip_lengths_for_pipette(
    pipette_id: local_types.PipetteId,
) -> typing.Dict[local_types.TiprackHash, v1.TipLengthModel]:
    try:
        return _tip_length_calibrations()[pipette_id]
    except KeyError:
        return {}


# Delete Tip Length Calibration


def delete_tip_length_calibration(
    tiprack: local_types.TiprackHash, pipette_id: local_types.PipetteId
) -> None:
    """
    Delete tip length calibration based on tiprack hash and
    pipette serial number

    :param tiprack: tiprack hash
    :param pipette: pipette serial number
    """
    tip_lengths_for_pipette = _tip_lengths_for_pipette(pipette_id)
    if tiprack in tip_lengths_for_pipette:
        # maybe make modify and delete same file?
        del tip_lengths_for_pipette[tiprack]
        tip_length_dir = Path(config.get_tip_length_cal_path())
        if tip_lengths_for_pipette:
            io.save_to_file(tip_length_dir, pipette_id, tip_lengths_for_pipette)
        else:
            io.delete_file(tip_length_dir / f"{pipette_id}.json")
    else:
        raise local_types.TipLengthCalNotFound(
            f"Tip length for hash {tiprack} has not been "
            f"calibrated for this pipette: {pipette_id} and cannot"
            "be loaded"
        )


def clear_tip_length_calibration() -> None:
    """
    Delete all tip length calibration files.
    """
    offset_dir = config.get_tip_length_cal_path()
    try:
        io._remove_json_files_in_directories(offset_dir)
    except FileNotFoundError:
        pass


# Save Tip Length Calibration


def create_tip_length_data(
    definition: "LabwareDefinition",
    length: float,
    cal_status: typing.Optional[
        typing.Union[local_types.CalibrationStatus, v1.CalibrationStatus]
    ] = None,
) -> typing.Dict[local_types.TiprackHash, v1.TipLengthModel]:
    """
    Function to correctly format tip length data.

    :param definition: full labware definition
    :param length: the tip length to save
    """
    labware_hash = helpers.hash_labware_def(definition)
    labware_uri = helpers.uri_from_definition(definition)

    if cal_status and isinstance(cal_status, local_types.CalibrationStatus):
        cal_status_model = v1.CalibrationStatus(**asdict(cal_status))
    elif cal_status and isinstance(cal_status, v1.CalibrationStatus):
        cal_status_model = cal_status
    else:
        cal_status_model = v1.CalibrationStatus()
    tip_length_data = v1.TipLengthModel(
        tipLength=length,
        lastModified=utc_now(),
        source=local_types.SourceType.user,
        status=cal_status_model,
        uri=labware_uri,
    )

    if not definition.get("namespace") == OPENTRONS_NAMESPACE:
        _save_custom_tiprack_definition(labware_uri, definition)

    data = {labware_hash: tip_length_data}
    return data


def _save_custom_tiprack_definition(
    labware_uri: str,
    definition: "LabwareDefinition",
) -> None:
    namespace, load_name, version = labware_uri.split("/")
    custom_tr_dir_path = config.get_custom_tiprack_def_path()
    custom_namespace_dir = custom_tr_dir_path / f"{namespace}/{load_name}"

    io.save_to_file(custom_namespace_dir, version, definition)


def save_tip_length_calibration(
    pip_id: local_types.PipetteId,
    tip_length_cal: typing.Dict[local_types.TiprackHash, v1.TipLengthModel],
) -> None:
    """
    Function used to save tip length calibration to file.

    :param pip_id: pipette id to associate with this tip length
    :param tip_length_cal: results of the data created using
           :meth:`create_tip_length_data`
    """
    tip_length_dir_path = Path(config.get_tip_length_cal_path())

    all_tip_lengths = _tip_lengths_for_pipette(pip_id)

    all_tip_lengths.update(tip_length_cal)

    # This is a workaround since pydantic doesn't have a nice way to
    # add encoders when converting to a dict.
    dict_of_tip_lengths = {}
    for key, item in all_tip_lengths.items():
        dict_of_tip_lengths[key] = json.loads(item.json())
    io.save_to_file(tip_length_dir_path, pip_id, dict_of_tip_lengths)


# Get Tip Length Calibration


def load_tip_length_calibration(
    pip_id: local_types.PipetteId, definition: "LabwareDefinition"
) -> v1.TipLengthModel:
    """
    Function used to grab the current tip length associated
    with a particular tiprack.

    :param pip_id: pipette you are using
    :param definition: full definition of the tiprack
    """
    labware_hash = helpers.hash_labware_def(definition)
    load_name = definition["parameters"]["loadName"]
    try:
        return _tip_length_calibrations()[pip_id][labware_hash]
    except KeyError:
        raise local_types.TipLengthCalNotFound(
            f"Tip length of {load_name} has not been "
            f"calibrated for this pipette: {pip_id} and cannot"
            "be loaded"
        )


def get_all_tip_length_calibrations() -> typing.List[v1.TipLengthCalibration]:
    """
    A helper function that will list all of the tip length calibrations.

    :return: A list of dictionary objects representing all of the
    tip length calibration files found on the robot.
    """
    all_tip_lengths_available = []
    for pipette, tiprack_hashs in _tip_length_calibrations().items():
        for tiprack_hash, tip_length in tiprack_hashs.items():
            all_tip_lengths_available.append(
                v1.TipLengthCalibration(
                    pipette=pipette,
                    tiprack=tiprack_hash,
                    tipLength=tip_length.tipLength,
                    lastModified=tip_length.lastModified,
                    source=tip_length.source,
                    status=tip_length.status,
                    uri=tip_length.uri,
                )
            )
    return all_tip_lengths_available


def get_custom_tiprack_definition_for_tlc(labware_uri: str) -> "LabwareDefinition":
    """
    Return the custom tiprack definition saved in the custom tiprack directory
    during tip length calibration
    """
    custom_tiprack_dir = config.get_custom_tiprack_def_path()
    custom_tiprack_path = custom_tiprack_dir / f"{labware_uri}.json"
    try:
        with open(custom_tiprack_path, "rb") as f:
            return typing.cast(
                "LabwareDefinition",
                json.loads(f.read().decode("utf-8")),
            )
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Custom tiprack {labware_uri} not found in the custom tiprack"
            "directory on the robot. Please recalibrate tip length and "
            "pipette offset with this tiprack before performing calibration "
            "health check."
        )
