import { ofType } from 'redux-observable'

import { GET } from '../../robot-api/constants'
import { mapToRobotApiRequest } from '../../robot-api/operators'
import * as Actions from '../actions'
import * as Constants from '../constants'

import type {
  ActionToRequestMapper,
  ResponseToActionMapper,
} from '../../robot-api/operators'
import type { Action, Epic } from '../../types'
import type { FetchStatusAction } from '../types'

const mapActionToRequest: ActionToRequestMapper<FetchStatusAction> = action => ({
  method: GET,
  path: Constants.STATUS_PATH,
})

const mapResponseToAction: ResponseToActionMapper<FetchStatusAction> = (
  response,
  originalAction
) => {
  const { host, body, ...responseMeta } = response
  const meta = { ...originalAction.meta, response: responseMeta }

  return response.ok
    ? Actions.fetchStatusSuccess(host.name, body.status, body.interfaces, meta)
    : Actions.fetchStatusFailure(host.name, body, meta)
}

export const statusEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType<Action, FetchStatusAction>(Constants.FETCH_STATUS),
    mapToRobotApiRequest(
      state$,
      a => a.payload.robotName,
      mapActionToRequest,
      mapResponseToAction
    )
  )
}
