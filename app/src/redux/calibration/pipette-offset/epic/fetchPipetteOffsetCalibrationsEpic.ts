import { GET } from '../../../robot-api/constants'
import { mapToRobotApiRequest } from '../../../robot-api/operators'
import type {
  ActionToRequestMapper,
  ResponseToActionMapper,
} from '../../../robot-api/operators'
import type { Action, Epic } from '../../../types'
import * as Actions from '../actions'
import * as Constants from '../constants'
import type { FetchPipetteOffsetCalibrationsAction } from '../types'
import { ofType } from 'redux-observable'

const mapActionToRequest: ActionToRequestMapper<FetchPipetteOffsetCalibrationsAction> = action => ({
  method: GET,
  path: Constants.PIPETTE_OFFSET_CALIBRATIONS_PATH,
})

const mapResponseToAction: ResponseToActionMapper<FetchPipetteOffsetCalibrationsAction> = (
  response,
  originalAction
) => {
  const { host, body, ...responseMeta } = response
  const meta = { ...originalAction.meta, response: responseMeta }
  return response.ok
    ? Actions.fetchPipetteOffsetCalibrationsSuccess(host.name, body, meta)
    : Actions.fetchPipetteOffsetCalibrationsFailure(host.name, body, meta)
}

export const fetchPipetteOffsetCalibrationsEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType<Action, FetchPipetteOffsetCalibrationsAction>(
      Constants.FETCH_PIPETTE_OFFSET_CALIBRATIONS
    ),
    mapToRobotApiRequest(
      state$,
      a => a.payload.robotName,
      mapActionToRequest,
      mapResponseToAction
    )
  )
}
