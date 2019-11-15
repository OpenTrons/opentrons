// @flow
import { combineReducers } from 'redux'
import { handleActions } from 'redux-actions'
import pickBy from 'lodash/pickBy'
import uniq from 'lodash/uniq'
import { rehydrate } from '../persist'

import type { Action } from '../types'
import type { HintKey } from './index'
import type { AddHintAction, RemoveHintAction } from './actions'
import type { NavigateToPageAction } from '../navigation/actions'

type HintReducerState = Array<HintKey>
const hints = handleActions(
  {
    ADD_HINT: (
      state: HintReducerState,
      action: AddHintAction
    ): HintReducerState => uniq([...state, action.payload.hintKey]),

    // going to the steplist page triggers 'deck_setup_explanation' hint
    NAVIGATE_TO_PAGE: (
      state: HintReducerState,
      action: NavigateToPageAction
    ): HintReducerState =>
      action.payload === 'steplist'
        ? uniq([...state, 'deck_setup_explanation'])
        : state,
  },
  []
)

type DismissedHintReducerState = { [HintKey]: { rememberDismissal: boolean } }
const dismissedHintsInitialState = {}
const dismissedHints = handleActions(
  {
    // only rehydrate "rememberDismissal" hints
    REHYDRATE_PERSISTED: () =>
      rehydrate('tutorial.dismissedHints', dismissedHintsInitialState),
    REMOVE_HINT: (
      state: DismissedHintReducerState,
      action: RemoveHintAction
    ): DismissedHintReducerState => {
      const { hintKey, rememberDismissal } = action.payload
      return { ...state, [hintKey]: { rememberDismissal } }
    },
    CLEAR_ALL_HINT_DISMISSALS: () => dismissedHintsInitialState,
  },
  dismissedHintsInitialState
)

export function dismissedHintsPersist(state: DismissedHintReducerState) {
  // persist only 'rememberDismissal' hints
  return pickBy(
    state,
    (h: $Values<DismissedHintReducerState>) => h && h.rememberDismissal
  )
}

const _allReducers = {
  hints,
  dismissedHints,
}

export type RootState = {
  hints: HintReducerState,
  dismissedHints: DismissedHintReducerState,
}

export const rootReducer = combineReducers<_, Action>(_allReducers)
