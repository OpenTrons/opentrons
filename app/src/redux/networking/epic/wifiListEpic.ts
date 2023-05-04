import { GET } from '../../robot-api/constants'
import { mapToRobotApiRequest } from '../../robot-api/operators'
import type {
  ActionToRequestMapper,
  ResponseToActionMapper,
} from '../../robot-api/operators'
import type { Action, Epic } from '../../types'
import * as Actions from '../actions'
import * as Constants from '../constants'
import type { FetchWifiListAction } from '../types'
import { ofType } from 'redux-observable'

const mapActionToRequest: ActionToRequestMapper<FetchWifiListAction> = action => ({
  method: GET,
  path: Constants.WIFI_LIST_PATH,
})

const mapResponseToAction: ResponseToActionMapper<FetchWifiListAction> = (
  response,
  originalAction
) => {
  const { host, body, ...responseMeta } = response
  const meta = { ...originalAction.meta, response: responseMeta }

  return response.ok
    ? Actions.fetchWifiListSuccess(host.name, body.list, meta)
    : Actions.fetchWifiListFailure(host.name, body, meta)
}

export const wifiListEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType<Action, FetchWifiListAction>(Constants.FETCH_WIFI_LIST),
    mapToRobotApiRequest(
      state$,
      a => a.payload.robotName,
      mapActionToRequest,
      mapResponseToAction
    )
  )
}
