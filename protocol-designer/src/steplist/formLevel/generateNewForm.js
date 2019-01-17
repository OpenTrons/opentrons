// @flow
import i18n from '../../localization'
import getDefaultsForStepType from './getDefaultsForStepType'
import type {
  StepType,
  StepIdType,
  BlankForm,
  FormData,
} from '../../form-types'

type NewFormArgs = {
  stepId: StepIdType,
  stepType: StepType,
}

// Add default values to a new step form
export default function generateNewForm (args: NewFormArgs): FormData {
  const {stepId, stepType} = args
  const baseForm: BlankForm = {
    id: stepId,
    stepType: stepType,
    stepName: i18n.t(`button.stepType.${stepType}`),
    stepDetails: '',
  }

  let additionalFields = {}

  return {
    ...baseForm,
    ...getDefaultsForStepType(stepType),
    ...additionalFields,
  }
}
