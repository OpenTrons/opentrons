import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  Btn,
  COLORS,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  RESPONSIVENESS,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  StyledText,
} from '@opentrons/components'
import { StepMeter } from '/app/atoms/StepMeter'

interface WizardHeaderProps {
  title: string
  onExit?: (() => void) | null
  totalSteps?: number | null
  currentStep?: number | null
  exitDisabled?: boolean
  hideStepText?: boolean
}

const EXIT_BUTTON_STYLE = css`
  ${TYPOGRAPHY.pSemiBold};
  text-transform: ${TYPOGRAPHY.textTransformCapitalize};
  color: ${COLORS.grey60};

  &:hover {
    color: ${COLORS.grey50};
  }
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    margin-right: 1.75rem;
    font-size: ${TYPOGRAPHY.fontSize22};
    font-weight: ${TYPOGRAPHY.fontWeightBold};
    &:hover {
      opacity: 100%;
    }
    &:active {
      color: ${COLORS.grey50};
    }
  }
`
const BOX_STYLE = css`
  background-color: ${COLORS.white};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    border-radius: ${BORDERS.borderRadius16};
  }
`
const HEADER_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_ROW};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  padding: ${SPACING.spacing16} ${SPACING.spacing32};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding: 1.75rem ${SPACING.spacing32};
    border-radius: ${BORDERS.borderRadius16};
  }
`

const STEP_TEXT_STYLE = css`
  ${TYPOGRAPHY.pSemiBold}
  color: ${COLORS.grey60};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: 1.375rem;
    margin-left: ${SPACING.spacing16};
  }
`

export const WizardHeader = (props: WizardHeaderProps): JSX.Element => {
  const {
    totalSteps,
    currentStep,
    hideStepText,
    title,
    onExit,
    exitDisabled,
  } = props
  const { t } = useTranslation('shared')

  return (
    <Box css={BOX_STYLE}>
      <Flex css={HEADER_CONTAINER_STYLE}>
        <Flex flexDirection={DIRECTION_ROW} alignItems={ALIGN_CENTER}>
          <StyledText
            desktopStyle="bodyLargeSemiBold"
            oddStyle="bodyTextSemiBold"
          >
            {title}
          </StyledText>

          {!hideStepText &&
          currentStep != null &&
          totalSteps != null &&
          currentStep > 0 ? (
            <LegacyStyledText css={STEP_TEXT_STYLE}>
              {t('step', { current: currentStep, max: totalSteps })}
            </LegacyStyledText>
          ) : null}
        </Flex>
        {onExit != null ? (
          <Btn onClick={onExit} aria-label="Exit" disabled={exitDisabled}>
            <LegacyStyledText css={EXIT_BUTTON_STYLE}>
              {t('exit')}
            </LegacyStyledText>
          </Btn>
        ) : null}
      </Flex>
      <StepMeter totalSteps={totalSteps ?? 0} currentStep={currentStep ?? 0} />
    </Box>
  )
}
