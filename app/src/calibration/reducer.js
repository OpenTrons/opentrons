// @flow
import * as Constants from './constants'

import type { Action } from '../types'
import type { CalibrationState, PerRobotCalibrationState } from './types'

const INITIAL_STATE: CalibrationState = {}

const INITIAL_CALIBRATION_STATE: PerRobotCalibrationState = {
  deckCheck: null,
}

export function calibrationReducer(
  state: CalibrationState = INITIAL_STATE,
  action: Action
): CalibrationState {
  switch (action.type) {
    case Constants.FETCH_DECK_CHECK_SESSION_SUCCESS: {
      const { robotName, ...sessionState } = action.payload
      const robotState = state[robotName] || INITIAL_CALIBRATION_STATE

      return {
        ...state,
        [robotName]: {
          ...robotState,
          deckCheck: sessionState,
        },
      }
    }

    case Constants.END_DECK_CHECK_SESSION_SUCCESS: {
      const { robotName } = action.payload
      const robotState = state[robotName] || INITIAL_CALIBRATION_STATE

      return {
        ...state,
        [robotName]: {
          ...robotState,
          deckCheck: null,
        },
      }
    }
  }

  return state
}
