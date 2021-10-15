import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ModalPage } from '@opentrons/components'
import { Portal } from '../../../App/portal'
import { useSteps } from './hooks'
import { IntroScreen } from './IntroScreen'
import { GenericStepScreen } from './GenericStepScreen'

import styles from '../styles.css'

interface LabwarePositionCheckModalProps {
  onCloseClick: () => unknown
}

export const LabwarePositionCheck = (
  props: LabwarePositionCheckModalProps
): JSX.Element | null => {
  const { t } = useTranslation(['labware_position_check', 'shared'])
  const steps = useSteps()
  const [currentLabwareCheckStep, setCurrentLabwareCheckStep] = React.useState<
    number | null
  >(null)

  return (
    <Portal level="top">
      <ModalPage
        contentsClassName={styles.modal_contents}
        titleBar={{
          title: t('labware_position_check_title'),
          back: {
            onClick: props.onCloseClick,
            title: t('shared:exit'),
            children: t('shared:exit'),
          },
        }}
      >
        {currentLabwareCheckStep !== null ? (
          <GenericStepScreen
            setCurrentLabwareCheckStep={setCurrentLabwareCheckStep}
            selectedStep={steps[currentLabwareCheckStep]}
          />
        ) : (
          <IntroScreen
            setCurrentLabwareCheckStep={setCurrentLabwareCheckStep}
          />
        )}
      </ModalPage>
    </Portal>
  )
}
