import { createSelector } from 'reselect'
import { selectors as fileDataSelectors } from '/protocol-designer/file-data'
import { selectors as stepFormSelectors } from '/protocol-designer/step-forms'
import { getSelectedStepId } from '/protocol-designer/ui/steps'
import { selectors as dismissSelectors } from '/protocol-designer/dismiss'
import type { CommandCreatorWarning } from '@opentrons/step-generation'
import type { Selector } from '/protocol-designer/types'
export const getTimelineWarningsForSelectedStep: Selector<
  CommandCreatorWarning[]
> = createSelector(
  dismissSelectors.getDismissedTimelineWarningTypes,
  fileDataSelectors.timelineWarningsPerStep,
  getSelectedStepId,
  (dismissedWarningTypes, warningsPerStep, stepId) => {
    if (stepId == null) return []
    return (warningsPerStep[stepId] || []).filter(
      warning => !dismissedWarningTypes.includes(warning.type)
    )
  }
)
type HasWarningsPerStep = Record<string, boolean>
export const getHasTimelineWarningsPerStep: Selector<HasWarningsPerStep> = createSelector(
  dismissSelectors.getDismissedTimelineWarningTypes,
  fileDataSelectors.timelineWarningsPerStep,
  stepFormSelectors.getOrderedStepIds,
  (dismissedWarningTypes, warningsPerStep, orderedStepIds) => {
    return orderedStepIds.reduce((stepAcc: HasWarningsPerStep, stepId) => {
      const warningTypesForStep = (warningsPerStep[stepId] || []).map(
        w => w.type
      )
      const hasUndismissedWarnings =
        warningTypesForStep.filter(
          warningType => !dismissedWarningTypes.includes(warningType)
        ).length > 0
      return { ...stepAcc, [stepId]: hasUndismissedWarnings }
    }, {})
  }
)
