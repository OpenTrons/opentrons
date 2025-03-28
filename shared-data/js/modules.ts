import magneticModuleV1 from '../module/definitions/3/magneticModuleV1.json'
import magneticModuleV2 from '../module/definitions/3/magneticModuleV2.json'
import temperatureModuleV1 from '../module/definitions/3/temperatureModuleV1.json'
import temperatureModuleV2 from '../module/definitions/3/temperatureModuleV2.json'
import thermocyclerModuleV1 from '../module/definitions/3/thermocyclerModuleV1.json'
import thermocyclerModuleV2 from '../module/definitions/3/thermocyclerModuleV2.json'
import heaterShakerModuleV1 from '../module/definitions/3/heaterShakerModuleV1.json'
import magneticBlockV1 from '../module/definitions/3/magneticBlockV1.json'
import absorbanceReaderV1 from '../module/definitions/3/absorbanceReaderV1.json'
import flexStackerModuleV1 from '../module/definitions/3/flexStackerModuleV1.json'

import {
  MAGDECK,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  TEMPDECK,
  TEMPERATURE_MODULE_V1,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER,
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  ABSORBANCE_READER_V1,
  FLEX_STACKER_MODULE_V1,
} from './constants'

import type {
  ModuleModel,
  ModuleModelWithLegacy,
  ModuleType,
  ModuleDefinition,
} from './types'

// TODO(bc, 2021-09-18): generate typescript types directly from JSON schema
// having to maintain TS types side by side with the schema is a liability
export const getModuleDef2 = (moduleModel: ModuleModel): ModuleDefinition => {
  switch (moduleModel) {
    case MAGNETIC_MODULE_V1:
      return magneticModuleV1 as ModuleDefinition

    case MAGNETIC_MODULE_V2:
      return (magneticModuleV2 as unknown) as ModuleDefinition

    case TEMPERATURE_MODULE_V1:
      return temperatureModuleV1 as ModuleDefinition

    case TEMPERATURE_MODULE_V2:
      return (temperatureModuleV2 as unknown) as ModuleDefinition

    case THERMOCYCLER_MODULE_V1:
      return thermocyclerModuleV1 as ModuleDefinition

    case THERMOCYCLER_MODULE_V2:
      return (thermocyclerModuleV2 as unknown) as ModuleDefinition

    case HEATERSHAKER_MODULE_V1:
      return (heaterShakerModuleV1 as unknown) as ModuleDefinition

    case MAGNETIC_BLOCK_V1:
      return (magneticBlockV1 as unknown) as ModuleDefinition

    case ABSORBANCE_READER_V1:
      return (absorbanceReaderV1 as unknown) as ModuleDefinition

    case FLEX_STACKER_MODULE_V1:
      return (flexStackerModuleV1 as unknown) as ModuleDefinition

    default:
      throw new Error(`Invalid module model ${moduleModel as string}`)
  }
}

export function normalizeModuleModel(
  legacyModule: ModuleModelWithLegacy
): ModuleModel {
  switch (legacyModule) {
    case TEMPDECK:
      return TEMPERATURE_MODULE_V1

    case MAGDECK:
      return MAGNETIC_MODULE_V1

    case THERMOCYCLER:
      return THERMOCYCLER_MODULE_V1

    default:
      throw new Error(`Invalid legacy module model ${legacyModule as string}`)
  }
}

export function getModuleType(moduleModel: ModuleModel): ModuleType {
  return getModuleDef2(moduleModel).moduleType
}

// use module model (not type!) to get model-specific displayName for UI
export function getModuleDisplayName(moduleModel: ModuleModel): string {
  return getModuleDef2(moduleModel).displayName
}

export function checkModuleCompatibility(
  modelA: ModuleModel,
  modelB: ModuleModel
): boolean {
  const bDef = getModuleDef2(modelB)
  return modelA === modelB || bDef.compatibleWith.includes(modelA)
}
