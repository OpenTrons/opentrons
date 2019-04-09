// @flow
import isUndefined from 'lodash/isUndefined'
import mapValues from 'lodash/mapValues'
import omit from 'lodash/omit'
import omitBy from 'lodash/omitBy'
import flow from 'lodash/flow'
import { getPipetteCapacity } from '../../pipettes/pipetteData'
import type {
  FileLabwareV1 as FileLabware,
  FilePipetteV1 as FilePipette,
} from '@opentrons/shared-data'
import type { PipetteEntities } from '../../step-forms'
import type { FormPatch } from '../../steplist/actions'
import type { PDProtocolFile } from '../../file-types'
import type { FormData } from '../../form-types'

// NOTE: these constants are copied here because
// the default-values key did not exist for most protocols
// pre 1.1.0 in later migration files many of these values
// should be taken from the default-values key
export const INITIAL_DECK_SETUP_STEP_ID: '__INITIAL_DECK_SETUP_STEP__' =
  '__INITIAL_DECK_SETUP_STEP__'
export const initialDeckSetupStepForm = {
  stepType: 'manualIntervention',
  id: INITIAL_DECK_SETUP_STEP_ID,
  labwareLocationUpdate: {
    trashId: '12',
  },
  pipetteLocationUpdate: {},
}

// NOTE: this function was copied on 2019-2-7 from
// formLevel/handleFormChange/dependentFieldsUpdateMoveLiquid.js
// in order to avoid further inadvertent changes to this migration
function _updatePatchPathField(
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
) {
  const appliedPatch = { ...rawForm, ...patch }
  const { path, changeTip } = appliedPatch

  if (!path) {
    console.warn(
      `No path for form: ${String(rawForm.id)}. Falling back to "single" path`
    )
    // sanity check - fall back to 'single' if no path specified
    return { ...patch, path: 'single' }
  }

  const numericVolume = Number(appliedPatch.volume) || 0
  const pipetteCapacity = getPipetteCapacity(
    pipetteEntities[appliedPatch.pipette]
  )
  let pipetteCapacityExceeded = numericVolume > pipetteCapacity

  if (
    appliedPatch.volume &&
    appliedPatch.pipette &&
    appliedPatch.pipette in pipetteEntities
  ) {
    if (pipetteCapacity) {
      if (
        !pipetteCapacityExceeded &&
        ['multiDispense', 'multiAspirate'].includes(appliedPatch.path)
      ) {
        const disposalVolume =
          appliedPatch.disposalVolume_checkbox &&
          appliedPatch.disposalVolume_volume
            ? appliedPatch.disposalVolume_volume
            : 0
        pipetteCapacityExceeded =
          numericVolume * 2 + disposalVolume > pipetteCapacity
      }
    }
  }

  if (pipetteCapacityExceeded) {
    return { ...patch, path: 'single' }
  }

  // changeTip value incompatible with next path value
  const incompatiblePath =
    (changeTip === 'perSource' && path === 'multiAspirate') ||
    (changeTip === 'perDest' && path === 'multiDispense')

  if (pipetteCapacityExceeded || incompatiblePath) {
    return { ...patch, path: 'single' }
  }
  return patch
}

export function renameOrderedSteps(fileData: PDProtocolFile): PDProtocolFile {
  const { data } = fileData['designer-application']
  return {
    ...fileData,
    'designer-application': {
      ...fileData['designer-application'],
      data: {
        ...data,
        orderedStepIds: data.orderedStepIds || data.orderedSteps,
        orderedSteps: undefined,
      },
    },
  }
}

// builds the initial deck setup step for older protocols that didn't have one.
export function addInitialDeckSetupStep(
  fileData: PDProtocolFile
): PDProtocolFile {
  const savedStepForms = fileData['designer-application'].data.savedStepForms

  // already has deck setup step, pass thru
  if (savedStepForms[INITIAL_DECK_SETUP_STEP_ID]) return fileData

  const additionalLabware = mapValues(
    fileData.labware,
    (labware: FileLabware) => labware.slot
  )
  const pipetteLocations = mapValues(
    fileData.pipettes,
    (pipette: FilePipette) => pipette.mount
  )

  const deckSetupStep = {
    ...initialDeckSetupStepForm,
    labwareLocationUpdate: {
      ...initialDeckSetupStepForm.labwareLocationUpdate,
      ...additionalLabware,
    },
    pipetteLocationUpdate: {
      ...initialDeckSetupStepForm.pipetteLocationUpdate,
      ...pipetteLocations,
    },
  }
  return {
    ...fileData,
    'designer-application': {
      ...fileData['designer-application'],
      data: {
        ...fileData['designer-application'].data,
        savedStepForms: {
          ...savedStepForms,
          [INITIAL_DECK_SETUP_STEP_ID]: deckSetupStep,
        },
      },
    },
  }
}

