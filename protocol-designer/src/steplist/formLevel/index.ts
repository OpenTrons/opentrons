import {
  composeErrors,
  incompatibleAspirateLabware,
  incompatibleDispenseLabware,
  incompatibleLabware,
  wellRatioMoveLiquid,
  magnetActionRequired,
  engageHeightRequired,
  engageHeightRangeExceeded,
  moduleIdRequired,
  targetTemperatureRequired,
  blockTemperatureRequired,
  lidTemperatureRequired,
  profileVolumeRequired,
  profileTargetLidTempRequired,
  blockTemperatureHoldRequired,
  lidTemperatureHoldRequired,
  volumeTooHigh,
  shakeSpeedRequired,
  temperatureRequired,
  shakeTimeRequired,
  pauseTimeRequired,
  pauseTemperatureRequired,
  newLabwareLocationRequired,
  labwareToMoveRequired,
  pauseModuleRequired,
  aspirateLabwareRequired,
  dispenseLabwareRequired,
  aspirateMixVolumeRequired,
  aspirateMixTimesRequired,
  aspirateDelayDurationRequired,
  aspirateAirGapVolumeRequired,
  dispenseMixTimesRequired,
  dispenseDelayDurationRequired,
  dispenseAirGapVolumeRequired,
  dispenseMixVolumeRequired,
  blowoutLocationRequired,
  aspirateWellsRequired,
  dispenseWellsRequired,
  mixWellsRequired,
  mixLabwareRequired,
  volumeRequired,
  timesRequired,
  pauseActionRequired,
  wavelengthRequired,
  referenceWavelengthRequired,
  fileNameRequired,
  wavelengthOutOfRange,
  referenceWavelengthOutOfRange,
  absorbanceReaderModuleIdRequired,
  magneticModuleIdRequired,
  aspirateTouchTipSpeedRequired,
  dispenseTouchTipSpeedRequired,
  aspirateTouchTipMmFromEdgeOutOfRange,
  dispenseTouchTipMmFromEdgeOutOfRange,
  aspirateTouchTipMmFromEdgeRequired,
  dispenseTouchTipMmFromEdgeRequired,
  pushOutVolumeRequired,
  pushOutVolumeOutOfRange,
} from './errors'

import {
  composeWarnings,
  belowPipetteMinimumVolume,
  maxDispenseWellVolume,
  minDisposalVolume,
  minAspirateAirGapVolume,
  minDispenseAirGapVolume,
  mixTipPositionInTube,
  tipPositionInTube,
} from './warnings'

import type { FormWarning, FormWarningType } from './warnings'
import type {
  HydratedAbsorbanceReaderFormData,
  HydratedFormData,
  HydratedHeaterShakerFormData,
  HydratedMagnetFormData,
  HydratedMixFormData,
  HydratedMoveLabwareFormData,
  HydratedMoveLiquidFormData,
  HydratedPauseFormData,
  HydratedTemperatureFormData,
  HydratedThermocyclerFormData,
  StepType,
} from '../../form-types'
import type { FormError } from './errors'
import type { ModuleEntities } from '@opentrons/step-generation'
export { handleFormChange } from './handleFormChange'
export { createBlankForm } from './createBlankForm'
export { getDefaultsForStepType } from './getDefaultsForStepType'
export { getDisabledFields } from './getDisabledFields'
export { getNextDefaultPipetteId } from './getNextDefaultPipetteId'
export {
  getNextDefaultTemperatureModuleId,
  getNextDefaultThermocyclerModuleId,
} from './getNextDefaultModuleId'
export { getNextDefaultMagnetAction } from './getNextDefaultMagnetAction'
export { getNextDefaultEngageHeight } from './getNextDefaultEngageHeight'
export { stepFormToArgs } from './stepFormToArgs'
export type { FormError, FormWarning, FormWarningType }

