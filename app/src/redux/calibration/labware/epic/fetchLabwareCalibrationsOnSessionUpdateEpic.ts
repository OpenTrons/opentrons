import { of } from 'rxjs'
import { ofType } from 'redux-observable'
import { filter, mergeMap, withLatestFrom } from 'rxjs/operators'

import { getConnectedRobotName } from '../../../robot/selectors'
import * as Actions from '../actions'
import type { Epic } from '../../../types'

export const fetchLabwareCalibrationsOnSessionUpdateEpic: Epic = (
  action$,
  state$
) => {
  return action$.pipe(
    ofType('robot:UPDATE_OFFSET_SUCCESS', 'robot:CONFIRM_TIPRACK_SUCCESS'),
    withLatestFrom(state$, (_, s) => getConnectedRobotName(s)),
    filter((robotName): robotName is string => robotName !== null),
    mergeMap(robotName => {
      return of(Actions.fetchLabwareCalibrations(robotName))
    })
  )
}
