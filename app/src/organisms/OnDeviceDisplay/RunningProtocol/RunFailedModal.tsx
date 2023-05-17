import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'

import {
  Flex,
  SPACING,
  COLORS,
  TYPOGRAPHY,
  DIRECTION_COLUMN,
} from '@opentrons/components'
import { useStopRunMutation } from '@opentrons/react-api-client'

import { StyledText } from '../../../atoms/text'
import { SmallButton } from '../../../atoms/buttons'
import { Modal } from '../../../molecules/Modal/OnDeviceDisplay'

import type { ModalHeaderBaseProps } from '../../../molecules/Modal/OnDeviceDisplay/types'

interface RunError {
  id: string
  errorType: string
  createdAt: string
  detail: string
}

interface RunFailedModalProps {
  runId: string
  setShowRunFailedModal: (showRunFailedModal: boolean) => void
  errors?: RunError[]
}

export function RunFailedModal({
  runId,
  setShowRunFailedModal,
  errors,
}: RunFailedModalProps): JSX.Element | null {
  const { t, i18n } = useTranslation(['run_details', 'shared'])
  const history = useHistory()
  const { stopRun } = useStopRunMutation()
  const [isCanceling, setIsCanceling] = React.useState(false)

  if (errors == null) return null
  const modalHeader: ModalHeaderBaseProps = {
    title: t('run_failed_modal_title'),
    iconName: 'ot-alert',
    iconColor: COLORS.white,
  }

  const handleClose = (): void => {
    setIsCanceling(true)
    setShowRunFailedModal(false)
    stopRun(runId, {
      onSuccess: () => {
        // ToDo do we need to track this event?
        // If need, runCancel or runFailure something
        // trackProtocolRunEvent({ name: 'runCancel' })
        history.push('/dashboard')
      },
      onError: () => {
        setIsCanceling(false)
      },
    })
  }
  return (
    <Modal
      header={modalHeader}
      isError
      onOutsideClick={() => setShowRunFailedModal(false)}
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing40}
        padding={SPACING.spacing32}
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
          <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightBold}>
            {/* (kj:05/17/2023) errorType will be added when the endpoint is ready */}
            {t('error_type', {
              errorType: '',
            })}
          </StyledText>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing8}
            overflowY="scroll"
            maxHeight="5.375rem"
          >
            {errors.map(error => (
              <StyledText as="p" key={error.id}>
                {error.detail}
              </StyledText>
            ))}
            <StyledText as="p">{t('contact_information')}</StyledText>
          </Flex>
        </Flex>
        <SmallButton
          width="100%"
          buttonType="alert"
          buttonText={i18n.format(t('shared:close'), 'capitalize')}
          onClick={handleClose}
          disabled={isCanceling}
        />
      </Flex>
    </Modal>
  )
}
