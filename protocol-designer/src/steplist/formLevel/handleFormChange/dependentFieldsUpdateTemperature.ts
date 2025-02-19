import pick from 'lodash/pick'
import { chainPatchUpdaters, fieldHasChanged } from './utils'
import { getDefaultsForStepType } from '../getDefaultsForStepType'
import type { FormData, StepFieldName } from '/protocol-designer/form-types'
import type { FormPatch } from '/protocol-designer/steplist/actions/types'

// TODO: Ian 2019-02-21 import this from a more central place - see #2926
const getDefaultFields = (...fields: StepFieldName[]): FormPatch =>
  pick(getDefaultsForStepType('temperature'), fields)

const updatePatchOnSetTemperatureChange = (
  patch: FormPatch,
  rawForm: FormData
): FormPatch => {
  if (fieldHasChanged(rawForm, patch, 'setTemperature')) {
    return { ...patch, ...getDefaultFields('targetTemperature') }
  }

  return patch
}

export function dependentFieldsUpdateTemperature(
  originalPatch: FormPatch,
  rawForm: FormData // raw = NOT hydrated
): FormPatch {
  // sequentially modify parts of the patch until it's fully updated
  return chainPatchUpdaters(originalPatch, [
    chainPatch => updatePatchOnSetTemperatureChange(chainPatch, rawForm),
  ])
}
