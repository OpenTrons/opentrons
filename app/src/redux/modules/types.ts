import type { RobotApiRequestMeta } from '../robot-api/types'
import type {
  TemperatureModuleModel,
  ThermocyclerModuleModel,
  MagneticModuleModel,
  HeaterShakerModuleModel,
  AbsorbanceReaderModel,
  TEMPERATURE_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  ABSORBANCE_READER_TYPE,
  FLEX_STACKER_MODULE_TYPE,
  FlexStackerModuleModel,
} from '@opentrons/shared-data'

import type { ModuleOffset } from '@opentrons/api-client'

import type * as ApiTypes from './api-types'
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
  moduleOffset?: ModuleOffset
}

export interface MagneticModule extends CommonModuleInfo {
  moduleType: typeof MAGNETIC_MODULE_TYPE
  moduleModel: MagneticModuleModel
  data: ApiTypes.MagneticData
  moduleOffset?: ModuleOffset
}

export interface ThermocyclerModule extends CommonModuleInfo {
  moduleType: typeof THERMOCYCLER_MODULE_TYPE
  moduleModel: ThermocyclerModuleModel
  data: ApiTypes.ThermocyclerData
  moduleOffset?: ModuleOffset
}

export interface HeaterShakerModule extends CommonModuleInfo {
  moduleType: typeof HEATERSHAKER_MODULE_TYPE
  moduleModel: HeaterShakerModuleModel
  data: ApiTypes.HeaterShakerData
  moduleOffset?: ModuleOffset
}

export interface AbsorbanceReaderModule extends CommonModuleInfo {
  moduleType: typeof ABSORBANCE_READER_TYPE
  moduleModel: AbsorbanceReaderModel
  data: ApiTypes.AbsorbanceReaderData
  moduleOffset?: ModuleOffset
}

export interface FlexStackerModule extends CommonModuleInfo {
  moduleType: typeof FLEX_STACKER_MODULE_TYPE
  moduleModel: FlexStackerModuleModel
  data: ApiTypes.FlexStackerData
  moduleOffset?: ModuleOffset
}

export type AttachedModule =
  | TemperatureModule
  | MagneticModule
  | ThermocyclerModule
  | HeaterShakerModule
  | AbsorbanceReaderModule
  | FlexStackerModule
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
