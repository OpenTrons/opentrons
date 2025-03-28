import { defaultMemoize } from 'reselect'
import { getDisabledFieldsMoveLiquidForm } from './getDisabledFieldsMoveLiquidForm'
import { getDisabledFieldsMixForm } from './getDisabledFieldsMixForm'
import { getDisabledFieldsHeaterShaker } from './getDisabledFieldsHeaterShaker'
import type {
  HydratedFormData,
  HydratedHeaterShakerFormData,
  HydratedMixFormData,
  HydratedMoveLiquidFormData,
} from '../../../form-types'

function _getDisabledFields(hydratedForm: HydratedFormData): Set<string> {
  switch (hydratedForm.stepType) {
    case 'moveLiquid':
      return getDisabledFieldsMoveLiquidForm(
        hydratedForm as HydratedMoveLiquidFormData
      )

    case 'mix':
      return getDisabledFieldsMixForm(hydratedForm as HydratedMixFormData)

    case 'heaterShaker':
      return getDisabledFieldsHeaterShaker(
        hydratedForm as HydratedHeaterShakerFormData
      )

    case 'comment':
    case 'pause':
    case 'magnet':
    case 'thermocycler':
    case 'moveLabware':
      return new Set()

    // nothing to disabled
    default: {
      console.warn(
        `disabled fields for step type ${hydratedForm.stepType} not yet implemented!`
      )
      return new Set()
    }
  }
}

// shallow-memoized because every disable-able field in the form calls this function once
// WARNING: do not mutate the same rawForm obj or this memoization will break
export const getDisabledFields: (
  hydratedForm: HydratedFormData
) => Set<string> = defaultMemoize(_getDisabledFields)
