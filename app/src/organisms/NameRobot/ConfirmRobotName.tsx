import * as React from 'react'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'

import {
  Flex,
  DIRECTION_COLUMN,
  JUSTIFY_CENTER,
  ALIGN_CENTER,
  SPACING,
  TYPOGRAPHY,
  COLORS,
  PrimaryButton,
} from '@opentrons/components'

import { StyledText } from '../../atoms/text'
import { StepMeter } from '../../atoms/StepMeter'
import { updateConfigValue } from '../../redux/config'
import screenImage from '../../assets/images/on-device-display/odd_abstract@x2.png'

import type { Dispatch } from '../../redux/types'

const IMAGE_ALT = 'finish setting up a robot'

interface ConfirmRobotNameProps {
  robotName: string
}

export function ConfirmRobotName({
  robotName,
}: ConfirmRobotNameProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const history = useHistory()
  const dispatch = useDispatch<Dispatch>()

  const handleClick = (): void => {
    dispatch(
      updateConfigValue(
        'onDeviceDisplaySettings.unfinishedUnboxingFlowRoute',
        null
      )
    )
    history.push('/dashboard')
  }
  return (
    <>
      <StepMeter totalSteps={5} currentStep={5} OnDevice />
      <Flex
        padding={`${SPACING.spacing32} ${SPACING.spacing40} ${SPACING.spacing40}`}
        flexDirection={DIRECTION_COLUMN}
      >
        <Flex justifyContent={JUSTIFY_CENTER} marginBottom="3.041875rem">
          <StyledText
            fontSize="2rem"
            fontWeight="700"
            lineHeight="2.75rem"
            color={COLORS.black}
          >
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
              marginTop={SPACING.spacing40}
              fontSize="1.625rem"
              lineHeight="2.1875rem"
              fontWeight={TYPOGRAPHY.fontWeightRegular}
            >
              {t('your_robot_is_ready_to_go')}
            </StyledText>
            <PrimaryButton
              marginTop={SPACING.spacing40}
              onClick={handleClick}
              width="100%"
              height="4.375rem"
              fontSize="1.5rem"
              lineHeight="1.375rem"
            >
              {t('finish_setup')}
            </PrimaryButton>
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}
