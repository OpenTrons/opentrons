// general constants

// restart statuses
export const RESTART_PENDING_STATUS: 'restart-pending' = 'restart-pending'
export const RESTART_IN_PROGRESS_STATUS: 'restart-in-progress' =
  'restart-in-progress'
export const RESTART_FAILED_STATUS: 'restart-failed' = 'restart-failed'
export const RESTART_SUCCEEDED_STATUS: 'restart-succeeded' = 'restart-succeeded'

// action type strings

export const RESTART: 'robotAdmin:RESTART' = 'robotAdmin:RESTART'

export const RESTART_SUCCESS: 'robotAdmin:RESTART_SUCCESS' =
  'robotAdmin:RESTART_SUCCESS'

export const RESTART_FAILURE: 'robotAdmin:RESTART_FAILURE' =
  'robotAdmin:RESTART_FAILURE'

export const FETCH_RESET_CONFIG_OPTIONS: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS' =
  'robotAdmin:FETCH_RESET_CONFIG_OPTIONS'

export const FETCH_RESET_CONFIG_OPTIONS_SUCCESS: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_SUCCESS' =
  'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_SUCCESS'

export const FETCH_RESET_CONFIG_OPTIONS_FAILURE: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_FAILURE' =
  'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_FAILURE'

export const RESET_CONFIG: 'robotAdmin:RESET_CONFIG' = 'robotAdmin:RESET_CONFIG'

export const RESET_CONFIG_SUCCESS: 'robotAdmin:RESET_CONFIG_SUCCESS' =
  'robotAdmin:RESET_CONFIG_SUCCESS'

export const RESET_CONFIG_FAILURE: 'robotAdmin:RESET_CONFIG_FAILURE' =
  'robotAdmin:RESET_CONFIG_FAILURE'

export const RESTART_STATUS_CHANGED: 'robotAdmin:RESTART_STATUS_CHANGED' =
  'robotAdmin:RESTART_STATUS_CHANGED'

export const SYNC_SYSTEM_TIME: 'robotAdmin:SYNC_SYSTEM_TIME' =
  'robotAdmin:SYNC_SYSTEM_TIME'

// http paths

export const LABWARE_OFFSETS_PATH: '/labwareOffsets' = '/labwareOffsets'

export const RESTART_PATH: '/server/restart' = '/server/restart'

export const SETTINGS_RESET_PATH: '/settings/reset' = '/settings/reset'

export const SETTINGS_RESET_OPTIONS_PATH: '/settings/reset/options' =
  '/settings/reset/options'

export const SYSTEM_TIME_PATH: '/system/time' = '/system/time'
