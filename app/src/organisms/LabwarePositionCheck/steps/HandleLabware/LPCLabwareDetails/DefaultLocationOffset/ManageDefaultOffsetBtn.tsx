import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  Flex,
  StyledText,
  PrimaryButton,
  Icon,
  COLORS,
  SPACING,
  BORDERS,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
  RESPONSIVENESS,
} from '@opentrons/components'

import type { FlattenSimpleInterpolation } from 'styled-components'

// A one-off designed button for default offsets.
export function ManageDefaultOffsetBtn({
  isMissingDefaultOffset,
  onClick,
}: {
  isMissingDefaultOffset: boolean
  onClick: () => void
}): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  return (
    <PrimaryButton
      onClick={onClick}
      css={customButtonStyle(isMissingDefaultOffset)}
      backgroundColor={isMissingDefaultOffset ? '' : COLORS.blue35}
      color={isMissingDefaultOffset ? '' : COLORS.black90}
    >
      <Flex css={BUTTON_TEXT_CONTAINER_STYLE}>
        {isMissingDefaultOffset && <Icon name="add" css={ADD_ICON_STYLE} />}
        <StyledText oddStyle="bodyTextSemiBold" desktopStyle="captionSemiBold">
          {isMissingDefaultOffset ? t('add') : t('adjust')}
        </StyledText>
      </Flex>
    </PrimaryButton>
  )
}

const customButtonStyle = (
  isMissingDefaultOffset: boolean
): FlattenSimpleInterpolation => css`
  padding: ${SPACING.spacing8} ${SPACING.spacing16};
  border-radius: ${BORDERS.borderRadiusFull};

  &:hover,
  &:focus {
    background-color: ${isMissingDefaultOffset ? '' : COLORS.blue40};
    box-shadow: none;
  }
  &:focus-visible {
    box-shadow: 0 0 0 3px ${COLORS.yellow50};
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding: ${SPACING.spacing16} ${SPACING.spacing24};
  }
`

const BUTTON_TEXT_CONTAINER_STYLE = css`
  grid-gap: ${SPACING.spacing8};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
`

const ADD_ICON_STYLE = css`
  width: 0.75rem;
  height: 0.75rem;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: 1.75rem;
    height: 1.75rem;
  }
`
