import { setIn } from '@thi.ng/paths'
import { INITIALIZED, VALUE_UPDATED } from './constants'

import type { Action } from '../types'
import type { ConfigState } from './types'

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
      return setIn(state, action.payload.path as never, action.payload.value)
    }
  }

  return state
}
