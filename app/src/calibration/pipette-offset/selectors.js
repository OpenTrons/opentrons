// @flow

import { head } from 'lodash'

import type { State } from '../../types'
import type { PipetteOffsetCalibration } from '../api-types'

export const getPipetteOffsetCalibrations: (
  state: State,
  robotName: string
) => Array<PipetteOffsetCalibration> = (state, robotName) => {
  const calibrations =
    state.calibration[robotName]?.pipetteOffsetCalibrations?.data || []
  return calibrations.map(calibration => calibration.attributes)
}

export const getCalibrationForPipette: (
  state: State,
  robotName: string,
  pipetteSerial: string
) => PipetteOffsetCalibration | null = (state, robotName, pipetteSerial) => {
  const allCalibrations = getPipetteOffsetCalibrations(state, robotName)
  return (
    head(allCalibrations.filter(cal => cal.pipette === pipetteSerial)) || null
  )
}
