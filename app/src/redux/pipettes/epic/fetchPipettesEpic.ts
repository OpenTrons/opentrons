import { GET } from '../../robot-api/constants'
import { mapToRobotApiRequest } from '../../robot-api/operators'
import type {
  ActionToRequestMapper,
  ResponseToActionMapper,
} from '../../robot-api/operators'
import type { Action, Epic } from '../../types'
import * as Actions from '../actions'
import * as Constants from '../constants'
import type { FetchPipettesAction } from '../types'
import { ofType } from 'redux-observable'

const mapActionToRequest: ActionToRequestMapper<FetchPipettesAction> = action => ({
  method: GET,
  path: Constants.PIPETTES_PATH,
  query: action.payload.refresh ? { refresh: true } : {},
})

const mapResponseToAction: ResponseToActionMapper<FetchPipettesAction> = (
  response,
  originalAction
) => {
  const { host, body, ...responseMeta } = response
  const meta = { ...originalAction.meta, response: responseMeta }

  return response.ok
    ? Actions.fetchPipettesSuccess(host.name, body, meta)
    : Actions.fetchPipettesFailure(host.name, body, meta)
}

export const fetchPipettesEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType<Action, FetchPipettesAction>(Constants.FETCH_PIPETTES),
    mapToRobotApiRequest(
      state$,
      a => a.payload.robotName,
      mapActionToRequest,
      mapResponseToAction
    )
  )
}
