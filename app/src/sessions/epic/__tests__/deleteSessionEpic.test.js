// @flow
import { setupEpicTestMocks, runEpicTest } from '../../../robot-api/__utils__'

import * as Fixtures from '../../__fixtures__'
import * as Actions from '../../actions'
import { sessionsEpic } from '..'

const makeTriggerAction = robotName => Actions.deleteSession(robotName, '1234')

describe('deleteSessionEpic', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  const expectedRequest = {
    method: 'DELETE',
    path: '/sessions/1234',
  }

  it('calls DELETE /sessions/1234', () => {
    const mocks = setupEpicTestMocks(
      makeTriggerAction,
      Fixtures.mockDeleteSessionSuccess
    )

    runEpicTest(mocks, ({ hot, expectObservable, flush }) => {
      const action$ = hot('--a', { a: mocks.action })
      const state$ = hot('s-s', { s: mocks.state })
      const output$ = sessionsEpic(action$, state$)

      expectObservable(output$)
      flush()

      expect(mocks.fetchRobotApi).toHaveBeenCalledWith(
        mocks.robot,
        expectedRequest
      )
    })
  })

  it('maps successful response to DELETE_SESSION_SUCCESS', () => {
    const mocks = setupEpicTestMocks(
      makeTriggerAction,
      Fixtures.mockDeleteSessionSuccess
    )

    runEpicTest(mocks, ({ hot, expectObservable, flush }) => {
      const action$ = hot('--a', { a: mocks.action })
      const state$ = hot('s-s', { s: mocks.state })
      const output$ = sessionsEpic(action$, state$)

      expectObservable(output$).toBe('--a', {
        a: Actions.deleteSessionSuccess(
          mocks.robot.name,
          Fixtures.mockDeleteSessionSuccess.body,
          { ...mocks.meta, response: Fixtures.mockDeleteSessionSuccessMeta }
        ),
      })
    })
  })

  it('maps failed response to DELETE_SESSION_FAILURE', () => {
    const mocks = setupEpicTestMocks(
      makeTriggerAction,
      Fixtures.mockDeleteSessionFailure
    )

    runEpicTest(mocks, ({ hot, expectObservable, flush }) => {
      const action$ = hot('--a', { a: mocks.action })
      const state$ = hot('s-s', { s: mocks.state })
      const output$ = sessionsEpic(action$, state$)

      expectObservable(output$).toBe('--a', {
        a: Actions.deleteSessionFailure(
          mocks.robot.name,
          { errors: [{ status: 'went bad' }] },
          { ...mocks.meta, response: Fixtures.mockDeleteSessionFailureMeta }
        ),
      })
    })
  })
})
