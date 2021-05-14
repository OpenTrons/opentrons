import { ofType } from 'redux-observable'
import { interval } from 'rxjs'
import {
  mergeMap,
  withLatestFrom,
  filter,
  map,
  takeWhile,
} from 'rxjs/operators'

import { getConnectedRobotName } from '../../robot/selectors'
import { fetchModules } from '../actions'

import type { Epic } from '../../types'
import type { ConnectResponseAction } from '../../robot/actions'

const POLL_MODULE_INTERVAL_MS = 5000

export const pollModulesWhileConnectedEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType('robot:CONNECT_RESPONSE'),
    filter<ConnectResponseAction>(action => !action.payload?.error),
    mergeMap(() => {
      return interval(POLL_MODULE_INTERVAL_MS).pipe(
        withLatestFrom(state$, (_, state) => getConnectedRobotName(state)),
        takeWhile<string | null, any>((robotName): robotName is string =>
          Boolean(robotName)
        ),
        map((robotName: string) => fetchModules(robotName))
      )
    })
  )
}
