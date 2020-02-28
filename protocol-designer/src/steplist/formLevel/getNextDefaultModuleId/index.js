// @flow
import findKey from 'lodash/findKey'
import last from 'lodash/last'
import {
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'

import type { ModuleOnDeck } from '../../../step-forms'
import type { StepIdType, FormData } from '../../../form-types'

const isLastStepTemp = (lastModuleStep: FormData = {}): boolean =>
  !!(lastModuleStep.moduleId && lastModuleStep.stepType === 'temperature')

export function getNextDefaultTemperatureModuleId(
  savedForms: { [StepIdType]: FormData },
  orderedStepIds: Array<StepIdType>,
  equippedModulesById: { [moduleId: string]: ModuleOnDeck }
): string | null {
  const prevModuleSteps = orderedStepIds
    .map(stepId => savedForms[stepId])
    .filter(form => form && form.moduleId)

  const lastModuleStep = last(prevModuleSteps)

  // TODO (ka 2019-12-20): Since we are hiding the thermocylcer module as an option for now,
  // should we simplify this to only return temperature modules?
  const nextDefaultModule: string | null =
    (isLastStepTemp(lastModuleStep) && lastModuleStep.moduleId) ||
    findKey(equippedModulesById, m => m.type === TEMPERATURE_MODULE_TYPE) ||
    findKey(equippedModulesById, m => m.type === THERMOCYCLER_MODULE_TYPE) ||
    null

  return nextDefaultModule || null
}
