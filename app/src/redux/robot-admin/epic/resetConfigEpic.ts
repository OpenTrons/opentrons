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
    body: action.payload.resets.settingsResets,
  }

  // This endpoint does not exist on older robot versions.
  // We'll send the request blindly and rely on it returning a harmless 404 in that case.
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
  const allResponsesOk = responses.every(r => r.ok)

  // todo(mm, 2025-03-28): We're combining the results from multiple HTTP requests
  // into a single Redux action, but our action shapes don't really seem designed for
  // that, so this picks an arbitrary response as the primary one whose info to
  // propagate in the action. This is...probably not right, but it's unclear to me
  // what needs to change to fix it.
  const primaryResponse = responses[0]

  const { host, body, ...responseMeta } = primaryResponse
  const meta = { ...originalAction.meta, response: responseMeta }

  return allResponsesOk
      ? Actions.resetConfigSuccess(host.name, meta)
      : Actions.resetConfigFailure(
          host.name,
          body as Record<string, unknown>,
          meta
        )
}

/**
 * When we see a RESET_CONFIG action, send parallel requests to all necessary endpoints.
 * Emit a success action if all requests returned success, or a failure action if
 * any request failed.
 */
export const resetConfigEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType<Action, ResetConfigAction>(Constants.RESET_CONFIG),
    withRobotHost(state$, action => action.payload.robotName),
    switchMap(([action, state, host]) =>
      // Note that HTTP-level request failures are, at the rxjs level, values instead of errors,
      // so this forkJoin will (correctly) wait for every HTTP request to complete instead of
      // bailing as soon as any of them fails.
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
