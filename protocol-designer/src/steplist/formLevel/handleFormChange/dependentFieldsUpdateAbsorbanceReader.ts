import pick from 'lodash/pick'
import { ABSORBANCE_READER_COLOR_BY_WAVELENGTH } from '../../../constants'
import { getDefaultsForStepType } from '../getDefaultsForStepType'
import { chainPatchUpdaters, fieldHasChanged } from './utils'
import type { FormData, StepFieldName } from '../../../form-types'
import type { FormPatch } from '../../actions/types'

const getDefaultFields = (...fields: StepFieldName[]): FormPatch =>
  pick(getDefaultsForStepType('absorbanceReader'), fields)

const updatePatchOnAbsorbanceReaderFormType = (
  patch: FormPatch,
  rawForm: FormData
): FormPatch => {
  if (
    rawForm.absorbanceReaderFormType !== null &&
    fieldHasChanged(rawForm, patch, 'absorbanceReaderFormType')
  ) {
    return {
      ...patch,
      ...getDefaultFields(
        'wavelengths',
        'referenceWavelength',
        'referenceWavelengthActive',
        'lidOpen',
        'mode',
        'fileName'
      ),
    }
  }

  return patch
}

const updatePatchOnAbsorbanceReaderReferenceWavelengthActive = (
  patch: FormPatch,
  rawForm: FormData
): FormPatch => {
  if (
    fieldHasChanged(rawForm, patch, 'referenceWavelengthActive') &&
    !rawForm.referenceWavelengthActive &&
    rawForm.referenceWavelength == null
  ) {
    return {
      ...patch,
      referenceWavelength: Object.keys(
        ABSORBANCE_READER_COLOR_BY_WAVELENGTH
      )[0],
    }
  }
  return patch
}

export const dependentFieldsUpdateAbsorbanceReader = (
  originalPatch: FormPatch,
  rawForm: FormData
): FormPatch => {
  return chainPatchUpdaters(originalPatch, [
    chainPatch => updatePatchOnAbsorbanceReaderFormType(chainPatch, rawForm),
    chainPatch =>
      updatePatchOnAbsorbanceReaderReferenceWavelengthActive(
        chainPatch,
        rawForm
      ),
  ])
}
