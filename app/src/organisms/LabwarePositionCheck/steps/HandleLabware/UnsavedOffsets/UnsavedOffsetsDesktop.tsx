import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  SPACING,
  StyledText,
} from '@opentrons/components'

import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { goBackEditOffsetSubstep } from '/app/redux/protocol-runs'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

// TOME TODO: DO THIS. You'll need a custom footer style for the primary button here.
// TOME TODO: Try to cut out most isOnDevice usage and replace with DESKTOP_ONLY and ODD_ONLY
//  where possible.
// TOME TODO: typeof SUBSTEP for some of the typing.

interface UnsavedOffsetsDesktopProps extends LPCWizardContentProps {
  toggleShowUnsavedOffsetsDesktop: () => void
}

export function UnsavedOffsetsDesktop(
  props: UnsavedOffsetsDesktopProps
): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { toggleShowUnsavedOffsetsDesktop, runId } = props
  const dispatch = useDispatch()

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      primaryBtnAlert={true}
      tertiaryBtnProps={{
        text: t('cancel'),
        onClick: toggleShowUnsavedOffsetsDesktop,
      }}
      buttonText={t('confirm')}
      onClickButton={() => dispatch(goBackEditOffsetSubstep(runId))}
    >
      <Flex css={CONTAINER_STYLE}>
        <Icon name="alert-circle" css={ICON_STYLE} />
        <Flex css={TEXT_CONTAINER}>
          <StyledText desktopStyle="headingSmallBold">
            {t('unsaved_changes_will_be_lost')}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
            {t('go_back_confirmation')}
          </StyledText>
        </Flex>
      </Flex>
    </LPCContentContainer>
  )
}

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
  color: ${COLORS.yellow50};
`

const TEXT_CONTAINER = css`
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  gap: ${SPACING.spacing8};
`
