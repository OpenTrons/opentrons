import {
  requiredField,
  minimumWellCount,
  nonZero,
  composeErrors,
  minFieldValue,
  maxFieldValue,
  temperatureRangeFieldValue,
  realNumber,
  isTimeFormat,
  isTimeFormatMinutesSeconds,
} from './errors'
import {
  maskToInteger,
  maskToFloat,
  maskToTime,
  numberOrNull,
  onlyPositiveNumbers,
  defaultTo,
  composeMaskers,
  trimDecimals,
} from './processing'
import {
  MIN_TEMP_MODULE_TEMP,
  MAX_TEMP_MODULE_TEMP,
  MIN_HEATER_SHAKER_MODULE_TEMP,
  MAX_HEATER_SHAKER_MODULE_TEMP,
  MIN_TC_BLOCK_TEMP,
  MAX_TC_BLOCK_TEMP,
  MIN_TC_LID_TEMP,
  MAX_TC_LID_TEMP,
  MIN_TC_DURATION_SECONDS,
  MAX_TC_DURATION_SECONDS,
  MIN_HEATER_SHAKER_MODULE_RPM,
  MAX_HEATER_SHAKER_MODULE_RPM,
  MIN_HEATER_SHAKER_DURATION_SECONDS,
  MAX_HEATER_SHAKER_DURATION_SECONDS,
  MIN_TC_PROFILE_VOLUME,
  MAX_TC_PROFILE_VOLUME,
} from '../../constants'
import { getStagingAreaAddressableAreas } from '../../utils'
import type {
  LabwareEntity,
  PipetteEntity,
  InvariantContext,
  LabwareEntities,
  AdditionalEquipmentEntities,
  AdditionalEquipmentEntity,
  WasteChuteEntities,
  StagingAreaEntities,
  WasteChuteEntity,
  TrashBinEntity,
} from '@opentrons/step-generation'
import type { ValueMasker, ValueCaster } from './processing'
import type { StepFieldName } from '../../form-types'
import type {
  AddressableAreaName,
  CutoutId,
  LabwareLocation,
} from '@opentrons/shared-data'

export type { StepFieldName }

interface LabwareEntityWithTouchTip extends LabwareEntity {
  isTouchTipAllowed: boolean
}

interface WasteChuteEntityWithTouchTip extends WasteChuteEntity {
  isTouchTipAllowed: boolean
}

interface TrashBinEntityWithTouchTip extends TrashBinEntity {
  isTouchTipAllowed: boolean
}

type LabwareOrAdditionalEquipmentEntity =
  | LabwareEntityWithTouchTip
  | WasteChuteEntityWithTouchTip
  | TrashBinEntityWithTouchTip

const getLabwareOrAdditionalEquipmentEntity = (
  state: InvariantContext,
  id: string
): LabwareOrAdditionalEquipmentEntity | null => {
  if (state.labwareEntities[id] != null) {
    const labwareDisallowsTouchTip =
      state.labwareEntities[id]?.def.parameters.quirks?.includes(
        'touchTipDisabled'
      ) ?? false
    return {
      ...state.labwareEntities[id],
      isTouchTipAllowed: !labwareDisallowsTouchTip,
    }
  } else if (state.wasteChuteEntities[id] != null) {
    return {
      ...state.wasteChuteEntities[id],
      isTouchTipAllowed: false,
    }
  } else if (state.trashBinEntities[id] != null) {
    return {
      ...state.trashBinEntities[id],
      isTouchTipAllowed: false,
    }
  } else return null
}

