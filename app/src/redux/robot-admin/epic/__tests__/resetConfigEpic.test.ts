import { describe, it, expect } from 'vitest'

import { setupEpicTestMocks, runEpicTest } from '../../../robot-api/__utils__'
import * as Fixtures from '../../__fixtures__'
import * as Actions from '../../actions'
import { resetConfigEpic } from '../resetConfigEpic'

import type { Action } from '../../../types'

const makeResetConfigAction = (robotName: string) =>
  Actions.resetConfig(robotName, {
    resetLabwareOffsets: false,
    settingsResets: {
      foo: true,
      bar: false,
    },
  })

describe('robotAdminEpic handles performing a "factory reset"', () => {
  it('calls POST /settings/reset on RESET_CONFIG', () => {
    const mocks = setupEpicTestMocks<Action>(
      makeResetConfigAction,
      Fixtures.mockResetConfigSuccess
    )

    runEpicTest<Action>(mocks, ({ hot, expectObservable, flush }) => {
      const action$ = hot('--a', { a: mocks.action })
      const state$ = hot('s-s', { s: mocks.state })
      const output$ = resetConfigEpic(action$, state$)

      expectObservable(output$)
      flush()

      expect(mocks.fetchRobotApi).toHaveBeenCalledWith(mocks.robot, {
        method: 'POST',
        path: '/settings/reset',
        body: { foo: true, bar: false },
      })
    })
  })

  it('maps successful response to RESET_CONFIG_SUCCESS', () => {
    const mocks = setupEpicTestMocks<Action>(
      makeResetConfigAction,
      Fixtures.mockResetConfigSuccess
    )

    runEpicTest<Action>(mocks, ({ hot, expectObservable }) => {
      const action$ = hot('--a', { a: mocks.action })
      const state$ = hot('s-s', { s: mocks.state })
      const output$ = resetConfigEpic(action$, state$)

      expectObservable(output$).toBe('--a', {
        a: Actions.resetConfigSuccess(mocks.robot.name, {
          ...mocks.meta,
          response: Fixtures.mockResetConfigSuccessMeta,
        }),
      })
    })
  })

  it('maps failed response to RESET_CONFIG_FAILURE', () => {
    const mocks = setupEpicTestMocks<Action>(
      makeResetConfigAction,
      Fixtures.mockResetConfigFailure
    )

    runEpicTest<Action>(mocks, ({ hot, expectObservable }) => {
      const action$ = hot('--a', { a: mocks.action })
      const state$ = hot('s-s', { s: mocks.state })
      const output$ = resetConfigEpic(action$, state$)

      expectObservable(output$).toBe('--a', {
        a: Actions.resetConfigFailure(
          mocks.robot.name,
          { message: 'AH' },
          { ...mocks.meta, response: Fixtures.mockResetConfigFailureMeta }
        ),
      })
    })
  })
})
