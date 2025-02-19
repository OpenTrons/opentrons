import { chainPatchUpdaters, fieldHasChanged } from './utils'
import type { FormData } from '/protocol-designer/form-types'
import type { FormPatch } from '/protocol-designer/steplist/actions/types'

const updatePatchOnSetShakeChange = (
  patch: FormPatch,
  rawForm: FormData
): FormPatch => {
  // when setShake is toggled to true, change latchOpen to false
  if (fieldHasChanged(rawForm, patch, 'setShake') && patch.setShake === true) {
    return {
      ...patch,
      ...{ latchOpen: false },
    }
  }

  return patch
}

export function dependentFieldsUpdateHeaterShaker(
  originalPatch: FormPatch,
  rawForm: FormData // raw = NOT hydrated
): FormPatch {
  // sequentially modify parts of the patch until it's fully updated
  return chainPatchUpdaters(originalPatch, [
    chainPatch => updatePatchOnSetShakeChange(chainPatch, rawForm),
  ])
}
