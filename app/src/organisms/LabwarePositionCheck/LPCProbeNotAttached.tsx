import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  RESPONSIVENESS,
  SPACING,
  StyledText,
} from '@opentrons/components'

import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function LPCProbeNotAttached(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { commandUtils } = props
  const { headerCommands } = commandUtils

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      buttonText={t('try_again')}
      onClickButton={headerCommands.handleAttachProbeCheck}
      secondaryButtonProps={{
        buttonText: t('exit'),
        buttonCategory: 'rounded',
        buttonType: 'tertiaryLowLight',
        onClick: headerCommands.handleNavToDetachProbe,
      }}
      contentStyle={CHILDREN_CONTAINER_STYLE}
    >
      <Flex css={CONTAINER_STYLE}>
        <Icon name="alert-circle" css={ICON_STYLE} color={COLORS.red50} />
        <Flex css={COPY_CONTAINER_STYLE}>
          <StyledText
            oddStyle="level3HeaderBold"
            desktopStyle="headingSmallBold"
          >
            {t('calibration_probe_not_detected')}
          </StyledText>
          <StyledText
            oddStyle="level4HeaderRegular"
            desktopStyle="bodyDefaultRegular"
          >
            {t('ensure_probe_attached')}
          </StyledText>
        </Flex>
      </Flex>
    </LPCContentContainer>
  )
}

const CONTAINER_STYLE = css`
  padding: ${SPACING.spacing40};
  height: 100%;
  width: 100%;
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_CENTER};
  grid-gap: ${SPACING.spacing24};
`

const COPY_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  gap: ${SPACING.spacing4};
`

const ICON_STYLE = css`
  height: ${SPACING.spacing40};
  width: ${SPACING.spacing40};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: ${SPACING.spacing60};
    width: ${SPACING.spacing60};
  }
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
