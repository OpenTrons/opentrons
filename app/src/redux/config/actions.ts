import * as Constants from './constants'
import type * as Types from './types'

// request a config value update
export const updateConfigValue = (
  path: string,
  value: unknown
): Types.UpdateConfigValueAction => ({
  type: Constants.UPDATE_VALUE,
  payload: { path, value },
  meta: { shell: true },
})

// request a config value reset to default
export const resetConfigValue = (
  path: string
): Types.ResetConfigValueAction => ({
  type: Constants.RESET_VALUE,
  payload: { path },
  meta: { shell: true },
})

// request a boolean config value toggle
export const toggleConfigValue = (
  path: string
): Types.ToggleConfigValueAction => ({
  type: Constants.TOGGLE_VALUE,
  payload: { path },
  meta: { shell: true },
})

// add a unique value into an array config if it's not already in there
export const addUniqueConfigValue = (
  path: string,
  value: unknown
): Types.AddUniqueConfigValueAction => ({
  type: Constants.ADD_UNIQUE_VALUE,
  payload: { path, value },
  meta: { shell: true },
})

// remove a unique from an array config if it's in there
export const subtractConfigValue = (
  path: string,
  value: unknown
): Types.SubtractConfigValueAction => ({
  type: Constants.SUBTRACT_VALUE,
  payload: { path, value },
  meta: { shell: true },
})

// config file has been initialized
export const configInitialized = (
  config: Types.Config
): Types.ConfigInitializedAction => ({
  type: Constants.INITIALIZED,
  payload: { config },
  meta: { shell: true },
})

// config value has been updated
export const configValueUpdated = (
  path: string,
  value: unknown
): Types.ConfigValueUpdatedAction => ({
  type: Constants.VALUE_UPDATED,
  payload: { path, value },
  meta: { shell: true },
})

export function toggleDevtools(): Types.ToggleConfigValueAction {
  return toggleConfigValue('devtools')
}

export function toggleDevInternalFlag(
  flag: Types.DevInternalFlag
): Types.ToggleConfigValueAction {
  return toggleConfigValue(`devInternal.${flag}`)
}

// TODO(mc, 2020-02-05): move to `discovery` module
export function addManualIp(ip: string): Types.AddUniqueConfigValueAction {
  return addUniqueConfigValue('discovery.candidates', ip)
}

// TODO(mc, 2020-02-05): move to `discovery` module
export function removeManualIp(ip: string): Types.SubtractConfigValueAction {
  return subtractConfigValue('discovery.candidates', ip)
}
