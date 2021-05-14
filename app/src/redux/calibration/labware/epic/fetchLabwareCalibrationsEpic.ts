import { ofType } from 'redux-observable'

import { GET } from '../../../robot-api/constants'
import { mapToRobotApiRequest } from '../../../robot-api/operators'
import * as Actions from '../actions'
import * as Constants from '../constants'

import type {
  ActionToRequestMapper,
  ResponseToActionMapper,
} from '../../../robot-api/operators'
import type { Action, Epic } from '../../../types'
import type { FetchLabwareCalibrationsAction } from '../types'

const mapActionToRequest: ActionToRequestMapper<FetchLabwareCalibrationsAction> = action => ({
  method: GET,
  path: Constants.LABWARE_CALIBRATION_PATH,
})

const mapResponseToAction: ResponseToActionMapper<FetchLabwareCalibrationsAction> = (
  response,
  originalAction
) => {
  const { host, body, ...responseMeta } = response
  const meta = { ...originalAction.meta, response: responseMeta }
  return response.ok
    ? Actions.fetchLabwareCalibrationsSuccess(host.name, body, meta)
    : Actions.fetchLabwareCalibrationsFailure(host.name, body, meta)
}

export const fetchLabwareCalibrationsEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType<Action, FetchLabwareCalibrationsAction>(
      Constants.FETCH_LABWARE_CALIBRATIONS
    ),
    mapToRobotApiRequest(
      state$,
      a => a.payload.robotName,
      mapActionToRequest,
      mapResponseToAction
    )
  )
}