export const TCD_DEPRECATED_FIELD_NAMES = [
  'step-name',
  'step-details',
  'aspirate_changeTip',
  'aspirate_disposalVol_checkbox',
  'aspirate_disposalVol_volume',
  'aspirate_preWetTip',
  'aspirate_touchTip',
  'dispense_blowout_checkbox',
  'dispense_blowout_labware',
  'dispense_blowout_location',
  'offsetFromBottomMm',
  'dispense_touchTip',
  'aspirate_touchTip',
  'aspirate_touchTipMmFromBottom',
  'dispense_touchTipMmFromBottom',
]
export const MIX_DEPRECATED_FIELD_NAMES = [
  'step-name',
  'step-details',
  'aspirate_changeTip',
  'dispense_mmFromBottom',
  'aspirate_wellOrder_first',
  'aspirate_wellOrder_second',
  'dispense_blowout_checkbox',
  'dispense_blowout_labware',
  'dispense_blowout_location',
  'touchTip',
  'mix_touchTipMmFromBottom',
]
export function updateStepFormKeys(fileData: PDProtocolFile): PDProtocolFile {
  const savedStepForms = fileData['designer-application'].data.savedStepForms
  // NOTE: on LOAD_FILE, savedStepForms reducer will spread the form values
  // on top of over getDefaultsForStepType, so the defaults do not need to be
  // included here
  const migratedStepForms = mapValues(savedStepForms, formData => {
    if (['transfer', 'consolidate', 'distribute'].includes(formData.stepType)) {
      const updatedFields = {
        stepName: formData['step-name'],
        stepDetails: formData['step-details'],
        changeTip: formData['aspirate_changeTip'],
        blowout_checkbox: formData['dispense_blowout_checkbox'],
        blowout_location:
          formData['dispense_blowout_location'] ||
          formData['dispense_blowout_labware'],
        aspirate_touchTip_checkbox: formData['aspirate_touchTip'],
        dispense_touchTip_checkbox: formData['dispense_touchTip'],
        disposalVolume_checkbox: formData['aspirate_disposalVol_checkbox'],
        disposalVolume_volume: formData['aspirate_disposalVol_volume'],
        preWetTip: formData['aspirate_preWetTip'],
        aspirate_touchTip_mmFromBottom:
          formData['aspirate_touchTipMmFromBottom'],
        dispense_touchTip_mmFromBottom:
          formData['dispense_touchTipMmFromBottom'],
      }

      return {
        ...omitBy(updatedFields, isUndefined),
        ...omit(formData, TCD_DEPRECATED_FIELD_NAMES),
      }
    } else if (formData.stepType === 'mix') {
      const updatedFields = {
        stepName: formData['step-name'],
        stepDetails: formData['step-details'],
        changeTip: formData['aspirate_changeTip'],
        mix_mmFromBottom: formData['dispense_mmFromBottom'],
        mix_wellOrder_first: formData['aspirate_wellOrder_first'],
        mix_wellOrder_second: formData['aspirate_wellOrder_second'],
        mix_touchTip_checkbox: formData['touchTip'],
        blowout_checkbox: formData['dispense_blowout_checkbox'],
        blowout_location:
          formData['dispense_blowout_location'] ||
          formData['dispense_blowout_labware'],
        mix_touchTip_mmFromBottom: formData['mix_touchTipMmFromBottom'],
      }
      return {
        ...omitBy(updatedFields, isUndefined),
        ...omit(formData, MIX_DEPRECATED_FIELD_NAMES),
      }
    } else {
      return {
        stepName: formData['step-name'],
        stepDetails: formData['step-details'],
        ...omit(formData, ['step-name', 'step-details']),
      }
    }
  })

  return {
    ...fileData,
    'designer-application': {
      ...fileData['designer-application'],
      data: {
        ...fileData['designer-application'].data,
        savedStepForms: migratedStepForms,
      },
    },
  }
}

export function replaceTCDStepsWithMoveLiquidStep(
  fileData: PDProtocolFile
): PDProtocolFile {
  const savedStepForms = fileData['designer-application'].data.savedStepForms
  const migratedStepForms = mapValues(savedStepForms, formData => {
    const { stepType } = formData

    if (!['transfer', 'consolidate', 'distribute'].includes(stepType))
      return formData

    const pathMap = {
      transfer: 'single',
      consolidate: 'multiAspirate',
      distribute: 'multiDispense',
    }
    const proposedPatch = {
      path: pathMap[stepType],
      stepType: 'moveLiquid',
      aspirate_wells_grouped: false,
    }

    const pipetteEntities = mapValues(
      fileData['pipettes'],
      (pipette, pipetteId) => ({
        ...pipette,
        tiprackModel:
          fileData['designer-application'].data.pipetteTiprackAssignments[
            pipetteId
          ],
      })
    )
    // update path field patch if incompatible; fallback to 'single'
    const resolvedPatch = _updatePatchPathField(
      proposedPatch,
      formData,
      pipetteEntities
    )
    return { ...formData, ...resolvedPatch }
  })

  return {
    ...fileData,
    'designer-application': {
      ...fileData['designer-application'],
      data: {
        ...fileData['designer-application'].data,
        savedStepForms: migratedStepForms,
      },
    },
  }
}

export function updateVersion(fileData: PDProtocolFile): PDProtocolFile {
  return {
    ...fileData,
    'designer-application': {
      ...fileData['designer-application'],
    },
  }
}

const migrateFile = (fileData: PDProtocolFile): PDProtocolFile =>
  flow([
    renameOrderedSteps,
    addInitialDeckSetupStep,
    updateStepFormKeys,
    replaceTCDStepsWithMoveLiquidStep,
  ])(fileData)

export default migrateFile
