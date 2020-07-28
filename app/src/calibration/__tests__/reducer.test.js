// @flow

import * as Fixtures from '../__fixtures__'
import * as LabwareFixtures from '../labware/__fixtures__'
import * as Labware from '../labware'
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
      },
    })
  })

  it('should handle a FETCH_LABWARE_CALIBRATIONS_SUCCESS', () => {
    const action = Labware.fetchLabwareCalibrationsSuccess(
      'robot-name',
      LabwareFixtures.mockAllLabwareCalibraton,
      {}
    )

    expect(calibrationReducer({}, action)).toEqual({
      'robot-name': {
        calibrationStatus: null,
        labwareCalibrations: LabwareFixtures.mockAllLabwareCalibraton,
      },
    })
  })
})
