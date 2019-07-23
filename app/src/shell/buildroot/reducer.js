// @flow
import type { Action } from '../../types'
import type { BuildrootState } from './types'

import {
  passRobotApiRequestAction,
  passRobotApiResponseAction,
  passRobotApiErrorAction,
} from '../../robot-api'
import * as actions from './actions'

export const INITIAL_STATE: BuildrootState = {
  seen: false,
  info: null,
  downloadProgress: null,
  downloadError: null,
  session: null,
}

export const initialSession = (robotName: string) => ({
  robotName,
  triggerUpdate: false,
  uploadStarted: false,
  committed: false,
  restarted: false,
  error: false,
  token: null,
  pathPrefix: null,
  stage: null,
  progress: null,
})

export function buildrootReducer(
  state: BuildrootState = INITIAL_STATE,
  action: Action
): BuildrootState {
  switch (action.type) {
    case actions.BR_UPDATE_INFO:
      return { ...state, info: action.payload }

    case actions.BR_SET_UPDATE_SEEN:
      return { ...state, seen: true }

    case actions.BR_DOWNLOAD_PROGRESS:
      return { ...state, downloadProgress: action.payload }

    case actions.BR_DOWNLOAD_ERROR:
      return { ...state, downloadError: action.payload }

    case actions.BR_START_UPDATE:
      return { ...state, session: initialSession(action.payload) }

    case actions.BR_UPLOAD_FILE:
      return { ...state, session: { ...state.session, uploadStarted: true } }

    case actions.BR_PREMIGRATION_DONE:
      return { ...state, session: { ...state.session, triggerUpdate: true } }

    case actions.BR_CLEAR_SESSION:
      return { ...state, session: null }

    case actions.BR_UNEXPECTED_ERROR:
      return { ...state, session: { ...state.session, error: true } }
  }

  // HTTP API responses are not strongly typed, so check them separately
  const apiRequest = passRobotApiRequestAction(action)
  const apiResponse = passRobotApiResponseAction(action)
  const apiError = passRobotApiErrorAction(action)

  if (apiRequest !== null) {
    if (apiRequest.meta.buildrootCommit === true) {
      return { ...state, session: { ...state.session, committed: true } }
    }

    if (apiRequest.meta.buildrootRestart === true) {
      return { ...state, session: { ...state.session, restarted: true } }
    }
  }

  if (apiResponse !== null) {
    if (
      apiResponse.meta.buildrootToken === true &&
      typeof apiResponse.meta.buildrootPrefix === 'string' &&
      typeof apiResponse.payload.body.token === 'string'
    ) {
      const { host } = apiResponse.payload

      return {
        ...state,
        session: {
          ...state.session,
          robotName: host.name,
          triggerUpdate: false,
          token: apiResponse.payload.body.token,
          pathPrefix: apiResponse.meta.buildrootPrefix,
        },
      }
    }

    if (
      apiResponse.meta.buildrootStatus === true &&
      typeof apiResponse.payload.body.stage === 'string'
    ) {
      const { stage, progress } = apiResponse.payload.body

      return {
        ...state,
        session: {
          ...state.session,
          stage,
          progress:
            typeof progress === 'number' ? Math.round(progress * 100) : null,
        },
      }
    }
  }

  if (apiError !== null) {
    if (
      apiError.meta.buildrootRetry === true ||
      apiError.meta.buildrootCommit === true ||
      apiError.meta.buildrootRestart === true
    ) {
      return { ...state, session: { ...state.session, error: true } }
    }
  }

  return state
}
