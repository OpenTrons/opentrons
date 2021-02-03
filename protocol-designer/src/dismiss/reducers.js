// @flow
import { combineReducers } from 'redux'
import { handleActions } from 'redux-actions'
import omit from 'lodash/omit'

import { getPDMetadata } from '../file-types'
import { PRESAVED_STEP_ID } from '../steplist/types'
import type { Reducer } from 'redux'
import type { DismissFormWarning, DismissTimelineWarning } from './actions'
import type { BaseState, Action } from '../types'
import type { LoadFileAction } from '../load-file'
import type {
  CancelStepFormAction,
  DeleteStepAction,
  DeleteMultipleStepsAction,
} from '../steplist/actions'
import type { StepIdType } from '../form-types'

export type WarningType = string

export type DismissedWarningsAllSteps = {
  [stepId: StepIdType]: ?Array<WarningType>,
  ...
}
export type DismissedWarningState = {|
  form: DismissedWarningsAllSteps,
  timeline: DismissedWarningsAllSteps,
|}

// NOTE(mc, 2020-06-04): `handleActions` cannot be strictly typed
const dismissedWarnings: Reducer<DismissedWarningState, any> = handleActions(
  {
    DISMISS_FORM_WARNING: (
      state: DismissedWarningState,
      action: DismissFormWarning
    ): DismissedWarningState => {
      const { type } = action.payload
      const stepId = action.payload.stepId
      return {
        ...state,
        form: {
          ...state.form,
          [stepId]: [...(state.form[stepId] || []), type],
        },
      }
    },
    DISMISS_TIMELINE_WARNING: (
      state: DismissedWarningState,
      action: DismissTimelineWarning
    ): DismissedWarningState => {
      const { type } = action.payload
      const stepId = action.payload.stepId
      return {
        ...state,
        timeline: {
          ...state.timeline,
          [stepId]: [...(state.timeline[stepId] || []), type],
        },
      }
    },
    DELETE_STEP: (
      state: DismissedWarningState,
      action: DeleteStepAction
    ): DismissedWarningState => {
      // remove key for deleted step
      const stepId = action.payload
      return {
        form: omit(state.form, stepId),
        timeline: omit(state.timeline, stepId),
      }
    },
    DELETE_MULTIPLE_STEPS: (
      state: DismissedWarningState,
      action: DeleteMultipleStepsAction
    ): DismissedWarningState => {
      const stepIds = action.payload
      return {
        form: omit(state.form, stepIds),
        timeline: omit(state.timeline, stepIds),
      }
    },
    LOAD_FILE: (
      state: DismissedWarningState,
      action: LoadFileAction
    ): DismissedWarningState =>
      getPDMetadata(action.payload.file).dismissedWarnings,
    CANCEL_STEP_FORM: (
      state: DismissedWarningState,
      action: CancelStepFormAction
    ): DismissedWarningState => ({
      form: omit(state.form, PRESAVED_STEP_ID),
      timeline: omit(state.timeline, PRESAVED_STEP_ID),
    }),
  },
  { form: {}, timeline: {} }
)

export const _allReducers = {
  dismissedWarnings,
}

export type RootState = {|
  dismissedWarnings: DismissedWarningState,
|}

export const rootReducer: Reducer<RootState, Action> = combineReducers(
  _allReducers
)

export const rootSelector = (state: BaseState): RootState => state.dismiss
