import type { RobotApiRequestMeta } from '../robot-api/types'

// common types

export type RobotRestartStatus =
  | 'restart-pending'
  | 'restart-in-progress'
  | 'restart-succeeded'
  | 'restart-timed-out'
  | 'restart-failed'

export type RobotAdminStatus =
  | 'up'
  | 'down'
  | 'restart-pending'
  | 'restarting'
  | 'restart-failed'

export interface ResetConfigOption {
  id: string
  name: string
  description: string
}

export interface ResetConfigRequest {
  resetLabwareOffsets: boolean

  /** Options to pass as-is to `POST /settings/reset`. */
  postSettingsResetOptions: {
    [optionId: string]: boolean
  }
}

// action types

export interface RestartRobotAction {
  type: 'robotAdmin:RESTART'
  payload: { robotName: string }
  meta: Partial<RobotApiRequestMeta & { robot: true }>
}

export interface RestartStatusChangedAction {
  type: 'robotAdmin:RESTART_STATUS_CHANGED'
  payload: {
    robotName: string
    restartStatus: RobotRestartStatus
    bootId: string | null
    startTime: Date | null
  }
}

export interface RestartRobotSuccessAction {
  type: 'robotAdmin:RESTART_SUCCESS'
  payload: { robotName: string }
  meta: RobotApiRequestMeta | {}
}

export interface RestartRobotFailureAction {
  type: 'robotAdmin:RESTART_FAILURE'
  payload: { robotName: string; error: {} }
  meta: RobotApiRequestMeta
}

export interface FetchResetConfigOptionsAction {
  type: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS'
  payload: { robotName: string }
  meta: RobotApiRequestMeta | {}
}

export interface FetchResetConfigOptionsSuccessAction {
  type: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_SUCCESS'
  payload: { robotName: string; options: ResetConfigOption[] }
  meta: RobotApiRequestMeta
}

export interface FetchResetConfigOptionsFailureAction {
  type: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_FAILURE'
  payload: { robotName: string; error: {} }
  meta: RobotApiRequestMeta
}

export interface ResetConfigAction {
  type: 'robotAdmin:RESET_CONFIG'
  payload: { robotName: string; resets: ResetConfigRequest }
  meta: RobotApiRequestMeta | {}
}

export interface ResetConfigSuccessAction {
  type: 'robotAdmin:RESET_CONFIG_SUCCESS'
  payload: { robotName: string }
  meta: RobotApiRequestMeta
}

export interface ResetConfigFailureAction {
  type: 'robotAdmin:RESET_CONFIG_FAILURE'
  payload: { robotName: string; error: {} }
  meta: RobotApiRequestMeta
}

export interface SyncSystemTimeAction {
  type: 'robotAdmin:SYNC_SYSTEM_TIME'
  payload: { robotName: string }
  meta: RobotApiRequestMeta | {}
}

export type RobotAdminAction =
  | RestartRobotAction
  | RestartStatusChangedAction
  | RestartRobotSuccessAction
  | RestartRobotFailureAction
  | FetchResetConfigOptionsAction
  | FetchResetConfigOptionsSuccessAction
  | FetchResetConfigOptionsFailureAction
  | ResetConfigAction
  | ResetConfigSuccessAction
  | ResetConfigFailureAction
  | SyncSystemTimeAction

// state types

export interface RestartState {
  bootId: string | null
  startTime: Date | null
  status: RobotRestartStatus
}

export type PerRobotAdminState = Partial<{
  status: RobotAdminStatus
  restart: RestartState
  resetConfigOptions: ResetConfigOption[]
}>

export type RobotAdminState = Partial<{
  [robotName: string]: null | undefined | PerRobotAdminState
}>
