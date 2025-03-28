import { ofType } from 'redux-observable'

import { GET } from '../../robot-api/constants'
import { mapToRobotApiRequest } from '../../robot-api/operators'
import * as Constants from '../constants'
import * as Actions from '../actions'

import type { Action, Epic } from '../../types'
import type {
  ActionToRequestMapper,
  ResponseToActionMapper,
} from '../../robot-api/operators'
import type { FetchResetConfigOptionsAction, ResetConfigOption } from '../types'

const mapActionToRequest: ActionToRequestMapper<FetchResetConfigOptionsAction> = action => ({
  method: GET,
  path: Constants.SETTINGS_RESET_OPTIONS_PATH,
})

const mapResponseToAction: ResponseToActionMapper<FetchResetConfigOptionsAction> = (
  response,
  originalAction
) => {
  const { host, body, ...responseMeta } = response
  const options: ResetConfigOption[] = body.options
  const meta = { ...originalAction.meta, response: responseMeta }

  return response.ok
    ? Actions.fetchResetConfigOptionsSuccess(host.name, options, meta)
    : Actions.fetchResetConfigOptionsFailure(
        host.name,
        body as Record<string, unknown>,
        meta
      )
}

export const fetchResetOptionsEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType<Action, FetchResetConfigOptionsAction>(
      Constants.FETCH_RESET_CONFIG_OPTIONS
    ),
    mapToRobotApiRequest(
      state$,
      a => a.payload.robotName,
      mapActionToRequest,
      mapResponseToAction
    )
  )
}