const getIsAdapterLocation = (
  newLocation: string,
  labwareEntities: LabwareEntities
): boolean => {
  if (labwareEntities[newLocation] == null) return false
  return (
    labwareEntities[newLocation].def.allowedRoles?.includes('adapter') ?? false
  )
}
const getIsAdditionalEquipmentLocation = (
  newLocation: string,
  wasteChuteEntities: WasteChuteEntities,
  stagingAreaEntities: StagingAreaEntities
): boolean => {
  const stagingAreaCutoutIds = Object.values(stagingAreaEntities).map(
    equipment => {
      return equipment.location ?? ''
    }
  )
  const stagingAreaAddressableAreaNames = getStagingAreaAddressableAreas(
    stagingAreaCutoutIds as CutoutId[]
  )

  const isNewLocationInWasteChute =
    Object.values(wasteChuteEntities)[0]?.location === newLocation

  const isNewLocationInStagingArea =
    stagingAreaCutoutIds != null &&
    stagingAreaAddressableAreaNames.includes(newLocation as AddressableAreaName)

  return isNewLocationInWasteChute || isNewLocationInStagingArea
}

const getLabwareLocation = (
  state: InvariantContext,
  newLocationString: string
): LabwareLocation | null => {
  const isWasteChuteLocation =
    Object.values(state.wasteChuteEntities).find(
      aE => aE.location === newLocationString
    ) != null

  if (newLocationString === 'offDeck') {
    return 'offDeck'
  } else if (newLocationString in state.moduleEntities) {
    return { moduleId: newLocationString }
  } else if (
    newLocationString != null &&
    getIsAdapterLocation(newLocationString, state.labwareEntities)
  ) {
    return { labwareId: newLocationString }
  } else if (
    getIsAdditionalEquipmentLocation(
      newLocationString,
      state.wasteChuteEntities,
      state.stagingAreaEntities
    )
  ) {
    return {
      addressableAreaName: isWasteChuteLocation
        ? 'gripperWasteChute'
        : // TODO(bh, 2024-01-02): check new location against addressable areas via the deck definition
          (newLocationString as AddressableAreaName),
    }
  } else {
    return { slotName: newLocationString }
  }
}

const getPipetteEntity = (
  state: InvariantContext,
  id: string
): PipetteEntity | null => {
  return state.pipetteEntities[id] || null
}

