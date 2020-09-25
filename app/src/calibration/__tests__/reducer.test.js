// @flow

import * as Fixtures from '../__fixtures__'
import * as LabwareFixtures from '../labware/__fixtures__'
import * as Labware from '../labware'
import * as PipetteOffset from '../pipette-offset'
import * as PipetteOffsetFixtures from '../pipette-offset/__fixtures__'
import * as Actions from '../actions'
import { calibrationReducer } from '../reducer'

describe('calibration reducer', () => {
  it('should handle a FETCH_CALIBRATION_STATUS_SUCCESS', () => {
    const action = Actions.fetchCalibrationStatusSuccess(
      'robot-name',
      Fixtures.mockCalibrationStatus,
      {}
    )

    expect(calibrationReducer({}, action)).toEqual({
      'robot-name': {
        calibrationStatus: Fixtures.mockCalibrationStatus,
        labwareCalibrations: null,
        pipetteOffsetCalibrations: null,
      },
    })
  })

  it('should handle a FETCH_LABWARE_CALIBRATIONS_SUCCESS', () => {
    const action = Labware.fetchLabwareCalibrationsSuccess(
      'robot-name',
      LabwareFixtures.mockAllLabwareCalibration,
      {}
    )

    expect(calibrationReducer({}, action)).toEqual({
      'robot-name': {
        calibrationStatus: null,
        labwareCalibrations: LabwareFixtures.mockAllLabwareCalibration,
        pipetteOffsetCalibrations: null,
      },
    })
  })

  it('should handle a FETCH_PIPETTE_OFFSET_CALIBRATIONS_SUCCESS', () => {
    const action = PipetteOffset.fetchPipetteOffsetCalibrationsSuccess(
      'robot-name',
      PipetteOffsetFixtures.mockAllPipetteOffsetsCalibration,
      {}
    )

    expect(calibrationReducer({}, action)).toEqual({
      'robot-name': {
        calibrationStatus: null,
        labwareCalibrations: null,
        pipetteOffsetCalibrations:
          PipetteOffsetFixtures.mockAllPipetteOffsetsCalibration,
      },
    })
  })
})
