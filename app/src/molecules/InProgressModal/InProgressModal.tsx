import styled from 'styled-components'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  RESPONSIVENESS,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import type { ReactNode } from 'react'

interface Props {
  //  optional override of the spinner
  alternativeSpinner?: ReactNode
  description?: string
  body?: string
  children?: JSX.Element
}

const StyledDescription = styled(LegacyStyledText)`
  ${TYPOGRAPHY.h1Default}
  margin-top: ${SPACING.spacing24};
  margin-bottom: ${SPACING.spacing8};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-weight: ${TYPOGRAPHY.fontWeightBold};
    font-size: ${TYPOGRAPHY.fontSize32};
    margin-top: ${SPACING.spacing32};
    margin-bottom: ${SPACING.spacing4};
    margin-left: 4.5rem;
    margin-right: 4.5rem;
    text-align: ${TYPOGRAPHY.textAlignCenter};
    line-height: ${TYPOGRAPHY.lineHeight42};
  }
`

const StyledBody = styled(LegacyStyledText)`
  ${TYPOGRAPHY.pRegular}
  text-align: ${TYPOGRAPHY.textAlignCenter};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderRegular}
    color: ${COLORS.grey60}
  }
`

const StyledModal = styled(Flex)`
  align-items: ${ALIGN_CENTER};
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_CENTER};
  padding: ${SPACING.spacing32};
  height: 24.625rem;
  width: 100%;
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    max-height: 29.5rem;
    height: 100%;
  }
`

const StyledSpinner = styled(Icon)`
  color: ${COLORS.grey60};
  width: 5.125rem;
  height: 5.125rem;
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: 6.25rem;
    height: 6.25rem;
  }
`

const DescriptionContainer = styled(Flex)`
  padding-left: 6.5625rem;
  padding-right: 6.5625rem;
  gap: ${SPACING.spacing8};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding-left: ${SPACING.spacing40};
    padding-right: ${SPACING.spacing40};
    gap: ${SPACING.spacing4};
  }
`

export function InProgressModal(props: Props): JSX.Element {
  const { alternativeSpinner, children, description, body } = props

  return (
    <StyledModal>
      {alternativeSpinner ?? (
        <StyledSpinner name="ot-spinner" aria-label="spinner" spin />
      )}
      <DescriptionContainer
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
      >
        {description != null && (
          <StyledDescription>{description}</StyledDescription>
        )}
        {body != null && <StyledBody>{body}</StyledBody>}
      </DescriptionContainer>
      {children}
    </StyledModal>
  )
}
