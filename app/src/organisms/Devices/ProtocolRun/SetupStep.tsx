import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  Box,
  Btn,
  Flex,
  Icon,
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  JUSTIFY_SPACE_BETWEEN,
  SIZE_1,
  TEXT_ALIGN_LEFT,
  TEXT_TRANSFORM_CAPITALIZE,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { StyledText } from '../../../atoms/text'

interface SetupStepProps {
  expanded: boolean
  title: React.ReactNode
  description: string
  label: string
  toggleExpanded: () => void
  children: React.ReactNode
  calibrationStatusComplete: boolean | null
}

const EXPANDED_STYLE = css`
  transition: max-height 300ms ease-in, visibility 400ms ease;
  visibility: visible;
  max-height: 100vh;
  overflow: hidden;
  margin-left: ${SPACING.spacing4};
`
const COLLAPSED_STYLE = css`
  transition: max-height 500ms ease-out;
  visibility: hidden;
  max-height: 0vh;
  overflow: hidden;
`
export function SetupStep({
  expanded,
  title,
  description,
  label,
  toggleExpanded,
  children,
  calibrationStatusComplete,
}: SetupStepProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <Btn textAlign={TEXT_ALIGN_LEFT}>
        <Flex
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <Flex
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            width="100%"
            onClick={toggleExpanded}
          >
            <Flex flexDirection={DIRECTION_COLUMN}>
              <StyledText
                color={COLORS.darkGreyEnabled}
                css={TYPOGRAPHY.h6SemiBold}
                marginBottom={SPACING.spacing1}
                id={`CollapsibleStep_${label}`}
              >
                {label}
              </StyledText>
              <StyledText
                color={COLORS.darkBlack}
                css={TYPOGRAPHY.h3SemiBold}
                marginBottom={SPACING.spacing2}
                id={`CollapsibleStep_${title}`}
              >
                {title}
              </StyledText>
              <StyledText
                as="p"
                color={COLORS.darkBlack}
                id={`CollapsibleStep_${description}`}
              >
                {description}
              </StyledText>
            </Flex>
            <Flex alignItems={ALIGN_CENTER} flexDirection={DIRECTION_ROW}>
              {calibrationStatusComplete !== null ? (
                <Flex flexDirection={DIRECTION_ROW}>
                  <Icon
                    size={SIZE_1}
                    color={
                      calibrationStatusComplete
                        ? COLORS.success
                        : COLORS.warning
                    }
                    marginRight={SPACING.spacing3}
                    name={
                      calibrationStatusComplete
                        ? 'check-circle'
                        : 'alert-circle'
                    }
                    id={'RunSetupCard_calibrationIcon'}
                  />
                  <StyledText
                    color={COLORS.black}
                    css={TYPOGRAPHY.pSemiBold}
                    marginRight={SPACING.spacing4}
                    textTransform={TEXT_TRANSFORM_CAPITALIZE}
                    id={'RunSetupCard_calibrationText'}
                  >
                    {calibrationStatusComplete
                      ? t('calibration_ready')
                      : t('calibration_needed')}
                  </StyledText>
                </Flex>
              ) : null}
              <Icon
                color={COLORS.darkBlack}
                size={SIZE_1}
                name={expanded ? 'minus' : 'plus'}
                margin={SPACING.spacing2}
              />
            </Flex>
          </Flex>
        </Flex>
      </Btn>
      <Box css={expanded ? EXPANDED_STYLE : COLLAPSED_STYLE}>{children}</Box>
    </Flex>
  )
}
