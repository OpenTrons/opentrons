import * as React from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { POSITION_AND_BLOWOUT } from './constants'
import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  ALIGN_FLEX_START,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  JUSTIFY_SPACE_BETWEEN,
  PrimaryButton,
  RESPONSIVENESS,
  SecondaryButton,
  SPACING,
  StyledText,
  TEXT_ALIGN_CENTER,
  TYPOGRAPHY,
} from '@opentrons/components'
// import { NeedHelpLink } from '../CalibrationPanels'
import { JogControls } from '../../molecules/JogControls'
import { SmallButton } from '../../atoms/buttons'
import { InProgressModal } from '../../molecules/InProgressModal/InProgressModal'
import { SimpleWizardBody } from '../../molecules/SimpleWizardBody'
import type { Jog } from '../../molecules/JogControls'

// TODO: get help link article URL
// const NEED_HELP_URL = ''

const Header = styled.h1`
  ${TYPOGRAPHY.h1Default}
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold}
  }
`

interface ConfirmPositionProps {
  handlePipetteAction: () => void
  handleGoBack: () => void
  isOnDevice: boolean
  currentStep: string
}

const ConfirmPosition = (props: ConfirmPositionProps): JSX.Element | null => {
  const { handlePipetteAction, handleGoBack, isOnDevice, currentStep } = props
  const { i18n, t } = useTranslation(['drop_tip_wizard', 'shared'])
  const flowTitle = t('drop_tips')

  if (isOnDevice) {
    return (
      <Flex
        padding={SPACING.spacing32}
        gridGap={SPACING.spacing24}
        flexDirection={DIRECTION_COLUMN}
        height="100%"
      >
        <Flex
          paddingX={SPACING.spacing40}
          gridGap={SPACING.spacing24}
          justifyContent={JUSTIFY_CENTER}
          alignItems={ALIGN_CENTER}
          textAlign={TEXT_ALIGN_CENTER}
          flexDirection={DIRECTION_COLUMN}
          width="100%"
          height="20.25rem"
        >
          <Flex gridGap={SPACING.spacing24}>
            <Icon
              name="ot-alert"
              size="3.75rem"
              color={COLORS.yellow50}
              aria-label="ot-alert"
            />
          </Flex>
          <StyledText
            fontSize={TYPOGRAPHY.fontSize32}
            fontWeight={TYPOGRAPHY.fontWeightBold}
          >
            {currentStep === POSITION_AND_BLOWOUT
              ? t('confirm_blowout_location', { flow: flowTitle })
              : t('confirm_drop_tip_location', { flow: flowTitle })}
          </StyledText>
        </Flex>
        <Flex
          justifyContent={JUSTIFY_FLEX_END}
          gridGap={SPACING.spacing8}
          alignItems={ALIGN_FLEX_END}
        >
          <SmallButton
            buttonType="secondary"
            buttonText={t('shared:go_back')}
            onClick={handleGoBack}
          />
          <SmallButton
            buttonText={
              currentStep === POSITION_AND_BLOWOUT
                ? i18n.format(t('blowout_liquid'), 'capitalize')
                : i18n.format(t('drop_tips'), 'capitalize')
            }
            onClick={handlePipetteAction}
          />
        </Flex>
      </Flex>
    )
  } else {
    return (
      <SimpleWizardBody
        iconColor={COLORS.yellow50}
        header={
          currentStep === POSITION_AND_BLOWOUT
            ? t('confirm_blowout_location', { flow: flowTitle })
            : t('confirm_drop_tip_location', { flow: flowTitle })
        }
        isSuccess={false}
      >
        <Flex
          width="100%"
          marginTop={SPACING.spacing32}
          justifyContent={JUSTIFY_FLEX_END}
          alignItems={ALIGN_CENTER}
          paddingLeft={SPACING.spacing32}
        >
          {/* <NeedHelpLink href={NEED_HELP_URL} /> */}
          <Flex gridGap={SPACING.spacing8}>
            <SecondaryButton
              onClick={handleGoBack}
              marginRight={SPACING.spacing4}
            >
              {t('shared:go_back')}
            </SecondaryButton>
            <PrimaryButton onClick={handlePipetteAction}>
              {currentStep === POSITION_AND_BLOWOUT
                ? i18n.format(t('blowout_liquid'), 'capitalize')
                : i18n.format(t('drop_tips'), 'capitalize')}
            </PrimaryButton>
          </Flex>
        </Flex>
      </SimpleWizardBody>
    )
  }
}

