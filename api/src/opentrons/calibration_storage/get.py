""" opentrons.calibration_storage.get: functions for grabing calibration

This module has functions that you can import to load robot or
labware calibration from its designated file location.
"""
import typing
from opentrons import config
from opentrons.types import Point, Mount

from . import (
    types as local_types,
    file_operators as io, helpers, migration, modify)
if typing.TYPE_CHECKING:
    from opentrons_shared_data.labware.dev_types import LabwareDefinition
    from .dev_types import (
        TipLengthCalibration, CalibrationIndexDict, CalibrationDict)


def _format_calibration_type(
        data: 'CalibrationDict') -> local_types.CalibrationTypes:
    offset = local_types.OffsetData(
        value=data['default']['offset'],
        last_modified=data['default']['lastModified']
    )
    # TODO(6/16): Tip calibration no longer exists in
    # the labware calibraiton file. We should
    # have a follow-up PR to grab tip lengths
    # based on the loaded pips + labware
    return local_types.CalibrationTypes(
            offset=offset,
            tip_length=local_types.TipLengthData())


def _format_parent(
        data: 'CalibrationIndexDict')\
            -> local_types.ParentOptions:
    # Since the slot is not saved and the data in the index is actually
    # the labware hash to aid lookup, we erase it here.
    options = local_types.ParentOptions(slot='')
    if data['module']:
        options.module = data['module']['parent']
    return options


def get_all_calibrations() -> typing.List[local_types.CalibrationInformation]:
    """
    A helper function that will list all of the given calibrations
    in a succinct way.

    :return: A list of dictionary objects representing all of the
    labware calibration files found on the robot.
    """
    all_calibrations: typing.List[local_types.CalibrationInformation] = []
    offset_path =\
        config.get_opentrons_path('labware_calibration_offsets_dir_v2')
    index_path = offset_path / 'index.json'
    if not index_path.exists():
        return all_calibrations

    migration.check_index_version(index_path)
    index_file = io.read_cal_file(str(index_path))
    calibration_index = index_file.get('data', {})
    for key, data in calibration_index.items():
        cal_path = offset_path / f'{key}.json'
        if cal_path.exists():
            cal_blob = io.read_cal_file(str(cal_path))
            calibration = _format_calibration_type(cal_blob)  # type: ignore
            all_calibrations.append(
                local_types.CalibrationInformation(
                    calibration=calibration,
                    parent=_format_parent(data),
                    labware_id=key,
                    uri=data['uri']))
    return all_calibrations


def _get_tip_length_data(
        pip_id: str, labware_hash: str, labware_load_name: str
) -> 'TipLengthCalibration':
    try:
        pip_tip_length_path = config.get_tip_length_cal_path()/f'{pip_id}.json'
        tip_length_data =\
            io.read_cal_file(str(pip_tip_length_path))
        return tip_length_data[labware_hash]
    except (FileNotFoundError, KeyError):
        raise local_types.TipLengthCalNotFound(
            f'Tip length of {labware_load_name} has not been '
            f'calibrated for this pipette: {pip_id} and cannot'
            'be loaded')


def get_labware_calibration(
        lookup_path: local_types.StrPath,
        definition: 'LabwareDefinition',
        parent: str = '',
        slot: str = '') -> Point:
    """
    Find the delta of a given labware, if it exists.

    :param lookup_path: short path to the labware calibration
    :return: A point which represents the delta from well A1 origin of
    a labware
    """
    offset_path =\
        config.get_opentrons_path('labware_calibration_offsets_dir_v2')
    offset = Point(0, 0, 0)
    labware_path = offset_path / lookup_path
    if labware_path.exists():
        modify.add_existing_labware_to_index_file(definition, parent, slot)
        migration.check_index_version(offset_path / 'index.json')
        calibration_data = io.read_cal_file(str(labware_path))
        offset_array = calibration_data['default']['offset']
        offset = Point(x=offset_array[0], y=offset_array[1], z=offset_array[2])
    return offset


