// @flow
import * as actions from './actions'
import { rootReducer, type RootState } from './reducers'
import * as selectors from './selectors'

type HintKey =
  // normal hints
  | 'add_liquids_and_labware'
  | 'deck_setup_explanation'
  | 'module_without_labware'
  // blocking hints
  | 'custom_labware_with_modules'

export { actions, rootReducer, selectors }

export type { RootState, HintKey }