interface StepFieldHelpers {
  getErrors?: (arg0: unknown) => string[]
  maskValue?: ValueMasker
  castValue?: ValueCaster
  hydrate?: (state: InvariantContext, id: string) => unknown
}
const stepFieldHelperMap: Record<StepFieldName, StepFieldHelpers> = {
  aspirate_airGap_volume: {
    maskValue: composeMaskers(
      maskToFloat,
      onlyPositiveNumbers,
      trimDecimals(1)
    ),
    castValue: Number,
  },
  message: {
    getErrors: composeErrors(requiredField),
  },
  aspirate_labware: {
    getErrors: composeErrors(requiredField),
    hydrate: getLabwareOrAdditionalEquipmentEntity,
  },
  aspirate_mix_times: {
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers, defaultTo(1)),
    castValue: Number,
  },
  aspirate_mix_volume: {
    maskValue: composeMaskers(
      maskToFloat,
      onlyPositiveNumbers,
      trimDecimals(1)
    ),
    castValue: Number,
  },
  aspirate_mmFromBottom: {
    castValue: Number,
  },
  aspirate_wells: {
    getErrors: composeErrors(requiredField, minimumWellCount(1)),
    maskValue: defaultTo([]),
  },
  dispense_airGap_volume: {
    maskValue: composeMaskers(
      maskToFloat,
      onlyPositiveNumbers,
      trimDecimals(1)
    ),
    castValue: Number,
  },
  dispense_labware: {
    getErrors: composeErrors(requiredField),
    hydrate: getLabwareOrAdditionalEquipmentEntity,
  },
  dispense_mix_times: {
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers, defaultTo(1)),
    castValue: Number,
  },
  dispense_mix_volume: {
    maskValue: composeMaskers(
      maskToFloat,
      onlyPositiveNumbers,
      trimDecimals(1)
    ),
    castValue: Number,
  },
  dispense_mmFromBottom: {
    castValue: Number,
  },
  dispense_wells: {
    getErrors: composeErrors(requiredField, minimumWellCount(0)),
    maskValue: defaultTo([]),
  },
  disposalVolume_volume: {
    maskValue: composeMaskers(
      maskToFloat,
      onlyPositiveNumbers,
      trimDecimals(1)
    ),
    castValue: Number,
  },
  labware: {
    getErrors: composeErrors(requiredField),
    hydrate: getLabwareOrAdditionalEquipmentEntity,
  },
  aspirate_delay_seconds: {
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers, defaultTo(1)),
    castValue: Number,
  },
  aspirate_delay_mmFromBottom: {
    castValue: numberOrNull,
  },
  aspirate_touchTip_speed: {
    maskValue: composeMaskers(maskToFloat, onlyPositiveNumbers),
    castValue: Number,
  },
  dispense_touchTip_speed: {
    maskValue: composeMaskers(maskToFloat, onlyPositiveNumbers),
    castValue: Number,
  },
  aspirate_touchTip_mmFromEdge: {
    maskValue: composeMaskers(maskToFloat, onlyPositiveNumbers),
    castValue: Number,
  },
  dispense_touchTip_mmFromEdge: {
    maskValue: composeMaskers(maskToFloat, onlyPositiveNumbers),
    castValue: Number,
  },
  dispense_delay_seconds: {
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers, defaultTo(1)),
    castValue: Number,
  },
  dispense_delay_mmFromBottom: {
    castValue: numberOrNull,
  },
  pauseHour: {
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
  },
  pauseMinute: {
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
  },
  pauseSecond: {
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
  },
  pipette: {
    getErrors: composeErrors(requiredField),
    hydrate: getPipetteEntity,
  },
  times: {
    getErrors: composeErrors(requiredField),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers, defaultTo(0)),
    castValue: Number,
  },
  volume: {
    getErrors: composeErrors(requiredField, nonZero),
    maskValue: composeMaskers(
      maskToFloat,
      onlyPositiveNumbers,
      trimDecimals(1),
      defaultTo(0)
    ),
    castValue: Number,
  },
  wells: {
    getErrors: composeErrors(requiredField, minimumWellCount(1)),
    maskValue: defaultTo([]),
  },
  magnetAction: {
    getErrors: composeErrors(requiredField),
  },
  engageHeight: {
    getErrors: composeErrors(realNumber),
    maskValue: composeMaskers(maskToFloat, trimDecimals(1)),
    castValue: Number,
  },
  targetTemperature: {
    getErrors: composeErrors(
      minFieldValue(MIN_TEMP_MODULE_TEMP),
      maxFieldValue(MAX_TEMP_MODULE_TEMP)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  targetHeaterShakerTemperature: {
    getErrors: composeErrors(
      minFieldValue(MIN_HEATER_SHAKER_MODULE_TEMP),
      maxFieldValue(MAX_HEATER_SHAKER_MODULE_TEMP)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  targetSpeed: {
    getErrors: composeErrors(
      minFieldValue(MIN_HEATER_SHAKER_MODULE_RPM),
      maxFieldValue(MAX_HEATER_SHAKER_MODULE_RPM)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  heaterShakerTimerMinutes: {
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  heaterShakerTimerSeconds: {
    getErrors: composeErrors(
      minFieldValue(MIN_HEATER_SHAKER_DURATION_SECONDS),
      maxFieldValue(MAX_HEATER_SHAKER_DURATION_SECONDS)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  heaterShakerTimer: {
    maskValue: composeMaskers(maskToTime),
    getErrors: composeErrors(isTimeFormatMinutesSeconds),
    castValue: String,
  },
  pauseAction: {
    getErrors: composeErrors(requiredField),
  },
  pauseTime: {
    maskValue: composeMaskers(maskToTime),
    getErrors: composeErrors(isTimeFormat),
    castValue: String,
  },
  pauseTemperature: {
    getErrors: composeErrors(
      minFieldValue(MIN_TEMP_MODULE_TEMP),
      maxFieldValue(MAX_TEMP_MODULE_TEMP)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  blockTargetTemp: {
    getErrors: composeErrors(
      temperatureRangeFieldValue(MIN_TC_BLOCK_TEMP, MAX_TC_BLOCK_TEMP)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  lidTargetTemp: {
    getErrors: composeErrors(
      temperatureRangeFieldValue(MIN_TC_LID_TEMP, MAX_TC_LID_TEMP)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  profileTargetLidTemp: {
    getErrors: composeErrors(
      temperatureRangeFieldValue(MIN_TC_LID_TEMP, MAX_TC_LID_TEMP)
    ),
  },
  profileVolume: {
    maskValue: composeMaskers(maskToFloat, onlyPositiveNumbers),
    getErrors: composeErrors(
      minFieldValue(MIN_TC_PROFILE_VOLUME),
      maxFieldValue(MAX_TC_PROFILE_VOLUME)
    ),
  },
  blockTargetTempHold: {
    getErrors: composeErrors(
      temperatureRangeFieldValue(MIN_TC_BLOCK_TEMP, MAX_TC_BLOCK_TEMP)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  lidTargetTempHold: {
    getErrors: composeErrors(
      temperatureRangeFieldValue(MIN_TC_LID_TEMP, MAX_TC_LID_TEMP)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  mix_mmFromBottom: {
    castValue: Number,
  },
  newLocation: {
    getErrors: composeErrors(requiredField),
    hydrate: getLabwareLocation,
  },
  tipRack: {
    getErrors: composeErrors(requiredField),
  },
  aspirate_flowRate: {
    maskValue: composeMaskers(trimDecimals(1)),
    castValue: numberOrNull,
  },
  dispense_flowRate: {
    maskValue: composeMaskers(trimDecimals(1)),
    castValue: numberOrNull,
  },
  mix_flowRate: {
    maskValue: composeMaskers(trimDecimals(1)),
    castValue: numberOrNull,
  },
  pushOut_volume: {
    maskValue: composeMaskers(maskToFloat, onlyPositiveNumbers),
    castValue: numberOrNull,
  },
}
const profileFieldHelperMap: Record<string, StepFieldHelpers> = {
  // profile step fields
  temperature: {
    getErrors: composeErrors(
      requiredField,
      minFieldValue(MIN_TC_BLOCK_TEMP),
      maxFieldValue(MAX_TC_BLOCK_TEMP)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  durationMinutes: {
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  durationSeconds: {
    getErrors: composeErrors(
      minFieldValue(MIN_TC_DURATION_SECONDS),
      maxFieldValue(MAX_TC_DURATION_SECONDS)
    ),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
  // profile cycle fields
  repetitions: {
    getErrors: composeErrors(requiredField),
    maskValue: composeMaskers(maskToInteger, onlyPositiveNumbers),
    castValue: Number,
  },
}
export const getFieldErrors = (
  name: StepFieldName,
  value: unknown
): string[] => {
  const fieldErrorGetter =
    stepFieldHelperMap[name] && stepFieldHelperMap[name].getErrors
  const errors = fieldErrorGetter ? fieldErrorGetter(value) : []
  return errors
}
export const getProfileFieldErrors = (
  name: string,
  value: unknown
): string[] => {
  const fieldErrorGetter =
    profileFieldHelperMap[name] && profileFieldHelperMap[name].getErrors
  const errors = fieldErrorGetter ? fieldErrorGetter(value) : []
  return errors
}
export const castField = (name: StepFieldName, value: unknown): unknown => {
  const fieldCaster =
    stepFieldHelperMap[name] && stepFieldHelperMap[name].castValue
  return fieldCaster ? fieldCaster(value) : value
}
export const maskField = (name: StepFieldName, value: unknown): unknown => {
  const fieldMasker =
    stepFieldHelperMap[name] && stepFieldHelperMap[name].maskValue
  return fieldMasker ? fieldMasker(value) : value
}
export const maskProfileField = (name: string, value: unknown): unknown => {
  const fieldMasker =
    profileFieldHelperMap[name] && profileFieldHelperMap[name].maskValue
  return fieldMasker ? fieldMasker(value) : value
}
export const hydrateField = (
  state: InvariantContext,
  name: StepFieldName,
  value: string
): unknown => {
  const hydrator = stepFieldHelperMap[name] && stepFieldHelperMap[name].hydrate
  return hydrator ? hydrator(state, value) : value
}
