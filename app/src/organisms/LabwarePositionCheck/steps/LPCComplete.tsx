import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { useSelector } from 'react-redux'

import {
  DIRECTION_COLUMN,
  RESPONSIVENESS,
  SPACING,
  Flex,
  StyledText,
  ALIGN_CENTER,
} from '@opentrons/components'

import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { getIsOnDevice } from '/app/redux/config'

import SuccessIcon from '/app/assets/images/icon_success.png'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function LPCComplete(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const isOnDevice = useSelector(getIsOnDevice)

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      buttonText={t('exit')}
      onClickButton={props.commandUtils.headerCommands.handleCloseAndHome}
      contentStyle={isOnDevice ? CHILDREN_CONTAINER_STYLE : undefined}
    >
      <Flex css={CONTENT_CONTAINER}>
        <img src={SuccessIcon} css={IMAGE_STYLE} alt="Success Icon" />
        <StyledText oddStyle="level3HeaderBold" desktopStyle="headingSmallBold">
          {t('lpc_complete')}
        </StyledText>
      </Flex>
    </LPCContentContainer>
  )
}

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

const CONTENT_CONTAINER = css`
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  padding: ${SPACING.spacing40};
  gap: ${SPACING.spacing24};
`

const IMAGE_STYLE = css`
  width: 10.625rem;
  height: 8.813rem;

  // The default image size.
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: 15.688rem;
    height: 13rem;
  }
`
