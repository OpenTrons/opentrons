import {
  getMinXYDimension,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
} from '@opentrons/shared-data'

import {
  ABSORBANCE_READER_INITIALIZE,
  ABSORBANCE_READER_MAX_WAVELENGTH_NM,
  ABSORBANCE_READER_MIN_WAVELENGTH_NM,
  ABSORBANCE_READER_READ,
  MIN_ENGAGE_HEIGHT_V1,
  MAX_ENGAGE_HEIGHT_V1,
  MIN_ENGAGE_HEIGHT_V2,
  MAX_ENGAGE_HEIGHT_V2,
  PAUSE_UNTIL_RESUME,
  PAUSE_UNTIL_TIME,
  PAUSE_UNTIL_TEMP,
  THERMOCYCLER_PROFILE,
} from '../../constants'
import { getPipetteCapacity } from '../../pipettes/pipetteData'
import { canPipetteUseLabware } from '../../utils'
import { getWellRatio } from '../utils'
import { getTimeFromForm } from '../utils/getTimeFromForm'

import type { ReactNode } from 'react'
import type { LabwareDefinition2, PipetteV2Specs } from '@opentrons/shared-data'
import type { PipetteEntity } from '@opentrons/step-generation'
import type { StepFieldName } from '../../form-types'
import type { ModuleEntities } from '../../step-forms'
import type { LiquidHandlingTab } from '../../pages/Designer/ProtocolSteps/StepForm/types'
/*******************
 ** Error Messages **
 ********************/
export type FormErrorKey =
  | 'INCOMPATIBLE_ASPIRATE_LABWARE'
  | 'INCOMPATIBLE_DISPENSE_LABWARE'
  | 'INCOMPATIBLE_LABWARE'
  | 'WELL_RATIO_MOVE_LIQUID'
  | 'PAUSE_TYPE_REQUIRED'
  | 'VOLUME_TOO_HIGH'
  | 'TIME_PARAM_REQUIRED'
  | 'PAUSE_TEMP_PARAM_REQUIRED'
  | 'MAGNET_ACTION_TYPE_REQUIRED'
  | 'ENGAGE_HEIGHT_MIN_EXCEEDED'
  | 'ENGAGE_HEIGHT_MAX_EXCEEDED'
  | 'ENGAGE_HEIGHT_REQUIRED'
  | 'MODULE_ID_REQUIRED'
  | 'TARGET_TEMPERATURE_REQUIRED'
  | 'BLOCK_TEMPERATURE_REQUIRED'
  | 'LID_TEMPERATURE_REQUIRED'
  | 'PROFILE_VOLUME_REQUIRED'
  | 'PROFILE_LID_TEMPERATURE_REQUIRED'
  | 'BLOCK_TEMPERATURE_HOLD_REQUIRED'
  | 'LID_TEMPERATURE_HOLD_REQUIRED'
  | 'PAUSE_TIME_REQUIRED'
  | 'PAUSE_TEMP_REQUIRED'
  | 'LABWARE_TO_MOVE_REQUIRED'
  | 'NEW_LABWARE_LOCATION_REQUIRED'

export interface FormError {
  title: string
  body?: ReactNode
  dependentFields: StepFieldName[]
  showAtField?: boolean
  showAtForm?: boolean
  page?: number
  tab?: LiquidHandlingTab
}
const INCOMPATIBLE_ASPIRATE_LABWARE: FormError = {
  title: 'Selected aspirate labware is incompatible with pipette',
  dependentFields: ['aspirate_labware', 'pipette'],
}
const INCOMPATIBLE_DISPENSE_LABWARE: FormError = {
  title: 'Selected dispense labware is incompatible with pipette',
  dependentFields: ['dispense_labware', 'pipette'],
}
const INCOMPATIBLE_LABWARE: FormError = {
  title: 'Selected labware is incompatible with pipette',
  dependentFields: ['labware', 'pipette'],
}
const PAUSE_TYPE_REQUIRED: FormError = {
  title:
    'Must either pause for amount of time, until told to resume, or until temperature reached',
  dependentFields: ['pauseAction'],
}
const TIME_PARAM_REQUIRED: FormError = {
  title: 'Must include hours, minutes, or seconds',
  dependentFields: ['pauseAction', 'pauseHour', 'pauseMinute', 'pauseSecond'],
}
const PAUSE_TEMP_PARAM_REQUIRED: FormError = {
  title: 'Temperature is required',
  dependentFields: ['pauseAction', 'pauseTemperature'],
}

