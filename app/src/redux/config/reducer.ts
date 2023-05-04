import type { Action } from '../types'
import { INITIALIZED, VALUE_UPDATED } from './constants'
import type { ConfigState } from './types'
import { setIn } from '@thi.ng/paths'

// config reducer
export function configReducer(
  state: ConfigState = null,
  action: Action
): ConfigState {
  switch (action.type) {
    case INITIALIZED: {
      return action.payload.config
    }

    case VALUE_UPDATED: {
      if (state === null) return state
      return setIn(state, action.payload.path, action.payload.value)
    }
  }

  return state
}
