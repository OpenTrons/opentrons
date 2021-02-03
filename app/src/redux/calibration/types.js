// @flow

import type {
  RobotApiRequestMeta,
  RobotApiErrorResponse,
} from '../robot-api/types'

import type {
  CalibrationStatus,
  AllLabwareCalibrations,
  AllPipetteOffsetCalibrations,
  AllTipLengthCalibrations,
} from './api-types'

import type { LabwareCalibrationAction } from './labware/types'
import type { PipetteOffsetCalibrationsAction } from './pipette-offset/types'
import type { TipLengthCalibrationsAction } from './tip-length/types'

import typeof {
  FETCH_CALIBRATION_STATUS,
  FETCH_CALIBRATION_STATUS_SUCCESS,
  FETCH_CALIBRATION_STATUS_FAILURE,
} from './constants'

export type * from './api-types'
export type * from './labware/types'
export type * from './pipette-offset/types'
export type * from './tip-length/types'

export type FetchCalibrationStatusAction = {|
  type: FETCH_CALIBRATION_STATUS,
  payload: {| robotName: string |},
  meta: RobotApiRequestMeta,
|}

export type FetchCalibrationStatusSuccessAction = {|
  type: FETCH_CALIBRATION_STATUS_SUCCESS,
  payload: {|
    robotName: string,
    calibrationStatus: CalibrationStatus,
  |},
  meta: RobotApiRequestMeta,
|}

export type FetchCalibrationStatusFailureAction = {|
  type: FETCH_CALIBRATION_STATUS_FAILURE,
  payload: {| robotName: string, error: RobotApiErrorResponse |},
  meta: RobotApiRequestMeta,
|}

export type CalibrationAction =
  | FetchCalibrationStatusAction
  | FetchCalibrationStatusSuccessAction
  | FetchCalibrationStatusFailureAction
  | LabwareCalibrationAction
  | PipetteOffsetCalibrationsAction
  | TipLengthCalibrationsAction

export type PerRobotCalibrationState = $ReadOnly<{|
  calibrationStatus: CalibrationStatus | null,
  labwareCalibrations: AllLabwareCalibrations | null,
  pipetteOffsetCalibrations: AllPipetteOffsetCalibrations | null,
  tipLengthCalibrations: AllTipLengthCalibrations | null,
|}>

export type CalibrationState = $ReadOnly<{
  [robotName: string]: PerRobotCalibrationState,
  ...
}>
