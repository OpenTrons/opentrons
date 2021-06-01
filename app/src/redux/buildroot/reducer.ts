import * as Constants from './constants'

import type { Reducer } from 'redux'
import type { Action } from '../types'
import type { BuildrootState, BuildrootUpdateSession } from './types'

export const INITIAL_STATE: BuildrootState = {
  seen: false,
  version: null,
  info: null,
  downloadProgress: null,
  downloadError: null,
  session: null,
}

export const initialSession = (
  robotName: string,
  session: BuildrootUpdateSession | null
): BuildrootUpdateSession => ({
  robotName,
  userFileInfo: session?.userFileInfo || null,
  step: null,
  token: null,
  pathPrefix: null,
  stage: null,
  progress: null,
  error: null,
})

export const buildrootReducer: Reducer<BuildrootState, Action> = (
  state = INITIAL_STATE,
  action
) => {
  switch (action.type) {
    case Constants.BR_UPDATE_VERSION: {
      return { ...state, version: action.payload }
    }

    case Constants.BR_UPDATE_INFO: {
      return { ...state, info: action.payload }
    }

    case Constants.BR_SET_UPDATE_SEEN: {
      return { ...state, seen: true }
    }

    case Constants.BR_DOWNLOAD_PROGRESS: {
      return { ...state, downloadProgress: action.payload }
    }

    case Constants.BR_DOWNLOAD_ERROR: {
      return { ...state, downloadError: action.payload }
    }

    case Constants.BR_START_UPDATE: {
      return {
        ...state,
        session: initialSession(action.payload.robotName, state.session),
      }
    }

    case Constants.BR_CREATE_SESSION: {
      const { host } = action.payload
      const session = state.session || initialSession(host.name, null)

      return {
        ...state,
        session: { ...session, step: Constants.GET_TOKEN },
      }
    }

    case Constants.BR_CREATE_SESSION_SUCCESS: {
      const { host, pathPrefix, token } = action.payload
      const session = state.session || initialSession(host.name, null)

      return {
        ...state,
        session: { ...session, pathPrefix, token },
      }
    }

    case Constants.BR_STATUS: {
      if (!state.session) return state

      const { stage, progress, message } = action.payload
      const currentError = state.session?.error || null

      return {
        ...state,
        session: {
          ...state.session,
          stage,
          progress: typeof progress === 'number' ? progress : null,
          error: stage === Constants.ERROR ? message : currentError,
        },
      }
    }

    case Constants.BR_USER_FILE_INFO: {
      return state.session
        ? {
            ...state,
            session: { ...state.session, userFileInfo: action.payload },
          }
        : state
    }

    case Constants.BR_START_PREMIGRATION: {
      return state.session
        ? {
            ...state,
            session: { ...state.session, step: Constants.PREMIGRATION },
          }
        : state
    }

    case Constants.BR_PREMIGRATION_DONE: {
      return state.session
        ? {
            ...state,
            session: { ...state.session, step: Constants.PREMIGRATION_RESTART },
          }
        : state
    }

    case Constants.BR_UPLOAD_FILE: {
      return state.session
        ? {
            ...state,
            session: { ...state.session, step: Constants.UPLOAD_FILE },
          }
        : state
    }

    case Constants.BR_FILE_UPLOAD_DONE: {
      return state.session
        ? {
            ...state,
            session: { ...state.session, step: Constants.PROCESS_FILE },
          }
        : state
    }

    case Constants.BR_SET_SESSION_STEP: {
      return state.session
        ? { ...state, session: { ...state.session, step: action.payload } }
        : state
    }

    case Constants.BR_CLEAR_SESSION: {
      return { ...state, session: null }
    }

    case Constants.BR_PREMIGRATION_ERROR:
    case Constants.BR_UNEXPECTED_ERROR: {
      return state.session
        ? {
            ...state,
            session: { ...state.session, error: action.payload.message },
          }
        : state
    }
  }

  return state
}
