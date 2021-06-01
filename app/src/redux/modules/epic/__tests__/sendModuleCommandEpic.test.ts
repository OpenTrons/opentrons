import { TestScheduler } from 'rxjs/testing'

import * as RobotApiHttp from '../../../robot-api/http'
import * as DiscoverySelectors from '../../../discovery/selectors'
import * as Fixtures from '../../__fixtures__'

import * as Actions from '../../actions'
import * as Types from '../../types'
import { modulesEpic } from '../../epic'

import type { Action, State } from '../../../types'

jest.mock('../../../robot-api/http')
jest.mock('../../../discovery/selectors')

const mockState: State = { state: true } as any
const { mockRobot } = Fixtures

const mockFetchRobotApi = RobotApiHttp.fetchRobotApi as jest.MockedFunction<
  typeof RobotApiHttp.fetchRobotApi
>

const mockGetRobotByName = DiscoverySelectors.getRobotByName as jest.MockedFunction<
  typeof DiscoverySelectors.getRobotByName
>

describe('sendModuleCommand', () => {
  let testScheduler: TestScheduler

  const meta = { requestId: '1234' }
  const action: Types.SendModuleCommandAction = {
    ...Actions.sendModuleCommand(mockRobot.name, 'abc123', 'set_temperature', [
      42,
    ]),
    meta,
  }

  beforeEach(() => {
    mockGetRobotByName.mockReturnValue(mockRobot as any)

    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('calls POST /modules/{serial}', () => {
    testScheduler.run(({ hot, cold, expectObservable, flush }) => {
      mockFetchRobotApi.mockReturnValue(
        cold('r', { r: Fixtures.mockSendModuleCommandSuccess })
      )

      const action$ = hot<Action>('--a', { a: action })
      const state$ = hot<State>('a-a', { a: mockState })
      const output$ = modulesEpic(action$, state$)

      expectObservable(output$)
      flush()

      expect(mockGetRobotByName).toHaveBeenCalledWith(mockState, mockRobot.name)
      expect(mockFetchRobotApi).toHaveBeenCalledWith(mockRobot, {
        method: 'POST',
        path: '/modules/abc123',
        body: {
          command_type: 'set_temperature',
          args: [42],
        },
      })
    })
  })

  it('maps successful response to SEND_MODULE_COMMAND_SUCCESS', () => {
    testScheduler.run(({ hot, cold, expectObservable, flush }) => {
      mockFetchRobotApi.mockReturnValue(
        cold('r', { r: Fixtures.mockSendModuleCommandSuccess })
      )

      const action$ = hot<Action>('--a', { a: action })
      const state$ = hot<State>('a-a', { a: {} } as any)
      const output$ = modulesEpic(action$, state$)

      expectObservable(output$).toBe('--a', {
        a: Actions.sendModuleCommandSuccess(
          mockRobot.name,
          'abc123',
          'set_temperature',
          Fixtures.mockSendModuleCommandSuccess.body.returnValue,
          { ...meta, response: Fixtures.mockSendModuleCommandSuccessMeta }
        ),
      })
    })
  })

  it('maps failed response to SEND_MODULE_COMMAND_FAILURE', () => {
    testScheduler.run(({ hot, cold, expectObservable, flush }) => {
      mockFetchRobotApi.mockReturnValue(
        cold('r', { r: Fixtures.mockSendModuleCommandFailure })
      )

      const action$ = hot<Action>('--a', { a: action })
      const state$ = hot<State>('a-a', { a: {} } as any)
      const output$ = modulesEpic(action$, state$)

      expectObservable(output$).toBe('--a', {
        a: Actions.sendModuleCommandFailure(
          mockRobot.name,
          'abc123',
          'set_temperature',
          { message: 'AH' },
          { ...meta, response: Fixtures.mockSendModuleCommandFailureMeta }
        ),
      })
    })
  })
})
