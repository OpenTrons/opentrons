import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { COLORS, TEXT_TRANSFORM_CAPITALIZE } from '@opentrons/components'
import { PrimaryButton } from '../../atoms/buttons'
import { SimpleWizardBody } from '../../molecules/SimpleWizardBody'
import { FLOWS } from './constants'
import type { PipetteWizardStepProps } from './types'

interface ResultsProps extends PipetteWizardStepProps {
  handleCleanUpAndClose: () => void
}

export const Results = (props: ResultsProps): JSX.Element => {
  const {
    proceed,
    flowType,
    attachedPipette,
    mount,
    handleCleanUpAndClose,
  } = props
  const { t } = useTranslation(['pipette_wizard_flows', 'shared'])

  let header: string = 'unknown results screen'
  let iconColor: string = COLORS.successEnabled
  let isSuccess: boolean = true
  let buttonText: string = t('shared:exit')
  switch (flowType) {
    case FLOWS.CALIBRATE: {
      header = t('pip_cal_success')
      break
    }
    case FLOWS.ATTACH: {
      if (attachedPipette[mount] != null) {
        const pipetteName = attachedPipette[mount]?.modelSpecs.displayName
        header = t('pipette_attached', { pipetteName: pipetteName })
        buttonText = t('cal_pipette')
      } else {
        header = t('pipette_failed_to_attach')
        iconColor = COLORS.errorEnabled
        isSuccess = false
      }
      break
    }
    case FLOWS.DETACH: {
      if (attachedPipette[mount] != null) {
        header = t('pipette_failed_to_detach')
        iconColor = COLORS.errorEnabled
        isSuccess = false
      } else {
        header = t('pipette_detached')
      }
      break
    }
  }

  const handleProceed = (): void => {
    if (flowType === FLOWS.DETACH) {
      handleCleanUpAndClose()
    } else {
      proceed()
    }
  }

  return (
    <SimpleWizardBody
      iconColor={iconColor}
      header={header}
      isSuccess={isSuccess}
    >
      <PrimaryButton
        textTransform={TEXT_TRANSFORM_CAPITALIZE}
        onClick={handleProceed}
        aria-label="Results_exit"
      >
        {buttonText}
      </PrimaryButton>
    </SimpleWizardBody>
  )
}
