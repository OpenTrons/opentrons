import type { RobotApiRequestMeta } from '../robot-api/types'
import type {
  TemperatureModuleModel,
  ThermocyclerModuleModel,
  MagneticModuleModel,
  HeaterShakerModuleModel,
} from '@opentrons/shared-data'

import {
  TEMPERATURE_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
} from '@opentrons/shared-data'

import * as ApiTypes from './api-types'
export * from './api-types'

// common types

export type CommonModuleInfo = Omit<
  ApiTypes.ApiBaseModule,
  'model' | 'displayName' | 'moduleModel'
>

export type Slot =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'

export interface TemperatureModule extends CommonModuleInfo {
  moduleType: typeof TEMPERATURE_MODULE_TYPE
  moduleModel: TemperatureModuleModel
  data: ApiTypes.TemperatureData
}

export interface MagneticModule extends CommonModuleInfo {
  moduleType: typeof MAGNETIC_MODULE_TYPE
  moduleModel: MagneticModuleModel
  data: ApiTypes.MagneticData
}

export interface ThermocyclerModule extends CommonModuleInfo {
  moduleType: typeof THERMOCYCLER_MODULE_TYPE
  moduleModel: ThermocyclerModuleModel
  data: ApiTypes.ThermocyclerData
}

export interface HeaterShakerModule extends CommonModuleInfo {
  moduleType: typeof HEATERSHAKER_MODULE_TYPE
  moduleModel: HeaterShakerModuleModel
  data: ApiTypes.HeaterShakerData
}

export type AttachedModule =
  | TemperatureModule
  | MagneticModule
  | ThermocyclerModule
  | HeaterShakerModule
// action object types

export interface MatchedModule {
  slot: Slot
  module: AttachedModule
}

// update modules

export interface UpdateModuleAction {
  type: 'modules:UPDATE_MODULE'
  payload: { robotName: string; moduleId: string }
  meta: RobotApiRequestMeta | {}
}

export interface UpdateModuleSuccessAction {
  type: 'modules:UPDATE_MODULE_SUCCESS'
  payload: {
    robotName: string
    moduleId: string
    message: string
  }
  meta: RobotApiRequestMeta
}

export interface UpdateModuleFailureAction {
  type: 'modules:UPDATE_MODULE_FAILURE'
  payload: {
    robotName: string
    moduleId: string
    error: {}
  }
  meta: RobotApiRequestMeta
}

// action union

export type ModulesAction =
  | UpdateModuleAction
  | UpdateModuleSuccessAction
  | UpdateModuleFailureAction

// state types

export type AttachedModulesById = Partial<{
  readonly [moduleId: string]: AttachedModule
}>

export interface PerRobotModulesState {
  readonly modulesById: AttachedModulesById | null
}

export type ModulesState = Partial<{
  readonly [robotName: string]: undefined | PerRobotModulesState
}>
