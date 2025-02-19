import findKey from 'lodash/findKey'
import last from 'lodash/last'
import type { PipetteOnDeck } from '/protocol-designer/step-forms'
import type { StepIdType, FormData } from '/protocol-designer/form-types'
// TODO: Ian 2018-09-18 once we support switching pipettes mid-protocol,
// this should use pipette state in RobotState, instead of pipettes/ selectors
// (which represent initial pipette state, expected to be static across the timeline)

/** returns the last used pipette or, if no pipette has been used,
 * the 'left' pipette (or 'right' if there is no 'left' ) */
export function getNextDefaultPipetteId(
  savedForms: Record<StepIdType, FormData>,
  orderedStepIds: StepIdType[],
  equippedPipettesById: Record<string, PipetteOnDeck>
): string {
  const prevPipetteSteps = orderedStepIds
    .map(stepId => savedForms[stepId])
    .filter(form => form && form.pipette)
  const lastPipetteStep = last(prevPipetteSteps)
  // NOTE: order of findKey not guaranteed, expecting at most one pipette on each mount
  const nextDefaultPipette: string | null | undefined =
    (lastPipetteStep && lastPipetteStep.pipette) ||
    findKey(equippedPipettesById, p => p.mount === 'left') ||
    findKey(equippedPipettesById, p => p.mount === 'right')

  if (!nextDefaultPipette) {
    console.error('Could not get next default pipette. Something went wrong.')
    return ''
  }

  return nextDefaultPipette
}
