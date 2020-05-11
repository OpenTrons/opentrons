// @flow
import { TestScheduler } from 'rxjs/testing'

import * as RobotApiHttp from '../../../robot-api/http'
import * as DiscoverySelectors from '../../../discovery/selectors'
import * as Fixtures from '../../__fixtures__'
import * as Actions from '../../actions'
import { calibrationEpic } from '..'
import type { Observable } from 'rxjs'
import type {
  RobotHost,
  RobotApiRequestOptions,
  RobotApiResponse,
} from '../../../robot-api/types'

jest.mock('../../../robot-api/http')
jest.mock('../../../discovery/selectors')

const mockFetchRobotApi: JestMockFn<
  [RobotHost, RobotApiRequestOptions],
  Observable<RobotApiResponse>
> = RobotApiHttp.fetchRobotApi

const mockGetRobotByName: JestMockFn<[any, string], mixed> =
  DiscoverySelectors.getRobotByName

const mockRobot = Fixtures.mockRobot
const mockState = { state: true }

describe('updateRobotCalibrationCheckSessionEpic', () => {
  let testScheduler

  beforeEach(() => {
    mockGetRobotByName.mockReturnValue(mockRobot)

    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  const updateTriggers = [
    {
      action: Actions.loadLabwareRobotCalibrationCheck(mockRobot.name),
      pathExtension: 'loadLabware',
    },
    {
      action: Actions.preparePipetteRobotCalibrationCheck(mockRobot.name),
      pathExtension: 'preparePipette',
    },
    {
      action: Actions.jogRobotCalibrationCheck(mockRobot.name, [1, 0, 0]),
      pathExtension: 'jog',
      body: { vector: [1, 0, 0] },
    },
    {
      action: Actions.pickUpTipRobotCalibrationCheck(mockRobot.name),
      pathExtension: 'pickUpTip',
    },
    {
      action: Actions.confirmTipRobotCalibrationCheck(mockRobot.name),
      pathExtension: 'confirmTip',
    },
    {
      action: Actions.invalidateTipRobotCalibrationCheck(mockRobot.name),
      pathExtension: 'invalidateTip',
    },
    {
      action: Actions.confirmStepRobotCalibrationCheck(mockRobot.name),
      pathExtension: 'confirmStep',
    },
  ]

  updateTriggers.forEach(({ action, pathExtension, body = undefined }) => {
    describe(`handles ${action.type}`, () => {
      const expectedRequest = {
        method: 'POST',
        path: `/calibration/check/session/${pathExtension}`,
        body,
      }
      const {
        successMeta,
        failureMeta,
        success,
        failure,
      } = Fixtures.makeUpdateCheckSessionResponseFixtures(pathExtension)

      it(`calls POST /calibration/check/session/${pathExtension}`, () => {
        testScheduler.run(({ hot, cold, expectObservable, flush }) => {
          mockFetchRobotApi.mockReturnValue(cold('r', { r: success }))

          const action$ = hot('--a', { a: action })
          const state$ = hot('a-a', { a: mockState })
          const output$ = calibrationEpic(action$, state$)

          expectObservable(output$)
          flush()

          expect(mockFetchRobotApi).toHaveBeenCalledWith(
            mockRobot,
            expectedRequest
          )
        })
      })

      it('maps successful response to UPDATE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS', () => {
        testScheduler.run(({ hot, cold, expectObservable, flush }) => {
          mockFetchRobotApi.mockReturnValue(cold('r', { r: success }))

          const action$ = hot('--a', { a: action })
          const state$ = hot('a-a', { a: {} })
          const output$ = calibrationEpic(action$, state$)

          expectObservable(output$).toBe('--a', {
            a: Actions.updateRobotCalibrationCheckSessionSuccess(
              mockRobot.name,
              success.body,
              { response: successMeta }
            ),
          })
        })
      })

      it('maps failed response to UPDATE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE', () => {
        testScheduler.run(({ hot, cold, expectObservable, flush }) => {
          mockFetchRobotApi.mockReturnValue(cold('r', { r: failure }))

          const action$ = hot('--a', { a: action })
          const state$ = hot('a-a', { a: {} })
          const output$ = calibrationEpic(action$, state$)

          expectObservable(output$).toBe('--a', {
            a: Actions.updateRobotCalibrationCheckSessionFailure(
              mockRobot.name,
              { message: 'AH' },
              { response: failureMeta }
            ),
          })
        })
      })
    })
  })
})
