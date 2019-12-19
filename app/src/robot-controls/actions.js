// @flow

import * as Constants from './constants'
import * as Types from './types'

import type { RobotApiRequestMeta } from '../robot-api/types'
import type { Mount } from '../pipettes/types'

export const fetchLights = (robotName: string): Types.FetchLightsAction => ({
  type: Constants.FETCH_LIGHTS,
  payload: { robotName },
  meta: {},
})

export const fetchLightsSuccess = (
  robotName: string,
  lightsOn: boolean,
  meta: RobotApiRequestMeta
): Types.FetchLightsSuccessAction => ({
  type: Constants.FETCH_LIGHTS_SUCCESS,
  payload: { robotName, lightsOn },
  meta,
})

export const fetchLightsFailure = (
  robotName: string,
  error: {| message: string |},
  meta: RobotApiRequestMeta
): Types.FetchLightsFailureAction => ({
  type: Constants.FETCH_LIGHTS_FAILURE,
  payload: { robotName, error },
  meta,
})

export const updateLights = (
  robotName: string,
  lightsOn: boolean
): Types.UpdateLightsAction => ({
  type: Constants.UPDATE_LIGHTS,
  payload: { robotName, lightsOn },
  meta: {},
})

export const updateLightsSuccess = (
  robotName: string,
  lightsOn: boolean,
  meta: RobotApiRequestMeta
): Types.UpdateLightsSuccessAction => ({
  type: Constants.UPDATE_LIGHTS_SUCCESS,
  payload: { robotName, lightsOn },
  meta,
})

export const updateLightsFailure = (
  robotName: string,
  error: {| message: string |},
  meta: RobotApiRequestMeta
): Types.UpdateLightsFailureAction => ({
  type: Constants.UPDATE_LIGHTS_FAILURE,
  payload: { robotName, error },
  meta,
})

type HomeActionCreator = ((
  robotName: string,
  target: 'robot'
) => Types.HomeAction) &
  ((robotName: string, target: 'pipette', mount: Mount) => Types.HomeAction)

export const home: HomeActionCreator = (robotName, target, mount) => ({
  type: Constants.HOME,
  payload:
    target === Constants.PIPETTE && typeof mount === 'string'
      ? { robotName, target: Constants.PIPETTE, mount }
      : { robotName, target: Constants.ROBOT },
  meta: {},
})

export const homeSuccess = (
  robotName: string,
  meta: RobotApiRequestMeta
): Types.HomeSuccessAction => ({
  type: Constants.HOME_SUCCESS,
  payload: { robotName },
  meta,
})

export const homeFailure = (
  robotName: string,
  error: {| message: string |},
  meta: RobotApiRequestMeta
): Types.HomeFailureAction => ({
  type: Constants.HOME_FAILURE,
  payload: { robotName, error },
  meta,
})

export const clearMovementStatus = (
  robotName: string
): Types.ClearMovementStatusAction => ({
  type: Constants.CLEAR_MOVEMENT_STATUS,
  payload: { robotName },
})
