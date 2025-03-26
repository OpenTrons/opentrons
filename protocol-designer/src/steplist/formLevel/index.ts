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
  HydratedCommentFormData,
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

interface StepFormDataMap {
  absorbanceReader: HydratedAbsorbanceReaderFormData
  heaterShaker: HydratedHeaterShakerFormData
  mix: HydratedMixFormData
  pause: HydratedPauseFormData
  moveLabware: HydratedMoveLabwareFormData
  moveLiquid: HydratedMoveLiquidFormData
  magnet: HydratedMagnetFormData
  temperature: HydratedTemperatureFormData
  thermocycler: HydratedThermocyclerFormData
  comment: HydratedCommentFormData
}
interface FormHelpers<K extends keyof StepFormDataMap> {
  getErrors: (
    arg: StepFormDataMap[K],
    moduleEntities: ModuleEntities
  ) => FormError[]
  getWarnings?: (arg: StepFormDataMap[K]) => FormWarning[] // Changed to match step type
}
const stepFormHelperMap: {
  [K in keyof StepFormDataMap]: FormHelpers<K>
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
  comment: {
    getErrors: composeErrors(),
  },
}

export const getFormErrors = (
  stepType: StepType,
  formData: HydratedFormData,
  moduleEntities: ModuleEntities
): FormError[] => {
  //  manualIntervention is the initial starting deck state step
  if (stepType === 'manualIntervention') {
    return []
  }

  switch (stepType) {
    case 'absorbanceReader':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedAbsorbanceReaderFormData,
        moduleEntities
      )
    case 'heaterShaker':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedHeaterShakerFormData,
        moduleEntities
      )

    case 'magnet':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedMagnetFormData,
        moduleEntities
      )

    case 'mix':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedMixFormData,
        moduleEntities
      )

    case 'moveLabware':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedMoveLabwareFormData,
        moduleEntities
      )

    case 'moveLiquid':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedMoveLiquidFormData,
        moduleEntities
      )

    case 'pause':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedPauseFormData,
        moduleEntities
      )

    case 'temperature':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedTemperatureFormData,
        moduleEntities
      )

    case 'thermocycler':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedThermocyclerFormData,
        moduleEntities
      )

    case 'comment':
      return stepFormHelperMap[stepType].getErrors(
        formData as HydratedCommentFormData,
        moduleEntities
      )
  }
}

export const getFormWarnings = (
  stepType: StepType,
  formData: HydratedFormData
): FormWarning[] => {
  //  manualIntervention is the initial starting deck state step
  if (stepType === 'manualIntervention') {
    return []
  }

  switch (stepType) {
    case 'mix':
      return stepFormHelperMap.mix.getWarnings != null
        ? stepFormHelperMap.mix.getWarnings(formData as HydratedMixFormData)
        : []
    case 'moveLiquid':
      return stepFormHelperMap.moveLiquid.getWarnings != null
        ? stepFormHelperMap.moveLiquid.getWarnings(
            formData as HydratedMoveLiquidFormData
          )
        : []
    default:
      //  NOTE: if a new form has warnings, we need to wire it up!
      return []
  }
}
