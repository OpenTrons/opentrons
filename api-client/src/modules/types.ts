import type {
  TemperatureModuleModel,
  ThermocyclerModuleModel,
  MagneticModuleModel,
  HeaterShakerModuleModel,
  AbsorbanceReaderModel,
  FlexStackerModuleModel,
  TEMPERATURE_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  ABSORBANCE_READER_TYPE,
  FLEX_STACKER_MODULE_TYPE,
} from '@opentrons/shared-data'

import type * as ApiTypes from './api-types'

export * from './api-types'

// common types

export type CommonModuleInfo = Omit<
  ApiTypes.ApiBaseModule,
  'model' | 'displayName' | 'moduleModel'
>

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

export interface AbsorbanceReaderModule extends CommonModuleInfo {
  moduleType: typeof ABSORBANCE_READER_TYPE
  moduleModel: AbsorbanceReaderModel
  data: ApiTypes.AbsorbanceReaderData
}
export interface FlexStackerModule extends CommonModuleInfo {
  moduleType: typeof FLEX_STACKER_MODULE_TYPE
  moduleModel: FlexStackerModuleModel
  data: ApiTypes.FlexStackerData
  moduleOffset?: ApiTypes.ModuleOffset
}
export type AttachedModule =
  | TemperatureModule
  | MagneticModule
  | ThermocyclerModule
  | HeaterShakerModule
  | AbsorbanceReaderModule
  | FlexStackerModule

export interface ModulesMeta {
  cursor: number
  totalLength: number
}

export interface Modules {
  data: AttachedModule[]
  meta: ModulesMeta
}
