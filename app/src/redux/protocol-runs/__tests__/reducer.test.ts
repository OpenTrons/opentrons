import { describe, it, expect } from 'vitest'

import { protocolRunReducer } from '../reducer'
import {
  updateRunSetupStepsComplete,
  updateRunSetupStepsRequired,
} from '../actions'
import * as Constants from '../constants'

describe('protocol runs reducer', () => {
  const INITIAL = {
    [Constants.ROBOT_CALIBRATION_STEP_KEY]: {
      required: true,
      complete: false,
    },
    [Constants.MODULE_SETUP_STEP_KEY]: { required: true, complete: false },
    [Constants.LPC_STEP_KEY]: { required: true, complete: false },
    [Constants.LABWARE_SETUP_STEP_KEY]: {
      required: true,
      complete: false,
    },
  }
  it('establishes an empty state if you tell it one', () => {
    const nextState = protocolRunReducer(
      undefined,
      updateRunSetupStepsComplete('some-run-id', {})
    )
    expect(nextState['some-run-id']?.setup).toEqual(INITIAL)
  })
  it('updates complete based on an action', () => {
    const nextState = protocolRunReducer(
      {
        'some-run-id': {
          setup: {
            ...INITIAL,
            [Constants.LABWARE_SETUP_STEP_KEY]: {
              complete: true,
              required: true,
            },
          },
        },
      },
      updateRunSetupStepsComplete('some-run-id', {
        [Constants.LPC_STEP_KEY]: true,
      })
    )
    expect(nextState['some-run-id']?.setup).toEqual({
      ...INITIAL,
      [Constants.LABWARE_SETUP_STEP_KEY]: {
        required: true,
        complete: true,
      },
      [Constants.LPC_STEP_KEY]: { required: true, complete: true },
    })
  })
  it('updates required based on an action', () => {
    const nextState = protocolRunReducer(
      {
        'some-run-id': {
          setup: INITIAL,
        },
      },
      updateRunSetupStepsRequired('some-run-id', {
        [Constants.LABWARE_SETUP_STEP_KEY]: false,
      })
    )
    expect(nextState['some-run-id']?.setup).toEqual({
      ...INITIAL,
      [Constants.LABWARE_SETUP_STEP_KEY]: {
        required: false,
        complete: false,
      },
    })
  })
})
