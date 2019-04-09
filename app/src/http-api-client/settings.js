// @flow
// robot settings endpoints
import { createSelector } from 'reselect'

import { buildRequestMaker } from './actions'
import { getRobotApiState } from './reducer'

import type { OutputSelector } from 'reselect'
import type { State } from '../types'
import type { BaseRobot, RobotService } from '../robot'
import type { ApiCall } from './types'
import type { ApiAction, RequestMaker } from './actions'
import type { RobotApiState } from './reducer'

type Id = string

// TODO(mc, 2018-07-02): support more value types
type Value = boolean | null

export type Setting = {
  id: Id,
  title: string,
  description: string,
  value: Value,
}

export type PipetteSettingsField = {
  value: ?number,
  default: number,
  min?: number,
  max?: number,
  units?: string,
  type?: string,
}

export type PipetteConfigFields = { [string]: PipetteSettingsField }

export type PipetteConfigResponse = {
  info: {
    name: ?string,
    model: ?string,
  },
  fields: PipetteConfigFields,
}

type SettingsRequest = ?{ id: Id, value: Value }

type SettingsResponse = { settings: Array<Setting> }

export type SettingsAction = ApiAction<
  'settings',
  SettingsRequest,
  SettingsResponse
>

export type PipetteConfigRequest = { fields: { [string]: ?{ value: number } } }

export type RobotSettingsCall = ApiCall<SettingsRequest, SettingsResponse>

export type PipetteConfigCall = ApiCall<
  PipetteConfigRequest,
  PipetteConfigResponse
>

export type SettingsState = {|
  settings?: RobotSettingsCall,
  'settings/pipettes'?: PipetteConfigCall,
|}

const SETTINGS: 'settings' = 'settings'

type SettingsRequestMaker = RequestMaker<SettingsRequest>

export const fetchSettings: SettingsRequestMaker = buildRequestMaker(
  'GET',
  SETTINGS
)

export const setSettings: SettingsRequestMaker = buildRequestMaker(
  'POST',
  SETTINGS
)

const PIPETTE_SETTINGS: 'settings/pipettes' = 'settings/pipettes'

type PipetteConfigRequestMaker = RequestMaker<?PipetteConfigRequest>

export const fetchPipetteConfigs: PipetteConfigRequestMaker = buildRequestMaker(
  'GET',
  PIPETTE_SETTINGS
)

export function setPipetteConfigs(
  robot: RobotService,
  id: string,
  params: PipetteConfigRequest
) {
  const path = `${PIPETTE_SETTINGS}/${id}`
  return buildRequestMaker('PATCH', path)(robot, params)
}

export function makeGetRobotSettings() {
  const selector: OutputSelector<
    State,
    BaseRobot,
    RobotSettingsCall
  > = createSelector(
    getRobotApiState,
    getSettingsRequest
  )

  return selector
}

export function getSettingsRequest(state: RobotApiState): RobotSettingsCall {
  let requestState = state[SETTINGS] || { inProgress: false }

  // guard against an older version of GET /settings
  if (requestState.response && !('settings' in requestState.response)) {
    requestState = { ...requestState, response: { settings: [] } }
  }

  return requestState
}

export function makeGetRobotPipetteConfigs() {
  const selector: OutputSelector<
    State,
    BaseRobot,
    PipetteConfigCall
  > = createSelector(
    getRobotApiState,
    getRobotPipetteConfigs
  )

  return selector
}

export function getRobotPipetteConfigs(
  state: RobotApiState
): PipetteConfigCall {
  return state[PIPETTE_SETTINGS] || { inProgress: false }
}

export function makeGetPipetteRequestById() {
  const selector: OutputSelector<
    State,
    BaseRobot,
    PipetteConfigCall
  > = createSelector(
    (state, robot, _id) => getRobotApiState(state, robot),
    (_state, _robot, id) => id,
    (state, id) => {
      const path = `${PIPETTE_SETTINGS}/${id}`
      return state[path] || { inProgress: false }
    }
  )
  return selector
}