const VOLUME_TOO_HIGH = (pipetteCapacity: number): FormError => ({
  title: `Volume is greater than maximum pipette/tip volume (${pipetteCapacity} ul)`,
  dependentFields: ['pipette', 'volume'],
})

const WELL_RATIO_MOVE_LIQUID: FormError = {
  title: 'Well selection must be 1 to many, many to 1, or N to N',
  dependentFields: ['aspirate_wells', 'dispense_wells'],
}
const WELL_RATIO_MOVE_LIQUID_INTO_WASTE_CHUTE: FormError = {
  title: 'Well selection must be many to 1, or 1 to 1',
  dependentFields: ['aspirate_wells'],
}
const MAGNET_ACTION_TYPE_REQUIRED: FormError = {
  title: 'Action type must be either engage or disengage',
  dependentFields: ['magnetAction'],
}
const ENGAGE_HEIGHT_REQUIRED: FormError = {
  title: 'Engage height required',
  dependentFields: ['magnetAction', 'engageHeight'],
  showAtForm: false,
  showAtField: true,
}
const ENGAGE_HEIGHT_MIN_EXCEEDED: FormError = {
  title: 'Specified distance is below module minimum',
  dependentFields: ['magnetAction', 'engageHeight'],
  showAtForm: false,
  showAtField: true,
}
const ENGAGE_HEIGHT_MAX_EXCEEDED: FormError = {
  title: 'Specified distance is above module maximum',
  dependentFields: ['magnetAction', 'engageHeight'],
  showAtForm: false,
  showAtField: true,
}
const MODULE_ID_REQUIRED: FormError = {
  title:
    'Module is required. Ensure the appropriate module is present on the deck and selected for this step',
  dependentFields: ['moduleId'],
  showAtForm: false,
  showAtField: true,
}
const TARGET_TEMPERATURE_REQUIRED: FormError = {
  title: 'Temperature required',
  dependentFields: ['setTemperature', 'targetTemperature'],
  showAtForm: false,
  showAtField: true,
}
const PROFILE_VOLUME_REQUIRED: FormError = {
  title: 'Well volume required',
  dependentFields: ['thermocyclerFormType', 'profileVolume'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const PROFILE_LID_TEMPERATURE_REQUIRED: FormError = {
  title: 'Temperature required',
  dependentFields: ['thermocyclerFormType', 'profileTargetLidTemp'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const LID_TEMPERATURE_REQUIRED: FormError = {
  title: 'Temperature required',
  dependentFields: ['lidIsActive', 'lidTargetTemp'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const BLOCK_TEMPERATURE_REQUIRED: FormError = {
  title: 'Temperature required',
  dependentFields: ['blockIsActive', 'blockTargetTemp'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const BLOCK_TEMPERATURE_HOLD_REQUIRED: FormError = {
  title: 'Temperature required',
  dependentFields: ['blockIsActiveHold', 'blockTargetTempHold'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const LID_TEMPERATURE_HOLD_REQUIRED: FormError = {
  title: 'Temperature required',
  dependentFields: ['lidIsActiveHold', 'lidTargetTempHold'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const SHAKE_SPEED_REQUIRED: FormError = {
  title: 'Speed required',
  dependentFields: ['setShake', 'targetSpeed'],
  showAtForm: false,
  showAtField: true,
}
const SHAKE_TIME_REQUIRED: FormError = {
  title: 'Duration required',
  dependentFields: ['heaterShakerSetTimer', 'heaterShakerTimer'],
  showAtForm: false,
  showAtField: true,
}
const PAUSE_ACTION_REQUIRED: FormError = {
  title: 'Pause type required',
  dependentFields: [],
  showAtForm: false,
  showAtField: true,
}
const PAUSE_MODULE_REQUIRED: FormError = {
  title: 'Select a module',
  dependentFields: ['moduleId', 'pauseAction'],
  showAtForm: false,
  showAtField: true,
}
const PAUSE_TEMP_REQUIRED: FormError = {
  title: 'Pause temperature required',
  dependentFields: ['pauseTemperature', 'pauseAction'],
  showAtForm: false,
  showAtField: true,
}
const PAUSE_TIME_REQUIRED: FormError = {
  title: 'Pause duration required',
  dependentFields: ['pauseTime', 'pauseAction'],
  showAtForm: false,
  showAtField: true,
}
const HS_TEMPERATURE_REQUIRED: FormError = {
  title: 'Temperature required',
  dependentFields: [
    'targetHeaterShakerTemperature',
    'setHeaterShakerTemperature',
  ],
  showAtForm: false,
  showAtField: true,
}
const LABWARE_TO_MOVE_REQUIRED: FormError = {
  title: 'Labware required',
  dependentFields: ['labware'],
  showAtForm: false,
  showAtField: true,
}
const NEW_LABWARE_LOCATION_REQUIRED: FormError = {
  title: 'New location required',
  dependentFields: ['newLocation'],
  showAtForm: false,
  showAtField: true,
}
const ASPIRATE_WELLS_REQUIRED: FormError = {
  title: 'Choose wells',
  dependentFields: ['aspirate_wells'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const DISPENSE_WELLS_REQUIRED: FormError = {
  title: 'Choose wells',
  dependentFields: ['dispense_wells'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const MIX_WELLS_REQUIRED: FormError = {
  title: 'Choose wells',
  dependentFields: ['wells'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const VOLUME_REQUIRED: FormError = {
  title: 'Volume required',
  dependentFields: ['volume'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const TIMES_REQUIRED: FormError = {
  title: 'Repetitions required',
  dependentFields: ['times'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const ASPIRATE_LABWARE_REQUIRED: FormError = {
  title: 'Labware required',
  dependentFields: ['aspirate_labware'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const DISPENSE_LABWARE_REQUIRED: FormError = {
  title: 'Labware required',
  dependentFields: ['dispense_labware'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const MIX_LABWARE_REQUIRED: FormError = {
  title: 'Labware required',
  dependentFields: ['labware'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const ASPIRATE_MIX_TIMES_REQUIRED: FormError = {
  title: 'Repititions required',
  dependentFields: ['aspirate_mix_times'],
  showAtForm: false,
  showAtField: true,
  page: 1,
  tab: 'aspirate',
}
const ASPIRATE_MIX_VOLUME_REQUIRED: FormError = {
  title: 'Volume required',
  dependentFields: ['aspirate_mix_checkbox', 'aspirate_mix_volume'],
  showAtForm: false,
  showAtField: true,
  page: 1,
  tab: 'aspirate',
}
const ASPIRATE_DELAY_DURATION_REQUIRED: FormError = {
  title: 'Duration required',
  dependentFields: ['aspirate_delay_checkbox', 'aspirate_delay_seconds'],
  showAtForm: false,
  showAtField: true,
  page: 1,
  tab: 'aspirate',
}
const ASPIRATE_AIRGAP_VOLUME_REQUIRED: FormError = {
  title: 'Volume required',
  dependentFields: ['aspirate_airGap_checkbox', 'aspirate_airGap_volume'],
  showAtForm: false,
  showAtField: true,
  page: 1,
  tab: 'aspirate',
}
const DISPENSE_MIX_TIMES_REQUIRED: FormError = {
  title: 'Repititions required',
  dependentFields: ['dispense_mix_checkbox', 'dispense_mix_times'],
  showAtForm: false,
  showAtField: true,
  page: 1,
  tab: 'dispense',
}
const DISPENSE_MIX_VOLUME_REQUIRED: FormError = {
  title: 'Volume required',
  dependentFields: ['dispense_mix_checkbox', 'dispense_mix_volume'],
  showAtForm: false,
  showAtField: true,
  page: 1,
  tab: 'dispense',
}
const DISPENSE_DELAY_DURATION_REQUIRED: FormError = {
  title: 'Duration required',
  dependentFields: ['dispense_delay_checkbox', 'dispense_delay_seconds'],
  showAtForm: false,
  showAtField: true,
  page: 1,
  tab: 'dispense',
}
const DISPENSE_AIRGAP_VOLUME_REQUIRED: FormError = {
  title: 'Volume required',
  dependentFields: ['dispense_airGap_checkbox', 'dispense_airGap_volume'],
  showAtForm: false,
  showAtField: true,
  page: 1,
  tab: 'dispense',
}
const BLOWOUT_LOCATION_REQUIRED: FormError = {
  title: 'Volume required',
  dependentFields: ['blowout_checkbox', 'blowout_location'],
  showAtForm: false,
  showAtField: true,
  page: 1,
  tab: 'dispense',
}
const WAVELENGTH_REQUIRED: FormError = {
  title: 'Custom wavelength required',
  dependentFields: ['wavelengths'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const WAVELENGTH_OUT_OF_RANGE: FormError = {
  title: 'Value falls outside of accepted range',
  dependentFields: ['wavelengths'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const REFERENCE_WAVELENGTH_OUT_OF_RANGE: FormError = {
  title: 'Value falls outside of accepted range',
  dependentFields: ['referenceWavelength'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const REFERENCE_WAVELENGTH_REQUIRED: FormError = {
  title: 'Custom wavelength required',
  dependentFields: ['referenceWavelength'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const FILENAME_REQUIRED: FormError = {
  title: 'File name required',
  dependentFields: ['fileName'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const ABSORBANCE_READER_MODULE_ID_REQUIRED: FormError = {
  title: 'Module required',
  dependentFields: ['moduleId'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const MAGNETIC_MODULE_ID_REQUIRED: FormError = {
  title: 'Module required',
  dependentFields: ['moduleId'],
  showAtForm: false,
  showAtField: true,
  page: 0,
}
const ASPIRATE_TOUCH_TIP_SPEED_REQUIRED: FormError = {
  title: 'Touch tip speed required',
  dependentFields: ['aspirate_touchTip_speed'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const DISPENSE_TOUCH_TIP_SPEED_REQUIRED: FormError = {
  title: 'Touch tip speed required',
  dependentFields: ['dispense_touchTip_speed'],
  showAtForm: false,
  showAtField: true,
  page: 1,
}
const ASPIRATE_TOUCH_TIP_MM_FROM_EDGE_OUT_OF_RANGE: FormError = {
  title: 'Value falls outside of accepted range',
  dependentFields: ['aspirate_touchTip_mmFromEdge'],
  showAtForm: false,
  showAtField: true,
  page: 2,
}
const DISPENSE_TOUCH_TIP_MM_FROM_EDGE_OUT_OF_RANGE: FormError = {
  title: 'Value falls outside of accepted range',
  dependentFields: ['dispense_touchTip_mmFromEdge'],
  showAtForm: false,
  showAtField: true,
  page: 2,
}
const ASPIRATE_TOUCH_TIP_MM_FROM_EDGE_REQUIRED: FormError = {
  title: 'Value required',
  dependentFields: ['aspirate_touchTip_mmFromEdge'],
  showAtForm: false,
  showAtField: true,
  page: 2,
}
const DISPENSE_TOUCH_TIP_MM_FROM_EDGE_REQUIRED: FormError = {
  title: 'Value required',
  dependentFields: ['dispense_touchTip_mmFromEdge'],
  showAtForm: false,
  showAtField: true,
  page: 2,
}

export interface HydratedFormData {
  [key: string]: any
}

export type FormErrorChecker = (
  arg: HydratedFormData,
  moduleEntities?: ModuleEntities
) => FormError | null
// TODO: test these

/*******************
 ** Error Checkers **
 ********************/
// TODO: real HydratedFormData type
export const incompatibleLabware = (
  fields: HydratedFormData
): FormError | null => {
  const { labware, pipette } = fields
  if (!labware || !pipette) return null
  //  trashBin and wasteChute cannot mix into a labware
  return !canPipetteUseLabware(
    pipette.spec as PipetteV2Specs,
    labware.def as LabwareDefinition2
  )
    ? INCOMPATIBLE_LABWARE
    : null
}
export const incompatibleDispenseLabware = (
  fields: HydratedFormData
): FormError | null => {
  const { dispense_labware, pipette } = fields
  if (!dispense_labware || !pipette) return null
  return !canPipetteUseLabware(
    pipette.spec as PipetteV2Specs,
    'def' in dispense_labware
      ? (dispense_labware.def as LabwareDefinition2)
      : undefined,
    'name' in dispense_labware ? (dispense_labware.name as string) : undefined
  )
    ? INCOMPATIBLE_DISPENSE_LABWARE
    : null
}
export const incompatibleAspirateLabware = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_labware, pipette } = fields
  if (!aspirate_labware || !pipette) return null
  //  trashBin and wasteChute cannot aspirate into a labware
  return !canPipetteUseLabware(
    pipette.spec as PipetteV2Specs,
    aspirate_labware.def as LabwareDefinition2
  )
    ? INCOMPATIBLE_ASPIRATE_LABWARE
    : null
}
export const pauseForTimeOrUntilTold = (
  fields: HydratedFormData
): FormError | null => {
  const { pauseAction, moduleId, pauseTemperature } = fields

  if (pauseAction === PAUSE_UNTIL_TIME) {
    const { hours, minutes, seconds } = getTimeFromForm(fields, 'pauseTime')
    // user selected pause for amount of time
    const totalSeconds = hours * 3600 + minutes * 60 + seconds
    return totalSeconds <= 0 ? TIME_PARAM_REQUIRED : null
  } else if (pauseAction === PAUSE_UNTIL_TEMP) {
    // user selected pause until temperature reached
    if (moduleId == null) {
      // missing module field (reached by deleting a module from deck)
      return MODULE_ID_REQUIRED
    }

    if (!pauseTemperature) {
      // missing temperature field
      return PAUSE_TEMP_PARAM_REQUIRED
    }

    return null
  } else if (pauseAction === PAUSE_UNTIL_RESUME) {
    // user selected pause until resume
    return null
  } else {
    // user did not select a pause type
    return PAUSE_TYPE_REQUIRED
  }
}
export const wellRatioMoveLiquid = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_wells, dispense_wells, dispense_labware } = fields
  const dispenseLabware = dispense_labware?.name ?? null
  const isDispensingIntoTrash =
    dispenseLabware != null
      ? dispenseLabware === 'wasteChute' || dispenseLabware === 'trashBin'
      : false
  if (!aspirate_wells || (!isDispensingIntoTrash && !dispense_wells))
    return null
  const wellRatioFormError = isDispensingIntoTrash
    ? WELL_RATIO_MOVE_LIQUID_INTO_WASTE_CHUTE
    : WELL_RATIO_MOVE_LIQUID

  return getWellRatio(
    aspirate_wells as string[],
    dispense_wells as string[],
    isDispensingIntoTrash
  ) != null
    ? null
    : wellRatioFormError
}
export const volumeTooHigh = (fields: HydratedFormData): FormError | null => {
  const { pipette, tipRack } = fields
  const volume = Number(fields.volume)

  const pipetteCapacity = getPipetteCapacity(
    pipette as PipetteEntity,
    tipRack as string
  )
  if (
    !Number.isNaN(volume) &&
    !Number.isNaN(pipetteCapacity) &&
    volume > pipetteCapacity
  ) {
    return VOLUME_TOO_HIGH(pipetteCapacity)
  }

  return null
}
export const magnetActionRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { magnetAction } = fields
  if (!magnetAction) return MAGNET_ACTION_TYPE_REQUIRED
  return null
}
export const engageHeightRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { magnetAction, engageHeight } = fields
  return magnetAction === 'engage' && !engageHeight
    ? ENGAGE_HEIGHT_REQUIRED
    : null
}
export const moduleIdRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { moduleId } = fields
  if (moduleId == null) return MODULE_ID_REQUIRED
  return null
}
export const targetTemperatureRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { setTemperature, targetTemperature } = fields
  return JSON.parse(String(setTemperature ?? false)) && !targetTemperature
    ? TARGET_TEMPERATURE_REQUIRED
    : null
}
export const profileVolumeRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { thermocyclerFormType, profileVolume } = fields
  return thermocyclerFormType === THERMOCYCLER_PROFILE && !profileVolume
    ? PROFILE_VOLUME_REQUIRED
    : null
}
export const profileTargetLidTempRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { thermocyclerFormType, profileTargetLidTemp } = fields
  return thermocyclerFormType === THERMOCYCLER_PROFILE && !profileTargetLidTemp
    ? PROFILE_LID_TEMPERATURE_REQUIRED
    : null
}
export const blockTemperatureRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { blockIsActive, blockTargetTemp } = fields
  return blockIsActive === true && !blockTargetTemp
    ? BLOCK_TEMPERATURE_REQUIRED
    : null
}
export const lidTemperatureRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { lidIsActive, lidTargetTemp } = fields
  return lidIsActive === true && !lidTargetTemp
    ? LID_TEMPERATURE_REQUIRED
    : null
}
export const blockTemperatureHoldRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { blockIsActiveHold, blockTargetTempHold } = fields
  return blockIsActiveHold === true && !blockTargetTempHold
    ? BLOCK_TEMPERATURE_HOLD_REQUIRED
    : null
}
export const lidTemperatureHoldRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { lidIsActiveHold, lidTargetTempHold } = fields
  return lidIsActiveHold === true && !lidTargetTempHold
    ? LID_TEMPERATURE_HOLD_REQUIRED
    : null
}
export const shakeSpeedRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { targetSpeed, setShake } = fields
  return setShake && !targetSpeed ? SHAKE_SPEED_REQUIRED : null
}
export const shakeTimeRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { heaterShakerTimer, heaterShakerSetTimer } = fields
  return heaterShakerSetTimer && !heaterShakerTimer ? SHAKE_TIME_REQUIRED : null
}
export const temperatureRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { setHeaterShakerTemperature, targetHeaterShakerTemperature } = fields
  return setHeaterShakerTemperature && !targetHeaterShakerTemperature
    ? HS_TEMPERATURE_REQUIRED
    : null
}
export const pauseActionRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { pauseAction } = fields
  return pauseAction == null ? PAUSE_ACTION_REQUIRED : null
}
export const pauseTimeRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { pauseTime, pauseAction } = fields
  return pauseAction === PAUSE_UNTIL_TIME && !pauseTime
    ? PAUSE_TIME_REQUIRED
    : null
}
export const pauseModuleRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { moduleId, pauseAction } = fields
  return pauseAction === PAUSE_UNTIL_TEMP && moduleId == null
    ? PAUSE_MODULE_REQUIRED
    : null
}
export const pauseTemperatureRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { pauseTemperature, pauseAction } = fields
  return pauseAction === PAUSE_UNTIL_TEMP && !pauseTemperature
    ? PAUSE_TEMP_REQUIRED
    : null
}
export const labwareToMoveRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { labware } = fields
  return labware == null ? LABWARE_TO_MOVE_REQUIRED : null
}
export const newLabwareLocationRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { newLocation } = fields
  return newLocation == null ||
    Object.values(newLocation as Object).every(val => val == null)
    ? NEW_LABWARE_LOCATION_REQUIRED
    : null
}
export const magneticModuleIdRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { moduleId } = fields
  return moduleId == null ? MAGNETIC_MODULE_ID_REQUIRED : null
}
export const engageHeightRangeExceeded = (
  fields: HydratedFormData,
  moduleEntities?: ModuleEntities
): FormError | null => {
  const { magnetAction, engageHeight, moduleId } = fields
  if (moduleEntities == null) {
    return null
  }
  const moduleModel = moduleEntities[moduleId]?.model
  const engageHeightCast = Number(engageHeight)
  if (magnetAction === 'engage') {
    if (moduleModel === MAGNETIC_MODULE_V1) {
      if (engageHeightCast < MIN_ENGAGE_HEIGHT_V1) {
        return ENGAGE_HEIGHT_MIN_EXCEEDED
      } else if (engageHeightCast > MAX_ENGAGE_HEIGHT_V1) {
        return ENGAGE_HEIGHT_MAX_EXCEEDED
      }
    } else if (moduleModel === MAGNETIC_MODULE_V2) {
      if (engageHeightCast < MIN_ENGAGE_HEIGHT_V2) {
        return ENGAGE_HEIGHT_MIN_EXCEEDED
      } else if (engageHeightCast > MAX_ENGAGE_HEIGHT_V2) {
        return ENGAGE_HEIGHT_MAX_EXCEEDED
      }
    } else {
      console.warn(
        `unhandled model for engageHeightRangeExceeded: ${moduleModel}`
      )
    }
  }

  return null
}
export const aspirateWellsRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_wells } = fields
  return aspirate_wells == null || aspirate_wells.length === 0
    ? ASPIRATE_WELLS_REQUIRED
    : null
}
export const dispenseWellsRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { dispense_wells, dispense_labware } = fields
  return (dispense_wells == null || dispense_wells.length === 0) &&
    !(
      dispense_labware != null &&
      (dispense_labware.name === 'wasteChute' ||
        dispense_labware.name === 'trashBin')
    )
    ? DISPENSE_WELLS_REQUIRED
    : null
}
export const mixWellsRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { wells } = fields
  return wells == null || wells.length === 0 ? MIX_WELLS_REQUIRED : null
}
export const volumeRequired = (fields: HydratedFormData): FormError | null => {
  const { volume } = fields
  return !volume ? VOLUME_REQUIRED : null
}
export const timesRequired = (fields: HydratedFormData): FormError | null => {
  const { times } = fields
  return !times ? TIMES_REQUIRED : null
}
export const aspirateLabwareRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_labware } = fields
  return aspirate_labware == null ? ASPIRATE_LABWARE_REQUIRED : null
}
export const dispenseLabwareRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { dispense_labware } = fields
  return dispense_labware == null ? DISPENSE_LABWARE_REQUIRED : null
}
export const mixLabwareRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { labware } = fields
  return labware == null ? MIX_LABWARE_REQUIRED : null
}
export const aspirateMixTimesRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_mix_checkbox, aspirate_mix_times } = fields
  return aspirate_mix_checkbox && !aspirate_mix_times
    ? ASPIRATE_MIX_TIMES_REQUIRED
    : null
}
export const aspirateMixVolumeRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_mix_checkbox, aspirate_mix_volume } = fields
  return aspirate_mix_checkbox && !aspirate_mix_volume
    ? ASPIRATE_MIX_VOLUME_REQUIRED
    : null
}
export const aspirateDelayDurationRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_delay_seconds, aspirate_delay_checkbox } = fields
  return aspirate_delay_checkbox && !aspirate_delay_seconds
    ? ASPIRATE_DELAY_DURATION_REQUIRED
    : null
}
export const aspirateAirGapVolumeRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_airGap_checkbox, aspirate_airGap_volume } = fields
  return aspirate_airGap_checkbox && !aspirate_airGap_volume
    ? ASPIRATE_AIRGAP_VOLUME_REQUIRED
    : null
}
export const dispenseMixTimesRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { dispense_mix_checkbox, dispense_mix_times } = fields
  return dispense_mix_checkbox && !dispense_mix_times
    ? DISPENSE_MIX_TIMES_REQUIRED
    : null
}
export const dispenseMixVolumeRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { dispense_mix_checkbox, dispense_mix_volume } = fields
  return dispense_mix_checkbox && !dispense_mix_volume
    ? DISPENSE_MIX_VOLUME_REQUIRED
    : null
}
export const dispenseDelayDurationRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { dispense_delay_seconds, dispense_delay_checkbox } = fields
  return dispense_delay_checkbox && !dispense_delay_seconds
    ? DISPENSE_DELAY_DURATION_REQUIRED
    : null
}
export const dispenseAirGapVolumeRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { dispense_airGap_checkbox, dispense_airGap_volume } = fields
  return dispense_airGap_checkbox && !dispense_airGap_volume
    ? DISPENSE_AIRGAP_VOLUME_REQUIRED
    : null
}
export const blowoutLocationRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { blowout_checkbox, blowout_location } = fields
  return blowout_checkbox && !blowout_location
    ? BLOWOUT_LOCATION_REQUIRED
    : null
}
export const wavelengthRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { absorbanceReaderFormType, wavelengths, mode } = fields
  if (!wavelengths) {
    return null
  }
  const wavelengthsToCheck = wavelengths.slice(
    0,
    mode === 'single' ? 1 : wavelengths.length
  )
  return wavelengthsToCheck?.some((wavelength: string[]) => !wavelength) &&
    absorbanceReaderFormType === ABSORBANCE_READER_INITIALIZE
    ? WAVELENGTH_REQUIRED
    : null
}
export const referenceWavelengthRequired = (
  fields: HydratedFormData
): FormError | null => {
  const {
    absorbanceReaderFormType,
    referenceWavelength,
    referenceWavelengthActive,
  } = fields
  return referenceWavelengthActive &&
    !referenceWavelength &&
    absorbanceReaderFormType === ABSORBANCE_READER_INITIALIZE
    ? REFERENCE_WAVELENGTH_REQUIRED
    : null
}
export const absorbanceReaderModuleIdRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { moduleId } = fields
  if (moduleId == null) return ABSORBANCE_READER_MODULE_ID_REQUIRED
  return null
}
export const wavelengthOutOfRange = (
  fields: HydratedFormData
): FormError | null => {
  const { absorbanceReaderFormType, wavelengths, mode } = fields
  if (
    !wavelengths ||
    absorbanceReaderFormType !== ABSORBANCE_READER_INITIALIZE
  ) {
    return null
  }
  const wavelengthsToCheck = wavelengths.slice(
    0,
    mode === 'single' ? 1 : wavelengths.length
  )
  return wavelengthsToCheck.some(
    (wavelength: any) =>
      getIsOutOfRange(
        wavelength,
        ABSORBANCE_READER_MIN_WAVELENGTH_NM,
        ABSORBANCE_READER_MAX_WAVELENGTH_NM
      ) && wavelength
  )
    ? WAVELENGTH_OUT_OF_RANGE
    : null
}
export const referenceWavelengthOutOfRange = (
  fields: HydratedFormData
): FormError | null => {
  const { absorbanceReaderFormType, referenceWavelength } = fields
  if (
    !referenceWavelength ||
    absorbanceReaderFormType !== ABSORBANCE_READER_INITIALIZE
  ) {
    return null
  }
  return getIsOutOfRange(
    referenceWavelength,
    ABSORBANCE_READER_MIN_WAVELENGTH_NM,
    ABSORBANCE_READER_MAX_WAVELENGTH_NM
  )
    ? REFERENCE_WAVELENGTH_OUT_OF_RANGE
    : null
}
export const fileNameRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { absorbanceReaderFormType, fileName } = fields
  return !fileName && absorbanceReaderFormType === ABSORBANCE_READER_READ
    ? FILENAME_REQUIRED
    : null
}
export const aspirateTouchTipSpeedRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_touchTip_speed, aspirate_touchTip_checkbox } = fields
  return aspirate_touchTip_checkbox && !aspirate_touchTip_speed
    ? ASPIRATE_TOUCH_TIP_SPEED_REQUIRED
    : null
}
export const dispenseTouchTipSpeedRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { dispense_touchTip_speed, dispense_touchTip_checkbox } = fields
  return dispense_touchTip_checkbox && !dispense_touchTip_speed
    ? DISPENSE_TOUCH_TIP_SPEED_REQUIRED
    : null
}
export const aspirateTouchTipMmFromEdgeOutOfRange = (
  fields: HydratedFormData
): FormError | null => {
  const {
    aspirate_touchTip_checkbox,
    aspirate_touchTip_mmFromEdge,
    aspirate_labware,
  } = fields
  if (aspirate_touchTip_checkbox == null) {
    return null
  }
  const labwareDef = aspirate_labware?.def
  if (labwareDef == null) {
    return null
  }
  const minDimension = getMinXYDimension(labwareDef, ['A1'])
  if (minDimension == null) {
    return null
  }
  const maxRadius = minDimension / 2
  if (
    Number(aspirate_touchTip_mmFromEdge) > maxRadius ||
    Number(aspirate_touchTip_mmFromEdge) < 0
  ) {
    return ASPIRATE_TOUCH_TIP_MM_FROM_EDGE_OUT_OF_RANGE
  }
  return null
}
export const dispenseTouchTipMmFromEdgeOutOfRange = (
  fields: HydratedFormData
): FormError | null => {
  const {
    dispense_touchTip_checkbox,
    dispense_touchTip_mmFromEdge,
    dispense_labware,
  } = fields
  if (dispense_touchTip_checkbox == null) {
    return null
  }
  const labwareDef = dispense_labware?.def
  if (labwareDef == null) {
    return null
  }
  const minDimension = getMinXYDimension(labwareDef, ['A1'])
  if (minDimension == null) {
    return null
  }
  const maxRadius = minDimension / 2
  if (
    Number(dispense_touchTip_mmFromEdge) > maxRadius ||
    Number(dispense_touchTip_mmFromEdge) < 0
  ) {
    return DISPENSE_TOUCH_TIP_MM_FROM_EDGE_OUT_OF_RANGE
  }
  return null
}
export const aspirateTouchTipMmFromEdgeRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { aspirate_touchTip_checkbox, aspirate_touchTip_mmFromEdge } = fields
  return aspirate_touchTip_checkbox && !aspirate_touchTip_mmFromEdge
    ? ASPIRATE_TOUCH_TIP_MM_FROM_EDGE_REQUIRED
    : null
}
export const dispenseTouchTipMmFromEdgeRequired = (
  fields: HydratedFormData
): FormError | null => {
  const { dispense_touchTip_checkbox, dispense_touchTip_mmFromEdge } = fields
  return dispense_touchTip_checkbox && !dispense_touchTip_mmFromEdge
    ? DISPENSE_TOUCH_TIP_MM_FROM_EDGE_REQUIRED
    : null
}

/*******************
 **     Helpers    **
 ********************/
type ComposeErrors = (
  ...errorCheckers: FormErrorChecker[]
) => (arg: HydratedFormData, moduleEntities?: ModuleEntities) => FormError[]
export const composeErrors: ComposeErrors = (
  ...errorCheckers: FormErrorChecker[]
) => (formData: HydratedFormData, moduleEntities?: ModuleEntities) =>
  errorCheckers
    .map(checker => checker(formData, moduleEntities))
    .filter((error): error is FormError => error !== null)

export const getIsOutOfRange = (
  value: any,
  min: number,
  max: number
): boolean => {
  const castValue = Number(value)
  return castValue < min || castValue > max
}
