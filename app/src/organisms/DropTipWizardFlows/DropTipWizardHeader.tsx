import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { BEFORE_BEGINNING, BLOWOUT_SUCCESS, DT_ROUTES } from './constants'
import { useWizardExitHeader } from './hooks'
import { WizardHeader } from '../../molecules/WizardHeader'

import type { DropTipWizardProps } from './DropTipWizard'
import type { DropTipFlowsRoute, DropTipFlowsStep } from './types'

type DropTipWizardHeaderProps = DropTipWizardProps & {
  isExitInitiated: boolean
  isFinalWizardStep: boolean
  confirmExit: () => void
}

export function DropTipWizardHeader({
  confirmExit,
  currentStep,
  currentRoute,
  currentStepIdx,
  isExitInitiated,
  isFinalWizardStep,
  errorDetails,
  dropTipCommands,
}: DropTipWizardHeaderProps): JSX.Element {
  const { handleCleanUpAndClose } = dropTipCommands
  const { t, i18n } = useTranslation('drop_tip_wizard')

  const wizardHeaderOnExit = useWizardExitHeader({
    isFinalStep: isFinalWizardStep,
    hasInitiatedExit: isExitInitiated,
    errorDetails,
    confirmExit,
    handleCleanUpAndClose,
  })

  const { totalSteps, currentStepNumber } = useSeenBlowoutSuccess({
    currentStep,
    currentRoute,
    currentStepIdx,
  })

  return (
    <WizardHeader
      title={i18n.format(t('drop_tips'), 'capitalize')}
      currentStep={currentStepNumber}
      totalSteps={totalSteps}
      onExit={wizardHeaderOnExit}
    />
  )
}

interface UseSeenBlowoutSuccessProps {
  currentStep: DropTipFlowsStep
  currentRoute: DropTipFlowsRoute
  currentStepIdx: number
}

interface UseSeenBlowoutSuccessResult {
  currentStepNumber: number | null
  totalSteps: number | null
}

// Calculate the props used for determining step count based on the route. Because blowout and drop tip are separate routes,
// there's a need for state to track whether we've seen blowout, so the step counter is accurate when the drop tip route is active.
function useSeenBlowoutSuccess({
  currentStep,
  currentRoute,
  currentStepIdx,
}: UseSeenBlowoutSuccessProps): UseSeenBlowoutSuccessResult {
  const [hasSeenBlowoutSuccess, setHasSeenBlowoutSuccess] = React.useState(
    false
  )

  React.useEffect(() => {
    if (currentStep === BLOWOUT_SUCCESS) {
      setHasSeenBlowoutSuccess(true)
    } else if (currentStep === BEFORE_BEGINNING) {
      setHasSeenBlowoutSuccess(false)
    }
  }, [currentStep])

  const shouldRenderStepCounter = currentRoute !== DT_ROUTES.BEFORE_BEGINNING

  let totalSteps: null | number
  if (!shouldRenderStepCounter) {
    totalSteps = null
  } else if (currentRoute === DT_ROUTES.BLOWOUT || hasSeenBlowoutSuccess) {
    totalSteps = DT_ROUTES.BLOWOUT.length + DT_ROUTES.DROP_TIP.length
  } else {
    totalSteps = currentRoute.length
  }

  let currentStepNumber: null | number
  if (!shouldRenderStepCounter) {
    currentStepNumber = null
  } else if (hasSeenBlowoutSuccess && currentRoute === DT_ROUTES.DROP_TIP) {
    currentStepNumber = DT_ROUTES.BLOWOUT.length + currentStepIdx + 1
  } else {
    currentStepNumber = currentStepIdx + 1
  }

  return { currentStepNumber, totalSteps }
}
