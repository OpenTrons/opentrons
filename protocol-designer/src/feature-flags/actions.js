// @flow
import type { Flags } from './types'

export type SetFeatureFlagAction = {|
  type: 'SET_FEATURE_FLAGS',
  payload: Flags,
|}

export const setFeatureFlags = (payload: Flags): SetFeatureFlagAction => ({
  type: 'SET_FEATURE_FLAGS',
  payload,
})
