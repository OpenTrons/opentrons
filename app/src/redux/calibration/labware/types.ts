import type { ModuleModel } from '@opentrons/shared-data'
import type {
  RobotApiRequestMeta,
  RobotApiErrorResponse,
} from '../../robot-api/types'
import type { Labware } from '../../robot/types'

import {
  FETCH_LABWARE_CALIBRATIONS,
  FETCH_LABWARE_CALIBRATIONS_SUCCESS,
  FETCH_LABWARE_CALIBRATIONS_FAILURE,
} from './constants'

import type { AllLabwareCalibrations } from './../api-types'

export interface FetchLabwareCalibrationsAction {
  type: typeof FETCH_LABWARE_CALIBRATIONS
  payload: { robotName: string }
  meta: RobotApiRequestMeta | {}
}

export interface FetchLabwareCalibrationsSuccessAction {
  type: typeof FETCH_LABWARE_CALIBRATIONS_SUCCESS
  payload: {
    robotName: string
    labwareCalibrations: AllLabwareCalibrations
  }
  meta: RobotApiRequestMeta
}

export interface FetchLabwareCalibrationsFailureAction {
  type: typeof FETCH_LABWARE_CALIBRATIONS_FAILURE
  payload: { robotName: string; error: RobotApiErrorResponse }
  meta: RobotApiRequestMeta
}

// selector types

export interface LabwareCalibrationData {
  x: number
  y: number
  z: number
}
export interface LabwareSummary {
  displayName: string
  parentDisplayName: string | null
  quantity: number
  calibration: LabwareCalibrationData | null
  calDataAvailable: boolean
}

export type LabwareCalibrationAction =
  | FetchLabwareCalibrationsAction
  | FetchLabwareCalibrationsSuccessAction
  | FetchLabwareCalibrationsFailureAction

export interface BaseProtocolLabware extends Labware {
  calibrationData: LabwareCalibrationData | null
  loadName: string
  namespace: string | null
  version: number | null
  parent: ModuleModel | null
}
