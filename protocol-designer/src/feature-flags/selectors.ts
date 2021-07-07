// @flow
import { createSelector } from 'reselect'
import { getFlagsFromQueryParams } from './utils'

import type { BaseState, Selector } from '../types'
import type { Flags } from './types'

export const getFeatureFlagData = (state: BaseState): Flags => ({
  ...state.featureFlags.flags,
  ...getFlagsFromQueryParams(),
})

export const getEnabledPrereleaseMode: Selector<?boolean> = createSelector(
  getFeatureFlagData,
  flags => flags.PRERELEASE_MODE
)

export const getDisableModuleRestrictions: Selector<?boolean> = createSelector(
  getFeatureFlagData,
  flags => flags.OT_PD_DISABLE_MODULE_RESTRICTIONS
)
