// @flow

import head from 'lodash/head'
import round from 'lodash/round'
import type { Labware, Slot, SessionModule } from '../../robot/types'
import type { LabwareCalibrationModel, LabwareCalibration } from '../types'
import type { LabwareCalibrationData, BaseProtocolLabware } from './types'

const normalizeParent = parent =>
  // internal protocol labware model uses null for no parent
  // API calibration model uses empty string for no parent
  // normalize to null to do the comparison
  parent === '' || parent === null ? null : parent

export const matchesLabwareIdentity = (
  target: LabwareCalibration | BaseProtocolLabware,
  compare: LabwareCalibration | BaseProtocolLabware
): boolean => {
  return (
    target.loadName === compare.loadName &&
    target.namespace === compare.namespace &&
    target.version === compare.version &&
    normalizeParent(target.parent) === normalizeParent(compare.parent)
  )
}

export function formatCalibrationData(
  model: LabwareCalibrationModel
): LabwareCalibrationData {
  const calVector = model.attributes.calibrationData.offset.value.map(n =>
    round(n, 1)
  )
  return { x: calVector[0], y: calVector[1], z: calVector[2] }
}

export function getCalibrationDataForLabware(
  calibrations: Array<LabwareCalibrationModel>,
  targetLabware: Labware,
  modulesBySlot: { [Slot]: SessionModule } = {}
): LabwareCalibrationData | null {
  return (
    head(
      calibrations
        .filter((compareCalbration: LabwareCalibrationModel) => {
          return matchesLabwareIdentity(
            compareCalbration.attributes,
            makeBaseProtocolLabware(targetLabware, modulesBySlot)
          )
        })
        .map(formatCalibrationData)
    ) ?? null
  )
}