interface JogToPositionProps {
  handleGoBack: () => void
  handleJog: Jog
  handleProceed: () => void
  body: string
  currentStep: string
  isOnDevice: boolean
}

export const JogToPosition = (
  props: JogToPositionProps
): JSX.Element | null => {
  const {
    handleGoBack,
    handleJog,
    handleProceed,
    body,
    currentStep,
    isOnDevice,
  } = props
  const { i18n, t } = useTranslation(['drop_tip_wizard', 'shared'])
  const [
    showPositionConfirmation,
    setShowPositionConfirmation,
  ] = React.useState(false)
  // Includes special case homing only present in this step.
  const [isRobotInMotion, setIsRobotInMotion] = React.useState(false)

  const onGoBack = (): void => {
    setIsRobotInMotion(true)
    handleGoBack()
  }

  if (showPositionConfirmation) {
    return isRobotInMotion ? (
      <InProgressModal
        alternativeSpinner={null}
        description={
          currentStep === POSITION_AND_BLOWOUT
            ? t('stand_back_blowing_out')
            : t('stand_back_dropping_tips')
        }
      />
    ) : (
      <ConfirmPosition
        handlePipetteAction={() => {
          setIsRobotInMotion(true)
          handleProceed()
        }}
        handleGoBack={() => {
          setShowPositionConfirmation(false)
        }}
        isOnDevice={isOnDevice}
        currentStep={currentStep}
      />
    )
  }

  if (isOnDevice) {
    return (
      <Flex
        width="100%"
        alignItems={ALIGN_CENTER}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing24}
        padding={SPACING.spacing32}
      >
        <JogControls jog={handleJog} isOnDevice={true} />
        <Flex width="100%" gridGap={SPACING.spacing10}>
          <Flex width="100%">
            <SmallButton
              buttonType="tertiaryLowLight"
              buttonText={t('shared:go_back')}
              onClick={onGoBack}
            />
          </Flex>
          <Flex justifyContent={JUSTIFY_FLEX_END} width="100%">
            <SmallButton
              buttonText={t('shared:confirm_position')}
              onClick={() => {
                setShowPositionConfirmation(true)
              }}
            />
          </Flex>
        </Flex>
      </Flex>
    )
  } else {
    return (
      <Flex
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        padding={SPACING.spacing32}
        minHeight="29.5rem"
      >
        <Flex gridGap={SPACING.spacing24}>
          <Flex
            flex="1"
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing8}
            alignItems={ALIGN_FLEX_START}
          >
            <Header>
              {i18n.format(t('position_the_pipette'), 'capitalize')}
            </Header>
            <StyledText as="p">{body}</StyledText>
          </Flex>
          {/* no animations */}
          <Flex
            flex="1"
            alignItems={ALIGN_CENTER}
            gridGap={SPACING.spacing20}
          ></Flex>
        </Flex>
        <>
          <JogControls jog={handleJog} />
          <Flex
            width="100%"
            marginTop={SPACING.spacing32}
            justifyContent={JUSTIFY_FLEX_END}
          >
            {/* <NeedHelpLink href={NEED_HELP_URL} /> */}
            <Flex gridGap={SPACING.spacing8}>
              <SecondaryButton onClick={onGoBack}>
                {t('shared:go_back')}
              </SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  setShowPositionConfirmation(true)
                }}
              >
                {t('shared:confirm_position')}
              </PrimaryButton>
            </Flex>
          </Flex>
        </>
      </Flex>
    )
  }
}
