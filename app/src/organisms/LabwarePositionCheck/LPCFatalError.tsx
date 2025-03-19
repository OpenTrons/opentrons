import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  SPACING,
  StyledText,
  JUSTIFY_CENTER,
  TEXT_ALIGN_CENTER,
  RESPONSIVENESS,
} from '@opentrons/components'

import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { getIsOnDevice } from '/app/redux/config'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function LPCFatalError(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation(['labware_position_check', 'shared', 'branded'])
  const { headerCommands } = props.commandUtils
  const isOnDevice = useSelector(getIsOnDevice)

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      onClickButton={headerCommands.handleCloseWithoutHome}
      contentStyle={isOnDevice ? CHILDREN_CONTAINER_STYLE : undefined}
      buttonText={t('exit')}
    >
      <Flex css={CONTAINER_STYLE}>
        <Icon name="alert-circle" css={ICON_STYLE} />
        <Flex css={TEXT_CONTAINER}>
          <StyledText
            desktopStyle="headingSmallBold"
            oddStyle="level3HeaderBold"
          >
            {t('something_went_wrong')}
          </StyledText>
          <StyledText
            desktopStyle="bodyDefaultRegular"
            oddStyle="level4HeaderRegular"
            color={COLORS.grey60}
          >
            {t('remove_probe_before_exiting_error')}
          </StyledText>
        </Flex>
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

const CONTAINER_STYLE = css`
  padding: ${SPACING.spacing40};
  gap: ${SPACING.spacing24};
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  justify-content: ${JUSTIFY_CENTER};
  height: 100%;
`

const ICON_STYLE = css`
  height: ${SPACING.spacing40};
  width: ${SPACING.spacing40};
  color: ${COLORS.red50};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: ${SPACING.spacing60};
    width: ${SPACING.spacing60};
  }
`

const TEXT_CONTAINER = css`
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  justify-content: ${JUSTIFY_CENTER};
  text-align: ${TEXT_ALIGN_CENTER};
  gap: ${SPACING.spacing8};
`