type StepFormDataMap = {
  absorbanceReader: HydratedAbsorbanceReaderFormData
  heaterShaker: HydratedHeaterShakerFormData
  mix: HydratedMixFormData
  pause: HydratedPauseFormData
  moveLabware: HydratedMoveLabwareFormData
  moveLiquid: HydratedMoveLiquidFormData
  magnet: HydratedMagnetFormData
  temperature: HydratedTemperatureFormData
  thermocycler: HydratedThermocyclerFormData
}
interface FormHelpers<K extends keyof StepFormDataMap> {
  getErrors?: (
    arg: StepFormDataMap[K],
    moduleEntities: ModuleEntities
  ) => FormError[]
  getWarnings?: (arg: StepFormDataMap[K]) => FormWarning[] // Changed to match step type
}
const stepFormHelperMap: {
  [K in keyof StepFormDataMap]?: FormHelpers<K>
} = {
  absorbanceReader: {
    getErrors: composeErrors(
      wavelengthRequired,
      referenceWavelengthRequired,
      fileNameRequired,
      wavelengthOutOfRange,
      referenceWavelengthOutOfRange,
      absorbanceReaderModuleIdRequired
    ),
  },
  heaterShaker: {
    getErrors: composeErrors(
      shakeSpeedRequired,
      shakeTimeRequired,
      temperatureRequired
    ),
  },
  mix: {
    getErrors: composeErrors(
      incompatibleLabware,
      volumeTooHigh,
      mixWellsRequired,
      mixLabwareRequired,
      volumeRequired,
      timesRequired,
      aspirateDelayDurationRequired,
      dispenseDelayDurationRequired,
      blowoutLocationRequired
    ),
    getWarnings: composeWarnings(
      belowPipetteMinimumVolume,
      mixTipPositionInTube
    ),
  },
  pause: {
    getErrors: composeErrors(
      pauseActionRequired,
      pauseTimeRequired,
      pauseTemperatureRequired,
      pauseModuleRequired
    ),
  },
  moveLabware: {
    getErrors: composeErrors(labwareToMoveRequired, newLabwareLocationRequired),
  },
  moveLiquid: {
    getErrors: composeErrors(
      incompatibleAspirateLabware,
      incompatibleDispenseLabware,
      wellRatioMoveLiquid,
      volumeRequired,
      aspirateLabwareRequired,
      dispenseLabwareRequired,
      aspirateMixTimesRequired,
      aspirateMixVolumeRequired,
      aspirateDelayDurationRequired,
      aspirateAirGapVolumeRequired,
      dispenseMixTimesRequired,
      dispenseMixVolumeRequired,
      dispenseDelayDurationRequired,
      dispenseAirGapVolumeRequired,
      blowoutLocationRequired,
      aspirateWellsRequired,
      dispenseWellsRequired,
      aspirateTouchTipSpeedRequired,
      dispenseTouchTipSpeedRequired,
      pushOutVolumeRequired,
      pushOutVolumeOutOfRange,
      aspirateTouchTipMmFromEdgeOutOfRange,
      dispenseTouchTipMmFromEdgeOutOfRange,
      aspirateTouchTipMmFromEdgeRequired,
      dispenseTouchTipMmFromEdgeRequired
    ),
    getWarnings: composeWarnings(
      belowPipetteMinimumVolume,
      maxDispenseWellVolume,
      minDisposalVolume,
      minAspirateAirGapVolume,
      minDispenseAirGapVolume,
      tipPositionInTube
    ),
  },
  magnet: {
    getErrors: composeErrors(
      magnetActionRequired,
      engageHeightRequired,
      moduleIdRequired,
      engageHeightRangeExceeded,
      magneticModuleIdRequired
    ),
  },
  temperature: {
    getErrors: composeErrors(targetTemperatureRequired, moduleIdRequired),
  },
  thermocycler: {
    getErrors: composeErrors(
      blockTemperatureRequired,
      lidTemperatureRequired,
      profileVolumeRequired,
      profileTargetLidTempRequired,
      blockTemperatureHoldRequired,
      lidTemperatureHoldRequired
    ),
  },
}
export const getFormErrors = (
  stepType: StepType,
  formData: HydratedFormData,
  moduleEntities: ModuleEntities
): FormError[] => {
  //  @ts-expect-error
  const formErrorGetter = stepFormHelperMap[stepType]?.getErrors

  const errors = formErrorGetter != null ? formErrorGetter(formData) : []
  return errors
}

export const getFormWarnings = (
  stepType: StepType,
  formData: HydratedFormData
): FormWarning[] => {
  //  @ts-expect-error
  const formWarningGetter = stepFormHelperMap[stepType]?.getWarnings
  const warnings = formWarningGetter != null ? formWarningGetter(formData) : []
  return warnings
}
