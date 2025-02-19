import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { PRESAVED_STEP_ID } from '/protocol-designer/steplist/types'
import { selectors as stepFormSelectors } from '/protocol-designer/step-forms'
import { stepIconsByType } from '/protocol-designer/form-types'
import {
  getHoveredTerminalItemId,
  getSelectedTerminalItemId,
  actions as stepsActions,
} from '/protocol-designer/ui/steps'
import { StepContainer } from './StepContainer'

interface PresavedStepProps {
  sidebarWidth: number
}

export function PresavedStep({
  sidebarWidth,
}: PresavedStepProps): JSX.Element | null {
  const { t } = useTranslation('application')
  const presavedStepForm = useSelector(stepFormSelectors.getPresavedStepForm)
  const stepNumber = useSelector(stepFormSelectors.getOrderedStepIds).length + 1
  const hovered = useSelector(getHoveredTerminalItemId) === PRESAVED_STEP_ID
  const selected = useSelector(getSelectedTerminalItemId) === PRESAVED_STEP_ID
  const dispatch = useDispatch()

  if (presavedStepForm === null) {
    return null
  }

  const highlightStep = (): void => {
    dispatch(stepsActions.hoverOnTerminalItem(PRESAVED_STEP_ID))
  }
  const unhighlightStep = (): void => {
    dispatch(stepsActions.hoverOnTerminalItem(null))
  }

  const stepType = presavedStepForm.stepType

  return (
    <StepContainer
      onMouseEnter={highlightStep}
      onMouseLeave={unhighlightStep}
      selected={selected}
      hovered={hovered}
      iconName={stepIconsByType[stepType]}
      title={`${stepNumber}. ${t(`stepType.${stepType}`)}`}
      sidebarWidth={sidebarWidth}
    />
  )
}
