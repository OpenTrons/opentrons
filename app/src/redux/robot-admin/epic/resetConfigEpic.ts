import { ofType } from 'redux-observable'
import { map, switchMap } from 'rxjs/operators'

import { POST, DELETE } from '../../robot-api/constants'
import { withRobotHost } from '../../robot-api/operators'
import * as Constants from '../constants'
import * as Actions from '../actions'

import type { Epic, Action } from '../../types'
import type {
  ResetConfigAction,
  ResetConfigSuccessAction,
  RestartRobotAction,
} from '../types'
import { forkJoin } from 'rxjs'
import { fetchRobotApi } from '../../robot-api'
import { type RobotApiResponse, type RobotApiRequestOptions } from '../../robot-api/types'

function mapActionToRequests(
  action: ResetConfigAction
): RobotApiRequestOptions[] {
  const settingsResetRequest = {
    method: POST,
    path: Constants.SETTINGS_RESET_PATH,
    body: action.payload.resets.postSettingsResetOptions,
  }

  const deleteLabwareOffsetsRequest = action.payload.resets.resetLabwareOffsets ? {
    method: DELETE,
    path: Constants.LABWARE_OFFSETS_PATH,
    body: {},
  } : null

  const requests: RobotApiRequestOptions[] = []
  requests.push(settingsResetRequest)
  if (deleteLabwareOffsetsRequest !== null) requests.push(deleteLabwareOffsetsRequest)
  return requests
}

function mapResponsesToAction(
  responses: RobotApiResponse[], originalAction: ResetConfigAction
): Action {
  // TODO: This is wrong
  const response = responses[0]

  const { host, body, ...responseMeta } = response
  const meta = { ...originalAction.meta, response: responseMeta }

  const allResponsesOk = responses.every(r => r.ok)
  return allResponsesOk
      ? Actions.resetConfigSuccess(host.name, meta)
      : Actions.resetConfigFailure(
          host.name,
          body as Record<string, unknown>,
          meta
        )
}

/**
 * When we see a RESET_CONFIG action, send parallel requests to all required endpoints.
 * Emit a success action if all requests returned success, or a failure action if
 * any request failed.
 */
export const resetConfigEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType<Action, ResetConfigAction>(Constants.RESET_CONFIG),
    withRobotHost(state$, action => action.payload.robotName),
    switchMap(([action, state, host]) =>
      forkJoin(
        mapActionToRequests(action).map(request => fetchRobotApi(host, request))
      ).pipe(map(responseGroup => mapResponsesToAction(responseGroup, action)))
    ),
  )
}

export const restartOnResetConfigEpic: Epic = action$ => {
  return action$.pipe(
    ofType<Action, ResetConfigSuccessAction>(Constants.RESET_CONFIG_SUCCESS),
    map<ResetConfigSuccessAction, RestartRobotAction>(a => {
      return Actions.restartRobot(a.payload.robotName)
    })
  )
}
