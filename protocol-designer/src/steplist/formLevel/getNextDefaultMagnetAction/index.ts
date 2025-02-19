import last from 'lodash/last'
import type {
  StepIdType,
  FormData,
  MagnetAction,
} from '/protocol-designer/form-types'
export function getNextDefaultMagnetAction(
  savedForms: Record<StepIdType, FormData>,
  orderedStepIds: StepIdType[]
): MagnetAction {
  const prevMagnetSteps = orderedStepIds
    .map(stepId => savedForms[stepId])
    .filter(form => form && form.magnetAction)
  const lastMagnetStep = last(prevMagnetSteps)
  // default the first magnet step to engage so that
  // recommended engage height can auto populate
  let nextDefaultMagnetAction: MagnetAction = 'engage'

  if (lastMagnetStep && lastMagnetStep.magnetAction) {
    nextDefaultMagnetAction =
      lastMagnetStep.magnetAction === 'engage' ? 'disengage' : 'engage'
  }

  return nextDefaultMagnetAction
}
