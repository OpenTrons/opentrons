// @flow
// robot HTTP API client module
import {combineReducers} from 'redux'
import {calibrationReducer, type CalibrationAction} from './calibration'
import {healthReducer, type HealthAction} from './health'
import {healthCheckReducer, type HealthCheckAction} from './health-check'
import {motorsReducer, type MotorsAction} from './motors'
import {pipettesReducer, type PipettesAction} from './pipettes'
import {robotReducer, type RobotAction} from './robot'
import {serverReducer, type ServerAction} from './server'
import {settingsReducer, type SettingsAction} from './settings'
import {wifiReducer, type WifiAction} from './wifi'

export const reducer = combineReducers({
  calibration: calibrationReducer,
  health: healthReducer,
  healthCheck: healthCheckReducer,
  motors: motorsReducer,
  pipettes: pipettesReducer,
  robot: robotReducer,
  server: serverReducer,
  settings: settingsReducer,
  wifi: wifiReducer
})

export * from './types'

export type {
  DeckCalStartState,
  DeckCalCommandState,
  JogAxis,
  JogDirection,
  JogStep,
  DeckCalPoint
} from './calibration'

export type {
  RobotHealth,
  HealthSuccessAction,
  HealthFailureAction
} from './health'

export type {
  Pipette,
  PipettesResponse,
  RobotPipettes
} from './pipettes'

export type {
  RobotMove,
  RobotHome,
  RobotLights
} from './robot'

export type {
  RobotServerUpdate,
  RobotServerRestart,
  RobotServerUpdateIgnore
} from './server'

export type {
  Setting
} from './settings'

export type {
  WifiListResponse,
  WifiStatusResponse,
  WifiConfigureResponse,
  RobotWifiList,
  RobotWifiStatus,
  RobotWifiConfigure
} from './wifi'

export type State = $Call<typeof reducer>

export type Action =
  | CalibrationAction
  | HealthAction
  | HealthCheckAction
  | MotorsAction
  | PipettesAction
  | RobotAction
  | ServerAction
  | SettingsAction
  | WifiAction

export {
  startDeckCalibration,
  deckCalibrationCommand,
  setCalibrationJogStep,
  makeGetDeckCalibrationStartState,
  makeGetDeckCalibrationCommandState,
  getCalibrationJogStep
} from './calibration'

export {
  fetchHealth,
  makeGetRobotHealth
} from './health'

export {
  startHealthCheck,
  stopHealthCheck,
  setHealthCheckId,
  clearHealthCheckId,
  resetHealthCheck,
  healthCheckMiddleware,
  makeGetHealthCheckOk
} from './health-check'

export {
  disengagePipetteMotors
} from './motors'

export {
  fetchPipettes,
  makeGetRobotPipettes
} from './pipettes'

export {
  home,
  clearHomeResponse,
  moveRobotTo,
  clearRobotMoveResponse,
  fetchRobotLights,
  setRobotLights,
  makeGetRobotMove,
  makeGetRobotHome,
  makeGetRobotLights
} from './robot'

export {
  updateRobotServer,
  restartRobotServer,
  makeGetAvailableRobotUpdate,
  makeGetRobotUpdateRequest,
  makeGetRobotRestartRequest,
  getAnyRobotUpdateAvailable,
  fetchHealthAndIgnored,
  fetchIgnoredUpdate,
  setIgnoredUpdate,
  makeGetRobotIgnoredUpdateRequest
} from './server'

export {
  fetchSettings,
  setSettings,
  makeGetRobotSettings
} from './settings'

export {
  fetchWifiList,
  fetchWifiStatus,
  clearConfigureWifiResponse,
  configureWifi,
  makeGetRobotWifiStatus,
  makeGetRobotWifiList,
  makeGetRobotWifiConfigure
} from './wifi'
