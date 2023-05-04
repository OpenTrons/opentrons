import { FormData } from '../../../form-types'
import { FormPatch } from '../../actions/types'
import { chainPatchUpdaters, fieldHasChanged } from './utils'

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
