// @flow

import typeof {
  CREATE_ROBOT_SESSION,
  CREATE_ROBOT_SESSION_SUCCESS,
  CREATE_ROBOT_SESSION_FAILURE,
  DELETE_ROBOT_SESSION,
  DELETE_ROBOT_SESSION_SUCCESS,
  DELETE_ROBOT_SESSION_FAILURE,
  FETCH_ROBOT_SESSION,
  FETCH_ROBOT_SESSION_SUCCESS,
  FETCH_ROBOT_SESSION_FAILURE,
  UPDATE_ROBOT_SESSION,
  UPDATE_ROBOT_SESSION_SUCCESS,
  UPDATE_ROBOT_SESSION_FAILURE,
} from './constants'

import type {
  RobotApiRequestMeta,
  RobotApiV2ResponseBody,
  RobotApiV2ErrorResponseBody,
} from '../robot-api/types'

// The available session types
export type RobotSessionType = 'calibrationCheck'

export type RobotSessionUpdate = {|
  command: string,
  // TODO(al, 2020-05-11): data should be properly typed with all
  // known command types
  data: { ... },
|}

export type RobotSessionData = {|
  sessionType: RobotSessionType,
  sessionId: string,
  // TODO(al, 2020-05-11): details should be properly typed with all
  // known session response types
  details: { ... },
|}

export type RobotSessionUpdateData = {|
  command: string,
  data: { ... },
  status?: string,
|}

export type RobotSessionResponse = RobotApiV2ResponseBody<RobotSessionData, any>

export type RobotSessionUpdateResponse = RobotApiV2ResponseBody<
  RobotSessionUpdateData,
  RobotSessionData
>

export type CreateRobotSessionAction = {|
  type: CREATE_ROBOT_SESSION,
  payload: {| robotName: string, sessionType: RobotSessionType |},
  meta: RobotApiRequestMeta,
|}

export type CreateRobotSessionSuccessAction = {|
  type: CREATE_ROBOT_SESSION_SUCCESS,
  payload: {| robotName: string, ...RobotSessionResponse |},
  meta: RobotApiRequestMeta,
|}

export type CreateRobotSessionFailureAction = {|
  type: CREATE_ROBOT_SESSION_FAILURE,
  payload: {| robotName: string, error: RobotApiV2ErrorResponseBody |},
  meta: RobotApiRequestMeta,
|}

export type DeleteRobotSessionAction = {|
  type: DELETE_ROBOT_SESSION,
  payload: {| robotName: string, sessionId: string |},
  meta: RobotApiRequestMeta,
|}

export type DeleteRobotSessionSuccessAction = {|
  type: DELETE_ROBOT_SESSION_SUCCESS,
  payload: {| robotName: string, ...RobotSessionResponse |},
  meta: RobotApiRequestMeta,
|}

export type DeleteRobotSessionFailureAction = {|
  type: DELETE_ROBOT_SESSION_FAILURE,
  payload: {| robotName: string, error: RobotApiV2ErrorResponseBody |},
  meta: RobotApiRequestMeta,
|}

export type FetchRobotSessionAction = {|
  type: FETCH_ROBOT_SESSION,
  payload: {| robotName: string, sessionId: string |},
  meta: RobotApiRequestMeta,
|}

export type FetchRobotSessionSuccessAction = {|
  type: FETCH_ROBOT_SESSION_SUCCESS,
  payload: {| robotName: string, ...RobotSessionResponse |},
  meta: RobotApiRequestMeta,
|}

export type FetchRobotSessionFailureAction = {|
  type: FETCH_ROBOT_SESSION_FAILURE,
  payload: {| robotName: string, error: RobotApiV2ErrorResponseBody |},
  meta: RobotApiRequestMeta,
|}

export type UpdateRobotSessionAction = {|
  type: UPDATE_ROBOT_SESSION,
  payload: {|
    robotName: string,
    sessionId: string,
    command: RobotSessionUpdate,
  |},
  meta: RobotApiRequestMeta,
|}

export type UpdateRobotSessionSuccessAction = {|
  type: UPDATE_ROBOT_SESSION_SUCCESS,
  payload: {| robotName: string, ...RobotSessionUpdateResponse |},
  meta: RobotApiRequestMeta,
|}

export type UpdateRobotSessionFailureAction = {|
  type: UPDATE_ROBOT_SESSION_FAILURE,
  payload: {| robotName: string, error: RobotApiV2ErrorResponseBody |},
  meta: RobotApiRequestMeta,
|}

export type RobotSessionAction =
  | CreateRobotSessionAction
  | CreateRobotSessionSuccessAction
  | CreateRobotSessionFailureAction
  | DeleteRobotSessionAction
  | DeleteRobotSessionSuccessAction
  | DeleteRobotSessionFailureAction
  | FetchRobotSessionAction
  | FetchRobotSessionSuccessAction
  | FetchRobotSessionFailureAction
  | UpdateRobotSessionAction
  | UpdateRobotSessionSuccessAction
  | UpdateRobotSessionFailureAction

export type SessionsById = $Shape<{|
  [id: string]: RobotSessionData,
|}>

export type PerRobotSessionState = $Shape<
  $ReadOnly<{|
    robotSessions: SessionsById | null,
  |}>
>

export type SessionState = $Shape<
  $ReadOnly<{|
    [robotName: string]: void | PerRobotSessionState,
  |}>
>
