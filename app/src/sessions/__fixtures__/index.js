// @flow

import * as Types from '../types'
import * as Constants from '../constants'
import { POST, DELETE, GET } from '../../robot-api'
import {
  makeResponseFixtures,
  mockV2ErrorResponse,
} from '../../robot-api/__fixtures__'

import type { RobotApiV2ErrorResponseBody } from '../../robot-api/types'

export const mockRobotSessionData: Types.RobotSessionData = {
  sessionType: 'check',
  sessionId: '1234',
  details: { someData: 5 },
}

export const mockRobotSessionUpdate: Types.RobotSessionUpdate = {
  command: 'dosomething',
  data: { someData: 32 },
}

export const mockRobotSessionUpdateData: Types.RobotSessionUpdateData = {
  command: '4321',
  status: 'accepted',
  data: {},
}

export const mockRobotSessionResponse: Types.RobotSessionResponse = {
  data: {
    id: mockRobotSessionData.sessionId,
    type: 'Session',
    attributes: mockRobotSessionData,
  },
}

export const mockRobotSessionUpdateResponse: Types.RobotSessionUpdateResponse = {
  data: {
    id: '4321',
    type: 'Command',
    attributes: mockRobotSessionUpdateData,
  },
  meta: {
    sessionType: 'check',
    sessionId: '1234',
    details: {
      someData: 15,
      someOtherData: 'hi',
    },
  },
}

export const {
  successMeta: mockCreateSessionSuccessMeta,
  failureMeta: mockCreateSessionFailureMeta,
  success: mockCreateSessionSuccess,
  failure: mockCreateSessionFailure,
} = makeResponseFixtures<
  Types.RobotSessionResponse,
  RobotApiV2ErrorResponseBody
>({
  method: POST,
  path: Constants.SESSIONS_PATH,
  successStatus: 201,
  successBody: mockRobotSessionResponse,
  failureStatus: 500,
  failureBody: mockV2ErrorResponse,
})

export const {
  successMeta: mockDeleteSessionSuccessMeta,
  failureMeta: mockDeleteSessionFailureMeta,
  success: mockDeleteSessionSuccess,
  failure: mockDeleteSessionFailure,
} = makeResponseFixtures<
  Types.RobotSessionResponse,
  RobotApiV2ErrorResponseBody
>({
  method: DELETE,
  path: `${Constants.SESSIONS_PATH}/1234`,
  successStatus: 200,
  successBody: mockRobotSessionResponse,
  failureStatus: 500,
  failureBody: mockV2ErrorResponse,
})

export const {
  successMeta: mockFetchSessionSuccessMeta,
  failureMeta: mockFetchSessionFailureMeta,
  success: mockFetchSessionSuccess,
  failure: mockFetchSessionFailure,
} = makeResponseFixtures<
  Types.RobotSessionResponse,
  RobotApiV2ErrorResponseBody
>({
  method: GET,
  path: `${Constants.SESSIONS_PATH}/1234`,
  successStatus: 200,
  successBody: mockRobotSessionResponse,
  failureStatus: 500,
  failureBody: mockV2ErrorResponse,
})

export const {
  successMeta: mockUpdateSessionSuccessMeta,
  failureMeta: mockUpdateSessionFailureMeta,
  success: mockUpdateSessionSuccess,
  failure: mockUpdateSessionFailure,
} = makeResponseFixtures<
  Types.RobotSessionUpdateResponse,
  RobotApiV2ErrorResponseBody
>({
  method: GET,
  path: `${Constants.SESSIONS_PATH}/1234/${Constants.SESSIONS_UPDATE_PATH_EXTENSION}`,
  successStatus: 200,
  successBody: mockRobotSessionUpdateResponse,
  failureStatus: 500,
  failureBody: mockV2ErrorResponse,
})
