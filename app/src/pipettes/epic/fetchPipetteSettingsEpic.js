// @flow
import { ofType } from 'redux-observable'

import { GET } from '../../robot-api/constants'
import { mapToRobotApiRequest } from '../../robot-api/operators'

import * as Actions from '../actions'
import * as Constants from '../constants'

import type { Epic } from '../../types'

import type {
  ActionToRequestMapper,
  ResponseToActionMapper,
} from '../../robot-api/operators'

import type { FetchPipetteSettingsAction } from '../types'

const mapActionToRequest: ActionToRequestMapper<FetchPipetteSettingsAction> = action => ({
  method: GET,
  path: Constants.PIPETTE_SETTINGS_PATH,
})

const mapResponseToAction: ResponseToActionMapper<FetchPipetteSettingsAction> = (
  response,
  originalAction
) => {
  const { host, body, ...responseMeta } = response
  const meta = { ...originalAction.meta, response: responseMeta }

  return response.ok
    ? Actions.fetchPipetteSettingsSuccess(host.name, body, meta)
    : Actions.fetchPipetteSettingsFailure(host.name, body, meta)
}

export const fetchPipetteSettingsEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType(Constants.FETCH_PIPETTE_SETTINGS),
    mapToRobotApiRequest(
      state$,
      a => a.payload.robotName,
      mapActionToRequest,
      mapResponseToAction
    )
  )
}
