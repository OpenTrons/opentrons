import * as React from 'react'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  Flex,
  DIRECTION_COLUMN,
  JUSTIFY_CENTER,
  ALIGN_CENTER,
  SPACING,
  TYPOGRAPHY,
  COLORS,
} from '@opentrons/components'
import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'

import { StyledText } from '../../../atoms/text'
import { StepMeter } from '../../../atoms/StepMeter'
import { MediumButton } from '../../../atoms/buttons'
import screenImage from '../../../assets/images/on-device-display/odd_abstract@x2.png'
import type { SetStatusBarCreateCommand } from '@opentrons/shared-data/protocol/types/schemaV7/command/incidental'

const IMAGE_ALT = 'finish setting up a robot'

interface ConfirmRobotNameProps {
  robotName: string
}

export function ConfirmRobotName({
  robotName,
}: ConfirmRobotNameProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const animationCommand: SetStatusBarCreateCommand = {
    commandType: 'setStatusBar',
    params: { animation: 'disco' },
  }
  const history = useHistory()

  const handleClick = (): void => {
    createLiveCommand({
      command: animationCommand,
      waitUntilComplete: false,
    }).catch((e: Error) =>
      console.warn(`cannot run status bar animation: ${e.message}`)
    )
    history.push('/dashboard')
  }
  return (
    <>
      <StepMeter totalSteps={6} currentStep={6} />
      <Flex
        padding={`${SPACING.spacing32} ${SPACING.spacing40} ${SPACING.spacing40}`}
        flexDirection={DIRECTION_COLUMN}
      >
        <Flex justifyContent={JUSTIFY_CENTER} marginBottom="3.041875rem">
          <StyledText as="h2" fontWeight={TYPOGRAPHY.fontWeightBold}>
            {t('name_love_it', { name: robotName })}
          </StyledText>
        </Flex>
        <Flex height="26.5625rem" justifyContent={JUSTIFY_CENTER}>
          <Flex
            justifyContent={JUSTIFY_CENTER}
            alignItems={ALIGN_CENTER}
            flexDirection={DIRECTION_COLUMN}
          >
            <img
              alt={IMAGE_ALT}
              src={screenImage}
              width="944px"
              height="236px"
            />
            <StyledText
              as="h4"
              fontWeight={TYPOGRAPHY.fontWeightRegular}
              marginTop={SPACING.spacing12}
              marginBottom={SPACING.spacing40}
              color={COLORS.darkBlack70}
            >
              {t('your_robot_is_ready_to_go')}
            </StyledText>
            <MediumButton
              buttonType="primary"
              buttonCategory="rounded"
              buttonText={t('finish_setup')}
              onClick={handleClick}
            />
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}
