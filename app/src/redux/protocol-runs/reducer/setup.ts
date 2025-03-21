import * as Constants from '../constants'
import type { RunSetupStatus, ProtocolRunAction } from '../types'

const INITIAL_SETUP_STEP_STATE = { complete: false, required: true }

export const INITIAL_RUN_SETUP_STATE: RunSetupStatus = {
  [Constants.ROBOT_CALIBRATION_STEP_KEY]: INITIAL_SETUP_STEP_STATE,
  [Constants.MODULE_SETUP_STEP_KEY]: INITIAL_SETUP_STEP_STATE,
  [Constants.LPC_STEP_KEY]: INITIAL_SETUP_STEP_STATE,
  [Constants.LABWARE_SETUP_STEP_KEY]: INITIAL_SETUP_STEP_STATE,
}

export function setupReducer(
  state: RunSetupStatus = INITIAL_RUN_SETUP_STATE,
  action: ProtocolRunAction
): RunSetupStatus {
  switch (action.type) {
    case Constants.UPDATE_RUN_SETUP_STEPS_COMPLETE:
      return Constants.SETUP_STEP_KEYS.reduce(
        (currentState, step) => ({
          ...currentState,
          [step]: {
            complete:
              action.payload.complete[step] ?? currentState[step].complete,
            required: currentState[step].required,
          },
        }),
        state
      )

    case Constants.UPDATE_RUN_SETUP_STEPS_REQUIRED:
      return Constants.SETUP_STEP_KEYS.reduce(
        (currentState, step) => ({
          ...currentState,
          [step]: {
            required:
              action.payload.required[step] ?? currentState[step].required,
            complete: currentState[step].complete,
          },
        }),
        state
      )

    default:
      return state
  }
}