def load_tip_length_calibration(
        pip_id: str,
        definition: 'LabwareDefinition',
        parent: str) -> 'TipLengthCalibration':
    """
    Function used to grab the current tip length associated
    with a particular tiprack.

    :param pip_id: pipette you are using
    :param definition: full definition of the tiprack
    :param parent: parent of the tiprack
    """
    # TODO(lc, 07-14-2020) since we're trying not to utilize
    # a labware object for these functions, the is tiprack
    # check should happen outside of this function.
    # assert labware._is_tiprack, \
    #     'cannot save tip length for non-tiprack labware'
    labware_hash = helpers.hash_labware_def(definition)
    load_name = definition['parameters']['loadName']
    return _get_tip_length_data(
        pip_id=pip_id,
        labware_hash=labware_hash + parent,
        labware_load_name=load_name)


def _get_calibration_source(data: typing.Dict) -> local_types.SourceType:
    if 'source' not in data.keys():
        return local_types.SourceType.unknown
    else:
        return local_types.SourceType[data['source']]


def _get_calibration_status(
        data: typing.Dict) -> local_types.CalibrationStatus:
    if 'status' not in data.keys():
        return local_types.CalibrationStatus()
    else:
        return local_types.CalibrationStatus(**data['status'])


def get_robot_deck_attitude() \
            -> typing.Optional[local_types.DeckCalibration]:
    robot_dir = config.get_opentrons_path('robot_calibration_dir')
    gantry_path = robot_dir / 'deck_calibration.json'
    if gantry_path.exists():
        data = io.read_cal_file(gantry_path)
        assert 'attitude' in data.keys(), 'Not valid deck calibration data'
        return local_types.DeckCalibration(
            attitude=data['attitude'],
            source=_get_calibration_source(data),
            pipette_calibrated_with=data['pipette_calibrated_with'],
            tiprack=data['tiprack'],
            last_modified=data['last_modified'],
            status=_get_calibration_status(data))
    else:
        return None


def get_pipette_offset(
        pip_id: str,
        mount: Mount
) -> typing.Optional[local_types.PipetteOffsetByPipetteMount]:
    pip_dir = config.get_opentrons_path('pipette_calibration_dir')
    offset_path = pip_dir / mount.name.lower() / f'{pip_id}.json'
    if offset_path.exists():
        data = io.read_cal_file(offset_path)
        assert 'offset' in data.keys(), 'Not valid pipette calibration data'
        return local_types.PipetteOffsetByPipetteMount(
            offset=data['offset'],
            source=_get_calibration_source(data),
            tiprack=data['tiprack'],
            uri=data['uri'],
            last_modified=data['last_modified'],
            status=_get_calibration_status(data))
    else:
        return None


def get_all_pipette_offset_calibrations() \
            -> typing.List[local_types.PipetteOffsetCalibration]:
    """
    A helper function that will list all of the pipette offset
    calibrations.

    :return: A list of dictionary objects representing all of the
    pipette offset calibration files found on the robot.
    """
    all_calibrations: typing.List[local_types.PipetteOffsetCalibration] = []
    pip_dir = config.get_opentrons_path('pipette_calibration_dir')
    index_path = pip_dir / 'index.json'
    if not index_path.exists():
        return all_calibrations

    index_file = io.read_cal_file(str(index_path))
    for mount_key, pips in index_file.items():
        for pip in pips:
            cal_path = pip_dir / mount_key / f'{pip}.json'
            if cal_path.exists():
                data = io.read_cal_file(str(cal_path))
                all_calibrations.append(
                    local_types.PipetteOffsetCalibration(
                        pipette=pip,
                        mount=mount_key,
                        offset=data['offset'],
                        tiprack=data['tiprack'],
                        uri=data['uri'],
                        last_modified=data['last_modified'],
                        source=_get_calibration_source(data),
                        status=_get_calibration_status(data)))
    return all_calibrations
