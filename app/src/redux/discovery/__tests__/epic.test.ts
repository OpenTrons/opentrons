import * as Shell from '../../shell'
import type { Action, State } from '../../types'
import * as Actions from '../actions'
import { discoveryEpic } from '../epic'
import { TestScheduler } from 'rxjs/testing'

describe('discovery actions', () => {
  let testScheduler: TestScheduler

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })

  it('startDiscoveryEpic with default timeout', () => {
    testScheduler.run(({ hot, expectObservable }) => {
      const action$ = hot<Action>('-a', { a: Actions.startDiscovery() })
      const state$ = hot<State>('s-', {})
      const output$ = discoveryEpic(action$, state$)

      expectObservable(output$).toBe('- 30000ms a ', {
        a: Actions.finishDiscovery(),
      })
    })
  })

  it('startDiscoveryEpic with specified timeout', () => {
    testScheduler.run(({ hot, expectObservable }) => {
      const action$ = hot<Action>('-a', { a: Actions.startDiscovery(42) })
      const state$ = hot<State>('s-', {})
      const output$ = discoveryEpic(action$, state$)

      expectObservable(output$).toBe('- 42ms a ', {
        a: Actions.finishDiscovery(),
      })
    })
  })

  it('startDiscoveryEpic with shell:UI_INITIALIZED', () => {
    testScheduler.run(({ hot, expectObservable }) => {
      const action$ = hot<Action>('-a', { a: Shell.uiInitialized() })
      const state$ = hot<State>('s-', {})
      const output$ = discoveryEpic(action$, state$)

      expectObservable(output$).toBe('- 30000ms a ', {
        a: Actions.finishDiscovery(),
      })
    })
  })
})
