import styled, { css } from 'styled-components'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

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

import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { getIsOnDevice } from '/app/redux/config'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

interface RobotMotionLoaderProps extends LPCWizardContentProps {
  header?: string
  body?: string
}

export function LPCRobotInMotion(props: RobotMotionLoaderProps): JSX.Element {
  const { header, body } = props
  const { t } = useTranslation('labware_position_check')
  const isOnDevice = useSelector(getIsOnDevice)

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      contentStyle={isOnDevice ? CHILDREN_CONTAINER_STYLE : undefined}
    >
      <Flex css={CONTAINER_STYLE}>
        <Icon name="ot-spinner" css={SPINNER_STYLE} spin />
        {header != null ? <LoadingText>{header}</LoadingText> : null}
        {body != null ? (
          <LegacyStyledText as="p">{body}</LegacyStyledText>
        ) : null}
      </Flex>
    </LPCContentContainer>
  )
}

const LoadingText = styled.h1`
  ${TYPOGRAPHY.h1Default}

  p {
    text-transform: lowercase;
  }

  p::first-letter {
    text-transform: uppercase;
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold}
  }
`

const CONTAINER_STYLE = css`
  padding: ${SPACING.spacing40};
  height: 100%;
  width: 100%;
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_CENTER};
  grid-gap: ${SPACING.spacing24};
`

// The design system makes a padding exception for this view.
const CHILDREN_CONTAINER_STYLE = css`
  margin-top: 7.75rem;
  flex-direction: ${DIRECTION_COLUMN};
  height: 100%;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding: 0 ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60};
    gap: ${SPACING.spacing40};
  }
`

const SPINNER_STYLE = css`
  width: 5rem;
  height: 5rem;
  color: ${COLORS.grey60};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: 8rem;
    height: 8rem;
    color: ${COLORS.grey50};
  }
`
